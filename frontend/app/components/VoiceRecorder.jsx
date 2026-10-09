"use client";

import { useEffect, useRef, useState } from "react";

const VOICE_WS_URL =
  process.env.NEXT_PUBLIC_VOICE_WS_URL || null;

/*
 * Follow the page's hostname so the socket works on
 * localhost AND when the app is opened via LAN IP.
 * Falls back to localhost during SSR.
 */
function getVoiceWsUrl() {
  if (VOICE_WS_URL) {
    return VOICE_WS_URL;
  }

  if (typeof window !== "undefined") {
    const protocol =
      window.location.protocol === "https:" ? "wss:" : "ws:";

    return `${protocol}//${window.location.hostname}:8000/api/voice`;
  }

  return "ws://localhost:8000/api/voice";
}

export default function VoiceRecorder() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  // null = listening, "thinking" = transcript sent to Groq,
  // "speaking" = TTS audio is playing
  const [assistantState, setAssistantState] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);

  // AudioContext for playing raw PCM audio from backend
  const audioContextRef = useRef(null);
  const nextAudioTimeRef = useRef(0);
  const sourcesRef = useRef([]);

  async function playPCMChunk(arrayBuffer) {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({
          sampleRate: 24000,
        });
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      /*
       * Deepgram TTS:
       *
       * encoding = linear16
       * sample_rate = 24000
       *
       * Audio is raw signed 16-bit PCM, not a WAV file.
       */

      const usableBytes = arrayBuffer.byteLength - (arrayBuffer.byteLength % 2);

      if (usableBytes === 0) {
        return;
      }

      const int16 = new Int16Array(arrayBuffer.slice(0, usableBytes));

      const float32 = new Float32Array(int16.length);

      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);

      audioBuffer.copyToChannel(float32, 0);

      const source = audioContext.createBufferSource();

      source.buffer = audioBuffer;

      source.connect(audioContext.destination);

      sourcesRef.current.push(source);

      source.onended = () => {
        sourcesRef.current = sourcesRef.current.filter(
          (item) => item !== source,
        );
      };

      /*
       * Schedule chunks one after another.
       * Chunks stream in, so playback starts as soon
       * as the first one arrives.
       */

      const currentTime = audioContext.currentTime;

      if (nextAudioTimeRef.current < currentTime) {
        nextAudioTimeRef.current = currentTime;
      }

      source.start(nextAudioTimeRef.current);

      nextAudioTimeRef.current += audioBuffer.duration;
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  }

  // Stops everything already queued/playing.
  // Backend can trigger this with { "type": "clear_audio" }
  // once barge-in is enabled.
  function stopPlayback() {
    for (const source of sourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Source may already have stopped.
      }
    }

    sourcesRef.current = [];

    nextAudioTimeRef.current = 0;

    // Immediately return the UI to listening state.
    setAssistantState(null);
  }

  // Distinguish "backend down" from other WebSocket failures.
  async function probeBackend(wsUrl) {
    const healthUrl = wsUrl
      .replace(/^ws/, "http")
      .replace(/\/api\/voice$/, "/health");

    try {
      const res = await fetch(healthUrl);

      if (res.ok) {
        setError(
          "Backend is running, but the WebSocket connection was rejected.",
        );

        return;
      }
    } catch {
      // Unreachable — fall through to the generic message.
    }

    setError(
      "Cannot reach the backend on port 8000. Start it with: uvicorn main:app --reload",
    );
  }

  async function startSession() {
    try {
      setError("");
      setTranscript("");
      setAiResponse("");
      setAssistantState(null);
      setConnectionStatus("Connecting...");

      // 1. Connect to FastAPI WebSocket

      const socket = new WebSocket(getVoiceWsUrl());

      socket.binaryType = "arraybuffer";

      socketRef.current = socket;

      socket.onopen = async () => {
        try {
          console.log("WebSocket connected - conversation started");

          setConnectionStatus("Connected");

          // 2. Microphone (stays open for the whole session)

          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          streamRef.current = stream;

          // 3. Recorder streaming continuously

          const mediaRecorder = new MediaRecorder(stream);

          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
              socket.send(event.data);
            }
          };

          // 4. 250ms chunks, never stopped until END

          mediaRecorder.start(250);

          setIsSessionActive(true);

          console.log("Microphone streaming continuously");
        } catch (err) {
          console.error("Microphone error:", err);

          setError("Could not access microphone.");

          cleanup();

          setConnectionStatus("Disconnected");
        }
      };

      // Receive messages from FastAPI

      socket.onmessage = async (event) => {
        /*
         * JSON:
         *   transcript / ai_thinking /
         *   ai_response / ai_done /
         *   clear_audio
         *
         * Binary:
         *   TTS PCM audio chunk
         */

        if (typeof event.data === "string") {
          try {
            const data = JSON.parse(event.data);

            console.log("Backend message:", data);

            // User transcript (partial + final)

            if (data.type === "transcript" && data.transcript) {
              setTranscript(data.transcript);
            }

            // Transcript reached Groq

            if (data.type === "ai_thinking") {
              setAssistantState("thinking");
            }

            // AI response text

            if (data.type === "ai_response" && data.response) {
              console.log("AI response:", data.response);

              setAiResponse(data.response);
            }

            // AI finished speaking

            if (data.type === "ai_done") {
              setAssistantState(null);
            }

            // Backend reported a failure (e.g. Deepgram down)

            if (data.type === "error") {
              setError(
                data.message || "Voice service error.",
              );

              setConnectionStatus("Error");
            }

            // Barge-in: stop any AI audio that is
            // already queued or currently playing.

            if (data.type === "clear_audio" || data.type === "interrupt") {
              console.log("AI interrupted - clearing audio");

              stopPlayback();

              setAssistantState(null);
            }
          } catch (err) {
            console.error("Could not parse backend message:", err);
          }

          return;
        }

        /*
         * Binary message = TTS PCM chunk
         */

        if (event.data instanceof ArrayBuffer) {
          setAssistantState("speaking");

          await playPCMChunk(event.data);

          return;
        }

        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();

          setAssistantState("speaking");

          await playPCMChunk(arrayBuffer);
        }
      };

      socket.onerror = () => {
        // ErrorEvent has no useful payload — log readyState
        // and URL instead of an empty object.
        console.error(
          "WebSocket error — readyState:",
          socket.readyState,
          "url:",
          socket.url,
        );

        setConnectionStatus("Error");

        probeBackend(socket.url);
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");

        // Stop mic + recorder so nothing keeps running
        // against a dead socket.
        cleanup();

        setConnectionStatus("Disconnected");

        setIsSessionActive(false);

        setAssistantState(null);
      };
    } catch (err) {
      console.error("Error:", err);

      setError("Could not start the voice session.");

      setConnectionStatus("Disconnected");
    }
  }

  function cleanup() {
    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.onclose = null;

      socketRef.current.close();

      socketRef.current = null;
    }

    stopPlayback();

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});

      audioContextRef.current = null;
    }

    nextAudioTimeRef.current = 0;
  }

  function endSession() {
    cleanup();

    setIsSessionActive(false);

    setAssistantState(null);

    setConnectionStatus("Disconnected");

    console.log("Conversation ended");
  }

  // Release mic / socket / audio if component unmounts
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assistantBusy = assistantState !== null;

  const buttonClass = !isSessionActive
    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700"
    : assistantState === "thinking"
      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
      : assistantState === "speaking"
        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/40"
        : "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600";

  const buttonLabel = isSessionActive
    ? "End conversation"
    : "Start conversation";

  const stateHint = !isSessionActive
    ? "Press to start a continuous conversation"
    : assistantState === "thinking"
      ? "AI is thinking..."
      : assistantState === "speaking"
        ? "AI is speaking..."
        : "Listening... just keep talking";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {/* Header */}

        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">AI Receptionist</h1>

          <p className="mt-2 text-sm text-slate-400">
            How can we help you today?
          </p>
        </div>

        {/* USER TRANSCRIPT */}

        <div className="mt-8 min-h-32 rounded-2xl bg-slate-800/60 p-5">
          <p className="text-sm text-slate-500">You said</p>

          <p className="mt-2 text-lg text-white">
            {transcript ||
              (isSessionActive
                ? "Listening... Speak into your microphone."
                : "Your transcript will appear here.")}
          </p>
        </div>

        {/* AI RESPONSE */}

        <div className="mt-4 min-h-32 rounded-2xl bg-blue-900/20 p-5">
          <p className="text-sm text-slate-500">AI Receptionist</p>

          <p className="mt-2 text-lg text-white">
            {aiResponse || "The AI response will appear here."}
          </p>
        </div>

        {/* SESSION BUTTON */}

        <div className="mt-8 flex flex-col items-center">
          <button
            onClick={isSessionActive ? endSession : startSession}
            aria-label={buttonLabel}
            className={`relative flex h-20 w-20 items-center justify-center rounded-full text-3xl transition-all ${buttonClass}`}
          >
            {/* Pulse ring while listening */}

            {isSessionActive && !assistantBusy && (
              <span className="mic-pulse absolute inset-0 rounded-full bg-red-500/40" />
            )}

            <span className="relative flex h-10 items-end gap-1">
              {!isSessionActive ? (
                "🎙️"
              ) : assistantState === "thinking" ? (
                <>
                  <span
                    className="mic-dot h-2.5 w-2.5 rounded-full bg-white"
                    style={{
                      animationDelay: "0ms",
                    }}
                  />
                  <span
                    className="mic-dot h-2.5 w-2.5 rounded-full bg-white"
                    style={{
                      animationDelay: "150ms",
                    }}
                  />
                  <span
                    className="mic-dot h-2.5 w-2.5 rounded-full bg-white"
                    style={{
                      animationDelay: "300ms",
                    }}
                  />
                </>
              ) : assistantState === "speaking" ? (
                <>
                  <span
                    className="mic-bar h-8 w-1.5 rounded-full bg-white"
                    style={{
                      animationDelay: "0ms",
                    }}
                  />
                  <span
                    className="mic-bar h-8 w-1.5 rounded-full bg-white"
                    style={{
                      animationDelay: "150ms",
                    }}
                  />
                  <span
                    className="mic-bar h-8 w-1.5 rounded-full bg-white"
                    style={{
                      animationDelay: "300ms",
                    }}
                  />
                  <span
                    className="mic-bar h-8 w-1.5 rounded-full bg-white"
                    style={{
                      animationDelay: "450ms",
                    }}
                  />
                </>
              ) : (
                "■"
              )}
            </span>
          </button>

          <p className="mt-4 text-sm font-medium text-slate-300">
            {buttonLabel}
          </p>

          <p className="mt-1 text-xs text-slate-500">{stateHint}</p>
        </div>

        {/* CONNECTION STATUS */}

        <div className="mt-8 flex items-center justify-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isSessionActive ? "animate-pulse bg-green-500" : "bg-slate-600"
            }`}
          />

          <span className="text-xs text-slate-400">{connectionStatus}</span>
        </div>

        {/* ERROR */}

        {error && (
          <p className="mt-5 text-center text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { startPcmStream } from "./micPcmStream";

const VOICE_WS_URL = process.env.NEXT_PUBLIC_VOICE_WS_URL || null;

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
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    return `${protocol}//${window.location.hostname}:8000/api/voice`;
  }

  return "ws://localhost:8000/api/voice";
}

// Languages the assistant can both understand (Sarvam STT)
// and speak (Sarvam TTS). Codes are BCP-47.
const LANGUAGES = [
  { code: "en-IN", label: "English" },
  { code: "hi-IN", label: "हिन्दी (Hindi)" },
  { code: "bn-IN", label: "বাংলা (Bengali)" },
  { code: "ta-IN", label: "தமிழ் (Tamil)" },
  { code: "te-IN", label: "తెలుగు (Telugu)" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)" },
  { code: "mr-IN", label: "मराठी (Marathi)" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "od-IN", label: "ଓଡ଼ିଆ (Odia)" },
];

const DEFAULT_LANGUAGE = "en-IN";
const LANGUAGE_STORAGE_KEY = "voiceLanguage";

export default function VoiceRecorder() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");

  // Chosen before the conversation starts; locked while it runs.
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);

  // null = listening, "thinking" = transcript sent to the LLM,
  // "speaking" = TTS audio is playing
  const [assistantState, setAssistantState] = useState(null);

  // Stops the 16 kHz PCM mic stream (AudioWorklet) started for STT.
  const stopMicRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);

  // AudioContext for playing raw PCM audio from backend
  const audioContextRef = useRef(null);
  const nextAudioTimeRef = useRef(0);
  const sourcesRef = useRef([]);

  // The backend streams raw linear16; a chunk can end mid-sample.
  const carryByteRef = useRef(null);
  // Decoded audio held back briefly so network jitter
  // does not cause gaps/crackle between chunks.
  const pendingAudioRef = useRef([]);
  const playbackStartedRef = useRef(false);
  const prefillTimerRef = useRef(null);

  // Must match SAMPLE_RATE in backend/services/text_to_speech.py
  const TTS_SAMPLE_RATE = 24000;
  const PREFILL_SECONDS = 0.1;
  const PREFILL_TIMEOUT_MS = 150;
  const START_LEAD_SECONDS = 0.05;

  /*
   * Create (and unlock) the playback context. Called from the
   * Start button click so browsers that require a user gesture
   * (Safari / iOS) allow audio later, and so the first AI reply
   * does not pay context-creation latency.
   *
   * Uses the hardware's native rate. Forcing a 24 kHz context makes
   * the OS resample on output, which sounds muffled on many devices.
   * The 24 kHz PCM is declared on the AudioBuffer instead, so Web
   * Audio resamples it with its high-quality resampler.
   */
  function ensureAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const audioContext = audioContextRef.current;

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    return audioContext;
  }

  function flushPendingAudio() {
    if (prefillTimerRef.current) {
      clearTimeout(prefillTimerRef.current);
      prefillTimerRef.current = null;
    }

    const audioContext = audioContextRef.current;
    const pending = pendingAudioRef.current;

    if (!audioContext || pending.length === 0) {
      return;
    }

    if (!playbackStartedRef.current) {
      playbackStartedRef.current = true;

      nextAudioTimeRef.current = audioContext.currentTime + START_LEAD_SECONDS;
    }

    pendingAudioRef.current = [];

    for (const float32 of pending) {
      const audioBuffer = audioContext.createBuffer(
        1,
        float32.length,
        TTS_SAMPLE_RATE,
      );

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

      const currentTime = audioContext.currentTime;

      if (nextAudioTimeRef.current < currentTime) {
        nextAudioTimeRef.current = currentTime;
      }

      source.start(nextAudioTimeRef.current);

      nextAudioTimeRef.current += audioBuffer.duration;
    }
  }

  async function playPCMChunk(arrayBuffer) {
    try {
      const audioContext = ensureAudioContext();

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      /*
       * Sarvam TTS (configured in the backend):
       *
       * output_audio_codec = linear16
       * speech_sample_rate = 24000
       *
       * Audio is raw signed 16-bit PCM, not a WAV file.
       */

      let data = new Uint8Array(arrayBuffer);

      // Rejoin a byte left over from an odd-length chunk so
      // 16-bit samples never shift across chunk boundaries.
      if (carryByteRef.current !== null) {
        const rejoined = new Uint8Array(data.length + 1);

        rejoined[0] = carryByteRef.current;
        rejoined.set(data, 1);

        data = rejoined;
      }

      const usableBytes = data.byteLength - (data.byteLength % 2);

      if (usableBytes === data.byteLength) {
        carryByteRef.current = null;
      } else if (data.byteLength > 0) {
        carryByteRef.current = data[usableBytes];
      }

      if (usableBytes === 0) {
        return;
      }

      const int16 = new Int16Array(data.slice(0, usableBytes).buffer);

      const float32 = new Float32Array(int16.length);

      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      pendingAudioRef.current.push(float32);

      if (playbackStartedRef.current) {
        flushPendingAudio();
        return;
      }

      const pendingSeconds = pendingAudioRef.current.reduce(
        (total, chunk) => total + chunk.length / TTS_SAMPLE_RATE,
        0,
      );

      if (pendingSeconds >= PREFILL_SECONDS) {
        flushPendingAudio();
        return;
      }

      // Never strand a short reply in the prebuffer.
      if (!prefillTimerRef.current) {
        prefillTimerRef.current = setTimeout(
          flushPendingAudio,
          PREFILL_TIMEOUT_MS,
        );
      }
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  }

  // Stops everything already queued/playing.
  // Backend triggers this with { "type": "interrupt" } (or "clear_audio")
  // when the caller barges in.
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

    if (prefillTimerRef.current) {
      clearTimeout(prefillTimerRef.current);
      prefillTimerRef.current = null;
    }

    pendingAudioRef.current = [];
    playbackStartedRef.current = false;
    carryByteRef.current = null;

    // Immediately return the UI to listening state.
    setAssistantState(null);
  }

  // Distinguish "backend down" from other WebSocket failures.
  async function probeBackend(wsUrl) {
    const healthUrl = wsUrl
      .split("?")[0]
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

  // True while `socket` is still the live session socket.
  function isCurrentSocket(socket) {
    return (
      socketRef.current === socket && socket.readyState === WebSocket.OPEN
    );
  }

  async function startSession() {
    try {
      setError("");
      setTranscript("");
      setAiResponse("");
      setAssistantState(null);
      setConnectionStatus("Connecting...");

      // Runs inside the click handler, so the browser allows audio.
      ensureAudioContext();

      // 1. Connect to FastAPI WebSocket

      const socket = new WebSocket(
        `${getVoiceWsUrl()}?lang=${encodeURIComponent(language)}`,
      );

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

          // The user may have ended the session while the
          // permission prompt was open.
          if (!isCurrentSocket(socket)) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;

          // 3. Stream 16 kHz PCM16 frames (what Sarvam STT expects)

          const stopMic = await startPcmStream(stream, (pcm) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(pcm);
            }
          });

          // Session ended while the audio worklet was loading.
          if (!isCurrentSocket(socket)) {
            await stopMic();
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          stopMicRef.current = stopMic;

          setIsSessionActive(true);

          console.log("Microphone streaming continuously");
        } catch (err) {
          console.error("Microphone error:", err);

          const denied =
            err?.name === "NotAllowedError" || err?.name === "NotFoundError";

          setError(
            denied
              ? "Could not access microphone."
              : "Could not start audio capture.",
          );

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
         *   interrupt / clear_audio
         *
         * Binary:
         *   TTS PCM audio chunk
         */

        if (typeof event.data === "string") {
          try {
            const data = JSON.parse(event.data);

            console.log("Backend message:", data);

            // User transcript

            if (data.type === "transcript" && data.transcript) {
              setTranscript(data.transcript);
            }

            // Transcript reached the LLM

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

            // Backend reported a failure (e.g. a speech service is down)

            if (data.type === "error") {
              setError(data.message || "Voice service error.");

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

        // Stop mic + audio capture so nothing keeps running
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
    // Stop the PCM capture (worklet + its AudioContext).
    if (stopMicRef.current) {
      stopMicRef.current();
      stopMicRef.current = null;
    }

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

  async function handleLogout() {
    endSession();
    await logout();
    router.replace("/login");
  }

  function endSession() {
    cleanup();

    setIsSessionActive(false);

    setAssistantState(null);

    setConnectionStatus("Disconnected");

    console.log("Conversation ended");
  }

  // Restore the language the caller picked last time.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

      if (saved && LANGUAGES.some((item) => item.code === saved)) {
        setLanguage(saved);
      }
    } catch {
      // Storage unavailable (private mode) - keep the default.
    }
  }, []);

  function handleLanguageChange(code) {
    setLanguage(code);

    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    } catch {
      // Ignore storage errors.
    }
  }

  // Release mic / socket / audio if component unmounts
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const assistantBusy = assistantState !== null;

  // The language can only change before a conversation starts.
  const languageLocked =
    isSessionActive || connectionStatus === "Connecting...";

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
            How can we help you today
            {user?.name ? `, ${user.name.split(" ")[0]}` : ""}?
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-800/50 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {user?.name || "Signed in"}
            </p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500/40 hover:text-red-300"
          >
            Log out
          </button>
        </div>

        {/* LANGUAGE */}

        <div className="mt-5">
          <label
            htmlFor="voice-language"
            className="block text-xs font-medium text-slate-400"
          >
            Conversation language
          </label>

          <select
            id="voice-language"
            value={language}
            onChange={(event) => handleLanguageChange(event.target.value)}
            disabled={languageLocked}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>

          <p className="mt-1 text-xs text-slate-500">
            {languageLocked
              ? "End the conversation to change the language."
              : "Choose before you start. The assistant listens and replies in this language."}
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
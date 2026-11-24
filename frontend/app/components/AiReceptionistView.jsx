"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Send,
  Bot,
  User,
  Sparkles,
  Volume2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { apiRequest } from "../../lib/api";

const VOICE_WS_URL = process.env.NEXT_PUBLIC_VOICE_WS_URL || null;

function getVoiceWsUrl() {
  if (VOICE_WS_URL) return VOICE_WS_URL;
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.hostname}:8000/api/voice`;
  }
  return "ws://localhost:8000/api/voice";
}

export default function AiReceptionistView({ user, onBookViaUi }) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [assistantState, setAssistantState] = useState(null); // null = listening, "thinking", "speaking"
  const [duration, setDuration] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [sendingText, setSendingText] = useState(false);

  // Chat messages list
  const [messages, setMessages] = useState([
    {
      id: "init",
      sender: "ai",
      text: "Hello! I'm MediVoice AI. How can I assist you with City Care Hospital services or appointments today?",
      time: "Just now",
    },
  ]);

  const [currentTranscript, setCurrentTranscript] = useState("");

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const nextAudioTimeRef = useRef(0);
  const sourcesRef = useRef([]);
  const timerRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentTranscript]);

  // Duration timer
  useEffect(() => {
    if (isSessionActive) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSessionActive]);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Play PCM audio chunk from backend
  async function playPCMChunk(arrayBuffer) {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const usableBytes = arrayBuffer.byteLength - (arrayBuffer.byteLength % 2);
      if (usableBytes === 0) return;

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
        sourcesRef.current = sourcesRef.current.filter((item) => item !== source);
      };

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

  function stopPlayback() {
    for (const source of sourcesRef.current) {
      try {
        source.stop();
      } catch {}
    }
    sourcesRef.current = [];
    nextAudioTimeRef.current = 0;
    setAssistantState(null);
  }

  async function startSession() {
    try {
      setError("");
      setAssistantState(null);
      setConnectionStatus("Connecting...");

      const socket = new WebSocket(getVoiceWsUrl());
      socket.binaryType = "arraybuffer";
      socketRef.current = socket;

      socket.onopen = async () => {
        try {
          setConnectionStatus("Connected");
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          streamRef.current = stream;

          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
              socket.send(event.data);
            }
          };

          mediaRecorder.start(250);
          setIsSessionActive(true);
        } catch (err) {
          setError("Could not access microphone. Please allow microphone permissions.");
          cleanup();
          setConnectionStatus("Disconnected");
        }
      };

      socket.onmessage = async (event) => {
        if (typeof event.data === "string") {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "transcript" && data.transcript) {
              setCurrentTranscript(data.transcript);
            }
            if (data.type === "ai_thinking") {
              setAssistantState("thinking");
              if (currentTranscript) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    sender: "user",
                    text: currentTranscript,
                    time: "Just now",
                  },
                ]);
                setCurrentTranscript("");
              }
            }
            if (data.type === "ai_response" && data.response) {
              setMessages((prev) => [
                ...prev,
                {
                  id: (Date.now() + 1).toString(),
                  sender: "ai",
                  text: data.response,
                  time: "Just now",
                },
              ]);
            }
            if (data.type === "ai_done") {
              setAssistantState(null);
            }
            if (data.type === "error") {
              setError(data.message || "Voice service error occurred.");
            }
            if (data.type === "clear_audio" || data.type === "interrupt") {
              stopPlayback();
            }
          } catch (err) {
            console.error("Could not parse backend message:", err);
          }
          return;
        }

        // Binary PCM chunk
        if (event.data instanceof ArrayBuffer) {
          setAssistantState("speaking");
          await playPCMChunk(event.data);
        } else if (event.data instanceof Blob) {
          const buffer = await event.data.arrayBuffer();
          setAssistantState("speaking");
          await playPCMChunk(buffer);
        }
      };

      socket.onerror = () => {
        setConnectionStatus("Error");
        setError("Unable to connect to AI voice backend. Start the backend with: uvicorn main:app --reload");
      };

      socket.onclose = () => {
        cleanup();
        setConnectionStatus("Disconnected");
        setIsSessionActive(false);
      };
    } catch (err) {
      setError("Failed to start voice session.");
      setConnectionStatus("Disconnected");
    }
  }

  function cleanup() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }

    stopPlayback();
  }

  function endSession() {
    cleanup();
    setIsSessionActive(false);
    setConnectionStatus("Idle");
  }

  useEffect(() => {
    return () => cleanup();
  }, []);

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!textInput.trim() || sendingText) return;

    const userText = textInput.trim();
    setTextInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text: userText,
        time: "Just now",
      },
    ]);

    setSendingText(true);
    try {
      const res = await apiRequest("/api/chat", {
        method: "POST",
        body: JSON.stringify({ transcript: userText }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: "ai",
            text: data.response || "I am here to help you with City Care Hospital services.",
            time: "Just now",
          },
        ]);
      } else {
        throw new Error("Chat request failed");
      }
    } catch {
      // Fallback
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ai",
          text: `Thank you for asking about "${userText}". You can book an appointment directly through the Book Appointment tab or click the microphone to talk with me live!`,
          time: "Just now",
        },
      ]);
    } finally {
      setSendingText(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              AI Voice Receptionist
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3 w-3" />
              Live Interactive
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Speak naturally to book appointments, ask for doctor information, or enquire about hospital services.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isSessionActive
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isSessionActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            {connectionStatus}
          </span>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Voice Visualizer & Controls */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-8 shadow-xs text-center">
          {/* Waveform Visualization Box */}
          <div className="flex h-20 w-full items-center justify-center gap-1.5 px-4">
            {[40, 65, 85, 45, 95, 60, 100, 75, 50, 90, 70, 85, 40, 60].map(
              (height, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 rounded-full transition-all duration-200 ${
                    isSessionActive
                      ? assistantState === "speaking"
                        ? "bg-indigo-600 animate-pulse"
                        : "bg-blue-600"
                      : "bg-slate-200"
                  }`}
                  style={{
                    height: isSessionActive
                      ? `${Math.max(12, height * (assistantState ? 0.9 : 0.6))}%`
                      : "12%",
                  }}
                />
              )
            )}
          </div>

          {/* Timer Display */}
          <p className="mt-3 font-mono text-sm font-bold text-slate-600">
            {formatTimer(duration)}
          </p>

          {/* Circular Mic Button */}
          <div className="relative mt-6 flex items-center justify-center">
            {isSessionActive && (
              <span className="absolute h-28 w-28 rounded-full bg-blue-500/20 animate-ping pointer-events-none" />
            )}
            <button
              onClick={isSessionActive ? endSession : startSession}
              aria-label={isSessionActive ? "Stop Voice" : "Start Voice"}
              className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                isSessionActive
                  ? assistantState === "thinking"
                    ? "bg-amber-500 shadow-amber-500/30"
                    : assistantState === "speaking"
                    ? "bg-indigo-600 shadow-indigo-600/30"
                    : "bg-red-500 shadow-red-500/30"
                  : "bg-blue-600 shadow-blue-600/30 hover:bg-blue-700"
              }`}
            >
              {isSessionActive ? (
                assistantState === "speaking" ? (
                  <Volume2 className="h-10 w-10 animate-bounce" />
                ) : (
                  <MicOff className="h-10 w-10" />
                )
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </button>
          </div>

          {/* Status Label */}
          <p className="mt-5 font-bold text-slate-900">
            {isSessionActive
              ? assistantState === "thinking"
                ? "MediVoice is thinking..."
                : assistantState === "speaking"
                ? "MediVoice is speaking..."
                : "Listening... speak now"
              : "Click to Start Voice Conversation"}
          </p>
          <p className="mt-1 max-w-xs text-xs text-slate-500">
            {isSessionActive
              ? "Press the button again when you want to conclude the conversation."
              : "Continuous voice streaming with Deepgram real-time speech recognition."}
          </p>

          {/* Error notification */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Prompts */}
          <div className="mt-8 w-full border-t border-slate-200/80 pt-5 text-left">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sample queries:
            </p>
            <div className="mt-2.5 space-y-1.5">
              {[
                "I want to book an appointment with a Cardiologist.",
                "Who are the general physicians available on Monday?",
                "What are your emergency department operating hours?",
              ].map((query, i) => (
                <button
                  key={i}
                  onClick={() => setTextInput(query)}
                  className="w-full text-left rounded-lg bg-slate-100/80 px-3 py-2 text-xs text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  "{query}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Conversation Transcript */}
        <div className="lg:col-span-7 flex h-[580px] flex-col rounded-2xl border border-slate-200 bg-white shadow-xs">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Live Conversation Transcript
                </h3>
                <p className="text-[11px] text-slate-500">
                  Real-time speech-to-text dialogue & AI response
                </p>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 space-y-4 overflow-y-auto p-6">
            {messages.map((msg) => {
              const isAi = msg.sender === "ai";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    isAi ? "justify-start" : "flex-row-reverse"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isAi
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-800 text-white"
                    }`}
                  >
                    {isAi ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isAi
                        ? "bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200/60"
                        : "bg-blue-600 text-white rounded-tr-none shadow-xs"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span
                      className={`mt-1 block text-[10px] ${
                        isAi ? "text-slate-400" : "text-blue-100"
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Currently spoken live user transcript */}
            {currentTranscript && (
              <div className="flex items-start gap-3 justify-end">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white text-xs">
                  <User className="h-4 w-4" />
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-blue-500/80 px-4 py-3 text-sm text-white italic">
                  <span>{currentTranscript}</span>
                  <span className="ml-1 inline-block h-2 w-2 rounded-full bg-white animate-pulse" />
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Message Input Footer */}
          <form
            onSubmit={handleSendText}
            className="border-t border-slate-100 p-4"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your message or ask a question..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition focus:border-blue-500 focus:bg-white focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || sendingText}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-40"
              >
                {sendingText ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

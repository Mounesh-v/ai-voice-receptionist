"use client";

import { useRef, useState } from "react";

export default function VoiceRecorder() {
  const [isListening, setIsListening] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);

  async function startRecording() {
    try {
      setError("");
      setTranscript("");

      // 1. Connect to FastAPI WebSocket
      const socket = new WebSocket("ws://localhost:8000/api/voice");

      socketRef.current = socket;

      socket.onopen = async () => {
        console.log("WebSocket connected");

        setConnectionStatus("Connected");

        // 2. Get microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        streamRef.current = stream;

        const audioTrack = stream.getAudioTracks()[0];

        console.log("Microphone track:", {
          label: audioTrack.label,
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          settings: audioTrack.getSettings(),
        });

        // 3. Create recorder
        const mediaRecorder = new MediaRecorder(stream);

        mediaRecorderRef.current = mediaRecorder;

        // 4. Send audio chunks to FastAPI
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);

            console.log("Audio chunk sent:", event.data.size);
          }
        };

        // 5. Create chunks every 250ms
        mediaRecorder.start(250);

        setIsListening(true);

        console.log("Recording started");
      };

      // Receive messages from FastAPI
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          console.log("Deepgram message:", data);

          // Deepgram Flux sends transcript inside TurnInfo messages
          if (data.type === "TurnInfo" && data.transcript) {
            setTranscript(data.transcript);
          }
        } catch (error) {
          console.error("Could not parse transcript:", error);
        }
      };

      socket.onerror = (event) => {
        console.error("WebSocket error:", event);

        setError("WebSocket connection failed.");
        setConnectionStatus("Error");
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");

        setConnectionStatus("Disconnected");
      };
    } catch (error) {
      console.error("Error:", error);

      setError("Could not access microphone.");
    }
  }

  function stopRecording() {
    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());

      streamRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsListening(false);
    setConnectionStatus("Disconnected");

    console.log("Recording stopped");
  }

  function toggleRecording() {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white">AI Receptionist</h1>

          <p className="mt-2 text-sm text-slate-400">
            How can we help you today?
          </p>
        </div>

       <div className="mt-8 min-h-32 rounded-2xl bg-slate-800/60 p-5">
  <p className="text-sm text-slate-500">You said</p>

  <p className="mt-2 text-lg text-white">
    {transcript || (
      isListening
        ? "Listening... Speak into your microphone."
        : "Your transcript will appear here."
    )}
  </p>
</div>

        <div className="mt-8 flex flex-col items-center">
          <button
            onClick={toggleRecording}
            className={`flex h-20 w-20 items-center justify-center rounded-full text-3xl transition-all ${
              isListening
                ? "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600"
                : "bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700"
            }`}
          >
            {isListening ? "■" : "🎙️"}
          </button>

          <p className="mt-4 text-sm font-medium text-slate-300">
            {isListening ? "Stop talking" : "Start talking"}
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isListening ? "animate-pulse bg-green-500" : "bg-slate-600"
            }`}
          />

          <span className="text-xs text-slate-400">{connectionStatus}</span>
        </div>

        {error && (
          <p className="mt-5 text-center text-sm text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}

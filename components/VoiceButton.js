"use client";

import { useState, useCallback } from "react";

const SpeechRecognition =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * Voice recording button: Web Speech API → POST /api/parse-habits → zen feedback.
 * Emoji per .cursorrules: 🎤 (voice), ✨ (logged).
 */
export default function VoiceButton() {
  const [status, setStatus] = useState("idle"); // idle | recording | sending | success | error
  const [message, setMessage] = useState("");

  const handleTranscript = useCallback(async (transcript) => {
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/parse-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceInput: transcript }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error || "Something went wrong.");
        return;
      }
      setStatus("success");
      setMessage("✨ Logged.");
    } catch (err) {
      setStatus("error");
      setMessage("Could not save. Try again.");
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!SpeechRecognition) {
      setStatus("error");
      setMessage("Voice not supported in this browser. Use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setStatus("recording");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleTranscript(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      setStatus("error");
      if (event.error === "not-allowed") {
        setMessage("Microphone access denied.");
      } else {
        setMessage("Voice recognition failed. Try again.");
      }
    };

    recognition.onend = () => {
      setStatus((s) => (s === "recording" ? "idle" : s));
    };

    setStatus("recording");
    setMessage("");
    recognition.start();
  }, [handleTranscript]);

  if (!SpeechRecognition) {
    return <VoiceUnsupportedFallback onSubmit={handleTranscript} />;
  }

  const busy = status === "recording" || status === "sending";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={startRecording}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-800 text-stone-50 px-5 py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-60 transition-colors"
      >
        <span aria-hidden>🎤</span>
        {status === "recording" ? "Listening…" : status === "sending" ? "Saving…" : "Tell me"}
      </button>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-600" : "text-stone-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

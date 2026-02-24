"use client";

import { useState, useCallback } from "react";
import HabitConfirmCard from "./HabitConfirmCard";

const SpeechRecognition =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * Voice recording button: Web Speech API → POST /api/parse-habits → zen feedback.
 * States: idle | recording | sending | confirming | success | error
 * Emoji per CLAUDE.md: 🎤 (voice), ✨ (logged).
 */
export default function VoiceButton() {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [pendingHabits, setPendingHabits] = useState(null);
  const [pendingVoiceInput, setPendingVoiceInput] = useState("");

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
      if (data.requiresConfirmation) {
        setPendingHabits(data.habits);
        setPendingVoiceInput(transcript);
        setStatus("confirming");
        return;
      }
      setStatus("success");
      setMessage("✨ Logged.");
    } catch (err) {
      setStatus("error");
      setMessage("Could not save. Try again.");
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/parse-habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceInput: pendingVoiceInput,
          confirmed: true,
          habits: pendingHabits,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error || "Something went wrong.");
        return;
      }
      setPendingHabits(null);
      setPendingVoiceInput("");
      setStatus("success");
      setMessage("✨ Logged.");
    } catch (err) {
      setStatus("error");
      setMessage("Could not save. Try again.");
    }
  }, [pendingHabits, pendingVoiceInput]);

  const handleDiscard = useCallback(() => {
    setPendingHabits(null);
    setPendingVoiceInput("");
    setStatus("idle");
    setMessage("");
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

  const busy = status === "recording" || status === "sending" || status === "confirming";

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

      {status === "confirming" && pendingHabits && (
        <HabitConfirmCard
          habits={pendingHabits}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
        />
      )}

      {message && status !== "confirming" && (
        <p className={`text-sm ${status === "error" ? "text-red-600" : "text-stone-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Fallback for browsers without Web Speech API support.
 * Renders a plain text input so users can still log habits manually.
 */
function VoiceUnsupportedFallback({ onSubmit }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit(trimmed);
      setValue("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-start gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your habit log…"
        className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 w-72"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="rounded-lg bg-stone-800 text-stone-50 px-5 py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-60 transition-colors"
      >
        Log it
      </button>
    </form>
  );
}

"use client";

import { useState, useCallback } from "react";
import HabitConfirmCard from "./HabitConfirmCard";
import ProgressivePrompt from "./ProgressivePrompt";

const SpeechRecognition =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * Voice recording button: Web Speech API → POST /api/parse-habits → zen feedback.
 * States: idle | recording | sending | confirming | prompting | success | error
 * Emoji per CLAUDE.md: 🎤 (voice), ✨ (logged).
 * @param {{ onSuccess?: () => void }} props - Optional callback fired after all prompts complete.
 */
export default function VoiceButton({ onSuccess } = {}) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [pendingHabits, setPendingHabits] = useState(null);
  const [pendingVoiceInput, setPendingVoiceInput] = useState("");
  const [pendingPrompts, setPendingPrompts] = useState([]);

  /**
   * After a successful save, check logs for incomplete entries.
   * If any, enter prompting state; otherwise show success immediately.
   */
  const enterPromptingOrSuccess = useCallback((logs) => {
    const incomplete = (logs || [])
      .filter((l) => !l.is_complete)
      .map(({ id, habit_name, unit }) => ({ id, habit_name, unit }));
    if (incomplete.length > 0) {
      setPendingPrompts(incomplete);
      setStatus("prompting");
    } else {
      setStatus("success");
      setMessage("✨ Logged.");
      onSuccess?.();
    }
  }, [onSuccess]);

  /**
   * Advance to the next pending prompt, or complete if all done.
   * Uses functional updater to avoid stale closure over pendingPrompts.
   */
  const advancePrompts = useCallback(() => {
    setPendingPrompts((prev) => {
      const next = prev.slice(1);
      if (next.length > 0) {
        return next;
      }
      // All prompts answered — show success
      setStatus("success");
      setMessage("✨ Logged.");
      onSuccess?.();
      return [];
    });
  }, [onSuccess]);

  /** PATCH the update-habit-log endpoint, then advance regardless of outcome. */
  const handlePromptSubmit = useCallback(async (value, unit) => {
    const current = pendingPrompts[0];
    try {
      await fetch("/api/update-habit-log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, quantity: Number(value), unit: unit ?? current.unit }),
      });
    } catch (err) {
      console.error("update-habit-log error (non-fatal):", err);
    }
    advancePrompts();
  }, [pendingPrompts, advancePrompts]);

  /** Skip the current prompt without PATCHing. */
  const handlePromptSkip = useCallback(() => {
    advancePrompts();
  }, [advancePrompts]);

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
      enterPromptingOrSuccess(data.logs);
    } catch (err) {
      setStatus("error");
      setMessage("Could not save. Try again.");
    }
  }, [enterPromptingOrSuccess]);

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
      enterPromptingOrSuccess(data.logs);
    } catch (err) {
      setStatus("error");
      setMessage("Could not save. Try again.");
    }
  }, [pendingHabits, pendingVoiceInput, enterPromptingOrSuccess]);

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

  const busy = status === "recording" || status === "sending" || status === "confirming" || status === "prompting";

  return (
    <div className="flex flex-col items-start gap-2 w-full">
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

      {status === "prompting" && pendingPrompts.length > 0 && (
        <ProgressivePrompt
          habitName={pendingPrompts[0].habit_name}
          unit={pendingPrompts[0].unit}
          onSubmit={handlePromptSubmit}
          onSkip={handlePromptSkip}
        />
      )}

      {message && status !== "confirming" && status !== "prompting" && (
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

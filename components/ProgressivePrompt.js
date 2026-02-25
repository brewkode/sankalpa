"use client";

import { useState } from "react";

/**
 * Inline follow-up prompt shown after saving an incomplete habit log.
 * Props:
 *   habitName: string — shown in the prompt text
 *   unit: string | null — if set, renders a number input + unit label;
 *                         if null, renders a free-text input
 *   onSubmit(value, unit): called with the entered value and unit
 *   onSkip(): called when the user skips
 */
export default function ProgressivePrompt({ habitName, unit, onSubmit, onSkip }) {
  const [value, setValue] = useState("");

  const handleDone = () => {
    if (!value.trim()) return;
    onSubmit(value.trim(), unit ?? null);
  };

  const isEmpty = !value.trim();

  return (
    <div className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-4 flex flex-col gap-3">
      <p className="text-sm text-stone-600 font-light">
        Anything to add for {habitName}?
      </p>
      <div className="flex items-center gap-2">
        {unit ? (
          <>
            <input
              type="number"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              className="w-20 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400"
            />
            <span className="text-sm text-stone-500">{unit}</span>
          </>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 30 minutes"
            className="w-48 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400"
          />
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDone}
          disabled={isEmpty}
          className="rounded-lg bg-stone-800 text-stone-50 px-5 py-2.5 text-sm font-medium hover:bg-stone-700 disabled:opacity-60 transition-colors"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-lg bg-stone-100 text-stone-600 px-5 py-2.5 text-sm font-medium hover:bg-stone-200 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

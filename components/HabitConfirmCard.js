"use client";

/**
 * Confirmation card shown when voice input has low-confidence habits.
 * Props: { habits: Array<{ habit_name, quantity, unit }>, onConfirm, onDiscard }
 */
export default function HabitConfirmCard({ habits, onConfirm, onDiscard }) {
  const habitList = habits
    .map(({ habit_name, quantity, unit }) => {
      if (quantity != null && unit) return `${habit_name} (${quantity} ${unit})`;
      if (quantity != null) return `${habit_name} (${quantity})`;
      return habit_name;
    })
    .join(", ");

  return (
    <div className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-4 flex flex-col gap-3">
      <p className="text-sm text-stone-600 font-light">
        Not sure about this one — want to log it?
      </p>
      <p className="text-sm font-medium text-stone-800">{habitList}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-stone-800 text-stone-50 px-5 py-2.5 text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          Yes, log it
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="rounded-lg bg-stone-100 text-stone-600 px-5 py-2.5 text-sm font-medium hover:bg-stone-200 transition-colors"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

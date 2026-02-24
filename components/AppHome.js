"use client";

import { signOut } from "next-auth/react";
import VoiceButton from "./VoiceButton";

export default function AppHome({ user, summary = [], nudge = null }) {
  const displayName = user?.name ?? user?.email ?? "there";

  return (
    <main className="min-h-screen flex flex-col px-6 py-10 max-w-lg mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-light text-stone-700 tracking-tight">
          Sankalpa
        </h1>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-stone-500 text-sm hover:text-stone-700 underline"
        >
          Sign out
        </button>
      </div>

      <p className="mt-8 text-stone-600 font-light">
        Welcome, {displayName}.
      </p>

      {nudge && (
        <p className="mt-6 text-stone-600 text-sm font-light">
          🔥 {nudge.streak} days of {nudge.habit_name_display} — log today to keep it going.
        </p>
      )}

      <section className="mt-10">
        <VoiceButton />
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
          Last 7 days
        </h2>
        {summary.length === 0 ? (
          <p className="mt-3 text-stone-400 text-sm font-light">
            No habits logged yet.
          </p>
        ) : (
          <ul className="mt-3 border border-stone-200 rounded-lg divide-y divide-stone-100 overflow-hidden">
            {summary.map(({ habit_name, habit_name_display, count, avg_units, unit_display, current_streak }) => (
              <li
                key={habit_name}
                className="flex justify-between items-center px-4 py-3 bg-white text-stone-700 text-sm"
              >
                <span className="font-medium text-stone-800">
                  {habit_name_display ?? habit_name}
                </span>
                <span className="text-stone-500 tabular-nums">
                  {count} {count === 1 ? "time" : "times"}
                  {avg_units != null && unit_display
                    ? ` · avg ${avg_units} ${unit_display}`
                    : ""}
                  {current_streak >= 2 ? ` · 🔥 ${current_streak} days` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

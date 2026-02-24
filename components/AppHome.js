"use client";

import { signOut } from "next-auth/react";
import VoiceButton from "./VoiceButton";

export default function AppHome({ user }) {
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

      <section className="mt-10">
        <VoiceButton />
        <p className="mt-6 text-stone-500 text-sm">Habit list will go here.</p>
      </section>
    </main>
  );
}

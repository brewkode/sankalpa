"use client";

import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      type="button"
      onClick={() => signIn("google", { callbackUrl: "/" })}
      className="inline-flex items-center justify-center rounded-lg bg-stone-800 text-stone-50 px-6 py-3 text-sm font-medium hover:bg-stone-700 transition-colors"
    >
      Login with Google
    </button>
  );
}

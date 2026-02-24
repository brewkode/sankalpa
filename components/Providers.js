"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Client wrapper that provides NextAuth session to the app.
 * Required for useSession(), signIn(), signOut() in client components.
 */
export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}

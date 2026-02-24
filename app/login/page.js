import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";

/**
 * /login is redirect-only: unauthenticated → home (landing); authenticated → app home.
 * When you add a dedicated app shell (e.g. /app), change the logged-in redirect to redirect("/app").
 */
export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  redirect("/");
}

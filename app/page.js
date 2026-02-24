import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import Landing from "../components/Landing";
import AppHome from "../components/AppHome";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <Landing />;
  }

  return <AppHome user={session.user} />;
}

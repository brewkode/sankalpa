import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { nextAuthIdToUuid } from "../lib/supabaseServer";
import { supabaseServer } from "../lib/supabaseServer";
import { getHabitSummary } from "../lib/habitSummary";
import Landing from "../components/Landing";
import AppHome from "../components/AppHome";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <Landing />;
  }

  const userId = nextAuthIdToUuid(session.user.id);
  const { summary, nudges } = await getHabitSummary(supabaseServer, userId);

  return <AppHome user={session.user} summary={summary} nudges={nudges} />;
}

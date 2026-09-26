import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { PrivateDashboard } from "../../components/private-dashboard";
import { PersonalSummary } from "../../components/personal-summary";
import { loadFixture } from "../../lib/metrics/fixture";
import { db } from "../../lib/db";
import { onboardingSchema } from "../../lib/onboarding";
import { userProfiles } from "../../db/schema";
import { eq } from "drizzle-orm";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const [profile] = await db.select({
    answers: userProfiles.onboardingAnswers,
    completedAt: userProfiles.onboardingCompletedAt
  }).from(userProfiles).where(eq(userProfiles.userId, session.user.id)).limit(1);
  const parsed = onboardingSchema.safeParse(profile?.answers);
  if (!profile?.completedAt || !parsed.success) redirect("/onboarding");
  try {
    return <PrivateDashboard name={session.user.name || "there"} emailVerified={session.user.emailVerified} answers={parsed.data} snapshot={await loadFixture()} />;
  } catch {
    return <>
      <div className="private-nav"><a href="/" className="brand"><span>◒</span> stillwater</a><div className="private-nav-right"><span className="private-label">Betting tracker</span></div></div>
      <main className="private-dashboard metrics-dashboard">
        <section className="welcome-row"><div><p className="eyebrow">Awareness, at your pace</p><h1>Hi, {session.user.name || "there"}.</h1><p className="intro">Your starting point is ready.</p></div></section>
        <PersonalSummary answers={parsed.data} emailVerified={session.user.emailVerified} />
        <section className="panel" role="status"><h2>Demo data unavailable</h2><p>The sample activity could not be loaded. Your answers are still available above. Restore the supplied CSV files to view the demo metrics.</p></section>
      </main>
    </>;
  }
}

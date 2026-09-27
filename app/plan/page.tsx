import Link from "next/link";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { db } from "../../lib/db";
import { userProfiles } from "../../db/schema";
import { onboardingSchema } from "../../lib/onboarding";
import { PlanContent } from "../../components/plan-content";
import { SignOutButton } from "../../components/sign-out-button";

export default async function PlanPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  const [profile] = await db.select({
    answers: userProfiles.onboardingAnswers,
    completedAt: userProfiles.onboardingCompletedAt
  }).from(userProfiles).where(eq(userProfiles.userId, session.user.id)).limit(1);
  const parsed = onboardingSchema.safeParse(profile?.answers);
  if (!profile?.completedAt || !parsed.success || !["stay", "reduce", "stop"].includes(parsed.data.goal)) redirect("/onboarding");

  return <main className="onboarding-shell plan-shell">
    <header className="onboarding-header"><Link className="brand" href="/dashboard"><img src="/jelly-logo.gif?v=3" alt="" />Jelly</Link><div className="session-links"><SignOutButton /></div></header>
    <PlanContent answers={parsed.data} />
  </main>;
}

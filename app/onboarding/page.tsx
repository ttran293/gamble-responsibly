import { pool } from "../../lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingForm } from "../../components/onboarding-form";
import { userProfiles } from "../../db/schema";
import { auth } from "../../lib/auth";
import { db } from "../../lib/db";
import { onboardingSchema } from "../../lib/onboarding";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const [profile] = await db.select({
    answers: userProfiles.onboardingAnswers,
    completedAt: userProfiles.onboardingCompletedAt
  }).from(userProfiles).where(eq(userProfiles.userId, session.user.id)).limit(1);
  const parsed = onboardingSchema.safeParse(profile?.answers);

  const stored = await pool.query("SELECT revisions FROM guardrail_state WHERE user_id=$1", [session.user.id]);
  const goalLocked = Boolean(stored.rows[0]?.revisions?.length);
  return <main className="onboarding-shell">
    <header className="onboarding-header"><span className="brand"><span>◒</span> Jelly</span><span>Betting and spending tracker</span></header>
    <OnboardingForm initialAnswers={parsed.success ? parsed.data : null} editing={Boolean(profile?.completedAt)} goalLocked={goalLocked} />
  </main>;
}

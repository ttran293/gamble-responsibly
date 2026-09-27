import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingForm } from "../../components/onboarding-form";
import { userProfiles } from "../../db/schema";
import { auth } from "../../lib/auth";
import { db } from "../../lib/db";
import { onboardingSchema } from "../../lib/onboarding";
import { SignOutButton } from "../../components/sign-out-button";

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const [profile] = await db.select({
    answers: userProfiles.onboardingAnswers,
    completedAt: userProfiles.onboardingCompletedAt
  }).from(userProfiles).where(eq(userProfiles.userId, session.user.id)).limit(1);
  const parsed = onboardingSchema.safeParse(profile?.answers);

  return <main className="onboarding-shell onboarding-fit">
    <header className="onboarding-header"><span className="brand"><img src="/jelly-logo.gif?v=3" alt="" />Jelly</span><div className="session-links"><Link className="nav-cta" href="/dashboard">Go to dashboard</Link><SignOutButton /></div></header>
    <OnboardingForm initialAnswers={parsed.success ? parsed.data : null} editing={Boolean(profile?.completedAt)} />
  </main>;
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { ConnectedDashboard } from "../../components/connected-dashboard";
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
  return <ConnectedDashboard name={session.user.name || "there"} emailVerified={session.user.emailVerified} answers={parsed.data} />;
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { db } from "../../lib/db";
import { userProfiles } from "../../db/schema";
import { eq } from "drizzle-orm";
import { pauseActionOptions, labelFor } from "../../lib/onboarding";
import { Guardrails } from "../../components/guardrails";
export default async function GuardrailsPage(){
 const session=await auth.api.getSession({headers:await headers()});if(!session)redirect("/sign-in");
 const [profile]=await db.select().from(userProfiles).where(eq(userProfiles.userId,session.user.id)).limit(1);
 if(!profile?.onboardingCompletedAt)redirect("/onboarding");
 const answers=profile.onboardingAnswers;
 const goal=answers?.goal;
 const pause=answers?.pauseAction==="custom"?answers.customPauseAction??"":answers?.pauseAction?labelFor(pauseActionOptions,answers.pauseAction):"";
 return <><div className="private-nav"><a className="brand" href="/">◒ stillwater</a><a href="/dashboard">My dashboard</a></div><main className="private-dashboard metrics-dashboard"><Guardrails initialGoal={goal==="reduce"||goal==="stop"?goal:"stay"} initialStopDate={answers?.stopDate} initialPausePlan={pause}/></main></>;
}

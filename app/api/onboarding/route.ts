import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { userProfiles } from "../../../db/schema";
import { auth } from "../../../lib/auth";
import { pool } from "../../../lib/db";
import { db } from "../../../lib/db";
import { onboardingSchema } from "../../../lib/onboarding";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Please sign in to save your answers." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your answers and try again." }, { status: 400 });
  }

  const answers = {
    ...parsed.data,
    customPauseAction: parsed.data.pauseAction === "custom" ? parsed.data.customPauseAction : null,
    reduceTarget: parsed.data.goal === "reduce" ? parsed.data.reduceTarget : null,
    stopDate: parsed.data.goal === "stop" ? parsed.data.stopDate : null
  };

  try {
    const stored = await pool.query("SELECT revisions FROM guardrail_state WHERE user_id=$1", [session.user.id]);
    const savedPlan = stored.rows[0]?.revisions?.at(-1)?.plan;
    if (savedPlan && (answers.goal !== savedPlan.goal || answers.stopDate !== (savedPlan.goal === "stop" ? savedPlan.stopDate : null))) {
      return NextResponse.json({error:"Update your saved goal and stop date on the guardrails page."}, {status:409});
    }
    const existing = await db.select({ completedAt: userProfiles.onboardingCompletedAt })
      .from(userProfiles).where(eq(userProfiles.userId, session.user.id)).limit(1);
    await db.insert(userProfiles).values({
      userId: session.user.id,
      onboardingAnswers: answers,
      onboardingCompletedAt: existing[0]?.completedAt ?? new Date()
    }).onConflictDoUpdate({
      target: userProfiles.userId,
      set: { onboardingAnswers: answers, onboardingCompletedAt: existing[0]?.completedAt ?? new Date() }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Could not save onboarding answers", error);
    return NextResponse.json({ error: "We could not save your answers. Please try again." }, { status: 503 });
  }
}

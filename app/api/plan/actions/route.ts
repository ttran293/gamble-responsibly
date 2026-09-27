import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { planActionCompletions } from "../../../../db/schema";
import { auth } from "../../../../lib/auth";
import { db } from "../../../../lib/db";

const change = z.object({ actionId: z.string().min(1).max(180).regex(/^[a-z0-9:+_-]+$/), completed: z.boolean() });

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Sign in to view your checklist." }, { status: 401 });
  try {
    const rows = await db.select({ actionId: planActionCompletions.actionId }).from(planActionCompletions).where(eq(planActionCompletions.userId, session.user.id));
    return Response.json({ completed: rows.map(row => row.actionId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Your checklist is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Sign in to update your checklist." }, { status: 401 });
  const parsed = change.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid checklist item." }, { status: 400 });
  const { actionId, completed } = parsed.data;
  try {
    if (completed) await db.insert(planActionCompletions).values({ userId: session.user.id, actionId }).onConflictDoNothing();
    else await db.delete(planActionCompletions).where(and(eq(planActionCompletions.userId, session.user.id), eq(planActionCompletions.actionId, actionId)));
    return Response.json({ actionId, completed }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "Could not save this checklist item. Try again." }, { status: 503 });
  }
}

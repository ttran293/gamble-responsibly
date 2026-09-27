import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { userProfiles } from "../../../db/schema";
import { auth } from "../../../lib/auth";
import { chatContext } from "../../../lib/chat/context";
import { completeChat, moderatedCrisis } from "../../../lib/chat/openai";
import { bettingReply, classifyClearRequest, crisisReply, fallbackReply, type SafetyFlag } from "../../../lib/chat/safety";
import { db, pool } from "../../../lib/db";
import { onboardingSchema } from "../../../lib/onboarding";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "private, no-store" };
const inputSchema = z.object({ content: z.string().trim().min(1).max(2000), consent: z.literal(true) });

async function viewer() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const [profile] = await db.select({ answers: userProfiles.onboardingAnswers, completedAt: userProfiles.onboardingCompletedAt }).from(userProfiles).where(eq(userProfiles.userId, session.user.id)).limit(1);
  const parsed = onboardingSchema.safeParse(profile?.answers);
  return { userId: session.user.id, answers: profile?.completedAt && parsed.success && ["stay", "reduce", "stop"].includes(parsed.data.goal) ? parsed.data : null };
}

function originOk(request: Request) { return request.headers.get("origin") === new URL(request.url).origin; }
function error(message: string, status: number) { return Response.json({ error: message }, { status, headers: noStore }); }
async function purgeExpired() { await pool.query("DELETE FROM chat_threads WHERE updated_at < now() - interval '90 days' AND (pending_token IS NULL OR pending_at < now() - interval '45 seconds')"); }

export async function GET() {
  try {
    await purgeExpired();
    const account = await viewer();
    if (!account) return error("Sign in to view your chat.", 401);
    if (!account.answers) return error("Complete onboarding to use chat.", 403);
    const thread = await pool.query("SELECT id FROM chat_threads WHERE user_id = $1", [account.userId]);
    if (!thread.rows[0]) return Response.json({ messages: [], consented: false }, { headers: noStore });
    const messages = await pool.query("SELECT id, role, content, safety_flag AS \"safetyFlag\", created_at AS \"createdAt\" FROM chat_messages WHERE thread_id = $1 ORDER BY created_at, id", [thread.rows[0].id]);
    return Response.json({ messages: messages.rows, consented: true }, { headers: noStore });
  } catch { return error("Chat history is unavailable.", 503); }
}

export async function POST(request: Request) {
  if (!originOk(request)) return error("Invalid request origin.", 403);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error("Enter a message of up to 2,000 characters and accept the chat disclosure.", 400);
  let account: Awaited<ReturnType<typeof viewer>>;
  try { account = await viewer(); } catch { return error("Chat is unavailable.", 503); }
  if (!account) return error("Sign in to use chat.", 401);
  if (!account.answers) return error("Complete onboarding to use chat.", 403);

  const content = parsed.data.content;
  let flag: SafetyFlag = classifyClearRequest(content);
  const key = process.env.OPENAI_API_KEY;
  if (flag === "none" && key) {
    try { if (await moderatedCrisis(content, key)) flag = "crisis"; }
    catch { flag = "safety_fallback"; }
  } else if (flag === "none") {
    return error("The chat coach is unavailable. Support links remain available below.", 503);
  }

  const token = crypto.randomUUID();
  let threadId: string | null = null;
  try {
    await purgeExpired();
    await pool.query("INSERT INTO chat_threads (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [account.userId]);
    const claimed = await pool.query("UPDATE chat_threads SET pending_token = $2, pending_at = now() WHERE user_id = $1 AND (pending_token IS NULL OR pending_at < now() - interval '45 seconds') RETURNING id", [account.userId, token]);
    if (!claimed.rows[0]) return error("Your previous message is still processing. Try again shortly.", 409);
    threadId = claimed.rows[0].id;

    let history: Array<{ role: "user" | "assistant"; content: string }> = [];
    let reply = flag === "crisis" ? crisisReply : flag === "betting_advice" ? bettingReply : fallbackReply;
    if (flag === "none") {
      const rows = await pool.query("SELECT role, content FROM chat_messages WHERE thread_id = $1 ORDER BY created_at DESC, id DESC LIMIT 20", [threadId]);
      history = rows.rows.reverse();
      try {
        const result = await completeChat(chatContext(account.answers), [...history, { role: "user", content }], key!);
        reply = result.reply; flag = result.flag;
      } catch { return error("The chat coach is unavailable. Your message was not saved. Try again later.", 503); }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT id FROM chat_threads WHERE id = $1 AND pending_token = $2 FOR UPDATE", [threadId, token]);
      if (!locked.rows[0]) { await client.query("ROLLBACK"); return error("This chat request expired. Please try again.", 409); }
      const savedUser = await client.query("INSERT INTO chat_messages (thread_id, role, content, safety_flag) VALUES ($1, 'user', $2, $3) RETURNING id, role, content, safety_flag AS \"safetyFlag\", created_at AS \"createdAt\"", [threadId, content, flag]);
      const savedReply = await client.query("INSERT INTO chat_messages (thread_id, role, content, safety_flag) VALUES ($1, 'assistant', $2, $3) RETURNING id, role, content, safety_flag AS \"safetyFlag\", created_at AS \"createdAt\"", [threadId, reply, flag]);
      await client.query("UPDATE chat_threads SET pending_token = NULL, pending_at = NULL, updated_at = now() WHERE id = $1 AND pending_token = $2", [threadId, token]);
      await client.query("COMMIT");
      return Response.json({ messages: [savedUser.rows[0], savedReply.rows[0]] }, { headers: noStore });
    } catch { await client.query("ROLLBACK"); return error("Could not save the conversation.", 503); }
    finally { client.release(); }
  } catch { return error("Chat is unavailable.", 503); }
  finally { if (threadId) await pool.query("UPDATE chat_threads SET pending_token = NULL, pending_at = NULL WHERE id = $1 AND pending_token = $2", [threadId, token]).catch(() => {}); }
}

export async function DELETE(request: Request) {
  if (!originOk(request)) return error("Invalid request origin.", 403);
  try {
    const account = await viewer();
    if (!account) return error("Sign in to delete your chat.", 401);
    const result = await pool.query("DELETE FROM chat_threads WHERE user_id = $1 AND pending_token IS NULL RETURNING id", [account.userId]);
    if (!result.rows[0]) {
      const busy = await pool.query("SELECT 1 FROM chat_threads WHERE user_id = $1", [account.userId]);
      if (busy.rows[0]) return error("Wait for the current reply before deleting chat.", 409);
    }
    return Response.json({ ok: true }, { headers: noStore });
  } catch { return error("Could not delete chat history.", 503); }
}

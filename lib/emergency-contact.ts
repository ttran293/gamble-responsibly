import { randomBytes } from "crypto";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { emergencyContactLinks, emergencyContactRequests, invitations, supportContacts, user } from "../db/schema";
import { db, pool } from "./db";
import { hashInviteToken } from "./invitations";
import { demoInvitationSenderEmail } from "./invitation-email";

export type EmergencyContact = { name: string; email: string };
export type PendingEmergencyContact = EmergencyContact & { status: "pending" | "demo" };
export type EmergencyContactPreview = {
  requesterName: string;
  valid: boolean;
  reason?: "missing" | "expired" | "used";
};

export async function activeEmergencyContact(userId: string): Promise<EmergencyContact | null> {
  const [row] = await db.select({ name: supportContacts.name, email: supportContacts.email, supportContactId: emergencyContactLinks.supportContactId }).from(emergencyContactLinks)
    .innerJoin(supportContacts, eq(emergencyContactLinks.supportContactId, supportContacts.id))
    .where(and(eq(emergencyContactLinks.userId, userId), isNull(emergencyContactLinks.revokedAt)))
    .orderBy(desc(emergencyContactLinks.consentedAt))
    .limit(1);
  if (!row) return null;
  if (row.email !== demoInvitationSenderEmail) return { name: row.name, email: row.email };
  const [invite] = await db.select({ senderName: invitations.senderName }).from(invitations)
    .innerJoin(user, eq(invitations.recipientEmail, user.email))
    .where(and(
      eq(user.id, userId),
      eq(invitations.supportContactId, row.supportContactId),
      eq(invitations.status, "accepted")
    ))
    .orderBy(desc(invitations.acceptedAt))
    .limit(1);
  return { name: invite?.senderName ?? row.name, email: row.email };
}

export async function pendingEmergencyContactRequest(userId: string): Promise<PendingEmergencyContact | null> {
  const [row] = await db.select({
    name: emergencyContactRequests.contactName,
    email: emergencyContactRequests.contactEmail,
    status: emergencyContactRequests.status
  }).from(emergencyContactRequests)
    .where(and(
      eq(emergencyContactRequests.userId, userId),
      or(
        eq(emergencyContactRequests.status, "demo"),
        and(eq(emergencyContactRequests.status, "pending"), gt(emergencyContactRequests.expiresAt, new Date()))
      )
    ))
    .orderBy(desc(emergencyContactRequests.createdAt))
    .limit(1);
  return row ? { ...row, status: row.status as PendingEmergencyContact["status"] } : null;
}

export async function createEmergencyContactRequest(userId: string, accountEmail: string, name: string, email: string): Promise<{ ok: true; id: string; token: string } | { ok: false; error: string; status: number }> {
  if (email === accountEmail.toLowerCase()) return { ok: false, error: "Choose someone other than yourself.", status: 400 };
  const token = randomBytes(32).toString("base64url");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(23841, hashtext($1))", [userId]);
    const active = await client.query("SELECT 1 FROM emergency_contact_links WHERE user_id = $1 AND revoked_at IS NULL LIMIT 1", [userId]);
    if (active.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, error: "You already have an emergency contact.", status: 409 };
    }
    const quota = await client.query<{ n: number }>("SELECT count(*)::int AS n FROM emergency_contact_requests WHERE user_id = $1 AND created_at > now() - interval '24 hours'", [userId]);
    if (quota.rows[0].n >= 3) {
      await client.query("ROLLBACK");
      return { ok: false, error: "Too many emergency contact requests. Please try again later.", status: 429 };
    }
    const inserted = await client.query<{ id: string }>(`
      INSERT INTO emergency_contact_requests (user_id, contact_name, contact_email, token_hash, status, expires_at)
      VALUES ($1, $2, $3, $4, 'pending', now() + interval '72 hours') RETURNING id
    `, [userId, name, email, hashInviteToken(token)]);
    await client.query("COMMIT");
    return { ok: true, id: inserted.rows[0].id, token };
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return { ok: false, error: "Could not request an emergency contact. Try again.", status: 503 };
  } finally { client.release(); }
}

export async function supersedeOtherEmergencyContactRequests(userId: string, keepId: string) {
  await pool.query(
    "UPDATE emergency_contact_requests SET status = 'superseded' WHERE user_id = $1 AND id <> $2 AND status IN ('pending', 'demo')",
    [userId, keepId]
  );
}

export async function markDemoEmergencyContactRequest(userId: string, id: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const marked = await client.query("UPDATE emergency_contact_requests SET status = 'demo' WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING id", [id, userId]);
    if (!marked.rowCount) throw new Error("The emergency contact request is no longer pending.");
    await client.query("UPDATE emergency_contact_requests SET status = 'superseded' WHERE user_id = $1 AND id <> $2 AND status IN ('pending', 'demo')", [userId, id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

export async function removeDemoEmergencyContactRequest(userId: string) {
  return pool.query("DELETE FROM emergency_contact_requests WHERE user_id = $1 AND status = 'demo' RETURNING id", [userId]);
}

export async function deleteEmergencyContactRequest(id: string) {
  await pool.query("DELETE FROM emergency_contact_requests WHERE id = $1 AND status = 'pending'", [id]);
}

export async function previewEmergencyContactRequest(token: string): Promise<EmergencyContactPreview> {
  const [row] = await db.select({
    requesterName: user.name,
    status: emergencyContactRequests.status,
    expiresAt: emergencyContactRequests.expiresAt
  }).from(emergencyContactRequests)
    .innerJoin(user, eq(emergencyContactRequests.userId, user.id))
    .where(eq(emergencyContactRequests.tokenHash, hashInviteToken(token)))
    .limit(1);
  if (!row) return { requesterName: "", valid: false, reason: "missing" };
  if (row.status === "accepted") return { requesterName: row.requesterName, valid: false, reason: "used" };
  if (row.status !== "pending" || row.expiresAt.getTime() <= Date.now()) return { requesterName: row.requesterName, valid: false, reason: "expired" };
  return { requesterName: row.requesterName, valid: true };
}

export async function acceptEmergencyContactRequest(token: string): Promise<{ ok: true; requesterName: string } | { ok: false; error: string; status: number }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{ id: string; user_id: string; contact_name: string; contact_email: string; status: string; expires_at: Date; requester_name: string }>(`
      SELECT r.id, r.user_id, r.contact_name, r.contact_email, r.status, r.expires_at, u.name AS requester_name
      FROM emergency_contact_requests r JOIN "user" u ON u.id = r.user_id
      WHERE r.token_hash = $1 FOR UPDATE OF r
    `, [hashInviteToken(token)]);
    const request = found.rows[0];
    if (!request || request.status !== "pending" || request.expires_at.getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      return { ok: false, error: "This request is invalid or expired.", status: 410 };
    }
    const contact = await client.query<{ id: string }>(
      "INSERT INTO support_contacts (name, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET name = excluded.name RETURNING id",
      [request.contact_name, request.contact_email]
    );
    const existing = await client.query(
      "SELECT 1 FROM emergency_contact_links WHERE user_id = $1 AND support_contact_id = $2 AND revoked_at IS NULL LIMIT 1",
      [request.user_id, contact.rows[0].id]
    );
    if (!existing.rowCount) {
      await client.query(
        "INSERT INTO emergency_contact_links (user_id, support_contact_id) VALUES ($1, $2)",
        [request.user_id, contact.rows[0].id]
      );
    }
    await client.query("UPDATE emergency_contact_requests SET status = 'accepted', accepted_at = now() WHERE id = $1", [request.id]);
    await client.query("UPDATE emergency_contact_requests SET status = 'superseded' WHERE user_id = $1 AND id <> $2 AND status = 'pending'", [request.user_id, request.id]);
    await client.query("COMMIT");
    return { ok: true, requesterName: request.requester_name };
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return { ok: false, error: "Could not accept this request. Try again.", status: 503 };
  } finally { client.release(); }
}

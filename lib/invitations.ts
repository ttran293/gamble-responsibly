import { createHash } from "crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { emergencyContactLinks, invitations, supportContacts } from "../db/schema";
import { db } from "./db";

export const hashInviteToken = (value: string) => createHash("sha256").update(value).digest("hex");

export type InvitePreview = {
  senderName: string;
  senderEmail: string | null;
  recipientEmail: string;
  note: string | null;
  valid: boolean;
  reason?: "missing" | "expired" | "used";
};

export async function previewInvitation(token: string): Promise<InvitePreview> {
  const [row] = await db.select({
    recipientEmail: invitations.recipientEmail,
    status: invitations.status,
    expiresAt: invitations.expiresAt,
    note: invitations.note,
    senderName: supportContacts.name,
    senderEmail: supportContacts.email,
    senderConfirmedAt: invitations.senderConfirmedAt
  }).from(invitations)
    .innerJoin(supportContacts, eq(invitations.supportContactId, supportContacts.id))
    .where(eq(invitations.tokenHash, hashInviteToken(token)))
    .limit(1);
  if (!row) return { senderName: "", senderEmail: null, recipientEmail: "", note: null, valid: false, reason: "missing" };
  const preview = { senderName: row.senderName, senderEmail: row.senderConfirmedAt ? row.senderEmail : null, recipientEmail: row.recipientEmail, note: row.note };
  if (row.status !== "sent") return { ...preview, valid: false, reason: "used" };
  if (row.expiresAt.getTime() <= Date.now()) return { ...preview, valid: false, reason: "expired" };
  return { ...preview, valid: true };
}

export async function acceptInvitation(userId: string, email: string, token: string): Promise<{ ok: true; senderName: string } | { ok: false; error: string; status: number }> {
  return db.transaction(async (tx) => {
    const [invite] = await tx.select({
      id: invitations.id,
      recipientEmail: invitations.recipientEmail,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
      supportContactId: invitations.supportContactId,
      senderName: supportContacts.name
    }).from(invitations)
      .innerJoin(supportContacts, eq(invitations.supportContactId, supportContacts.id))
      .where(eq(invitations.tokenHash, hashInviteToken(token)))
      .limit(1)
      .for("update");
    if (!invite) return { ok: false, error: "This invitation is not valid.", status: 404 };
    if (invite.recipientEmail !== email.toLowerCase()) return { ok: false, error: "Create the account with the invited email address.", status: 403 };
    if (invite.status === "sent" && invite.expiresAt.getTime() <= Date.now()) return { ok: false, error: "This invitation has expired.", status: 410 };

    const [existing] = await tx.select({ id: emergencyContactLinks.id }).from(emergencyContactLinks).where(and(
      eq(emergencyContactLinks.userId, userId),
      eq(emergencyContactLinks.supportContactId, invite.supportContactId),
      isNull(emergencyContactLinks.revokedAt)
    )).limit(1);

    if (invite.status === "accepted") {
      if (existing) return { ok: true, senderName: invite.senderName };
      return { ok: false, error: "This invitation has already been used.", status: 409 };
    }
    if (invite.status !== "sent") return { ok: false, error: "This invitation is not valid.", status: 404 };
    if (!existing) await tx.insert(emergencyContactLinks).values({ userId, supportContactId: invite.supportContactId });
    await tx.update(invitations).set({ status: "accepted", acceptedAt: new Date() }).where(and(eq(invitations.id, invite.id), eq(invitations.status, "sent")));
    return { ok: true, senderName: invite.senderName };
  });
}

export async function activeEmergencyContact(userId: string) {
  const [row] = await db.select({ name: supportContacts.name }).from(emergencyContactLinks)
    .innerJoin(supportContacts, eq(emergencyContactLinks.supportContactId, supportContacts.id))
    .where(and(eq(emergencyContactLinks.userId, userId), isNull(emergencyContactLinks.revokedAt)))
    .orderBy(desc(emergencyContactLinks.consentedAt))
    .limit(1);
  return row ?? null;
}

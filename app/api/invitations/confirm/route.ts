import { randomBytes } from "crypto";
import { Resend } from "resend";
import { z } from "zod";
import { pool } from "../../../../lib/db";
import { escapeHtml, invitationBaseUrl, invitationEmailFailureMessage } from "../../../../lib/invitation-email";
import { hashInviteToken } from "../../../../lib/invitations";

const resend = new Resend(process.env.RESEND_API_KEY);
const noStore = { "Cache-Control": "private, no-store" };
const bodySchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{20,128}$/) });

type PendingInvitation = {
  id: string;
  recipient_email: string;
  support_contact_id: string;
  sender_email: string;
  sender_name: string;
  status: string;
  expires_at: Date;
};

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStore });
  }
  if (!process.env.EMAIL_FROM || !process.env.RESEND_API_KEY) {
    return Response.json({ error: "Email delivery is unavailable." }, { status: 503, headers: noStore });
  }
  let baseUrl: string;
  try { baseUrl = invitationBaseUrl(); }
  catch { return Response.json({ error: "Invitation links are unavailable." }, { status: 503, headers: noStore }); }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "This confirmation link is invalid." }, { status: 400, headers: noStore });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<PendingInvitation>(`
      SELECT i.id, i.recipient_email, i.support_contact_id, i.sender_name, i.status, i.expires_at, c.email AS sender_email
      FROM invitations i JOIN support_contacts c ON c.id = i.support_contact_id
      WHERE i.sender_confirm_token_hash = $1 FOR UPDATE OF i
    `, [hashInviteToken(parsed.data.token)]);
    const invite = found.rows[0];
    if (!invite || invite.status !== "pending_sender" || invite.expires_at.getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      return Response.json({ error: "This confirmation link is invalid or expired." }, { status: 410, headers: noStore });
    }

    const inviteToken = randomBytes(32).toString("base64url");
    const inviteUrl = `${baseUrl}/invite/${inviteToken}`;
    const delivered = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: invite.recipient_email,
      subject: "You have a Jelly invitation",
      html: `<p>Someone who confirmed control of ${escapeHtml(invite.sender_email)} invited you to Jelly.</p><p>They entered the name ${escapeHtml(invite.sender_name)}. Joining is your choice. They cannot see your activity or finances.</p><p><a href="${escapeHtml(inviteUrl)}">Open invitation</a></p><p>This invitation expires in 72 hours.</p>`
    });
    if (delivered.error) {
      console.error("Could not send confirmed invitation", delivered.error);
      await client.query("ROLLBACK");
      return Response.json({ error: invitationEmailFailureMessage(delivered.error, "invitation") }, { status: 503, headers: noStore });
    }
    await client.query("UPDATE support_contacts SET name = $2 WHERE id = $1", [invite.support_contact_id, invite.sender_name]);
    await client.query(`
      UPDATE invitations SET status = 'sent', token_hash = $2, sender_confirm_token_hash = NULL,
        sender_confirmed_at = now(), expires_at = now() + interval '72 hours', resend_message_id = $3
      WHERE id = $1
    `, [invite.id, hashInviteToken(inviteToken), delivered.data?.id ?? null]);
    await client.query("COMMIT");
    return Response.json({ ok: true }, { headers: noStore });
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return Response.json({ error: "Could not confirm the invitation. Please try again later." }, { status: 503, headers: noStore });
  } finally { client.release(); }
}

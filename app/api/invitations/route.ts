import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { pool } from "../../../lib/db";
import { escapeHtml, invitationBaseUrl, invitationEmailFailureMessage } from "../../../lib/invitation-email";
import { hashInviteToken } from "../../../lib/invitations";
import { invitationSchema } from "../../../lib/validation";

const resend = new Resend(process.env.RESEND_API_KEY);
const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: noStore });
  }
  if (!process.env.EMAIL_FROM || !process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email delivery is unavailable." }, { status: 503, headers: noStore });
  }
  let baseUrl: string;
  try { baseUrl = invitationBaseUrl(); }
  catch { return NextResponse.json({ error: "Invitation links are unavailable." }, { status: 503, headers: noStore }); }

  const parsed = invitationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please provide valid names and email addresses." }, { status: 400, headers: noStore });

  const { senderName, note } = parsed.data;
  const senderEmail = parsed.data.senderEmail.toLowerCase();
  const recipientEmail = parsed.data.recipientEmail.toLowerCase();
  const inviteToken = randomBytes(32).toString("base64url");
  let invitationId: string;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize quota checks and inserts so concurrent requests cannot pass the same limit.
    await client.query("SELECT pg_advisory_xact_lock(23840, 1)");
    const quota = await client.query<{ hourly: number; daily: number; sender: number; recipient: number }>(`
      SELECT
        count(*) FILTER (WHERE i.created_at > now() - interval '1 hour')::int AS hourly,
        count(*)::int AS daily,
        count(*) FILTER (WHERE c.email = $1)::int AS sender,
        count(*) FILTER (WHERE i.recipient_email = $2)::int AS recipient
      FROM invitations i JOIN support_contacts c ON c.id = i.support_contact_id
      WHERE i.created_at > now() - interval '24 hours'
    `, [senderEmail, recipientEmail]);
    if (quota.rows[0].hourly >= 10 || quota.rows[0].daily >= 50 || quota.rows[0].sender >= 3 || quota.rows[0].recipient >= 3) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Too many invitation requests. Please try again later." }, { status: 429, headers: noStore });
    }
    const contact = await client.query<{ id: string }>(
      "INSERT INTO support_contacts (name, email) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET email = excluded.email RETURNING id",
      [senderName, senderEmail]
    );
    const invitation = await client.query<{ id: string }>(`
      INSERT INTO invitations (recipient_email, support_contact_id, token_hash, sender_name, note, expires_at, status)
      VALUES ($1, $2, $3, $4, $5, now() + interval '72 hours', 'sending') RETURNING id
    `, [recipientEmail, contact.rows[0].id, hashInviteToken(inviteToken), senderName, note ?? null]);
    invitationId = invitation.rows[0].id;
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ error: "Could not create the invitation request." }, { status: 503, headers: noStore });
  } finally { client.release(); }

  try {
    const inviteUrl = `${baseUrl}/invite/${inviteToken}`;
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: recipientEmail,
      subject: `${senderName} invited you to use Jelly`,
      html: `<p>Someone entered the name ${escapeHtml(senderName)} and invited you to use Jelly to track betting habits and spending.</p><p>Joining is your choice. The sender's email address has not been confirmed. They cannot see your activity or finances.</p><p><a href="${escapeHtml(inviteUrl)}">Open invitation</a></p><p>This invitation expires in 72 hours.</p>`
    });
    if (result.error) throw result.error;
    await pool.query(`
      UPDATE invitations SET status = 'sent', resend_message_id = $2
      WHERE id = $1 AND status = 'sending'
    `, [invitationId!, result.data?.id ?? null]);
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) {
    console.error("Could not send invitation email", error);
    await pool.query("DELETE FROM invitations WHERE id = $1 AND status = 'sending'", [invitationId!]).catch(() => {});
    return NextResponse.json({ error: invitationEmailFailureMessage(error, "invitation") }, { status: 503, headers: noStore });
  }
}

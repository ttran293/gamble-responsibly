import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sql } from "drizzle-orm";
import { db } from "../../../lib/db";
import { invitationSchema } from "../../../lib/validation";

const resend = new Resend(process.env.RESEND_API_KEY);
const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  const emailFrom = process.env.EMAIL_FROM;
  if (!emailFrom) {
    return NextResponse.json({ error: "Email delivery is not configured yet. Add a verified Resend sender as EMAIL_FROM." }, { status: 503 });
  }
  const parsed = invitationSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Please provide valid names and email addresses." }, { status: 400 });

  const { senderName, senderEmail, recipientEmail, note } = parsed.data;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  try {
    const contact = await db.execute<{ id: string }>(sql`
      insert into support_contacts (name, email) values (${senderName}, ${senderEmail.toLowerCase()})
      on conflict (email) do update set name = excluded.name returning id
    `);
    const contactId = contact.rows[0].id;
    const invitation = await db.execute<{ id: string }>(sql`
      insert into invitations (recipient_email, support_contact_id, token_hash, note, expires_at, status)
      values (${recipientEmail.toLowerCase()}, ${contactId}, ${hashToken(token)}, ${note ?? null}, ${expiresAt}, 'sent') returning id
    `);
    const inviteUrl = new URL(`/invite/${token}`, process.env.APP_URL ?? new URL(request.url).origin).toString();
    const email = await resend.emails.send({
      from: emailFrom,
      to: recipientEmail,
      subject: `${senderName} invited you to use Stillwater`,
      html: `<p>${senderName} invited you to use Stillwater to track your betting habits and spending.</p><p>Joining is your choice. They cannot see your activity or finances.</p><p><a href="${inviteUrl}">Open invitation</a></p><p>This invitation expires in 72 hours.</p>`
    });
    if (email.error) throw new Error(email.error.message);
    await db.execute(sql`update invitations set resend_message_id = ${email.data?.id ?? null} where id = ${invitation.rows[0].id}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Invitation email failed", error);
    const testSender = emailFrom.includes("onboarding@resend.dev");
    return NextResponse.json({
      error: testSender
        ? "Resend test mode can only deliver to its test recipient, delivered@resend.dev. Verify a domain to send to real email addresses."
        : "We could not send that invitation. Please try again later."
    }, { status: 503 });
  }
}

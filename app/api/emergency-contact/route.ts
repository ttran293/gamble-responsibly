import { headers } from "next/headers";
import { Resend } from "resend";
import { auth } from "../../../lib/auth";
import {
  activeEmergencyContact, createEmergencyContactRequest, deleteEmergencyContactRequest,
  pendingEmergencyContactRequest, supersedeOtherEmergencyContactRequests
} from "../../../lib/emergency-contact";
import { escapeHtml, invitationBaseUrl } from "../../../lib/invitation-email";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);
const noStore = { "Cache-Control": "private, no-store" };
const requestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254)
});

function emailFailureMessage(error: unknown): string {
  const message = typeof error === "object" && error && "message" in error && typeof error.message === "string" ? error.message : "";
  const allowed = message.match(/your own email address \(([^)]+)\)/);
  if (allowed) return `Email is in testing mode, so this request can only be sent to ${allowed[1]}. Use that address, or verify a sending domain in Resend.`;
  if (/verify a domain|testing email|example\.com/i.test(message)) return "Email is in testing mode and cannot be sent to that address. Verify a sending domain in Resend, then try again.";
  return "Could not email the request. Try again.";
}

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Sign in to view your emergency contact." }, { status: 401, headers: noStore });
  try {
    const contact = await activeEmergencyContact(session.user.id);
    const pending = contact ? null : await pendingEmergencyContactRequest(session.user.id);
    return Response.json({ contact, pending }, { headers: noStore });
  } catch (error) {
    console.error("Could not load emergency contact", error);
    return Response.json({ error: "Your emergency contact is unavailable." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStore });
  }
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Sign in to request an emergency contact." }, { status: 401, headers: noStore });
  if (!process.env.EMAIL_FROM || !process.env.RESEND_API_KEY) {
    return Response.json({ error: "Email delivery is unavailable." }, { status: 503, headers: noStore });
  }
  let baseUrl: string;
  try { baseUrl = invitationBaseUrl(); }
  catch { return Response.json({ error: "Emergency contact links are unavailable." }, { status: 503, headers: noStore }); }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a name and email address." }, { status: 400, headers: noStore });
  const email = parsed.data.email.toLowerCase();
  const created = await createEmergencyContactRequest(session.user.id, session.user.email, parsed.data.name, email);
  if (!created.ok) return Response.json({ error: created.error }, { status: created.status, headers: noStore });

  try {
    const acceptUrl = `${baseUrl}/emergency-contact/accept/${created.token}`;
    const requester = session.user.name || "Someone";
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Accept an emergency contact request on Jelly",
      html: `<p>${escapeHtml(requester)} (${escapeHtml(session.user.email)}) asked you to be their emergency contact on Jelly.</p><p>If you accept, Jelly may email you when a streak of not betting breaks, or when they want to reach out before betting. You will not see their habit record, spending, goal, or conversations.</p><p>Accepting is your choice. You can ignore this email.</p><p><a href="${escapeHtml(acceptUrl)}">Review the request</a></p><p>This link expires in 72 hours.</p>`
    });
    if (result.error) throw result.error;
    await supersedeOtherEmergencyContactRequests(session.user.id, created.id);
    return Response.json({ ok: true, pending: { name: parsed.data.name, email } }, { headers: noStore });
  } catch (error) {
    console.error("Could not email emergency contact request", error);
    await deleteEmergencyContactRequest(created.id).catch(() => {});
    return Response.json({ error: emailFailureMessage(error) }, { status: 503, headers: noStore });
  }
}

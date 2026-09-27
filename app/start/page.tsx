import { StartForm } from "../../components/start-form";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { previewInvitation } from "../../lib/invitations";

const inviteMessages = {
  missing: "This invitation link is not valid. You can still create an account.",
  expired: "This invitation has expired. You can still create an account without an emergency contact.",
  used: "This invitation was already used. You can still create an account, or sign in."
};

export default async function StartPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/dashboard");
  const { invite: token } = await searchParams;
  let invite: { token: string; senderName: string; senderEmail: string | null; recipientEmail: string; note: string | null } | null = null;
  let inviteMessage = "";
  if (token && /^[A-Za-z0-9_-]{20,128}$/.test(token)) {
    try {
      const preview = await previewInvitation(token);
      if (preview.valid) invite = { token, senderName: preview.senderName, senderEmail: preview.senderEmail, recipientEmail: preview.recipientEmail, note: preview.note };
      else if (preview.reason) inviteMessage = inviteMessages[preview.reason];
    } catch {
      inviteMessage = "We could not check this invitation. You can still create an account.";
    }
  } else if (token) inviteMessage = inviteMessages.missing;
  return <main className="auth-shell"><section className="auth-card"><Link className="back-home" href="/">← Back to home</Link><h1>Start tracking your betting.</h1>{inviteMessage && <p className="form-status" role="status">{inviteMessage}</p>}<StartForm invite={invite} /><p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p></section></main>;
}

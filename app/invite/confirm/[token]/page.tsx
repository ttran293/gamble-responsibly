import Link from "next/link";
import { ConfirmInvitation } from "../../../../components/confirm-invitation";

export default async function ConfirmInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="auth-shell"><section className="auth-card"><Link className="back-home" href="/">← Back to home</Link><h1>Confirm your invitation request</h1><ConfirmInvitation token={token} /></section></main>;
}

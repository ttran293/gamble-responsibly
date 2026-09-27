import { InvitationForm } from "../../components/invitation-form";
import Link from "next/link";

export default function SupporterPage() {
  return <main className="auth-shell supporter-shell"><section className="auth-card wide"><Link className="back-home" href="/">← Back to home</Link><span className="eyebrow">For someone you care about</span><h1>Invite them to use Jelly.</h1><p>Jelly helps them track betting habits and spending. Confirm your email before the invitation is sent. They decide whether to join. If they create an account from your invitation, you become their emergency contact. You will never see their activity, finances, dashboard, or conversations.</p><InvitationForm /></section></main>;
}

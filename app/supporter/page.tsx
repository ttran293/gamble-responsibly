import { InvitationForm } from "../../components/invitation-form";
import Link from "next/link";

export default function SupporterPage() {
  const testMode = process.env.EMAIL_FROM?.includes("onboarding@resend.dev") ?? false;
  return <main className="auth-shell supporter-shell"><section className="auth-card wide"><Link className="back-home" href="/">← Back to home</Link><span className="eyebrow">For someone you care about</span><h1>Invite them to use Stillwater.</h1><p>Stillwater helps them track betting habits and spending. They decide whether to join, and you will never see their activity, finances, dashboard, or conversations.</p><InvitationForm testMode={testMode} /></section></main>;
}

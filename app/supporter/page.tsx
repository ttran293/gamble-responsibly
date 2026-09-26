import { InvitationForm } from "../../components/invitation-form";
import Link from "next/link";

export default function SupporterPage() {
  const testMode = process.env.EMAIL_FROM?.includes("onboarding@resend.dev") ?? false;
  return <main className="auth-shell supporter-shell"><section className="auth-card wide"><Link className="back-home" href="/">← Back to home</Link><span className="eyebrow">For someone you care about</span><h1>Share a private invitation.</h1><p>They decide whether to join. If they do, you can be saved as their chosen support contact—but you will never see their gambling activity, finances, dashboard, or conversations.</p><InvitationForm testMode={testMode} /></section></main>;
}

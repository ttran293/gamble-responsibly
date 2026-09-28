import Link from "next/link";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="auth-shell"><section className="auth-card"><span className="eyebrow">Invitation to Jelly</span><h1>Track your habits and spending.</h1><p>Someone who cares about you invited you to use Jelly. You decide whether to join. If you create an account from this invitation, they become your emergency contact in Jelly. They cannot see your betting activity, finances, insights, or pause plan.</p><Link className="primary block" href={`/start?invite=${encodeURIComponent(token)}`}>Get started →</Link><Link className="quiet-link" href="/">No thanks, return home</Link></section></main>;
}

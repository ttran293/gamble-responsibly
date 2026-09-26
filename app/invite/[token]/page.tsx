import Link from "next/link";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="auth-shell"><section className="auth-card"><span className="eyebrow">A private invitation</span><h1>Start on your own terms.</h1><p>Someone who cares about you shared Stillwater. If you continue, you can choose whether to save them as a personal support contact. They will not be able to see your activity, finances, insights, or pause plan.</p><Link className="primary block" href={`/start?invite=${encodeURIComponent(token)}`}>Continue privately →</Link><Link className="quiet-link" href="/">No thanks, return home</Link></section></main>;
}

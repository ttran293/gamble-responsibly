import { StartForm } from "../../components/start-form";
import Link from "next/link";

export default function StartPage() {
  return <main className="auth-shell"><section className="auth-card"><Link className="back-home" href="/">← Back to home</Link><span className="eyebrow">Betting and spending tracker</span><h1>Start tracking your betting.</h1><p>Create an account to keep track of your habits and spending. Email verification is encouraged, not required to begin.</p><StartForm /><p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p></section></main>;
}

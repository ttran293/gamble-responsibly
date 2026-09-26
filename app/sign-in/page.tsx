import { SignInForm } from "../../components/sign-in-form";
import Link from "next/link";

export default function SignInPage() {
  return <main className="auth-shell"><section className="auth-card"><Link className="back-home" href="/">← Back to home</Link><span className="eyebrow">Welcome back</span><h1>Sign in to Jelly.</h1><p>Your betting activity and spending stay visible only to you.</p><SignInForm /><p className="auth-switch">New to Jelly? <Link href="/start">Create an account</Link></p></section></main>;
}

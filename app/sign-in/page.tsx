import { SignInForm } from "../../components/sign-in-form";
import Link from "next/link";

export default function SignInPage() {
  return <main className="auth-shell"><section className="auth-card"><Link className="back-home" href="/">← Back to home</Link><span className="eyebrow">Welcome back</span><h1>Sign in privately.</h1><p>Your tracker remains private to you.</p><SignInForm /><p className="auth-switch">New to Stillwater? <Link href="/start">Create a private account</Link></p></section></main>;
}

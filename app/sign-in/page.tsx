import { SignInForm } from "../../components/sign-in-form";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";

export default async function SignInPage() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/dashboard");
  return <main className="auth-shell"><section className="auth-card"><Link className="back-home" href="/">← Back to home</Link><h1>Sign in.</h1><SignInForm /><p className="auth-switch">New to Jelly? <Link href="/start">Create an account</Link></p></section></main>;
}

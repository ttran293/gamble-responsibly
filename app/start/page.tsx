import { StartForm } from "../../components/start-form";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";

export default async function StartPage() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/dashboard");
  return <main className="auth-shell"><section className="auth-card"><Link className="back-home" href="/">← Back to home</Link><h1>Start tracking your betting.</h1><StartForm /><p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p></section></main>;
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { PrivateDashboard } from "../../components/private-dashboard";
import { loadFixture } from "../../lib/metrics/fixture";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  try {
    return <PrivateDashboard name={session.user.name || "there"} snapshot={await loadFixture()} />;
  } catch {
    return <main className="auth-shell"><section className="auth-card"><h1>Demo data unavailable</h1><p>The fixture could not be loaded or validated. No metrics are being shown. Restore the supplied CSV files and reload this page.</p><a href="/dashboard">Try again</a></section></main>;
  }
}

import { PrivateDashboard } from "../../components/private-dashboard";
import { loadFixture } from "../../lib/metrics/fixture";
export const dynamic = "force-dynamic";
export default async function DemoPage() {
  try { return <PrivateDashboard name="Demo" snapshot={await loadFixture()} demo />; }
  catch { return <main className="auth-shell"><section className="auth-card"><h1>Demo data unavailable</h1><p>The supplied synthetic fixtures could not be loaded or validated. Restore the files and reload.</p><a href="/demo">Try again</a></section></main>; }
}

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";
import { PrivateDashboard } from "../../components/private-dashboard";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return <PrivateDashboard name={session.user.name || "there"} emailVerified={session.user.emailVerified} />;
}

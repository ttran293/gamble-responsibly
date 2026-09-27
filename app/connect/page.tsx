import { ConnectedDashboard } from "../../components/connected-dashboard";
import { headers } from "next/headers";
import { auth } from "../../lib/auth";

export default async function ConnectPage() {
  const signedIn = Boolean(await auth.api.getSession({ headers: await headers() }));
  return <ConnectedDashboard screen="connections" demo signedIn={signedIn} />;
}

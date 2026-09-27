import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../../lib/auth";

export default async function ConnectPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  redirect(session ? "/dashboard" : "/demo");
}

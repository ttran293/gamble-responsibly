import { headers } from "next/headers";
import { auth } from "../../../lib/auth";
import { activeEmergencyContact } from "../../../lib/invitations";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Sign in to view your emergency contact." }, { status: 401 });
  try {
    const contact = await activeEmergencyContact(session.user.id);
    return Response.json({ name: contact?.name ?? null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not load emergency contact", error);
    return Response.json({ error: "Your emergency contact is unavailable." }, { status: 503 });
  }
}

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "../../../../lib/auth";
import { acceptInvitation } from "../../../../lib/invitations";

const bodySchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{20,128}$/) });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Create your account before adding an emergency contact." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "This invitation is not valid." }, { status: 400 });
  try {
    const result = await acceptInvitation(session.user.id, session.user.email, parsed.data.token);
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status, headers: { "Cache-Control": "private, no-store" } });
    return Response.json({ ok: true, senderName: result.senderName }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Could not accept invitation", error);
    return Response.json({ error: "We could not add your emergency contact. Try again." }, { status: 503 });
  }
}

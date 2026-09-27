import { z } from "zod";
import { acceptEmergencyContactRequest } from "../../../../lib/emergency-contact";

const noStore = { "Cache-Control": "private, no-store" };
const bodySchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{20,128}$/) });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403, headers: noStore });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "This request is invalid." }, { status: 400, headers: noStore });
  const result = await acceptEmergencyContactRequest(parsed.data.token);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status, headers: noStore });
  return Response.json({ ok: true }, { headers: noStore });
}

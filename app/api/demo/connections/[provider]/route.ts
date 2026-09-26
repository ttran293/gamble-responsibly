import { loadFixture } from "../../../../../lib/metrics/fixture";

// This public endpoint only accepts the validated, synthetic demo fixtures.
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "draftkings" && provider !== "fanduel" && provider !== "moonharbor") return Response.json({ error: "Unknown demo provider." }, { status: 404 });
  let fail = false;
  try { const body = await request.json(); fail = body.simulateFailure === true; }
  catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (fail) return Response.json({ error: "Simulated connection failure. Retry to connect this demo account." }, { status: 503 });
  try { return Response.json(await loadFixture(provider), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Demo files are missing or failed validation. Restore this provider’s CSV files and retry." }, { status: 503 }); }
}

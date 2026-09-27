import { loadFixture, type DemoVersion } from "../../../../../lib/metrics/fixture";

// This public endpoint only accepts the validated, synthetic demo fixtures.
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (provider !== "draftkings" && provider !== "fanduel" && provider !== "moonharbor") return Response.json({ error: "Unknown demo provider." }, { status: 404 });
  let fail = false, version: DemoVersion = "v1";
  try {
    const body = await request.json();
    fail = body.simulateFailure === true;
    if (body.version !== undefined && body.version !== "v1" && body.version !== "v2") return Response.json({ error: "Choose demo version v1 or v2." }, { status: 400 });
    version = body.version ?? "v1";
  }
  catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (fail) return Response.json({ error: "Simulated connection failure. Retry to connect this demo account." }, { status: 503 });
  try { return Response.json(await loadFixture(provider, version), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Demo files are missing or failed validation. Restore this provider’s CSV files and retry." }, { status: 503 }); }
}

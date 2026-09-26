import { headers } from "next/headers";
import { auth } from "../../../lib/auth";
import { loadFixture } from "../../../lib/metrics/fixture";
import { summarize } from "../../../lib/metrics/core";
export async function GET(request: Request) {
  if (!await auth.api.getSession({ headers: await headers() })) return Response.json({ error: "Sign in to view your metrics." }, { status: 401 });
  try {
    const snapshot = await loadFixture();
    const query = new URL(request.url).searchParams;
    try { return Response.json({ mode: "demo", provider: snapshot.provider, loadedAt: snapshot.loadedAt, dataThrough: snapshot.through, metrics: summarize(snapshot, query.get("from") ?? snapshot.from, query.get("to") ?? snapshot.through.slice(0,10)) }, { headers: { "Cache-Control": "private, no-store" } }); }
    catch { return Response.json({ error: "Choose dates within the available demo history." }, { status: 400 }); }
  } catch { return Response.json({ error: "The demo data could not be loaded or validated." }, { status: 503 }); }
}

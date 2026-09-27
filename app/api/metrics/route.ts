import { headers } from "next/headers";
import { auth } from "../../../lib/auth";
import { loadFixture, type DemoVersion } from "../../../lib/metrics/fixture";
import { combineSnapshots, summarize } from "../../../lib/metrics/core";
export async function GET(request: Request) {
  if (!await auth.api.getSession({ headers: await headers() })) return Response.json({ error: "Sign in to view your metrics." }, { status: 401 });
  try {
    const query = new URL(request.url).searchParams;
    const version = query.get("version") ?? "v1";
    if (version !== "v1" && version !== "v2") return Response.json({ error: "Choose demo version v1 or v2." }, { status: 400 });
    const providers = [...new Set((query.get("providers") ?? "draftkings").split(","))];
    if (!providers.length || providers.some(p=>p!=="draftkings" && p!=="fanduel" && p!=="moonharbor")) return Response.json({ error: "Choose draftkings, fanduel, moonharbor, or a combination." }, { status: 400 });
    const snapshot = combineSnapshots(await Promise.all(providers.map(p=>loadFixture(p as "draftkings" | "fanduel" | "moonharbor", version as DemoVersion))));
    try { return Response.json({ mode: "demo", provider: snapshot.provider, loadedAt: snapshot.loadedAt, dataThrough: snapshot.through, metrics: summarize(snapshot, query.get("from") ?? snapshot.from, query.get("to") ?? snapshot.through.slice(0,10)) }, { headers: { "Cache-Control": "private, no-store" } }); }
    catch { return Response.json({ error: "Choose dates within the available demo history." }, { status: 400 }); }
  } catch { return Response.json({ error: "The demo data could not be loaded or validated." }, { status: 503 }); }
}

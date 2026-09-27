"use client";

import { useEffect, useState } from "react";
import type { OnboardingAnswers } from "../lib/onboarding";
import { demoConnectionsToLoad, saveDemoConnections } from "../lib/demo-connections";
import { combineSnapshots, type Snapshot } from "../lib/metrics/core";
import { recommendedPlan } from "../lib/recommended-plan";
import { PersonalSummary } from "./personal-summary";

export function PlanContent({ answers }: { answers: OnboardingAnswers }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const selected = demoConnectionsToLoad(true);
        const results = await Promise.all(selected.map(async provider => {
          const response = await fetch(`/api/demo/connections/${provider}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
          if (!response.ok) throw new Error("Could not load the connected activity. Recommendations are based on your answers for now.");
          return await response.json() as Snapshot;
        }));
        if (!cancelled) {
          try { saveDemoConnections(selected, true); } catch { /* Recommendations still use the loaded activity when storage is unavailable. */ }
          setSnapshot(results.length ? combineSnapshots(results) : null);
        }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load connected activity."); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);
  const plan = recommendedPlan(answers, snapshot);
  return <>
    <section className="plan-hero"><p className="eyebrow">Recommended from your goal and activity</p><h1>My Plan</h1><p>{loading ? "Loading connected activity…" : plan.intro}</p></section>
    {!loading && <PersonalSummary answers={answers} snapshot={snapshot} detailed />}
    {error && <p role="status">{error}</p>}
    <div className="plan-explanation"><strong>How we made this</strong><p>{loading ? "Checking connected sample accounts." : plan.dataNote} Recommendations use your onboarding goal and a complete week of recorded activity when available. Checking an item means you marked it done; it does not set a sportsbook limit, block betting, or notify anyone.</p></div>
  </>;
}

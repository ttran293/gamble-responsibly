"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  focusOptions, frequencyOptions, goalOptions,
  labelFor, triggerOptions, type OnboardingAnswers
} from "../lib/onboarding";
import { recommendedPlan } from "../lib/recommended-plan";
import type { Snapshot } from "../lib/metrics/core";

export function PersonalSummary({ answers, detailed = false, snapshot }: { answers: OnboardingAnswers; detailed?: boolean; snapshot?: Snapshot | null }) {
  const focus = answers.focusAreas.map((value) => labelFor(focusOptions, value));
  const triggers = answers.triggers.map((value) => labelFor(triggerOptions, value));
  const goalOption = goalOptions.find((option) => option.value === answers.goal);
  const plan = recommendedPlan(answers, snapshot);
  const [completed, setCompleted] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/plan/actions", { cache: "no-store" }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load your checklist.");
      if (!cancelled) setCompleted(body.completed);
    }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your checklist."); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);
  async function toggle(actionId: string, checked: boolean) {
    setSaving(actionId); setError("");
    try {
      const response = await fetch("/api/plan/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actionId, completed: checked }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save this item.");
      setCompleted(current => checked ? [...new Set([...current, actionId])] : current.filter(id => id !== actionId));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save this item."); }
    finally { setSaving(null); }
  }
  const done = plan.actions.filter(action => completed.includes(action.id)).length;

  return <section className="personal-summary" aria-label="Your goal and plan">
    <div className="personal-overview-grid">
      <article className="panel personal-card personal-goal">
        <div className="personal-card-header">
          <span className="eyebrow">Your Goal</span>
          <h3>{goalOption?.label ?? "Choose a goal"}</h3>
          <p>{goalOption?.description ?? "Choose whether you want to stay within limits, reduce gambling, or stop gambling."}</p>
        </div>
        <div className="personal-card-body">
          <div className="personal-card-row">
            <strong>What matters to you</strong>
            {focus.length ? <div className="personal-chips">{focus.map((label) => <span key={label}>{label}</span>)}</div> : <p>You can choose what to focus on whenever you're ready.</p>}
          </div>
          <div className="personal-card-row">
            <strong>Current pace</strong>
            <p>{answers.frequency ? labelFor(frequencyOptions, answers.frequency) : "Add this whenever you're ready."}</p>
          </div>
          <div className="personal-card-row">
            <strong>Moments to notice</strong>
            <p>{triggers.length ? triggers.join(", ") : "Watch for patterns as you track."}</p>
            <small>These are your choices, not a diagnosis or prediction.</small>
          </div>
        </div>
        <div className="personal-card-footer"><Link className="text-link" href="/onboarding">Change my goal →</Link></div>
      </article>
      <article className="panel personal-card personal-plan">
        <div className="personal-card-header">
          <span className="eyebrow">Your Plan</span>
          <h3>Actions for your goal</h3>
          <p>{plan.evidence ? "Actions shaped by your goal and recorded activity." : "Actions shaped by your goal and answers."}</p>
        </div>
        <div className="personal-card-body">
          <p className="plan-progress" aria-live="polite">{loaded ? `${done} of ${plan.actions.length} completed` : "Loading checklist…"}</p>
          <ol className="personal-plan-steps">{plan.actions.map((action) => <li className={`personal-card-row ${completed.includes(action.id) ? "is-done" : ""}`} key={action.id}><label className="plan-check-label"><input type="checkbox" checked={completed.includes(action.id)} disabled={!loaded || !!saving || !!error} onChange={event => void toggle(action.id, event.target.checked)} /><strong>{action.title}</strong></label><p>{action.detail}</p>{detailed && <small>{action.reason}</small>}</li>)}</ol>
          <small className="plan-data-note">{plan.dataNote}</small>
          {error && <p role="alert" className="plan-save-error">{error} <button type="button" className="text-link" onClick={() => { setError(""); setLoaded(false); fetch("/api/plan/actions", { cache: "no-store" }).then(r => r.json().then(body => { if (!r.ok) throw new Error(body.error); setCompleted(body.completed); setLoaded(true); })).catch(() => setError("Checklist is still unavailable.")); }}>Retry</button></p>}
        </div>
        <div className="personal-card-footer"><Link href={detailed ? "/dashboard" : "/plan"} className="text-link">{detailed ? "Go to dashboard" : "Review my plan"} →</Link></div>
      </article>
    </div>
  </section>;
}

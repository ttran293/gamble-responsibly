"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { OnboardingAnswers } from "../lib/onboarding";
import { goalSnapshot } from "../lib/goal-snapshot";
import { recommendedPlan } from "../lib/recommended-plan";
import type { Snapshot } from "../lib/metrics/core";
import { GoalDialog } from "./goal-dialog";
import { JellyMessage } from "./jelly-message";
import { UserMessage } from "./user-message";

export function PersonalSummary({ answers, detailed = false, snapshot }: { answers: OnboardingAnswers; detailed?: boolean; snapshot?: Snapshot | null }) {
  const router = useRouter();
  const [currentAnswers, setCurrentAnswers] = useState(answers);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);
  const plan = recommendedPlan(currentAnswers, snapshot);
  const goal = goalSnapshot(currentAnswers, plan.evidence, Boolean(snapshot));
  const [completed, setCompleted] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => setCurrentAnswers(answers), [answers]);
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
          <h3>Your conversation with Jelly</h3>
          <p>What you shared, and what Jelly noticed.</p>
        </div>
        <div className="personal-card-body goal-snapshot-body">
          {goal.userMessages.map((message, index) => <UserMessage key={index}><p>{message}</p></UserMessage>)}
          <JellyMessage label={plan.evidence ? "Jelly noticed" : "A note from Jelly"} className="goal-snapshot-message">
            <strong>Your current picture</strong>
            <p>{goal.picture}</p>
            <small>{goal.pictureSource}</small>
          </JellyMessage>
          <JellyMessage label="Jelly suggests" className="goal-snapshot-message goal-snapshot-suggestion">
            <strong>One thing to watch</strong>
            <p>{goal.watch}</p>
          </JellyMessage>
        </div>
        <div className="personal-card-footer"><button type="button" className="text-link" onClick={() => { setGoalSaved(false); setGoalDialogOpen(true); }}>Change my goal →</button>{goalSaved && <span className="goal-saved" role="status">Goal updated</span>}</div>
      </article>
      <article className="panel personal-card personal-plan">
        <div className="personal-card-header">
          <span className="eyebrow">Your Plan</span>
          <h3>Steps you could try</h3>
          <p>{plan.evidence ? "Jelly used your goal and recorded activity to suggest these steps." : "Jelly used your goal and answers to suggest these steps."}</p>
        </div>
        <div className="personal-card-body">
          <JellyMessage label="Jelly suggests" className="plan-steps-message">
            <p className="plan-progress" aria-live="polite">{loaded ? `${done} of ${plan.actions.length} completed` : "Loading checklist…"}</p>
            <ol className="personal-plan-steps">{plan.actions.map((action) => <li className={`personal-card-row ${completed.includes(action.id) ? "is-done" : ""}`} key={action.id}><label className="plan-check-label"><input type="checkbox" checked={completed.includes(action.id)} disabled={!loaded || !!saving || !!error} onChange={event => void toggle(action.id, event.target.checked)} /><strong>{action.title}</strong></label><p>{action.detail}</p>{detailed && <small>{action.reason}</small>}</li>)}</ol>
            <small className="plan-data-note">{plan.dataNote}</small>
            {error && <p role="alert" className="plan-save-error">{error} <button type="button" className="text-link" onClick={() => { setError(""); setLoaded(false); fetch("/api/plan/actions", { cache: "no-store" }).then(r => r.json().then(body => { if (!r.ok) throw new Error(body.error); setCompleted(body.completed); setLoaded(true); })).catch(() => setError("Checklist is still unavailable.")); }}>Retry</button></p>}
          </JellyMessage>
        </div>
        <div className="personal-card-footer"><Link href={detailed ? "/dashboard" : "/plan"} className="text-link">{detailed ? "Go to dashboard" : "Review my plan"} →</Link></div>
      </article>
    </div>
    {goalDialogOpen && <GoalDialog answers={currentAnswers} onCancel={() => setGoalDialogOpen(false)} onSaved={(saved) => { setCurrentAnswers(saved); setGoalDialogOpen(false); setGoalSaved(true); router.refresh(); }} />}
  </section>;
}

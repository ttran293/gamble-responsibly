"use client";

import Link from "next/link";
import { useState } from "react";
import {
  focusOptions, frequencyOptions, gamblingTypeOptions, goalOptions,
  labelFor, pauseActionOptions, triggerOptions, type OnboardingAnswers
} from "../lib/onboarding";

const goalDetails: Record<OnboardingAnswers["goal"], string> = {
  reduce: "You can work toward a smaller amount or fewer betting days, at your own pace.",
  stop: "You chose to stop betting. Your plan can help you decide what to do when an urge arrives.",
  understand: "Start by seeing your betting activity and spending clearly. You can choose another goal later.",
  unsure: "You don't have to decide on a goal yet. Start with what you'd like to keep track of."
};

function pauseDescription(answers: OnboardingAnswers) {
  if (answers.pauseAction === "custom") return answers.customPauseAction || "Your own pause action";
  if (answers.pauseAction) return labelFor(pauseActionOptions, answers.pauseAction);
  return "You can choose a pause action whenever you're ready.";
}

function goalTarget(answers: OnboardingAnswers) {
  if (answers.goal === "reduce" && answers.reduceTarget) {
    return answers.reduceTarget.kind === "days_per_week"
      ? `Your target: ${answers.reduceTarget.value} betting ${answers.reduceTarget.value === 1 ? "day" : "days"} per week.`
      : `Your target: up to $${answers.reduceTarget.value.toLocaleString()} in weekly spending.`;
  }
  if (answers.goal === "stop" && answers.stopDate) return `Your start date: ${answers.stopDate}.`;
  return null;
}

export function PersonalSummary({ answers, emailVerified }: { answers: OnboardingAnswers; emailVerified: boolean }) {
  const [pauseOpen, setPauseOpen] = useState(false);
  const focus = answers.focusAreas.map((value) => labelFor(focusOptions, value));
  const types = answers.gamblingTypes.map((value) => labelFor(gamblingTypeOptions, value));
  const triggers = answers.triggers.map((value) => labelFor(triggerOptions, value));
  const target = goalTarget(answers);

  return <section className="personal-summary" aria-label="Your onboarding choices">
    {!emailVerified && <div className="verification-banner"><div><strong>Protect this space</strong><br />Check your email to verify your account. You can keep using Stillwater now.</div></div>}
    <div className="personal-summary-header"><div><span className="eyebrow">Based on your answers</span><h2>Your starting point</h2></div><button className="urge-button" onClick={() => setPauseOpen(true)}><span className="urge-dot"></span>I feel like gambling <b>→</b></button></div>
    <div className="dashboard-personal-grid">
      <article className="panel personal-card"><span className="eyebrow">Your direction</span><h2>{labelFor(goalOptions, answers.goal)}</h2><p>{goalDetails[answers.goal]}</p>{target && <p className="personal-target">{target}</p>}<Link className="text-link" href="/onboarding">Update my answers →</Link></article>
      <article className="panel personal-card"><span className="eyebrow">What matters to you</span><h2>Your focus</h2>{focus.length ? <div className="personal-chips">{focus.map((label) => <span key={label}>{label}</span>)}</div> : <p>You can choose what to focus on whenever you're ready.</p>}{answers.frequency && <p className="personal-detail"><strong>Current pace:</strong> {labelFor(frequencyOptions, answers.frequency)}</p>}{types.length > 0 && <p className="personal-detail"><strong>Betting types:</strong> {types.join(", ")}</p>}</article>
    </div>
    <div className="dashboard-personal-grid dashboard-second-row">
      <article className="plan-card"><span className="eyebrow">Your pause plan</span><h2>When an urge shows up</h2><p>{pauseDescription(answers)}</p><button onClick={() => setPauseOpen(true)} className="outline-button">Review my plan →</button></article>
      <article className="panel personal-card"><span className="eyebrow">Patterns to notice</span><h2>Your starting points</h2>{triggers.length ? <p>You mentioned: {triggers.join(", ")}.</p> : <p>You can add moments when betting feels more likely, or simply watch for patterns as you track.</p>}<p className="personal-fineprint">These are your choices, not a diagnosis or prediction.</p></article>
    </div>
    {pauseOpen && <div className="pause-overlay" onClick={() => setPauseOpen(false)}><section className="pause-card" role="dialog" aria-modal="true" aria-label="Your pause plan" onClick={(event) => event.stopPropagation()}><button className="modal-close" aria-label="Close pause plan" onClick={() => setPauseOpen(false)}>×</button><span className="eyebrow">Your pause plan</span><h2>Pause before deciding.</h2><p>{pauseDescription(answers)}</p><Link className="primary block" href="/onboarding">{answers.pauseAction ? "Change my plan" : "Choose a pause action"}</Link>{answers.pauseAction === "blocking_tools" && <div className="pause-resources"><a href="https://www.ncpgambling.org/help-treatment/" target="_blank" rel="noopener noreferrer">Find help in the United States ↗</a><a href="https://www.gamcare.org.uk/self-help/" target="_blank" rel="noopener noreferrer">Explore tools in the United Kingdom ↗</a></div>}</section></div>}
  </section>;
}

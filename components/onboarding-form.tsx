"use client";

import { useState } from "react";
import {
  defaultOnboardingAnswers,
  focusOptions,
  frequencyOptions,
  goalOptions,
  pauseActionOptions,
  triggerOptions,
  type OnboardingAnswers
} from "../lib/onboarding";

type Choice = { value: string; label: string; description?: string };

function toggle<T extends string>(selected: T[], value: T) {
  return selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
}

function ChoiceGroup({
  legend, description, options, selected, onSelect, onClear, multiple = false
}: {
  legend: string;
  description?: string;
  options: readonly Choice[];
  selected: string[];
  onSelect: (value: string) => void;
  onClear?: () => void;
  multiple?: boolean;
}) {
  return <fieldset className="onboarding-question">
    <legend>{legend}</legend>
    {description && <p>{description}</p>}
    <div className="onboarding-options">
      {options.map((option) => <label key={option.value} className={`onboarding-option ${selected.includes(option.value) ? "selected" : ""}`}>
        <input type={multiple ? "checkbox" : "radio"} name={legend} value={option.value} checked={selected.includes(option.value)} onChange={() => onSelect(option.value)} />
        <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
      </label>)}
    </div>
    {onClear && selected.length > 0 && <button type="button" className="onboarding-clear" onClick={onClear}>Clear answer</button>}
  </fieldset>;
}

export function OnboardingForm({ initialAnswers, editing, goalLocked = false }: { initialAnswers: OnboardingAnswers | null; editing: boolean; goalLocked?: boolean }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers ?? defaultOnboardingAnswers);
  const [goalChosen, setGoalChosen] = useState(Boolean(initialAnswers && ["stay","reduce","stop"].includes(initialAnswers.goal)));
  const [targetKind, setTargetKind] = useState<"days_per_week" | "weekly_spending">(initialAnswers?.reduceTarget?.kind ?? "days_per_week");
  const [targetValue, setTargetValue] = useState(initialAnswers?.reduceTarget?.value.toString() ?? "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  async function finish(skipPause = false) {
    if (saving) return;
    setSaving(true);
    setStatus("");
    const value = Number(targetValue);
    const payload: OnboardingAnswers = {
      ...answers,
      gamblingTypes: [],
      pauseAction: skipPause ? null : answers.pauseAction,
      customPauseAction: skipPause ? null : answers.pauseAction === "custom" ? answers.customPauseAction : null,
      reduceTarget: answers.goal === "reduce" && targetValue !== "" && Number.isInteger(value)
        ? { kind: targetKind, value }
        : null,
      stopDate: answers.goal === "stop" ? answers.stopDate : null
    };
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "We could not save your answers.");
        return;
      }
      window.location.assign("/guardrails");
    } catch {
      setStatus("We could not save your answers. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const customActionMissing = answers.pauseAction === "custom" && !answers.customPauseAction?.trim();
  return <section className="onboarding-card">
    <div className="onboarding-progress"><span>Step {step + 1} of 3</span><div aria-hidden="true"><i style={{ width: `${(step + 1) * 100 / 3}%` }} /></div></div>
    {step === 0 && <>
      <p className="eyebrow">Start with what matters to you</p>
      <h1>{editing ? "Update your direction." : "What brings you here?"}</h1>
      <p className="onboarding-intro">There is no right answer. You can change these choices later.</p>
      {goalLocked ? <p>Your saved goal is managed with your limits. <a href="/guardrails">Edit goal and guardrails →</a></p> : <ChoiceGroup legend="What would you like to do right now?" options={goalOptions} selected={goalChosen ? [answers.goal] : []} onSelect={(value) => {
        update("goal", value as OnboardingAnswers["goal"]);
        setGoalChosen(true);
      }} />}
      <ChoiceGroup legend="What would you most like to keep track of?" description="Choose any that matter to you, or leave this blank for now." options={focusOptions} selected={answers.focusAreas} multiple onSelect={(value) => update("focusAreas", toggle(answers.focusAreas, value as OnboardingAnswers["focusAreas"][number]))} />
    </>}
    {step === 1 && <>
      <p className="eyebrow">Your starting point</p>
      <h1>What does betting look like lately?</h1>
      <p className="onboarding-intro">These details are optional. They help make the tracker more relevant to you.</p>
      <ChoiceGroup legend="About how often do you bet?" options={frequencyOptions} selected={answers.frequency ? [answers.frequency] : []} onSelect={(value) => update("frequency", value as OnboardingAnswers["frequency"])} onClear={() => update("frequency", null)} />
      <ChoiceGroup legend="When are you more likely to bet?" description="Choose any that fit. You can also leave this unanswered." options={triggerOptions} selected={answers.triggers} multiple onSelect={(value) => update("triggers", toggle(answers.triggers, value as OnboardingAnswers["triggers"][number]))} />
    </>}
    {step === 2 && <>
      <p className="eyebrow">A plan you can change</p>
      <h1>What might help you take the next step?</h1>
      <p className="onboarding-intro">You can leave this open and come back when you are ready.</p>
      {!goalLocked && answers.goal === "reduce" && <fieldset className="onboarding-question">
        <legend>Would a small target help?</legend>
        <p>Optional. Choose a weekly target you can revisit later.</p>
        <div className="onboarding-target"><select aria-label="Target type" value={targetKind} onChange={(event) => setTargetKind(event.target.value as typeof targetKind)}><option value="days_per_week">Betting days per week</option><option value="weekly_spending">Weekly cash-wager target ($)</option></select><input aria-label="Target value" type="number" min="0" max={targetKind === "days_per_week" ? "7" : "1000000"} step="1" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} placeholder={targetKind === "days_per_week" ? "Days" : "Dollars"} /></div>
      </fieldset>}
      {!goalLocked && answers.goal === "stop" && <div className="onboarding-question"><label className="onboarding-field-label" htmlFor="stop-date">Would you like to choose a start date?</label><p>Optional. Today is fine, and you can change it later.</p><input id="stop-date" type="date" value={answers.stopDate ?? ""} onChange={(event) => update("stopDate", event.target.value || null)} /></div>}
      <ChoiceGroup legend="What could help when you feel an urge to bet?" options={pauseActionOptions} selected={answers.pauseAction ? [answers.pauseAction] : []} onSelect={(value) => update("pauseAction", value as OnboardingAnswers["pauseAction"])} onClear={() => update("pauseAction", null)} />
      {answers.pauseAction === "custom" && <label className="onboarding-custom">My pause action<textarea maxLength={160} value={answers.customPauseAction ?? ""} onChange={(event) => update("customPauseAction", event.target.value)} placeholder="For example, go for a walk or call a friend" /></label>}
      {(answers.goal === "stop" || answers.pauseAction === "blocking_tools") && <div className="onboarding-help"><strong>Want practical support?</strong><p>Blocking and self-exclusion options depend on where you live. These organizations can help you find a starting point.</p><a href="https://www.ncpgambling.org/help-treatment/" target="_blank" rel="noopener noreferrer">United States: find local help ↗</a><a href="https://www.gamcare.org.uk/self-help/" target="_blank" rel="noopener noreferrer">United Kingdom: explore the recovery toolkit ↗</a></div>}
    </>}
    {status && <p className="onboarding-error" role="alert">{status}</p>}
    <div className="onboarding-actions">
      {step > 0 && <button type="button" className="onboarding-back" onClick={() => { setStep(step - 1); setStatus(""); }}>Back</button>}
      {step === 0 && <button type="button" className="primary" disabled={!goalChosen} onClick={() => setStep(1)}>Continue</button>}
      {step === 1 && <><button type="button" className="onboarding-skip" onClick={() => setStep(2)}>Skip for now</button><button type="button" className="primary" onClick={() => setStep(2)}>Continue</button></>}
      {step === 2 && <><button type="button" className="onboarding-skip" disabled={saving} onClick={() => finish(true)}>Skip pause plan</button><button type="button" className="primary" disabled={saving || customActionMissing} onClick={() => finish()}>{saving ? "Saving…" : editing ? "Save changes" : "Finish setup"}</button></>}
    </div>
  </section>;
}

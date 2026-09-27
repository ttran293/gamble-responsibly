"use client";

import { useState } from "react";
import {
  defaultOnboardingAnswers,
  focusOptions,
  frequencyOptions,
  goalOptions,
  triggerOptions,
  type OnboardingAnswers
} from "../lib/onboarding";

type Choice = { value: string; label: string; description?: string };

function toggle<T extends string>(selected: T[], value: T) {
  return selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
}

function ChoiceGroup({ legend, description, options, selected, onSelect, onClear, multiple = false }: {
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

export function OnboardingForm({ initialAnswers, editing }: { initialAnswers: OnboardingAnswers | null; editing: boolean }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers ?? defaultOnboardingAnswers);
  const [goalChosen, setGoalChosen] = useState(Boolean(initialAnswers && ["stay", "reduce", "stop"].includes(initialAnswers.goal)));
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  async function finish() {
    if (saving) return;
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...answers,
          gamblingTypes: []
        } satisfies OnboardingAnswers)
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "We could not save your answers.");
        setSaving(false);
        return;
      }
      window.location.assign("/plan");
    } catch {
      setStatus("We could not save your answers. Check your connection and try again.");
      setSaving(false);
    }
  }

  return <section className="onboarding-card">
    {saving ? <div className="onboarding-generating" role="status" aria-live="polite">
      <span className="onboarding-spinner" aria-hidden="true" />
      <p className="eyebrow">Creating your plan</p>
      <h1>Putting your answers together…</h1>
      <p className="onboarding-intro">We&apos;re preparing actions that match the goal you chose.</p>
    </div> : <>
      <div className="onboarding-progress"><span>Step {step + 1} of 2</span><div aria-hidden="true"><i style={{ width: `${(step + 1) * 50}%` }} /></div></div>
      {step === 0 && <>
        <p className="eyebrow">Start with your goal</p>
        <h1>{editing ? "Update your goal." : "What would you like to work toward?"}</h1>
        <p className="onboarding-intro">Choose what feels right today. Jelly will recommend a plan you can review.</p>
        <ChoiceGroup legend="My goal" options={goalOptions} selected={goalChosen ? [answers.goal] : []} onSelect={(value) => {
          update("goal", value as OnboardingAnswers["goal"]);
          setGoalChosen(true);
        }} />
        <ChoiceGroup legend="What matters most to you?" description="Choose any, or leave this blank for now." options={focusOptions} selected={answers.focusAreas} multiple onSelect={(value) => update("focusAreas", toggle(answers.focusAreas, value as OnboardingAnswers["focusAreas"][number]))} />
      </>}
      {step === 1 && <>
        <p className="eyebrow">A little context</p>
        <h1>What does betting look like lately?</h1>
        <p className="onboarding-intro">These answers are optional. They help us make the recommendations more relevant.</p>
        <ChoiceGroup legend="About how often do you bet?" options={frequencyOptions} selected={answers.frequency ? [answers.frequency] : []} onSelect={(value) => update("frequency", value as OnboardingAnswers["frequency"])} onClear={() => update("frequency", null)} />
        <ChoiceGroup legend="When are you more likely to bet?" description="Choose any that fit." options={triggerOptions} selected={answers.triggers} multiple onSelect={(value) => update("triggers", toggle(answers.triggers, value as OnboardingAnswers["triggers"][number]))} />
      </>}
      {status && <p className="onboarding-error" role="alert">{status}</p>}
      <div className="onboarding-actions">
        {step === 1 && <button type="button" className="onboarding-back" onClick={() => { setStep(0); setStatus(""); }}>Back</button>}
        {step === 0 ? <button type="button" className="primary" disabled={!goalChosen} onClick={() => setStep(1)}>Continue</button> : <button type="button" className="primary" onClick={() => void finish()}>{editing ? "Update my plan" : "See my recommended plan"} →</button>}
      </div>
    </>}
  </section>;
}

"use client";

import { useEffect, useState } from "react";
import {
  defaultOnboardingAnswers,
  focusOptions,
  frequencyOptions,
  goalOptions,
  pauseActionOptions,
  triggerOptions,
  type OnboardingAnswers
} from "../lib/onboarding";
import { clearDemoConnections, demoConnectionProviders, savedDemoProviders, savedDemoVersion, saveDemoProviders, saveDemoVersion, type DemoConnectionProvider, type DemoVersion } from "../lib/demo-connections";

const appNames: Record<DemoConnectionProvider, string> = { draftkings: "DraftKings", fanduel: "FanDuel", moonharbor: "Moonharbor Sports" };
const appIcons: Record<DemoConnectionProvider, string> = { draftkings: "/draftkings.svg", fanduel: "/fanduel.svg", moonharbor: "/moonharbor.svg" };

type Choice = { value: string; label: string; description?: string };

function toggle<T extends string>(selected: T[], value: T) {
  return selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
}

function ChoiceGroup({ legend, description, options, selected, onSelect, multiple = false, columns }: {
  legend: string;
  description?: string;
  options: readonly Choice[];
  selected: string[];
  onSelect: (value: string) => void;
  multiple?: boolean;
  columns?: 3 | 4 | 5;
}) {
  return <fieldset className="onboarding-question">
    <legend>{legend}</legend>
    {description && <p>{description}</p>}
    <div className={columns ? `onboarding-options cols-${columns}` : "onboarding-options"}>
      {options.map((option) => <label key={option.value} className={`onboarding-option ${selected.includes(option.value) ? "selected" : ""}`}>
        <input type={multiple ? "checkbox" : "radio"} name={legend} value={option.value} checked={selected.includes(option.value)} onChange={() => onSelect(option.value)} />
        <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
      </label>)}
    </div>
  </fieldset>;
}

export function OnboardingForm({ initialAnswers, editing, onSaved, onCancel, onSavingChange }: { initialAnswers: OnboardingAnswers | null; editing: boolean; onSaved?: (answers: OnboardingAnswers) => void; onCancel?: () => void; onSavingChange?: (saving: boolean) => void }) {
  const firstStep = onSaved ? 1 : 0;
  const [step, setStep] = useState(firstStep);
  const [answers, setAnswers] = useState<OnboardingAnswers>(initialAnswers ?? defaultOnboardingAnswers);
  const [goalChosen, setGoalChosen] = useState(Boolean(initialAnswers && ["stay", "reduce", "stop"].includes(initialAnswers.goal)));
  const [targetKind, setTargetKind] = useState<"days_per_week" | "weekly_spending" | "">(initialAnswers?.reduceTarget?.kind ?? "");
  const [targetDraft, setTargetDraft] = useState(initialAnswers?.reduceTarget ? String(initialAnswers.reduceTarget.value) : "");
  const [version, setVersion] = useState<DemoVersion | null>(null);
  const [providers, setProviders] = useState<DemoConnectionProvider[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (onSaved) return;
    try {
      const savedVersion = savedDemoVersion();
      setVersion(savedVersion);
      setProviders(savedVersion ? savedDemoProviders() : []);
    } catch { /* Session storage may be unavailable; the answer-based plan remains available. */ }
    setDataReady(true);
  }, [onSaved]);

  const update = <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  function continueWithData(skip = false) {
    if (skip) {
      try { clearDemoConnections(); } catch { /* The plan still works without connected data. */ }
      setProviders([]);
      setVersion(null);
    } else {
      if (!providers.length || !version) {
        setStatus("Choose at least one app and a demo dataset, or continue without data.");
        return;
      }
      try {
        saveDemoVersion(version);
        saveDemoProviders(providers);
      } catch {
        setStatus("This browser could not save the demo connection. You can continue without data.");
        return;
      }
    }
    setStatus("");
    setStep(1);
  }

  function toggleProvider(provider: DemoConnectionProvider) {
    setProviders(current => current.includes(provider) ? current.filter(item => item !== provider) : [...current, provider]);
    setStatus("");
  }

  async function finish() {
    if (saving) return;
    if (answers.pauseAction === "custom" && !answers.customPauseAction?.trim()) {
      setStatus("Write your pause action or choose another option.");
      return;
    }
    if (answers.goal === "reduce" && targetDraft && !answers.reduceTarget) {
      setStatus("Choose a valid weekly target, or leave the amount blank.");
      return;
    }
    setSaving(true);
    onSavingChange?.(true);
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
        onSavingChange?.(false);
        return;
      }
      if (onSaved) onSaved(answers);
      else window.location.assign("/plan");
    } catch {
      setStatus("We could not save your answers. Check your connection and try again.");
      setSaving(false);
      onSavingChange?.(false);
    }
  }

  return <section className="onboarding-card">
    {saving ? <div className="onboarding-generating" role="status" aria-live="polite">
      <span className="onboarding-spinner" aria-hidden="true" />
      <p className="eyebrow">Creating your plan</p>
      <h1>Putting your answers together…</h1>
      <p className="onboarding-intro">We&apos;re preparing actions that match the goal you chose.</p>
    </div> : <>
      <div className="onboarding-progress"><span>{onSaved ? `Goal details ${step} of 2` : step === 0 ? "Step 1 of 3 · Connect data" : "Step 2 of 3 · Choose your goal"}</span><div aria-hidden="true"><i style={{ width: `${onSaved ? step * 50 : step === 0 ? 33 : 66}%` }} /></div></div>
      {step === 0 && <>
        <p className="eyebrow">Your activity, in one place</p>
        <h1>Connect your betting activity</h1>
        <p className="onboarding-intro">This demo simulates connections. Choose the apps to include, then select a sample dataset. No sportsbook account is accessed.</p>
        <div className="onboarding-app-grid" role="group" aria-label="Demo apps">
          {demoConnectionProviders.map(provider => <button key={provider} type="button" className={`onboarding-app ${providers.includes(provider) ? "is-connected" : ""}`} aria-pressed={providers.includes(provider)} onClick={() => toggleProvider(provider)}><img src={appIcons[provider]} alt="" /><span><strong>{appNames[provider]}</strong><small>{providers.includes(provider) ? "Connected for demo" : "Click to connect"}</small></span></button>)}
        </div>
        <div className="onboarding-datasets"><strong>Choose sample activity</strong><p>Each dataset has a different activity pattern. Your choice will appear in the dashboard and inform the plan when there is enough overlapping history.</p><div role="group" aria-label="Demo dataset">{(["v1", "v2"] as const).map(option => <button key={option} type="button" className={version === option ? "is-selected" : ""} aria-pressed={version === option} onClick={() => { setVersion(option); setStatus(""); }}>Demo data {option === "v1" ? "1" : "2"}</button>)}</div></div>
        {!dataReady && <p role="status">Checking your demo selection…</p>}
      </>}
      {step === 1 && <>
        <h1>{editing ? "Update your goal." : "What would you like to work toward?"}</h1>
        <p className="onboarding-intro">Choose what feels useful to work on. You can change your goal later.</p>
        <ChoiceGroup legend="My goal" columns={3} options={goalOptions} selected={goalChosen ? [answers.goal] : []} onSelect={(value) => {
          update("goal", value as OnboardingAnswers["goal"]);
          setGoalChosen(true);
        }} />
        <ChoiceGroup legend="What matters most to you?" description="Optional. Choose any, or leave this blank." columns={5} options={focusOptions} selected={answers.focusAreas} multiple onSelect={(value) => update("focusAreas", toggle(answers.focusAreas, value as OnboardingAnswers["focusAreas"][number]))} />
      </>}
      {step === 2 && <>
        <h1>Make the plan fit your life</h1>
        <p className="onboarding-intro">These answers help turn your goal into practical actions. Skip anything that doesn&apos;t fit.</p>
        <ChoiceGroup legend="About how often do you bet?" columns={4} options={frequencyOptions} selected={answers.frequency ? [answers.frequency] : []} onSelect={(value) => update("frequency", value as OnboardingAnswers["frequency"])} />
        <ChoiceGroup legend="When are you more likely to bet?" columns={4} options={triggerOptions} selected={answers.triggers} multiple onSelect={(value) => update("triggers", toggle(answers.triggers, value as OnboardingAnswers["triggers"][number]))} />
        <ChoiceGroup legend="What could you do when an urge appears?" columns={4} options={pauseActionOptions} selected={answers.pauseAction ? [answers.pauseAction] : []} onSelect={value => update("pauseAction", value as OnboardingAnswers["pauseAction"])} />
        {answers.pauseAction === "custom" && <label className="onboarding-custom">My pause action<textarea maxLength={160} value={answers.customPauseAction ?? ""} onChange={event => update("customPauseAction", event.target.value)} placeholder="For example, call a friend or leave the room" /></label>}
        {answers.goal === "reduce" && <fieldset className="onboarding-question"><legend>A smaller next step (optional)</legend><p>Choose a weekly target you would like to try. This is a personal aim, not an app limit.</p><div className="onboarding-target"><select aria-label="Target type" value={targetKind} onChange={event => { const kind = event.target.value as typeof targetKind; setTargetKind(kind); setTargetDraft(""); update("reduceTarget", null); }}><option value="">Choose a target</option><option value="days_per_week">Betting days per week</option><option value="weekly_spending">Cash wagered per week ($)</option></select>{targetKind && <input aria-label={targetKind === "days_per_week" ? "Betting days per week" : "Weekly cash wager target in dollars"} type="number" min="0" max={targetKind === "days_per_week" ? 7 : 1000000} step="1" value={targetDraft} placeholder="Your target" onChange={event => { const value = event.target.value; setTargetDraft(value); const number = Number(value); update("reduceTarget", value !== "" && Number.isInteger(number) && number >= 0 && number <= (targetKind === "days_per_week" ? 7 : 1000000) ? { kind: targetKind, value: number } : null); }} />}</div></fieldset>}
        {answers.goal === "stop" && <fieldset className="onboarding-question"><legend>When would you like to start? (optional)</legend><p>You can choose a no-bets date now or decide later.</p><input aria-label="No-bets start date" type="date" value={answers.stopDate ?? ""} onChange={event => update("stopDate", event.target.value || null)} /></fieldset>}
      </>}
      {status && <p className="onboarding-error" role="alert">{status}</p>}
      <div className="onboarding-actions">
        {step > firstStep && <button type="button" className="onboarding-back" onClick={() => { setStep(step - 1); setStatus(""); }}>Back</button>}
        {onCancel && <button type="button" className="onboarding-cancel" onClick={onCancel}>Cancel</button>}
        {step === 0 && <><button type="button" className="onboarding-skip" onClick={() => continueWithData(true)}>Continue without data</button><button type="button" className="primary" disabled={!dataReady} onClick={() => continueWithData()}>Continue with demo data →</button></>}
        {step === 1 && <button type="button" className="primary" disabled={!goalChosen} onClick={() => setStep(2)}>Continue →</button>}
        {step === 2 && <button type="button" className="primary" onClick={() => void finish()}>{onSaved ? "Save" : editing ? "Update my plan →" : "Generate my plan →"}</button>}
      </div>
    </>}
  </section>;
}

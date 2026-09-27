import { focusOptions, goalOptions, labelFor, pauseActionOptions, triggerOptions, type OnboardingAnswers } from "./onboarding";
import { day, shiftDay, summarize, type Snapshot } from "./metrics/core";
import { activityInsights } from "./metrics/insights";

export type RecommendedAction = { id: string; title: string; detail: string; reason: string };
export type PlanEvidence = { from: string; to: string; accounts: string[]; activeDays: number; cashWagered: number; deposits: number; change?: string };
export type Recommendation = { goal: string; intro: string; actions: RecommendedAction[]; evidence: PlanEvidence | null; dataNote: string };
const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

// Use the last fully recorded Monday–Sunday week shared by every account. The
// dashboard's date filter and partially recorded final days cannot change it.
export function planEvidence(snapshot?: Snapshot | null): PlanEvidence | null {
  if (!snapshot) return null;
  const coverage = snapshot.coverage ?? [{ provider: snapshot.provider, from: snapshot.from, through: snapshot.through }];
  if (!coverage.length) return null;
  const lastDay = coverage.map(c => c.through.endsWith("T23:59:59.999Z") ? day(c.through) : shiftDay(day(c.through), -1)).sort()[0];
  const weekday = new Date(`${lastDay}T00:00:00Z`).getUTCDay();
  if (!Number.isFinite(weekday)) return null;
  const to = shiftDay(lastDay, -weekday);
  const from = shiftDay(to, -6);
  if (!coverage.every(c => c.from <= from && day(c.through) >= to)) return null;
  const metrics = summarize(snapshot, from, to);
  if (!metrics.completeCoverage) return null;
  const change = activityInsights(snapshot, from, to).anomalies[0];
  return { from, to, accounts: coverage.map(c => c.provider).sort(), activeDays: metrics.activeDays, cashWagered: metrics.cashWagered, deposits: metrics.deposits, change: change ? `${change.accounts} on ${change.from}: ${change.signal.kind === "frequency_stake_change" ? `${change.signal.currentBets} bets, median cash stake ${usd(change.signal.currentMedianCashStake)}` : change.title}` : undefined };
}

export function recommendedPlan(answers: OnboardingAnswers, snapshot?: Snapshot | null): Recommendation {
  const goal = goalOptions.find(option => option.value === answers.goal)?.label ?? "Choose a goal";
  const selectedFocus = answers.focusAreas[0];
  const focus = selectedFocus ? labelFor(focusOptions, selectedFocus).toLowerCase() : null;
  const trigger = answers.triggers.find(value => value !== "unsure");
  const moment = trigger ? labelFor(triggerOptions, trigger).toLowerCase() : null;
  const evidence = planEvidence(snapshot);
  const accountsKey = evidence?.accounts.map(account => account.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")).join("+");
  const key = `${answers.goal}:${evidence ? `${accountsKey}:${evidence.from}:${evidence.to}` : "answers"}`;
  const dataNote = evidence
    ? `Based on the last complete week shared by ${evidence.accounts.join(", ")} (${evidence.from}–${evidence.to} UTC). These are recorded sample accounts, not all gambling activity.`
    : snapshot ? "Connected history does not yet contain a complete shared week. Actions currently use your answers." : "Connect an account to add recorded activity to these recommendations.";
  const review: RecommendedAction = evidence
    ? { id: `${key}:review`, title: evidence.change ? "Review the recorded change" : "Review your last complete week", detail: evidence.change ? `Look at ${evidence.change}. Note what was happening and whether it fits your goal.` : `Review ${evidence.activeDays} betting ${evidence.activeDays === 1 ? "day" : "days"}, ${usd(evidence.cashWagered)} cash wagered, and ${usd(evidence.deposits)} deposited. Note what you would like to change.`, reason: `Your recorded activity from ${evidence.from}–${evidence.to} informs this step.` }
    : { id: `${key}:review`, title: "Review your activity", detail: "Look at your betting days and spending, or write down what you know if no account is connected.", reason: focus ? `You chose ${focus} as a focus.` : "Your answers are the starting point until a complete week is available." };
  const chosenPause = answers.pauseAction === "custom" ? answers.customPauseAction : answers.pauseAction ? labelFor(pauseActionOptions, answers.pauseAction) : null;
  const pause: RecommendedAction = { id: `${answers.goal}:pause:${trigger ?? "general"}:${answers.pauseAction ?? "none"}`, title: "Prepare a pause action", detail: chosenPause ? `Write down when and how you will “${chosenPause}”${moment ? ` ${moment}` : ""}. Keep it somewhere you can reach it.` : moment ? `Write down what you will do when an urge appears ${moment}; try stepping away for 10 minutes or contacting someone you trust.` : "Choose what you will do when an urge appears, such as stepping away for 10 minutes or contacting someone you trust.", reason: chosenPause ? "This uses the pause action you chose in onboarding." : moment ? `You mentioned ${moment} in onboarding.` : "This action can be personalized to a moment you notice." };
  if (answers.goal === "stop") return { goal, evidence, dataNote, intro: "A practical checklist for beginning and supporting a no-bets goal.", actions: [
    review,
    { id: `${answers.goal}:start:${answers.stopDate ?? "choose"}`, title: answers.stopDate ? "Add your no-bets date to your calendar" : "Choose a no-bets start date", detail: answers.stopDate ? `Put ${answers.stopDate}, the date you chose in onboarding, in your calendar.` : "Put the date you intend to stop placing new bets in your calendar.", reason: "You chose to stop gambling." },
    { id: `${key}:access`, title: "Reduce access to betting", detail: `Review the apps and places you use${evidence ? `, including ${evidence.accounts.join(" and ")}` : ""}. Decide which blocking or self-exclusion steps you want to take, then set them up.`, reason: evidence ? "Your connected accounts make this step more specific." : "Reducing access can support your goal." },
    pause
  ] };
  if (answers.goal === "reduce") return { goal, evidence, dataNote, intro: "Use one recorded pattern to choose a smaller next step.", actions: [
    review,
    { id: `${key}:reduction:${answers.reduceTarget?.kind ?? "days"}:${answers.reduceTarget?.value ?? "choose"}`, title: answers.reduceTarget?.kind === "weekly_spending" ? "Write down your weekly spending target" : "Choose a bet-free day", detail: answers.reduceTarget?.kind === "weekly_spending" ? `Write down your chosen weekly target of ${usd(answers.reduceTarget.value * 100)} and compare it with recorded cash wagers${evidence ? ` of ${usd(evidence.cashWagered)} in the last complete week` : " when available"}.` : answers.reduceTarget?.kind === "days_per_week" ? `Write down your chosen target of ${answers.reduceTarget.value} betting days a week${evidence ? `; the last complete week recorded ${evidence.activeDays}` : ""}. Mark the days you intend to keep bet-free.` : evidence && evidence.activeDays > 1 ? `Your accounts recorded bets on ${evidence.activeDays} days that week. Mark one day you would usually bet as bet-free this coming week.` : "Mark one day you would otherwise bet as bet-free this coming week.", reason: answers.reduceTarget ? "This uses the target you chose in onboarding. It is a personal aim, not an active app limit." : evidence ? "This uses your recorded betting-day count, without assuming a safe amount." : "You described your current pace in onboarding." },
    pause
  ] };
  return { goal, evidence, dataNote, intro: "Choose a boundary that fits your goal after reviewing what was recorded.", actions: [
    review,
    { id: `${key}:boundary`, title: "Set a weekly money boundary", detail: evidence ? `You recorded ${usd(evidence.deposits)} in deposits and ${usd(evidence.cashWagered)} in cash wagers that week. Choose and write down your own weekly deposit or wager limit.` : "Choose and write down a weekly deposit or cash-wager limit that fits your goal.", reason: "Recorded amounts are context, not a recommended safe limit. Completing this item does not activate an app limit." },
    pause
  ] };
}

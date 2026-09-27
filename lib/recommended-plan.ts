import { formatDay } from "./format-date";
import { focusOptions, goalOptions, labelFor, pauseActionOptions, triggerOptions, type OnboardingAnswers } from "./onboarding";
import { day, shiftDay, summarize, type Snapshot } from "./metrics/core";
import { activityInsights } from "./metrics/insights";

export type RecommendedAction = { id: string; title: string; detail: string; reason: string };
export type PlanEvidence = { from: string; to: string; accounts: string[]; activeDays: number; cashWagered: number; deposits: number; change?: string };
export type Recommendation = { goal: string; intro: string; actions: RecommendedAction[]; evidence: PlanEvidence | null; dataNote: string };
const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function sharedPeriodDescription(evidence: PlanEvidence) {
  const days = Math.round((Date.parse(`${evidence.to}T00:00:00Z`) - Date.parse(`${evidence.from}T00:00:00Z`)) / 86_400_000) + 1;
  const period = days === 7 ? "last complete week" : days === 1 ? "last complete day" : days > 1 ? `last ${days} complete days` : "recorded period";
  const accounts = evidence.accounts.map(account => account.replace(/\s*\(fictional\)/gi, "")).join(", ");
  return `Based on the ${period} shared by ${accounts}.`;
}

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
  return { from, to, accounts: coverage.map(c => c.provider).sort(), activeDays: metrics.activeDays, cashWagered: metrics.cashWagered, deposits: metrics.deposits, change: change ? `${change.accounts} on ${formatDay(change.from)}: ${change.signal.kind === "frequency_stake_change" ? `${change.signal.currentBets} bets, median cash stake ${usd(change.signal.currentMedianCashStake)}` : change.title}` : undefined };
}

export function recommendedPlan(answers: OnboardingAnswers, snapshot?: Snapshot | null): Recommendation {
  const goal = goalOptions.find(option => option.value === answers.goal)?.label ?? "Choose a goal";
  const selectedFocus = answers.focusAreas[0];
  const focus = selectedFocus ? labelFor(focusOptions, selectedFocus).toLowerCase() : null;
  const trigger = answers.triggers.find(value => value !== "unsure");
  const moment = trigger ? labelFor(triggerOptions, trigger).toLowerCase() : null;
  const evidence = planEvidence(snapshot);
  // Keep action IDs stable when recorded activity refines the wording of a plan.
  const key = answers.goal;
  const dataNote = evidence
    ? sharedPeriodDescription(evidence)
    : snapshot ? "Connected history does not yet contain a complete shared week. Actions currently use your answers." : "Connect an account to add recorded activity to these recommendations.";
  const review: RecommendedAction = evidence
    ? { id: `${key}:review`, title: evidence.change ? "Review the recorded change" : "Review your last complete week", detail: evidence.change ? `Look at ${evidence.change}. Note the situation, what you were thinking or feeling, and what you did next.` : `Review ${evidence.activeDays} betting ${evidence.activeDays === 1 ? "day" : "days"}, ${usd(evidence.cashWagered)} cash wagered, and ${usd(evidence.deposits)} deposited. Pick one day and note the situation, thoughts or feelings, and what you did next.`, reason: `Your recorded activity from ${formatDay(evidence.from)}–${formatDay(evidence.to)} informs this step.` }
    : { id: `${key}:review`, title: "Review your activity", detail: "Think of a recent urge or bet. Note the situation, what you were thinking or feeling, and what you did next. You can also review recorded activity if available.", reason: focus ? `You chose ${focus} as a focus.` : "Your answers are the starting point until a complete week is available." };
  const chosenPause = answers.pauseAction === "custom" ? answers.customPauseAction : answers.pauseAction ? labelFor(pauseActionOptions, answers.pauseAction) : null;
  const pause: RecommendedAction = { id: `${answers.goal}:pause:${trigger ?? "general"}:${answers.pauseAction ?? "none"}`, title: "Prepare a pause action", detail: chosenPause ? `Write down when and how you will “${chosenPause}”${moment ? ` ${moment}` : ""}. Keep it somewhere you can reach it, then note whether it helped.` : moment ? `Write down what you will do when an urge appears ${moment}; try stepping away for 10 minutes or contacting someone you trust. Note whether it helped.` : "Choose what you will do when an urge appears, such as stepping away for 10 minutes or contacting someone you trust. Note whether it helped.", reason: chosenPause ? "This uses the pause action you chose in onboarding." : moment ? `You mentioned ${moment} in onboarding.` : "This action can be personalized to a moment you notice." };
  const checkIn: RecommendedAction = { id: `${key}:check-in`, title: "Check in after a week", detail: answers.goal === "stop" ? "Notice what helped you avoid bets and what was difficult. If you placed a bet, note what led to it and choose your next no-bets step without judging yourself." : "Look back at what happened, what helped, and what you would change for the next week. Adjust your goal or action if it no longer fits.", reason: "Reviewing what happened helps you prepare for difficult moments and adjust the next step." };
  if (answers.goal === "stop") return { goal, evidence, dataNote, intro: "A practical checklist for beginning and supporting a no-bets goal.", actions: [
    review,
    { id: `${answers.goal}:start:${answers.stopDate ?? "choose"}`, title: answers.stopDate ? "Add your no-bets date to your calendar" : "Choose a no-bets start date", detail: answers.stopDate ? `Put ${formatDay(answers.stopDate)}, the date you chose in onboarding, in your calendar.` : "Put the date you intend to stop placing new bets in your calendar.", reason: "You chose to stop gambling." },
    { id: `${key}:access`, title: "Reduce access to betting", detail: `Review the apps and places you use${evidence ? `, including ${evidence.accounts.join(" and ")}` : ""}. Decide which blocking or self-exclusion steps you want to take, then set them up.`, reason: evidence ? "Your connected accounts make this step more specific." : "Reducing access can support your goal." },
    pause,
    checkIn
  ] };
  if (answers.goal === "reduce") return { goal, evidence, dataNote, intro: "Use one recorded pattern to choose a smaller next step.", actions: [
    review,
    { id: `${key}:reduction:${answers.reduceTarget?.kind ?? "days"}:${answers.reduceTarget?.value ?? "choose"}`, title: answers.reduceTarget?.kind === "weekly_spending" ? "Write down your weekly spending target" : "Choose a bet-free day", detail: answers.reduceTarget?.kind === "weekly_spending" ? `Write down your chosen weekly target of ${usd(answers.reduceTarget.value * 100)} and compare it with recorded cash wagers${evidence ? ` of ${usd(evidence.cashWagered)} in the last complete week` : " when available"}.` : answers.reduceTarget?.kind === "days_per_week" ? `Write down your chosen target of ${answers.reduceTarget.value} betting days a week${evidence ? `; the last complete week recorded ${evidence.activeDays}` : ""}. Mark the days you intend to keep bet-free.` : evidence && evidence.activeDays > 1 ? `Your accounts recorded bets on ${evidence.activeDays} days that week. Mark one day you would usually bet as bet-free this coming week.` : "Mark one day you would otherwise bet as bet-free this coming week.", reason: answers.reduceTarget ? "This uses the target you chose in onboarding. It is a personal aim, not an active app limit." : evidence ? "This uses your recorded betting-day count, without assuming a safe amount." : "You described your current pace in onboarding." },
    pause,
    checkIn
  ] };
  return { goal, evidence, dataNote, intro: "Choose a boundary that fits your goal after reviewing what was recorded.", actions: [
    review,
    { id: `${key}:boundary`, title: "Set a weekly money boundary", detail: evidence ? `You recorded ${usd(evidence.deposits)} in deposits and ${usd(evidence.cashWagered)} in cash wagers that week. Choose and write down your own weekly deposit or wager limit.` : "Choose and write down a weekly deposit or cash-wager limit that fits your goal.", reason: "Recorded amounts are context, not a recommended safe limit. Completing this item does not activate an app limit." },
    pause,
    checkIn
  ] };
}

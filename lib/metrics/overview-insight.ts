import { formatDay } from "../format-date";
import type { OnboardingAnswers } from "../onboarding";
import type { summarize } from "./core";

type Metrics = ReturnType<typeof summarize>;
type Goal = Pick<OnboardingAnswers, "goal" | "reduceTarget"> | null | undefined;

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const count = (amount: number, singular: string, plural = `${singular}s`) => `${amount} ${amount === 1 ? singular : plural}`;

export function overviewInsight(metrics: Metrics, goal?: Goal) {
  const { betCount, activeDays, days, daysWithoutBets, cashWagered, comparison, completeCoverage } = metrics;
  const period = `${formatDay(metrics.from)}–${formatDay(metrics.to)}`;

  if (!completeCoverage) {
    return {
      text: `${count(betCount, "bet")} ${betCount === 1 ? "appears" : "appear"} in the available records for ${period}. Some selected dates lack full account coverage, so Jelly can't count days without bets for this view.`,
      action: "Explore recorded activity"
    };
  }

  if (goal?.goal === "stop") {
    return {
      text: betCount === 0
        ? `No bets were recorded across the connected accounts during these ${count(days, "day")}. This describes the selected records only.`
        : `Bets were recorded on ${activeDays} of ${count(days, "day")} in this range. ${count(daysWithoutBets, "day")} had no recorded bet across the connected accounts.`,
      action: "Explore your daily pattern"
    };
  }

  if (betCount === 0) {
    return {
      text: `No bets were recorded across the connected accounts during these ${count(days, "day")}. This describes the selected records only.`,
      action: "Explore your daily pattern"
    };
  }

  if (comparison) {
    const priorPeriod = `${formatDay(comparison.from)}–${formatDay(comparison.to)}`;
    const cashFirst = goal?.goal === "reduce" && goal.reduceTarget?.kind === "weekly_spending";
    if (cashFirst && cashWagered !== comparison.cashStake) {
      return {
        text: `Cash wagered was ${money(cashWagered)} for ${period}, compared with ${money(comparison.cashStake)} for the previous ${count(days, "day")} (${priorPeriod}). Cash stakes are money put into bets, not money lost.`,
        action: "Explore the comparison"
      };
    }
    if (activeDays !== comparison.activeDays) {
      return {
        text: `Bets were recorded on ${activeDays} of ${count(days, "day")} in this range, compared with ${comparison.activeDays} days in the previous equally long range (${priorPeriod}).`,
        action: "Explore the comparison"
      };
    }
    if (cashWagered !== comparison.cashStake) {
      return {
        text: `Cash wagered was ${money(cashWagered)} for ${period}, compared with ${money(comparison.cashStake)} for the previous ${count(days, "day")} (${priorPeriod}). Cash stakes are money put into bets, not money lost.`,
        action: "Explore the comparison"
      };
    }
  }

  return {
    text: `${count(betCount, "bet")} were recorded on ${activeDays} of ${count(days, "day")} in this range. ${count(daysWithoutBets, "day")} had no recorded bet across the connected accounts.`,
    action: "Explore your daily pattern"
  };
}

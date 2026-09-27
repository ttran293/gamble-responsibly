import { formatDay } from "./format-date";
import { focusOptions, frequencyOptions, labelFor, type OnboardingAnswers } from "./onboarding";
import { sharedPeriodDescription, type PlanEvidence } from "./recommended-plan";

const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const bettingDays = (days: number) => `${days} betting ${days === 1 ? "day" : "days"}`;

const moments: Partial<Record<OnboardingAnswers["triggers"][number], string>> = {
  after_loss: "after a loss",
  sports: "during sports or events",
  stress: "when stressed",
  boredom: "when bored",
  social: "with other people",
  advertising: "after seeing an ad or offer"
};

function joinChoices(choices: string[]) {
  if (choices.length < 2) return choices[0] ?? "";
  if (choices.length === 2) return choices.join(" and ");
  return `${choices.slice(0, -1).join(", ")}, and ${choices.at(-1)}`;
}

export function goalSnapshot(answers: OnboardingAnswers, evidence: PlanEvidence | null, hasConnectedData: boolean) {
  const focus = answers.focusAreas.map(value => labelFor(focusOptions, value));
  const goalInYourWords = answers.goal === "stop"
    ? `I want to stop gambling${answers.stopDate ? ` starting on ${formatDay(answers.stopDate)}` : ""}.`
    : answers.goal === "reduce"
      ? answers.reduceTarget?.kind === "days_per_week" ? `I want to bet on no more than ${answers.reduceTarget.value} ${answers.reduceTarget.value === 1 ? "day" : "days"} each week.`
        : answers.reduceTarget?.kind === "weekly_spending" ? `I want to aim for ${usd(answers.reduceTarget.value * 100)} in cash wagers each week.`
          : "I want to reduce how often or how much I bet."
      : "I want to stay within the limits I choose.";
  const userSays = `${goalInYourWords}${focus.length ? ` My focus is ${focus.map(value => value[0].toLowerCase() + value.slice(1)).join(", ")}.` : ""}`;
  const userMessages = [userSays];
  const frequency = answers.frequency && answers.frequency !== "unsure"
    ? answers.frequency === "not_now" ? "I'm not betting right now."
      : `I bet ${labelFor(frequencyOptions, answers.frequency).toLowerCase()}.`
    : null;
  const selectedMoments = answers.triggers.filter(value => value !== "unsure").map(value => moments[value]).filter((value): value is string => Boolean(value));
  const circumstances = selectedMoments.length ? `I'm more likely to bet ${joinChoices(selectedMoments)}.` : null;
  if (frequency || circumstances) userMessages.push([frequency, circumstances].filter(Boolean).join(" "));

  let picture: string;
  if (!evidence) {
    const context = hasConnectedData
      ? "The connected apps do not yet share a complete recorded week. Your plan uses your answers for now."
      : "Connect demo data to compare a complete recorded week with your goal. Your plan uses your answers for now.";
    picture = answers.frequency && answers.frequency !== "unsure"
      ? `You described your current pace as “${labelFor(frequencyOptions, answers.frequency)}”. ${context}`
      : context;
  } else if (answers.goal === "reduce" && answers.reduceTarget?.kind === "days_per_week") {
    picture = `${bettingDays(evidence.activeDays)} were recorded in the last complete week. Your chosen target is ${bettingDays(answers.reduceTarget.value)} per week.`;
  } else if (answers.goal === "reduce" && answers.reduceTarget?.kind === "weekly_spending") {
    picture = `${usd(evidence.cashWagered)} in cash wagers was recorded in the last complete week. Your chosen weekly target is ${usd(answers.reduceTarget.value * 100)}.`;
  } else if (answers.goal === "reduce") {
    picture = `${bettingDays(evidence.activeDays)} were recorded in the last complete week. Choose a weekly target if you want a direct comparison.`;
  } else if (answers.goal === "stop") {
    picture = `${bettingDays(evidence.activeDays)} were recorded in the last complete week. This is a snapshot of selected accounts, not proof of activity elsewhere or progress since your start date.`;
  } else {
    picture = `${bettingDays(evidence.activeDays)} and ${usd(evidence.cashWagered)} in cash wagers were recorded in the last complete week. Choose a personal boundary in your plan to compare against.`;
  }

  const pictureSource = evidence
    ? sharedPeriodDescription(evidence)
    : hasConnectedData ? "Connected data · A complete shared week is needed for comparison." : "No connected activity yet.";

  const trigger = answers.triggers.find(value => value !== "unsure");
  const moment = trigger ? moments[trigger] : null;
  const pauseAction = answers.pauseAction === "custom" ? answers.customPauseAction?.trim()
    : answers.pauseAction === "step_away" ? "Step away for 10 minutes"
      : answers.pauseAction === "contact_someone" ? "Contact someone I trust"
        : answers.pauseAction === "blocking_tools" ? "Use a blocking tool" : null;
  if (pauseAction) userMessages.push(answers.pauseAction === "custom"
    ? `When an urge comes up, my plan is: ${pauseAction}`
    : `When an urge comes up, I want to ${pauseAction[0].toLowerCase()}${pauseAction.slice(1)}.`);
  const watch = moment && pauseAction
    ? `You mentioned betting ${moment}. If an urge comes up then, your chosen action might help: “${pauseAction}”.`
    : moment ? `You mentioned betting ${moment}. It may help to pause and notice what you are thinking or feeling.`
      : pauseAction ? `When an urge comes up, you might try your chosen action: “${pauseAction}”. Notice whether it helps.`
        : "You could notice when an urge appears and choose one small action to try before deciding what to do next.";

  return { userSays, userMessages, focus, picture, pictureSource, watch };
}

import { focusOptions, goalOptions, labelFor, pauseActionOptions, triggerOptions, type OnboardingAnswers } from "../onboarding";

export function chatContext(answers: OnboardingAnswers): string {
  const goal = goalOptions.find(item => item.value === answers.goal)?.label ?? "Choose a goal";
  const pause = answers.pauseAction === "custom" ? answers.customPauseAction : answers.pauseAction ? labelFor(pauseActionOptions, answers.pauseAction) : null;
  return JSON.stringify({ goal, focus: answers.focusAreas.map(value => labelFor(focusOptions, value)), triggers: answers.triggers.map(value => labelFor(triggerOptions, value)), pauseAction: pause });
}

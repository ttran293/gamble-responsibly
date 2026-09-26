import { z } from "zod";

export const goalOptions = [
  { value: "reduce", label: "Reduce my betting", description: "Set a smaller limit that feels realistic." },
  { value: "stop", label: "Stop betting", description: "Make a plan for a fresh start." },
  { value: "understand", label: "Understand my habits first", description: "Start by seeing the full picture." },
  { value: "unsure", label: "I'm not sure yet", description: "You can decide later." }
] as const;

export const focusOptions = [
  { value: "spending", label: "Money spent" },
  { value: "net_result", label: "Actual net result" },
  { value: "time", label: "Time spent" },
  { value: "frequency", label: "How often I bet" },
  { value: "urges", label: "Urges to bet" }
] as const;

export const gamblingTypeOptions = [
  { value: "sports", label: "Sports betting" },
  { value: "casino", label: "Casino games" },
  { value: "slots", label: "Slots" },
  { value: "lottery", label: "Lottery" },
  { value: "poker", label: "Poker" },
  { value: "other", label: "Something else" }
] as const;

export const frequencyOptions = [
  { value: "daily", label: "Most days" },
  { value: "several_week", label: "A few days a week" },
  { value: "weekly", label: "About once a week" },
  { value: "monthly", label: "A few times a month" },
  { value: "less_often", label: "Less often" },
  { value: "not_now", label: "I'm not betting right now" },
  { value: "unsure", label: "I'm not sure" }
] as const;

export const triggerOptions = [
  { value: "after_loss", label: "After a loss" },
  { value: "sports", label: "During sports or events" },
  { value: "stress", label: "When I'm stressed" },
  { value: "boredom", label: "When I'm bored" },
  { value: "social", label: "With other people" },
  { value: "advertising", label: "After seeing an ad or offer" },
  { value: "unsure", label: "I'm not sure" }
] as const;

export const pauseActionOptions = [
  { value: "step_away", label: "Step away for 10 minutes" },
  { value: "contact_someone", label: "Contact someone I trust" },
  { value: "blocking_tools", label: "Use a blocking tool" },
  { value: "custom", label: "Write my own action" }
] as const;

const values = <T extends ReadonlyArray<{ value: string }>>(options: T) =>
  options.map((option) => option.value) as [T[number]["value"], ...T[number]["value"][]];

export const onboardingSchema = z.object({
  goal: z.enum(values(goalOptions)),
  focusAreas: z.array(z.enum(values(focusOptions))).max(focusOptions.length),
  gamblingTypes: z.array(z.enum(values(gamblingTypeOptions))).max(gamblingTypeOptions.length),
  frequency: z.enum(values(frequencyOptions)).nullable(),
  triggers: z.array(z.enum(values(triggerOptions))).max(triggerOptions.length),
  pauseAction: z.enum(values(pauseActionOptions)).nullable(),
  customPauseAction: z.string().trim().max(160).nullable(),
  reduceTarget: z.object({
    kind: z.enum(["days_per_week", "weekly_spending"]),
    value: z.number().int().min(0).max(1000000)
  }).nullable(),
  stopDate: z.iso.date().nullable()
}).superRefine((answers, context) => {
  if (answers.pauseAction === "custom" && !answers.customPauseAction) {
    context.addIssue({ code: "custom", path: ["customPauseAction"], message: "Add your pause action or choose another option." });
  }
  if (answers.reduceTarget?.kind === "days_per_week" && answers.reduceTarget.value > 7) {
    context.addIssue({ code: "custom", path: ["reduceTarget"], message: "Choose no more than 7 days per week." });
  }
});

export type OnboardingAnswers = z.infer<typeof onboardingSchema>;

export const defaultOnboardingAnswers: OnboardingAnswers = {
  goal: "unsure",
  focusAreas: [],
  gamblingTypes: [],
  frequency: null,
  triggers: [],
  pauseAction: null,
  customPauseAction: null,
  reduceTarget: null,
  stopDate: null
};

export function labelFor(options: ReadonlyArray<{ value: string; label: string }>, value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

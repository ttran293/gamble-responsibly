import { z } from "zod";

export const providerIds = ["draftkings", "fanduel"] as const;
export const goalLabels = { stay: "Stay within limits", reduce: "Reduce gambling", stop: "Stop gambling" };
export const metricLabels = {
  deposits: "Deposit amount", depositCount: "Number of deposits", cashWagered: "Total cash wagered",
  maxStake: "Maximum cash stake per bet", betCount: "Number of bets", activeDays: "Betting days", loss: "Settled net loss"
};
export type Metric = keyof typeof metricLabels;
export const monetary = (key: string) => ["deposits","cashWagered","maxStake","loss"].includes(key);
const cap = z.number().int().min(0).max(100000000).nullable();
export const emptyCaps = () => ({deposits:null,depositCount:null,cashWagered:null,maxStake:null,betCount:null,activeDays:null,loss:null});
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable();
export const planSchema = z.object({
  goal: z.enum(["stay","reduce","stop"]), startDate: z.iso.date(),
  timezone: z.string().max(80).refine(value=>{try {new Intl.DateTimeFormat("en",{timeZone:value});return true;} catch{return false;}},"Choose a valid IANA timezone."),
  period: z.enum(["daily","weekly","monthly"]),
  providers: z.array(z.enum(providerIds)).min(1).max(2).refine(a=>new Set(a).size===a.length),
  rules: z.array(z.object({scope:z.enum(["all",...providerIds]),caps:z.object({deposits:cap,depositCount:cap,cashWagered:cap,maxStake:cap,betCount:cap,activeDays:cap,loss:cap})})).min(1).max(3),
  blockedDays: z.array(z.number().int().min(0).max(6)).max(7), quietStart:clock, quietEnd:clock,
  stopDate:z.iso.date().nullable(), pausePlan:z.string().trim().max(500),
  reduction:z.object({metric:z.enum(["deposits","cashWagered","betCount","activeDays"]),baselineFrom:z.iso.date(),baselineTo:z.iso.date(),percent:z.number().int().min(1).max(100)}).nullable(),
  approaching:z.boolean(), exceeded:z.boolean(), reminderPercent:z.number().int().min(1).max(99)
}).superRefine((p,c)=>{
  if(new Set(p.rules.map(r=>r.scope)).size!==p.rules.length || !p.rules.some(r=>r.scope==="all")) c.addIssue({code:"custom",message:"Include one overall rule and no duplicate account rules."});
  if(p.rules.some(r=>r.scope!=="all"&&!p.providers.includes(r.scope))) c.addIssue({code:"custom",message:"Account rules must belong to covered accounts."});
  if(Boolean(p.quietStart)!==Boolean(p.quietEnd)||p.quietStart&&p.quietStart===p.quietEnd) c.addIssue({code:"custom",message:"Choose two different quiet-hour times, or leave both blank."});
  if(p.goal==="stop"&&(!p.stopDate||p.stopDate<p.startDate)) c.addIssue({code:"custom",message:"Choose a stop date on or after the plan start date."});
  if(p.goal==="reduce"&&(!p.reduction||p.reduction.baselineTo>=p.startDate||p.reduction.baselineFrom>p.reduction.baselineTo)) c.addIssue({code:"custom",message:"Choose a baseline period ending before the plan starts."});
});
export type Plan = z.infer<typeof planSchema>;
export type Revision = { id:string; savedAt:string; effectiveAt:string; plan:Plan };
export type Notice = { id:string; revisionId:string; at:string; scope:string; metric:string; kind:"approaching"|"exceeded"; actual:number; limit:number; window:string };
export type GuardrailState = { revisions:Revision[]; notices:Notice[] };
export function defaultPlan(goal:Plan["goal"]="stay", date=new Date().toISOString().slice(0,10)):Plan {
  return {goal,startDate:date,timezone:"America/New_York",period:"weekly",providers:["draftkings","fanduel"],rules:[{scope:"all",caps:emptyCaps()}],blockedDays:[],quietStart:null,quietEnd:null,stopDate:goal==="stop"?date:null,pausePlan:"",reduction:null,approaching:true,exceeded:true,reminderPercent:80};
}

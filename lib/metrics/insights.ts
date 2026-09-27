import { formatDay } from "../format-date";
import { day, shiftDay, summarize, type Snapshot } from "./core";

export type InsightSignal =
  | { kind:"frequency_stake_change"; currentBets:number; baselineBetsPerDay:number; currentMedianCashStake:number; baselineMedianCashStake:number; baselineFrom:string; baselineTo:string }
  | { kind:"period_comparison"; metric:"activeDays"|"cashWagered"; current:number; previous:number; previousFrom:string; previousTo:string };
export type ActivityInsight = { id:string; accounts:string; title:string; text:string; from:string; to:string; signal:InsightSignal };
const money = (n:number) => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD"}).format(n/100);
const median = (values:number[]) => { const v=[...values].sort((a,b)=>a-b), i=Math.floor(v.length/2); return v.length%2?v[i]:(v[i-1]+v[i])/2; };

export function activityInsights(snapshot:Snapshot, from:string, to:string) {
  const metrics=summarize(snapshot,from,to);
  const coverage=snapshot.coverage??[{provider:snapshot.provider,from:snapshot.from,through:snapshot.through}];
  const accounts=coverage.map(c=>c.provider).sort().join(", ");
  // A final partially recorded day is not a completed day. A date-only endpoint
  // does not establish completeness either, so it is excluded conservatively.
  const lastComplete=coverage.map(c=>c.through.endsWith("T23:59:59.999Z")?day(c.through):shiftDay(day(c.through),-1)).sort()[0];
  const anomalies:ActivityInsight[]=[];
  let eligibleDays=0;
  for(let date=from;date<=to;date=shiftDay(date,1)) {
    const priorFrom=shiftDay(date,-7), priorTo=shiftDay(date,-1);
    if(date>lastComplete||!coverage.every(c=>priorFrom>=c.from)) continue;
    const history=snapshot.bets.filter(b=>day(b.placedAt)>=priorFrom&&day(b.placedAt)<=priorTo);
    const activeDays=new Set(history.map(b=>day(b.placedAt))).size;
    const cashHistory=history.filter(b=>b.cashStake>0);
    if(activeDays<3||cashHistory.length<5) continue;
    eligibleDays++;
    const current=snapshot.bets.filter(b=>day(b.placedAt)===date);
    const cashCurrent=current.filter(b=>b.cashStake>0);
    if(!cashCurrent.length) continue;
    const typical=median(cashHistory.map(b=>b.cashStake)), currentStake=median(cashCurrent.map(b=>b.cashStake));
    const average=history.length/activeDays;
    if(current.length>=Math.max(average*2,average+3)&&currentStake>=Math.max(typical*2,typical+500)) {
      anomalies.push({accounts,id:`change:${accounts}:${date}`,title:"A change in your recorded activity",from:date,to:date,
        text:`On ${formatDay(date)}, you placed ${current.length} bets with a median cash stake of ${money(currentStake)}. During ${formatDay(priorFrom)}–${formatDay(priorTo)}, you averaged ${Number(average.toFixed(1))} bets per betting day, with a median cash stake of ${money(typical)}.`,
        signal:{kind:"frequency_stake_change",currentBets:current.length,baselineBetsPerDay:average,currentMedianCashStake:currentStake,baselineMedianCashStake:typical,baselineFrom:priorFrom,baselineTo:priorTo}});
    }
  }
  const comparisons:ActivityInsight[]=[];
  if(metrics.comparison) {
    const p=metrics.comparison, id=`${accounts}:${from}:${to}`;
    comparisons.push({accounts,id:`days:${id}`,title:"Betting days",from,to,text:`You recorded bets on ${metrics.activeDays} days, compared with ${p.activeDays} during ${formatDay(p.from)}–${formatDay(p.to)}. Both periods cover ${metrics.days} days.`,signal:{kind:"period_comparison",metric:"activeDays",current:metrics.activeDays,previous:p.activeDays,previousFrom:p.from,previousTo:p.to}});
    comparisons.push({accounts,id:`stakes:${id}`,title:"Cash wagered",from,to,text:`You wagered ${money(metrics.cashWagered)} in cash, compared with ${money(p.cashStake)} during ${formatDay(p.from)}–${formatDay(p.to)}. Cash stakes are money put into bets, not money lost.`,signal:{kind:"period_comparison",metric:"cashWagered",current:metrics.cashWagered,previous:p.cashStake,previousFrom:p.from,previousTo:p.to}});
  }
  // Also check each selected account so an account-specific change is not
  // hidden by another account's larger usual stakes.
  if(coverage.length>1) for(const c of coverage) {
    const accountFrom=from>c.from?from:c.from, accountTo=to<day(c.through)?to:day(c.through);
    if(accountFrom>accountTo)continue;
    const account:Snapshot={...snapshot,provider:c.provider,from:c.from,through:c.through,coverage:[c],bets:snapshot.bets.filter(b=>b.provider===c.provider),transactions:snapshot.transactions.filter(t=>t.provider===c.provider)};
    const result=activityInsights(account,accountFrom,accountTo);
    anomalies.push(...result.anomalies);
  }
  return {accounts,anomalies:anomalies.sort((a,b)=>b.from.localeCompare(a.from)),comparisons,eligibleDays};
}

import type { Snapshot } from "../metrics/core";
import { shiftDay } from "../metrics/core";
import { type Plan, type Revision, type Notice, type Metric } from "./model";

export function localParts(at:string,zone:string) {
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(at));
  const get=(type:string)=>parts.find(p=>p.type===type)!.value;
  return {date:`${get("year")}-${get("month")}-${get("day")}`,time:`${get("hour")}:${get("minute")}`};
}
export function windowDates(date:string,period:Plan["period"]) {
  if(period==="daily") return {from:date,to:date};
  if(period==="weekly") {const from=shiftDay(date,-((new Date(date+"T12:00Z").getUTCDay()+6)%7));return {from,to:shiftDay(from,6)};}
  const from=date.slice(0,7)+"-01";
  const next=new Date(from+"T12:00Z");next.setUTCMonth(next.getUTCMonth()+1);
  return {from,to:shiftDay(next.toISOString().slice(0,10),-1)};
}
type Event={id:string;provider:string;at:string;kind:"bet"|"deposit"|"settlement";cash:number;date:string;time:string};
function events(snapshots:Snapshot[],zone:string):Event[] {
  return snapshots.flatMap(s=>{
    const provider=s.provider.toLowerCase();
    const result:Omit<Event,"date"|"time">[]=[...s.bets.map(b=>({id:`${provider}:bet:${b.id}`,provider,at:b.placedAt,kind:"bet" as const,cash:b.cashStake})),...s.transactions.filter(t=>t.type==="deposit").map(t=>({id:`${provider}:deposit:${t.id}`,provider,at:t.at,kind:"deposit" as const,cash:t.cash})),...s.bets.filter(b=>b.settledAt&&b.status!=="open").map(b=>({id:`${provider}:settled:${b.id}`,provider,at:b.settledAt!,kind:"settlement" as const,cash:b.cashStake-b.payout-b.refund}))];
    return result.map(e=>({...e,...localParts(e.at,zone)}));
  }).sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
}
function values(es:Event[]) {
  const bets=es.filter(e=>e.kind==="bet"),deposits=es.filter(e=>e.kind==="deposit");
  return {deposits:deposits.reduce((n,e)=>n+e.cash,0),depositCount:deposits.length,cashWagered:bets.reduce((n,e)=>n+e.cash,0),maxStake:Math.max(0,...bets.map(e=>e.cash)),betCount:bets.length,activeDays:new Set(bets.map(e=>e.date)).size,loss:Math.max(0,es.filter(e=>e.kind==="settlement").reduce((n,e)=>n+e.cash,0))};
}
function coverage(plan:Plan,snapshots:Snapshot[],from:string,to:string) {
  return plan.providers.every(p=>{const s=snapshots.find(s=>s.provider.toLowerCase()===p);return s&&localParts(s.transactions[0]?.at ?? s.from+"T00:00:00Z",plan.timezone).date<=from&&localParts(s.through,plan.timezone).date>=to;});
}
export function reductionTarget(plan:Plan,snapshots:Snapshot[]) {
  if(plan.goal!=="reduce"||!plan.reduction) return null;
  const r=plan.reduction,w=windowDates(r.baselineFrom,plan.period);
  if(w.from!==r.baselineFrom||w.to!==r.baselineTo) throw new Error("The baseline must be one complete calendar period matching the daily, weekly (Monday–Sunday), or monthly window.");
  if(!coverage(plan,snapshots,r.baselineFrom,r.baselineTo)) throw new Error("The baseline needs history from every covered account for the entire period.");
  const v=values(events(snapshots,plan.timezone).filter(e=>plan.providers.includes(e.provider as never)&&e.date>=r.baselineFrom&&e.date<=r.baselineTo))[r.metric];
  if(v===0) throw new Error("Choose a baseline with recorded activity for this reduction measure.");
  return {metric:r.metric,baseline:v,limit:Math.floor(v*(100-r.percent)/100)};
}
export function evaluate(revisions:Revision[],snapshots:Snapshot[],asOf:string) {
  const ordered=[...revisions].sort((a,b)=>a.effectiveAt.localeCompare(b.effectiveAt));
  const notices:Notice[]=[];
  const root=ordered[0]?.effectiveAt??asOf;
  for(let i=0;i<ordered.length;i++) {
    const revision=ordered[i],p=revision.plan,end=ordered[i+1]?.effectiveAt;
    const es=events(snapshots,p.timezone).filter(e=>p.providers.includes(e.provider as never)&&e.at>=root&&e.at<=asOf&&e.date>=p.startDate);
    const target=reductionTarget(p,snapshots);
    const keys=new Set<string>();
    const emit=(e:Event,scope:string,metric:string,actual:number,limit:number,window:string)=>{
      const kind=actual>limit?"exceeded":limit>0&&actual>=limit*p.reminderPercent/100?"approaching":null;
      if(!kind||kind==="exceeded"&&!p.exceeded||kind==="approaching"&&!p.approaching) return;
      const id=`${revision.id}:${scope}:${metric}:${window}:${kind}`;
      if(keys.has(id))return;keys.add(id);notices.push({id,revisionId:revision.id,scope,metric,actual,limit,window,kind,at:e.at});
    };
    for(const e of es.filter(e=>e.at>=revision.effectiveAt&&(!end||e.at<end))) {
      const w=windowDates(e.date,p.period);
      for(const rule of p.rules) {
        if(rule.scope!=="all"&&e.provider!==rule.scope)continue;
        const relevant=es.filter(x=>x.at<=e.at&&x.date>=w.from&&x.date<=w.to&&(rule.scope==="all"||x.provider===rule.scope));
        const v=values(relevant),caps={...rule.caps};
        if(rule.scope==="all"&&target) caps[target.metric]=caps[target.metric]===null?target.limit:Math.min(caps[target.metric]!,target.limit);
        for(const metric of Object.keys(caps) as Metric[]) {
          const limit=caps[metric];if(limit===null)continue;
          const kind=metric==="deposits"||metric==="depositCount"?"deposit":metric==="loss"?"settlement":"bet";
          if(e.kind===kind)emit(e,rule.scope,metric,metric==="maxStake"?e.cash:v[metric],limit,w.from);
        }
      }
      if(e.kind==="bet") {
        if(p.goal==="stop"&&p.stopDate&&e.date>=p.stopDate)emit(e,"all","stop",1,0,e.date);
        if(p.blockedDays.includes(new Date(e.date+"T12:00Z").getUTCDay()))emit(e,"all","blockedDay",1,0,e.date);
        if(p.quietStart&&p.quietEnd&&(p.quietStart<p.quietEnd?e.time>=p.quietStart&&e.time<p.quietEnd:e.time>=p.quietStart||e.time<p.quietEnd))emit(e,"all","quietHours",1,0,e.date);
      }
    }
  }
  const current=ordered.filter(r=>r.effectiveAt<=asOf).at(-1);
  if(!current)return {notices,progress:[],coverage:[],target:null,goal:null};
  const p=current.plan,date=localParts(asOf,p.timezone).date,w=windowDates(date,p.period),target=reductionTarget(p,snapshots);
  const es=events(snapshots,p.timezone).filter(e=>p.providers.includes(e.provider as never)&&e.at>=root&&e.at<=asOf&&e.date>=p.startDate&&e.date>=w.from&&e.date<=w.to);
  const complete=coverage(p,snapshots,w.from,date);
  const progress=p.rules.flatMap(rule=>{
    const v=values(es.filter(e=>rule.scope==="all"||e.provider===rule.scope)),caps={...rule.caps};
    if(rule.scope==="all"&&target)caps[target.metric]=caps[target.metric]===null?target.limit:Math.min(caps[target.metric]!,target.limit);
    return (Object.keys(caps) as Metric[]).filter(k=>caps[k]!==null).map(metric=>({scope:rule.scope,metric,actual:v[metric],limit:caps[metric]!,from:w.from,to:w.to,complete,scheduled:date<p.startDate}));
  });
  const stopBets = p.goal === "stop" && p.stopDate ? events(snapshots,p.timezone).filter(e=>e.kind==="bet" && p.providers.includes(e.provider as never) && e.at>=root && e.at<=asOf && e.date>=p.startDate && e.date>=p.stopDate!).length : null;
  return {notices,progress,target,goal:p.goal,stopBets,coverage:p.providers.map(provider=>{const s=snapshots.find(s=>s.provider.toLowerCase()===provider);return {provider,from:s?.from??null,through:s?.through??null,loadedAt:s?.loadedAt??null};})};
}
export function mergeNotices(existing:Notice[],incoming:Notice[]) {return [...new Map([...existing,...incoming].map(n=>[n.id,n])).values()].sort((a,b)=>a.at.localeCompare(b.at));}

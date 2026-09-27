"use client";
import { useEffect, useMemo, useState } from "react";
import { formatDay, formatStamp } from "../lib/format-date";
import { activityInsights } from "../lib/metrics/insights";
import type { Snapshot } from "../lib/metrics/core";
import { metricLabels, monetary, type GuardrailState, type Plan, type Metric } from "../lib/guardrails/model";
import type { evaluate } from "../lib/guardrails/evaluate";
import { JellyMessage } from "./jelly-message";

export type SavedInsightContext = {state:GuardrailState; result:ReturnType<typeof evaluate>|null; asOf:string};
const storageKey="stillwater-demo-insight-dismissals-v1";
const format=(metric:string,n:number)=>monetary(metric)?new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n/100):String(n);
export function ActivityInsights({snapshot,from,to,demo,saved,review}:{snapshot:Snapshot;from:string;to:string;demo:boolean;saved?:SavedInsightContext|null;review:(from:string,to:string)=>void}) {
  const insights=useMemo(()=>activityInsights(snapshot,from,to),[snapshot,from,to]);
  const [dismissed,setDismissed]=useState<string[]>([]),[storageError,setStorageError]=useState(false);
  useEffect(()=>{if(!demo)return;try {const ids=JSON.parse(localStorage.getItem(storageKey)??"[]");if(Array.isArray(ids))setDismissed(ids.filter((v):v is string=>typeof v==="string"));}catch{setStorageError(true);}},[demo]);
  function dismiss(id:string){const next=[...dismissed,id];setDismissed(next);if(demo)try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{setStorageError(true);}}
  const revision=saved?.state.revisions.filter(r=>r.effectiveAt<=saved.asOf).at(-1);
  const plan:Plan|undefined=revision?.plan;
  const href=demo?"/demo/guardrails":"/guardrails";
  const cards:{id:string;title:string;text:string;coverage:string;from?:string;to?:string;plan?:boolean}[]=[];
  if(plan&&saved) {
    const notice=[...saved.state.notices].reverse().find(n=>n.kind==="exceeded"&&n.at<=saved.asOf&&!dismissed.includes(`notice:${n.id}`));
    if(notice) {
      const noticePlan=saved.state.revisions.find(r=>r.id===notice.revisionId)?.plan??plan;
      const label=metricLabels[notice.metric as Metric];
      const description=label?`${label}: ${format(notice.metric,notice.actual)} recorded against a commitment of ${format(notice.metric,notice.limit)}.`:({stop:"A bet was recorded after your stop date.",blockedDay:"A bet was recorded on a chosen no-gambling day.",quietHours:"A bet was recorded during your chosen quiet hours."}[notice.metric]??"Activity exceeded a saved commitment.");
      cards.push({id:`notice:${notice.id}`,title:"Saved commitment notice",text:description,coverage:`Recorded ${formatStamp(notice.at)} · ${notice.scope==="all"?noticePlan.providers.join(", "):notice.scope} · Saved-plan notice; independent of dashboard dates.`,plan:true});
    }
    if(plan.goal==="stop")cards.push({id:`stop:${revision!.id}:${saved.asOf}`,title:"Your stop plan",text:`${saved.result?.stopBets??0} bets recorded since ${formatDay(plan.stopDate??"")} and plan activation, through the evaluation time. ${plan.pausePlan||"Review your plan for an action to take when an urge arrives."}`,coverage:`${plan.providers.join(", ")} · ${plan.timezone} · Evaluated through ${formatStamp(saved.asOf)}. Missing records do not establish abstinence.`,plan:true});
  }
  if(plan?.goal!=="stop") {
    const anomaly=insights.anomalies.find(c=>!dismissed.includes(c.id));
    if(anomaly)cards.push({...anomaly,coverage:`${anomaly.accounts} · ${formatDay(anomaly.from)} UTC`});
    cards.push(...insights.comparisons.map(c=>({...c,coverage:`${insights.accounts} · ${formatDay(from)}–${formatDay(to)} UTC`})));
  }
  const visible=cards.filter(c=>!dismissed.includes(c.id)).slice(0,3);
  return <section className="panel activity-insights" aria-labelledby="activity-insights-title">
    <p className="eyebrow">Activity insights</p><h2 id="activity-insights-title">What Jelly noticed</h2>
    <p className="fineprint">Synthetic history · {insights.accounts} · {formatDay(from)}–{formatDay(to)} UTC. Historical observations, not live alerts.</p>
    <div className="insight-cards">{visible.map(c=><article key={c.id}><JellyMessage label={c.plan ? "A note from Jelly" : "Jelly noticed"}><h3>{c.title}</h3><p>{c.text}</p><small>{c.coverage}</small><div className="insight-actions">{c.plan?<a className="text-link" href={href}>Explore your plan →</a>:<button className="text-link" onClick={()=>review(c.from!,c.to!)}>Explore activity →</button>}<button className="text-link" aria-label={`Hide: ${c.title}`} onClick={()=>dismiss(c.id)}>Hide</button></div></JellyMessage></article>)}</div>
    {!visible.length&&<JellyMessage label="A note from Jelly" className="jelly-empty-insight"><p>No new pattern for this view yet. You can still explore your activity below.</p></JellyMessage>}
    {plan?.goal!=="stop"&&!insights.eligibleDays&&<p className="fineprint">The unusual-activity check needs seven earlier covered days, at least three betting days and five cash bets.</p>}
    {dismissed.length>0&&<button className="text-link" onClick={()=>{setDismissed([]);if(demo)try{localStorage.removeItem(storageKey);}catch{setStorageError(true);}}}>Show dismissed insights again</button>}
    {storageError&&<p role="status">Dismissals could not be saved in this browser. They still apply while this page is open.</p>}
  </section>;
}

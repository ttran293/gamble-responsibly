"use client";
import { useEffect, useState } from "react";
import { defaultPlan, emptyCaps, goalLabels, metricLabels, monetary, planSchema, providerIds, type Plan, type Revision, type GuardrailState, type Metric } from "../lib/guardrails/model";
import { evaluate, localParts, mergeNotices, reductionTarget, windowDates } from "../lib/guardrails/evaluate";
import type { Snapshot } from "../lib/metrics/core";

const key="stillwater-demo-guardrails-v1";
const clockKey="stillwater-demo-clock-v1";
const firstClock="2026-08-10T12:00:00.000Z";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n/100);
const format=(metric:string,value:number)=>monetary(metric)?money(value):String(value);
const special:Record<string,string>={stop:"Bet after stop date",blockedDay:"Bet on a chosen no-gambling day",quietHours:"Bet during quiet hours"};
const emptyState=():GuardrailState=>({revisions:[],notices:[]});

export function Guardrails({demo=false,initialGoal="stay",initialStopDate,initialPausePlan="",compact=false,onGoalChange}:{demo?:boolean;initialGoal?:Plan["goal"];initialStopDate?:string|null;initialPausePlan?:string;compact?:boolean;onGoalChange?:(goal:Plan["goal"]|null)=>void}) {
  const [state,setState]=useState<GuardrailState>(emptyState),[plan,setPlan]=useState<Plan>(()=>defaultPlan(initialGoal));
  const [snapshots,setSnapshots]=useState<Snapshot[]>([]),[clock,setClock]=useState(firstClock),[clockInput,setClockInput]=useState(firstClock.slice(0,16));
  const [status,setStatus]=useState(""),[ready,setReady]=useState(false),[saving,setSaving]=useState(false);
  const [preview,setPreview]=useState<ReturnType<typeof evaluate>|null>(null),[previewFrom,setPreviewFrom]=useState("2026-08-10T00:00"),[previewTo,setPreviewTo]=useState("2026-08-19T23:59");
  const [result,setResult]=useState<ReturnType<typeof evaluate>|null>(null);
  const [asOf,setAsOf]=useState("");
  useEffect(()=>{
    let cancelled=false;
    async function load() {
      try {
        const loaded=await Promise.all(providerIds.map(async p=>{const r=await fetch(`/api/demo/connections/${p}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});if(!r.ok)throw new Error(`Could not load ${p} demo history.`);return await r.json() as Snapshot;}));
        let current:GuardrailState,now:string;
        if(demo) {
          now=localStorage.getItem(clockKey)??firstClock;
          if(!Number.isFinite(Date.parse(now)))throw new Error("Invalid demo clock.");
          current=JSON.parse(localStorage.getItem(key)??'{"revisions":[],"notices":[]}');
          for(const r of current.revisions) planSchema.parse(r.plan);
          current={...current,notices:mergeNotices(current.notices,evaluate(current.revisions,loaded,now).notices)};
        } else {const response=await fetch("/api/guardrails",{cache:"no-store"});const body=await response.json();if(!response.ok)throw new Error(body.error);current=body;now=body.asOf;}
        if(cancelled)return;
        setSnapshots(loaded);setState(current);setClock(now);setClockInput(now.slice(0,16));setAsOf(now);
        const draft=defaultPlan(initialGoal,localParts(now,"America/New_York").date);
        if(initialGoal==="stop"&&initialStopDate) {draft.startDate=initialStopDate;draft.stopDate=initialStopDate;}
        draft.pausePlan=initialPausePlan;
        setPlan(current.revisions.at(-1)?.plan??draft);
        setResult(evaluate(current.revisions,loaded,now));onGoalChange?.(current.revisions.at(-1)?.plan.goal??null);setReady(true);
      }catch(e){if(!cancelled)setStatus(e instanceof Error?e.message:"Could not load guardrails.");}
    }
    void load();return()=>{cancelled=true;};
  // initialGoal is only a default before the first saved plan.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[demo]);
  function update<K extends keyof Plan>(field:K,value:Plan[K]){setPlan(p=>({...p,[field]:value}));setPreview(null);}
  function validate(){const parsed=planSchema.safeParse(plan);if(!parsed.success)throw new Error(parsed.error.issues[0].message);reductionTarget(parsed.data,snapshots);return parsed.data;}
  function storeDemo(next:GuardrailState,now:string){
    const evaluation=evaluate(next.revisions,snapshots,now);
    const complete={...next,notices:mergeNotices(next.notices,evaluation.notices)};
    localStorage.setItem(key,JSON.stringify(complete));localStorage.setItem(clockKey,now);
    setState(complete);setResult(evaluation);setClock(now);setClockInput(now.slice(0,16));setAsOf(now);onGoalChange?.(complete.revisions.at(-1)?.plan.goal??null);
  }
  async function save(){
    if(saving)return;setSaving(true);setStatus("");
    try {
      const clean=validate();
      if(demo){
        const latest=JSON.parse(localStorage.getItem(key)??'{"revisions":[],"notices":[]}') as GuardrailState;
        if((latest.revisions.at(-1)?.id??null)!==(state.revisions.at(-1)?.id??null))throw new Error("This plan changed in another tab. Reload before saving.");
        const actualClock=localStorage.getItem(clockKey)??firstClock;if(actualClock!==clock)throw new Error("The demo clock changed in another tab. Reload before saving.");
        if(state.revisions[0]&&clean.startDate!==state.revisions[0].plan.startDate)throw new Error("The original start date stays fixed.");
        const previous=evaluate(state.revisions,snapshots,clock);
        // Distinct instants preserve event ownership when editing without advancing the demo clock.
        const effectiveAt=new Date(Math.max(Date.parse(clock),Date.parse(state.revisions.at(-1)?.effectiveAt??clock)+1)).toISOString();
        const revision:Revision={id:crypto.randomUUID(),savedAt:new Date().toISOString(),effectiveAt,plan:clean};
        storeDemo({revisions:[...state.revisions,revision],notices:mergeNotices(state.notices,previous.notices)},effectiveAt);
      }else{
        const response=await fetch("/api/guardrails",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan:clean,expectedRevisionId:state.revisions.at(-1)?.id??null})});
        const body=await response.json();if(!response.ok)throw new Error(body.error);
        setState(body);setResult(body.evaluation);setAsOf(body.asOf);onGoalChange?.(clean.goal);
      }
      setPreview(null);setStatus("Saved. Changes apply from this save forward. Earlier notices remain in history.");
    }catch(e){setStatus(e instanceof Error?e.message:"Could not save the plan.");}finally{setSaving(false);}
  }
  function advance(){try {const storedClock=localStorage.getItem(clockKey)??firstClock;if(storedClock!==clock)throw new Error("The demo changed in another tab. Reload first.");const stored=JSON.parse(localStorage.getItem(key)??'{"revisions":[],"notices":[]}') as GuardrailState;if((stored.revisions.at(-1)?.id??null)!==(state.revisions.at(-1)?.id??null))throw new Error("The plan changed in another tab. Reload first.");const next=new Date(clockInput+"Z").toISOString();if(next<=clock)throw new Error("Choose a later demo time. The saved demo clock cannot go backwards.");storeDemo(state,next);setStatus("Demo clock advanced; recorded activity has been evaluated.");}catch(e){setStatus(e instanceof Error?e.message:"Could not advance the demo clock.");}}
  function historicalPreview(){try {const clean=validate(),from=new Date(previewFrom+"Z").toISOString(),to=new Date(previewTo+"Z").toISOString();if(from>=to)throw new Error("Choose a preview end after the start.");setPreview(evaluate([{id:"preview",savedAt:from,effectiveAt:from,plan:{...clean,startDate:localParts(from,clean.timezone).date}}],snapshots,to));setStatus("Historical preview only. No changes or notices have been saved.");}catch(e){setStatus(e instanceof Error?e.message:"Preview unavailable.");}}
  const saved=state.revisions.at(-1)?.plan;
  const href=demo?"/demo/guardrails":"/guardrails";
  const notices=[...state.notices].reverse();
  const progress=(evaluation:ReturnType<typeof evaluate>|null)=><>
    {evaluation?.target&&<p>Reduction baseline: {format(evaluation.target.metric,evaluation.target.baseline)} per {saved?.period??plan.period} period. Target: {format(evaluation.target.metric,evaluation.target.limit)}.</p>}
    <div className="guardrail-progress">{evaluation?.progress.map(p=><article key={p.scope+p.metric}><strong>{p.scope === "all"?"All covered accounts":p.scope} · {metricLabels[p.metric]}</strong><p>{format(p.metric,p.actual)} recorded / {format(p.metric,p.limit)} commitment</p><small>{p.from}–{p.to} · {p.scheduled?"Starts on the saved start date":!p.complete?"Incomplete history; progress may be understated":p.actual>p.limit?"Above commitment":p.limit>0&&p.actual>=p.limit*(saved?.reminderPercent??plan.reminderPercent)/100?"Approaching commitment":"Within commitment for available records"}</small></article>)}</div>
  </>;
  return <section className="panel saved-guardrails">
    <div className="panel-title"><div><p className="eyebrow">{demo?"Saved demo commitments":"Your saved commitments"}</p><h2>{saved?goalLabels[saved.goal]:"Choose your goal and guardrails"}</h2></div>{compact&&<a href={href}>Edit goal and guardrails →</a>}</div>
    <p>{demo?"Saved in this browser. The simulation clock controls which fixture events count as new.":"Saved privately to your account. Changes apply at save time; old fixture activity does not create new breaches."} These commitments monitor activity; they do not block sportsbook transactions or send contact emails.</p>
    {status&&<p role="status">{status}</p>}{!ready&&!status&&<p role="status">Loading saved commitments…</p>}
    {ready&&<>
      {saved&&<><p>Started {saved.startDate} · {saved.timezone} · {saved.period} windows · Evaluated through {asOf}</p>{saved.goal==="stop"&&<div className="stop-plan"><h3>Your stop plan</h3><p>No new bets from {saved.stopDate}. Bonus bets also count. Recorded bets since the stop date and first plan activation: {result?.stopBets ?? 0}.</p><p>{saved.pausePlan||"Choose an action you can turn to when an urge arrives."}</p><p><a href="https://www.ncpgambling.org/help-treatment/" target="_blank" rel="noreferrer">Find gambling support</a> · <a href="https://betblocker.org/" target="_blank" rel="noreferrer">Explore blocking tools</a></p><p>Recorded bets after the stop date appear in notices when exceedance notices are enabled. Missing activity is not proof of abstinence.</p></div>}{progress(result)}</>}
      {!saved&&compact&&<p><a href={href}>Set a goal and save your first commitment</a></p>}
      <details><summary>Covered accounts and data freshness</summary>{(result?.coverage.length?result.coverage:snapshots.map(s=>({provider:s.provider,from:s.from,through:s.through,loadedAt:s.loadedAt}))).map(c=><p key={c.provider}>{c.provider}: {c.from??"No data"} to {c.through??"No data"}; fixture loaded {c.loadedAt??"never"}.</p>)}<p>Loading a fixture does not create newer activity. Coverage is the saved account selection, independent of the dashboard display filter. Disconnected or stale real-world activity is not available in this demo.</p></details>
      {!compact&&<>
        {demo&&<div className="demo-clock"><h3>Demo clock (UTC)</h3><p>Currently {clock}. Save a plan, then advance to evaluate later synthetic activity. No records are generated.</p><label>Advance to<input type="datetime-local" value={clockInput} onChange={e=>setClockInput(e.target.value)}/></label><button type="button" onClick={advance}>Advance demo clock</button></div>}
        <form onSubmit={e=>{e.preventDefault();void save();}}>
          <fieldset><legend>Goal and period</legend><div className="guardrail-fields"><label>Goal<select value={plan.goal} onChange={e=>{const goal=e.target.value as Plan["goal"];setPlan(p=>({...p,goal,stopDate:goal==="stop"?(p.stopDate??p.startDate):null}));}}>{Object.entries(goalLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Plan start date<input required type="date" disabled={Boolean(state.revisions.length)} value={plan.startDate} onChange={e=>update("startDate",e.target.value)}/></label><label>Timezone<input required value={plan.timezone} onChange={e=>update("timezone",e.target.value)} list="guardrail-zones"/><datalist id="guardrail-zones">{["America/New_York","America/Chicago","America/Denver","America/Los_Angeles","UTC"].map(z=><option key={z}>{z}</option>)}</datalist></label><label>Calendar window<select value={plan.period} onChange={e=>update("period",e.target.value as Plan["period"])}><option value="daily">Daily</option><option value="weekly">Weekly (Monday–Sunday)</option><option value="monthly">Monthly</option></select></label></div><p>Calendar boundaries use the chosen timezone, including daylight saving changes. The first period only includes events after the first save. Editing a cap does not reset that period’s recorded activity.</p></fieldset>
          <fieldset><legend>Covered demo accounts</legend>{providerIds.map(provider=><label className="guardrail-check" key={provider}><input type="checkbox" checked={plan.providers.includes(provider)} onChange={e=>{const providers=e.target.checked?[...plan.providers,provider]:plan.providers.filter(p=>p!==provider);setPlan(p=>({...p,providers,rules:p.rules.filter(r=>r.scope==="all"||providers.includes(r.scope))}));}}/>{provider}</label>)}<p>Overall limits combine these accounts. An additional account limit applies alongside the overall limit.</p></fieldset>
          {plan.goal==="reduce"&&<fieldset><legend>Reduction target</legend><p>Choose one complete baseline period with data from every covered account, ending before your plan start date.</p><div className="guardrail-fields"><label>Measure<select value={plan.reduction?.metric??"cashWagered"} onChange={e=>update("reduction",{...(plan.reduction??{baselineFrom:"",baselineTo:"",percent:25}),metric:e.target.value as NonNullable<Plan["reduction"]>["metric"]})}>{["cashWagered","deposits","betCount","activeDays"].map(k=><option key={k} value={k}>{metricLabels[k as Metric]}</option>)}</select></label><label>Baseline start<input required type="date" value={plan.reduction?.baselineFrom??""} onChange={e=>{const w=windowDates(e.target.value,plan.period);update("reduction",{metric:plan.reduction?.metric??"cashWagered",percent:plan.reduction?.percent??25,baselineFrom:w.from,baselineTo:w.to});}}/></label><label>Baseline end<input readOnly value={plan.reduction?.baselineTo??""}/></label><label>Reduce by (%)<input required type="number" min="1" max="100" step="1" value={plan.reduction?.percent??25} onChange={e=>update("reduction",{metric:"cashWagered",baselineFrom:"",baselineTo:"",...plan.reduction,percent:Number(e.target.value)})}/></label></div></fieldset>}
          {plan.goal==="stop"&&<fieldset><legend>Stopping plan</legend><label>Stop date<input required type="date" min={plan.startDate} value={plan.stopDate??""} onChange={e=>update("stopDate",e.target.value)}/></label><label>When I feel an urge, I will…<textarea maxLength={500} value={plan.pausePlan} onChange={e=>update("pausePlan",e.target.value)}/></label><p>The stop-date rule counts every new recorded bet, including bonus-only bets.</p></fieldset>}
          <fieldset><legend>Limits</legend><p>Blank means no limit; zero is a commitment to none. Amounts are USD. No amount is presented as safe to gamble.</p>{plan.rules.map(rule=><div className="scope-limits" key={rule.scope}><h3>{rule.scope==="all"?"Overall limits":rule.scope}</h3><div className="guardrail-fields">{(Object.keys(metricLabels) as Metric[]).map(metric=><label key={metric}>{metricLabels[metric]}{monetary(metric)?" ($)":""}<input type="number" min="0" step={monetary(metric)?"0.01":"1"} value={rule.caps[metric]===null?"":rule.caps[metric]!/(monetary(metric)?100:1)} onChange={e=>{const value=e.target.value===""?null:Math.round(Number(e.target.value)*(monetary(metric)?100:1));update("rules",plan.rules.map(r=>r.scope===rule.scope?{...r,caps:{...r.caps,[metric]:value}}:r));}}/></label>)}</div>{rule.scope!=="all"&&<button type="button" onClick={()=>update("rules",plan.rules.filter(r=>r.scope!==rule.scope))}>Remove account-specific limits</button>}</div>)}{plan.providers.filter(p=>!plan.rules.some(r=>r.scope===p)).map(p=><button type="button" key={p} onClick={()=>update("rules",[...plan.rules,{scope:p,caps:emptyCaps()}])}>Add {p} limits</button>)}<p>Settled net loss = max(0, cash stakes − payouts − refunds) for bets settled in the period. Open bets are excluded. Winnings can reduce current net loss, but previously recorded notices remain.</p></fieldset>
          <fieldset><legend>Days and hours without gambling</legend><div className="guardrail-day-options">{["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d,i)=><label key={d}><input type="checkbox" checked={plan.blockedDays.includes(i)} onChange={e=>update("blockedDays",e.target.checked?[...plan.blockedDays,i]:plan.blockedDays.filter(n=>n!==i))}/>{d}</label>)}</div><div className="guardrail-fields"><label>Quiet hours start<input type="time" value={plan.quietStart??""} onChange={e=>update("quietStart",e.target.value||null)}/></label><label>Quiet hours end<input type="time" value={plan.quietEnd??""} onChange={e=>update("quietEnd",e.target.value||null)}/></label></div><p>Hours may cross midnight. Start is included; end is excluded. All days and hours use your selected timezone.</p></fieldset>
          <fieldset><legend>In-app notices</legend><label className="guardrail-check"><input type="checkbox" checked={plan.approaching} onChange={e=>update("approaching",e.target.checked)}/>Remind me when approaching a limit</label><label>Reminder threshold (%)<input type="number" min="1" max="99" step="1" value={plan.reminderPercent} onChange={e=>update("reminderPercent",Number(e.target.value))}/></label><label className="guardrail-check"><input type="checkbox" checked={plan.exceeded} onChange={e=>update("exceeded",e.target.checked)}/>Notify me after exceeding a limit or recording a bet during a chosen break</label><p>Notices are evaluated when the page loads, you save, or you advance the demo clock. They are not background alerts or emails.</p></fieldset>
          <button className="primary" disabled={saving} type="submit">{saving?"Saving…":"Save goal and guardrails"}</button>
        </form>
        <details className="historical-preview"><summary>Historical preview — does not save changes or alerts</summary><p>Try the form’s settings against older activity. UTC timestamps select the preview range; rules still use the selected timezone.</p><label>Preview from<input type="datetime-local" value={previewFrom} onChange={e=>setPreviewFrom(e.target.value)}/></label><label>Preview through<input type="datetime-local" value={previewTo} onChange={e=>setPreviewTo(e.target.value)}/></label><button onClick={historicalPreview}>Run historical preview</button>{preview&&<><p>Preview: {preview.notices.filter(n=>n.kind==="exceeded").length} exceedance notices; nothing saved.</p>{progress(preview)}</>}</details>
      </>}
      <details open={!compact}><summary>Notice history ({notices.length})</summary>{!notices.length&&<p>No recorded notices. This does not establish that no gambling occurred.</p>}{notices.map(n=><article className="notice-item" key={n.id}><strong>{n.kind==="exceeded"?"Commitment exceeded":"Approaching commitment"} · {special[n.metric]??metricLabels[n.metric as Metric]}</strong><p>{n.scope} · {n.at} · {special[n.metric]?"A recorded bet matched this restriction.":`${format(n.metric,n.actual)} recorded; commitment ${format(n.metric,n.limit)}.`}</p><small>Version {state.revisions.findIndex(r=>r.id===n.revisionId)+1} · period {n.window}</small></article>)}</details>
      {!compact&&<details><summary>Saved change history ({state.revisions.length})</summary>{[...state.revisions].reverse().map((r,i)=><article key={r.id}><h3>Version {state.revisions.length-i}: {goalLabels[r.plan.goal]}</h3><p>Effective {r.effectiveAt} · {r.plan.timezone} · {r.plan.period}</p><p>Covered accounts: {r.plan.providers.join(", ")}. Reminders {r.plan.approaching?"on":"off"}; exceedance notices {r.plan.exceeded?"on":"off"}.</p>{r.plan.rules.map(rule=><p key={rule.scope}>{rule.scope}: {(Object.keys(rule.caps) as Metric[]).filter(k=>rule.caps[k]!==null).map(k=>`${metricLabels[k]} ${format(k,rule.caps[k]!)}`).join("; ")||"No numeric caps"}</p>)}</article>)}</details>}
    </>}
  </section>;
}

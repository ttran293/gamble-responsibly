"use client";

import { useMemo, useRef, useState } from "react";
import { previewLimits, shiftDay, summarize, type Snapshot } from "../lib/metrics/core";
import { PersonalSummary } from "./personal-summary";
import { SignOutButton } from "./sign-out-button";
import type { OnboardingAnswers } from "../lib/onboarding";

import { ActivityInsights, type SavedInsightContext } from "./activity-insights";
import { BetFreeHeatmap } from "./bet-free-heatmap";
import { TransactionList } from "./transaction-list";

const usd = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
type DashboardTab = "overview" | "activity" | "connections" | "resources";
const dashboardTabs: { id: DashboardTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "connections", label: "Connections" },
  { id: "resources", label: "Resources" }
];
const resources = [
  { title: "NCPG Help by State", body: "Gambling-specific support and treatment. A starting point for therapists, programs, and local resources.", href: "https://www.ncpgambling.org/help-treatment/help-by-state/", action: "Find help in your state" },
  { title: "Gamblers Anonymous", body: "In-person and online peer groups, including virtual and telephone meetings.", href: "https://gamblersanonymous.org/find-a-meeting/", action: "Find a meeting" },
  { title: "Gam-Anon", body: "Meetings for friends and family affected by someone else's gambling.", href: "https://gam-anon.org/meeting-directory", action: "Find a family meeting" }
];

export function PrivateDashboard({ name, snapshot, planSnapshot, demo = false, answers, stopping = false, metricsOnly = false, connectionControls, savedInsights }: { name: string; snapshot: Snapshot; planSnapshot?: Snapshot | null; demo?: boolean; answers?: OnboardingAnswers; stopping?: boolean; metricsOnly?: boolean; connectionControls?: React.ReactNode; savedInsights?: SavedInsightContext|null }) {
  const [from, setFrom] = useState(demo ? "2026-08-01" : snapshot.from), [to, setTo] = useState(demo ? "2026-08-19" : snapshot.through.slice(0,10));
  const [deposit, setDeposit] = useState(""), [stake, setStake] = useState(""), [days, setDays] = useState("");
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const activityRef = useRef<HTMLElement>(null);
  function reviewActivity(start:string,end:string) { setFrom(start);setTo(end);setPreset(null);setActiveTab("activity");requestAnimationFrame(()=>{activityRef.current?.scrollIntoView({behavior:"smooth",block:"start"});activityRef.current?.focus({preventScroll:true});}); }
  function tabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, tab: DashboardTab) {
    const index = dashboardTabs.findIndex(item => item.id === tab);
    const next = event.key === "ArrowRight" ? (index + 1) % dashboardTabs.length
      : event.key === "ArrowLeft" ? (index + dashboardTabs.length - 1) % dashboardTabs.length
      : event.key === "Home" ? 0 : event.key === "End" ? dashboardTabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    setActiveTab(dashboardTabs[next].id);
    document.getElementById(`dashboard-tab-${dashboardTabs[next].id}`)?.focus();
  }
  const [preset, setPreset] = useState<"14" | "30" | "all" | null>(demo ? null : "all");
  const valid = from >= snapshot.from && to <= snapshot.through.slice(0,10) && from <= to;
  const m = useMemo(() => valid ? summarize(snapshot, from, to) : null, [snapshot, from, to, valid]);
  const limit = (s: string, cents = true) => s.trim() === "" || !Number.isFinite(Number(s)) || Number(s) < 0 ? null : Math.round(Number(s) * (cents ? 100 : 1));
  const limits = m ? previewLimits(m, limit(deposit), limit(stake), limit(days,false)) : null;
  const hasInvalidLimit = [deposit,stake,days].some(s => s !== "" && (!Number.isFinite(Number(s)) || Number(s) < 0)) || (days !== "" && !Number.isInteger(Number(days)));
  function lastDays(n: 14 | 30) { const end = snapshot.through.slice(0,10); setTo(end); setFrom([snapshot.from,shiftDay(end,1-n)].sort().at(-1)!); setPreset(String(n) as "14" | "30"); }
  function allHistory() { setFrom(snapshot.from); setTo(snapshot.through.slice(0,10)); setPreset("all"); }
  return <>
    <div className="private-nav"><a href="/" className="brand"><img src="/jelly-logo.gif?v=3" alt="" />Jelly</a>{demo ? <div className="private-nav-right"><span className="private-label">Demo preview</span><a href="/sign-in">Sign in</a></div> : <div className="session-links"><SignOutButton /></div>}</div>
    <main className="private-dashboard metrics-dashboard">
      <section className="welcome-row"><div><p className="eyebrow">Awareness, at your pace</p><h1>{demo ? "Make room for a different habit." : `Hi, ${name}.`}</h1></div></section>
      {!demo && answers && <PersonalSummary answers={answers} snapshot={planSnapshot} />}
      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard sections">
        {dashboardTabs.map(tab => <button key={tab.id} id={`dashboard-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`dashboard-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={event => tabKeyDown(event, tab.id)}>{tab.label}</button>)}
      </div>
      {(activeTab === "overview" || activeTab === "activity") && <section className="metrics-filters" aria-label="Activity date range"><label>From<input type="date" min={snapshot.from} max={snapshot.through.slice(0,10)} value={from} onChange={e => { setFrom(e.target.value); setPreset(null); }} /></label><label>Through<input type="date" min={snapshot.from} max={snapshot.through.slice(0,10)} value={to} onChange={e => { setTo(e.target.value); setPreset(null); }} /></label><div className="range-tags" role="group" aria-label="Quick ranges"><button type="button" className="range-tag" aria-pressed={preset === "14"} onClick={() => lastDays(14)}>Last 14 days</button><button type="button" className="range-tag" aria-pressed={preset === "30"} onClick={() => lastDays(30)}>Last 30 days</button><button type="button" className="range-tag" aria-pressed={preset === "all"} onClick={allHistory}>All history</button></div></section>}
      {(activeTab === "overview" || activeTab === "activity") && (!m || !limits) && <p role="alert">Choose a valid date range within {snapshot.from}–{snapshot.through.slice(0,10)}.</p>}
      <div className="dashboard-tab-panel" id="dashboard-panel-overview" role="tabpanel" aria-labelledby="dashboard-tab-overview" tabIndex={0} hidden={activeTab !== "overview"}>
      {m && limits && <>
        <section className="metric-grid"><Metric label="Cash wagered" value={usd(m.cashWagered)} detail="Cash put into bets placed in this period" /><Metric label="Bets placed" value={String(m.betCount)} detail={`${m.activeDays} betting days out of ${m.days}`} /><Metric label="Days without recorded bets" value={m.completeCoverage ? String(m.daysWithoutBets) : "Unavailable"} detail="Within this synthetic demo history only" />{!stopping && <Metric label="Settled betting result" value={usd(m.settledResult)} detail={`${m.settledCount} bets settled in this period; returns + refunds − cash stakes`} />}</section>
        <p className="metrics-note">{!m.completeCoverage && "Partial account coverage: totals include available records only. Latest balances are carried forward where history ends; missing history is not treated as abstinence. Choose dates covered by every selected account for a complete comparison. "}A positive result does not mean gambling is harmless. Frequency, amounts, and your own commitments matter independently of wins and losses.</p>
        <section className="dashboard-grid">{!stopping && <article className="panel"><p className="eyebrow">Financial picture</p><h2>Follow the cash</h2><dl className="metric-details"><Row name="Deposits" value={usd(m.deposits)} /><Row name="Withdrawals" value={usd(m.withdrawals)} /><Row name="Net deposits" value={usd(m.netDeposits)} /><Row name="Cash payouts" value={usd(m.payouts)} /><Row name="Cash refunds" value={usd(m.refunds)} /><Row name="Cash betting flow" value={usd(m.cashBettingFlow)} /><Row name="Opening cash balance" value={usd(m.opening)} /><Row name={m.completeCoverage ? "Closing cash balance" : "Last recorded cash balances"} value={usd(m.closing)} /><Row name="Bonus stakes placed" value={usd(m.bonusWagered)} /></dl><p className="fineprint">Net deposits = deposits − withdrawals. Cash betting flow = payouts + refunds − cash wagers recorded in the period. Opening balance + net deposits + cash betting flow = closing balance. It can differ from settled results while bets remain open or settle across date boundaries.</p><p className="fineprint">At period end: {m.openCount} unsettled bets with {usd(m.openCashStake)} cash committed. Stakes may be wagered again after a return; total stakes are not unique money deposited.</p></article>}
        <article className="panel"><p className="eyebrow">Frequency & exposure</p><h2>Notice your activity</h2><dl className="metric-details"><Row name="Average cash stake per bet" value={m.averageStake === null ? "Unavailable" : usd(m.averageStake)} /><Row name="Largest cash stake" value={m.maxStake === null ? "Unavailable" : usd(m.maxStake)} /><Row name="Longest stretch without recorded bets" value={m.completeCoverage ? `${m.longestBreak} days` : "Unavailable"} /><Row name="Time in gambling apps" value="Not tracked" /></dl><p className="fineprint">The average includes bonus-only bets with $0 cash stake. Days without bets describe the selected accounts’ records, not verified abstinence across other apps. Betting records do not measure screen time.</p></article></section>
      </>}
      </div>
      <div className="dashboard-tab-panel" id="dashboard-panel-activity" role="tabpanel" aria-labelledby="dashboard-tab-activity" tabIndex={0} hidden={activeTab !== "activity"}>
      {m && limits && <>
        <ActivityInsights snapshot={snapshot} from={from} to={to} demo={demo} saved={savedInsights} review={reviewActivity}/>
        <section className="panel daily-panel" aria-labelledby="bet-free-title"><p className="eyebrow">Daily pattern</p><h2 id="bet-free-title">Days without a recorded bet</h2><p>Each square is a day in this range. It lights up when no bet was recorded on the selected accounts.</p><BetFreeHeatmap daily={m.daily} completeCoverage={m.completeCoverage} /><p className="fineprint">A filled day is only these accounts’ records, not proof you didn’t bet somewhere else. Days outside full coverage stay unmarked.</p></section>
        <section className="panel daily-panel"><p className="eyebrow">Daily activity</p><h2>When gambling shows up</h2><p>Cash wagered by day. Hover or focus a bar for the amount and number of bets.</p><div className="daily-bars" role="group" aria-label="Daily cash wagers">{m.daily.map(d => <div tabIndex={0} className="daily-column" key={d.date} title={`${d.date}: ${usd(d.cashStake)}, ${d.count} bets`} aria-label={`${d.date}: ${usd(d.cashStake)}, ${d.count} bets`}><div style={{height:`${Math.max(2, d.cashStake / Math.max(1,...m.daily.map(x=>x.cashStake))*130)}px`, background: d.count ? "#547768" : "#d7ddd5"}} /></div>)}</div><div className="date-ends"><span>{m.from}</span><span>{m.to}</span></div></section>
        {/*
        {!metricsOnly && <section className="panel guardrail-panel"><p className="eyebrow">Choose what you want to change</p><h2>Try a limit against this history</h2><p>Explore reducing deposits, smaller cash stakes, or fewer betting days. Set a limit to 0 to preview a stopping goal.</p><div className="guardrail-fields"><label>Deposit cap for selected period ($)<input type="number" min="0" step="0.01" value={deposit} placeholder="No cap selected" onChange={e=>setDeposit(e.target.value)}/></label><label>Maximum cash stake per bet ($)<input type="number" min="0" step="0.01" value={stake} placeholder="No cap selected" onChange={e=>setStake(e.target.value)}/></label><label>Maximum betting days in period<input type="number" min="0" step="1" value={days} placeholder="No cap selected" onChange={e=>setDays(e.target.value)}/></label></div><div aria-live="polite">{hasInvalidLimit ? <p role="alert">Use nonnegative limits and a whole number of betting days.</p> : <><p>{limits.depositExceeded === null ? "Choose a deposit cap to compare." : `Deposits ${limits.depositExceeded ? "exceeded" : "stayed within"} this proposed cap: ${usd(m.deposits)} of ${usd(limit(deposit)!)}.`}</p><p>{limits.betsOverLimit === null ? "Choose a cash stake cap to compare." : `${limits.betsOverLimit} of ${m.betCount} bets exceeded this proposed cash stake cap.`}</p><p>{limits.activeDaysExceeded === null ? "Choose a betting-day cap to compare." : `${m.activeDays} betting days; proposed cap ${days}. ${limits.activeDaysExceeded ? "Above" : "Within"} this cap.`}</p></>}</div><p className="fineprint">Historical preview only. These entries are not saved, do not block gambling, and do not notify anyone. Changing the date range changes the period being evaluated. A cash-only stake limit does not capture bonus-only betting; a zero betting-day goal does.</p></section>}
        */}
        <section className="panel activity-panel" ref={activityRef} tabIndex={-1} aria-label="Transactions"><TransactionList key={`${from}:${to}`} transactions={m.recent} /></section>
      </>}
      </div>
      <div className="dashboard-tab-panel" id="dashboard-panel-connections" role="tabpanel" aria-labelledby="dashboard-tab-connections" tabIndex={0} hidden={activeTab !== "connections"}>
        {connectionControls}
      </div>
      <div className="dashboard-tab-panel" id="dashboard-panel-resources" role="tabpanel" aria-labelledby="dashboard-tab-resources" tabIndex={0} hidden={activeTab !== "resources"}>
        <section className="resources dashboard-resources" aria-labelledby="dashboard-resources-heading">
          <h2 id="dashboard-resources-heading">Resources</h2>
          <p className="how-context">Gambling-specific support and treatment, peer groups, therapists and programs, help for friends and family, debt, and blocking tools.</p>
          <div className="urgent-help">
            <span>Need help now</span>
            <a href="tel:18006973738">Call or text 1-800-MY-RESET</a>
            <p>The National Problem Gambling Helpline. You can also <a href="https://www.1800myreset.org" target="_blank" rel="noopener noreferrer">chat online</a>.</p>
          </div>
          <div className="resource-list">
            {resources.map((item) => (
              <a className="resource-card" href={item.href} key={item.title} target="_blank" rel="noopener noreferrer">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <span className="link">{item.action} →</span>
              </a>
            ))}
          </div>
          <p className="resource-note">For gambling-related debt, or for blocking and self-exclusion, call or text the helpline and ask to be connected in your state.</p>
        </section>
      </div>
    </main>
  </>;
}
function Metric({label,value,detail}:{label:string;value:string;detail:string}) { return <article className="private-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function Row({name,value}:{name:string;value:string}) { return <div><dt>{name}</dt><dd>{value}</dd></div>; }

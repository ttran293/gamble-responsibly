"use client";

import { useEffect, useRef, useState } from "react";
import { combineSnapshots, type Snapshot } from "../lib/metrics/core";
import type { OnboardingAnswers } from "../lib/onboarding";
import { PrivateDashboard } from "./private-dashboard";
import { TakeABreak } from "./take-a-break";
import { Guardrails } from "./guardrails";
import { PersonalSummary } from "./personal-summary";

type Provider = "draftkings" | "fanduel" | "moonharbor";
type Connection = { status: "disconnected" | "connecting" | "connected" | "error"; snapshot?: Snapshot; error?: string };
const providers: Provider[] = ["draftkings", "fanduel", "moonharbor"];
const names = { draftkings: "DraftKings", fanduel: "FanDuel", moonharbor: "Moonharbor Sports (fictional)" };
const storageKey = "stillwater-demo-connections-v1";
const initial = (): Record<Provider, Connection> => ({ draftkings: {status:"disconnected"}, fanduel: {status:"disconnected"}, moonharbor: {status:"disconnected"} });

export function ConnectedDashboard({ screen = "dashboard", name = "Demo", demo = false, answers, emailVerified }: { screen?: "dashboard" | "connections"; name?: string; demo?: boolean; answers?: OnboardingAnswers; emailVerified?: boolean }) {
  const [connections, setConnections] = useState(initial);
  const [savedGoal, setSavedGoal] = useState<"stay"|"reduce"|"stop"|null>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState("all");
  const [failNext, setFailNext] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const busy = useRef(new Set<Provider>());

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let saved: Provider[] = [];
      try { const parsed = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]"); if(Array.isArray(parsed)) saved = providers.filter(p=>parsed.includes(p)); }
      catch { setStorageError(true); }
      const restored = initial();
      await Promise.all(saved.map(async p => {
        try { const response = await fetch(`/api/demo/connections/${p}`, {method:"POST", headers:{"Content-Type":"application/json"}, body:"{}"}); const body=await response.json(); if(!response.ok) throw new Error(body.error); restored[p]={status:"connected",snapshot:body}; }
        catch { restored[p]={status:"error",error:"Could not restore the demo connection. Retry below."}; }
      }));
      if (!cancelled) { setConnections(restored); setReady(true); }
    }
    void restore();
    return ()=>{cancelled=true;};
  }, []);
  useEffect(() => {
    if(!ready) return;
    try { sessionStorage.setItem(storageKey,JSON.stringify(providers.filter(p=>connections[p].snapshot))); }
    catch { setStorageError(true); }
  },[connections,ready]);

  async function connect(provider: Provider) {
    if(busy.current.has(provider)) return;
    busy.current.add(provider);
    const simulateFailure = failNext; setFailNext(false);
    setConnections(c=>({...c,[provider]:{...c[provider],status:"connecting",error:undefined}}));
    try {
      // Deliberate latency makes the simulated connecting state visible.
      const [response] = await Promise.all([fetch(`/api/demo/connections/${provider}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({simulateFailure})}),new Promise(resolve=>setTimeout(resolve,650))]);
      const body=await response.json(); if(!response.ok) throw new Error(body.error ?? "Demo connection failed.");
      setConnections(c=>({...c,[provider]:{status:"connected",snapshot:body}}));
    } catch(error) { setConnections(c=>({...c,[provider]:{...c[provider],status:"error",error:error instanceof Error ? error.message : "Connection failed. Retry."}})); }
    finally { busy.current.delete(provider); }
  }
  function disconnect(provider: Provider) { setConnections(c=>({...c,[provider]:{status:"disconnected"}}));setSelected("all"); }
  const connected = providers.filter(p=>connections[p].snapshot);
  const filtered = selected === "all" ? connected : connected.filter(p=>p===selected);
  const active = filtered.map(p=>connections[p].snapshot!);
  const snapshot = active.length ? combineSnapshots(active) : null;
  const manager = <section className="panel account-manager">
    <p className="eyebrow">Demo connection · Synthetic data</p><h1>Connect accounts</h1>
    <p>Explore a combined view of simulated sportsbook accounts. No credentials, live APIs, or bank access are used.</p>
    {!ready && <p role="status">Restoring demo connections…</p>}
    {storageError && <p role="status">Browser storage is unavailable. Connections will last only until this page is closed.</p>}
    <div className="account-cards">{providers.map(p=>{const c=connections[p];return <article className="account-card" key={p}>
      <h2>{names[p]}</h2><p className="account-status" role="status">{c.status === "connecting" ? "Connecting…" : c.status === "connected" ? "Connected · Demo" : c.status === "error" ? "Connection failed" : "Not connected"}</p>
      {c.snapshot && <><p>{c.snapshot.bets.length} bets · {c.snapshot.transactions.length} ledger entries</p><small>History: {c.snapshot.from}–{c.snapshot.through.slice(0,10)} UTC</small><small>Loaded: {new Date(c.snapshot.loadedAt).toLocaleString("en-US",{timeZone:"UTC"})} UTC</small>{c.snapshot.supplemental && <small>{c.snapshot.supplemental.promotions} promotions and {c.snapshot.supplemental.statements} statements validated; not added again to cash totals.</small>}</>}
      {c.error && <p role="alert">{c.error}{c.snapshot ? " Previous data is retained and may be stale." : ""}</p>}
      <div className="account-actions"><button className="outline-button" disabled={!ready||c.status==="connecting"} onClick={()=>void connect(p)}>{c.status==="connecting"?"Loading…":c.status==="error"?"Retry":c.snapshot?"Reload demo":"Connect demo account"}</button>{c.snapshot&&<button disabled={c.status==="connecting"} onClick={()=>disconnect(p)}>Disconnect</button>}</div>
    </article>;})}</div>
    <label className="failure-toggle"><input type="checkbox" checked={failNext} disabled={!ready} onChange={e=>setFailNext(e.target.checked)}/> Simulate a failure on the next connection or reload</label>
    <p className="fineprint">Connection choices are saved for this browser tab’s demo session. Disconnecting removes an account from the combined view. Reloading replaces its data without duplicating entries.</p>
  </section>;

  if(screen==="connections") return <><div className="private-nav"><a className="brand" href="/">◒ stillwater</a><a href="/demo">View demo metrics →</a><a href="/dashboard">My dashboard →</a></div><main className="private-dashboard metrics-dashboard">{manager}</main></>;
  const guardrails = <Guardrails demo={demo} compact onGoalChange={setSavedGoal}/>;
  const supported = filtered.filter((p): p is "draftkings" | "fanduel" => p !== "moonharbor");
  const controls = <>{supported.length > 0 && <><TakeABreak providers={supported}/>{guardrails}</>}<div className="account-toolbar"><a href="/connect">Manage connections</a><label>Show accounts <select aria-label="Show accounts" value={selected} onChange={e=>setSelected(e.target.value)}><option value="all">All accounts ({connected.length})</option>{connected.map(p=><option key={p} value={p}>{names[p]}</option>)}</select></label></div>{providers.filter(p=>connections[p].status==="error").map(p=><p role="alert" key={p}>{names[p]}: {connections[p].error} {connections[p].snapshot?"Showing previously loaded data.":"Not included in metrics."} <a href="/connect">Retry connection</a></p>)}</>;
  if(snapshot) return <PrivateDashboard key={filtered.join(",")} name={name} snapshot={snapshot} demo={demo} answers={answers} emailVerified={emailVerified} connectionControls={controls} metricsOnly={supported.length === 0} stopping={supported.length > 0 && savedGoal==="stop"}/>;
  return <><div className="private-nav"><a className="brand" href="/">◒ stillwater</a></div><main className="private-dashboard metrics-dashboard">{!demo&&answers&&<PersonalSummary answers={answers} emailVerified={emailVerified??true}/>}<section className="panel"><h1>{ready?"Connect a demo account to begin":"Loading demo connections…"}</h1><p>Demo connection · Synthetic data</p><p>Connect DraftKings, FanDuel, or fictional Moonharbor to view activity and combined metrics.</p><a className="outline-button" href="/connect">Connect accounts →</a></section>{guardrails}{ready&&manager}</main></>;
}

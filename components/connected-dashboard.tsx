"use client";

import { useEffect, useRef, useState } from "react";
import { demoConnectionsToLoad, saveDemoConnections, type DemoConnectionProvider } from "../lib/demo-connections";
import { combineSnapshots, type Snapshot } from "../lib/metrics/core";
import type { OnboardingAnswers } from "../lib/onboarding";
import { PrivateDashboard } from "./private-dashboard";
import { PersonalSummary } from "./personal-summary";
import { SignOutButton } from "./sign-out-button";

type Provider = DemoConnectionProvider;
type Connection = { status: "disconnected" | "connecting" | "connected" | "error"; snapshot?: Snapshot; error?: string };
const providers: Provider[] = ["draftkings", "fanduel", "moonharbor"];
const names = { draftkings: "DraftKings", fanduel: "FanDuel", moonharbor: "Moonharbor Sports (fictional)" };
const logos = { draftkings: "/draftkings.svg", fanduel: "/fanduel.svg", moonharbor: "/moonharbor.svg" };
const initial = (): Record<Provider, Connection> => ({ draftkings: {status:"disconnected"}, fanduel: {status:"disconnected"}, moonharbor: {status:"disconnected"} });

export function ConnectedDashboard({ screen = "dashboard", name = "Demo", demo = false, signedIn = false, answers }: { screen?: "dashboard" | "connections"; name?: string; demo?: boolean; signedIn?: boolean; answers?: OnboardingAnswers }) {
  const [connections, setConnections] = useState(initial);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState("all");
  const [failNext, setFailNext] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const busy = useRef(new Set<Provider>());

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      let saved: Provider[] = [];
      try { saved = demoConnectionsToLoad(!demo); }
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
  }, [demo]);
  useEffect(() => {
    if(!ready) return;
    try { saveDemoConnections(providers.filter(p=>connections[p].snapshot), !demo && providers.every(p=>connections[p].status!=="error")); }
    catch { setStorageError(true); }
  },[connections,ready,demo]);

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
  const planSnapshot = connected.length ? combineSnapshots(connected.map(p => connections[p].snapshot!)) : null;
  const manager = <section className="panel account-manager">
    <p className="eyebrow">Demo connection · Synthetic data</p><h1>Connect accounts</h1>
    <p>Explore a combined view of simulated sportsbook accounts. No credentials, live APIs, or bank access are used.</p>
    {!ready && <p role="status">Restoring demo connections…</p>}
    {storageError && <p role="status">Browser storage is unavailable. Connections will last only until this page is closed.</p>}
    <div className="account-cards">{providers.map(p=>{const c=connections[p];return <article className="account-card" key={p}>
      <h2>{names[p]}</h2><p className="account-status" role="status">{c.status === "connecting" ? "Connecting…" : c.status === "connected" ? "Connected · Demo" : c.status === "error" ? "Connection failed" : "Not connected"}</p>
      {c.snapshot && <><p>{c.snapshot.bets.length} bets · {c.snapshot.transactions.length} ledger entries</p><small>History: {c.snapshot.from}–{c.snapshot.through.slice(0,10)} UTC</small><small>Loaded: {new Date(c.snapshot.loadedAt).toLocaleString("en-US",{timeZone:"UTC"})} UTC</small>{c.snapshot.supplemental && <small>{c.snapshot.supplemental.promotions} promotions and {c.snapshot.supplemental.statements} statements validated; not added again to cash totals.</small>}</>}
      {c.error && <p role="alert">{c.error}{c.snapshot ? " Previous data is retained and may be stale." : ""}</p>}
      <div className="account-actions"><button className="primary" disabled={!ready||c.status==="connecting"} onClick={()=>void connect(p)}>{c.status==="connecting"?"Loading…":c.status==="error"?"Retry":c.snapshot?"Reload demo":"Connect demo account"}</button>{c.snapshot&&<button className="text-link" disabled={c.status==="connecting"} onClick={()=>disconnect(p)}>Disconnect</button>}</div>
    </article>;})}</div>
    <label className="failure-toggle"><input type="checkbox" checked={failNext} disabled={!ready} onChange={e=>setFailNext(e.target.checked)}/> Simulate a failure on the next connection or reload</label>
    <p className="fineprint">Connection choices are saved for this browser tab’s demo session. Disconnecting removes an account from the combined view. Reloading replaces its data without duplicating entries.</p>
  </section>;

  if(screen==="connections") return <><div className="private-nav"><a className="brand" href="/"><img src="/jelly-logo.gif?v=3" alt="" />Jelly</a><div className="session-links"><a href="/demo">View demo metrics →</a><a href="/dashboard">My dashboard →</a>{signedIn && <SignOutButton />}</div></div><main className="private-dashboard metrics-dashboard">{manager}</main></>;
  const supported = filtered.filter((p): p is "draftkings" | "fanduel" => p !== "moonharbor");
  const controls = <>
    <section className="connected-apps" aria-labelledby="connections-title">
      <div className="connected-apps-header">
        <h2 id="connections-title">Connections</h2>
        <p>Connect an app to explore sample activity. Select a connected app to focus on it, then select it again to see all accounts.</p>
      </div>
      <p className="connection-tiles-label">Add or view a connection</p>
      <div className="connection-tiles">{providers.map(p=>{
        const c=connections[p];
        const status=c.status==="connecting"?(c.snapshot?"Reloading":"Connecting"):c.status==="error"?(c.snapshot?"Reload failed":"Failed"):c.snapshot?"Connected":"Not connected";
        const action=c.snapshot?(selected===p?"Show all accounts":`Show ${names[p]} activity`):`Connect ${names[p]}`;
        return <button type="button" className={`connection-tile ${c.snapshot?"is-connected":""} ${c.status==="error"?"is-error":""} ${selected===p?"is-selected":""}`} key={p} disabled={!ready||c.status==="connecting"} aria-label={`${action}. ${status}.`} aria-pressed={c.snapshot?selected===p:undefined} onClick={()=>c.snapshot?setSelected(current=>current===p?"all":p):void connect(p)}>
          <span className="connection-tile-icon"><img src={logos[p]} alt="" /></span>
          <span className="connection-tile-name">{p==="moonharbor"?"Moonharbor":names[p]}</span>
          <span className="connection-tile-status">{status}</span>
        </button>;
      })}<a className="connection-tile connection-manage" href="/connect" aria-label="Manage connections"><span className="connection-tile-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg></span><span className="connection-tile-name">Manage</span></a></div>
    </section>
    {providers.filter(p=>connections[p].status==="error").map(p=><p role="alert" key={p}>{names[p]}: {connections[p].error} {connections[p].snapshot?"Showing previously loaded data.":"Not included in metrics."} <a className="text-link" href="/connect">Retry connection</a></p>)}
  </>;
  if(snapshot) return <PrivateDashboard key={filtered.join(",")} name={name} snapshot={snapshot} planSnapshot={planSnapshot} demo={demo} answers={answers} connectionControls={controls} metricsOnly={supported.length === 0} stopping={supported.length > 0 && !demo && answers?.goal === "stop"}/>;
  return <><div className="private-nav"><a className="brand" href="/"><img src="/jelly-logo.gif?v=3" alt="" />Jelly</a>{!demo && <div className="session-links"><SignOutButton /></div>}</div><main className="private-dashboard metrics-dashboard">{!demo&&answers&&<PersonalSummary answers={answers}/>}<section className="panel"><h1>{ready?"Connect a demo account to begin":"Loading demo connections…"}</h1><p>Demo connection · Synthetic data</p><p>Connect DraftKings, FanDuel, or fictional Moonharbor to view activity and combined metrics.</p><a className="primary" href="/connect">Connect accounts →</a></section>{ready&&manager}</main></>;
}

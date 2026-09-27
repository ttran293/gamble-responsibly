"use client";

import { useEffect, useRef, useState } from "react";
import { demoConnectionProviders, savedDemoProviders, savedDemoVersion, saveDemoProviders, saveDemoVersion, type DemoConnectionProvider, type DemoVersion } from "../lib/demo-connections";
import { combineSnapshots, type Snapshot } from "../lib/metrics/core";
import type { OnboardingAnswers } from "../lib/onboarding";
import { DashboardResources, PrivateDashboard } from "./private-dashboard";
import { EmergencyContactCard } from "./emergency-contact-card";
import { PersonalSummary } from "./personal-summary";
import { SignOutButton } from "./sign-out-button";

type Provider = DemoConnectionProvider;
const names: Record<Provider, string> = { draftkings: "DraftKings", fanduel: "FanDuel", moonharbor: "Moonharbor Sports" };
const icons: Record<Provider, string> = { draftkings: "/draftkings.svg", fanduel: "/fanduel.svg", moonharbor: "/moonharbor.svg" };

export function ConnectedDashboard({ name = "Demo", demo = false, signedIn = false, answers }: { name?: string; demo?: boolean; signedIn?: boolean; answers?: OnboardingAnswers }) {
  const [version, setVersion] = useState<DemoVersion | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<Provider[]>([]);
  const [snapshots, setSnapshots] = useState<Partial<Record<Provider, Snapshot>> | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [emptyTab, setEmptyTab] = useState<"connections" | "resources">("connections");
  const requestId = useRef(0);
  const missingSportRetry = useRef("");
  const publicPreview = demo && !signedIn;

  async function loadVersion(next: DemoVersion, persist = true, providersToLoad = connectedProviders) {
    const currentRequest = ++requestId.current;
    setVersion(next);
    setSnapshots(null);
    setError("");
    setLoading(true);
    try {
      const entries = await Promise.all(providersToLoad.map(async provider => {
        const response = await fetch(`/api/demo/connections/${provider}`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: next })
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? `Could not load ${names[provider]} demo data.`);
        return [provider, body as Snapshot] as const;
      }));
      if (requestId.current !== currentRequest) return;
      const loaded = Object.fromEntries(entries) as Partial<Record<Provider, Snapshot>>;
      if (entries.some(([, snapshot]) => snapshot.bets.some(bet => !bet.sport?.trim()))) throw new Error("The demo data is missing sport labels. Reload the page to reconnect.");
      combineSnapshots(providersToLoad.map(provider => loaded[provider]!));
      setSnapshots(loaded);
      if (persist) {
        try { saveDemoVersion(next); saveDemoProviders(providersToLoad); } catch { setStorageError(true); }
      }
    } catch (cause) {
      if (requestId.current === currentRequest) setError(cause instanceof Error ? cause.message : "Could not load demo data.");
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }

  useEffect(() => {
    if (publicPreview) {
      try {
        const saved = savedDemoVersion();
        if (saved) {
          const savedProviders = savedDemoProviders();
          setConnectedProviders(savedProviders);
          void loadVersion(saved, false, savedProviders);
        }
      } catch { setStorageError(true); }
    } else if (answers?.demoSelection) {
      const { version: saved, providers: savedProviders } = answers.demoSelection;
      setConnectedProviders(savedProviders);
      void loadVersion(saved, false, savedProviders);
    }
    setReady(true);
    return () => { requestId.current++; };
  }, []);

  // A fast refresh can preserve snapshots fetched before sport metadata was added.
  useEffect(() => {
    if (!version || !snapshots || !connectedProviders.length) return;
    if (!connectedProviders.some(provider => snapshots[provider]?.bets.some(bet => !bet.sport?.trim()))) return;
    const selection = `${version}:${connectedProviders.join(",")}`;
    if (missingSportRetry.current === selection) return;
    missingSportRetry.current = selection;
    void loadVersion(version, false, connectedProviders);
  }, [version, snapshots, connectedProviders]);

  const versionButtons = <div className="demo-version-buttons" role="group" aria-label="Demo data version">
    {(["v1", "v2"] as const).map(option => <button key={option} type="button" className={version === option && snapshots ? "primary" : "outline"} aria-pressed={version === option && !!snapshots} onClick={() => { const providers = [...demoConnectionProviders]; setConnectedProviders(providers); void loadVersion(option, true, providers); }}>Connect to demo data {option}</button>)}
  </div>;

  const connectedApps = <section className="demo-data-controls" aria-label="Connected apps">
    <div className="connected-apps-header"><p className="eyebrow">{version ? `Synthetic · Demo data ${version === "v1" ? "1" : "2"}` : "Synthetic data"}</p><h2>Connected Apps</h2></div>
    <div className="connection-tiles" aria-label="App connection status">
      {demoConnectionProviders.map(provider => <div key={provider} className={`connection-tile is-static ${connectedProviders.includes(provider) ? "is-connected" : ""}`}><span className="connection-tile-icon"><img src={icons[provider]} alt="" /></span><span className="connection-tile-name">{names[provider]}</span><span className="connection-tile-status">{connectedProviders.includes(provider) ? "Connected" : "Not connected"}</span></div>)}
    </div>
    {publicPreview && storageError && <p role="status">Browser storage is unavailable. Your selection will last until this page is closed.</p>}
  </section>;

  if (!snapshots) return <>
    <div className="private-nav"><a className="brand" href="/"><img src="/jelly-logo.gif?v=3" alt="" />Jelly</a>{publicPreview ? <a href="/sign-in">Sign in</a> : <SignOutButton />}</div>
    <main className="private-dashboard metrics-dashboard">
      <section className="welcome-row"><div><p className="eyebrow">Awareness, at your pace</p><h1>{publicPreview ? "Make room for a different habit." : `Hi, ${name}.`}</h1></div></section>
      {!publicPreview && <EmergencyContactCard />}
      {!publicPreview && answers && <PersonalSummary answers={answers} />}
      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard sections">
        <button type="button" role="tab" disabled aria-selected={false}>Overview</button>
        <button type="button" role="tab" disabled aria-selected={false}>Activity</button>
        {(["connections", "resources"] as const).map(tab => <button key={tab} id={`dashboard-tab-${tab}`} type="button" role="tab" aria-selected={emptyTab === tab} aria-controls={`dashboard-panel-${tab}`} tabIndex={emptyTab === tab ? 0 : -1} onClick={() => setEmptyTab(tab)} onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); const next = event.key === "Home" ? "connections" : event.key === "End" ? "resources" : tab === "connections" ? "resources" : "connections"; setEmptyTab(next); document.getElementById(`dashboard-tab-${next}`)?.focus(); } }}>{tab === "connections" ? "Connected Apps" : "Resources"}</button>)}
      </div>
      <div className="dashboard-tab-panel" id="dashboard-panel-connections" role="tabpanel" aria-labelledby="dashboard-tab-connections" tabIndex={0} hidden={emptyTab !== "connections"}>
        {connectedApps}
        {!publicPreview && <p><a className="text-link" href="/onboarding">Connect demo apps →</a></p>}
        {publicPreview && <section className="panel demo-version-panel">
        <p className="eyebrow">Synthetic data</p>
        <h1>Connect to demo data</h1>
        <p>Choose a version to view its overview, activity, and resources.</p>
        {versionButtons}
        </section>}
        {!ready && <p role="status">Checking your demo selection…</p>}
        {loading && <p role="status">Loading demo data {version}…</p>}
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="dashboard-tab-panel" id="dashboard-panel-resources" role="tabpanel" aria-labelledby="dashboard-tab-resources" tabIndex={0} hidden={emptyTab !== "resources"}><DashboardResources /></div>
    </main>
  </>;

  const all = combineSnapshots(connectedProviders.map(provider => snapshots[provider]!));
  const moonharborOnly = connectedProviders.length === 1 && connectedProviders[0] === "moonharbor";
  const connectionPanel = <>{connectedApps}{!publicPreview && <p><a className="text-link" href="/onboarding">Change demo connections →</a></p>}</>;
  return <PrivateDashboard key={version} name={name} snapshot={all} planSnapshot={all} demo={publicPreview} answers={answers} dataControls={connectionPanel} metricsOnly={moonharborOnly} stopping={!publicPreview && !moonharborOnly && answers?.goal === "stop"} />;
}

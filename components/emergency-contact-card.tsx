"use client";

import { useEffect, useState } from "react";
import { JellyMessage } from "./jelly-message";

type Contact = { name: string; email: string };
type PendingContact = Contact & { status: "pending" | "demo" };
const demoWarning = "Saved for demo only. No email was sent, this person has not accepted, and Jelly cannot notify them.";

export function EmergencyContactCard() {
  const [contact, setContact] = useState<Contact | null>(null);
  const [pending, setPending] = useState<PendingContact | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [busy, setBusy] = useState(false);

  function apply(body: { contact?: Contact | null; pending?: PendingContact | null }) {
    setContact(body.contact?.name ? body.contact : null);
    setPending(body.pending?.name ? body.pending : null);
    setWarning(body.pending?.status === "demo" ? demoWarning : "");
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/emergency-contact", { cache: "no-store" }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Your emergency contact is unavailable.");
      if (!cancelled) apply(body);
    }).catch(cause => {
      if (!cancelled) setLoadError(cause instanceof Error ? cause.message : "Your emergency contact is unavailable.");
    }).finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/emergency-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email: form.get("email") })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not request an emergency contact.");
      setPending(body.pending);
      setWarning(body.warning ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request an emergency contact.");
    } finally { setBusy(false); }
  }

  async function removeDemo() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/emergency-contact", { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not remove the demo contact.");
      setPending(null);
      setWarning("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove the demo contact.");
    } finally { setBusy(false); }
  }

  const showForm = loaded && !loadError && !contact && !pending;
  const displayName = contact?.name ?? pending?.name ?? null;

  return <section className="panel emergency-contact-panel" aria-labelledby="emergency-contact-heading">
    <div className="emergency-contact-layout">
      <JellyMessage label="A note from Jelly" className="emergency-contact-note">
        <strong>What an emergency contact is</strong>
        <p>An emergency contact is a person you trust. They do not see your habit record, spending, goal, dashboard, or conversations.</p>
        <p>Jelly can email them when a streak of not betting breaks, or when you want to bet and want to reach out.</p>
      </JellyMessage>
      <div className="emergency-contact-intro">
        <span className="eyebrow">Someone who can help</span>
        <h2 id="emergency-contact-heading">Emergency contact</h2>
        {displayName && <p className="emergency-contact-name">{displayName}</p>}
      </div>
    </div>
    {!loaded && <p role="status">Checking your emergency contact…</p>}
    {loadError && <p role="alert">{loadError}</p>}
    {pending?.status === "pending" && <p>Request sent to {pending.email}. They become your emergency contact only if they accept.</p>}
    {pending?.status === "demo" && <><p>Demo contact: {pending.email}</p><button type="button" className="text-link" disabled={busy} onClick={() => void removeDemo()}>Remove demo contact</button></>}
    {warning && <div role="alert" className="onboarding-error"><span>{warning}</span> <button type="button" className="text-link" onClick={() => setWarning("")} aria-label="Dismiss demo contact warning">Dismiss</button></div>}
    {showForm && <>
      <p>You do not have an emergency contact yet. Request one if you want someone notified when you need support. If email delivery is unavailable or the address is invalid, Jelly saves it as a demo contact and shows a warning.</p>
      <form className="emergency-contact-form" onSubmit={submit}>
        <label>Their name<input required name="name" minLength={2} maxLength={80} placeholder="Alex Rivera" /></label>
        <label>Their email<input required name="email" type="text" inputMode="email" maxLength={254} placeholder="alex@example.com" /></label>
        <button className="primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Request emergency contact"}</button>
      </form>
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

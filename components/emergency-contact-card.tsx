"use client";

import { useEffect, useState } from "react";
import { JellyMessage } from "./jelly-message";

type Contact = { name: string; email: string };

export function EmergencyContactCard() {
  const [contact, setContact] = useState<Contact | null>(null);
  const [pending, setPending] = useState<Contact | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function apply(body: { contact?: Contact | null; pending?: Contact | null }) {
    setContact(body.contact?.name ? body.contact : null);
    setPending(body.pending?.name ? body.pending : null);
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
      setPending(body.pending?.name ? body.pending : { name: String(form.get("name")), email: String(form.get("email")) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not request an emergency contact.");
    } finally { setBusy(false); }
  }

  const showForm = loaded && !loadError && !contact && !pending;
  const displayName = contact?.name ?? pending?.name ?? null;

  return <section className="panel emergency-contact-panel" aria-labelledby="emergency-contact-heading">
    <div className="emergency-contact-layout">
      <JellyMessage label="A note from Jelly" className="emergency-contact-note">
        <strong>What an emergency contact is</strong>
        <p>An emergency contact is a person you trust. They do not see your habit record, spending, goal, dashboard, or conversations.</p>
        <p>Jelly can email them when a streak of not betting breaks, or when you want to bet and want to reach out. The notice only says that you are struggling or asked to be contacted. They can then check in with you. You choose who to ask, and they choose whether to accept.</p>
      </JellyMessage>
      <div className="emergency-contact-intro">
        <span className="eyebrow">Someone who can help</span>
        <h2 id="emergency-contact-heading">Emergency contact</h2>
        {displayName && <p className="emergency-contact-name">{displayName}</p>}
      </div>
    </div>
    {!loaded && <p role="status">Checking your emergency contact…</p>}
    {loadError && <p role="alert">{loadError}</p>}
    {showForm && <>
      <p>You do not have an emergency contact yet. Request one if you want someone notified when you need support. You can keep using Jelly without one.</p>
      <form className="emergency-contact-form" onSubmit={submit}>
        <label>Their name<input required name="name" minLength={2} maxLength={80} placeholder="Alex Rivera" /></label>
        <label>Their email<input required name="email" type="email" maxLength={254} placeholder="alex@example.com" /></label>
        <button className="primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Request emergency contact"}</button>
      </form>
      <p className="fineprint">We email them a link that expires in 72 hours. They become your emergency contact only after they accept.</p>
      {error && <p role="alert">{error}</p>}
    </>}
  </section>;
}

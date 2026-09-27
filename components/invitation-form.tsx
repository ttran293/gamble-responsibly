"use client";

import { useState } from "react";

export function InvitationForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setStatus("Sending confirmation email…");
    try {
      const response = await fetch("/api/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const data = await response.json();
      setStatus(response.ok ? "Check your email to confirm the request. The invitation will be sent after you confirm." : data.error ?? "Could not request the invitation.");
    } catch { setStatus("Could not request the invitation. Please try again."); }
    finally { setBusy(false); }
  }
  return <form className="simple-form" onSubmit={submit}><div className="two-fields"><label>Your name<input required name="senderName" placeholder="Your name" /></label><label>Your email<input required name="senderEmail" type="email" placeholder="you@example.com" /></label></div><label>Their email address<input required name="recipientEmail" type="email" placeholder="them@example.com" /></label><label>Optional note<textarea name="note" maxLength={500} placeholder="I thought this could be useful. No pressure." /></label><p className="privacy-copy">We will email you a confirmation link first. They receive the invitation only after you confirm. If they create an account from it, you become their emergency contact. You will not see their dashboard, spending, or goal.</p><button className="primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Request invitation"}</button>{status && <p className="form-status">{status}</p>}</form>;
}

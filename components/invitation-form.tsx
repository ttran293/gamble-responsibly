"use client";

import { useState } from "react";

export function InvitationForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setStatus("Sending invitation…");
    try {
      const response = await fetch("/api/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const data = await response.json();
      setStatus(response.ok ? "Invitation sent." : data.error ?? "Could not send the invitation.");
    } catch { setStatus("Could not send the invitation. Please try again."); }
    finally { setBusy(false); }
  }
  return <form className="simple-form" onSubmit={submit}><div className="two-fields"><label>Your name<input required name="senderName" placeholder="Your name" /></label><label>Your email<input required name="senderEmail" type="email" placeholder="you@example.com" /></label></div><label>Their email address<input required name="recipientEmail" type="email" placeholder="them@example.com" /></label><label>Optional note<textarea name="note" maxLength={500} placeholder="I thought this could be useful. No pressure." /></label><button className="primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send invitation"}</button>{status && <p className="form-status">{status}</p>}</form>;
}

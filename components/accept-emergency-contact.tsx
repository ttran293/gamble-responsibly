"use client";

import { useState } from "react";

export function AcceptEmergencyContact({ token, requesterName }: { token: string; requesterName: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function accept() {
    if (busy || done) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/emergency-contact/accept", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not accept this request.");
      setDone(true);
      setMessage(`You are now an emergency contact for ${requesterName}. You will not see their activity, spending, or goal. If Jelly emails you, the notice only says they are struggling or asked to be contacted.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not accept this request.");
    } finally { setBusy(false); }
  }

  return <>
    <p>{requesterName} asked you to be their emergency contact on Jelly. If you accept, Jelly may email you when a streak of not betting breaks, or when they want to reach out before betting. You will not see their habit record, spending, goal, or conversations.</p>
    <p>You can help by checking in when you receive one of those notices. Accepting is your choice.</p>
    <button className="primary" type="button" disabled={busy || done} onClick={() => void accept()}>{busy ? "Accepting…" : done ? "Accepted" : "Accept and be their emergency contact"}</button>
    {message && <p className="form-status" role="status">{message}</p>}
  </>;
}

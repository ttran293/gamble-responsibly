"use client";

import { useState } from "react";

export function ConfirmInvitation({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function confirm() {
    if (busy || done) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/invitations/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not send the invitation.");
      setDone(true);
      setMessage("Invitation sent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the invitation.");
    } finally { setBusy(false); }
  }

  return <><p>Confirm that you requested this invitation. The recipient will receive an email only after you confirm.</p><button className="primary" type="button" disabled={busy || done} onClick={() => void confirm()}>{busy ? "Sending…" : done ? "Confirmed" : "Confirm and send invitation"}</button>{message && <p className="form-status" role="status">{message}</p>}</>;
}

"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { clearDemoConnections } from "../lib/demo-connections";

export function StartForm({ invite }: { invite?: { token: string; senderName: string; senderEmail: string | null; recipientEmail: string; note: string | null } | null }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(invite?.recipientEmail ?? "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [accountReady, setAccountReady] = useState(false);
  async function acceptInvite() {
    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: invite?.token })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAccountReady(true);
      setStatus(typeof data.error === "string" ? data.error : "Your account was created, but we could not add your emergency contact. Try again.");
      return false;
    }
    return true;
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(accountReady ? "Adding your emergency contact…" : "Creating your private account…");
    if (!accountReady) {
      const { error } = await authClient.signUp.email({ name: name || "Jelly member", email, password, callbackURL: "/dashboard" });
      if (error) { setStatus(error.message ?? "We could not create that account."); return; }
      void authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
      try { clearDemoConnections(); } catch { /* The dashboard still offers a version choice when storage is unavailable. */ }
    }
    if (invite && !await acceptInvite()) return;
    window.location.assign("/dashboard");
  }
  return <form className="simple-form" onSubmit={submit}>
    {invite?.note && <p className="privacy-copy">Their note: “{invite.note}”</p>}
    <label>First name or nickname<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" /></label>
    <label>Email address<input required type="email" readOnly={Boolean(invite)} aria-readonly={invite ? true : undefined} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
    <label>Password<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>
    <button className="primary" type="submit">{accountReady ? "Add emergency contact and continue" : "Create my private account →"}</button>
    {status && <p className="form-status" role="status">{status}</p>}
  </form>;
}

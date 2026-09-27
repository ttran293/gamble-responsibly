"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { clearDemoConnections } from "../lib/demo-connections";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("Signing in…");
    try {
      const { error } = await authClient.signIn.email({ email, password, rememberMe, callbackURL: "/dashboard" });
      if (error) { setStatus(error.message ?? "We could not sign you in. Check your details and try again."); return; }
      try { clearDemoConnections(); } catch { /* The dashboard still offers a version choice when storage is unavailable. */ }
      window.location.assign("/dashboard");
    } catch { setStatus("Could not reach sign-in. Check that the app is running and try again."); }
    finally { setBusy(false); }
  }
  return <form className="simple-form" onSubmit={submit}><label>Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" /></label><label className="auth-remember"><input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} /> Stay signed in on this device</label><button className="primary" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in →"}</button>{status && <p className="form-status" role="status">{status}</p>}</form>;
}

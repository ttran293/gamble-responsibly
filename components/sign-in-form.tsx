"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("Signing in…");
    const { error } = await authClient.signIn.email({ email, password, callbackURL: "/dashboard" });
    if (error) { setStatus(error.message ?? "We could not sign you in."); return; }
    window.location.assign("/dashboard");
  }
  return <form className="simple-form" onSubmit={submit}><label>Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" /></label><button className="primary" type="submit">Sign in →</button>{status && <p className="form-status">{status}</p>}</form>;
}

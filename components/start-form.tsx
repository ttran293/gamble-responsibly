"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";

export function StartForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus("Creating your private account…");
    const { error } = await authClient.signUp.email({ name: name || "Stillwater member", email, password, callbackURL: "/dashboard" });
    if (error) { setStatus(error.message ?? "We could not create that account."); return; }
    void authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
    window.location.assign("/dashboard");
  }
  return <form className="simple-form" onSubmit={submit}><label>First name or nickname<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" /></label><label>Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label><label>Password<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" /></label><button className="primary" type="submit">Create my private account →</button><p className="privacy-copy">You can start immediately. We&apos;ll also email a verification link to help protect your account.</p>{status && <p className="form-status">{status}</p>}</form>;
}

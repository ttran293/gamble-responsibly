"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message ?? "Could not sign out.");
      try { sessionStorage.removeItem("stillwater-demo-connections-v1"); } catch { /* Storage may be disabled. */ }
      window.location.replace("/sign-in");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
      setBusy(false);
    }
  }
  return <span className="session-control"><button type="button" className="text-link" disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Sign out"}</button>{error && <span role="alert" className="session-error">{error}</span>}</span>;
}

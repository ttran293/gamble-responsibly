"use client";

import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { clearDemoConnections } from "../lib/demo-connections";

export function SignOutButton({ redirectTo = "/sign-in" }: { redirectTo?: "/" | "/sign-in" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setBusy(true); setError("");
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message ?? "Could not sign out.");
      const sessionResponse = await fetch("/api/auth/get-session", { cache: "no-store", credentials: "same-origin" });
      if (!sessionResponse.ok || (await sessionResponse.json())?.session) throw new Error("The session is still active. Please try signing out again.");
      try { clearDemoConnections(); } catch { /* Storage may be disabled. */ }
      window.location.replace(redirectTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
      setBusy(false);
    }
  }
  return <span className="session-control"><button type="button" className="text-link" disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Sign out"}</button>{error && <span role="alert" className="session-error">{error}</span>}</span>;
}

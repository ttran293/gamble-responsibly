"use client";

import { useState } from "react";

export function InvitationForm({ testMode = false }: { testMode?: boolean }) {
  const [status, setStatus] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setStatus("Sending invitation…");
    const response = await fetch("/api/invitations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json(); setStatus(response.ok ? "Invitation sent. They can choose whether to accept it." : data.error);
  }
  return <form className="simple-form" onSubmit={submit}><div className="two-fields"><label>Your name<input required name="senderName" placeholder="Your name" /></label><label>Your email<input required readOnly aria-readonly="true" name="senderEmail" type="email" value="onboarding@resend.dev" /></label></div><label>Their email address<input required name="recipientEmail" type="email" placeholder="them@example.com" /></label><label>Optional note<textarea name="note" maxLength={500} placeholder="I thought this could be useful. No pressure." /></label><p className="privacy-copy">They choose whether to join. You will not be able to see their dashboard or personal data.</p><button className="primary" type="submit">Send private invitation →</button>{status && <p className="form-status">{status}</p>}</form>;
}

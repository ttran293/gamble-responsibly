import Link from "next/link";
import { AcceptEmergencyContact } from "../../../../components/accept-emergency-contact";
import { previewEmergencyContactRequest } from "../../../../lib/emergency-contact";

const unavailable: Record<string, string> = {
  missing: "This request link is not valid.",
  expired: "This request has expired or was replaced. They can send a new one from their dashboard.",
  used: "This request was already accepted."
};

export default async function AcceptEmergencyContactPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const validToken = /^[A-Za-z0-9_-]{20,128}$/.test(token);
  const preview = validToken ? await previewEmergencyContactRequest(token) : { requesterName: "", valid: false, reason: "missing" as const };
  return <main className="auth-shell"><section className="auth-card">
    <Link className="back-home" href="/">← Back to home</Link>
    <span className="eyebrow">Emergency contact</span>
    <h1>{preview.valid ? `${preview.requesterName} asked for your help.` : "This request is unavailable."}</h1>
    {preview.valid ? <AcceptEmergencyContact token={token} requesterName={preview.requesterName} /> : <p>{unavailable[preview.reason ?? "missing"]}</p>}
  </section></main>;
}

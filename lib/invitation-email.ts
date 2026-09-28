export const demoInvitationSenderEmail = "onboarding@resend.dev";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function isResendTestSender(from: string | undefined): boolean {
  return /@resend\.dev>?$/i.test(from?.trim() ?? "");
}

export function isResendTestingError(error: unknown): boolean {
  const message = error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message : "";
  return /testing emails|testing mode|verify a domain|resend\.dev|domain is not verified/i.test(message);
}

export function invitationEmailFailureMessage(error: unknown, kind: "confirmation" | "invitation"): string {
  if (isResendTestingError(error)) {
    return "Jelly email delivery is still in test mode. Please try again after a sending domain is verified.";
  }
  return kind === "confirmation"
    ? "Could not send the confirmation email. Please try again later."
    : "Could not send the invitation. Please try again later.";
}

export function invitationBaseUrl(): string {
  const configured = process.env.APP_URL;
  if (!configured) throw new Error("APP_URL is required for invitation email links.");
  const url = new URL(configured);
  const local = process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) throw new Error("APP_URL must use HTTPS outside local development.");
  return url.origin;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function invitationBaseUrl(): string {
  const configured = process.env.APP_URL;
  if (!configured) throw new Error("APP_URL is required for invitation email links.");
  const url = new URL(configured);
  const local = process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !local) throw new Error("APP_URL must use HTTPS outside local development.");
  return url.origin;
}

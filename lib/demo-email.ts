import { z } from "zod";

const demoDomain = "accounts.demo.test";

export function isDemoAccountEmail(email: string): boolean {
  return new RegExp(`^demo-[a-f0-9]{40}@${demoDomain.replaceAll(".", "\\.")}$`).test(email);
}

export async function accountEmailForInput(input: string): Promise<{ email: string; demo: boolean }> {
  const value = input.trim().toLowerCase();
  if (z.email().safeParse(value).success) return { email: value, demo: false };
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return { email: `demo-${hash.slice(0, 40)}@${demoDomain}`, demo: true };
}

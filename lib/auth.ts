import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "./db";
import * as schema from "../db/schema";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(new URL(appUrl).hostname);
const localOrigins = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"];
const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  // Next can choose port 3001 when 3000 is occupied. Resolve only approved
  // loopback hosts from each request so redirects and cookies use that port.
  baseURL: localDevelopment ? { allowedHosts: localOrigins.map(origin => new URL(origin).host), fallback: appUrl, protocol: "http" } : appUrl,
  trustedOrigins: localDevelopment ? [...new Set([appUrl, ...localOrigins])] : [appUrl],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  emailAndPassword: { enabled: true },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void resend.emails.send({
        from: process.env.EMAIL_FROM ?? "Jelly <onboarding@resend.dev>", to: user.email,
        subject: "Verify your Jelly email", html: `<p>Verify your email to help protect your private Jelly account.</p><p><a href="${url}">Verify my email</a></p>`
      });
    }
  },
  plugins: [
    magicLink({
      expiresIn: 10 * 60,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "Jelly <onboarding@resend.dev>",
          to: email,
          subject: "Your private Jelly sign-in link",
          html: `<p>Use this secure link to sign in to your private Jelly space:</p><p><a href="${url}">Continue to Jelly</a></p><p>This link expires in 10 minutes.</p>`
        });
      }
    }),
    nextCookies()
  ]
});

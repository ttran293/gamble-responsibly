import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { Resend } from "resend";
import { db } from "./db";
import * as schema from "../db/schema";

const deployedUrl = "https://myjelly.club";
const legacyUrl = "https://gamble-responsibly.vercel.app";
const configuredUrl = new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
const isLoopback = ["localhost", "127.0.0.1"].includes(new URL(configuredUrl).hostname);
// A local APP_URL must not become the production auth URL on Vercel.
const appUrl = process.env.NODE_ENV === "production" && isLoopback ? deployedUrl : configuredUrl;
const localDevelopment = process.env.NODE_ENV !== "production" && isLoopback;
const localHosts = ["localhost:*", "127.0.0.1:*"];
const localOrigins = localHosts.map(host => `http://${host}`);
const productionOrigins = [...new Set([appUrl, deployedUrl, legacyUrl])];
const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  // Next can choose another local port when 3000 is occupied. Resolve only
  // approved loopback hosts so redirects and cookies use the active port.
  baseURL: localDevelopment
    ? { allowedHosts: localHosts, fallback: appUrl, protocol: "http" }
    : { allowedHosts: productionOrigins.map(origin => new URL(origin).host), fallback: appUrl, protocol: "https" },
  trustedOrigins: localDevelopment ? [...new Set([appUrl, ...localOrigins])] : productionOrigins,
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

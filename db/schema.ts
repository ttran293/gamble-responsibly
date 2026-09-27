import { boolean, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { OnboardingAnswers } from "../lib/onboarding";

// Better Auth core schema. The explicit column names keep the adapter and
// Tiger Cloud migration in agreement.
export const user = pgTable("user", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(), image: text("image"),
  isAnonymous: boolean("is_anonymous").default(false), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
export const session = pgTable("session", {
  id: text("id").primaryKey(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(), ipAddress: text("ip_address"), userAgent: text("user_agent"), userId: text("user_id").notNull().references(() => user.id)
});
export const account = pgTable("account", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull(), providerId: text("provider_id").notNull(), userId: text("user_id").notNull().references(() => user.id), password: text("password"), accessToken: text("access_token"), refreshToken: text("refresh_token"), idToken: text("id_token"), accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }), refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }), scope: text("scope"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
export const verification = pgTable("verification", {
  id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }), updatedAt: timestamp("updated_at", { withTimezone: true })
});

export const supportContacts = pgTable("support_contacts", {
  id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(), recipientEmail: text("recipient_email").notNull(), supportContactId: uuid("support_contact_id").notNull().references(() => supportContacts.id), tokenHash: text("token_hash").notNull().unique(), senderConfirmTokenHash: text("sender_confirm_token_hash"), senderConfirmedAt: timestamp("sender_confirmed_at", { withTimezone: true }), senderName: text("sender_name"), note: text("note"), status: text("status").notNull(), resendMessageId: text("resend_message_id"), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), acceptedAt: timestamp("accepted_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  onboardingAnswers: jsonb("onboarding_answers").$type<OnboardingAnswers>(),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const emergencyContactLinks = pgTable("emergency_contact_links", { id: uuid("id").defaultRandom().primaryKey(), userId: text("user_id").notNull(), supportContactId: uuid("support_contact_id").notNull().references(() => supportContacts.id), consentedAt: timestamp("consented_at", { withTimezone: true }).defaultNow().notNull(), revokedAt: timestamp("revoked_at", { withTimezone: true }) });
export const emergencyContactRequests = pgTable("emergency_contact_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  contactName: text("contact_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  status: text("status").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const activityEntries = pgTable("activity_entries", { id: uuid("id").defaultRandom().primaryKey(), userId: text("user_id").notNull(), kind: text("kind").notNull(), amountCents: text("amount_cents").notNull(), occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
export const pausePlans = pgTable("pause_plans", { id: uuid("id").defaultRandom().primaryKey(), userId: text("user_id").notNull(), goal: text("goal").notNull(), trigger: text("trigger"), action: text("action").notNull(), isActive: boolean("is_active").default(true).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });

export const guardrailState = pgTable("guardrail_state", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  revisions: jsonb("revisions").notNull().default([]),
  notices: jsonb("notices").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const planActionCompletions = pgTable("plan_action_completions", {
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  actionId: text("action_id").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull()
}, table => [primaryKey({ columns: [table.userId, table.actionId] })]);

export const chatThreads = pgTable("chat_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  consentedAt: timestamp("consented_at", { withTimezone: true }).defaultNow().notNull(),
  pendingToken: uuid("pending_token"),
  pendingAt: timestamp("pending_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  threadId: uuid("thread_id").notNull().references(() => chatThreads.id, { onDelete: "cascade" }),
  role: text("role").$type<"user" | "assistant">().notNull(),
  content: text("content").notNull(),
  safetyFlag: text("safety_flag").$type<"none" | "crisis" | "betting_advice" | "safety_fallback">().default("none").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

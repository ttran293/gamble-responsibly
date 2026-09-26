# Stillwater

Stillwater is a private gambling-harm awareness prototype. It supports a private activity tracker and a separate invitation path for someone concerned about a friend or family member.

## Requirements

- Node.js 20 or newer
- npm
- A Tiger Cloud / PostgreSQL database
- A Resend API key for email features

## Start locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root. Do not commit it.

   ```env
   TIMESCALE_SERVICE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
   RESEND_API_KEY=re_your_key
   APP_URL=http://localhost:3000
   BETTER_AUTH_SECRET=replace-with-a-long-random-secret
   EMAIL_FROM=Stillwater <onboarding@resend.dev>
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Database setup

The project includes SQL migrations for the application and authentication tables:

```bash
psql "$TIMESCALE_SERVICE_URL" -f db/migrations/0000_initial.sql
psql "$TIMESCALE_SERVICE_URL" -f db/migrations/0001_better_auth.sql
```

The schema includes support contacts, invitations, user profiles, activity entries, pause plans, Better Auth users, sessions, accounts, and verification records.

## Email testing with Resend

For local testing, use:

```env
EMAIL_FROM=Stillwater <onboarding@resend.dev>
```

Resend's shared test sender is intended for test deliveries. Use `delivered@resend.dev` as the recipient when testing the invitation email flow.

To send invitations and verification messages to real email addresses, add and verify a domain in Resend, then update the sender:

```env
EMAIL_FROM=Stillwater <hello@your-domain.com>
```

## Checks

Run a type check:

```bash
node node_modules/typescript/bin/tsc --noEmit
```

Create a production build:

```bash
npm run build
```

Do not run a production build while `npm run dev` is active: both use the `.next` directory. Stop the dev server first, or restart it after building.

## Key routes

- `/` — landing page
- `/supporter` — invitation flow for someone concerned about another person
- `/start` — create a private tracker account
- `/sign-in` — sign in to an existing account
- `/dashboard` — authenticated individual dashboard

## Privacy model

Support contacts do not receive access to a recipient's dashboard, activity, finances, insights, or pause plan. The recipient owns their private tracker data and can decide whether to save or remove a support contact.

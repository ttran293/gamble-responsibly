# Stillwater

Stillwater is a gambling-harm awareness prototype for tracking betting habits and spending. It also lets someone concerned about a friend or family member invite them to use the app.

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

## Synthetic demo data

Place `draftkings_connected_bets.csv` and `draftkings_connected_transactions.csv` in `data/draftkings/`. The public `/demo` page and the signed-in dashboard read the same synthetic fixtures. They do not connect to DraftKings or display the account holder's own betting history. The fixture directory is ignored by Git. See [METRICS.md](METRICS.md) for definitions and limits.

## Database setup

The project includes SQL migrations for the application and authentication tables:

```bash
psql "$TIMESCALE_SERVICE_URL" -f db/migrations/0000_initial.sql
psql "$TIMESCALE_SERVICE_URL" -f db/migrations/0001_better_auth.sql
psql "$TIMESCALE_SERVICE_URL" -f db/migrations/0002_onboarding.sql
```

The schema includes support contacts, invitations, user profiles and onboarding answers, activity entries, pause plans, Better Auth users, sessions, accounts, and verification records. Apply the new onboarding migration to an existing database before signing in with this version.

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

Check the dataset-backed calculations after placing both CSV files:

```bash
node --test tests/metrics.test.cjs
```

Do not run a production build while `npm run dev` is active: both use the `.next` directory. Stop the dev server first, or restart it after building.

## Key routes

- `/` — landing page
- `/supporter` — invitation flow for someone concerned about another person
- `/start` — create an account to track betting habits and spending
- `/sign-in` — sign in to an existing account
- `/dashboard` — authenticated individual dashboard
- `/demo` — public preview using synthetic DraftKings fixtures
- `/onboarding` — first-run questions and later edits to goals and preferences

After sign-in, accounts without completed onboarding are sent to `/onboarding`. The dashboard displays saved goals, focus areas, and pause actions above clearly labeled synthetic metrics. Activity entry, imports, and live provider connections are not connected yet.

## Privacy model

Support contacts do not receive access to a recipient's dashboard, activity, finances, insights, or pause plan. The recipient owns their data and can decide whether to save or remove a support contact.

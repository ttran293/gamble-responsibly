# Local setup

## Requirements

- Node.js 20 or newer and npm
- PostgreSQL with the application and Better Auth tables created from `db/schema.ts`
- A Resend API key for email features

## Configuration

Create a `.env` file in the repository root:

```env
TIMESCALE_SERVICE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=REPLACE_WITH_A_RANDOM_SECRET
RESEND_API_KEY=REPLACE_WITH_YOUR_RESEND_KEY
EMAIL_FROM=Jelly <hello@your-verified-domain.example>
```

Replace the placeholders with your own configuration. `.env` is ignored by Git. Apply the SQL files in `db/migrations/` in numeric order before using authentication or onboarding. Existing databases need `0002_onboarding.sql` for saved onboarding answers and `0003_guardrails.sql` for saved plans and notices.

## Demo data

Place these synthetic CSV fixtures in `data/draftkings/`:

- `draftkings_connected_bets.csv`
- `draftkings_connected_transactions.csv`

Place the FanDuel fixtures in `data/fanduel/`:

- `fanduel_connected_bets.csv`
- `fanduel_connected_transactions.csv`
- `fanduel_connected_promotions.csv`
- `fanduel_connected_activity_statements.csv`

For the optional fictional provider, place `moonharbor_connected_bets.csv` and `moonharbor_connected_transactions.csv` in `data/moonharbor/`. Moonharbor is available in connections and metrics only.

The fixtures are not included in Git and must be obtained separately. Keep them outside `public/`. A provider can connect only when its required files pass validation.

## Run

```bash
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open [localhost:3000](http://localhost:3000).

- `/connect`: connect, reload, or disconnect simulated accounts and test a connection failure
- `/demo`: combined or individual account metrics, without sign-in
- `/start` and `/sign-in`: account creation and sign-in
- `/dashboard`: saved onboarding choices and synthetic metrics dashboard, with sign-in
- `/onboarding`: first-run questionnaire and later edits, with sign-in
- `/guardrails`: saved goals, limits, and notice history, with sign-in
- `/demo/guardrails`: browser-saved plans and a simulation clock
- `/supporter`: invitation form

See [METRICS.md](METRICS.md) for metrics and [GUARDRAILS.md](GUARDRAILS.md) for saved commitments.

## Checks

```bash
node --test tests/metrics.test.cjs tests/guardrails.test.cjs
npm run build
```

The metrics tests require the CSV fixtures. Stop the development server before building; both use `.next`.

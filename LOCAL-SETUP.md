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
EMAIL_FROM=Stillwater <hello@your-verified-domain.example>
```

Replace the placeholders with your own configuration. `.env` is ignored by Git. Apply the SQL files in `db/migrations/` in numeric order before using authentication or onboarding. Existing databases need `0002_onboarding.sql` for saved onboarding answers.

## Demo data

Place these synthetic CSV fixtures in `data/draftkings/`:

- `draftkings_connected_bets.csv`
- `draftkings_connected_transactions.csv`

The fixtures are not included in Git and must be obtained separately. The demo loader expects the supported synthetic DraftKings dataset. Keep these files outside `public/`.

## Run

```bash
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open [localhost:3000](http://localhost:3000).

- `/demo`: synthetic metrics preview, without sign-in
- `/start` and `/sign-in`: account creation and sign-in
- `/dashboard`: saved onboarding choices and synthetic metrics dashboard, with sign-in
- `/onboarding`: first-run questionnaire and later edits, with sign-in
- `/supporter`: invitation form

See [METRICS.md](METRICS.md) for metric definitions and demo limitations.

## Checks

```bash
node --test tests/metrics.test.cjs
npm run build
```

The metrics tests require the CSV fixtures. Stop the development server before building; both use `.next`.

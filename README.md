# Jelly

Jelly is a prototype for people who want to understand their gambling habits and work toward gambling less or stopping. It brings activity, spending, personal goals, and practical next steps into one private space. It also gives friends and family a way to invite someone they care about to seek support without taking control of that person's information.

## The idea

Gambling activity can be hard to see clearly when bets and transactions are spread across apps. Jelly turns that activity into a picture of deposits, withdrawals, and betting patterns. A person can choose a goal, reflect on what makes gambling harder to manage, and build a plan with limits, pause actions, and steps they can revisit.

There are two ways into the experience:

- **For yourself:** Create an account, choose a goal, explore the activity dashboard, and use a plan and guardrails to check progress.
- **For someone you care about:** Send an invitation. The recipient decides whether to join and keeps control of their goal and data. T

The dashboard includes an optional support chat and links to outside help. Emergency contacts cannot view a person's dashboard, spending, goals, or conversations.

## Run locally

You need Node.js 20+, npm, a PostgreSQL database, and a Resend API key for email flows. An OpenAI API key is needed for the optional chat.

```bash
npm install
```

Create a `.env` file in the project root:

```env
TIMESCALE_SERVICE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
RESEND_API_KEY=re_your_key
EMAIL_FROM=Jelly <onboarding@resend.dev>
APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
OPENAI_API_KEY=your_openai_api_key
```

Apply the SQL migrations in `db/migrations/` in numbered order (`0000` through `0007`), then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), or go straight to the [public demo](http://localhost:3000/demo). With Resend's test sender, emergency contacts are saved as demo entries without sending email or enabling notices. Verify a sending domain and set `EMAIL_FROM` to an address on that domain to send real requests to other recipients.

## Project status

Jelly is an evolving prototype for reflection and support, not a treatment service or a live gambling-account management tool. Its sample activity is fictional, and its insights describe patterns in that data rather than why someone gambles.

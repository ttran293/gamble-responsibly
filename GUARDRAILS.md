# Goals and guardrails

`/guardrails` stores plans for signed-in users. `/demo/guardrails` stores a separate synthetic plan in browser storage. Apply `db/migrations/0003_guardrails.sql` before using signed-in plans.

## Goals

- **Stay within limits:** choose commitments and review progress.
- **Reduce gambling:** choose a complete baseline calendar period and a percentage reduction in deposits, cash wagers, bets, or betting days. Baseline coverage is required for every covered account.
- **Stop gambling:** choose a stop date and an action for managing urges. All new bets, including bonus-only bets, count toward the stop-date rule.

The onboarding questionnaire no longer asks for gambling types. Existing answers remain compatible. Once a plan is saved, goal changes are made on the guardrails page.

## Rules

Limits can apply overall and per account: deposit amount, deposit count, cash wagered, maximum cash stake, bet count, betting days, and settled net loss. Blank means unset; zero is valid. Overall and account-specific limits both apply.

Settled net loss is the greater of zero and cash stakes minus payouts and refunds for bets settled in the period. Open bets are excluded. Later winnings may lower current net loss without removing earlier notices.

Windows are calendar days, Monday–Sunday weeks, or calendar months in the saved timezone. Quiet hours can span midnight. Quiet-hour starts are inclusive and ends are exclusive. Selected no-gambling days use the same timezone.

## Effective dates and history

Each save creates a new version. Plans begin no earlier than their first save and chosen start date. The original start date stays fixed after activation. A cap edit does not reset activity already recorded in the current window. Changes to periods, timezones, account coverage, or goals apply prospectively under the new version. Earlier notices remain available.

Signed-in plans use server time and are scoped to the authenticated user. Updates from a stale browser tab are rejected. Demo plans use an explicit simulation clock; advance it to evaluate later fixture events. Historical previews do not save notices or change the active plan.

## Notices and coverage

Users can enable approaching-limit reminders and exceedance notices. A limit must be exceeded, not merely met, to create an exceedance notice. Notices are deduplicated per version, rule, calendar window, and severity. Stop-date and quiet-period notices are deduplicated per day.

Evaluation occurs on page load, save, or demo-clock advancement. No background monitoring, sportsbook blocking, or contact email is performed. Only loaded synthetic records are available. Incomplete coverage is shown rather than treated as proof of staying within limits or abstinence. Reloading a fixture does not make its activity more recent.

## Checks

```bash
node --test tests/guardrails.test.cjs tests/metrics.test.cjs
node --env-file=.env tests/guardrails-db.cjs
```

The database check creates temporary test users and removes those users when finished. Both checks require the demo CSV files.

# Metrics

The dashboard reads synthetic DraftKings CSV fixtures from `data/draftkings/` on the server. It does not connect to a live sportsbook. Reloading reads the same files again. Missing or invalid files display an error.

`/demo` provides a public synthetic preview. `/dashboard` and `/api/metrics` require sign-in. The API accepts optional `from` and `to` dates in `YYYY-MM-DD` format.

## Dates and amounts

Date ranges include both endpoints and use UTC. The default range covers the full dataset. Amounts use integer USD cents internally; cash and bonus amounts are separate.

| Metric | Definition |
| --- | --- |
| Cash wagered | Cash stakes on bets placed in the selected period |
| Bonus wagered | Bonus stakes on bets placed in the selected period |
| Bets placed | Number of bets placed, including bonus-only bets |
| Betting days | Days with at least one bet placed |
| Days without recorded bets | Days in the selected period with no recorded bets |
| Average / largest cash stake | Cash stake amounts for bets placed in the period; bonus-only bets have a zero cash stake |
| Deposits / withdrawals | Cash added to or removed from the sportsbook during the period |
| Net deposits | Deposits minus withdrawals |
| Settled betting result | Payouts plus refunds minus original cash stakes for bets settled in the period |
| Cash betting flow | Payouts plus refunds minus cash wagers recorded during the period |
| Opening / closing cash balance | Sportsbook cash balance at the start / end of the period |
| Open cash stake | Cash committed to bets still unsettled at period end |

Settled results and cash betting flow can differ when bets settle in a later period or remain open. Net deposits are not betting losses. Reused winnings can contribute to multiple wagers.

Period comparisons use an equally long preceding period and are unavailable when there is insufficient earlier history. Days without bets describe only the connected dataset. App usage time is unavailable.

## Guardrail previews

The dashboard can compare historical activity against:

- A deposit cap for the selected period
- A maximum cash stake per bet
- A maximum number of betting days in the period

Zero is a valid limit; matching a cap exactly does not exceed it. These settings are temporary previews. They are not saved, do not block gambling, and do not send notifications.

## Current scope

The loader checks source IDs, timestamps, wager links, settlement states, and cash/bonus balances. Metrics and comparisons are descriptive calculations, not ML risk scores or psychological assessments. Positive betting results do not establish healthy gambling behavior.

Live provider connections, saved guardrail limits, alerts, accountability notifications, and app usage tracking are not implemented. Onboarding goals and preferences are saved separately from the temporary guardrail previews. Real user data must not be used in the public demo.

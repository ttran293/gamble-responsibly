# Metrics

The dashboard reads synthetic DraftKings, FanDuel, and fictional Moonharbor CSV fixtures from their respective folders under `data/` on the server. It does not connect to a live sportsbook. Reloading reads the same files again. Missing or invalid files display an error.

`/demo` provides a public synthetic preview. `/dashboard` and `/api/metrics` require sign-in. The API accepts optional `from` and `to` dates in `YYYY-MM-DD` format and a `providers` parameter (a comma-separated selection of `draftkings`, `fanduel`, and `moonharbor`). It defaults to DraftKings.

## Demo connections

Open `/connect` to connect a provider. The screen supports loading, success, simulated failure, retry, reload, and disconnect. Connection choices are stored for the current browser tab session. Only synthetic data is used; no credentials or live provider requests are involved.

Select All accounts, DraftKings, FanDuel, or Moonharbor on the dashboard. Reload replaces provider data rather than appending it. Failed reloads retain the previous snapshot in the current page and show a stale-data notice.

FanDuel ledger entry IDs distinguish split transaction entries. Promotions and monthly statements validate the source ledger; their totals are not added again to dashboard amounts. Token activity is separate from cash and bonus money.

Moonharbor is a metrics-only fictional provider. Its timestamps are normalized from their supplied offsets to UTC. Its cash-only transaction schema has no bonus wallet; the adapter uses zero bonus movement and balance and checks that wager links reconcile. Moonharbor is excluded from saved guardrail coverage and provider break tools.

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

Combined balances sum the selected account ledgers, and betting days count unique dates across accounts. Provider history ranges appear above the metrics. Outside shared coverage, totals include available records only and the last recorded balances are carried forward. Days without bets and period comparisons are unavailable when the selected accounts do not cover the required dates.

Period comparisons use an equally long preceding period and are unavailable when there is insufficient earlier history. Days without bets describe only the connected dataset. App usage time is unavailable.

## Guardrail previews

The dashboard can compare historical activity against:

- A deposit cap for the selected period
- A maximum cash stake per bet
- A maximum number of betting days in the period

Zero is a valid limit; matching a cap exactly does not exceed it. These settings are temporary previews. They are not saved, do not block gambling, and do not send notifications.

## Current scope

The loader checks source IDs, timestamps, wager links, settlement states, and cash/bonus balances. Metrics and comparisons are descriptive calculations, not ML risk scores or psychological assessments. Positive betting results do not establish healthy gambling behavior.

Saved goals, limits, and in-app notice history are available on `/guardrails`, with a separate browser-saved demo at `/demo/guardrails`. See [GUARDRAILS.md](GUARDRAILS.md). The historical previews on the metrics dashboard remain temporary. Live provider connections, background alerts, accountability notifications, and app usage tracking are not implemented. Real user data must not be used in the public demo.

## Activity insights

The dashboard shows up to three cards: saved commitment notices, unusual recorded activity, and equal-period comparisons of betting days and cash stakes. Stop plans show recorded activity and the saved personal plan instead of comparisons. Saved notices retain their own account coverage and evaluation time. Demo dismissals are stored in the browser and can be restored.

The activity rule checks completed UTC days against the preceding seven days for each selected account and the combined view. It requires at least three earlier betting days and five cash bets. Both bet count and median cash stake must at least double, with minimum increases of three bets above the earlier average per betting day and $5 above the earlier cash-stake median. Missing coverage and incomplete final days are skipped. This is a descriptive demo rule, not ML or a measure of gambling harm; it sends no contact alerts.

Moonharbor's August 12 activity demonstrates the rule. Equal-period comparisons require full earlier coverage for every selected account; the default August 1–19 range may not have enough earlier history for those comparisons.

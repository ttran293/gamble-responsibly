export type Bet = { id: string; placedAt: string; settledAt: string | null; status: string; stake: number; cashStake: number; bonusStake: number; payout: number; refund: number; wagerId: string };
export type Transaction = { id: string; at: string; type: string; cash: number; bonus: number; balance: number; bonusBalance: number; betId: string; description: string };
export type Snapshot = { bets: Bet[]; transactions: Transaction[]; loadedAt: string; from: string; through: string; provider: string; mode: "demo" };
export const day = (at: string) => at.slice(0, 10);
const DAY = 86400000;
export const shiftDay = (date: string, delta: number) => new Date(Date.parse(date + "T00:00:00Z") + delta * DAY).toISOString().slice(0, 10);
export function validDay(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }
const sum = <T,>(rows: T[], get: (row: T) => number) => rows.reduce((n, row) => n + get(row), 0);

export function summarize(snapshot: Snapshot, from: string, to: string) {
  if (!validDay(from) || !validDay(to) || from > to || from < snapshot.from || to > day(snapshot.through)) throw new Error("Choose dates within the available demo history.");
  const inside = (at: string) => day(at) >= from && day(at) <= to;
  const bets = snapshot.bets.filter(b => inside(b.placedAt));
  const txs = snapshot.transactions.filter(t => inside(t.at));
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  const daily = Array.from({ length: days }, (_, i) => {
    const date = shiftDay(from, i);
    const b = bets.filter(b => day(b.placedAt) === date);
    const t = txs.filter(t => day(t.at) === date);
    return { date, count: b.length, cashStake: sum(b, b => b.cashStake), deposits: sum(t.filter(t => t.type === "deposit"), t => t.cash) };
  });
  const deposits = sum(txs.filter(t => t.type === "deposit"), t => t.cash);
  const withdrawals = -sum(txs.filter(t => t.type === "withdrawal"), t => t.cash);
  const payouts = sum(txs.filter(t => t.type === "payout"), t => t.cash);
  const refunds = sum(txs.filter(t => t.type === "refund"), t => t.cash);
  const cashWagered = sum(bets, b => b.cashStake);
  const bonusWagered = sum(bets, b => b.bonusStake);
  const settled = snapshot.bets.filter(b => b.settledAt && inside(b.settledAt) && b.status !== "open");
  const before = snapshot.transactions.filter(t => day(t.at) < from);
  const opening = before.at(-1)?.balance ?? 0;
  const closing = txs.at(-1)?.balance ?? opening;
  const activeDays = daily.filter(d => d.count > 0).length;
  let run = 0, longestBreak = 0;
  for (const d of daily) { run = d.count ? 0 : run + 1; longestBreak = Math.max(longestBreak, run); }
  const priorTo = shiftDay(from, -1), priorFrom = shiftDay(from, -days);
  const priorAvailable = priorFrom >= snapshot.from;
  const priorBets = snapshot.bets.filter(b => day(b.placedAt) >= priorFrom && day(b.placedAt) <= priorTo);
  const comparison = priorAvailable ? { from: priorFrom, to: priorTo, bets: priorBets.length, cashStake: sum(priorBets, b => b.cashStake), activeDays: new Set(priorBets.map(b => day(b.placedAt))).size } : null;
  const open = snapshot.bets.filter(b => day(b.placedAt) <= to && (!b.settledAt || day(b.settledAt) > to));
  return {
    from, to, days, deposits, withdrawals, netDeposits: deposits - withdrawals, payouts, refunds,
    cashWagered, bonusWagered, totalWagered: cashWagered + bonusWagered,
    cashBettingFlow: sum(txs.filter(t => ["wager", "bonus_wager", "payout", "refund"].includes(t.type)), t => t.cash),
    settledResult: sum(settled, b => b.payout + b.refund - b.cashStake), settledCount: settled.length,
    opening, closing, betCount: bets.length, activeDays, daysWithoutBets: days - activeDays, longestBreak,
    averageStake: bets.length ? cashWagered / bets.length : null,
    maxStake: bets.length ? Math.max(...bets.map(b => b.cashStake)) : null,
    openCount: open.length, openCashStake: sum(open, b => b.cashStake), daily, comparison,
    recent: [...txs].reverse(), bets,
  };
}

export function previewLimits(metrics: ReturnType<typeof summarize>, depositLimit: number | null, stakeLimit: number | null, activeDayLimit: number | null) {
  return {
    depositExceeded: depositLimit === null ? null : metrics.deposits > depositLimit,
    betsOverLimit: stakeLimit === null ? null : metrics.bets.filter(b => b.cashStake > stakeLimit).length,
    activeDaysExceeded: activeDayLimit === null ? null : metrics.activeDays > activeDayLimit,
  };
}

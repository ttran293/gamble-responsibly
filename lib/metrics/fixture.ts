import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Bet, Transaction, Snapshot } from "./core";

// Kept in a server-only import graph. Never import this module into a client component.
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = [], value = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(value); value = ""; }
    else if (c === '\n' && !quoted) { row.push(value.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); row = []; value = ""; }
    else value += c;
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  if (value || row.length) { row.push(value.replace(/\r$/, "")); rows.push(row); }
  const header = rows.shift();
  if (!header || new Set(header).size !== header.length) throw new Error("Missing or duplicate CSV headers.");
  return rows.map((r, i) => { if (r.length !== header.length) throw new Error(`CSV row ${i + 2} has the wrong number of fields.`); return Object.fromEntries(header.map((h, j) => [h, r[j]])); });
}
function money(r: Record<string,string>, key: string) {
  if (!/^-?\d+$/.test(r[key] ?? "") || !Number.isSafeInteger(Number(r[key]))) throw new Error(`Invalid integer cents: ${key}`);
  return Number(r[key]);
}
function timestamp(s: string) { if (!s || !/(Z|[+-]\d\d:\d\d)$/.test(s) || !Number.isFinite(Date.parse(s))) throw new Error("Invalid timestamp."); return new Date(s).toISOString(); }
function checkRows(rows: Record<string,string>[], id: string) {
  if (!rows.length) throw new Error("The demo fixture is empty.");
  const ids = new Set<string>();
  for (const r of rows) {
    if (!r[id] || ids.has(r[id])) throw new Error("Missing or duplicate source ID.");
    ids.add(r[id]);
    if (r.data_mode !== "demo" || r.source !== "SYNTHETIC" || r.provider !== "draftkings" || r.currency !== "USD" || r.account_id !== "sim_account_001" || r.connection_id !== "sim_connection_001") throw new Error("Only the supplied synthetic USD demo account can be loaded here.");
  }
}
export async function loadFixture(): Promise<Snapshot> {
  const root = path.join(process.cwd(), "data", "draftkings");
  const [b, t] = await Promise.all(["bets", "transactions"].map(async kind => parseCsv(await readFile(path.join(root, `draftkings_connected_${kind}.csv`), "utf8"))));
  checkRows(b, "bet_id"); checkRows(t, "transaction_id");
  const bets: Bet[] = b.map(r => ({ id: r.bet_id, placedAt: timestamp(r.placed_at), settledAt: r.settled_at ? timestamp(r.settled_at) : null, status: r.status, stake: money(r,"stake_minor"), cashStake: money(r,"cash_stake_minor"), bonusStake: money(r,"bonus_stake_minor"), payout: money(r,"payout_minor"), refund: money(r,"refund_minor"), wagerId: r.wager_transaction_id }));
  const transactions: Transaction[] = t.map(r => ({ id: r.transaction_id, at: timestamp(r.timestamp), type: r.type, cash: money(r,"amount_minor"), bonus: money(r,"bonus_amount_minor"), balance: money(r,"balance_after_minor"), bonusBalance: money(r,"bonus_balance_after_minor"), betId: r.bet_id, description: r.description })).sort((a,b) => a.at.localeCompare(b.at));
  const byId = new Map(transactions.map(t => [t.id,t]));
  const used = new Set<string>();
  for (const bet of bets) {
    if (!["won","lost","push","void","open"].includes(bet.status) || Math.min(bet.stake,bet.cashStake,bet.bonusStake,bet.payout,bet.refund) < 0 || bet.stake !== bet.cashStake + bet.bonusStake) throw new Error("Invalid bet values.");
    if ((bet.status === "open") !== (bet.settledAt === null) || (bet.settledAt && bet.settledAt < bet.placedAt)) throw new Error("Invalid settlement state.");
    const wager = byId.get(bet.wagerId);
    if (!wager || used.has(wager.id) || wager.betId !== bet.id || !["wager","bonus_wager"].includes(wager.type) || wager.cash !== -bet.cashStake || wager.bonus !== -bet.bonusStake) throw new Error("Bet and wager transaction do not reconcile.");
    used.add(wager.id);
  }
  let cash = 0, bonus = 0;
  const types = ["deposit","withdrawal","wager","bonus_wager","payout","refund","bonus_award"];
  for (const tx of transactions) {
    if (!types.includes(tx.type)) throw new Error("Unknown transaction type.");
    cash += tx.cash; bonus += tx.bonus;
    if (cash !== tx.balance || bonus !== tx.bonusBalance || cash < 0 || bonus < 0) throw new Error("Cash or bonus ledger does not reconcile from the demo's zero opening balance.");
  }
  for (const key of ["payout","refund"] as const) {
    if (bets.reduce((n,b) => n+b[key],0) !== transactions.filter(t => t.type === key).reduce((n,t) => n+t.cash,0)) throw new Error("Settlement totals do not reconcile.");
  }
  return { bets, transactions, loadedAt: new Date().toISOString(), from: transactions[0].at.slice(0,10), through: transactions.at(-1)!.at, provider: "DraftKings", mode: "demo" };
}

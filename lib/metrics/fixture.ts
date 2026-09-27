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
export function money(r: Record<string,string>, key: string) {
  if (!/^-?\d+$/.test(r[key] ?? "") || !Number.isSafeInteger(Number(r[key]))) throw new Error(`Invalid integer cents: ${key}`);
  return Number(r[key]);
}
export function timestamp(s: string) { if (!s || !/(Z|[+-]\d\d:\d\d)$/.test(s) || !Number.isFinite(Date.parse(s))) throw new Error("Invalid timestamp."); return new Date(s).toISOString(); }
function checkRows(rows: Record<string,string>[], id: string, provider: Provider, version: DemoVersion) {
  if (!rows.length) throw new Error("The demo fixture is empty.");
  const ids = new Set<string>();
  const accountPrefix = version === "v2" ? "sim_v2_" : "sim_";
  for (const r of rows) {
    if (!r[id] || ids.has(r[id])) throw new Error("Missing or duplicate source ID.");
    ids.add(r[id]);
    if (r.data_mode !== "demo" || r.source !== "SYNTHETIC" || r.provider !== (provider === "moonharbor" ? "moonharbor_demo" : provider) || r.currency !== "USD" || r.account_id !== (provider === "draftkings" ? `${accountPrefix}account_001` : provider === "moonharbor" ? `${accountPrefix}mh_account_001` : `${accountPrefix}fd_account_001`) || r.connection_id !== (provider === "draftkings" ? `${accountPrefix}connection_001` : provider === "moonharbor" ? `${accountPrefix}mh_connection_001` : `${accountPrefix}fd_connection_001`)) throw new Error("Only the supplied synthetic USD demo account can be loaded here.");
  }
}
export type Provider = "draftkings" | "fanduel" | "moonharbor";
export type DemoVersion = "v1" | "v2";

// These are explicitly complete synthetic account histories, including days
// without entries. The source CSVs are private local fixtures; keep the newer
// demo activity here so every installation produces the same preview.
const demoCoverageFrom = "2026-07-15";
const demoCoverageThrough = "2026-09-27T23:59:59.999Z";
const extraActivity: Record<Provider, { date: string; stake: number; payout: number }[]> = {
  draftkings: [
    { date: "2026-09-16", stake: 1800, payout: 3420 },
    { date: "2026-09-19", stake: 2200, payout: 0 },
    { date: "2026-09-23", stake: 1400, payout: 2660 },
    { date: "2026-09-27", stake: 2000, payout: 0 }
  ],
  fanduel: [
    { date: "2026-08-23", stake: 1200, payout: 2280 },
    { date: "2026-09-02", stake: 1600, payout: 0 },
    { date: "2026-09-10", stake: 2000, payout: 3700 },
    { date: "2026-09-18", stake: 1400, payout: 0 },
    { date: "2026-09-27", stake: 1800, payout: 0 }
  ],
  moonharbor: [
    { date: "2026-08-24", stake: 1100, payout: 2090 },
    { date: "2026-09-04", stake: 1500, payout: 0 },
    { date: "2026-09-12", stake: 1300, payout: 2470 },
    { date: "2026-09-20", stake: 1700, payout: 0 },
    { date: "2026-09-27", stake: 1200, payout: 2280 }
  ]
};

function extendDemoHistory(provider: Provider, version: DemoVersion, bets: Bet[], transactions: Transaction[]) {
  const label = provider === "fanduel" ? "FanDuel" : provider === "moonharbor" ? "Moonharbor Sports (fictional)" : "DraftKings";
  let balance = transactions.at(-1)!.balance;
  const bonusBalance = transactions.at(-1)!.bonusBalance;
  const add = (id: string, at: string, type: string, cash: number, betId = "") => {
    balance += cash;
    if (balance < 0) throw new Error("Synthetic extension overdraws the demo account.");
    transactions.push({ id, provider: label, at, type, cash, bonus: 0, balance, bonusBalance, betId, description: `Simulated ${type}` });
  };
  extraActivity[provider].forEach(({ date, stake, payout }, index) => {
    const prefix = `sim_${version === "v2" ? "v2_" : ""}extra_${provider}_${index + 1}`;
    const placedAt = `${date}T15:00:00.000Z`;
    const settledAt = `${date}T17:00:00.000Z`;
    if (index === 0) add(`${prefix}_deposit`, `${date}T14:00:00.000Z`, "deposit", 8000);
    add(`${prefix}_wager`, placedAt, "wager", -stake, `${prefix}_bet`);
    if (payout) add(`${prefix}_payout`, settledAt, "payout", payout, `${prefix}_bet`);
    bets.push({ id: `${prefix}_bet`, placedAt, settledAt, sport: ["Football", "Soccer", "Baseball", "Hockey", "Basketball"][index], status: payout ? "won" : "lost", stake, cashStake: stake, bonusStake: 0, payout, refund: 0, wagerId: `${prefix}_wager` });
  });
}

export async function loadFixture(provider: Provider = "draftkings", version: DemoVersion = "v1"): Promise<Snapshot> {
  if (version !== "v1" && version !== "v2") throw new Error("Unknown demo version.");
  const root = path.join(process.cwd(), "data", `${version}_demo`, provider);
  const [b, t] = await Promise.all(["bets", "transactions"].map(async kind => parseCsv(await readFile(path.join(root, `${version}_${provider}_connected_${kind}.csv`), "utf8"))));
  checkRows(b, "bet_id", provider, version); checkRows(t, provider === "fanduel" ? "entry_id" : "transaction_id", provider, version);
  if (b.some(row => !row.sport?.trim())) throw new Error("Demo bet is missing its sport.");
  const bets: Bet[] = b.map(r => ({ id: r.bet_id, placedAt: timestamp(r.placed_at), settledAt: r.settled_at ? timestamp(r.settled_at) : null, sport: r.sport.trim(), status: r.status, stake: money(r,"stake_minor"), cashStake: money(r,"cash_stake_minor"), bonusStake: money(r,"bonus_stake_minor"), payout: money(r,"payout_minor"), refund: money(r,"refund_minor"), wagerId: provider === "fanduel" ? r.wager_entry_id : r.wager_transaction_id }));
  const transactions: Transaction[] = t.map(r => ({ id: provider === "fanduel" ? r.entry_id : r.transaction_id, provider: provider === "fanduel" ? "FanDuel" : provider === "moonharbor" ? "Moonharbor Sports (fictional)" : "DraftKings", at: timestamp(r.timestamp), type: r.type, cash: money(r,"amount_minor"), bonus: provider === "moonharbor" ? 0 : money(r,"bonus_amount_minor"), balance: money(r,"balance_after_minor"), bonusBalance: provider === "moonharbor" ? 0 : money(r,"bonus_balance_after_minor"), betId: r.bet_id, description: r.description })).sort((a,b) => a.at.localeCompare(b.at));
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
  const types = ["deposit","withdrawal","wager","bonus_wager","payout","refund","bonus_award","token_award","token_used","token_expired"];
  for (const tx of transactions) {
    if (!types.includes(tx.type)) throw new Error("Unknown transaction type.");
    cash += tx.cash; bonus += tx.bonus;
    if (cash !== tx.balance || bonus !== tx.bonusBalance || cash < 0 || bonus < 0) throw new Error("Cash or bonus ledger does not reconcile from the demo's zero opening balance.");
  }
  for (const key of ["payout","refund"] as const) {
    if (bets.reduce((n,b) => n+b[key],0) !== transactions.filter(t => t.type === key).reduce((n,t) => n+t.cash,0)) throw new Error("Settlement totals do not reconcile.");
  }
  let supplemental: Snapshot["supplemental"];
  if (provider === "fanduel") {
    const promotions = parseCsv(await readFile(path.join(root, `${version}_fanduel_connected_promotions.csv`), "utf8"));
    const statements = parseCsv(await readFile(path.join(root, `${version}_fanduel_connected_activity_statements.csv`), "utf8"));
    checkRows(promotions, "promotion_id", provider, version); checkRows(statements, "statement_id", provider, version);
    validateFanDuel(b, t, promotions, statements);
    supplemental = { promotions: promotions.length, statements: statements.length };
  }
  extendDemoHistory(provider, version, bets, transactions);
  return { supplemental, bets, transactions, loadedAt: new Date().toISOString(), from: demoCoverageFrom, through: demoCoverageThrough, provider: provider === "fanduel" ? "FanDuel" : provider === "moonharbor" ? "Moonharbor Sports (fictional)" : "DraftKings", mode: "demo" };
}

export function validateFanDuel(bets: Record<string,string>[], rows: Record<string,string>[], promotions: Record<string,string>[], statements: Record<string,string>[]) {
  const total = (rs: Record<string,string>[], key: string) => rs.reduce((n,r)=>n+money(r,key),0);
  const equal = (a: number,b: number,label: string) => { if(a!==b) throw new Error(`FanDuel ${label} does not reconcile.`); };
  const entries = new Map(rows.map(r=>[r.entry_id,r]));
  const groups = new Map<string,Record<string,string>[]>();
  let tokens = 0;
  for (const r of rows) {
    tokens += money(r,"token_quantity_change"); equal(tokens,money(r,"token_count_after"),"token balance");
    if(tokens<0) throw new Error("Negative token balance.");
    equal(money(r,"cash_balance_after_minor"),money(r,"balance_after_minor"),"cash balance");
    equal(money(r,"playable_balance_after_minor")+money(r,"non_playable_balance_after_minor"),money(r,"cash_balance_after_minor")+money(r,"bonus_balance_after_minor"),"wallet balance");
    groups.set(r.transaction_id,[...(groups.get(r.transaction_id)??[]),r]);
  }
  for(const rs of groups.values()) {
    const parts=rs.map(r=>money(r,"entry_part")).sort((a,b)=>a-b);
    if(rs.some(r=>money(r,"entry_parts")!==rs.length) || parts.some((n,i)=>n!==i+1)) throw new Error("Incomplete FanDuel transaction parts.");
  }
  for (const b of bets) {
    const w=entries.get(b.wager_entry_id);
    if(w?.transaction_id!==b.wager_transaction_id) throw new Error("FanDuel wager reference mismatch.");
  }
  for (const p of promotions) {
    timestamp(p.awarded_at); if(p.expires_at) timestamp(p.expires_at);
    const related=rows.filter(r=>r.promotion_id===p.promotion_id);
    for(const key of ["award_entry_id","used_entry_id","expiry_entry_id"]) {
      if(p[key] && entries.get(p[key])?.promotion_id!==p.promotion_id) throw new Error("Invalid promotion entry link.");
    }
    const type=(name:string)=>related.filter(r=>r.type===name);
    equal(total(type("bonus_award"),"bonus_amount_minor"),money(p,"amount_awarded_minor"),"promotion award");
    equal(-total(type("bonus_wager"),"bonus_amount_minor"),money(p,"amount_played_minor"),"promotion usage");
    equal(total(type("token_award"),"token_quantity_change"),money(p,"quantity_awarded"),"tokens awarded");
    equal(-total(type("token_used"),"token_quantity_change"),money(p,"quantity_used"),"tokens used");
    equal(-total(type("token_expired"),"token_quantity_change"),money(p,"quantity_expired"),"tokens expired");
    equal(money(p,"amount_expired_minor"),0,"bonus expiry");
  }
  for(const s of statements) {
    const start=timestamp(s.period_start), end=timestamp(s.period_end_exclusive);
    const period=rows.filter(r=>r.timestamp>=start&&r.timestamp<end);
    const placed=bets.filter(b=>b.placed_at>=start&&b.placed_at<end);
    const type=(name:string)=>period.filter(r=>r.type===name);
    const before=rows.filter(r=>r.timestamp<start).at(-1);
    const last=rows.filter(r=>r.timestamp<end).at(-1);
    equal(before?money(before,"cash_balance_after_minor"):0,money(s,"beginning_cash_balance_minor"),"statement opening");
    equal(last?money(last,"cash_balance_after_minor"):0,money(s,"ending_cash_balance_minor"),"statement closing");
    for(const [kind,key,sign] of [["deposit","deposited_minor",1],["wager","played_minor",-1],["payout","won_minor",1],["withdrawal","withdrawn_minor",-1],["refund","refunded_minor",1]] as const) equal(total(type(kind),"amount_minor")*sign,money(s,key),key);
    equal(placed.length,money(s,"bets_placed"),"statement bet count");
    equal(placed.filter(b=>b.status==="won").length,money(s,"bets_won"),"statement won count");
    equal(total(type("bonus_award"),"bonus_amount_minor"),money(s,"promotions_awarded_minor"),"statement bonus awards");
    equal(-total(type("bonus_wager"),"bonus_amount_minor"),money(s,"promotions_played_minor"),"statement bonus stakes");
    for(const [kind,key,sign] of [["token_award","tokens_awarded",1],["token_used","tokens_used",-1],["token_expired","tokens_expired",-1]] as const) equal(total(type(kind),"token_quantity_change")*sign,money(s,key),key);
    for(const key of ["purchased_minor","rebated_minor","promotions_expired_minor"]) equal(money(s,key),0,key);
  }
}

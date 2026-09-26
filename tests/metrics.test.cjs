const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { summarize, previewLimits, validDay } = require('../lib/metrics/core.ts');
const { loadFixture, parseCsv } = require('../lib/metrics/fixture.ts');

test('exact supplied fixture reconciles and separates open cash exposure from settled results', async () => {
 const s = await loadFixture(); const m = summarize(s,s.from,s.through.slice(0,10));
 assert.equal(s.bets.length,88); assert.equal(s.transactions.length,140);
 assert.equal(m.cashWagered,153200); assert.equal(m.bonusWagered,4000);
 assert.equal(m.deposits,25000); assert.equal(m.withdrawals,8000);
 assert.equal(m.payouts,197395); assert.equal(m.refunds,2400);
 assert.equal(m.cashBettingFlow,46595); assert.equal(m.settledResult,50795);
 assert.equal(m.openCashStake,4200); assert.equal(m.openCount,2);
 assert.equal(m.closing,63595); assert.equal(m.activeDays,44);
 assert.equal(m.opening+m.netDeposits+m.cashBettingFlow,m.closing);
 assert.equal(m.comparison,null);
 const repeated=await loadFixture(); assert.equal(repeated.transactions.length,140);
});
test('date filters reconcile each day; earlier windows are not silently treated as zero', async () => {
 const s=await loadFixture();
 for (const date of [...new Set(s.transactions.map(t=>t.at.slice(0,10)))]) {
  const m=summarize(s,date,date); assert.equal(m.opening+m.netDeposits+m.cashBettingFlow,m.closing);
 }
 const recent=summarize(s,'2026-08-31','2026-09-13');
 assert.equal(recent.days,14); assert.equal(recent.comparison.from,'2026-08-17');assert.equal(recent.comparison.to,'2026-08-30');
 assert.throws(()=>summarize(s,'2026-09-13','2026-08-01'));
 assert.throws(()=>summarize(s,'2026-07-01','2026-08-01'));
 assert.equal(validDay('2026-02-30'),false);
});
test('guardrail equality is within the cap; zero means a stopping goal, blank means unset',async()=>{
 const s=await loadFixture();const m=summarize(s,s.from,s.through.slice(0,10));
 assert.deepEqual(previewLimits(m,25000,7500,44),{depositExceeded:false,betsOverLimit:0,activeDaysExceeded:false});
 assert.deepEqual(previewLimits(m,null,null,null),{depositExceeded:null,betsOverLimit:null,activeDaysExceeded:null});
 const zero=previewLimits(m,0,0,0); assert.equal(zero.depositExceeded,true);assert.equal(zero.betsOverLimit,85);assert.equal(zero.activeDaysExceeded,true);
});
test('CSV parser handles commas, quotes, CRLF, and rejects malformed records',()=>{
 assert.deepEqual(parseCsv('id,note\r\n1,"a,b ""quoted"""\r\n'),[{id:'1',note:'a,b "quoted"'}]);
 assert.throws(()=>parseCsv('id,note\n1,"unterminated'));
 assert.throws(()=>parseCsv('id,note\n1,2,3'));
 assert.throws(()=>parseCsv('id,id\n1,2'));
});
test('a bet settling in a later period contributes result then, while its stake remains in the placement period',()=>{
 const s={mode:'demo',provider:'DraftKings',loadedAt:'2026-08-03T00:00:00Z',from:'2026-08-01',through:'2026-08-03T23:59:00Z',bets:[{id:'b',placedAt:'2026-08-01T12:00:00Z',settledAt:'2026-08-02T12:00:00Z',status:'won',stake:1000,cashStake:1000,bonusStake:0,payout:1800,refund:0,wagerId:'w'}],transactions:[{id:'d',at:'2026-08-01T10:00:00Z',type:'deposit',cash:1000,balance:1000},{id:'w',at:'2026-08-01T12:00:00Z',type:'wager',cash:-1000,balance:0},{id:'p',at:'2026-08-02T12:00:00Z',type:'payout',cash:1800,balance:1800}]};
 const placement=summarize(s,'2026-08-01','2026-08-01'); assert.equal(placement.settledResult,0);assert.equal(placement.openCount,1);assert.equal(placement.cashBettingFlow,-1000);
 const settlement=summarize(s,'2026-08-02','2026-08-02');assert.equal(settlement.betCount,0);assert.equal(settlement.averageStake,null);assert.equal(settlement.settledResult,800);assert.equal(settlement.cashBettingFlow,1800);assert.equal(settlement.openCount,0);
 const empty=summarize(s,'2026-08-03','2026-08-03');assert.equal(empty.closing,1800);assert.equal(empty.daysWithoutBets,1);assert.equal(empty.longestBreak,1);
});

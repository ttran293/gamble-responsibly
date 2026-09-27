const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { summarize, previewLimits, validDay } = require('../lib/metrics/core.ts');
const { loadFixture, parseCsv } = require('../lib/metrics/fixture.ts');

test('exact supplied fixture reconciles and separates open cash exposure from settled results', async () => {
 const s = await loadFixture(); const m = summarize(s,s.from,s.through.slice(0,10));
 assert.equal(s.bets.length,92); assert.equal(s.transactions.length,147);
 assert.equal(s.through,'2026-09-27T23:59:59.999Z'); assert.equal(m.completeCoverage,true);
 assert.equal(m.cashWagered,160600); assert.equal(m.bonusWagered,4000);
 assert.equal(m.deposits,33000); assert.equal(m.withdrawals,8000);
 assert.equal(m.payouts,203475); assert.equal(m.refunds,2400);
 assert.equal(m.cashBettingFlow,45275); assert.equal(m.settledResult,49475);
 assert.equal(m.openCashStake,4200); assert.equal(m.openCount,2);
 assert.equal(m.closing,70275); assert.equal(m.activeDays,48);
 assert.equal(m.opening+m.netDeposits+m.cashBettingFlow,m.closing);
 assert.equal(m.comparison,null);
 const repeated=await loadFixture(); assert.equal(repeated.transactions.length,147);
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
 assert.deepEqual(previewLimits(m,33000,7500,48),{depositExceeded:false,betsOverLimit:0,activeDaysExceeded:false});
 assert.deepEqual(previewLimits(m,null,null,null),{depositExceeded:null,betsOverLimit:null,activeDaysExceeded:null});
 const zero=previewLimits(m,0,0,0); assert.equal(zero.depositExceeded,true);assert.equal(zero.betsOverLimit,89);assert.equal(zero.activeDaysExceeded,true);
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
 const empty=summarize(s,'2026-08-03','2026-08-03');assert.equal(empty.closing,1800);assert.equal(empty.daysWithoutBets,1);assert.equal(empty.longestBreak,1);assert.equal(empty.completeCoverage,false);
});

test('FanDuel split entries, statements and promotions reconcile without duplicated money', async()=>{
 const s=await loadFixture('fanduel'); const m=summarize(s,s.from,s.through.slice(0,10));
 assert.equal(s.bets.length,77);assert.equal(s.transactions.length,142);assert.equal(new Set(s.transactions.map(t=>t.id)).size,142);
 assert.deepEqual(s.supplemental,{promotions:13,statements:2});
 assert.equal(m.deposits,49000);assert.equal(m.withdrawals,13000);assert.equal(m.cashWagered,130400);assert.equal(m.bonusWagered,9500);
 assert.equal(m.closing,15467);assert.equal(m.cashBettingFlow,-20533);assert.equal(m.settledResult,-15633);assert.equal(m.openCashStake,4900);
 assert.equal(m.opening+m.netDeposits+m.cashBettingFlow,m.closing);
});
test('all accounts aggregates balances, unique betting days and namespaced IDs',async()=>{
 const {combineSnapshots}=require('../lib/metrics/core.ts');
 const dk=await loadFixture(),fd=await loadFixture('fanduel');const all=combineSnapshots([dk,fd]);
 const m=summarize(all,all.from,all.through.slice(0,10));
 assert.equal(m.betCount,169);assert.equal(all.transactions.length,289);assert.equal(m.deposits,82000);assert.equal(m.closing,85742);assert.equal(m.settledResult,33842);
 assert.equal(m.activeDays,new Set(all.bets.map(b=>b.placedAt.slice(0,10))).size);
 assert.equal(m.completeCoverage,true);assert.equal(m.comparison,null);
 assert.equal(new Set(all.transactions.map(t=>t.id)).size,289);
 assert.equal(fd.transactions.at(-1).balance,15467); // Combining never mutates source balances.
 assert.throws(()=>combineSnapshots([dk,dk]));assert.throws(()=>combineSnapshots([]));
 for(const date of [...new Set(all.transactions.map(t=>t.at.slice(0,10)))]) {
  const a=summarize(all,date,date);assert.equal(a.opening+a.netDeposits+a.cashBettingFlow,a.closing);
 }
 const shared=summarize(all,'2026-08-10','2026-08-19');assert.equal(shared.completeCoverage,true);
 const single=combineSnapshots([fd]);assert.equal(summarize(single,single.from,single.through.slice(0,10)).closing,15467);
});
test('FanDuel rejects altered statement totals and missing transaction parts',()=>{
 const {validateFanDuel}=require('../lib/metrics/fixture.ts');
 const read=kind=>parseCsv(fs.readFileSync(`data/fanduel/fanduel_connected_${kind}.csv`,'utf8'));
 const b=read('bets'),t=read('transactions'),p=read('promotions'),s=read('activity_statements');
 assert.doesNotThrow(()=>validateFanDuel(b,t,p,s));
 const changed=s.map(r=>({...r}));changed[0].deposited_minor='1';assert.throws(()=>validateFanDuel(b,t,p,changed));
 const split=t.find(r=>r.entry_parts==='2');assert.ok(split);
 assert.throws(()=>validateFanDuel(b,t.filter(r=>r.entry_id!==split.entry_id),p,s));
});

test('fictional Moonharbor normalizes offset dates and reconciles standalone and combined totals',async()=>{
 const {combineSnapshots}=require('../lib/metrics/core.ts');
 const mh=await loadFixture('moonharbor'),m=summarize(mh,mh.from,mh.through.slice(0,10));
 assert.equal(mh.bets.length,27);assert.equal(mh.transactions.length,41);
 assert.equal(mh.bets[0].placedAt,'2026-08-01T22:12:00.000Z');
 assert.equal(mh.through,'2026-09-27T23:59:59.999Z');
 assert.equal(m.deposits,65000);assert.equal(m.withdrawals,3000);assert.equal(m.cashWagered,67100);assert.equal(m.payouts,22876);assert.equal(m.settledResult,-44224);assert.equal(m.closing,17776);assert.equal(m.bonusWagered,0);
 const all=combineSnapshots(await Promise.all(['draftkings','fanduel','moonharbor'].map(p=>loadFixture(p))));
 const combined=summarize(all,all.from,all.through.slice(0,10));
 assert.equal(combined.betCount,196);assert.equal(all.transactions.length,330);assert.equal(combined.closing,103518);assert.equal(combined.completeCoverage,true);assert.equal(combined.daysWithoutBets,8);
 assert.equal(combined.opening+combined.netDeposits+combined.cashBettingFlow,combined.closing);
 assert.equal(new Set(all.transactions.map(t=>t.id)).size,330);
 assert.equal((await loadFixture('moonharbor')).transactions.length,41);
});

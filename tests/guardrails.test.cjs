const assert=require('node:assert/strict');const {test}=require('node:test');const ts=require('typescript'),fs=require('node:fs');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {defaultPlan,planSchema}=require('../lib/guardrails/model.ts');
const {evaluate,localParts,windowDates,mergeNotices,reductionTarget}=require('../lib/guardrails/evaluate.ts');
const {loadFixture}=require('../lib/metrics/fixture.ts');
const at='2026-08-10T00:00:00.000Z';
function plan(){return {...defaultPlan('stay','2026-08-10'),timezone:'UTC',providers:['draftkings'],period:'daily'};}
function bet(id,time,cash=1000,bonus=0){return {id,placedAt:time,settledAt:null,status:'open',stake:cash+bonus,cashStake:cash,bonusStake:bonus,payout:0,refund:0,wagerId:id};}
function snapshot(bets=[],tx=[]){return {provider:'DraftKings',mode:'demo',from:'2026-08-01',through:'2026-08-20T23:59:00Z',loadedAt:at,bets,transactions:tx};}
function rev(p,id='r1',effectiveAt=at){return {id,savedAt:effectiveAt,effectiveAt,plan:p};}
test('validates three goals, timezone, rule scopes, and overnight hours',()=>{
 assert.equal(planSchema.safeParse(plan()).success,true);
 assert.equal(planSchema.safeParse({...plan(),timezone:'not/a-zone'}).success,false);
 assert.equal(planSchema.safeParse({...plan(),goal:'stop'}).success,false);
 assert.equal(planSchema.safeParse({...plan(),quietStart:'23:00',quietEnd:'02:00'}).success,true);
 assert.equal(planSchema.safeParse({...plan(),quietStart:'23:00',quietEnd:null}).success,false);
});
test('calendar boundaries respect timezone and DST',()=>{
 assert.equal(localParts('2026-03-08T06:30:00Z','America/New_York').time,'01:30');
 assert.equal(localParts('2026-03-08T07:30:00Z','America/New_York').time,'03:30');
 assert.equal(localParts('2026-11-01T05:30:00Z','America/New_York').time,'01:30');
 assert.equal(localParts('2026-11-01T06:30:00Z','America/New_York').time,'01:30');
 assert.deepEqual(windowDates('2026-08-16','weekly'),{from:'2026-08-10',to:'2026-08-16'});
 assert.deepEqual(windowDates('2028-02-20','monthly'),{from:'2028-02-01',to:'2028-02-29'});
});
test('no retrospective notices; equality is not a breach; zero is valid',()=>{
 const p=plan();p.rules[0].caps.betCount=1;
 const s=snapshot([bet('old','2026-08-09T23:00:00Z'),bet('1','2026-08-10T01:00:00Z'),bet('2','2026-08-10T02:00:00Z')]);
 assert.equal(evaluate([rev(p)],[s],'2026-08-10T01:30:00Z').notices.filter(n=>n.kind==='exceeded').length,0);
 assert.equal(evaluate([rev(p)],[s],'2026-08-10T03:00:00Z').notices.filter(n=>n.kind==='exceeded').length,1);
 p.rules[0].caps.betCount=0;assert.equal(evaluate([rev(p)],[s],'2026-08-10T03:00:00Z').notices.length,1);
});
test('edits preserve old breaches and do not reset window usage',()=>{
 const p=plan();p.rules[0].caps.cashWagered=1500;
 const newer=structuredClone(p);newer.rules[0].caps.cashWagered=2500;
 const s=snapshot([bet('1','2026-08-10T01:00:00Z'),bet('2','2026-08-10T02:00:00Z'),bet('3','2026-08-10T04:00:00Z')]);
 const rs=[rev(p),rev(newer,'r2','2026-08-10T03:00:00Z')];const e=evaluate(rs,[s],'2026-08-10T05:00:00Z');
 assert.deepEqual(e.notices.filter(n=>n.kind==='exceeded').map(n=>n.revisionId),['r1','r2']);assert.equal(e.progress[0].actual,3000);
 assert.equal(mergeNotices(e.notices,e.notices).length,e.notices.length);
});
test('overall limits combine providers while account limits remain separate',()=>{
 const p=plan();p.providers=['draftkings','fanduel'];p.rules[0].caps.betCount=1;p.rules.push({scope:'fanduel',caps:{...p.rules[0].caps,betCount:0}});
 const dk=snapshot([bet('1','2026-08-10T01:00:00Z')]),fd={...snapshot([bet('1','2026-08-10T02:00:00Z')]),provider:'FanDuel'};
 const e=evaluate([rev(p)],[dk,fd],'2026-08-10T03:00:00Z');assert.deepEqual(e.notices.filter(n=>n.kind==='exceeded').map(n=>n.scope).sort(),['all','fanduel']);
});
test('stop and overnight restrictions include bonus-only bets and respect end-exclusive hours',()=>{
 const p={...plan(),goal:'stop',stopDate:'2026-08-10',quietStart:'23:00',quietEnd:'02:00',blockedDays:[1]};
 const s=snapshot([bet('1','2026-08-10T01:00:00Z',0,500),bet('2','2026-08-10T02:00:00Z')]);
 const e=evaluate([rev(p)],[s],'2026-08-10T03:00:00Z');assert.equal(e.stopBets,2);assert.equal(e.notices.filter(n=>n.metric==='quietHours').length,1);assert.equal(e.notices.filter(n=>n.metric==='blockedDay').length,1);
 const off={...p,approaching:false,exceeded:false};assert.equal(evaluate([rev(off)],[s],'2026-08-10T03:00:00Z').notices.length,0);
});
test('net settled losses exclude open bets and earlier loss notices survive a later win',()=>{
 const p=plan();p.rules[0].caps.loss=500;
 const lost={...bet('1','2026-08-10T01:00:00Z'),settledAt:'2026-08-10T02:00:00Z',status:'lost'};
 const won={...bet('2','2026-08-10T03:00:00Z'),settledAt:'2026-08-10T04:00:00Z',status:'won',payout:3000};
 const e=evaluate([rev(p)],[snapshot([lost,won,bet('open','2026-08-10T05:00:00Z',99999)])],'2026-08-10T06:00:00Z');
 assert.equal(e.progress[0].actual,0);assert.equal(e.notices.filter(n=>n.kind==='exceeded').length,1);
});
test('reduction uses a full baseline and saved real-time plans ignore old fixtures',async()=>{
 const ss=await Promise.all(['draftkings','fanduel'].map(p=>loadFixture(p)));
 const p={...plan(),goal:'reduce',period:'weekly',providers:['draftkings','fanduel'],reduction:{metric:'betCount',baselineFrom:'2026-08-03',baselineTo:'2026-08-09',percent:25}};
 const target=reductionTarget(p,ss);assert.ok(target.baseline>0);assert.equal(target.limit,Math.floor(target.baseline*.75));
 assert.throws(()=>reductionTarget({...p,reduction:{...p.reduction,baselineFrom:'2026-08-04'}},ss));
 const now='2026-09-26T12:00:00Z';const e=evaluate([rev(p,'now',now)],ss,now);assert.equal(e.notices.length,0);assert.equal(e.progress[0].complete,false);
});

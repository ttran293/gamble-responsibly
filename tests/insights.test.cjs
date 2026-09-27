const assert=require('node:assert/strict');
const {test}=require('node:test');
const ts=require('typescript'),fs=require('node:fs');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
const {activityInsights}=require('../lib/metrics/insights.ts');
const {combineSnapshots}=require('../lib/metrics/core.ts');
const {loadFixture}=require('../lib/metrics/fixture.ts');
function fixture(){
 const bets=[];
 for(let d=1;d<=7;d++) bets.push({id:`b${d}`,placedAt:`2026-08-0${d}T12:00:00Z`,cashStake:500});
 for(let i=0;i<5;i++) bets.push({id:`spike${i}`,placedAt:'2026-08-08T12:00:00Z',cashStake:1500});
 return {provider:'Test',from:'2026-08-01',through:'2026-08-10T12:00:00Z',loadedAt:'2026-09-01T00:00:00Z',mode:'demo',transactions:[],bets:bets.map(b=>({...b,stake:b.cashStake,bonusStake:0,status:'open',settledAt:null,payout:0,refund:0,wagerId:b.id}))};
}
test('joint frequency and stake increase is explained using only earlier history',()=>{
 const s=fixture(), result=activityInsights(s,'2026-08-08','2026-08-08');
 assert.equal(result.anomalies.length,1);assert.match(result.anomalies[0].text,/5 bets/);assert.match(result.anomalies[0].text,/\$15.00/);
 s.bets.push({...s.bets[0],id:'future',placedAt:'2026-08-09T12:00:00Z',cashStake:100000});
 assert.deepEqual(activityInsights(s,'2026-08-08','2026-08-08'),result);
});
test('ordinary variation and a change in only one measure do not flag',()=>{
 const s=fixture();s.bets=s.bets.map(b=>({...b,cashStake:500}));assert.equal(activityInsights(s,'2026-08-08','2026-08-08').anomalies.length,0);
 const t=fixture();t.bets=t.bets.filter(b=>!b.id.startsWith('spike')||b.id==='spike0');assert.equal(activityInsights(t,'2026-08-08','2026-08-08').anomalies.length,0);
});
test('insufficient baseline, incomplete final day and account coverage gaps suppress flags',()=>{
 const s=fixture();s.through='2026-08-08T12:00:00Z';assert.equal(activityInsights(s,'2026-08-08','2026-08-08').eligibleDays,0);
 const t=fixture();t.bets=t.bets.filter(b=>!['b1','b2','b3'].includes(b.id));assert.equal(activityInsights(t,'2026-08-08','2026-08-08').eligibleDays,0);
 const u=fixture();u.coverage=[{provider:'A',from:u.from,through:u.through},{provider:'New account',from:'2026-08-08',through:u.through}];
 const r=activityInsights(u,'2026-08-08','2026-08-08');assert.equal(r.eligibleDays,0);assert.equal(r.comparisons.length,0);
});
test('zero-activity covered days compare correctly without inventing missing history',()=>{
 const s=fixture();const r=activityInsights(s,'2026-08-09','2026-08-09');assert.equal(r.comparisons.length,2);assert.match(r.comparisons[0].text,/on 0 days, compared with 1/);
 assert.equal(activityInsights(s,'2026-08-01','2026-08-09').comparisons.length,0);
});
test('Moonharbor demonstrates a joint change independently and across accounts',async()=>{
 const moon=await loadFixture('moonharbor');
 const solo=activityInsights(moon,'2026-08-01','2026-08-19');assert.ok(solo.anomalies.some(c=>c.from==='2026-08-12'));
 const combined=combineSnapshots(await Promise.all(['draftkings','fanduel','moonharbor'].map(p=>loadFixture(p))));
 const all=activityInsights(combined,'2026-08-01','2026-08-19');assert.ok(all.anomalies.some(c=>c.from==='2026-08-12'));
});

test('sport insight names the leading sport from the selected bets and offers a CBT-style reflection',async()=>{
 const combined=combineSnapshots(await Promise.all(['draftkings','fanduel','moonharbor'].map(provider=>loadFixture(provider))));
 const result=activityInsights(combined,'2026-07-15','2026-09-27');
 const insight=result.sportInsights[0];
 assert.deepEqual(insight.signal,{kind:'sport_frequency',sports:['Basketball'],count:56,totalBets:196});
 assert.match(insight.text,/Basketball accounted for 56 of 196 bets/);
 assert.match(insight.text,/thought or feeling/);
 assert.match(insight.text,/without betting/);
 const narrow=activityInsights(combined,'2026-08-12','2026-08-12').sportInsights[0];
 assert.equal(narrow.signal.totalBets,combined.bets.filter(b=>b.placedAt.slice(0,10)==='2026-08-12').length);
});

require.extensions['.tsx']=require.extensions['.ts'];
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {ActivityInsights}=require('../components/activity-insights.tsx');
const {defaultPlan}=require('../lib/guardrails/model.ts');
test('cards are capped at three and show account-specific coverage',()=>{
 const s=fixture();const html=renderToStaticMarkup(React.createElement(ActivityInsights,{snapshot:s,from:'2026-08-08',to:'2026-08-08',demo:true,review:()=>{}}));
 assert.equal((html.match(/<article/g)||[]).length,3);assert.match(html,/A change in your recorded activity/);assert.match(html,/Test · Aug 8, 26 UTC/);
});
test('sport insight appears as a separate Jelly card',async()=>{
 const combined=combineSnapshots(await Promise.all(['draftkings','fanduel','moonharbor'].map(provider=>loadFixture(provider))));
 const html=renderToStaticMarkup(React.createElement(ActivityInsights,{snapshot:combined,from:'2026-07-15',to:'2026-09-27',demo:true,review:()=>{}}));
 assert.match(html,/The sport behind most bets/);
 assert.match(html,/Basketball accounted for 56 of 196 bets/);
});
test('stop goal replaces financial comparisons with saved plan progress',()=>{
 const s=fixture(),plan=defaultPlan('stop','2026-08-01');
 plan.pausePlan='Call a friend';
 const saved={state:{revisions:[{id:'plan1',effectiveAt:'2026-08-01T00:00:00Z',savedAt:'2026-08-01T00:00:00Z',plan}],notices:[]},asOf:'2026-08-09T00:00:00Z',result:{stopBets:2}};
 const html=renderToStaticMarkup(React.createElement(ActivityInsights,{snapshot:s,from:'2026-08-08',to:'2026-08-08',demo:true,saved,review:()=>{}}));
 assert.match(html,/2 bets recorded/);assert.match(html,/Call a friend/);assert.doesNotMatch(html,/Cash wagered|A change in your recorded activity/);
});
test('saved notices retain their own scope and date outside dashboard filters',()=>{
 const s=fixture(),plan=defaultPlan('stay','2026-08-01');
 const saved={state:{revisions:[{id:'plan1',effectiveAt:'2026-08-01T00:00:00Z',savedAt:'2026-08-01T00:00:00Z',plan}],notices:[{id:'n1',revisionId:'plan1',kind:'exceeded',at:'2026-08-07T12:00:00Z',scope:'draftkings',metric:'deposits',actual:12000,limit:10000,window:'2026-08-03'}]},asOf:'2026-08-09T00:00:00Z',result:null};
 const html=renderToStaticMarkup(React.createElement(ActivityInsights,{snapshot:s,from:'2026-08-08',to:'2026-08-08',demo:true,saved,review:()=>{}}));
 assert.equal((html.match(/<article/g)||[]).length,3);assert.match(html,/Saved commitment notice/);assert.match(html,/independent of dashboard dates/);assert.match(html,/\$120.00 recorded/);
});

// Explicit integration check against the configured database; removes only its own test users.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const {randomUUID}=require('node:crypto');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{esModuleInterop:true,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {pool}=require('../lib/db.ts');const {guardrailState}=require('../lib/guardrails/store.ts');const {defaultPlan}=require('../lib/guardrails/model.ts');
(async()=>{
 const ids=[`guardrail-test-${randomUUID()}`,`guardrail-test-${randomUUID()}`];
 try {
  for(const id of ids)await pool.query('INSERT INTO "user" (id,name,email,email_verified,created_at,updated_at) VALUES($1,$2,$3,false,now(),now())',[id,'Guardrail integration test',`${id}@example.invalid`]);
  const p=defaultPlan();p.rules[0].caps.deposits=5000;
  const first=await guardrailState(ids[0],{plan:p,expectedRevisionId:null});assert.equal(first.revisions.length,1);
  assert.equal((await guardrailState(ids[1])).revisions.length,0);
  const historical={id:'test-notice',revisionId:first.revisions[0].id,at:first.asOf,scope:'all',metric:'deposits',kind:'exceeded',actual:6000,limit:5000,window:p.startDate};
  await pool.query('UPDATE guardrail_state SET notices=$2::jsonb WHERE user_id=$1',[ids[0],JSON.stringify([historical])]);
  p.rules[0].caps.deposits=10000;
  const second=await guardrailState(ids[0],{plan:p,expectedRevisionId:first.revisions[0].id});
  assert.equal(second.revisions.length,2);assert.equal(second.revisions[0].plan.rules[0].caps.deposits,5000);assert.equal(second.notices[0].id,'test-notice');
  await assert.rejects(()=>guardrailState(ids[0],{plan:p,expectedRevisionId:first.revisions[0].id}),/CONFLICT/);
  const loaded=await guardrailState(ids[0]);assert.equal(loaded.revisions.length,2);assert.equal(loaded.notices.length,1);
  assert.equal((await guardrailState(ids[1])).notices.length,0);
  console.log('Database persistence, account isolation, append-only revisions, notice retention, and stale-write rejection passed.');
 }finally {for(const id of ids)await pool.query('DELETE FROM "user" WHERE id=$1',[id]);await pool.end();}
})().catch(e=>{console.error('Integration check failed:',e.code??e.message);process.exitCode=1;});

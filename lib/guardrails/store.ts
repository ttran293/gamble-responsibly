import { pool } from "../db";
import { loadFixture } from "../metrics/fixture";
import { evaluate, mergeNotices, reductionTarget } from "./evaluate";
import type { GuardrailState, Plan, Revision } from "./model";
import { randomUUID } from "node:crypto";

export async function guardrailState(userId:string, change?:{plan:Plan;expectedRevisionId:string|null}) {
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO guardrail_state(user_id) VALUES($1) ON CONFLICT DO NOTHING",[userId]);
    const result=await client.query("SELECT revisions, notices FROM guardrail_state WHERE user_id=$1 FOR UPDATE",[userId]);
    const state=result.rows[0] as GuardrailState;
    const now=new Date(Math.max(Date.now(),Date.parse(state.revisions.at(-1)?.effectiveAt??"1970-01-01T00:00:00Z")+1)).toISOString();
    if(change&&(state.revisions.at(-1)?.id??null)!==change.expectedRevisionId) throw new Error("CONFLICT");
    if(change&&state.revisions[0]&&state.revisions[0].plan.startDate!==change.plan.startDate)throw new Error("The original start date stays fixed. Goal and limit changes take effect when saved.");
    const ids=[...new Set([...state.revisions.flatMap(r=>r.plan.providers),...(change?.plan.providers??[])])];
    const snapshots=await Promise.all(ids.map(p=>loadFixture(p)));
    const previous=evaluate(state.revisions,snapshots,now);
    state.notices=mergeNotices(state.notices,previous.notices);
    if(change) {
      reductionTarget(change.plan,snapshots);
      const revision:Revision={id:randomUUID(),savedAt:now,effectiveAt:now,plan:change.plan};
      state.revisions.push(revision);
      // Keep onboarding's goal aligned with the saved commitment.
      await client.query(`UPDATE user_profiles SET onboarding_answers = onboarding_answers || $2::jsonb WHERE user_id=$1 AND onboarding_answers IS NOT NULL`,[userId,JSON.stringify({goal:change.plan.goal,stopDate:change.plan.goal==="stop"?change.plan.stopDate:null,reduceTarget:null})]);
    }
    const evaluation=evaluate(state.revisions,snapshots,now);
    state.notices=mergeNotices(state.notices,evaluation.notices);
    await client.query("UPDATE guardrail_state SET revisions=$2::jsonb, notices=$3::jsonb, updated_at=$4 WHERE user_id=$1",[userId,JSON.stringify(state.revisions),JSON.stringify(state.notices),now]);
    await client.query("COMMIT");
    return {...state,evaluation,asOf:now};
  } catch(error) {await client.query("ROLLBACK");throw error;} finally {client.release();}
}

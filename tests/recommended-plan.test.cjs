const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript'), fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { recommendedPlan, planEvidence } = require('../lib/recommended-plan.ts');
const { defaultOnboardingAnswers } = require('../lib/onboarding.ts');
const { combineSnapshots } = require('../lib/metrics/core.ts');
const { loadFixture } = require('../lib/metrics/fixture.ts');

test('a shared complete week drives the plan and is independent of dashboard filters', async () => {
  const snapshots = await Promise.all(['draftkings', 'fanduel', 'moonharbor'].map(loadFixture));
  const combined = combineSnapshots(snapshots);
  const evidence = planEvidence(combined);
  assert.deepEqual([evidence.from, evidence.to], ['2026-08-10', '2026-08-16']);
  assert.match(evidence.change, /Moonharbor.*2026-08-12/);
  const plan = recommendedPlan({ ...defaultOnboardingAnswers, goal: 'reduce', reduceTarget: { kind: 'days_per_week', value: 2 } }, combined);
  assert.equal(plan.actions.length, 3);
  assert.match(plan.actions[0].detail, /Moonharbor/);
  assert.match(plan.actions[1].detail, /2 betting days/);
  assert.ok(plan.actions.every(action => /^[a-z0-9:+_-]+$/.test(action.id)));
});

test('incomplete shared history falls back to onboarding choices', async () => {
  const snapshot = await loadFixture('draftkings');
  snapshot.coverage = [{ provider: snapshot.provider, from: '2026-09-12', through: snapshot.through }];
  const answers = { ...defaultOnboardingAnswers, goal: 'stop', stopDate: '2026-10-01', pauseAction: 'contact_someone', triggers: ['stress'] };
  const plan = recommendedPlan(answers, snapshot);
  assert.equal(plan.evidence, null);
  assert.match(plan.actions[1].detail, /2026-10-01/);
  assert.match(plan.actions[3].detail, /Contact someone I trust/);
});

test('stay goal uses activity as context without inventing a safe cap', async () => {
  const snapshot = await loadFixture('draftkings');
  const plan = recommendedPlan(defaultOnboardingAnswers, snapshot);
  assert.ok(plan.evidence);
  assert.match(plan.actions[1].detail, /Choose and write down your own/);
  assert.match(plan.actions[1].reason, /not a recommended safe limit/);
});

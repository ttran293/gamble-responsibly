const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript'), fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { recommendedPlan, planEvidence } = require('../lib/recommended-plan.ts');
const { defaultOnboardingAnswers } = require('../lib/onboarding.ts');
const { combineSnapshots } = require('../lib/metrics/core.ts');
const { loadFixture } = require('../lib/metrics/fixture.ts');

test('a shared complete week drives the plan and is independent of dashboard filters', async () => {
  const snapshots = await Promise.all(['draftkings', 'fanduel', 'moonharbor'].map(provider => loadFixture(provider)));
  const combined = combineSnapshots(snapshots);
  const evidence = planEvidence(combined);
  assert.deepEqual([evidence.from, evidence.to], ['2026-09-21', '2026-09-27']);
  const plan = recommendedPlan({ ...defaultOnboardingAnswers, goal: 'reduce', reduceTarget: { kind: 'days_per_week', value: 2 } }, combined);
  assert.equal(plan.actions.length, 4);
  assert.match(plan.actions[0].detail, /2 betting days/);
  assert.match(plan.actions[1].detail, /2 betting days/);
  assert.ok(plan.actions.every(action => /^[a-z0-9:+_-]+$/.test(action.id)));
});

test('adding activity refines the checklist without resetting completed action IDs', async () => {
  const snapshot = await loadFixture('draftkings');
  const answers = { ...defaultOnboardingAnswers, goal: 'reduce' };
  const before = recommendedPlan(answers);
  const after = recommendedPlan(answers, snapshot);
  assert.ok(after.evidence);
  assert.deepEqual(after.actions.map(action => action.id), before.actions.map(action => action.id));
  assert.notEqual(after.actions[0].detail, before.actions[0].detail);
  assert.match(after.actions.at(-1).detail, /next week/);
});

test('incomplete shared history falls back to onboarding choices', async () => {
  const snapshot = await loadFixture('draftkings');
  snapshot.coverage = [{ provider: snapshot.provider, from: '2026-09-22', through: snapshot.through }];
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

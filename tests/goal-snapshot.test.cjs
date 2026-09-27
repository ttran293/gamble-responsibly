const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { goalSnapshot } = require('../lib/goal-snapshot.ts');
const { defaultOnboardingAnswers } = require('../lib/onboarding.ts');

const evidence = { from: '2026-09-21', to: '2026-09-27', accounts: ['DraftKings', 'FanDuel'], activeDays: 4, cashWagered: 12000, deposits: 8000 };

test('compares a chosen betting-day target only with a complete recorded week', () => {
  const answers = { ...defaultOnboardingAnswers, goal: 'reduce', reduceTarget: { kind: 'days_per_week', value: 2 }, triggers: ['after_loss'], pauseAction: 'step_away' };
  const summary = goalSnapshot(answers, evidence, true);
  assert.match(summary.userSays, /I want to bet on no more than 2 days each week/);
  assert.match(summary.picture, /4 betting days/);
  assert.match(summary.picture, /2 betting days/);
  assert.equal(summary.pictureSource, 'Based on the last complete week shared by DraftKings, FanDuel.');
  assert.match(summary.watch, /You mentioned betting after a loss/);
  assert.match(summary.watch, /Step away for 10 minutes/);
});

test('the user message reflects the selected stop goal and focus', () => {
  const summary = goalSnapshot({ ...defaultOnboardingAnswers, goal: 'stop', focusAreas: ['frequency'], frequency: 'daily', triggers: ['after_loss', 'sports', 'social'], pauseAction: 'step_away' }, evidence, true);
  assert.equal(summary.userSays, 'I want to stop gambling. My focus is how often I bet.');
  assert.deepEqual(summary.userMessages, [
    'I want to stop gambling. My focus is how often I bet.',
    "I bet most days. I'm more likely to bet after a loss, during sports or events, and with other people.",
    'When an urge comes up, I want to step away for 10 minutes.'
  ]);
});

test('the source description adapts to a shorter shared period', () => {
  const summary = goalSnapshot(defaultOnboardingAnswers, { ...evidence, from: '2026-09-26', to: '2026-09-27', accounts: ['Moonharbor Sports (fictional)'] }, true);
  assert.equal(summary.pictureSource, 'Based on the last 2 complete days shared by Moonharbor Sports.');
});

test('without a complete week, uses the stated pace without inventing a comparison', () => {
  const answers = { ...defaultOnboardingAnswers, goal: 'stop', frequency: 'daily' };
  const summary = goalSnapshot(answers, null, true);
  assert.match(summary.picture, /You described your current pace as “Most days”/);
  assert.match(summary.picture, /do not yet share a complete recorded week/);
  assert.doesNotMatch(summary.picture, /recorded in the last complete week/);
});

test('cash wager target is shown in dollars against recorded cash wagers', () => {
  const answers = { ...defaultOnboardingAnswers, goal: 'reduce', reduceTarget: { kind: 'weekly_spending', value: 50 } };
  const summary = goalSnapshot(answers, evidence, true);
  assert.match(summary.picture, /\$120\.00/);
  assert.match(summary.picture, /\$50\.00/);
});

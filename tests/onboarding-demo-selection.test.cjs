const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultOnboardingAnswers, onboardingSchema } = require('../lib/onboarding.ts');

test('demo selection survives the onboarding answer validation and JSON round trip', () => {
  const selection = { version: 'v2', providers: ['fanduel', 'moonharbor'] };
  const saved = onboardingSchema.parse({ ...defaultOnboardingAnswers, demoSelection: selection });
  const reloaded = onboardingSchema.parse(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(reloaded.demoSelection, selection);
});

test('existing onboarding answers and skipped demo data remain valid', () => {
  assert.equal(onboardingSchema.parse(defaultOnboardingAnswers).demoSelection, undefined);
  assert.equal(onboardingSchema.parse({ ...defaultOnboardingAnswers, demoSelection: null }).demoSelection, null);
  assert.equal(onboardingSchema.safeParse({ ...defaultOnboardingAnswers, demoSelection: { version: 'v1', providers: [] } }).success, false);
});

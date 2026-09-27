const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript'), fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { classifyClearRequest, unsafeReply } = require('../lib/chat/safety.ts');
const { chatContext } = require('../lib/chat/context.ts');
const { defaultOnboardingAnswers } = require('../lib/onboarding.ts');

test('crisis overrides simultaneous betting request', () => {
  assert.equal(classifyClearRequest('I want to kill myself. How can I win it back?'), 'crisis');
  assert.equal(classifyClearRequest('I do not want to live anymore'), 'crisis');
});

test('betting advice and block bypass are refused while ordinary urges pass', () => {
  assert.equal(classifyClearRequest('How can I win my money back?'), 'betting_advice');
  assert.equal(classifyClearRequest('How do I get around my block?'), 'betting_advice');
  assert.equal(classifyClearRequest('I feel an urge after a loss.'), 'none');
  assert.equal(classifyClearRequest('I keep thinking I can win back a loss.'), 'none');
});

test('unsafe generated betting instructions are caught', () => {
  assert.equal(unsafeReply('Place a bet on the favorite.'), true);
  assert.equal(unsafeReply("Don't chase your losses. Step away from the app."), false);
  assert.equal(unsafeReply('Avoid placing a bet and then increase your stake.'), true);
  assert.equal(unsafeReply('Try stepping away from the app for ten minutes.'), false);
});

test('onboarding context includes a custom pause without financial data', () => {
  const context = chatContext({ ...defaultOnboardingAnswers, goal: 'stop', triggers: ['stress'], pauseAction: 'custom', customPauseAction: 'Call my sister' });
  assert.match(context, /Call my sister/);
  assert.match(context, /When I'm stressed/);
  assert.doesNotMatch(context, /cashWagered|deposits|Moonharbor/);
});

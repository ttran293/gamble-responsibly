const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript'), fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { completeChat } = require('../lib/chat/openai.ts');

test('ordinary reply uses gpt-6-sol without OpenAI storage', async () => {
  const previous = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    if (url.endsWith('/moderations')) return { ok: true, json: async () => ({ results: [{ categories: { 'self-harm/intent': false, 'self-harm/instructions': false } }] }) };
    return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ category: 'none', reply: 'Step away for ten minutes.' }) }] }] }) };
  };
  try {
    const result = await completeChat('{"goal":"Stop gambling"}', [{ role: 'user', content: 'I have an urge.' }], 'test-key');
    assert.deepEqual(result, { reply: 'Step away for ten minutes.', flag: 'none' });
    assert.equal(calls[0].body.model, 'gpt-6-sol');
    assert.equal(calls[0].body.store, false);
    assert.equal(calls[0].body.text.format.type, 'json_schema');
    assert.equal(calls.length, 2);
  } finally { global.fetch = previous; }
});

test('betting category replaces generated text with fixed refusal', async () => {
  const previous = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ category: 'betting_advice', reply: 'Try betting more.' }) }] }] }) });
  try {
    const result = await completeChat('{}', [{ role: 'user', content: 'What about another bet?' }], 'test-key');
    assert.equal(result.flag, 'betting_advice');
    assert.doesNotMatch(result.reply, /Try betting more/);
  } finally { global.fetch = previous; }
});

test('loss-chasing reflection can mention winning it back without triggering a fallback', async () => {
  const previous = global.fetch;
  global.fetch = async (url) => url.endsWith('/moderations')
    ? { ok: true, json: async () => ({ results: [{ categories: { 'self-harm/intent': false, 'self-harm/instructions': false } }] }) }
    : { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ category: 'none', reply: 'The thought that you can win it back can feel persuasive after a loss. Step away from the betting app for ten minutes and notice what you are hoping the next bet would change.' }) }] }] }) };
  try {
    const result = await completeChat('{}', [{ role: 'user', content: 'I keep thinking I can win back a loss.' }], 'test-key');
    assert.equal(result.flag, 'none');
    assert.match(result.reply, /Step away/);
  } finally { global.fetch = previous; }
});

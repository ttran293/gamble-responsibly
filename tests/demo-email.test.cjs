const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript'), fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { z } = require('zod');
const { accountEmailForInput, isDemoAccountEmail } = require('../lib/demo-email.ts');

test('valid-looking emails remain unchanged apart from case and whitespace', async () => {
  assert.deepEqual(await accountEmailForInput(' Test@Example.com '), { email: 'test@example.com', demo: false });
});

test('a fake demo ID maps to the same valid internal email for sign-up and sign-in', async () => {
  const first = await accountEmailForInput('test@demo');
  const again = await accountEmailForInput(' TEST@DEMO ');
  const different = await accountEmailForInput('another@demo');
  assert.deepEqual(first, again);
  assert.notEqual(first.email, different.email);
  assert.equal(first.demo, true);
  assert.equal(z.email().safeParse(first.email).success, true);
  assert.equal(isDemoAccountEmail(first.email), true);
  assert.equal(isDemoAccountEmail('test@example.com'), false);
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript'), fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { escapeHtml, invitationBaseUrl } = require('../lib/invitation-email.ts');

test('sender supplied markup is escaped before insertion into email HTML', () => {
  assert.equal(escapeHtml('<a href="https://bad.example">Sam & Lee</a>'), '&lt;a href=&quot;https://bad.example&quot;&gt;Sam &amp; Lee&lt;/a&gt;');
  assert.equal(escapeHtml("'quoted'"), '&#39;quoted&#39;');
});

test('invitation links use the configured origin and require HTTPS in production', () => {
  const previousUrl = process.env.APP_URL;
  const previousMode = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    process.env.APP_URL = 'https://jelly.example/some-path';
    assert.equal(invitationBaseUrl(), 'https://jelly.example');
    process.env.APP_URL = 'http://jelly.example';
    assert.throws(() => invitationBaseUrl(), /HTTPS/);
    delete process.env.APP_URL;
    assert.throws(() => invitationBaseUrl(), /APP_URL/);
  } finally {
    if (previousUrl === undefined) delete process.env.APP_URL; else process.env.APP_URL = previousUrl;
    if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
  }
});

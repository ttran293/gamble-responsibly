const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript'), fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { escapeHtml, invitationBaseUrl, invitationEmailFailureMessage, isResendTestSender, isResendTestingError } = require('../lib/invitation-email.ts');
const { invitationSchema } = require('../lib/validation.ts');

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

test('invitation email failures explain test mode without exposing the account address', () => {
  const error = { message: 'You can only send testing emails to your own email address (owner@example.com). To send emails to other recipients, please verify a domain.' };
  const message = invitationEmailFailureMessage(error, 'confirmation');
  assert.match(message, /test mode/);
  assert.doesNotMatch(message, /owner@example.com/);
  assert.equal(invitationEmailFailureMessage(new Error('network down'), 'confirmation'), 'Could not send the confirmation email. Please try again later.');
  assert.equal(invitationEmailFailureMessage(new Error('network down'), 'invitation'), 'Could not send the invitation. Please try again later.');
});

test('the Resend test sender and recipient restriction are detected for demo contacts', () => {
  assert.equal(isResendTestSender('Jelly <onboarding@resend.dev>'), true);
  assert.equal(isResendTestSender('Jelly <hello@myjelly.club>'), false);
  assert.equal(isResendTestingError({ message: 'You can only send testing emails to your own email address (owner@example.com).' }), true);
  assert.equal(isResendTestingError(new Error('network down')), false);
});

test('demo invitations require the fixed Jelly sender address', () => {
  const invitation = { senderName: 'Sam', senderEmail: 'onboarding@resend.dev', recipientEmail: 'friend@example.com' };
  assert.equal(invitationSchema.safeParse(invitation).success, true);
  assert.equal(invitationSchema.safeParse({ ...invitation, senderEmail: 'someone@example.com' }).success, false);
});

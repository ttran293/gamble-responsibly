const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, filename);

const { summarize, combineSnapshots } = require('../lib/metrics/core.ts');
const { overviewInsight } = require('../lib/metrics/overview-insight.ts');
const { loadFixture } = require('../lib/metrics/fixture.ts');

function snapshot(bets = [], coverage) {
  return {
    mode: 'demo', provider: 'Test', loadedAt: '2026-08-15T00:00:00Z',
    from: '2026-08-01', through: '2026-08-14T23:59:59.999Z', transactions: [],
    bets: bets.map(([date, cashStake], id) => ({ id: String(id), wagerId: String(id), placedAt: `${date}T12:00:00Z`, settledAt: null, status: 'open', stake: cashStake, cashStake, bonusStake: 0, payout: 0, refund: 0 })),
    ...(coverage ? { coverage } : {})
  };
}

test('stopping goal describes recorded betting days without financial results', async () => {
  const all = combineSnapshots(await Promise.all(['draftkings', 'fanduel', 'moonharbor'].map(provider => loadFixture(provider))));
  const m = summarize(all, all.from, all.through.slice(0, 10));
  const insight = overviewInsight(m, { goal: 'stop', reduceTarget: null });
  assert.match(insight.text, /67 of 75 days/);
  assert.match(insight.text, /8 days had no recorded bet/);
  assert.doesNotMatch(insight.text, /\$|abstinen|win|loss/i);
  assert.equal(insight.action, 'Explore your daily pattern');
});

test('covered equal length comparison follows the selected reduction target', () => {
  const s = snapshot([['2026-08-01', 1000], ['2026-08-02', 1000], ['2026-08-08', 3000]]);
  const m = summarize(s, '2026-08-08', '2026-08-14');
  const frequency = overviewInsight(m, { goal: 'reduce', reduceTarget: { kind: 'days_per_week', value: 1 } });
  assert.match(frequency.text, /1 of 7 days.*compared with 2 days/);
  const spending = overviewInsight(m, { goal: 'reduce', reduceTarget: { kind: 'weekly_spending', value: 25 } });
  assert.match(spending.text, /\$30\.00.*\$20\.00/);
  assert.match(spending.text, /not money lost/);
});

test('incomplete account coverage never describes bet-free days or compares periods', () => {
  const s = snapshot([['2026-08-08', 1000]], [
    { provider: 'Test', from: '2026-08-01', through: '2026-08-14T23:59:59.999Z' },
    { provider: 'New', from: '2026-08-10', through: '2026-08-14T23:59:59.999Z' }
  ]);
  const insight = overviewInsight(summarize(s, '2026-08-08', '2026-08-14'));
  assert.match(insight.text, /1 bet appears/);
  assert.match(insight.text, /lack full account coverage/);
  assert.doesNotMatch(insight.text, /had no recorded bet|compared with/);
});

test('a covered range without bets states its record scope', () => {
  const insight = overviewInsight(summarize(snapshot(), '2026-08-08', '2026-08-14'), { goal: 'stop', reduceTarget: null });
  assert.match(insight.text, /No bets were recorded across the connected accounts/);
  assert.match(insight.text, /selected records only/);
});

test('observation changes with the selected dates', () => {
  const s = snapshot([['2026-08-02', 1000], ['2026-08-10', 1500], ['2026-08-11', 1500]]);
  const first = overviewInsight(summarize(s, '2026-08-01', '2026-08-07'), { goal: 'stop', reduceTarget: null });
  const second = overviewInsight(summarize(s, '2026-08-08', '2026-08-14'), { goal: 'stop', reduceTarget: null });
  assert.match(first.text, /1 of 7 days/);
  assert.match(second.text, /2 of 7 days/);
  assert.notEqual(first.text, second.text);
  const third = overviewInsight(summarize(s, '2026-08-08', '2026-08-09'), { goal: 'stop', reduceTarget: null });
  assert.match(third.text, /No bets were recorded/);
  assert.notEqual(third.text, second.text);
});

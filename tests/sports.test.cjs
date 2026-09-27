const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);

const { loadFixture } = require('../lib/metrics/fixture.ts');
const { combineSnapshots, summarize } = require('../lib/metrics/core.ts');
const { sportBreakdown } = require('../lib/metrics/sports.ts');

test('both demo versions expose varied sports for every provider', async () => {
  for (const version of ['v1', 'v2']) {
    for (const provider of ['draftkings', 'fanduel', 'moonharbor']) {
      const snapshot = await loadFixture(provider, version);
      const sports = new Set(snapshot.bets.map(bet => bet.sport));
      assert.ok(snapshot.bets.every(bet => typeof bet.sport === 'string' && bet.sport.trim().length > 0));
      for (const sport of ['Basketball', 'Football', 'Baseball', 'Soccer', 'Hockey']) assert.ok(sports.has(sport), `${version} ${provider} is missing ${sport}`);
      if (provider === 'moonharbor') {
        assert.ok(sports.has('Clockwork beetle racing'));
        assert.ok(!sports.has('Clockwork beetle racing (fictional)'));
      }
    }
  }
});

test('sport ranking uses selected placement dates and counts each combined bet once', async () => {
  const snapshots = await Promise.all(['draftkings', 'fanduel', 'moonharbor'].map(provider => loadFixture(provider, 'v2')));
  const combined = combineSnapshots(snapshots);
  const selected = summarize(combined, '2026-08-15', '2026-08-21');
  const breakdown = sportBreakdown(selected.bets);
  assert.equal(breakdown.reduce((sum, item) => sum + item.count, 0), selected.betCount);
  assert.equal(breakdown.reduce((sum, item) => sum + item.stake, 0), selected.totalWagered);
  assert.ok(breakdown.every((item, index) => index === 0 || breakdown[index - 1].count >= item.count));
  assert.deepEqual(sportBreakdown([]), []);
});

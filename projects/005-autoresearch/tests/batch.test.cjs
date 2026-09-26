const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const suite = require('../../../sites/005-autoresearch/batch-study.js');
const study = require('../../../sites/005-autoresearch/illumination-study.js');
const clone = value => JSON.parse(JSON.stringify(value));
function fixture(condition) { return JSON.parse(fs.readFileSync(path.join(__dirname, '../experiments/v04-' + condition + '-run.json'), 'utf8')); }
function batch(count = 4) {
  const value = suite.create('quick');
  value.runs = ['strong', 'soft', 'noise', 'constant'].slice(0, count).map(condition => ({ key: condition + '-42', record: fixture(condition) }));
  value.status = count === 4 ? 'complete' : 'partial';
  return value;
}

test('the fixed suite pairs each condition with the same seeds and sensor settings', () => {
  const jobs = suite.plan('full'); assert.equal(jobs.length, 12);
  for (const condition of suite.CASES) assert.deepEqual(jobs.filter(job => job.condition === condition.id).map(job => job.seed), [42, 43, 44]);
  assert.equal(new Set(jobs.map(job => job.key)).size, 12);
  assert.ok(jobs.every(job => job.config.rate === 5 && job.config.delay === .2 && job.config.noise === 0));
  jobs[0].config.seed = 999;
  assert.equal(suite.plan('full')[0].config.seed, 42, 'plans must not share mutable configuration');
  assert.equal(suite.plan('quick').length, 4);
});

test('four actual exported runs form a portable batch whose summary is recomputed', () => {
  const original = batch();
  assert.deepEqual(suite.canonical(original), original);
  const forged = { ...clone(original), summary: { detected: 1000000 } };
  assert.deepEqual(suite.canonical(forged), original, 'supplied summaries cannot override computed results');
  const summary = suite.summarize(original);
  assert.equal(summary.batch.completed, 4); assert.equal(summary.simulatedSeconds, 96);
  assert.deepEqual(summary.methods.map(method => [method.detected, method.missed, method.falseAlarms, method.expected]), [[4, 2, 0, 6], [4, 2, 14, 6]]);
  assert.ok(summary.methods.every(method => Math.abs(method.averageDelay - .2) < 1e-8));
});

test('partial batches include only completed runs and do not score unrun conditions', () => {
  const value = batch(1), summary = suite.summarize(suite.canonical(value));
  assert.equal(summary.batch.status, 'partial'); assert.equal(summary.simulatedSeconds, 24);
  assert.equal(summary.methods[0].expected, 2); assert.equal(summary.conditions[1].completed, 0);
  assert.deepEqual(summary.conditions[1].methods.map(method => method.missed), [0, 0]);
  assert.ok(summary.conditions[1].methods.every(method => method.averageDelay === null));
});

test('batch import rejects changed order, mismatched conditions, duplicate IDs and incomplete runs', () => {
  const mutations = [
    value => { value.runs.reverse(); },
    value => { value.runs[0].record.config.seed = 43; },
    value => { value.runs[1].record.id = value.runs[0].record.id; },
    value => { value.runs[0].record.frames.pop(); },
    value => { value.status = 'partial'; },
    value => { delete value.profile; },
    value => { value.analysisProtocol = 'unknown'; }
  ];
  for (const mutate of mutations) { const value = batch(); mutate(value); assert.throws(() => suite.canonical(value)); }
  assert.throws(() => suite.canonical(suite.create('quick')), /至少一轮/);
});

test('a structurally valid run with absent image metrics cannot enter batch scoring', () => {
  const value = batch(1);
  value.runs[0].record.frames.forEach(frame => { frame.observations.vision = null; });
  assert.throws(() => suite.canonical(value), /图像统计/);
  assert.throws(() => suite.summarize(value), /完整/);
});

test('aggregate latency is weighted by matched events rather than averaged across runs', () => {
  const a = study.evaluate(fixture('strong')), b = clone(a);
  b.methods.forEach(method => { method.detected = 1; method.averageDelay = .8; });
  const result = suite.aggregateReports([a, b]);
  result.forEach(method => assert.ok(Math.abs(method.averageDelay - .4) < 1e-8));
  assert.ok(suite.aggregateReports([]).every(method => method.averageDelay === null));
});

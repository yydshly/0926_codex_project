const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lab = require('../../../sites/005-autoresearch/lab-core.js');
const study = require('../../../sites/005-autoresearch/illumination-study.js');
const effects = require('../../../sites/005-autoresearch/camera-effects.js');

function makeRecord(config, statistics, duration = 24) {
  const engine = new lab.Experiment({ ...lab.DEFAULTS, layout: 'open', noise: 0, light: 'cycle', ...config }, () => ({ distance: null }), packet => ({
    version: 'frame-change/1', ...packet, ...statistics(packet.sampledAt), meanDifference: 0,
    state: packet.sequence === 0 ? 'baseline' : 'quiet', event: null
  }));
  while (engine.time < duration - 1e-8) engine.step();
  return engine.recording('study test');
}
const stepLight = t => ({ brightness: t >= 4 && t < 8 ? 10 : 20, changedPercent: Math.abs(t - 4) < 1e-7 || Math.abs(t - 8) < 1e-7 ? 90 : 0 });

test('both rules share image statistics but make independent judgments without scene labels', () => {
  const rules = study.createRules();
  const first = { sequence: 0, sampledAt: 0, brightness: 20, changedPercent: 0 };
  Object.defineProperty(first, 'groundTruth', { get() { throw new Error('world data accessed'); } });
  Object.defineProperty(first, 'config', { get() { throw new Error('scene labels accessed'); } });
  assert.equal(rules.analyze(first).brightness.event, false);
  const small = rules.analyze({ sequence: 1, sampledAt: .2, brightness: 21, changedPercent: 12 });
  assert.equal(small.brightness.event, false); assert.equal(small.pixels.event, true);
  const big = rules.analyze({ sequence: 2, sampledAt: .4, brightness: 40, changedPercent: 90 });
  assert.equal(big.brightness.event, true); assert.equal(big.pixels.event, false, 'persistent pixel activity must not repeat an event');
});

test('paired scoring uses sampling time to match and includes delivery delay in latency', () => {
  const record = makeRecord({ rate: 10, delay: .6 }, stepLight);
  const report = study.evaluate(record);
  for (const method of report.methods) {
    assert.equal(method.detected, 2); assert.equal(method.missed, 0); assert.equal(method.falseAlarms, 0);
    assert.ok(Math.abs(method.averageDelay - .6) < 1e-8);
  }
  assert.equal(report.samples, 235);
  const duplicateFrames = JSON.parse(JSON.stringify(record));
  duplicateFrames.frames.forEach(frame => { if (frame.observations.vision) frame.observations.vision.event = 'brightness-change'; });
  assert.deepEqual(study.evaluate(duplicateFrames), report, 'old combined-event flags must not drive the two new rules');
});

test('partial recordings keep an event pending until the matching window and delivery delay close', () => {
  const constant = () => ({ brightness: 20, changedPercent: 0 });
  const early = study.evaluate(makeRecord({ delay: .6 }, constant, 4.9));
  assert.equal(early.methods[0].missed, 0); assert.equal(early.methods[0].pending, 1);
  assert.equal(early.methods[0].outcomes[1].state, 'upcoming');
  const closed = study.evaluate(makeRecord({ delay: .6 }, constant, 5.6));
  assert.equal(closed.methods[0].missed, 1); assert.equal(closed.methods[0].pending, 0);
  assert.equal(closed.complete, false);
});

test('constant light evaluates other image changes as false alarms for this task', () => {
  const record = makeRecord({ light: 'day' }, t => ({ brightness: t < 10 ? 20 : 35, changedPercent: Math.abs(t - 10) < 1e-8 ? 30 : 0 }));
  const report = study.evaluate(record);
  assert.equal(report.expected.length, 0);
  report.methods.forEach(method => { assert.equal(method.falseAlarms, 1); assert.equal(method.averageDelay, null); assert.equal(method.missed, 0); });
});

test('alarms outside the acquisition-time window do not receive credit for a light change', () => {
  const record = makeRecord({ delay: .6 }, t => ({ brightness: t < 5.2 ? 20 : 35, changedPercent: Math.abs(t - 5.2) < 1e-8 ? 30 : 0 }));
  const report = study.evaluate(record);
  report.methods.forEach(method => { assert.equal(method.detected, 0); assert.equal(method.missed, 2); assert.equal(method.falseAlarms, 1); });
});

test('missing image statistics are unavailable rather than graded as failures', () => {
  const record = makeRecord({}, stepLight);
  record.frames.filter(frame => frame.observations.camera?.sequence === 5).forEach(frame => { frame.observations.vision = null; });
  const report = study.evaluate(record);
  assert.equal(report.available, false); assert.deepEqual(report.methods, []);
});

test('the actual V0.3 file remains unchanged by import and gains a clearly recomputed report', () => {
  const record = JSON.parse(fs.readFileSync(path.join(__dirname, '../experiments/example-image-observation-v03.json'), 'utf8'));
  assert.equal(record.schema, lab.PREVIOUS_VERSION);
  assert.deepEqual(lab.canonicalRecording(record), record);
  const report = study.evaluate(record);
  assert.equal(report.methods[0].detected, 2); assert.equal(report.methods[0].falseAlarms, 0);
  assert.equal(report.methods[1].detected, 2); assert.ok(report.methods[1].falseAlarms > 0);
  assert.match(report.source, /重新评估/);
});

test('V0.4 records preserve camera-noise and rule versions and reject unknown settings', () => {
  const record = makeRecord({ cameraNoise: 24, light: 'soft-cycle' }, stepLight);
  assert.equal(record.schema, 'observation-lab/3');
  assert.deepEqual(lab.canonicalRecording(record), record);
  assert.equal(lab.validRecording({ ...record, analysisProtocol: 'unknown' }), false);
  assert.equal(lab.validRecording({ ...record, config: { ...record.config, cameraNoise: 999 } }), false);
  const old = { ...record, schema: lab.PREVIOUS_VERSION, config: { ...record.config } }; delete old.config.cameraNoise;
  assert.equal(lab.validRecording(old), false, 'new light condition cannot be disguised as an old file');
});

test('camera noise is repeatable by seed and sequence, keeps alpha and respects intensity bounds', () => {
  const image = () => ({ width: 8, height: 8, data: new Uint8ClampedArray(Array.from({ length: 256 }, (_, i) => i % 4 === 3 ? 255 : 100)) });
  const original = image(); assert.deepEqual(effects.applyNoise(image(), 0, 42, 2), original);
  const noisy = effects.applyNoise(image(), 24, 42, 2);
  assert.deepEqual(noisy, effects.applyNoise(image(), 24, 42, 2));
  assert.notDeepEqual(noisy, effects.applyNoise(image(), 24, 42, 3));
  noisy.data.forEach((value, i) => assert.ok(i % 4 === 3 ? value === 255 : value >= 76 && value <= 124));
});

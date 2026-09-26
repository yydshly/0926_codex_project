const test = require('node:test');
const assert = require('node:assert/strict');
const lab = require('../../../sites/005-autoresearch/lab-core.js');

test('sensor observations arrive after configured delay and contain no world coordinates', () => {
  const experiment = new lab.Experiment({ ...lab.DEFAULTS, noise: 0, delay: .2 }, () => ({ distance: 12 }));
  assert.equal(experiment.frames[0].observations.range, null);
  for (let i = 0; i < 3; i++) assert.equal(experiment.step().observations.range, null);
  const frame = experiment.step();
  assert.equal(frame.observations.range.sampledAt, 0);
  assert.equal(frame.observations.range.distance, 12);
  assert.deepEqual(Object.keys(frame.observations.camera), ['sequence', 'sampledAt']);
  assert.deepEqual(Object.keys(frame.observations.range), ['sequence', 'sampledAt', 'status', 'distance']);
  assert.equal(lab.interpret(frame.observations, frame.time).age, .2);
});

test('no echo, dropped data and valid ranges remain distinct and deterministic', () => {
  const config = { ...lab.DEFAULTS, dropout: .4, noise: .5 };
  const readings = Array.from({ length: 100 }, (_, i) => lab.measure(15, i, config, i / 5));
  assert.ok(readings.some(item => item.status === 'dropped'));
  assert.ok(readings.some(item => item.status === 'return'));
  for (const item of readings) {
    assert.deepEqual(item, lab.measure(15, item.sequence, config, item.sampledAt));
    if (item.status === 'return') assert.ok(item.distance >= 14.5 && item.distance <= 15.5);
    else assert.equal(item.distance, null);
  }
  assert.equal(lab.measure(null, 0, { ...config, dropout: 0 }, 0).status, 'empty');
});

test('recordings survive serialization without resampling; invalid data is rejected', () => {
  let samples = 0;
  const experiment = new lab.Experiment({ ...lab.DEFAULTS, rate: 10, delay: .6 }, () => { samples++; return { distance: 19.25 }; });
  for (let i = 0; i < 480; i++) experiment.step();
  assert.equal(samples, 241);
  assert.equal(experiment.frames.length, 481);
  const record = JSON.parse(JSON.stringify(experiment.recording('test')));
  assert.equal(lab.validRecording(record), true);
  assert.deepEqual(record.frames, experiment.frames);
  assert.equal(lab.summarize(record).delivered, 235);
  record.frames[0].groundTruth.x = 'bad';
  assert.equal(lab.validRecording(record), false);
  assert.equal(lab.validRecording({ ...record, frames: [null] }), false);
});

test('configuration normalization handles invalid fields and preserves valid settings', () => {
  assert.deepEqual(lab.normalize({ ...lab.DEFAULTS, layout: 'open', seed: 81 }), { ...lab.DEFAULTS, layout: 'open', seed: 81 });
  const config = lab.normalize({ seed: NaN, layout: 'unknown', rate: -100, delay: 99 });
  assert.equal(config.seed, 42); assert.equal(config.rate, 5); assert.equal(config.delay, .2); assert.equal(config.layout, 'wall');
});

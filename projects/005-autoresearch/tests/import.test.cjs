const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const lab = require('../../../sites/005-autoresearch/lab-core.js');

const clone = value => JSON.parse(JSON.stringify(value));
function recordWithVision() {
  const experiment = new lab.Experiment({ ...lab.DEFAULTS, noise: 0, delay: .2 }, () => ({ distance: 12 }), camera => ({
    version: 'frame-change/1', ...camera, brightness: 42, changedPercent: 0, meanDifference: 0,
    state: camera.sequence === 0 ? 'baseline' : 'quiet', event: null
  }));
  for (let index = 0; index < 12; index++) experiment.step();
  return experiment.recording('Import validation');
}

test('the actual V0.2 exported fixture remains readable without invented image metrics', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '../experiments/example-wall-42.json'), 'utf8'));
  assert.equal(fixture.schema, lab.LEGACY_VERSION);
  assert.equal(lab.validRecording(fixture), true);
  const canonical = lab.canonicalRecording(fixture);
  assert.deepEqual(canonical, fixture);
  assert.equal(canonical.frames.length, 481);
  assert.equal(lab.summarize(canonical).delivered, 120);
  assert.deepEqual(lab.imageEvents(canonical.frames), []);
  assert.ok(canonical.frames.every(frame => !Object.hasOwn(frame.observations, 'vision')));
});

test('JSON property ordering does not change a valid configuration', () => {
  const record = recordWithVision();
  const expected = clone(record.config);
  record.config = Object.fromEntries(Object.entries(record.config).reverse());
  assert.equal(lab.validRecording(record), true);
  assert.deepEqual(lab.canonicalRecording(record).config, expected);
});

test('malformed imported records return false without throwing', () => {
  const record = recordWithVision();
  const badMetadata = [null, 42, '', 'x'.repeat(161)];
  const malformed = [null, [], {}, { ...record, config: null }, { ...record, config: [] },
    { ...record, frames: null }, { ...record, frames: [] }, { ...record, frames: [null] },
    { ...record, frames: [{ ...record.frames[0], observations: false }] },
    { ...record, frames: [{ ...record.frames[0], groundTruth: null }] },
    { ...record, createdAt: 'not a date' },
    ...badMetadata.map(name => ({ ...record, name }))];
  for (const value of malformed) {
    assert.doesNotThrow(() => assert.equal(lab.validRecording(value), false));
  }
});

test('imports reject premature delivery and nonuniform world timestamps', () => {
  const premature = recordWithVision();
  premature.frames[0].observations = clone(premature.frames[4].observations);
  assert.equal(lab.validRecording(premature), false);
  assert.throws(() => lab.canonicalRecording(premature), /延迟/);
  const offGrid = recordWithVision();
  offGrid.frames[1].time = .071;
  assert.equal(lab.validRecording(offGrid), false);
  assert.throws(() => lab.canonicalRecording(offGrid), /0.05/);
});

test('canonical imported output strips unknown data at every observation boundary', () => {
  const source = recordWithVision();
  const expected = clone(source);
  source.unknown = 'untrusted top-level content';
  source.frames.forEach(frame => {
    frame.unknown = true;
    frame.groundTruth.label = 'not part of the schema';
    frame.observations.unknown = { arbitrary: true };
    for (const packet of [frame.observations.camera, frame.observations.range, frame.observations.vision]) {
      if (packet) packet.unknown = 'not passed to consumers';
    }
  });
  const canonical = lab.canonicalRecording(source);
  assert.deepEqual(canonical, expected);
  assert.equal(source.unknown, 'untrusted top-level content', 'validation must not mutate the input');
  assert.equal(lab.validRecording({ ...source, config: { ...source.config, unknown: 1 } }), false,
    'unknown configuration fields are rejected before reaching form population');
});

test('one delivered sequence cannot change distance or image values between world frames', () => {
  for (const change of [
    frame => { frame.observations.range.distance = 13; },
    frame => { frame.observations.vision.brightness = 43; }
  ]) {
    const record = recordWithVision();
    assert.equal(record.frames[4].observations.camera.sequence, record.frames[5].observations.camera.sequence);
    change(record.frames[5]);
    assert.equal(lab.validRecording(record), false);
    assert.throws(() => lab.canonicalRecording(record), /同一采样序号/);
  }
});

test('the image observer runs exactly once per delivered camera packet and sees only its reference', () => {
  const observed = [];
  let sampled = 0;
  const experiment = new lab.Experiment({ ...lab.DEFAULTS, rate: 10, delay: .6 }, () => {
    sampled++;
    return { distance: 12 };
  }, camera => {
    observed.push(clone(camera));
    assert.deepEqual(Object.keys(camera).sort(), ['sampledAt', 'sequence']);
    return null;
  });
  assert.equal(observed.length, 0);
  for (let index = 0; index < 11; index++) experiment.step();
  assert.equal(observed.length, 0);
  experiment.step();
  assert.deepEqual(observed, [{ sequence: 0, sampledAt: 0 }]);
  for (let index = 12; index < 480; index++) experiment.step();
  assert.equal(sampled, 241);
  assert.equal(observed.length, 235);
  assert.equal(new Set(observed.map(packet => packet.sequence)).size, 235);
  assert.equal(observed.length, lab.summarize(experiment.recording()).delivered);
  experiment.step();
  assert.equal(observed.length, 235, 'stepping a completed experiment must not redeliver a packet');
});

test('repeated recording keeps run identity and previously returned snapshots unchanged', () => {
  const experiment = new lab.Experiment(lab.DEFAULTS, () => ({ distance: 12 }));
  const first = experiment.recording('First snapshot');
  experiment.step();
  const second = experiment.recording('Later snapshot');
  assert.equal(first.id, second.id);
  assert.equal(first.createdAt, second.createdAt);
  assert.equal(first.frames.length, 1);
  assert.equal(second.frames.length, 2);
  assert.equal(lab.validRecording(first), true);
  assert.equal(lab.validRecording(second), true);
});

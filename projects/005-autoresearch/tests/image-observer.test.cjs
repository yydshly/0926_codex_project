'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const modulePath = path.resolve(__dirname, '../../../sites/005-autoresearch/image-observer.js');
const { createObserver } = require(modulePath);

function frame(width = 10, height = 10, level = 40) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = level;
    data[i + 3] = 255;
  }
  return { width, height, data };
}

test('first frame is a baseline; identical frames are quiet and serializable', () => {
  const observer = createObserver();
  const image = frame();
  const before = new Uint8ClampedArray(image.data);
  const baseline = observer.analyze(image, { sequence: 0, sampledAt: 0 });
  assert.equal(baseline.state, 'baseline');
  assert.equal(baseline.event, null);
  const quiet = observer.analyze(image, { sequence: 1, sampledAt: 0.1 });
  assert.equal(quiet.state, 'quiet');
  assert.equal(quiet.changedPercent, 0);
  assert.equal(quiet.meanDifference, 0);
  assert.equal(quiet.event, null);
  assert.deepEqual(JSON.parse(JSON.stringify(quiet)), quiet);
  assert.deepEqual(image.data, before);
  assert.deepEqual(Object.keys(quiet).sort(), [
    'version', 'sequence', 'sampledAt', 'brightness', 'changedPercent',
    'meanDifference', 'state', 'event'
  ].sort());
});

test('global illumination changes create a brightness event', () => {
  const observer = createObserver();
  observer.analyze(frame(10, 10, 0), { sequence: 0, sampledAt: 0 });
  const result = observer.analyze(frame(10, 10, 255), { sequence: 1, sampledAt: 0.2 });
  assert.equal(result.brightness, 100);
  assert.equal(result.changedPercent, 100);
  assert.equal(result.meanDifference, 255);
  assert.equal(result.state, 'brightness');
  assert.equal(result.event, 'brightness-change');
});

test('local pixel changes produce aggregate values, without any position output', () => {
  const observer = createObserver();
  const image = frame();
  observer.analyze(image, { sequence: 0, sampledAt: 0 });
  image.data[0] = image.data[1] = image.data[2] = 70;
  const result = observer.analyze(image, { sequence: 1, sampledAt: 0.1 });
  assert.equal(result.changedPercent, 1);
  assert.equal(result.meanDifference, 0.3);
  assert.equal(result.state, 'changed');
  assert.equal(result.event, 'frame-change');
  assert.equal(Object.values(result).every(value => value === null || typeof value !== 'object'), true);
  // The stored previous pixels are independent from the caller's buffer.
  assert.equal(observer.analyze(image, { sequence: 2, sampledAt: 0.2 }).state, 'quiet');
});

test('events respect cooldown and occur on transitions, never as delayed repeats', () => {
  const observer = createObserver();
  observer.analyze(frame(10, 10, 0), { sequence: 0, sampledAt: 0 });
  assert.equal(observer.analyze(frame(10, 10, 100), { sequence: 1, sampledAt: 0.1 }).event, 'brightness-change');
  assert.equal(observer.analyze(frame(10, 10, 100), { sequence: 2, sampledAt: 0.2 }).state, 'quiet');
  assert.equal(observer.analyze(frame(10, 10, 0), { sequence: 3, sampledAt: 0.3 }).event, null);
  assert.equal(observer.analyze(frame(10, 10, 100), { sequence: 4, sampledAt: 2 }).event, null);
  assert.equal(observer.analyze(frame(10, 10, 100), { sequence: 5, sampledAt: 2.1 }).state, 'quiet');
  assert.equal(observer.analyze(frame(10, 10, 0), { sequence: 6, sampledAt: 2.2 }).event, 'brightness-change');
});

test('dimension changes create a new baseline even with the same pixel count', () => {
  const observer = createObserver();
  observer.analyze(frame(10, 10), { sequence: 0, sampledAt: 0 });
  const resized = observer.analyze(frame(20, 5, 200), { sequence: 1, sampledAt: 0.1 });
  assert.equal(resized.state, 'baseline');
  assert.equal(resized.changedPercent, 0);
  assert.equal(resized.event, null);
});

test('reset clears pixels, monotonic metadata checks and event cooldown', () => {
  const observer = createObserver();
  observer.analyze(frame(10, 10, 0), { sequence: 5, sampledAt: 9 });
  observer.analyze(frame(10, 10, 100), { sequence: 6, sampledAt: 10 });
  observer.reset();
  assert.equal(observer.analyze(frame(10, 10, 0), { sequence: 0, sampledAt: 0 }).state, 'baseline');
  assert.equal(observer.analyze(frame(10, 10, 100), { sequence: 1, sampledAt: 0.1 }).event, 'brightness-change');
});

test('invalid image or metadata is rejected without consuming a sequence', () => {
  const observer = createObserver();
  const image = frame();
  observer.analyze(image, { sequence: 2, sampledAt: 1 });
  for (const invalid of [null, {}, { ...image, width: 0 }, { ...image, height: 1.5 },
    { ...image, data: new Uint8ClampedArray(3) }, { ...image, data: Array.from(image.data) }]) {
    assert.throws(() => observer.analyze(invalid, { sequence: 3, sampledAt: 2 }), TypeError);
  }
  for (const metadata of [null, {}, { sequence: 3, sampledAt: NaN }, { sequence: 3, sampledAt: Infinity },
    { sequence: -1, sampledAt: 2 }, { sequence: 3.5, sampledAt: 2 }, { sequence: 3, sampledAt: -1 }]) {
    assert.throws(() => observer.analyze(image, metadata), TypeError);
  }
  assert.throws(() => observer.analyze(image, { sequence: 2, sampledAt: 2 }), RangeError);
  assert.throws(() => observer.analyze(image, { sequence: 3, sampledAt: 0.9 }), RangeError);
  assert.equal(observer.analyze(image, { sequence: 3, sampledAt: 1 }).state, 'quiet');
});

test('the standalone browser build exposes ImageObserver without a module loader', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context);
  assert.equal(typeof context.ImageObserver.createObserver, 'function');
  const result = context.ImageObserver.createObserver().analyze(frame(), { sequence: 0, sampledAt: 0 });
  assert.equal(result.version, 'frame-change/1');
  assert.equal(result.state, 'baseline');
});

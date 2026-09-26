const test = require('node:test');
const assert = require('node:assert/strict');
const sim = require('../../../sites/005-autoresearch/sim3d.js');

test('observations outside the volume cannot produce a valid record', () => {
  for (const point of [{ x: 20, y: 8, z: 0 }, { x: 0, y: 2, z: 0 }, { x: 0, y: 8, z: 16 }]) {
    const result = sim.runTrial(Array.from({ length: 481 }, () => point), 'periodic');
    assert.equal(result.marked, false);
    assert.equal(result.attempts, 8);
  }
});

test('observation requires continuous time and resets when visibility is lost', () => {
  const observer = sim.createObserver();
  const point = { x: 0, y: 8, z: 0 };
  for (let i = 0; i <= 40; i++) sim.updateObserver(observer, point, i * .05, 'manual');
  assert.equal(observer.ready, false);
  sim.updateObserver(observer, { ...point, x: 20 }, 2.05, 'manual');
  assert.equal(observer.observedFor, 0);
  for (let i = 42; i < 78; i++) sim.updateObserver(observer, point, i * .05, 'manual');
  assert.equal(observer.ready, false);
  sim.updateObserver(observer, point, 3.9, 'manual');
  assert.equal(observer.ready, true);
  assert.equal(sim.mark(observer, 3.9).success, true);
  assert.equal(sim.mark(observer, 8), null);
});

test('seeded trajectories repeat exactly, move in three axes, and stay in bounds', () => {
  for (const mode of ['orbit', 'eight', 'wander']) {
    const points = sim.makeTrajectory(mode, 42);
    assert.deepEqual(points, sim.makeTrajectory(mode, 42));
    assert.notDeepEqual(points, sim.makeTrajectory(mode, 43));
    for (const axis of ['x', 'y', 'z']) assert.ok(new Set(points.map(point => point[axis])).size > 20);
    assert.ok(points.every(point => point.y >= sim.WORLD.minY && point.y <= sim.WORLD.maxY));
  }
});

test('batch pairs use the same trajectory and score the first valid record', () => {
  for (const candidate of ['steady', 'entry', 'patient']) {
    const result = sim.runBatch(42, candidate);
    assert.equal(result.cases.length, 24);
    for (const item of result.cases) {
      const points = sim.makeTrajectory(item.mode, item.seed);
      assert.deepEqual(item.baseline, sim.runTrial(points, 'periodic'));
      assert.deepEqual(item.candidate, sim.runTrial(points, candidate));
    }
    assert.equal(result.decision, result.proposed.loss < result.baseline.loss ? 'keep' : 'discard');
  }
  const example = sim.runTrial(sim.makeTrajectory('wander', 42), 'steady');
  assert.deepEqual(example, { marked: true, markedAt: 3, attempts: 1 });
});

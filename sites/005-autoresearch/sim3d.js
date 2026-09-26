/* Deterministic observation exercise. Optical marks are visual annotations, not a device or weapon model. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AutoResearchSim3D = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const WORLD = Object.freeze({
    halfX: 25, halfZ: 18, minY: 2, maxY: 17,
    station: Object.freeze({ x: -14, y: 2.85, z: 0 }),
    observation: Object.freeze({ minX: -18, maxX: 16, minZ: -13, maxZ: 13, minY: 3, maxY: 15 }),
    startup: 0.8, settleTime: 1.8,
    duration: 24, step: 0.05, cooldown: 3.0
  });

  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  function random(seed) {
    let state = (Number(seed) >>> 0) || 1;
    return () => {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function regularPoint(mode, time, seed) {
    const angle = (Number(seed) % 31) * 0.17;
    if (mode === 'orbit') {
      const a = 0.41 * time + angle;
      return { x: 2 + 14 * Math.cos(a), y: 8 + 3.1 * Math.sin(a * 0.72), z: 11 * Math.sin(a) };
    }
    const a = 0.45 * time + angle;
    return { x: 2 + 16 * Math.sin(a), y: 8 + 2.5 * Math.sin(a * 1.5 + 0.4), z: 11 * Math.sin(2 * a) };
  }

  function makeTrajectory(mode, seed, duration = WORLD.duration) {
    if (!['orbit', 'eight', 'wander'].includes(mode)) throw new Error('Unknown 3D flight mode');
    const count = Math.round(duration / WORLD.step) + 1;
    if (mode !== 'wander') {
      return Array.from({ length: count }, (_, index) => regularPoint(mode, index * WORLD.step, seed));
    }
    const rng = random(seed);
    const points = [];
    const point = { x: 10, y: 8, z: -7 };
    const velocity = { x: 2.2, y: 0.3, z: 1.2 };
    let desired = { x: 0, y: 0, z: 0 };
    for (let index = 0; index < count; index++) {
      if (index % 23 === 0) {
        desired = { x: (rng() * 2 - 1) * 4.8, y: (rng() * 2 - 1) * 2.0, z: (rng() * 2 - 1) * 4.3 };
      }
      points.push({ ...point });
      for (const axis of ['x', 'y', 'z']) {
        const maxAcceleration = axis === 'y' ? 1.8 : 3.4;
        velocity[axis] += clamp(desired[axis] - velocity[axis], -maxAcceleration * WORLD.step, maxAcceleration * WORLD.step);
        point[axis] += velocity[axis] * WORLD.step;
      }
      const bounds = { x: [-20, 21], y: [WORLD.minY, WORLD.maxY], z: [-14, 14] };
      for (const axis of ['x', 'y', 'z']) {
        if (point[axis] < bounds[axis][0] || point[axis] > bounds[axis][1]) {
          point[axis] = clamp(point[axis], ...bounds[axis]);
          velocity[axis] *= -0.78;
          desired[axis] *= -1;
        }
      }
    }
    return points;
  }

  function pointAt(points, time) {
    const position = clamp(time / WORLD.step, 0, points.length - 1);
    const first = Math.floor(position);
    const second = Math.min(points.length - 1, first + 1);
    const fraction = position - first;
    return {
      x: points[first].x + (points[second].x - points[first].x) * fraction,
      y: points[first].y + (points[second].y - points[first].y) * fraction,
      z: points[first].z + (points[second].z - points[first].z) * fraction
    };
  }

  function policyName(policy) {
    return { periodic: '固定间隔记录', entry: '发现后立即记录', steady: '稳定观察后记录', patient: '长时间观察后记录', manual: '手动标记' }[policy] || policy;
  }

  function isObservable(point) {
    const area = WORLD.observation;
    return point.x >= area.minX && point.x <= area.maxX && point.z >= area.minZ &&
      point.z <= area.maxZ && point.y >= area.minY && point.y <= area.maxY;
  }

  function createObserver() {
    return { visible: false, observedFor: 0, ready: false, lastMark: -Infinity, attempts: 0, markedAt: null, phase: 'search' };
  }

  function shouldMark(policy, time, observer) {
    if (observer.markedAt !== null || time - observer.lastMark < WORLD.cooldown - 1e-9) return false;
    if (policy === 'manual') return false;
    if (policy === 'periodic') {
      const elapsed = time - 1;
      return elapsed >= -1e-9 && Math.abs(elapsed / 3 - Math.round(elapsed / 3)) < 1e-7;
    }
    if (policy === 'entry') return observer.visible;
    if (policy === 'steady') return observer.observedFor >= WORLD.settleTime + 0.4 - 1e-9;
    if (policy === 'patient') return observer.observedFor >= 7 - 1e-9;
    throw new Error('Unknown observation policy');
  }

  function mark(observer, time) {
    if (observer.markedAt !== null || time - observer.lastMark < WORLD.cooldown - 1e-9) return null;
    observer.attempts++;
    observer.lastMark = time;
    const success = observer.ready;
    if (success) observer.markedAt = time;
    return { time, success, reason: success ? '连续观察达到演示要求，记录一次光学标记' :
      observer.visible ? '观察时间不足，本次记录未通过' : '目标不在观察区，本次记录未通过' };
  }

  // The teaching rule reads scene coordinates and a dwell timer. It does not estimate aim,
  // recognize pixels, predict interception, or compute a physical firing solution.
  function updateObserver(observer, point, time, policy) {
    const visible = time >= WORLD.startup - 1e-9 && isObservable(point);
    observer.observedFor = visible ? (observer.visible ? observer.observedFor + WORLD.step : 0) : 0;
    observer.visible = visible;
    observer.ready = visible && observer.observedFor >= WORLD.settleTime - 1e-9;
    const event = shouldMark(policy, time, observer) ? mark(observer, time) : null;
    observer.phase = observer.markedAt !== null ? 'marked' : observer.ready ? 'ready' : visible ? 'track' : 'search';
    return event;
  }

  function runTrial(points, policy) {
    const observer = createObserver();
    for (let index = 0; index < points.length; index++) {
      updateObserver(observer, points[index], index * WORLD.step, policy);
      if (observer.markedAt !== null) break;
    }
    return { marked: observer.markedAt !== null, markedAt: observer.markedAt, attempts: observer.attempts };
  }

  function summarize(trials) {
    const count = trials.length;
    const marked = trials.filter(trial => trial.marked).length;
    const averageAttempts = trials.reduce((sum, trial) => sum + trial.attempts, 0) / count;
    return {
      count, marked, successRate: marked / count, averageAttempts,
      loss: 100 * (1 - marked / count) + 2 * averageAttempts
    };
  }

  function runBatch(seed, candidate) {
    if (!['steady', 'entry', 'patient'].includes(candidate)) throw new Error('Unknown candidate');
    const modes = ['orbit', 'eight', 'wander'];
    const cases = Array.from({ length: 24 }, (_, index) => ({
      mode: modes[index % modes.length], seed: Number(seed) + index * 19
    }));
    const paired = cases.map(item => {
      const points = makeTrajectory(item.mode, item.seed);
      return { ...item, baseline: runTrial(points, 'periodic'), candidate: runTrial(points, candidate) };
    });
    const baseline = summarize(paired.map(item => item.baseline));
    const proposed = summarize(paired.map(item => item.candidate));
    return { seed: Number(seed), candidate, cases: paired, baseline, proposed, decision: proposed.loss < baseline.loss ? 'keep' : 'discard' };
  }

  return { WORLD, clamp, distance, makeTrajectory, pointAt, policyName, isObservable, createObserver, shouldMark, mark, updateObserver, runTrial, runBatch, summarize };
});

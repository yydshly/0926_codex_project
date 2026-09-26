/* Observation workbench: deterministic world, sensor delivery, and recording.
 * No targeting, aiming, interception or weapon controls are part of this module. */
(function (root, factory) {
  const sim = typeof module === 'object' && module.exports ? require('./sim3d.js') : root.AutoResearchSim3D;
  const api = factory(sim);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ObservationLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (sim) {
  'use strict';
  const VERSION = 'observation-lab/3';
  const PREVIOUS_VERSION = 'observation-lab/2';
  const LEGACY_VERSION = 'observation-lab/1';
  const STEP = .05;
  const DURATION = 24;
  const DEFAULTS = Object.freeze({ layout: 'wall', motion: 'wander', light: 'day', seed: 42, rate: 5, noise: .15, delay: .2, dropout: 0, cameraNoise: 0 });
  const choose = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const clone = value => JSON.parse(JSON.stringify(value));
  function normalize(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
    const seed = Number(input.seed);
    return {
      layout: choose(input.layout, ['open', 'wall', 'blocks'], DEFAULTS.layout),
      motion: choose(input.motion, ['wander', 'orbit', 'eight'], DEFAULTS.motion),
      light: choose(input.light, ['day', 'dusk', 'cycle', 'soft-cycle'], DEFAULTS.light),
      seed: Number.isFinite(seed) ? Math.round(sim.clamp(seed, 0, 999999)) : 42,
      rate: choose(Number(input.rate), [5, 10], DEFAULTS.rate),
      noise: choose(Number(input.noise), [0, .15, .5], DEFAULTS.noise),
      delay: choose(Number(input.delay), [0, .2, .6], DEFAULTS.delay),
      dropout: choose(Number(input.dropout), [0, .15, .4], DEFAULTS.dropout),
      cameraNoise: choose(Number(input.cameraNoise), [0, 8, 24], DEFAULTS.cameraNoise)
    };
  }
  function random(seed) {
    let x = seed >>> 0;
    return () => { x += 0x6D2B79F5; let n = x; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
  }
  function measure(idealDistance, sequence, config, time) {
    const rng = random(config.seed + sequence * 7919);
    const dropped = rng() < config.dropout;
    const perturbation = (rng() * 2 - 1) * config.noise;
    const status = dropped ? 'dropped' : idealDistance === null ? 'empty' : 'return';
    return { sequence, sampledAt: time, status,
      distance: status === 'return' ? Math.round(sim.clamp(idealDistance + perturbation, .01, 44) * 1000) / 1000 : null };
  }
  // This consumer receives observations only. It cannot access world positions or object IDs.
  function interpret(observations, now) {
    const range = observations.range;
    if (!range) return { state: 'waiting', title: '等待观测送达', detail: '传感器尚未送来数据。', age: null };
    const age = Math.max(0, now - range.sampledAt);
    const labels = {
      return: ['收到距离回波', '固定方向上有表面返回测量值；回波没有物体类别信息。'],
      empty: ['当前没有回波', '该固定测量方向在范围内没有返回表面。'],
      dropped: ['本次测距数据丢失', '这次测距样本被丢包模型丢弃，不能当作新的有效距离。']
    };
    const [title, detail] = labels[range.status];
    return { state: range.status, title, detail, age };
  }
  class Experiment {
    constructor(config, sample, observeImage = () => null) {
      this.config = normalize(config);
      this.sample = sample;
      this.observeImage = observeImage;
      this.id = 'run-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      this.createdAt = new Date().toISOString();
      this.path = sim.makeTrajectory(this.config.motion, this.config.seed);
      this.time = 0; this.tick = 0; this.sequence = 0; this.pending = []; this.frames = [];
      this.observations = { camera: null, range: null, vision: null };
      this.capture();
    }
    worldAt(time) { return { time, position: sim.pointAt(this.path, time) }; }
    capture() {
      const world = this.worldAt(this.time);
      if (this.tick % Math.round(1 / (STEP * this.config.rate)) === 0) {
        const sequence = this.sequence++;
        const source = this.sample(world, sequence);
        const distance = Number.isFinite(source.distance) && source.distance >= 0 && source.distance <= 44 ? source.distance : null;
        this.pending.push({ at: this.time + this.config.delay, camera: { sequence, sampledAt: this.time }, range: measure(distance, sequence, this.config, this.time) });
      }
      while (this.pending.length && this.pending[0].at <= this.time + 1e-8) {
        const packet = this.pending.shift();
        // The image observer receives only a delivered camera reference. The app resolves
        // that reference to pixels; no world state is supplied to this consumer.
        const vision = this.observeImage({ ...packet.camera });
        this.observations = { camera: packet.camera, range: packet.range, vision };
      }
      const frame = { time: this.time, groundTruth: clone(world.position), observations: clone(this.observations) };
      this.frames.push(frame);
      return frame;
    }
    step() {
      if (this.time >= DURATION) return this.frames[this.frames.length - 1];
      this.tick++; this.time = Math.min(DURATION, this.tick * STEP);
      return this.capture();
    }
    recording(name) {
      return { schema: VERSION, analysisProtocol: 'illumination-comparison/1', id: this.id, name: name || '观察实验', createdAt: this.createdAt, config: clone(this.config), frames: clone(this.frames) };
    }
  }
  function summarize(recording) {
    const samples = new Map();
    for (const frame of recording.frames) if (frame.observations.range) samples.set(frame.observations.range.sequence, frame.observations.range);
    const values = [...samples.values()];
    const valid = values.filter(sample => sample.status === 'return');
    return { duration: recording.frames.at(-1)?.time || 0, delivered: values.length, valid: valid.length,
      empty: values.filter(sample => sample.status === 'empty').length,
      dropped: values.filter(sample => sample.status === 'dropped').length,
      average: valid.length ? valid.reduce((sum, item) => sum + item.distance, 0) / valid.length : null };
  }
  function imageEvents(frames) {
    const seen = new Set(), events = [];
    frames.forEach((frame, frameIndex) => {
      const vision = frame.observations.vision;
      if (!vision || seen.has(vision.sequence)) return;
      seen.add(vision.sequence);
      if (vision.event) events.push({ frameIndex, observedAt: frame.time, ...vision });
    });
    return events;
  }
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const bounded = (value, max) => Number.isFinite(value) && value >= 0 && value <= max;
  const close = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-7;
  function canonicalRecording(recording) {
    function need(condition, message) { if (!condition) throw new Error(message); }
    need(object(recording) && [VERSION, PREVIOUS_VERSION, LEGACY_VERSION].includes(recording.schema), '不支持的实验格式或版本。');
    if (recording.schema === VERSION) need(recording.analysisProtocol === 'illumination-comparison/1', '不支持的对照评测规则版本。');
    for (const key of ['id', 'name', 'createdAt']) need(typeof recording[key] === 'string' && recording[key].length > 0 && recording[key].length <= 160, '实验名称、编号或日期无效。');
    need(Number.isFinite(Date.parse(recording.createdAt)), '实验日期无效。');
    need(object(recording.config), '实验配置缺失。');
    const config = normalize(recording.config);
    if (recording.schema !== VERSION) delete config.cameraNoise;
    const keys = Object.keys(config);
    need(keys.length === Object.keys(recording.config).length && keys.every(key => config[key] === recording.config[key]), '实验配置含有无效值。');
    need(recording.schema !== LEGACY_VERSION || config.light !== 'cycle', '旧版记录不支持该光照配置。');
    need(recording.schema === VERSION || config.light !== 'soft-cycle', '旧版记录不支持轻微光照变化。');
    need(Array.isArray(recording.frames) && recording.frames.length >= 1 && recording.frames.length <= 481, '记录帧数无效。');
    let previous = null;
    const frames = recording.frames.map((frame, index) => {
      need(object(frame) && close(frame.time, index * STEP), '记录时间必须从零开始，以 0.05 秒连续递增。');
      need(object(frame.groundTruth) && ['x', 'y', 'z'].every(axis => Number.isFinite(frame.groundTruth[axis]) && Math.abs(frame.groundTruth[axis]) < 100), '世界状态含无效位置。');
      need(object(frame.observations), '观测包缺失。');
      const obs = frame.observations, sequence = Math.floor((frame.time - config.delay + 1e-8) * config.rate);
      const canonical = { camera: null, range: null };
      if (sequence < 0) need(obs.camera === null && obs.range === null && (obs.vision === null || obs.vision === undefined), '观测早于设定延迟。');
      else {
        for (const packet of [obs.camera, obs.range]) need(object(packet) && packet.sequence === sequence && close(packet.sampledAt, sequence / config.rate), '观测序号、采样时间或送达时序不一致。');
        canonical.camera = { sequence, sampledAt: obs.camera.sampledAt };
        const range = obs.range;
        need(['return', 'empty', 'dropped'].includes(range.status), '测距状态无效。');
        need(range.status === 'return' ? bounded(range.distance, 44) : range.distance === null, '测距值与状态不一致。');
        canonical.range = { sequence, sampledAt: range.sampledAt, status: range.status, distance: range.distance };
      }
      if (recording.schema !== LEGACY_VERSION) {
        need(obs.vision === null || object(obs.vision), '图像观察字段缺失或无效。');
        canonical.vision = null;
        if (obs.vision) {
          const vision = obs.vision;
          need(sequence >= 0 && vision.version === 'frame-change/1' && vision.sequence === sequence && close(vision.sampledAt, sequence / config.rate), '图像观察与相机采样不对应。');
          need(bounded(vision.brightness, 100) && bounded(vision.changedPercent, 100) && bounded(vision.meanDifference, 255), '图像统计数值无效。');
          need(['baseline', 'quiet', 'changed', 'brightness'].includes(vision.state), '图像观察状态无效。');
          need(vision.event === null || vision.event === 'frame-change' && vision.state === 'changed' || vision.event === 'brightness-change' && vision.state === 'brightness', '图像事件与观察状态不一致。');
          canonical.vision = { version: vision.version, sequence, sampledAt: vision.sampledAt, brightness: vision.brightness, changedPercent: vision.changedPercent, meanDifference: vision.meanDifference, state: vision.state, event: vision.event };
        }
      }
      if (sequence >= 0 && previous?.camera?.sequence === sequence) need(JSON.stringify(previous) === JSON.stringify(canonical), '同一采样序号的观测内容发生了变化。');
      previous = canonical;
      return { time: frame.time, groundTruth: { x: frame.groundTruth.x, y: frame.groundTruth.y, z: frame.groundTruth.z }, observations: canonical };
    });
    return { schema: recording.schema, ...(recording.schema === VERSION ? { analysisProtocol: recording.analysisProtocol } : {}), id: recording.id, name: recording.name, createdAt: recording.createdAt, config, frames };
  }
  function validRecording(recording) { try { canonicalRecording(recording); return true; } catch (error) { return false; } }
  return { VERSION, PREVIOUS_VERSION, LEGACY_VERSION, STEP, DURATION, DEFAULTS, normalize, measure, interpret, Experiment, summarize, imageEvents, canonicalRecording, validRecording };
});

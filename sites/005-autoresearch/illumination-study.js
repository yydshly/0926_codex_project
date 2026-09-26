(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IlluminationStudy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const PROTOCOL = 'illumination-comparison/1';
  const WINDOW = 1;
  const COOLDOWN = 1.5;
  const METHODS = Object.freeze([
    Object.freeze({ id: 'brightness', name: '整体亮度变化', threshold: 8, unit: '个百分点' }),
    Object.freeze({ id: 'pixels', name: '变化像素比例', threshold: .1, unit: '%' })
  ]);
  // Both rules see only the same whole-image statistics and sampling metadata.
  // Neither rule receives the scene configuration or the evaluation labels.
  function createRules() {
    let previous = null;
    const state = Object.fromEntries(METHODS.map(method => [method.id, { active: false, lastAt: -Infinity }]));
    return {
      analyze(stats) {
        if (!stats || !Number.isSafeInteger(stats.sequence) || stats.sequence < 0 ||
            !Number.isFinite(stats.sampledAt) || stats.sampledAt < 0 ||
            !Number.isFinite(stats.brightness) || stats.brightness < 0 || stats.brightness > 100 ||
            !Number.isFinite(stats.changedPercent) || stats.changedPercent < 0 || stats.changedPercent > 100 ||
            previous && (stats.sequence <= previous.sequence || stats.sampledAt < previous.sampledAt)) throw new Error('图像统计的数值或顺序无效。');
        const values = { brightness: previous ? Math.abs(stats.brightness - previous.brightness) : 0, pixels: previous ? stats.changedPercent : 0 };
        const result = {};
        for (const method of METHODS) {
          const item = state[method.id], active = !!previous && values[method.id] >= method.threshold;
          const event = active && !item.active && stats.sampledAt - item.lastAt >= COOLDOWN - 1e-8;
          if (event) item.lastAt = stats.sampledAt;
          item.active = active;
          result[method.id] = { value: values[method.id], active, event };
        }
        previous = { sequence: stats.sequence, sampledAt: stats.sampledAt, brightness: stats.brightness };
        return result;
      }
    };
  }
  function expectedChanges(config) {
    return ['cycle', 'soft-cycle'].includes(config.light)
      ? [{ time: 4, label: '环境变暗' }, { time: 8, label: '环境恢复' }] : [];
  }
  // Only the evaluator knows the environment schedule. It does not feed labels
  // into the rules. Matching uses image acquisition time; latency uses delivery time.
  function evaluate(record) {
    const now = record.frames.at(-1)?.time || 0;
    const seen = new Set(), packets = [];
    let missing = false;
    record.frames.forEach((frame, frameIndex) => {
      const camera = frame.observations.camera;
      if (!camera || seen.has(camera.sequence)) return;
      seen.add(camera.sequence);
      const vision = frame.observations.vision;
      if (!vision) { missing = true; return; }
      packets.push({ frameIndex, observedAt: frame.time, sequence: vision.sequence, sampledAt: vision.sampledAt,
        brightness: vision.brightness, changedPercent: vision.changedPercent });
    });
    const available = !missing && packets.length >= 2;
    const report = { schema: 'illumination-report/1', protocol: PROTOCOL,
      run: { id: record.id, name: record.name, createdAt: record.createdAt, config: { ...record.config }, duration: now },
      task: '发现环境光照切换', windowSeconds: WINDOW, cooldownSeconds: COOLDOWN,
      source: '对保存的图像统计按固定规则重新评估；未重算像素',
      available, reason: missing ? '记录没有完整图像统计，无法评价。' : packets.length < 2 ? '等待至少两张图像送达。' : '',
      complete: now >= 24 - 1e-8, samples: packets.length, expected: expectedChanges(record.config), methods: [], alarms: [] };
    if (!available) return report;
    const rules = createRules();
    let latest;
    for (const packet of packets) {
      // Deliberately whitelist the input instead of passing the record or frame.
      latest = rules.analyze({ sequence: packet.sequence, sampledAt: packet.sampledAt, brightness: packet.brightness, changedPercent: packet.changedPercent });
      for (const method of METHODS) if (latest[method.id].event) report.alarms.push({ method: method.id, frameIndex: packet.frameIndex,
        sequence: packet.sequence, sampledAt: packet.sampledAt, observedAt: packet.observedAt, value: latest[method.id].value, outcome: 'false-alarm', expectedAt: null });
    }
    for (const method of METHODS) {
      const alarms = report.alarms.filter(alarm => alarm.method === method.id);
      const outcomes = report.expected.map(change => {
        const match = alarms.find(alarm => alarm.expectedAt === null && alarm.sampledAt >= change.time - 1e-8 && alarm.sampledAt <= change.time + WINDOW + 1e-8);
        const deadline = change.time + WINDOW + record.config.delay;
        if (match) { match.outcome = 'matched'; match.expectedAt = change.time; }
        return { ...change, deadline, state: match ? 'detected' : now < change.time - 1e-8 ? 'upcoming' : now < deadline - 1e-8 ? 'pending' : 'missed',
          observedAt: match?.observedAt ?? null, sampledAt: match?.sampledAt ?? null,
          delay: match ? Math.max(0, match.observedAt - change.time) : null };
      });
      const detected = outcomes.filter(outcome => outcome.state === 'detected');
      report.methods.push({ ...method, latest: latest[method.id], outcomes,
        detected: detected.length, missed: outcomes.filter(outcome => outcome.state === 'missed').length,
        pending: outcomes.filter(outcome => outcome.state === 'pending').length,
        falseAlarms: alarms.filter(alarm => alarm.outcome === 'false-alarm').length,
        averageDelay: detected.length ? detected.reduce((sum, event) => sum + event.delay, 0) / detected.length : null });
    }
    return report;
  }
  return { PROTOCOL, METHODS, WINDOW, COOLDOWN, createRules, expectedChanges, evaluate };
});

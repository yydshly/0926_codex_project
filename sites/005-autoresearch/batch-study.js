(function (root, factory) {
  const node = typeof module === 'object' && module.exports;
  const api = factory(node ? require('./lab-core.js') : root.ObservationLab, node ? require('./illumination-study.js') : root.IlluminationStudy);
  if (node) module.exports = api;
  else root.BatchStudy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (lab, study) {
  'use strict';
  const PROTOCOL = 'illumination-suite/1';
  const CASES = Object.freeze([
    Object.freeze({ id: 'strong', name: '明显光照变化', light: 'cycle', cameraNoise: 0 }),
    Object.freeze({ id: 'soft', name: '轻微光照变化', light: 'soft-cycle', cameraNoise: 0 }),
    Object.freeze({ id: 'noise', name: '叠加图像噪声', light: 'cycle', cameraNoise: 24 }),
    Object.freeze({ id: 'constant', name: '恒定白昼', light: 'day', cameraNoise: 0 })
  ]);
  function plan(profile = 'full') {
    if (!['quick', 'full'].includes(profile)) throw new Error('不支持的批量方案。');
    const seeds = profile === 'full' ? [42, 43, 44] : [42];
    return CASES.flatMap(condition => seeds.map(seed => ({
      key: condition.id + '-' + seed, condition: condition.id, name: condition.name, seed,
      config: { layout: 'open', motion: 'wander', light: condition.light, seed, rate: 5, noise: 0, delay: .2, dropout: 0, cameraNoise: condition.cameraNoise }
    })));
  }
  function create(profile = 'full') {
    plan(profile);
    return { schema: 'illumination-batch/1', protocol: PROTOCOL, analysisProtocol: study.PROTOCOL,
      id: 'batch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString(), profile, status: 'partial', runs: [] };
  }
  function canonical(bundle) {
    const need = (condition, message) => { if (!condition) throw new Error(message); };
    need(bundle && bundle.schema === 'illumination-batch/1' && bundle.protocol === PROTOCOL && bundle.analysisProtocol === study.PROTOCOL, '不支持的批量文件或评测版本。');
    need(typeof bundle.id === 'string' && bundle.id.length > 0 && bundle.id.length <= 160 && typeof bundle.createdAt === 'string' && bundle.createdAt.length <= 160 && Number.isFinite(Date.parse(bundle.createdAt)), '批量编号或日期无效。');
    need(['quick', 'full'].includes(bundle.profile), '批量方案缺失或无效。');
    const jobs = plan(bundle.profile);
    need(Array.isArray(bundle.runs) && bundle.runs.length > 0 && bundle.runs.length <= jobs.length, '批量文件需含至少一轮完整实验。');
    need(bundle.status === (bundle.runs.length === jobs.length ? 'complete' : 'partial'), '批量完成状态与轮次不一致。');
    const ids = new Set();
    const runs = bundle.runs.map((entry, index) => {
      need(entry && entry.key === jobs[index].key, '实验顺序与固定方案不一致。');
      const record = lab.canonicalRecording(entry.record);
      need(record.schema === lab.VERSION && Object.keys(jobs[index].config).every(key => record.config[key] === jobs[index].config[key]), '实验配置与批量条件不一致。');
      need(record.frames.length === 481 && !ids.has(record.id), '批量实验未完成或编号重复。');
      ids.add(record.id);
      need(study.evaluate(record).available, '实验缺少完整图像统计。');
      return { key: entry.key, record };
    });
    return { schema: bundle.schema, protocol: PROTOCOL, analysisProtocol: study.PROTOCOL, id: bundle.id, createdAt: bundle.createdAt, profile: bundle.profile, status: bundle.status, runs };
  }
  function aggregateReports(reports) {
    return study.METHODS.map(method => {
      const outcomes = reports.map(report => report.methods.find(item => item.id === method.id));
      const detected = outcomes.reduce((sum, item) => sum + item.detected, 0);
      return { id: method.id, name: method.name, detected,
        expected: reports.reduce((sum, report) => sum + report.expected.length, 0),
        missed: outcomes.reduce((sum, item) => sum + item.missed, 0),
        falseAlarms: outcomes.reduce((sum, item) => sum + item.falseAlarms, 0),
        averageDelay: detected ? outcomes.reduce((sum, item) => sum + (item.averageDelay || 0) * item.detected, 0) / detected : null };
    });
  }
  function summarize(bundle) {
    const jobs = plan(bundle.profile);
    const reports = bundle.runs.map(entry => study.evaluate(entry.record));
    if (reports.some(report => !report.available || !report.complete)) throw new Error('汇总只接受完整且具有图像统计的实验。');
    return { schema: 'illumination-batch-report/1', protocol: PROTOCOL, analysisProtocol: study.PROTOCOL,
      batch: { id: bundle.id, createdAt: bundle.createdAt, profile: bundle.profile, status: bundle.status, completed: reports.length, planned: jobs.length },
      task: '固定条件与种子下的环境光照切换', simulatedSeconds: reports.length * 24,
      methods: aggregateReports(reports),
      conditions: CASES.map(condition => {
        const selected = reports.filter((_, index) => jobs[index].condition === condition.id);
        return { id: condition.id, name: condition.name, completed: selected.length,
          planned: jobs.filter(job => job.condition === condition.id).length, methods: aggregateReports(selected) };
      }),
      runs: reports.map((report, index) => ({ key: jobs[index].key, name: jobs[index].name, seed: jobs[index].seed, recordId: report.run.id,
        methods: report.methods.map(({ id, name, detected, missed, falseAlarms, averageDelay }) => ({ id, name, detected, missed, falseAlarms, averageDelay })) })) };
  }
  return { PROTOCOL, CASES, plan, create, canonical, summarize, aggregateReports };
});

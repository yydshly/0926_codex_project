(function (root) {
  'use strict';
  const $ = id => document.getElementById(id), suite = root.BatchStudy;
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  function init(hooks) {
    let bundle = null, archive = [], busy = false, paused = false, stop = false, importing = false, ready = false;
    let completed = 0, currentTime = 0, currentJob = null;
    const preview = $('batch-camera').getContext('2d');
    const notice = (message, error = false) => { $('batch-notice').textContent = message; $('batch-notice').classList.toggle('error', error); };
    function controls() {
      $('batch-start').disabled = $('batch-launch').disabled = !ready || busy || importing;
      $('batch-pause').disabled = !busy || stop; $('batch-pause').textContent = paused ? '继续批量实验' : '暂停批量实验';
      $('batch-stop').disabled = !busy || stop;
      $('batch-profile').disabled = $('batch-history').disabled = busy || importing;
      $('batch-import').disabled = busy || importing || !ready;
      $('batch-export').disabled = $('batch-report-export').disabled = busy || importing || !bundle?.runs.length;
      document.querySelectorAll('[data-batch-replay]').forEach(button => { button.disabled = busy || importing; });
    }
    function progress() {
      const planned = suite.plan(bundle?.profile || $('batch-profile').value).length;
      $('batch-progress').max = planned;
      $('batch-progress').value = completed + (busy && currentJob ? currentTime / 24 : 0);
      $('batch-count').textContent = completed + ' / ' + planned + ' 轮完成';
      $('batch-current').textContent = currentJob && busy ? currentJob.name + ' · 种子 ' + currentJob.seed + ' · ' + currentTime.toFixed(1) + ' / 24 s' : '每轮固定 24 秒模拟时间，批量加速计算。';
    }
    function refreshArchive() {
      const select = $('batch-history'); select.replaceChildren();
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = archive.length ? '选择已保存批次' : '暂无已保存批次'; select.append(placeholder);
      archive.forEach(item => { const option = document.createElement('option'); option.value = item.id; option.textContent = new Date(item.createdAt).toLocaleString('zh-CN', { hour12: false }) + ' · ' + item.runs.length + '/' + suite.plan(item.profile).length + ' 轮'; select.append(option); });
      select.value = bundle && archive.some(item => item.id === bundle.id) ? bundle.id : '';
    }
    const metricText = method => `${method.detected} / ${method.missed} / ${method.falseAlarms}`;
    function render() {
      $('batch-plan').textContent = $('batch-profile').value === 'full' ? '下一批：4 种条件 × 种子 42、43、44，共 12 轮。' : '下一批：4 种条件 × 种子 42，共 4 轮。';
      const report = bundle ? suite.summarize(bundle) : null;
      for (const id of ['brightness', 'pixels']) {
        const method = report?.methods.find(item => item.id === id);
        $('batch-' + id + '-counts').textContent = method && report.batch.completed ? metricText(method) : '—';
        $('batch-' + id + '-delay').textContent = method?.averageDelay != null ? method.averageDelay.toFixed(2) + ' s' : '—';
      }
      $('batch-total-time').textContent = report ? report.simulatedSeconds + ' s' : '0 s';
      $('batch-scope').textContent = report ? `只统计 ${report.batch.completed} 轮完整实验；共 ${report.methods[0].expected} 次预设光照事件。` : '等待运行。未完成的轮次不计入汇总。';
      const table = $('batch-conditions'); table.replaceChildren();
      (report?.conditions || suite.CASES.map(condition => ({ ...condition, completed: 0, planned: suite.plan($('batch-profile').value).filter(job => job.condition === condition.id).length }))).forEach(condition => {
        const row = document.createElement('tr');
        for (const [index, text] of [condition.name, condition.completed + ' / ' + condition.planned, ...(condition.methods ? condition.methods.map(method => condition.completed ? metricText(method) : '—') : ['—', '—'])].entries()) {
          const cell = document.createElement(index ? 'td' : 'th'); if (!index) cell.scope = 'row'; cell.textContent = text; row.append(cell);
        }
        table.append(row);
      });
      const list = $('batch-runs'); list.replaceChildren();
      for (const [index, run] of (report?.runs || []).entries()) {
        const item = document.createElement('div'); item.className = 'batch-run';
        const title = document.createElement('strong'); title.textContent = (index + 1) + '. ' + run.name + ' · 种子 ' + run.seed;
        const metrics = document.createElement('span'); metrics.textContent = 'A ' + metricText(run.methods[0]) + '　 B ' + metricText(run.methods[1]);
        const button = document.createElement('button'); button.dataset.batchReplay = String(index); button.textContent = '查看此轮 ↗';
        button.addEventListener('click', () => { if (busy || importing) return; hooks.openRecord(bundle.runs[index].record); $('workspace').scrollIntoView({ block: 'start' }); });
        item.append(title, metrics, button); list.append(item);
      }
      if (!report?.runs.length) { const text = document.createElement('p'); text.className = 'empty'; text.textContent = '每完成一轮，会在这里留下配置、结果和回放入口。'; list.append(text); }
      completed = bundle?.runs.length || 0; progress(); controls(); refreshArchive();
    }
    async function persist() {
      if (!bundle?.runs.length) return;
      archive = [bundle, ...archive.filter(item => item.id !== bundle.id)].slice(0, 3);
      try { await root.BatchStore.save(bundle); $('batch-storage').textContent = '已自动保存到本浏览器；保留最近 3 批。重要结果可导出完整实验包。'; }
      catch (error) { $('batch-storage').textContent = '浏览器保存不可用；结果仍在当前页面，请导出完整实验包。'; }
      refreshArchive();
    }
    async function start() {
      if (!ready || busy || importing) return;
      busy = true; paused = false; stop = false; completed = 0; currentTime = 0; currentJob = null;
      bundle = suite.create($('batch-profile').value);
      const jobs = suite.plan(bundle.profile);
      hooks.lock(true); render(); preview.clearRect(0, 0, 360, 240);
      $('batch-status').textContent = '批量运行中'; $('batch-storage').textContent = '每完成一轮自动保存；最近 3 批独立于单轮历史记录。';
      notice('当前单轮已暂停保留。批量按固定方案加速计算，实际耗时取决于设备。');
      $('batch-lab').scrollIntoView({ block: 'start', behavior: 'smooth' });
      try {
        for (const job of jobs) {
          if (stop) break;
          currentJob = job; currentTime = 0; progress();
          const record = await hooks.run(job, {
            async proceed() { while (paused && !stop) await wait(50); return !stop; },
            progress(time, image, sampledAt) {
              currentTime = time; progress();
              if (image) { preview.drawImage(image, 0, 0); $('batch-camera-time').textContent = sampledAt.toFixed(2) + ' s 采样'; }
            }
          });
          if (!record) break;
          bundle.runs.push({ key: job.key, record });
          bundle.status = bundle.runs.length === jobs.length ? 'complete' : 'partial';
          currentJob = null; currentTime = 0;
          await persist(); render();
          await wait(0);
        }
        $('batch-status').textContent = bundle.status === 'complete' ? '整批已完成' : '已停止 · 保留完成轮次';
        notice(bundle.status === 'complete' ? '整批完成。可展开每轮回放，或导出全部实验与汇总；原单轮仍可继续。' : `已停止，保留 ${bundle.runs.length} 轮完整实验。未完成轮次没有计入汇总，原单轮仍可继续。`);
      } catch (error) {
        $('batch-status').textContent = '运行中断'; notice('批量运行中断：' + error.message + ' 已完成轮次仍可导出。', true);
      } finally {
        busy = false; paused = false; stop = false; currentJob = null; currentTime = 0;
        hooks.lock(false); render();
      }
    }
    function download(data, filename) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    async function importFile(file) {
      if (!file || busy || importing) return;
      importing = true; controls();
      try {
        if (file.size > 20 * 1024 * 1024) throw new Error('文件超过 20 MB。');
        let parsed; try { parsed = JSON.parse(await file.text()); } catch (error) { throw new Error('文件不是有效的 JSON。'); }
        const checked = suite.canonical(parsed);
        const existing = archive.find(item => item.id === checked.id);
        if (existing && JSON.stringify(existing) !== JSON.stringify(checked)) checked.id = 'import-batch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
        bundle = checked; $('batch-profile').value = bundle.profile;
        await persist();
        $('batch-status').textContent = bundle.status === 'complete' ? '已导入完整批次' : '已导入部分批次';
        preview.clearRect(0, 0, 360, 240); $('batch-camera-time').textContent = '点击轮次回放图像';
        notice('实验包已校验。汇总由保存的图像统计重新计算，导入不替换当前单轮实验。');
      } catch (error) { notice('导入失败：' + error.message + ' 当前结果保持不变。', true); }
      finally { importing = false; $('batch-file').value = ''; render(); }
    }
    $('batch-start').addEventListener('click', start); $('batch-launch').addEventListener('click', start);
    $('batch-pause').addEventListener('click', () => { if (!busy || stop) return; paused = !paused; $('batch-status').textContent = paused ? '批量已暂停' : '批量运行中'; controls(); });
    $('batch-stop').addEventListener('click', () => { if (!busy) return; stop = true; paused = false; $('batch-status').textContent = '正在停止并保留结果'; controls(); });
    $('batch-profile').addEventListener('change', () => { $('batch-plan').textContent = $('batch-profile').value === 'full' ? '下一批：4 种条件 × 种子 42、43、44，共 12 轮。' : '下一批：4 种条件 × 种子 42，共 4 轮。'; if (!bundle) render(); });
    $('batch-history').addEventListener('change', () => {
      if (busy || importing) return;
      const item = archive.find(entry => entry.id === $('batch-history').value); if (!item) return;
      bundle = item; $('batch-profile').value = bundle.profile; $('batch-status').textContent = bundle.status === 'complete' ? '已载入完整批次' : '已载入部分批次';
      preview.clearRect(0, 0, 360, 240); $('batch-camera-time').textContent = '点击轮次回放图像'; render(); notice('已切换保存的批次。');
    });
    $('batch-import').addEventListener('click', () => $('batch-file').click());
    $('batch-file').addEventListener('change', () => importFile($('batch-file').files[0]));
    $('batch-export').addEventListener('click', () => { if (!busy && bundle?.runs.length) download(bundle, bundle.id + '.json'); });
    $('batch-report-export').addEventListener('click', () => { if (!busy && bundle?.runs.length) download(suite.summarize(bundle), bundle.id + '-report.json'); });
    render();
    root.BatchStore.load().then(saved => {
      archive = saved.flatMap(item => { try { return [suite.canonical(item)]; } catch (error) { return []; } });
      bundle = archive[0] || null;
      if (bundle) { $('batch-profile').value = bundle.profile; $('batch-status').textContent = bundle.status === 'complete' ? '已恢复完整批次' : '已恢复部分批次'; notice('已恢复最近保存的批量结果。'); }
      $('batch-storage').textContent = '自动保存最近 3 批；单轮历史记录继续独立保留。';
    }).catch(() => { $('batch-storage').textContent = '浏览器保存不可用；运行后可导出完整实验包保留结果。'; }).finally(() => { ready = true; render(); });
  }
  root.BatchWorkbench = { init };
})(window);

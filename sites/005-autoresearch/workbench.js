(function () {
  'use strict';
  const THREE = window.THREE, lab = window.ObservationLab, imageObserver = window.ImageObserver;
  const study = window.IlluminationStudy, cameraEffects = window.CameraEffects;
  const $ = id => document.getElementById(id);
  const form = $('config-form');
  const layoutNames = { open: '开阔平地', wall: '中央遮挡墙', blocks: '建筑方块' };
  const motionNames = { wander: '不规则飞行', orbit: '空间环绕', eight: '空间 8 字' };
  const motionDescriptions = {
    wander: '不规则飞行：方向、速度与高度逐渐变化；相同种子可复现这条随机轨迹。',
    orbit: '空间环绕：沿规定的环形路线移动，同时上下起伏；种子决定起始阶段。',
    eight: '空间 8 字：沿规定的 8 字路线交叉移动，同时改变高度；种子决定起始阶段。'
  };
  const STORAGE = 'autoresearch-observation-records-v1';
  const CONFIG_KEY = 'autoresearch-observation-config-v1';
  let engine, config, liveFrame, replayRecord = null, mode = 'ready', playing = false, cursor = 0;
  let framesBySequence = new Map(), history = [], accumulator = 0, lastTime = 0, lastCameraSequence = -1;
  let renderer, sensorRenderer, currentStudy, batchBusy = false;
  const cameraOutput = $('camera-view').getContext('2d');
  const note = (text, error = false) => { $('notice').textContent = text; $('notice').classList.toggle('error', error); };
  if (!THREE || !lab || !imageObserver || !study || !cameraEffects || !window.BatchWorkbench || !window.BatchStudy || !window.BatchStore) { note('本地实验模块未能加载，请重新打开页面。', true); return; }
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $('world-view'), antialias: true });
    sensorRenderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (error) { note('浏览器无法建立 WebGL 场景。请启用硬件加速后重试。', true); $('run').disabled = true; $('quick-run').disabled = true; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  sensorRenderer.outputColorSpace = THREE.SRGBColorSpace;
  sensorRenderer.setSize(360, 240);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#102735');
  scene.fog = new THREE.Fog('#102735', 75, 150);
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 180);
  camera.layers.enable(1);
  const sensorCamera = new THREE.PerspectiveCamera(62, 1.5, .1, 110);
  sensorCamera.position.set(-23, 10, 22);
  sensorCamera.lookAt(1, 7, 0);
  const view = { azimuth: .9, elevation: .6, radius: 65, dragging: false, x: 0, y: 0 };
  const ambient = new THREE.HemisphereLight('#d9f8ff', '#385151', 2.1); scene.add(ambient);
  const sun = new THREE.DirectionalLight('#fff3d5', 2.3); sun.position.set(10, 30, 15); scene.add(sun);
  const mat = color => new THREE.MeshStandardMaterial({ color, roughness: .8, metalness: .12 });
  function mesh(geometry, material, parent = scene) { const object = new THREE.Mesh(geometry, material); parent.add(object); return object; }
  const floor = mesh(new THREE.PlaneGeometry(58, 44), mat('#294443')); floor.rotation.x = -Math.PI / 2;
  const grid = new THREE.GridHelper(52, 26, '#729395', '#456064'); grid.position.y = .025; scene.add(grid);
  const obstacles = new THREE.Group(); scene.add(obstacles);
  const physical = [floor];
  const drone = new THREE.Group(); scene.add(drone);
  mesh(new THREE.BoxGeometry(1.65, .45, 1), mat('#ff9d4d'), drone);
  const canopy = mesh(new THREE.BoxGeometry(.85, .35, .7), mat('#dee9e9'), drone); canopy.position.y = .3;
  const blades = [];
  for (const [x, z] of [[1.4, 1], [1.4, -1], [-1.4, 1], [-1.4, -1]]) {
    const arm = mesh(new THREE.BoxGeometry(2, .13, .15), mat('#597681'), drone);
    arm.position.set(x / 2, 0, z / 2); arm.rotation.y = -Math.atan2(z, x);
    const ring = mesh(new THREE.TorusGeometry(.4, .05, 8, 24), mat('#edc497'), drone);
    ring.rotation.x = Math.PI / 2; ring.position.set(x, .04, z);
    const blade = mesh(new THREE.BoxGeometry(.76, .03, .1), mat('#bdd5d7'), drone);
    blade.position.copy(ring.position); blades.push(blade);
  }
  physical.push(drone);
  function tripod(position, color) {
    const group = new THREE.Group(); group.position.copy(position); scene.add(group);
    const mast = mesh(new THREE.CylinderGeometry(.17, .23, position.y, 12), mat('#709095'), group); mast.position.y = -position.y / 2;
    const base = mesh(new THREE.CylinderGeometry(1, 1.35, .35, 20), mat('#3c5d65'), group); base.position.y = -position.y + .17;
    const head = mesh(new THREE.BoxGeometry(1.2, .9, 1.5), mat(color), group);
    const lens = mesh(new THREE.CircleGeometry(.3, 24), new THREE.MeshBasicMaterial({ color: '#98ead9', side: THREE.DoubleSide }), head); lens.position.z = .76;
    return { group, head };
  }
  const optical = tripod(sensorCamera.position, '#8babdf');
  optical.head.lookAt(1, 7, 0);
  // The camera housing is a world-view illustration, outside its own optical image.
  optical.group.traverse(object => object.layers.set(1));
  const rangeOrigin = new THREE.Vector3(-20, 5, 6), rangeDirection = new THREE.Vector3(1, 0, 0);
  const rangeDevice = tripod(rangeOrigin, '#77bcb3'); rangeDevice.head.rotation.y = Math.PI / 2;
  const raycaster = new THREE.Raycaster(rangeOrigin, rangeDirection, 0, 44);
  const rangeLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#80f0cf', transparent: true, opacity: .75 }));
  rangeLine.layers.set(1); scene.add(rangeLine);
  const rangeDot = mesh(new THREE.SphereGeometry(.18, 12, 8), new THREE.MeshBasicMaterial({ color: '#caffbd' })); rangeDot.layers.set(1);
  const trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#f5ac71', transparent: true, opacity: .6 })); trail.layers.set(1); scene.add(trail);

  function readForm() { return lab.normalize(Object.fromEntries([...form.elements].filter(field => field.name).map(field => [field.name, field.value]))); }
  function populate(value) { for (const [key, item] of Object.entries(lab.normalize(value))) form.elements[key].value = String(item); }
  function configureWorld(value, describe = true) {
    if (describe) {
    $('flight-description').textContent = motionDescriptions[value.motion] + ' 当前没有避障或碰撞响应。';
    $('sensor-description').textContent = `本轮观测：每秒采样 ${value.rate} 次，延迟 ${value.delay} 秒送达。图像噪声${value.cameraNoise ? '为 ±' + value.cameraNoise + ' 灰度级' : '关闭'}；测距扰动${value.noise ? '为 ±' + value.noise + ' 场景单位' : '关闭'}，测距丢包${value.dropout ? '设为 ' + Math.round(value.dropout * 100) + '%' : '关闭'}。两种观察方法读取同一张处理后的相机图像统计。`;
    }
    while (obstacles.children.length) {
      const object = obstacles.children[0]; object.geometry.dispose(); object.material.dispose(); obstacles.remove(object);
    }
    physical.splice(2);
    const buildings = value.layout === 'wall' ? [[0, 6, 0, 1.5, 12, 25]] : value.layout === 'blocks' ? [[-3, 5, 5, 5, 10, 7], [8, 3.5, -7, 7, 7, 7]] : [];
    for (const [x, y, z, width, height, depth] of buildings) {
      const building = mesh(new THREE.BoxGeometry(width, height, depth), mat('#53737c'), obstacles);
      building.position.set(x, y, z); physical.push(building);
    }
    ambient.intensity = value.light === 'day' ? 2.1 : .5;
    sun.intensity = value.light === 'day' ? 2.3 : .55;
    scene.background.set(value.light === 'day' ? '#102735' : '#080f1b');
    scene.fog.color.copy(scene.background);
  }
  function positionWorld(position, time, settings = config) {
    const dusk = settings.light === 'dusk' || settings.light === 'cycle' && time >= 4 && time < 8;
    const soft = settings.light === 'soft-cycle' && time >= 4 && time < 8;
    ambient.intensity = dusk ? .5 : soft ? 1.2 : 2.1; sun.intensity = dusk ? .55 : soft ? 1.3 : 2.3;
    scene.background.set(dusk ? '#080f1b' : '#102735'); scene.fog.color.copy(scene.background);
    drone.position.set(position.x, position.y, position.z);
    drone.rotation.y = time * .32;
    // Only physical scene meshes enter sensor sampling. World annotations use a separate render layer.
    blades.forEach((blade, index) => { blade.rotation.y = time * (index % 2 ? 35 : -35); });
    scene.updateMatrixWorld(true);
  }
  function distanceInWorld() { const hits = raycaster.intersectObjects(physical, true); return hits.length ? hits[0].distance : null; }
  function copyCamera(target, sequence, settings = config) {
    const context = target.getContext('2d');
    context.drawImage(sensorRenderer.domElement, 0, 0);
    if (settings.cameraNoise) context.putImageData(cameraEffects.applyNoise(context.getImageData(0, 0, 360, 240), settings.cameraNoise, settings.seed, sequence), 0, 0);
  }
  function drawMeasurePath() {
    const distance = distanceInWorld();
    const end = rangeOrigin.clone().addScaledVector(rangeDirection, distance === null ? 44 : distance);
    rangeLine.geometry.dispose(); rangeLine.geometry = new THREE.BufferGeometry().setFromPoints([rangeOrigin, end]);
    rangeDot.position.copy(end); rangeDot.visible = distance !== null;
  }
  function sample(world, sequence) {
    positionWorld(world.position, world.time);
    sensorRenderer.render(scene, sensorCamera);
    const buffer = document.createElement('canvas'); buffer.width = 360; buffer.height = 240;
    copyCamera(buffer, sequence);
    framesBySequence.set(sequence, buffer);
    const oldest = sequence - Math.ceil(config.delay * config.rate) - 3;
    for (const key of framesBySequence.keys()) if (key < oldest) framesBySequence.delete(key);
    return { distance: distanceInWorld() };
  }
  function reset() {
    if (batchBusy) return;
    playing = false; mode = 'ready'; replayRecord = null; cursor = 0; accumulator = 0;
    config = readForm(); configureWorld(config); framesBySequence.clear(); lastCameraSequence = -1;
    const observer = imageObserver.createObserver();
    engine = new lab.Experiment(config, sample, packet => {
      const image = framesBySequence.get(packet.sequence);
      if (!image) throw new Error('已送达的相机帧缺失。');
      return observer.analyze(image.getContext('2d').getImageData(0, 0, 360, 240), packet);
    });
    liveFrame = engine.frames[0];
    cameraOutput.clearRect(0, 0, 360, 240);
    trail.geometry.dispose(); trail.geometry = new THREE.BufferGeometry();
    display(liveFrame); updateControls();
  }
  function currentFrames() { return replayRecord ? replayRecord.frames : engine.frames; }
  function frameAtTime(frames, time) { return frames[Math.min(frames.length - 1, Math.max(0, Math.round(time / lab.STEP)))]; }
  function renderReplayCamera(frame) {
    const packet = frame.observations.camera;
    if (!packet) { cameraOutput.clearRect(0, 0, 360, 240); return; }
    const past = frameAtTime(currentFrames(), packet.sampledAt);
    positionWorld(past.groundTruth, packet.sampledAt);
    sensorRenderer.render(scene, sensorCamera);
    copyCamera($('camera-view'), packet.sequence);
    positionWorld(frame.groundTruth, frame.time);
  }
  function renderLiveCamera(frame) {
    const packet = frame.observations.camera;
    if (!packet || packet.sequence === lastCameraSequence) return;
    const image = framesBySequence.get(packet.sequence);
    if (image) cameraOutput.drawImage(image, 0, 0);
    lastCameraSequence = packet.sequence;
  }
  function updateChart(frames, index) {
    const packets = new Map();
    for (const frame of frames.slice(Math.max(0, index - 200), index + 1)) {
      const sample = frame.observations.range; if (sample) packets.set(sample.sequence, sample);
    }
    const samples = [...packets.values()].slice(-40);
    let path = '', open = false;
    samples.forEach((sample, i) => {
      if (sample.distance === null) { open = false; return; }
      const x = samples.length < 2 ? 150 : i / (samples.length - 1) * 300;
      const y = 56 - sample.distance / 44 * 52;
      path += `${open ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `; open = true;
    });
    $('range-path').setAttribute('d', path);
  }
  function seek(index) {
    if (batchBusy) return;
    playing = false; mode = 'replay'; cursor = index;
    display(currentFrames()[cursor], true); updateControls();
  }
  function displayImageObservation(frame, frames, index) {
    const vision = frame.observations.vision;
    const legacy = replayRecord?.schema === lab.LEGACY_VERSION;
    $('vision-state').textContent = vision ? { baseline: '建立首帧基准', quiet: '画面变化较小', changed: '检测到画面变化', brightness: '亮度明显变化' }[vision.state] : legacy ? '旧记录未包含图像观察' : '等待图像送达';
    $('vision-brightness').textContent = vision ? vision.brightness.toFixed(2) + '%' : '—';
    $('vision-change').textContent = vision ? vision.changedPercent.toFixed(3) + '%' : '—';
    $('vision-age').textContent = vision ? vision.sampledAt.toFixed(2) + ' s 采样' : '尚无图像统计';
    const events = lab.imageEvents(frames.slice(0, index + 1));
    $('vision-count').textContent = String(events.length);
    $('camera-event-count').textContent = String(events.length);
    const latest = events.at(-1);
    $('camera-change').textContent = legacy ? '旧记录无图像统计' : latest ? latest.observedAt.toFixed(2) + ' s · 最近' + (latest.event === 'brightness-change' ? '亮度变化' : '画面变化') : vision ? '正在比较整幅图像' : '等待图像分析';
    const list = $('image-events'); list.replaceChildren();
    if (!events.length) {
      const p = document.createElement('p'); p.className = 'empty';
      p.textContent = legacy ? '这份旧记录只有相机和测距数据，回放时不会补造图像观察结果。' : '本时刻之前尚无图像事件。可点击“体验方法对照”，查看光照变化如何触发记录。'; list.append(p);
    }
    for (const event of events.slice(-6).reverse()) {
      const button = document.createElement('button'); button.className = 'image-event';
      const time = document.createElement('time'); time.textContent = event.observedAt.toFixed(2) + ' s';
      const text = document.createElement('span');
      text.textContent = (event.event === 'brightness-change' ? '亮度变化' : '画面变化') + ' · 变化像素 ' + event.changedPercent.toFixed(2) + '%';
      const suffix = document.createElement('small'); suffix.textContent = '回放此刻 ↗'; button.append(time, text, suffix);
      button.addEventListener('click', () => seek(event.frameIndex)); list.append(button);
    }
  }
  function displayStudy(frame, frames, index) {
    const record = replayRecord || { id: engine.id, name: layoutNames[config.layout] + ' · ' + motionNames[config.motion], createdAt: engine.createdAt };
    currentStudy = study.evaluate({ ...record, config, frames: frames.slice(0, index + 1) });
    const report = currentStudy;
    $('study-status').textContent = !report.available ? report.reason : report.complete ? '24 秒记录已完成' : '当前时刻的阶段结果';
    $('study-source').textContent = (replayRecord ? '正在评估导入或保存记录。' : '正在评估本轮已送达图像。') + '两种规则使用同一组保存的图像统计；回放按本页固定规则重新评估，不重算像素。';
    $('study-scenario').textContent = report.expected.length ? '本轮正确答案：4.00 秒变暗，8.00 秒恢复。' : '本轮光照恒定：没有预设的光照切换，变化报警计为本任务的误报。';
    for (const method of study.METHODS) {
      const result = report.methods.find(item => item.id === method.id);
      $(method.id + '-detected').textContent = result ? result.detected + ' / ' + report.expected.filter(event => event.time <= frame.time + 1e-8).length : '—';
      $(method.id + '-missed').textContent = result ? String(result.missed) : '—';
      $(method.id + '-false').textContent = result ? String(result.falseAlarms) : '—';
      $(method.id + '-delay').textContent = result?.averageDelay !== null && result ? result.averageDelay.toFixed(2) + ' s' : '—';
      $(method.id + '-pending').textContent = result ? result.pending ? result.pending + ' 次变化仍在等待判定' : result.latest.active ? '当前持续满足规则；回落后才会再次触发新事件。' : '当前未触发 · 已送达 ' + report.samples + ' 张图像' : report.reason;
    }
    const outcomes = $('study-outcomes'); outcomes.replaceChildren();
    for (const change of report.expected) {
      const row = document.createElement('tr');
      const label = document.createElement('th'); label.scope = 'row'; label.textContent = change.time.toFixed(2) + ' s · ' + change.label; row.append(label);
      for (const method of study.METHODS) {
        const result = report.methods.find(item => item.id === method.id)?.outcomes.find(item => item.time === change.time);
        const cell = document.createElement('td');
        if (result?.state === 'detected') {
          const button = document.createElement('button'); button.className = 'study-replay'; button.textContent = result.observedAt.toFixed(2) + ' s 发现 ↗';
          button.addEventListener('click', () => { seek(Math.round(result.observedAt / lab.STEP)); document.querySelector('.observation').scrollIntoView({ block: 'start' }); }); cell.append(button);
        } else cell.textContent = result ? { upcoming: '尚未发生', pending: '等待观测 / 窗口未结束', missed: '漏报' }[result.state] : '等待统计';
        row.append(cell);
      }
      outcomes.append(row);
    }
    if (!report.expected.length) {
      const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 3; cell.textContent = '恒定光照场景用于检查误报。'; row.append(cell); outcomes.append(row);
    }
    const events = $('study-alarms'); events.replaceChildren();
    for (const alarm of report.alarms.slice(-8).reverse()) {
      const button = document.createElement('button'); button.className = 'study-alarm ' + (alarm.outcome === 'matched' ? 'matched' : 'false-alarm');
      button.textContent = alarm.observedAt.toFixed(2) + ' s · ' + study.METHODS.find(method => method.id === alarm.method).name + ' · ' + (alarm.outcome === 'matched' ? '对应光照切换' : '本光照任务的误报') + ' · 回放 ↗';
      button.addEventListener('click', () => { seek(alarm.frameIndex); document.querySelector('.observation').scrollIntoView({ block: 'start' }); }); events.append(button);
    }
    if (!report.alarms.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = report.available ? '当前还没有方法报警。' : report.reason; events.append(p); }
  }
  function display(frame, forceCamera = false) {
    positionWorld(frame.groundTruth, frame.time);
    drawMeasurePath();
    const observations = frame.observations;
    if (mode === 'replay' || forceCamera) renderReplayCamera(frame); else renderLiveCamera(frame);
    $('camera-wait').hidden = !!observations.camera;
    $('camera-clock').textContent = observations.camera ? observations.camera.sampledAt.toFixed(2) + ' s 采样' : '未送达';
    const result = lab.interpret(observations, frame.time);
    $('observation-title').textContent = result.title; $('observation-detail').textContent = result.detail;
    $('age').textContent = result.age === null ? '—' : result.age.toFixed(2) + ' s';
    $('distance').textContent = observations.range?.distance !== null && observations.range ? observations.range.distance.toFixed(2) : '—';
    $('range-state').textContent = { waiting: '等待数据', return: '有效回波', empty: '无回波', dropped: '丢包' }[result.state];
    $('clock').textContent = frame.time.toFixed(2) + ' / 24 s';
    $('replay-time').textContent = frame.time.toFixed(2) + ' s';
    const frames = currentFrames();
    const index = mode === 'replay' ? cursor : frames.length - 1;
    const summary = lab.summarize({ frames: frames.slice(0, index + 1) });
    $('sample-count').textContent = summary.valid + ' / ' + summary.delivered;
    $('timeline').max = frames.length - 1; $('timeline').value = index;
    updateChart(frames, index);
    displayImageObservation(frame, frames, index);
    displayStudy(frame, frames, index);
    const points = frames.slice(Math.max(0, index - 160), index + 1).map(item => new THREE.Vector3(item.groundTruth.x, item.groundTruth.y, item.groundTruth.z));
    trail.geometry.dispose(); trail.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }
  function updateControls() {
    const frames = currentFrames(), started = frames.length > 1 || playing || mode === 'replay';
    for (const field of form.elements) field.disabled = started;
    document.querySelectorAll('[data-preset]').forEach(button => { button.disabled = started; });
    $('world-ready').hidden = started;
    $('run').textContent = playing ? '暂停' : mode === 'replay' ? '播放回放 ▶' : engine.time >= lab.DURATION ? '本轮已结束' : started ? '继续实验 ▶' : '开始实验 ▶';
    $('run').disabled = mode !== 'replay' && engine.time >= lab.DURATION;
    $('timeline').disabled = playing || frames.length < 2;
    $('save-run').disabled = frames.length < 2 || !!replayRecord || playing;
    $('export-run').disabled = frames.length < 2 || playing;
    $('export-report').disabled = !currentStudy?.available || playing;
    $('return-live').hidden = mode !== 'replay';
    $('run-state').textContent = mode === 'replay' ? playing ? '回放播放中' : '查看历史时刻' : playing ? '实验运行中' : engine.time >= lab.DURATION ? '本轮已结束' : started ? '已暂停' : '等待开始';
    $('phase').textContent = mode === 'replay' ? '回放' : playing ? '采样与记录' : started ? '暂停 / 已结束' : '配置';
    $('replay-note').textContent = mode === 'replay' ? '按记录重绘图像，不重新生成测距样本' : playing ? '暂停后可拖动，也可保存本轮实验' : '拖动查看已记录时刻';
  }
  function toggleRun() {
    if (batchBusy) return;
    if (mode === 'replay' && !playing && cursor >= currentFrames().length - 1) cursor = 0;
    playing = !playing; accumulator = 0;
    if (mode === 'ready' && playing) mode = 'live';
    updateControls();
  }
  function makeRecord() { return replayRecord || engine.recording(layoutNames[config.layout] + ' · ' + motionNames[config.motion]); }
  function loadReplay(record) {
    if (batchBusy) return;
    playing = false; mode = 'replay'; replayRecord = record; config = record.config; populate(config); configureWorld(config);
    cursor = 0; display(record.frames[0], true); updateControls();
    note('已加载记录。观测值与图像事件来自文件；相机画面按历史状态重绘。可返回当前实验继续运行。');
  }
  function showRecords() {
    const list = $('record-list'); list.replaceChildren();
    if (!history.length) { const text = document.createElement('p'); text.className = 'empty'; text.textContent = '开始并保存一次实验，记录会出现在这里。'; list.append(text); }
    for (const record of history) {
      const button = document.createElement('button'); button.className = 'record-item';
      const copy = document.createElement('span'), name = document.createElement('strong'), meta = document.createElement('small'), action = document.createElement('span');
      name.textContent = record.name; meta.textContent = new Date(record.createdAt).toLocaleString('zh-CN', { hour12: false }) + ' · ' + record.frames.at(-1).time.toFixed(1) + ' s · 种子 ' + record.config.seed;
      action.textContent = '查看回放 ↗'; copy.append(name, meta); button.append(copy, action);
      button.addEventListener('click', () => {
        loadReplay(record);
        $('workspace').scrollIntoView({ block: 'start' });
      });
      list.append(button);
    }
    const panel = $('comparison'); panel.replaceChildren();
    const title = document.createElement('h3'); title.textContent = '最近两次实验对照'; panel.append(title);
    if (history.length < 2) { const p = document.createElement('p'); p.textContent = '保存两次实验后可查看观测差异。'; panel.append(p); return; }
    const records = [history[1], history[0]], summaries = records.map(lab.summarize);
    const table = document.createElement('table');
    const rows = [ ['项目', '上一次', '最近一次'], ['场地', ...records.map(r => layoutNames[r.config.layout])], ['时长', ...summaries.map(s => s.duration.toFixed(1) + ' s')],
      ['延迟 / 扰动', ...records.map(r => r.config.delay + ' s / ±' + r.config.noise)], ['已送达样本', ...summaries.map(s => String(s.delivered))],
      ['有效距离回波', ...summaries.map(s => String(s.valid))], ['丢包 / 无回波', ...summaries.map(s => s.dropped + ' / ' + s.empty)],
      ['图像变化事件', ...records.map(r => r.schema === lab.LEGACY_VERSION ? '旧版未记录' : String(lab.imageEvents(r.frames).length))],
      ['光照 / 图像噪声', ...records.map(r => ({ day: '白昼', dusk: '黄昏', cycle: '明显变化', 'soft-cycle': '轻微变化' }[r.config.light]) + ' / ±' + (r.config.cameraNoise || 0))],
      ['平均有效距离', ...summaries.map(s => s.average === null ? '—' : s.average.toFixed(2))] ];
    rows.forEach((row, index) => { const tr = document.createElement('tr'); row.forEach(value => { const cell = document.createElement(index ? 'td' : 'th'); cell.textContent = value; tr.append(cell); }); table.append(tr); });
    const p = document.createElement('p'); p.textContent = '这些值描述观测差异，没有整体优劣评分。场地、时长或配置不同的记录不能直接用来评判算法。'; panel.append(table, p);
  }
  function retain(record) {
    history = [record, ...history.filter(item => item.id !== record.id)].slice(0, 6);
    try { localStorage.setItem(STORAGE, JSON.stringify(history)); note('本轮实验已保存到当前浏览器，可以在下方回放。重要记录请同时导出。'); }
    catch (error) { note('浏览器存储不可用或已满。本轮仍保留在当前页面，请立即导出文件。', true); }
    showRecords();
  }
  function saveRun() { retain(makeRecord()); }
  async function importRun(file) {
    if (!file || batchBusy) return;
    const buttons = [...document.querySelectorAll('[data-import]')]; buttons.forEach(button => { button.disabled = true; });
    try {
      if (file.size > 4 * 1024 * 1024) throw new Error('文件超过 4 MB，请选择本实验台导出的 JSON。');
      let parsed; try { parsed = JSON.parse(await file.text()); } catch (error) { throw new Error('文件不是有效的 JSON。'); }
      const record = lab.canonicalRecording(parsed);
      if (batchBusy) throw new Error('批量实验正在运行，请结束后再导入单轮记录。');
      const sameID = history.find(item => item.id === record.id);
      if (sameID && JSON.stringify(sameID) !== JSON.stringify(record)) record.id = 'import-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      retain(record); loadReplay(record);
      note('文件已导入并保存到记录列表。格式和时间顺序已检查，文件内的图像统计没有重新计算。');
    } catch (error) { note('导入失败：' + error.message + ' 当前实验保持不变。', true); }
    finally { buttons.forEach(button => { button.disabled = false; }); $('import-file').value = ''; }
  }
  function exportRun() {
    const record = makeRecord(), blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'observation-' + record.id + '.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    note('已导出配置、世界状态、传感器观测与图像事件。可通过“导入实验 JSON”重新打开；文件不含逐帧图片。');
  }
  function startStudy(value) {
    if (batchBusy) return;
    if (engine.frames.length > 1) retain(engine.recording(layoutNames[engine.config.layout] + ' · ' + motionNames[engine.config.motion]));
    populate(value); reset();
    document.querySelectorAll('[data-preset]').forEach(button => button.classList.toggle('chosen', button.dataset.preset === 'vision' && value.light === 'cycle'));
    toggleRun(); note('对照实验已开始。两种方法使用相同图像，光照正确答案只提供给评估器；运行结束后可导出报告。');
    document.querySelector('.observation').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  function resize() {
    const holder = $('world-view').parentElement;
    const width = Math.max(1, holder.clientWidth), height = Math.max(1, holder.clientHeight);
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  function animate(now) {
    const elapsed = lastTime ? Math.min((now - lastTime) / 1000, .1) : 0; lastTime = now;
    if (batchBusy) { requestAnimationFrame(animate); return; }
    if (playing) {
      accumulator += elapsed;
      while (accumulator >= lab.STEP) {
        accumulator -= lab.STEP;
        if (mode === 'replay') {
          cursor = Math.min(currentFrames().length - 1, cursor + 1); display(currentFrames()[cursor], true);
          if (cursor >= currentFrames().length - 1) { playing = false; updateControls(); break; }
        } else {
          liveFrame = engine.step(); display(liveFrame);
          if (engine.time >= lab.DURATION) { playing = false; updateControls(); note('本轮 24 秒实验完成。现在可以回放、保存或导出。'); break; }
        }
      }
    }
    const { radius, elevation, azimuth } = view;
    camera.position.set(radius * Math.cos(elevation) * Math.cos(azimuth), 4 + radius * Math.sin(elevation), radius * Math.cos(elevation) * Math.sin(azimuth));
    camera.lookAt(0, 4, 0); renderer.render(scene, camera); requestAnimationFrame(animate);
  }
  $('run').addEventListener('click', toggleRun); $('quick-run').addEventListener('click', toggleRun);
  $('reset').addEventListener('click', () => { reset(); note('已建立新实验，配置现在可以修改。已保存的历史记录仍在下方。'); });
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', () => { config = readForm(); populate(config); reset(); document.querySelectorAll('[data-preset]').forEach(button => button.classList.remove('chosen')); });
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
    const preset = button.dataset.preset;
    const value = { ...lab.DEFAULTS, layout: preset === 'open' || preset === 'vision' ? 'open' : 'wall', ...(preset === 'noisy' ? { noise: .5, delay: .6, dropout: .4, light: 'dusk' } : {}), ...(preset === 'vision' ? { light: 'cycle', noise: 0 } : {}) };
    populate(value); reset(); document.querySelectorAll('[data-preset]').forEach(item => item.classList.toggle('chosen', item === button));
  }));
  $('observe-demo').addEventListener('click', () => {
    startStudy({ ...lab.DEFAULTS, layout: 'open', light: 'cycle', noise: 0 });
  });
  document.querySelectorAll('[data-study]').forEach(button => button.addEventListener('click', () => {
    const preset = button.dataset.study;
    startStudy({ ...lab.DEFAULTS, layout: 'open', noise: 0, light: preset === 'soft' ? 'soft-cycle' : preset === 'constant' ? 'day' : 'cycle', cameraNoise: preset === 'noise' ? 24 : 0 });
  }));
  $('repeat-study').addEventListener('click', () => startStudy({ ...config }));
  $('export-report').addEventListener('click', () => {
    if (!currentStudy?.available) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(currentStudy, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'illumination-' + currentStudy.run.id + '.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    note('已导出当前时刻的光照对照报告，包含配置、规则版本、事件匹配和两种方法的统计。回放数据请另行导出“实验 JSON”。');
  });
  $('config-save').addEventListener('click', () => {
    try { localStorage.setItem(CONFIG_KEY, JSON.stringify(readForm())); note('配置已保存。下次打开此实验台会恢复这些设置。'); }
    catch (error) { note('当前浏览器不允许保存配置，请通过实验导出保留设置。', true); }
  });
  $('timeline').addEventListener('input', () => {
    seek(Number($('timeline').value));
  });
  $('return-live').addEventListener('click', () => {
    playing = false; mode = 'live'; replayRecord = null; config = engine.config; populate(config); configureWorld(config);
    display(liveFrame, true); lastCameraSequence = -1; updateControls();
    note('已回到当前实验的最新时刻。原来的图像观察状态保留，可以继续运行。');
  });
  $('save-run').addEventListener('click', saveRun); $('export-run').addEventListener('click', exportRun);
  document.querySelectorAll('[data-import]').forEach(button => button.addEventListener('click', () => $('import-file').click()));
  $('import-file').addEventListener('change', () => importRun($('import-file').files[0]));
  $('view-reset').addEventListener('click', () => { view.azimuth = .9; view.elevation = .6; view.radius = 65; });
  const canvas = $('world-view');
  canvas.addEventListener('pointerdown', event => { view.dragging = true; view.x = event.clientX; view.y = event.clientY; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointermove', event => {
    if (!view.dragging) return;
    view.azimuth -= (event.clientX - view.x) * .006;
    view.elevation = Math.max(.12, Math.min(1.35, view.elevation + (event.clientY - view.y) * .005)); view.x = event.clientX; view.y = event.clientY;
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { view.dragging = false; });
  canvas.addEventListener('wheel', event => { event.preventDefault(); view.radius = Math.max(36, Math.min(95, view.radius + Math.sign(event.deltaY) * 3)); }, { passive: false });
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE) || '[]');
    history = Array.isArray(saved) ? saved.filter(lab.validRecording).slice(0, 6).map(lab.canonicalRecording) : [];
    const stored = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); if (stored) populate(lab.normalize(stored));
  } catch (error) { note('本地保存的数据无法读取，本次使用默认配置。', true); }
  window.addEventListener('resize', resize); new ResizeObserver(resize).observe(canvas.parentElement);
  reset(); showRecords(); resize(); requestAnimationFrame(animate);
  window.BatchWorkbench.init({
    openRecord: loadReplay,
    lock(value) {
      if (value) {
        playing = false; accumulator = 0;
        if (engine.frames.length > 1) retain(engine.recording(layoutNames[engine.config.layout] + ' · ' + motionNames[engine.config.motion]));
      }
      batchBusy = value;
      document.querySelectorAll('#workspace, #evaluation, #records, .demo-guide').forEach(element => { element.inert = value; });
      if (!value) {
        configureWorld(config);
        display(mode === 'replay' ? currentFrames()[cursor] : liveFrame, true); lastCameraSequence = -1;
      }
      updateControls();
      if (value) { $('run-state').textContent = '当前单轮已暂停 · 批量实验运行中'; $('phase').textContent = '单轮保留中'; }
    },
    async run(job, controls) {
      const settings = job.config, images = new Map(), observer = imageObserver.createObserver();
      configureWorld(settings, false);
      const experiment = new lab.Experiment(settings, (world, sequence) => {
        positionWorld(world.position, world.time, settings); sensorRenderer.render(scene, sensorCamera);
        const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 240;
        copyCamera(canvas, sequence, settings); images.set(sequence, canvas);
        for (const key of images.keys()) if (key < sequence - Math.ceil(settings.delay * settings.rate) - 3) images.delete(key);
        return { distance: distanceInWorld() };
      }, packet => observer.analyze(images.get(packet.sequence).getContext('2d').getImageData(0, 0, 360, 240), packet));
      while (experiment.time < lab.DURATION) {
        if (!await controls.proceed()) return null;
        for (let i = 0; i < 20 && experiment.time < lab.DURATION; i++) experiment.step();
        const packet = experiment.frames.at(-1).observations.camera;
        controls.progress(experiment.time, packet ? images.get(packet.sequence) : null, packet?.sampledAt || 0);
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      return experiment.recording(job.name + ' · 种子 ' + job.seed);
    }
  });
})();

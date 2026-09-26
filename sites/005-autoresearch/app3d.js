(function () {
  'use strict';
  const sim = window.AutoResearchSim3D;
  const THREE = window.THREE;
  const canvas = document.getElementById('sim-canvas');
  const modeButtons = [...document.querySelectorAll('#flight-mode button')];
  const seedInput = document.getElementById('seed-input');
  const speedInput = document.getElementById('speed-input');
  const speedValue = document.getElementById('speed-value');
  const livePolicy = document.getElementById('live-policy');
  const launchButton = document.getElementById('launch-button');
  const playButton = document.getElementById('play-button');
  const resetButton = document.getElementById('reset-button');
  const stageStatus = document.getElementById('stage-status');
  const timeReadout = document.getElementById('time-readout');
  const attemptReadout = document.getElementById('attempt-readout');
  const positionReadout = document.getElementById('position-readout');
  const resultReadout = document.getElementById('result-readout');
  const droneLabel = document.getElementById('drone-label');
  const stationLabel = document.getElementById('station-label');
  const recordLabel = document.getElementById('record-label');
  const startOverlay = document.getElementById('start-overlay');
  const reasonTitle = document.getElementById('reason-title');
  const reasonDetail = document.getElementById('reason-detail');
  const eventLog = document.getElementById('event-log');
  const manualHint = document.getElementById('manual-hint');
  const manualPad = document.getElementById('manual-pad');
  const keys = new Set();

  if (!THREE || !sim) {
    stageStatus.textContent = '三维渲染器加载失败';
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    stageStatus.textContent = '浏览器未启用 WebGL';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#071925');
  scene.fog = new THREE.Fog('#071925', 65, 130);
  const camera = new THREE.PerspectiveCamera(49, 16 / 9, 0.1, 180);
  const view = { azimuth: 1.03, elevation: 0.43, radius: 53, target: new THREE.Vector3(0, 3.5, 0), dragging: false, x: 0, y: 0 };

  function material(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, ...extra }); }
  function mesh(geometry, mat, parent = scene) {
    const object = new THREE.Mesh(geometry, mat);
    parent.add(object);
    return object;
  }
  const ambient = new THREE.HemisphereLight('#b5eff0', '#143139', 1.65);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight('#d9f5ec', 2.0);
  sun.position.set(18, 35, 18); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -38; sun.shadow.camera.right = 38;
  sun.shadow.camera.top = 32; sun.shadow.camera.bottom = -32;
  scene.add(sun);

  const ground = mesh(new THREE.PlaneGeometry(54, 40), material('#1a3838', { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  const grid = new THREE.GridHelper(50, 25, '#79ada8', '#416d70');
  grid.position.y = 0.024;
  scene.add(grid);

  const borderMat = new THREE.LineBasicMaterial({ color: '#6f9da5', transparent: true, opacity: 0.55 });
  const border = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-sim.WORLD.halfX, 0.07, -sim.WORLD.halfZ),
    new THREE.Vector3(sim.WORLD.halfX, 0.07, -sim.WORLD.halfZ),
    new THREE.Vector3(sim.WORLD.halfX, 0.07, sim.WORLD.halfZ),
    new THREE.Vector3(-sim.WORLD.halfX, 0.07, sim.WORLD.halfZ)
  ]), borderMat);
  scene.add(border);
  const station = sim.WORLD.station;
  const stationGroup = new THREE.Group();
  stationGroup.position.set(station.x, 0, station.z);
  scene.add(stationGroup);
  const base = mesh(new THREE.CylinderGeometry(1.3, 1.65, 0.5, 24), material('#4b7078'), stationGroup);
  base.position.y = 0.25; base.castShadow = true;
  const tower = mesh(new THREE.CylinderGeometry(0.25, 0.37, 2.4, 16), material('#b0d8d6'), stationGroup);
  tower.position.y = 1.55; tower.castShadow = true;
  const support = mesh(new THREE.BoxGeometry(1.7, 0.2, 1.0), material('#446d76'), stationGroup);
  support.position.y = 2.45;
  // A camera-like head turns only as a visual explanation. Its transform never enters the observation rules.
  const opticalHead = new THREE.Group();
  opticalHead.position.set(station.x, station.y, station.z);
  opticalHead.scale.setScalar(1.4);
  scene.add(opticalHead);
  const cameraBody = mesh(new THREE.BoxGeometry(1.5, 0.95, 1.6), material('#adcac7'), opticalHead);
  cameraBody.castShadow = true;
  const lensBarrel = mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.55, 24), material('#244854'), opticalHead);
  lensBarrel.rotation.x = Math.PI / 2; lensBarrel.position.z = 0.93;
  const lens = mesh(new THREE.CircleGeometry(0.34, 32), new THREE.MeshBasicMaterial({ color: '#77eadf', side: THREE.DoubleSide }), opticalHead);
  lens.position.z = 1.215;
  const stationLight = new THREE.PointLight('#67e9d8', 2.5, 13);
  stationLight.position.y = 3.2; stationGroup.add(stationLight);
  const area = sim.WORLD.observation;
  const observationFloor = mesh(new THREE.PlaneGeometry(area.maxX - area.minX, area.maxZ - area.minZ),
    new THREE.MeshBasicMaterial({ color: '#65e2d3', transparent: true, opacity: 0.07, depthWrite: false }));
  observationFloor.rotation.x = -Math.PI / 2;
  observationFloor.position.set((area.minX + area.maxX) / 2, 0.04, (area.minZ + area.maxZ) / 2);
  const zoneCorners = [[area.minX, area.minZ], [area.maxX, area.minZ], [area.maxX, area.maxZ], [area.minX, area.maxZ]];
  scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(zoneCorners.map(([x, z]) => new THREE.Vector3(x, 0.09, z))),
    new THREE.LineBasicMaterial({ color: '#7cebd9', transparent: true, opacity: 0.55 })));
  for (const [x, z] of zoneCorners) {
    const post = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, area.minY, z), new THREE.Vector3(x, area.maxY, z)]),
      new THREE.LineDashedMaterial({ color: '#70baa9', dashSize: 0.3, gapSize: 0.6, transparent: true, opacity: 0.25 }));
    post.computeLineDistances(); scene.add(post);
  }

  const drone = new THREE.Group();
  scene.add(drone);
  drone.scale.setScalar(1.35);
  const body = mesh(new THREE.BoxGeometry(1.8, 0.45, 0.95), material('#f8b981', { metalness: 0.5 }), drone);
  body.castShadow = true;
  const canopy = mesh(new THREE.BoxGeometry(0.9, 0.32, 0.68), material('#b9e2de', { metalness: 0.65 }), drone);
  canopy.position.y = 0.32; canopy.castShadow = true;
  const arms = [
    [0.98, 0.75], [0.98, -0.75], [-0.98, 0.75], [-0.98, -0.75]
  ];
  const rotorBlades = [];
  for (const [x, z] of arms) {
    const arm = mesh(new THREE.BoxGeometry(1.7, 0.12, 0.13), material('#95b6bd'), drone);
    arm.position.set(x * 0.5, 0.02, z * 0.7);
    arm.rotation.y = z > 0 ? -0.38 : 0.38;
    const ring = mesh(new THREE.TorusGeometry(0.41, 0.055, 8, 28), material('#65ded2'), drone);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x * 1.55, 0.02, z * 1.55);
    const blade = mesh(new THREE.BoxGeometry(0.8, 0.025, 0.08), material('#cbece8'), drone);
    blade.position.copy(ring.position);
    rotorBlades.push(blade);
  }
  const nose = mesh(new THREE.ConeGeometry(0.32, 0.9, 12), material('#ffdfb5'), drone);
  nose.rotation.z = -Math.PI / 2; nose.position.x = 1.15;

  const trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#f7ac75', transparent: true, opacity: 0.85 }));
  scene.add(trail);
  const altitude = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#f7ac75', dashSize: 0.45, gapSize: 0.3, transparent: true, opacity: 0.65 }));
  scene.add(altitude);
  const shadow = mesh(new THREE.CircleGeometry(0.64, 28), new THREE.MeshBasicMaterial({ color: '#ffc28a', transparent: true, opacity: 0.28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;

  const observationLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#75b8c5', dashSize: 0.5, gapSize: 0.4, transparent: true, opacity: 0.65 }));
  scene.add(observationLine);
  const beam = new THREE.Group();
  const beamCore = mesh(new THREE.CylinderGeometry(0.065, 0.065, 1, 10), new THREE.MeshBasicMaterial({ color: '#c9fff1' }), beam);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 10), new THREE.MeshBasicMaterial({ color: '#79f5ce', transparent: true, opacity: 0.2, depthWrite: false }), beam);
  scene.add(beam); beam.visible = false;
  const recordBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(4.7, 1.7, 3.8)),
    new THREE.LineBasicMaterial({ color: '#9cffb7' }));
  scene.add(recordBox); recordBox.visible = false;
  const visualLook = new THREE.Vector3(4, 7, 0);
  const beamAxis = new THREE.Vector3(0, 1, 0);

  const state = {
    mode: 'wander', policy: 'steady', seed: 42, time: 0, accumulator: 0, playing: false,
    started: false, finished: false, observer: sim.createObserver(), lastPhase: 'search',
    position: { x: 0, y: 8, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, trajectory: [],
    trail: [], events: [], record: null, lastFrame: 0
  };

  function readSeed() {
    const value = Number(seedInput.value);
    const seed = Number.isFinite(value) ? Math.floor(sim.clamp(value, 0, 999999)) : 42;
    seedInput.value = String(seed);
    return seed;
  }
  function setStatus(message) { stageStatus.textContent = message; }
  function updateReadout() {
    const observer = state.observer;
    timeReadout.textContent = state.time.toFixed(1) + ' s';
    attemptReadout.textContent = String(observer.attempts);
    const range = sim.distance(state.position, station);
    positionReadout.textContent = state.position.y.toFixed(1) + ' / ' + range.toFixed(1);
    resultReadout.textContent = observer.markedAt !== null ? '已记录 · ' + observer.markedAt.toFixed(1) + ' s' : state.finished ? '未获有效记录' : state.started ? '观察中' : '等待开始';
    playButton.textContent = state.playing ? '暂停' : state.finished ? '重新播放' : state.started ? '继续' : '开始演示';
    launchButton.hidden = state.policy !== 'manual';
    launchButton.disabled = !state.playing || observer.markedAt !== null || state.time - observer.lastMark < sim.WORLD.cooldown - 1e-9;
    startOverlay.hidden = state.started;
    const observed = observer.markedAt !== null ? sim.WORLD.settleTime : observer.observedFor;
    document.getElementById('observe-time').textContent = Math.min(observed, sim.WORLD.settleTime).toFixed(1) + ' / 1.8 s';
    document.getElementById('observe-progress').value = observed;
    const phase = observer.phase;
    const phases = ['search', 'track', 'ready', 'marked'];
    document.querySelectorAll('[data-phase]').forEach(item => {
      item.classList.toggle('active', item.dataset.phase === phase);
      item.classList.toggle('complete', phases.indexOf(item.dataset.phase) < phases.indexOf(phase));
    });
    if (!state.started) {
      setStatus('等待开始'); reasonTitle.textContent = '等待你开始';
      reasonDetail.textContent = '无人机将开始飞行，站点会按所选规则自动观察与记录。';
    } else if (observer.markedAt !== null) {
      reasonTitle.textContent = '已完成一次光学标记';
      reasonDetail.textContent = '亮线显示了这次动作，绿色框留下当时的位置。无人机继续飞行，记录不会跟着它移动。';
      setStatus(state.finished ? '演示结束 · 已获记录' : state.playing ? '标记完成 · 飞行继续' : '已暂停');
    } else if (state.finished) {
      setStatus('演示结束'); reasonTitle.textContent = '本轮未获得有效记录';
      reasonDetail.textContent = '24 秒内没有满足当前观察规则。可以更换规则或轨迹，再比较结果。';
    } else {
      setStatus(!state.playing ? '已暂停' : phase === 'search' ? '01 · 寻找目标' : phase === 'track' ? '02 · 持续观察' : '03 · 条件满足');
      if (phase === 'search') {
        reasonTitle.textContent = state.time < sim.WORLD.startup ? '站点正在开始观察' : '目标在观察区外';
        reasonDetail.textContent = '浅青色地面区域表示观察区的投影。进入观察区后，程序读取目标的位置。';
      } else if (phase === 'track') {
        reasonTitle.textContent = '已发现目标，观察时间还不够';
        reasonDetail.textContent = '虚线显示观察关系；头部转动表达跟踪。教学规则要求连续观察 1.8 秒后才视为有效记录。';
      } else {
        reasonTitle.textContent = '连续观察已达到要求';
        reasonDetail.textContent = state.policy === 'manual' ? '可以点击“手动光学标记”留下这次观察。' : state.policy === 'periodic' ? '等待下一次定时记录。' : '再停留片刻以展示这个阶段，然后自动记录。';
      }
    }
  }

  function logEvent(message) {
    state.events.push({ time: state.time, message });
    state.events = state.events.slice(-5);
    eventLog.replaceChildren(...state.events.map(event => {
      const item = document.createElement('li');
      const time = document.createElement('time'); time.textContent = event.time.toFixed(1) + ' s';
      const text = document.createElement('span'); text.textContent = event.message;
      item.append(time, text); return item;
    }));
  }
  function resetSimulation() {
    state.seed = readSeed();
    state.policy = livePolicy.value;
    state.time = 0; state.accumulator = 0; state.playing = false; state.started = false;
    state.finished = false; state.observer = sim.createObserver(); state.lastPhase = 'search';
    state.trajectory = state.mode === 'manual' ? [] : sim.makeTrajectory(state.mode, state.seed);
    state.position = state.mode === 'manual' ? { x: 10, y: 8, z: -7 } : sim.pointAt(state.trajectory, 0);
    state.velocity = { x: 0, y: 0, z: 0 };
    state.trail = []; state.record = null; state.events = []; keys.clear();
    beam.visible = false; recordBox.visible = false; recordLabel.hidden = true;
    lens.material.color.set('#77eadf');
    visualLook.set(4, 7, 0);
    trail.geometry.dispose(); trail.geometry = new THREE.BufferGeometry();
    document.getElementById('policy-description').textContent = {
      steady: '先连续观察，再记录。默认会自动完成整个过程。',
      entry: '发现就尝试记录；观察时间不足会失败，稍后重试。',
      periodic: '每隔 3 秒尝试记录一次，不等待观察条件。',
      manual: '无人机按所选方式飞行，由你点击按钮留下光学标记。'
    }[state.policy];
    logEvent('等待开始。青色站点固定，橙色无人机将开始飞行。');
    updateSceneObjects(); updateReadout();
  }
  function setMode(mode) {
    state.mode = mode;
    modeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    manualHint.hidden = mode !== 'manual';
    manualPad.hidden = mode !== 'manual';
    resetSimulation();
  }

  function showMark(event) {
    if (!event) return;
    state.record = { ...event, position: { ...state.position } };
    const end = new THREE.Vector3(state.position.x, state.position.y, state.position.z);
    const start = new THREE.Vector3(station.x, station.y, station.z);
    const difference = end.clone().sub(start);
    beam.position.copy(start).add(end).multiplyScalar(0.5);
    beam.scale.set(1, difference.length(), 1);
    beam.quaternion.setFromUnitVectors(beamAxis, difference.normalize());
    beamCore.material.color.set(event.success ? '#d6fff0' : '#ffbe94');
    recordBox.material.color.set(event.success ? '#9cffb7' : '#ffbe94');
    recordBox.position.copy(end); recordBox.rotation.y = drone.rotation.y;
    recordBox.visible = true; beam.visible = true;
    if (event.success) lens.material.color.set('#b5ffd1');
    recordLabel.textContent = event.success ? '已记录的位置 · ' + event.time.toFixed(1) + ' s' : '本次观察不足';
    logEvent(event.reason + '。');
  }
  function launch() {
    if (!state.playing || state.policy !== 'manual') return;
    showMark(sim.mark(state.observer, state.time));
    if (state.observer.markedAt !== null) state.observer.phase = 'marked';
    updateReadout();
  }

  function updateManual() {
    const x = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    const z = Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup'));
    const y = Number(keys.has('e')) - Number(keys.has('q'));
    const length = Math.hypot(x, y, z) || 1;
    const desired = { x: x * 4.6 / length, y: y * 2.6 / length, z: z * 4.6 / length };
    for (const axis of ['x', 'y', 'z']) {
      const acceleration = axis === 'y' ? 2.2 : 3.2;
      state.velocity[axis] += sim.clamp(desired[axis] - state.velocity[axis], -acceleration * sim.WORLD.step, acceleration * sim.WORLD.step);
      state.position[axis] += state.velocity[axis] * sim.WORLD.step;
    }
    state.position.x = sim.clamp(state.position.x, -21, 21);
    state.position.y = sim.clamp(state.position.y, sim.WORLD.minY, sim.WORLD.maxY);
    state.position.z = sim.clamp(state.position.z, -14, 14);
  }

  function updateSceneObjects() {
    const p = state.position;
    drone.position.set(p.x, p.y, p.z);
    const last = state.trail.length > 1 ? state.trail[state.trail.length - 2] : { x: p.x - 1, z: p.z };
    drone.rotation.y = -Math.atan2(p.z - last.z, p.x - last.x);
    shadow.position.set(p.x, 0.1, p.z);
    shadow.material.opacity = 0.32 - p.y / 80;
    altitude.geometry.dispose();
    altitude.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x, 0.15, p.z), new THREE.Vector3(p.x, p.y, p.z)]);
    altitude.computeLineDistances();
    observationLine.geometry.dispose();
    observationLine.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(station.x, station.y, station.z), new THREE.Vector3(p.x, p.y, p.z)]);
    observationLine.computeLineDistances();
    observationLine.visible = state.observer.visible && !beam.visible;
  }

  function stepSimulation() {
    if (!state.playing || state.finished) return;
    state.time = Math.min(sim.WORLD.duration, Math.round((state.time + sim.WORLD.step) * 100) / 100);
    if (state.mode === 'manual') updateManual();
    else state.position = sim.pointAt(state.trajectory, state.time);
    const event = sim.updateObserver(state.observer, state.position, state.time, state.policy);
    if (state.observer.phase !== state.lastPhase) {
      if (state.observer.phase === 'track') logEvent('发现无人机，开始连续观察；站点头部跟随目标转动。');
      if (state.observer.phase === 'ready') logEvent('连续观察达到 1.8 秒，满足有效记录的条件。');
      if (state.observer.phase === 'search') logEvent('无人机离开观察区，连续观察重新计时。');
      state.lastPhase = state.observer.phase;
    }
    showMark(event);
    if (state.record) {
      beam.visible = state.time - state.record.time <= 1.2;
      recordBox.visible = state.record.success || beam.visible;
    }
    state.trail.push({ ...state.position });
    if (state.trail.length > 250) state.trail.shift();
    if (state.trail.length > 1) {
      trail.geometry.dispose();
      trail.geometry = new THREE.BufferGeometry().setFromPoints(state.trail.map(point => new THREE.Vector3(point.x, point.y, point.z)));
    }
    if (state.time >= sim.WORLD.duration) {
      state.finished = true; state.playing = false;
      logEvent(state.observer.markedAt !== null ? '本轮飞行结束，已留下有效观察记录。' : '本轮飞行结束，未获得有效观察记录。');
    }
    updateSceneObjects(); updateReadout();
  }

  function updateCamera() {
    const { radius, elevation, azimuth, target } = view;
    camera.position.set(
      target.x + radius * Math.cos(elevation) * Math.cos(azimuth),
      target.y + radius * Math.sin(elevation),
      target.z + radius * Math.cos(elevation) * Math.sin(azimuth)
    );
    camera.lookAt(target);
  }
  function placeLabel(element, point) {
    const projected = new THREE.Vector3(point.x, point.y, point.z).project(camera);
    element.hidden = projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1;
    if (!element.hidden) {
      element.style.left = ((projected.x + 1) * 50).toFixed(2) + '%';
      element.style.top = ((1 - projected.y) * 50).toFixed(2) + '%';
    }
  }
  function resize() {
    const parent = canvas.parentElement;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.round(width * (window.matchMedia('(max-width:760px)').matches ? 3 / 4 : 9 / 16));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  function frame(now) {
    const elapsed = state.lastFrame ? Math.min((now - state.lastFrame) / 1000, 0.07) : 0;
    state.lastFrame = now;
    if (state.playing) {
      state.accumulator += elapsed * Number(speedInput.value);
      while (state.accumulator >= sim.WORLD.step) {
        stepSimulation(); state.accumulator -= sim.WORLD.step;
        if (!state.playing) break;
      }
    }
    if (state.playing) {
      for (const blade of rotorBlades) blade.rotation.y += elapsed * 16;
      const target = beam.visible && state.record ? state.record.position : state.observer.visible ? state.position :
        { x: 5 + Math.sin(state.time) * 4, y: 7, z: Math.cos(state.time * 0.8) * 9 };
      visualLook.lerp(new THREE.Vector3(target.x, target.y, target.z), Math.min(1, elapsed * 4));
    }
    opticalHead.lookAt(visualLook);
    updateCamera();
    droneLabel.textContent = '无人机 · 高度 ' + state.position.y.toFixed(1);
    placeLabel(droneLabel, { x: state.position.x, y: state.position.y + 1.7, z: state.position.z });
    placeLabel(stationLabel, { x: station.x, y: station.y + 1.8, z: station.z });
    if (state.record && recordBox.visible) {
      const p = state.record.position;
      placeLabel(recordLabel, { x: p.x, y: p.y - 1.6, z: p.z });
    } else recordLabel.hidden = true;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function showExperiment(result) {
    const baseline = result.baseline;
    const proposed = result.proposed;
    const keep = result.decision === 'keep';
    document.getElementById('baseline-loss').textContent = baseline.loss.toFixed(1);
    document.getElementById('candidate-loss').textContent = proposed.loss.toFixed(1);
    document.getElementById('baseline-detail').textContent = `${baseline.marked}/24 获得记录 · 平均 ${baseline.averageAttempts.toFixed(1)} 次尝试`;
    document.getElementById('candidate-detail').textContent = `${proposed.marked}/24 获得记录 · 平均 ${proposed.averageAttempts.toFixed(1)} 次尝试`;
    document.getElementById('candidate-label').textContent = 'CANDIDATE / ' + sim.policyName(result.candidate);
    document.getElementById('results-intro').textContent = `已完成 24 组配对三维试验 · 种子 ${result.seed} · 两组使用同一轨迹`;
    document.getElementById('decision-text').textContent = keep ? '保留候选算法' : '回退到基线算法';
    document.getElementById('decision-explain').textContent = keep
      ? `候选指标低 ${Math.abs(baseline.loss - proposed.loss).toFixed(1)}；只在这套合成场景与评分规则下更好。`
      : '候选指标没有下降，本轮不接受改动。';
    document.getElementById('results-caption').textContent = '两组共运行 48 次观察试验。评分只衡量首次有效记录与尝试次数；未评价真实设备的捕获或命中效果。';
    const tag = document.getElementById('result-tag');
    tag.textContent = keep ? 'KEEP / 保留' : 'DISCARD / 回退';
    tag.className = 'result-tag ' + result.decision;
    document.querySelector('.decision-box').className = 'decision-box ' + result.decision;
  }

  modeButtons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  seedInput.addEventListener('change', resetSimulation);
  livePolicy.addEventListener('change', resetSimulation);
  speedInput.addEventListener('input', () => { speedValue.textContent = Number(speedInput.value).toFixed(1) + '×'; });
  launchButton.addEventListener('click', launch);
  function start() {
    if (state.finished) resetSimulation();
    if (!state.started) logEvent('演示开始：' + sim.policyName(state.policy) + '。');
    state.started = true; state.playing = true; updateReadout();
  }
  playButton.addEventListener('click', () => {
    if (state.playing) { state.playing = false; updateReadout(); }
    else start();
  });
  document.getElementById('canvas-start').addEventListener('click', start);
  document.getElementById('demo-button').addEventListener('click', () => {
    livePolicy.value = 'steady'; seedInput.value = '42'; setMode('wander');
    document.querySelector('[data-view="overview"]').click();
    speedInput.value = '1'; speedValue.textContent = '1.0×'; start();
    document.querySelector('.process-strip').scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  resetButton.addEventListener('click', resetSimulation);
  document.addEventListener('keydown', event => {
    if (event.target.matches('input, select, textarea')) return;
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      keys.add(key);
      if (state.mode === 'manual') event.preventDefault();
    }
  });
  document.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());
  document.querySelectorAll('#manual-pad button').forEach(button => {
    const key = button.dataset.key;
    button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); keys.add(key); });
    button.addEventListener('pointerup', () => keys.delete(key));
    button.addEventListener('pointercancel', () => keys.delete(key));
    button.addEventListener('lostpointercapture', () => keys.delete(key));
  });
  canvas.addEventListener('pointerdown', event => {
    view.dragging = true; view.x = event.clientX; view.y = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!view.dragging) return;
    view.azimuth -= (event.clientX - view.x) * 0.006;
    view.elevation = sim.clamp(view.elevation + (event.clientY - view.y) * 0.005, 0.12, 1.35);
    view.x = event.clientX; view.y = event.clientY;
  });
  canvas.addEventListener('pointerup', () => { view.dragging = false; });
  canvas.addEventListener('pointercancel', () => { view.dragging = false; });
  canvas.addEventListener('lostpointercapture', () => { view.dragging = false; });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    view.radius = sim.clamp(view.radius + Math.sign(event.deltaY) * 3, 32, 100);
  }, { passive: false });
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    const preset = { overview: [1.03, 0.43, 53], side: [1.45, 0.24, 52], top: [0.01, 1.35, 55] }[button.dataset.view];
    [view.azimuth, view.elevation, view.radius] = preset;
    document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  }));
  document.getElementById('run-button').addEventListener('click', () => showExperiment(sim.runBatch(readSeed(), document.getElementById('candidate-select').value)));
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas.parentElement);
  resize(); resetSimulation(); requestAnimationFrame(frame);
})();

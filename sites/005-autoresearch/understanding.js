(() => {
  'use strict';
  const controls = document.querySelector('.case-filters');
  const cards = [...document.querySelectorAll('[data-case-group]')];
  const count = document.getElementById('case-count');
  if (!controls || !count || !cards.length) return;
  const buttons = [...controls.querySelectorAll('[data-case-filter]')];
  const labels = { all: '全部', software: '纯软件', simulation: '仿真与 3D', native: '原库任务' };

  function showGroup(group) {
    if (!Object.prototype.hasOwnProperty.call(labels, group)) return;
    let visible = 0;
    cards.forEach(card => {
      card.hidden = group !== 'all' && card.dataset.caseGroup !== group;
      if (!card.hidden) visible += 1;
    });
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.caseFilter === group)));
    count.textContent = `当前展示${labels[group]} ${visible} 个场景。${group === 'native' ? '原库提供该训练任务；本项目尚未执行训练。' : '扩展构想需要另外适配和验证。'}`;
  }

  buttons.forEach(button => button.addEventListener('click', () => showGroup(button.dataset.caseFilter)));
  controls.hidden = false;

  function revealHashTarget() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    const card = target && target.closest('[data-case-group]');
    if (card && card.hidden) {
      showGroup('all');
      card.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
  }
  window.addEventListener('hashchange', revealHashTarget);
  revealHashTarget();
})();

(() => {
  'use strict';
  const viewport = document.getElementById('overview-viewport');
  const image = document.getElementById('overview-image');
  const toolbar = document.querySelector('.overview-toolbar');
  const part = document.getElementById('overview-part');
  const state = document.getElementById('overview-read-state');
  if (!viewport || !image || !toolbar || !part || !state) return;
  const buttons = [...toolbar.querySelectorAll('[data-overview-scale]')];
  const sizes = { fit: null, read: 1600, large: 2200 };
  const labels = { fit: '全图模式；放大后可上下左右滚动。', read: '阅读模式；可滚动或定位到指定内容。', large: '大字模式；可滚动或定位到指定内容。' };
  let scale = 'fit';

  function setScale(next) {
    if (!Object.prototype.hasOwnProperty.call(sizes, next)) return;
    const oldWidth = image.getBoundingClientRect().width;
    const leftRatio = oldWidth ? viewport.scrollLeft / oldWidth : 0;
    const topRatio = oldWidth ? viewport.scrollTop / oldWidth : 0;
    scale = next;
    image.style.width = sizes[next] ? `${sizes[next]}px` : '';
    viewport.classList.toggle('is-zoomed', next !== 'fit');
    if (next === 'fit') part.selectedIndex = 0;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.overviewScale === next)));
    state.textContent = labels[next];
    const width = image.getBoundingClientRect().width;
    viewport.scrollTo({ left: leftRatio * width, top: topRatio * width, behavior: 'instant' });
  }

  buttons.forEach(button => button.addEventListener('click', () => setScale(button.dataset.overviewScale)));
  part.addEventListener('change', () => {
    if (scale === 'fit') setScale('read');
    const option = part.selectedOptions[0];
    const ratio = image.getBoundingClientRect().width / 2000;
    viewport.scrollTo({ left: Math.max(0, Number(option.dataset.x || 0) - 20) * ratio, top: Number(option.value) * ratio, behavior: 'instant' });
    state.textContent = `已定位：${option.textContent}。可滚动查看相邻内容。`;
  });
  toolbar.hidden = false;
})();

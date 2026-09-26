"use strict";
(() => {
  const stages = {
    retain: { kicker: "让记录可以被理解", title: "保留事情，也保留语境", description: "LLM 从输入中抽取自包含的叙述信息，识别实体、时间和关系。事情发生的时间与录入时间分别记录。", url: "https://hindsight.vectorize.io/developer/retain", visual: '<div class="sample-label">示例记录 · 非真实项目结果</div><blockquote>“9 月补记：我们在 6 月选择方案 A，因为部署简单。”</blockquote><div class="fact-grid"><div><span>发生时间</span><strong>6 月</strong></div><div><span>记录时间</span><strong>9 月</strong></div><div><span>对象</span><strong>方案 A</strong></div><div><span>决策依据</span><strong>部署简单</strong></div></div>' },
    store: { kicker: "建立可查找的路径", title: "同一份记忆，多种索引", description: "主要存储采用 PostgreSQL。记忆与实体、时间和关系一起保存，向量与全文索引为后续检索提供不同入口。", url: "https://hindsight.vectorize.io/developer/storage", visual: '<div class="sample-label">存储结构 · 概念示意</div><div class="storage-items"><div><strong>向量索引</strong><span>按含义接近程度查找</span></div><div><strong>全文索引</strong><span>匹配名称与技术词</span></div><div><strong>实体与关系</strong><span>连接方案、决策与经历</span></div><div><strong>时间与元数据</strong><span>记录时序、来源和范围</span></div></div>' },
    recall: { kicker: "四条路线，汇集候选", title: "找到相关，也找到关联", description: "四路检索形成候选集合；通过排名融合与重排筛选相关材料，最后按 token 预算返回。检索深度和返回篇幅可以分别控制。", url: "https://hindsight.vectorize.io/developer/retrieval", visual: '<div class="sample-label">示例问题：6 月为什么选方案 A？</div><div class="retrieval-arms"><div><strong>语义</strong><small>部署复杂度与选型原因</small></div><div><strong>关键词</strong><small>方案 A 的精确名称</small></div><div><strong>图关系</strong><small>方案、项目与决策的连接</small></div><div><strong>时间</strong><small>与 6 月重叠的记录</small></div></div><div class="fusion-result">候选融合 → 重排 → 上下文预算</div>' },
    reflect: { kicker: "基于记忆形成判断", title: "先找依据，再组织回答", description: "反思 Agent 优先查专题知识与归纳结论，需要时追查原始记忆和文档。系统核对引用 ID 是否被检索过，但不能因此保证推理正确。", url: "https://hindsight.vectorize.io/developer/reflect", visual: '<div class="sample-label">示例回答 · 预设文本</div><p class="example-answer">当时选择 A 的依据是部署简单。是否继续采用，还要结合后续规模、成本与维护记录判断。</p><div class="example-citation">依据：示例选型记录 · 6 月发生 / 9 月补记<br>此处展示回答结构，不是 Hindsight 实际输出。</div>' }
  };
  const tabs = [...document.querySelectorAll("[data-stage]")];
  function activate(tab, focus = false) {
    const stage = stages[tab.dataset.stage];
    tabs.forEach(item => { const selected = item === tab; item.classList.toggle("is-active", selected); item.setAttribute("aria-selected", String(selected)); item.tabIndex = selected ? 0 : -1; });
    document.getElementById("stage-kicker").textContent = stage.kicker;
    document.getElementById("stage-title").textContent = stage.title;
    document.getElementById("stage-description").textContent = stage.description;
    document.getElementById("stage-source").href = stage.url;
    document.getElementById("stage-visual").innerHTML = stage.visual;
    document.getElementById("pipeline-panel").setAttribute("aria-labelledby", tab.id);
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => { tab.addEventListener("click", () => activate(tab)); tab.addEventListener("keydown", event => { let next; if (event.key === "ArrowRight") next = (index + 1) % tabs.length; if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length; if (event.key === "Home") next = 0; if (event.key === "End") next = tabs.length - 1; if (next !== undefined) { event.preventDefault(); activate(tabs[next], true); } }); });
  const moments = [
    { text: "这次试验选择了方案 A，主要依据是部署简单；尚不足以判断它在更大规模下是否合适。", evidence: "06.12 · 初次选型", question: "下一次需要补问：是否有运行规模与成本的数据？" },
    { text: "A 曾因部署简单被选用，但在后续较大规模下出现了预算压力。判断是否适合时，需要同时考虑规模与成本条件。", evidence: "06.12 · 初次选型 ＋ 08.21 · 规模变化", question: "新的限制补充了早期判断；部署简单与成本超支可能同时成立。" },
    { text: "这组记录中的团队将 A 保留给小型原型，并为大规模任务重新选型。这是一项有条件的项目决策，不能推广为所有场景的结论。", evidence: "06.12 ＋ 08.21 ＋ 09.05 · 三次示例记录", question: "下一次先核对使用规模，再引用这段经验，并回看支持它的原始记录。" }
  ];
  const timeline = [...document.querySelectorAll("[data-moment]")];
  timeline.forEach(button => button.addEventListener("click", () => {
    const index = Number(button.dataset.moment);
    const moment = moments[index];
    timeline.forEach(item => { const selected = item === button; item.classList.toggle("is-current", selected); item.setAttribute("aria-pressed", String(selected)); });
    document.getElementById("belief-version").textContent = `V.0${index + 1}`;
    document.getElementById("belief-text").textContent = moment.text;
    document.getElementById("belief-evidence").textContent = moment.evidence;
    document.getElementById("belief-question").textContent = moment.question;
  }));
})();

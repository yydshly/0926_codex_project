(function () {
  "use strict";
  var content = window.semanticaGuide, data = window.semanticaPilot;
  var mode = "capability", step = 0;
  var actualIO = {
    input: ["四份真实 README + 文件接入清单", "原文快照、路径、行号与文件摘要"],
    extract: ["原文片段 + 本次研究问题", "人工确认的角色和证据清单"],
    govern: ["证据锚点 + 当前来源文件与输入清单", "锚点唯一性与来源版本检查结果"],
    store: ["确认后的项目、角色、证据和连接", "12 个节点、10 条关系的本地图谱"],
    retrieve: ["已保存图谱 + 关键词或主题起点", "匹配项目、来源原文与已记录路径"],
    deliver: ["同一批图谱 + 查询结果 + 所选项目", "四种原生图形视图 + 研究简报"]
  };
  var byId = function (id) { return document.getElementById(id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function link(text, href) { var a = el("a", "guide-link", text); a.href = href; return a; }
  content.stages.forEach(function (item, index) {
    var button = el("button", "journey-step"); button.type = "button"; button.dataset.stage = item.id;
    button.append(el("span", "stage-number", "0" + (index + 1)), el("strong", "", item.title), el("small", "", item.short));
    button.addEventListener("click", function () { step = index; renderJourney(); }); byId("journey-steps").append(button);
  });
  function renderJourney() {
    var item = content.stages[step];
    document.querySelectorAll("[data-stage]").forEach(function (button, index) { var active = index === step; button.classList.toggle("is-current", active); button.setAttribute("aria-pressed", String(active)); });
    document.querySelectorAll("[data-view]").forEach(function (button) { var active = button.dataset.view === mode; button.classList.toggle("is-current", active); button.setAttribute("aria-pressed", String(active)); });
    var target = byId("journey-detail"), heading = el("div", "journey-detail-heading");
    heading.append(el("span", "guide-tag " + item.level, mode === "ours" ? item.owner : "库提供的能力范围"), el("h3", "", "0" + (step + 1) + " / " + item.title));
    var io = el("div", "journey-io");
    var pairValues = mode === "ours" ? actualIO[item.id] : [item.input, item.output];
    [["输入", pairValues[0]], ["产物", pairValues[1]]].forEach(function (pair) { var card = el("div", ""); card.append(el("small", "", pair[0]), el("p", "", pair[1])); io.append(card); });
    var detail = el("div", "journey-explanation"); detail.append(el("h4", "", mode === "ours" ? "我们具体怎么做" : "这一步发生什么"), el("p", "", mode === "ours" ? item.ours : item.capability));
    var example = el("p", "journey-example", "本例 / " + item.example);
    var modules = el("details", "journey-modules"); modules.append(el("summary", "", "对应模块"), el("code", "", item.modules));
    target.replaceChildren(heading, io, detail, example, modules, link(item.linkLabel + " →", item.link));
  }
  document.querySelectorAll("[data-view]").forEach(function (button) { button.addEventListener("click", function () { mode = button.dataset.view; renderJourney(); }); });
  renderJourney();
  content.modules.forEach(function (item, index) {
    var card = el("article", "module-card");
    card.append(el("span", "module-number", "0" + (index + 1)), el("h3", "", item.title), el("p", "", item.role), el("span", "module-status", item.status));
    var more = el("details", ""); more.append(el("summary", "", "模块与验证情况"), el("code", "", item.names), el("p", "", item.detail), link("官方依据 ↗", content.sources[item.source].url)); card.append(more); byId("module-grid").append(card);
  });
  function scenarios(group) {
    byId("guide-scenarios").replaceChildren();
    var rows = content.scenarios.filter(function (item) { return group === "全部" || item.group === group; });
    rows.forEach(function (item) {
      var card = el("article", "guide-scenario"); card.append(el("span", "guide-tag", item.group), el("h3", "", item.name), el("p", "scenario-question", item.question));
      [["输入", item.input], ["得到", item.output]].forEach(function (pair) { var p = el("p", ""); p.append(el("strong", "", pair[0] + " / "), document.createTextNode(pair[1])); card.append(p); });
      card.append(el("small", "scenario-status", item.status)); byId("guide-scenarios").append(card);
    });
    byId("scenario-count").textContent = "当前显示 " + rows.length + " 个场景 · 场景设想与已验证结果分别标注";
    document.querySelectorAll("[data-group]").forEach(function (button) { var active = button.dataset.group === group; button.classList.toggle("is-current", active); button.setAttribute("aria-pressed", String(active)); });
  }
  document.querySelectorAll("[data-group]").forEach(function (button) { button.addEventListener("click", function () { scenarios(button.dataset.group); }); }); scenarios("全部");
  content.roadmap.forEach(function (item, index) {
    var card = el("article", "roadmap-card"); card.append(el("span", "roadmap-index", "0" + (index + 1)), el("h3", "", item.title), el("p", "", item.work));
    [["留下什么", item.deliver], ["怎样验证", item.check]].forEach(function (pair) { var p = el("p", "roadmap-check"); p.append(el("strong", "", pair[0] + " / "), document.createTextNode(pair[1])); card.append(p); }); byId("roadmap").append(card);
  });
  Object.keys(content.sources).forEach(function (key) { var s = content.sources[key], p = el("p", ""); p.append(link(s.title + " ↗", s.url), document.createTextNode(" · " + s.note)); byId("guide-sources").append(p); });
  document.querySelectorAll("[data-stat]").forEach(function (n) { if (data) n.textContent = data[n.dataset.stat]; });
  byId("guide-batch").textContent = data ? "保存的实测批次：" + data.build.build_id + "。图形与证据可在对应页面核对；当前文件版本请在实时流程中检查。" : "运行数据见项目研究记录。";
  byId("toggle-poster").addEventListener("click", function () { var poster = byId("full-poster"); poster.hidden = !poster.hidden; this.setAttribute("aria-expanded", String(!poster.hidden)); this.textContent = poster.hidden ? "在本页展开完整图" : "收起完整图"; });
}());

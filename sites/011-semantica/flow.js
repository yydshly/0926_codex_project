(async function () {
  "use strict";
  var data = window.semanticaPilot;
  if (!data || !data.sources) return;
  var live = false, health = null, currentStep = 0, sourceId = "012", queryVersion = 0;
  var selected = new Set(), lastResults = [], downloadUrl = null;
  var titles = ["资料入口", "加工记录", "知识资产", "搜索验证", "业务交付"];
  var byId = function (id) { return document.getElementById(id); };
  function node(tag, cls, text) {
    var item = document.createElement(tag);
    if (cls) item.className = cls;
    if (text !== undefined) item.textContent = text;
    return item;
  }
  function link(label, path) {
    var item = node("a", "", label);
    item.href = "../../" + path;
    return item;
  }
  function message(id, text, error) {
    byId(id).textContent = text;
    byId(id).classList.toggle("is-error", Boolean(error));
  }
  async function api(path, payload) {
    var options = { cache: "no-store", signal: AbortSignal.timeout(15000) };
    if (payload !== undefined) {
      options.method = "POST";
      options.headers = { "Content-Type": "application/json", "X-Semantica-Pilot": "1" };
      options.body = JSON.stringify(payload);
    }
    var response = await fetch(path, options);
    var body = await response.json();
    if (!response.ok) throw new Error(body.error || "操作未完成，请重试。");
    return body;
  }
  function source() { return data.sources.find(function (item) { return item.number === sourceId; }) || data.sources[0]; }
  function renderRuntime() {
    byId("runtime-mode").textContent = live ? "本机实时运行" : "保存的运行快照";
    byId("runtime-dot").classList.toggle("is-live", live);
    byId("runtime-detail").textContent = live ? "已连接 Semantica · 可重建、查询、生成简报" : "可查看流程与产物 · 搜索为快照内筛选";
    byId("live-entry").hidden = live;
    byId("rebuild-button").disabled = !live;
    message("build-status", !live ? "重建需要本机服务；可点击上方入口进入实时演示。" :
      health && !health.all_current ? "发现资料或标注清单变化。复核后点击重建，更新下游知识。" : "已检查：实际读取的资料与本批知识记录一致。来源是否为存档快照见下方。", health && !health.all_current);
    byId("pilot-provenance").textContent = "Semantica " + data.semantica_version + " · " + data.source_count + " 份资料 · " + data.node_count + " 个节点 / " + data.edge_count + " 条关系 · 批次 " + data.build.build_id + "。角色归类为人工标注，尚未测试自动抽取、语义搜索或大规模性能。";
  }
  function renderSources() {
    byId("source-list").replaceChildren();
    data.sources.forEach(function (record) {
      var button = node("button", "source-choice" + (source().number === record.number ? " is-current" : ""));
      button.type = "button";
      button.setAttribute("aria-pressed", String(source().number === record.number));
      button.append(node("strong", "", record.number + " · " + record.name), node("span", "", record.role || "训练实验 · 主题之外"));
      button.addEventListener("click", function () { sourceId = record.number; renderSources(); renderTransform(); });
      byId("source-list").append(button);
    });
    var record = source(), detail = byId("source-detail");
    detail.replaceChildren(node("h4", "", record.name), node("p", "", "输入文件：" + record.path),
      node("blockquote", "", record.anchor), node("p", "", "保存位置：第 " + record.line + " 行 · " + record.bytes.toLocaleString() + " 字节 · 文件摘要 " + record.sha256.slice(0, 12) + "…"));
    var links = node("div", "source-links");
    if (live) links.append(link(record.source_mode === "archived_snapshot" ? "打开实际读取的存档 ↗" : "打开当前原文 ↗", record.input_path || record.path));
    links.append(link("查看接入时的完整快照 ↗", record.snapshot));
    detail.append(links);
    if (record.source_mode === "archived_snapshot") detail.append(node("p", "", "本次读取存档：" + record.input_path + "。原项目文件未在当前仓库中，无法据此确认上游最新状态。"));
    var more = node("details", "flow-more");
    more.append(node("summary", "", "查看读取到的完整来源行"), node("p", "", record.line_text));
    detail.append(more);
  }
  function renderTransform() {
    var record = source(), target = byId("transform-example");
    var original = node("article", "transform-card");
    original.append(node("span", "", "A / 读取到的原文"), node("h4", "", record.name), node("blockquote", "", record.anchor), node("p", "", "来自第 " + record.line + " 行。整份来源快照同时保存。"));
    var fields = node("article", "transform-card");
    fields.append(node("span", "", "B / 人工确认含义"), node("h4", "", "把归类写成明确字段"));
    var dl = node("dl", "record-fields");
    [["对象", record.name], ["角色", record.role || "未归入三项主题"], ["证据", "保留原文与来源"], ["标注方式", "人工核对"]].forEach(function (pair) { dl.append(node("dt", "", pair[0]), node("dd", "", pair[1])); });
    fields.append(dl);
    var relations = node("article", "transform-card");
    relations.append(node("span", "", "C / Semantica 写入关系"), node("h4", "", "以后能沿着关系找回来"));
    if (record.role) relations.append(node("div", "relation-line", "研究主题 → " + record.role), node("div", "relation-line", record.role + " → " + record.name));
    relations.append(node("div", "relation-line", record.name + " → 原文证据"), node("p", "", "节点存对象与证据，边记录已确认的关系。"));
    target.replaceChildren(original, fields, relations);
    byId("run-steps").replaceChildren();
    data.build.steps.forEach(function (step, index) {
      var li = node("li", "");
      li.append(node("strong", "", (index + 1) + ". " + step.title), node("span", "", step.owner), node("p", "", step.detail));
      byId("run-steps").append(li);
    });
  }
  function renderAssets() {
    if (window.renderKnowledgeMap) window.renderKnowledgeMap(data, function (query) {
      byId("search-query").value = query;
      showStep(3);
      document.querySelector(".flow-nav").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    byId("asset-grid").replaceChildren();
    data.artifacts.forEach(function (item, index) {
      var card = node("article", "asset-card");
      card.append(node("span", "", "0" + (index + 1)), node("h4", "", item.title), node("p", "", item.purpose), link("打开 " + item.file + " ↗", "projects/011-semantica/artifacts/" + item.file));
      byId("asset-grid").append(card);
    });
    byId("asset-summary").replaceChildren();
    [[data.source_count, "份来源快照"], [data.catalog.length, "条证据记录"], [data.node_count, "个节点"], [data.edge_count, "条关系"]].forEach(function (pair) {
      var span = node("span", ""); span.append(node("strong", "", pair[0]), document.createTextNode(pair[1])); byId("asset-summary").append(span);
    });
  }
  function invalidateBrief() {
    byId("brief-text").value = "";
    byId("brief-download").hidden = true;
    if (downloadUrl) { URL.revokeObjectURL(downloadUrl); downloadUrl = null; }
  }
  function renderSelection() {
    byId("brief-selection").replaceChildren();
    if (!selected.size) byId("brief-selection").append(node("p", "flow-message", "还没有选择项目。可在搜索结果中勾选，或采用下方示例。"));
    selected.forEach(function (number) {
      var item = data.catalog.find(function (row) { return row.number === number; });
      if (!item) return;
      var row = node("div", "brief-selected");
      row.append(node("span", "", item.number + " · " + item.project));
      var remove = node("button", "", "移除"); remove.type = "button";
      remove.setAttribute("aria-label", "从简报移除 " + item.project);
      remove.addEventListener("click", function () { selected.delete(number); invalidateBrief(); renderSelection(); renderResults(lastResults); });
      row.append(remove); byId("brief-selection").append(row);
    });
    byId("make-brief").disabled = !selected.size;
    byId("make-brief").textContent = live ? "生成研究简报" : "导出快照简报";
    message("brief-status", live ? "生成时会重新检查选中来源的文件版本。" : "快照模式无法检查当前文件变化；导出内容会注明这一限制。");
  }
  function renderResults(rows) {
    lastResults = rows;
    byId("search-results").replaceChildren();
    if (!rows.length) byId("search-results").append(node("div", "empty-result", "没有命中。试试更短的关键词，或点击“全部项目”查看本批知识范围。"));
    rows.forEach(function (row) {
      var card = node("article", "search-card");
      card.append(node("h4", "", row.number + " · " + row.project), node("span", "search-role", row.role || "训练实验 · 预设主题之外"), node("blockquote", "", row.quote));
      var fieldNames = { project: "项目名", role: "人工角色", evidence: "原文片段" };
      var matches = Array.from(new Set((row.matches || []).map(function (match) { return fieldNames[match.type] || match.type; })));
      card.append(node("p", "", "命中位置：" + matches.join("、") + " → 关联项目 → 原文证据"), node("p", "", row.source + " · 第 " + row.line + " 行"), link("回看接入时的原文 ↗", row.snapshot));
      var label = node("label", ""), input = node("input", "");
      input.type = "checkbox"; input.checked = selected.has(row.number);
      input.addEventListener("change", function () { if (input.checked) selected.add(row.number); else selected.delete(row.number); invalidateBrief(); renderSelection(); });
      label.append(input, document.createTextNode("纳入研究简报")); card.append(label); byId("search-results").append(card);
    });
  }
  async function runSearch() {
    var query = byId("search-query").value.trim(), requestId = ++queryVersion;
    message("search-summary", live ? "正在从已保存图谱查询…" : "正在筛选保存的记录…");
    try {
      var result;
      if (live) result = await api("/api/search?q=" + encodeURIComponent(query));
      else {
        var words = query.toLowerCase().split(/\s+/).filter(Boolean);
        var rows = data.catalog.map(function (row) {
          var fields = [{ type: "project", content: row.project }, { type: "role", content: row.role || "" }, { type: "evidence", content: row.quote }];
          var matches = fields.filter(function (field) { return !words.length ? field.type === "project" : words.some(function (word) { return field.content.toLowerCase().includes(word); }); });
          return Object.assign({}, row, { matches: matches });
        }).filter(function (row) { return row.matches.length; });
        result = { results: rows };
      }
      if (requestId !== queryVersion) return;
      renderResults(result.results);
      message("search-summary", (live ? "已调用 Semantica：关键词命中 → 图关系取证。" : "快照内关键词筛选，未调用 Python。") + "返回 " + result.results.length + " 个项目；勾选后进入第 5 步。" + (health && !health.all_current ? " 当前有来源变化，请在交付前复核重建。" : ""));
    } catch (error) { if (requestId === queryVersion) message("search-summary", error.message, true); }
  }
  function showStep(index) {
    currentStep = index;
    document.querySelectorAll("[data-step]").forEach(function (button) {
      var active = Number(button.dataset.step) === index;
      button.classList.toggle("is-current", active); button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-panel]").forEach(function (panel) { panel.hidden = Number(panel.dataset.panel) !== index; });
    byId("flow-position").textContent = "0" + (index + 1) + " / 05 · " + titles[index];
    byId("flow-prev").disabled = index === 0;
    byId("flow-next").disabled = index === 4;
    byId("flow-next").textContent = index === 4 ? "流程已展开" : "下一步：" + titles[index + 1] + " →";
    if (index === 3) runSearch();
  }
  function renderAll() { renderRuntime(); renderSources(); renderTransform(); renderAssets(); renderSelection(); }
  function openGraphGuide() {
    showStep(2);
    byId("graph-guide").scrollIntoView({ behavior: "instant", block: "start" });
  }
  document.querySelectorAll('a[href="#graph-guide"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (event) {
      event.preventDefault(); history.replaceState(null, "", "#graph-guide"); openGraphGuide();
    });
  });
  window.addEventListener("hashchange", function () { if (location.hash === "#graph-guide") openGraphGuide(); });

  document.querySelectorAll("[data-step]").forEach(function (button) { button.addEventListener("click", function () { showStep(Number(button.dataset.step)); }); });
  byId("flow-prev").addEventListener("click", function () { showStep(Math.max(0, currentStep - 1)); });
  byId("flow-next").addEventListener("click", function () { showStep(Math.min(4, currentStep + 1)); });
  byId("knowledge-search").addEventListener("submit", function (event) { event.preventDefault(); runSearch(); });
  document.querySelectorAll("[data-query]").forEach(function (button) { button.addEventListener("click", function () { byId("search-query").value = button.dataset.query; runSearch(); }); });
  byId("select-theme").addEventListener("click", function () { selected = new Set(data.answers.map(function (row) { return row.number; })); invalidateBrief(); renderSelection(); renderResults(lastResults); });
  byId("rebuild-button").addEventListener("click", async function () {
    byId("rebuild-button").disabled = true;
    message("build-status", "正在读取原文、校验证据、保存并重新加载图谱…");
    try {
      var response = await api("/api/build", {});
      data = response.data; health = response.freshness;
      selected.clear(); invalidateBrief(); renderAll();
      message("build-status", "本次完成：" + data.source_count + " 份原文已读取，" + data.node_count + " 个节点与 " + data.edge_count + " 条关系已保存并重新加载。继续下一步查看加工履历。");
    } catch (error) { message("build-status", error.message, true); }
    finally { byId("rebuild-button").disabled = !live; }
  });
  byId("make-brief").addEventListener("click", async function () {
    byId("make-brief").disabled = true;
    message("brief-status", "正在整理所选项目与证据…");
    try {
      var result;
      if (live) result = await api("/api/brief", { numbers: Array.from(selected) });
      else {
        var parts = ["# Agent 研究简报（快照导出）", "来源批次：" + data.build.build_id, "当前资料版本未核验；请在采用前复核。"];
        selected.forEach(function (number) { var row = data.catalog.find(function (item) { return item.number === number; }); parts.push("## " + row.project, "角色：" + (row.role || "训练实验"), "> " + row.quote, "来源：" + row.source + "，第 " + row.line + " 行。"); });
        result = { markdown: parts.join("\n\n") };
      }
      invalidateBrief(); byId("brief-text").value = result.markdown;
      downloadUrl = URL.createObjectURL(new Blob([result.markdown], { type: "text/markdown;charset=utf-8" }));
      byId("brief-download").href = downloadUrl; byId("brief-download").hidden = false;
      message("brief-status", live ? "来源版本检查通过。简报已保存为本地文件，可下载并交给后续任务。" : "快照简报已生成，当前来源版本尚未核验。");
    } catch (error) { message("brief-status", error.message, true); }
    finally { byId("make-brief").disabled = !selected.size; }
  });
  renderAll();
  if (location.protocol === "http:" && location.hostname === "127.0.0.1") {
    try { var response = await api("/api/state"); data = response.data; health = response.freshness; live = true; renderAll(); }
    catch (error) { message("build-status", "本机服务未连接，正在使用保存的快照：" + error.message, true); }
  }
  if (location.hash === "#graph-guide") openGraphGuide();
}());

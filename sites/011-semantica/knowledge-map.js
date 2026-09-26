(function () {
  "use strict";
  var selectedNumber = "012";
  var SVG = "http://www.w3.org/2000/svg";
  function html(tag, cls, text) {
    var element = document.createElement(tag);
    if (cls) element.className = cls;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function svg(tag, attributes, text) {
    var element = document.createElementNS(SVG, tag);
    Object.keys(attributes || {}).forEach(function (key) { element.setAttribute(key, attributes[key]); });
    if (text !== undefined) element.textContent = text;
    return element;
  }
  window.renderKnowledgeMap = function (data, onSearch) {
    var graph = data.knowledge_graph;
    if (!graph) return;
    var byId = function (id) { return document.getElementById(id); };
    var nodes = new Map(graph.nodes.map(function (item) { return [item.id, item]; }));
    var catalog = new Map(data.catalog.map(function (item) { return [item.number, item]; }));
    var related = data.catalog.filter(function (item) { return item.role; });
    var separate = data.catalog.filter(function (item) { return !item.role; });
    var ordered = related.concat(separate);
    var positions = new Map();
    var width = { question: 190, role: 170, project: 220, evidence: 190 };
    var x = { question: 20, role: 295, project: 585, evidence: 865 };
    var height = Math.max(450, ordered.length * 110 + 100);
    ordered.forEach(function (item, index) {
      var y = 70 + index * 110 + (index >= related.length ? 20 : 0);
      ["role", "project", "evidence"].forEach(function (kind) {
        var id = kind + ":" + item.number;
        if (nodes.has(id)) positions.set(id, { x: x[kind], y: y, w: width[kind], h: 70 });
      });
    });
    graph.nodes.filter(function (item) { return item.type === "question"; }).forEach(function (item) {
      positions.set(item.id, { x: x.question, y: 70 + Math.max(0, related.length - 1) * 55, w: width.question, h: 70 });
    });
    if (selectedNumber !== null && !catalog.has(selectedNumber)) selectedNumber = data.catalog[0].number;
    var controls = byId("map-controls");
    controls.replaceChildren();
    var choices = data.catalog.slice().sort(function (a, b) { return (a.number === "012" ? -1 : b.number === "012" ? 1 : a.number.localeCompare(b.number)); });
    choices.concat([{ number: null, project: "看全部关系" }]).forEach(function (record) {
      var button = html("button", "", record.project);
      button.type = "button";
      button.dataset.mapProject = record.number === null ? "all" : record.number;
      button.addEventListener("click", function () { selectedNumber = record.number; paint(); });
      controls.append(button);
    });

    function paint() {
      var all = selectedNumber === null;
      var record = all ? null : catalog.get(selectedNumber);
      var answer = all ? null : data.answers.find(function (row) { return row.number === selectedNumber; });
      var path = all ? [] : (answer || record).path;
      var activeNodes = new Set(path);
      var activeEdges = new Set(path.slice(1).map(function (id, index) { return path[index] + "|" + id; }));
      controls.querySelectorAll("button").forEach(function (button) {
        var active = button.dataset.mapProject === (all ? "all" : selectedNumber);
        button.classList.toggle("is-current", active); button.setAttribute("aria-pressed", String(active));
      });
      byId("map-current").textContent = all ? "查看全部已保存关系：每个项目都有依据；其中三项连接到研究主题。" :
        answer ? "先读这一条：研究主题 → " + record.role + " → " + record.project + " → 原文证据。其余关系已淡化。" :
        record.project + " 只有“项目 → 原文证据”的连接。它已被保存，但没有连到这个研究主题。";

      var canvas = byId("knowledge-map");
      canvas.setAttribute("viewBox", "0 0 1080 " + height);
      canvas.replaceChildren(svg("title", { id: "knowledge-map-title" }, "本批知识图谱：" + graph.nodes.length + " 个节点、" + graph.edges.length + " 条关系"),
        svg("desc", { id: "knowledge-map-desc" }, byId("map-current").textContent + "下方文字说明每条高亮关系及原文依据。"));
      var defs = svg("defs");
      ["normal", "active"].forEach(function (kind) {
        var marker = svg("marker", { id: "knowledge-arrow-" + kind, viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
        marker.append(svg("path", { d: "M0 0 L8 4 L0 8 Z", fill: kind === "active" ? "#33845a" : "#a8bda9" }));
        defs.append(marker);
      });
      canvas.append(defs);
      [[20, "我们要研究的问题"], [295, "人工确认的角色"], [585, "具体项目"], [865, "判断的原文依据"]].forEach(function (column) { canvas.append(svg("text", { x: column[0], y: 30, class: "map-column-title" }, column[1])); });
      if (separate.length) {
        var dividerY = 70 + related.length * 110 - 3;
        canvas.append(svg("line", { x1: 20, x2: 1055, y1: dividerY, y2: dividerY, class: "map-divider" }));
        canvas.append(svg("text", { x: 20, y: dividerY + 31, class: "map-separate-label" }, "已保存，但未归入这个主题"));
      }
      var edgeLabels = { includes_layer: "包含", represented_by: "对应项目", supported_by: "有依据" };
      graph.edges.forEach(function (edge) {
        var start = positions.get(edge.source_id), end = positions.get(edge.target_id);
        if (!start || !end) return;
        var active = all || activeEdges.has(edge.source_id + "|" + edge.target_id);
        var a = start.x + start.w, b = start.y + start.h / 2, c = end.x, d = end.y + end.h / 2;
        var middle = (a + c) / 2;
        var group = svg("g", { class: "map-edge" + (active ? " is-active" : ""), "data-map-edge": edge.id });
        group.append(svg("path", { d: "M" + a + " " + b + " C" + middle + " " + b + " " + middle + " " + d + " " + (c - 4) + " " + d,
          "marker-end": "url(#knowledge-arrow-" + (active ? "active" : "normal") + ")" }));
        group.append(svg("text", { x: middle, y: d - 10, "text-anchor": "middle" }, edgeLabels[edge.type] || edge.type));
        canvas.append(group);
      });
      graph.nodes.forEach(function (item) {
        var pos = positions.get(item.id); if (!pos) return;
        var active = all || activeNodes.has(item.id), p = item.properties;
        var group = svg("g", { class: "map-node map-kind-" + item.type + (active ? " is-active" : ""), transform: "translate(" + pos.x + " " + pos.y + ")", "data-map-node": item.id });
        var title = p.content, subtitle = "";
        if (item.type === "question") { title = "持续研究助手"; subtitle = "协调任务 / 知识 / 记忆"; }
        if (item.type === "role") subtitle = "角色分类 · 人工确认";
        if (item.type === "project") subtitle = "研究条目 " + p.project_number;
        if (item.type === "evidence") { title = p.project_number + " · README 原文"; subtitle = "第 " + p.line + " 行 · 可回查"; }
        group.append(svg("title", {}, p.content), svg("rect", { width: pos.w, height: pos.h, rx: 10 }),
          svg("text", { x: 15, y: 29, class: "map-node-title" }, title), svg("text", { x: 15, y: 51, class: "map-node-subtitle" }, subtitle));
        canvas.append(group);
      });

      var reading = byId("map-reading"), evidence = byId("map-evidence");
      reading.replaceChildren(); evidence.replaceChildren();
      if (all) {
        reading.append(html("h5", "", "把全图读成几条简单的句子"));
        data.catalog.forEach(function (row) { reading.append(html("p", "map-whole-line", (row.role ? "研究主题 → " + row.role + " → " : "主题之外：") + row.project + " → README 第 " + row.line + " 行")); });
        evidence.append(html("p", "", "选择上方任一项目，就能展开它的路径与完整证据片段。"));
      } else {
        reading.append(html("h5", "", "沿着高亮线读，意思是："));
        var list = html("ol", "map-reading-list");
        path.slice(1).forEach(function (id, index) {
          var edge = graph.edges.find(function (item) { return item.source_id === path[index] && item.target_id === id; });
          if (!edge) return;
          var explanation = edge.type === "includes_layer" ? "这个研究问题关心“" + record.role + "”这一层。" :
            edge.type === "represented_by" ? "我们将“" + record.project + "”归在这一角色下。" :
            "该项目的判断依据，保存在它的 README 第 " + record.line + " 行。";
          var li = html("li", ""); li.append(html("span", "", String(index + 1)), html("p", "", explanation)); list.append(li);
        });
        reading.append(list, html("p", "map-hop-note", "经过 " + (path.length - 1) + " 条连线，就叫“" + (path.length - 1) + " 跳”。它只是沿已有关系查找的步数。"));
        evidence.append(html("strong", "", "最后找到的依据 · " + record.project), html("blockquote", "", record.quote));
        var sourceLink = html("a", "", "打开接入时的完整原文 ↗"); sourceLink.href = "../../" + record.snapshot; evidence.append(sourceLink);
      }
      var query = all ? "" : record.role === "长期记忆" ? "记忆" : record.role || record.project;
      byId("try-map-search").textContent = all ? "去搜索全部项目 →" : "用“" + query + "”搜索 →";
      byId("try-map-search").onclick = function () { onSearch(query); };
      byId("map-search-explanation").textContent = all ? "搜索先匹配保存的文字，再按项目关系取回原文。角色和线由人事先确认，Semantica 负责保存、查询和沿线取证。" :
        "输入“" + query + "”，先匹配保存的文字，再找到 " + record.project + " 及关联原文。角色和线由人事先确认，Semantica 负责保存、查询和沿线取证。";
      var typeCounts = {}, relationCounts = {};
      graph.nodes.forEach(function (item) { typeCounts[item.type] = (typeCounts[item.type] || 0) + 1; });
      graph.edges.forEach(function (item) { relationCounts[item.type] = (relationCounts[item.type] || 0) + 1; });
      byId("map-counts-title").textContent = "“" + graph.nodes.length + " 个节点、" + graph.edges.length + " 条关系”如何计算？";
      byId("map-counts-detail").textContent = "节点就是框：" + (typeCounts.question || 0) + " 个研究问题 + " + (typeCounts.role || 0) + " 个角色 + " + (typeCounts.project || 0) + " 个项目 + " + (typeCounts.evidence || 0) + " 段证据。关系就是线：" + (relationCounts.includes_layer || 0) + " 条问题→角色 + " + (relationCounts.represented_by || 0) + " 条角色→项目 + " + (relationCounts.supported_by || 0) + " 条项目→证据。";
    }
    paint();
  };
}());

(function () {
  "use strict";

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".lab-tab"));
  var nodes = Array.prototype.slice.call(document.querySelectorAll("[data-node]"));
  var edges = Array.prototype.slice.call(document.querySelectorAll("[data-edge]"));
  var vendorSelect = document.getElementById("vendor-select");
  var controls = document.getElementById("result-controls");
  var evidenceList = document.getElementById("evidence-list");
  var currentMode = "relation";

  var modes = {
    relation: {
      graph: "答案背后的关系路径",
      tag: "关联路径",
      title: "从结论找到支持它的资料",
      body: "沿着“选择星桥云 → 星桥云 → 审查报告”查看支持结论的事实，再连接到选型规则。图谱让这些关系成为可查询对象。",
      status: "路径已显示：决策 → 供应商 → 来源；规则也已关联。",
      warning: false,
      nodes: ["audit", "star", "policy", "decision"],
      edges: ["audit-star", "star-decision", "policy-decision"],
      evidence: [
        ["审查报告 · 示例", "星桥云：支持 SSO；数据处理协议 DPA 已签。"],
        ["选型规则 · 示例", "接入客服平台须同时满足 SSO 与 DPA 已签。"]
      ],
      footnote: "这是预先写入的关系路径，不是自然语言搜索结果或真实供应商评估。"
    },
    conflict: {
      graph: "两份资料指向同一家供应商",
      tag: "事实冲突",
      title: "不同说法要同时留在图上",
      body: "销售邮件说远山云的 DPA“已签”；法务记录写“待签”。示例保留两条说法及其来源，不自动覆盖其中任何一条。",
      status: "发现冲突：远山云的 DPA 状态需要人工复核。",
      warning: true,
      nodes: ["sales", "legal", "far"],
      edges: ["sales-far", "legal-far"],
      conflictNodes: ["sales", "legal", "far"],
      conflictEdges: ["sales-far", "legal-far"],
      evidence: [
        ["销售邮件 · 示例", "远山云的 DPA 已签。"],
        ["法务记录 · 示例", "远山云的 DPA 仍待签。"]
      ],
      footnote: "真实系统必须评估来源可信度、时间和人工裁决；这里只展示冲突如何被看见。"
    },
    decision: {
      graph: "从结果回看依据与规则",
      tag: "决策溯源",
      title: "“选了谁”之外，还要能回答“为何”",
      body: "示例决策记录把选型结果、使用的规则和支持事实串在一起。复核者可以顺着路径回到当时依据的资料。",
      status: "决策链：审查报告 → 星桥云 → 选型规则 → 选择星桥云。",
      warning: false,
      nodes: ["audit", "star", "policy", "decision"],
      edges: ["audit-star", "star-decision", "policy-decision"],
      evidence: [
        ["事实依据 · 示例", "审查报告记录星桥云的 SSO 与 DPA 状态。"],
        ["规则依据 · 示例", "两项条件都满足才可入选。"],
        ["决策记录 · 示例", "本示例选择星桥云；状态与理由可回查。"]
      ],
      footnote: "来源链解释的是系统使用的资料与规则，不能解释模型内部思考，也不能证明现实因果。"
    }
  };

  function ruleView() {
    if (vendorSelect.value === "far") {
      return {
        graph: "规则检查：远山云",
        tag: "规则校验",
        title: "资料冲突时，暂不放行",
        body: "远山云的 SSO 条件已满足，但 DPA 状态有“已签”和“待签”两种说法。条件尚不能确认，示例规则返回“待复核”。",
        status: "待复核：DPA 状态冲突，无法确认全部条件满足。",
        warning: true,
        nodes: ["sales", "legal", "far", "policy"],
        edges: ["sales-far", "legal-far"],
        conflictNodes: ["sales", "legal", "far"],
        conflictEdges: ["sales-far", "legal-far"],
        evidence: [
          ["条件 1 · SSO", "示例资料记录：支持。"],
          ["条件 2 · DPA", "销售邮件与法务记录冲突，不能按“已签”通过。"]
        ],
        footnote: "这是网页预设规则对示例数据的判断，不是 Semantica 推理引擎输出。"
      };
    }
    return {
      graph: "规则检查：星桥云",
      tag: "规则校验",
      title: "两项条件都有来源支持",
      body: "选型规则要求 SSO 和已签 DPA。审查报告对星桥云同时记录了这两项，因此示例规则返回“满足条件”。",
      status: "满足示例规则：SSO ✓ · DPA 已签 ✓",
      warning: false,
      nodes: ["audit", "star", "policy", "decision"],
      edges: ["audit-star", "policy-decision", "star-decision"],
      evidence: [
        ["条件 1 · SSO", "审查报告记录：星桥云支持 SSO。"],
        ["条件 2 · DPA", "审查报告记录：星桥云的 DPA 已签。"]
      ],
      footnote: "这里只判断明确写出的两项条件，不代表供应商已完成全部采购、合规或安全审查。"
    };
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  function renderEvidence(items, warning) {
    evidenceList.replaceChildren();
    items.forEach(function (item) {
      var box = document.createElement("div");
      box.className = "evidence-item" + (warning ? " is-warning" : "");
      var heading = document.createElement("strong");
      heading.textContent = item[0];
      var detail = document.createElement("p");
      detail.textContent = item[1];
      box.appendChild(heading);
      box.appendChild(detail);
      evidenceList.appendChild(box);
    });
  }

  function render() {
    var data = currentMode === "rule" ? ruleView() : modes[currentMode];
    tabs.forEach(function (tab) {
      var selected = tab.dataset.mode === currentMode;
      tab.classList.toggle("is-current", selected);
      tab.setAttribute("aria-pressed", String(selected));
    });
    controls.hidden = currentMode !== "rule";
    setText("graph-title", data.graph);
    setText("result-tag", data.tag);
    setText("result-title", data.title);
    setText("result-body", data.body);
    setText("result-status", data.status);
    setText("result-footnote", data.footnote);
    document.getElementById("result-status").classList.toggle("is-warning", data.warning);
    renderEvidence(data.evidence, data.warning);

    nodes.forEach(function (node) {
      var id = node.dataset.node;
      node.classList.toggle("is-active", data.nodes.indexOf(id) !== -1);
      node.classList.toggle("is-conflict", (data.conflictNodes || []).indexOf(id) !== -1);
    });
    edges.forEach(function (edge) {
      var id = edge.dataset.edge;
      edge.classList.toggle("is-active", data.edges.indexOf(id) !== -1);
      edge.classList.toggle("is-conflict", (data.conflictEdges || []).indexOf(id) !== -1);
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      currentMode = tab.dataset.mode;
      render();
    });
  });
  vendorSelect.addEventListener("change", render);
  render();
}());

(function () {
  "use strict";

  var filters = Array.prototype.slice.call(document.querySelectorAll("[data-scenario-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-scenario-group]"));
  filters.forEach(function (button) {
    button.addEventListener("click", function () {
      var group = button.dataset.scenarioFilter;
      filters.forEach(function (item) {
        var selected = item === button;
        item.classList.toggle("is-current", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      cards.forEach(function (card) {
        card.hidden = group !== "all" && card.dataset.scenarioGroup !== group;
      });
    });
  });

}());

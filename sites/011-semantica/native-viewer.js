(function () {
  "use strict";
  var report = window.semanticaNative;
  var descriptions = {
    force: "库自动排布全部节点。相连的节点形成关系网络；本视图缩短长标签，完整内容在悬停提示中。",
    circular: "同样的节点与关系，改由库沿圆周自动排布。位置变化不代表知识内容变化。",
    path: "调用库自带的路径高亮：橙色线连接研究主题、长期记忆、Hindsight 与它的原文依据，共三条关系。",
    raw: "直接使用原始全文作为节点标签，保留库默认图形样式。长句可能重叠，这也是本次实测暴露出的阅读问题。"
  };
  function select(id) {
    var view = report.views.find(function (item) { return item.id === id; });
    if (!view) return;
    document.querySelectorAll("[data-native]").forEach(function (button) {
      var active = button.dataset.native === id;
      button.classList.toggle("is-current", active);
      button.setAttribute("aria-pressed", String(active));
    });
    var url = "./" + view.file;
    var frame = document.getElementById("native-frame");
    if (frame.getAttribute("src") !== url) frame.src = url;
    frame.title = "Semantica 生成的" + view.title;
    document.getElementById("native-fullscreen").href = url;
    document.getElementById("native-caption").textContent = descriptions[id];
    history.replaceState(null, "", "#" + id);
  }
  document.getElementById("native-version").textContent = "Semantica " + report.semantica_version + " · Plotly " + report.plotly_version;
  document.getElementById("native-batch").textContent = "生成批次：" + report.build_id + " · 输入图谱 SHA-256：" + report.graph_sha256;
  document.querySelectorAll("[data-native]").forEach(function (button) { button.addEventListener("click", function () { select(button.dataset.native); }); });
  var initial = location.hash.slice(1);
  select(report.views.some(function (item) { return item.id === initial; }) ? initial : "force");
}());

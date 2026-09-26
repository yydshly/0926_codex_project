const scenarios = {
  license: [
    { title: "用户描述要完成的事", explain: "用户用自然语言说明目标。代理接下来需要打开网页，寻找能够证明答案的原始页面。", address: "demo.local/start", overline: "等待开始", pageTitle: "示例浏览器", pageCopy: "这里将展示代理看到的虚构网页状态。", pageItem: "输入任务后，代理会依据页面变化继续操作。", traceLabel: "用户任务", trace: "打开示例仓库，找出许可证名称，并提供许可证文件链接。", note: "演示 URL 为虚构地址，不代表真实项目的任务执行结果。" },
    { title: "读取页面上看得到的信息", explain: "代理读取已经加载的页面：标题、链接、按钮和可选截图。它不需要获取这个网站的整个前端工程源码。", address: "demo.local/example-repo", overline: "仓库首页 / 页面状态", pageTitle: "example-repo", pageCopy: "文件列表中出现 README.md、src/ 和 LICENSE。", pageItem: "[3] LICENSE · 可点击文件链接", traceLabel: "代理观察", trace: "当前页面存在名为 LICENSE 的链接，索引为 3。", note: "这里的元素索引只是解释浏览器代理如何定位网页元素。" },
    { title: "模型选动作，浏览器去执行", explain: "模型根据页面状态选择“打开 LICENSE”。Controller 将动作交给浏览器控制层执行。", address: "demo.local/example-repo", overline: "仓库首页 / 准备执行", pageTitle: "example-repo", pageCopy: "代理准备打开许可证文件。", pageItem: "[3] LICENSE · 点击目标", traceLabel: "动作示意", trace: "click(index=3) → 浏览器打开 LICENSE 文件页面", note: "模型负责选择动作；实际点击发生在浏览器中。" },
    { title: "读取新页面，再核对目标", explain: "浏览器返回新的页面状态。代理应读取许可证内容并附上原始链接，人工仍可检查答案。", address: "demo.local/example-repo/LICENSE", overline: "许可证文件 / 模拟结果", pageTitle: "MIT License", pageCopy: "示例文件顶部显示“MIT License”。", pageItem: "证据：许可证名称 + 文件地址", traceLabel: "模拟结果", trace: "许可证：MIT；来源：demo.local/example-repo/LICENSE", note: "真实使用时要检查文件确实来自目标仓库，并核对链接。" }
  ],
  research: [
    { title: "提出一个研究问题", explain: "开放式任务可以先拆成资料线索，例如官方说明、源码位置和版本信息。", address: "demo.local/start", overline: "等待开始", pageTitle: "示例浏览器", pageCopy: "选择研究主题后，代理会逐页寻找相关材料。", pageItem: "主题：某个工具是否支持保存运行记录？", traceLabel: "用户任务", trace: "寻找该工具保存运行记录的官方依据，列出页面链接。", note: "研究模式可组织计划和并行搜索；本示例只展示概念步骤。" },
    { title: "观察搜索结果与官方页面", explain: "代理查看搜索页或文档页，辨别标题、链接与相关段落。", address: "demo.local/docs/search", overline: "文档搜索 / 页面状态", pageTitle: "搜索结果", pageCopy: "出现“History export”和“Run settings”两个候选页面。", pageItem: "[2] History export · 官方文档", traceLabel: "代理观察", trace: "候选结果 2 看起来与运行记录相关，需要打开并核对。", note: "搜索结果只是线索，不能直接代替原始证据。" },
    { title: "打开候选来源", explain: "模型决定进入更相关的页面，浏览器执行跳转。", address: "demo.local/docs/search", overline: "文档搜索 / 准备执行", pageTitle: "搜索结果", pageCopy: "代理准备打开官方文档候选项。", pageItem: "[2] History export · 点击目标", traceLabel: "动作示意", trace: "click(index=2) → 打开文档页面并读取内容", note: "网站结构变化时，代理需要重新观察页面再选择动作。" },
    { title: "汇总时保留原始依据", explain: "最终摘要应包含具体页面链接和可复查的证据片段。", address: "demo.local/docs/history", overline: "官方文档 / 模拟结果", pageTitle: "History export", pageCopy: "示例段落说明可下载执行历史。", pageItem: "结论 + 文档标题 + URL + 证据片段", traceLabel: "模拟结果", trace: "发现一条资料线索；人工继续核对原始文档。", note: "原项目的 Deep Research 报告引用链仍需加强，生成报告不能直接入库。" }
  ],
  form: [
    { title: "描述要填写的内容", explain: "代理可以处理网页输入框；有提交后果的动作应先显示拟填写内容并征求确认。", address: "demo.local/start", overline: "等待开始", pageTitle: "示例浏览器", pageCopy: "这是一个虚构的测试表单。", pageItem: "所有姓名与内容都是教学样例。", traceLabel: "用户任务", trace: "在测试表单中填写姓名“张三”和备注“申请演示”。", note: "本页不会提交任何真实表单。" },
    { title: "识别输入框", explain: "代理读取表单标签与输入框的位置，判断字段对应关系。", address: "demo.local/test-form", overline: "测试表单 / 页面状态", pageTitle: "申请演示", pageCopy: "页面上有“姓名”“备注”两个输入框。", pageItem: "[1] 姓名输入框 · [2] 备注输入框", traceLabel: "代理观察", trace: "字段 1 对应姓名，字段 2 对应备注。", note: "动态表单可能改变结构，执行前要重新核对当前页面。" },
    { title: "逐项输入并检查", explain: "模型选择输入动作，浏览器填写字段。填写完成后先检查内容。", address: "demo.local/test-form", overline: "测试表单 / 输入中", pageTitle: "申请演示", pageCopy: "姓名：张三；备注：申请演示。", pageItem: "提交按钮尚未触发", traceLabel: "动作示意", trace: "input_text(1, '张三') → input_text(2, '申请演示')", note: "输入内容来自虚构示例；提交属于另一个需要确认的动作。" },
    { title: "用页面状态确认结果", explain: "代理重新读取字段，确认文字已出现。提交或发布前仍应由人检查后果。", address: "demo.local/test-form", overline: "测试表单 / 模拟结果", pageTitle: "申请演示", pageCopy: "两个字段显示了预期内容。", pageItem: "已填写 · 未提交", traceLabel: "模拟结果", trace: "字段已填写；等待人工检查与决定是否提交。", note: "“填好了”和“提交成功”是不同的验收目标。" }
  ]
};

const stageNames = ["接收目标", "观察页面", "决定并执行", "核对结果"];
const scenarioButtons = [...document.querySelectorAll("[data-scenario]")];
const stageButtons = [...document.querySelectorAll("[data-stage]")];
const fields = {
  kicker: document.getElementById("demo-kicker"),
  title: document.getElementById("demo-title"),
  explain: document.getElementById("demo-explain"),
  address: document.getElementById("browser-address"),
  overline: document.getElementById("page-overline"),
  pageTitle: document.getElementById("page-title"),
  pageCopy: document.getElementById("page-copy"),
  pageItem: document.getElementById("page-item"),
  traceLabel: document.getElementById("trace-label"),
  trace: document.getElementById("trace-content"),
  note: document.getElementById("demo-note"),
  count: document.getElementById("step-count"),
  next: document.getElementById("next-stage")
};

let currentScenario = "license";
let currentStage = 0;

function render() {
  const item = scenarios[currentScenario][currentStage];
  fields.kicker.textContent = `阶段 ${currentStage + 1} / ${stageNames[currentStage]}`;
  fields.title.textContent = item.title;
  fields.explain.textContent = item.explain;
  fields.address.textContent = item.address;
  fields.overline.textContent = item.overline;
  fields.pageTitle.textContent = item.pageTitle;
  fields.pageCopy.textContent = item.pageCopy;
  fields.pageItem.textContent = item.pageItem;
  fields.traceLabel.textContent = item.traceLabel;
  fields.trace.textContent = item.trace;
  fields.note.textContent = item.note;
  fields.count.textContent = `0${currentStage + 1} / 04`;
  fields.next.innerHTML = currentStage === 3 ? '回到第一步 <span aria-hidden="true">↺</span>' : `下一步：${stageNames[currentStage + 1]} <span aria-hidden="true">→</span>`;
  scenarioButtons.forEach(button => {
    const active = button.dataset.scenario === currentScenario;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  stageButtons.forEach(button => {
    const active = Number(button.dataset.stage) === currentStage;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

scenarioButtons.forEach(button => button.addEventListener("click", () => {
  currentScenario = button.dataset.scenario;
  currentStage = 0;
  render();
}));
stageButtons.forEach(button => button.addEventListener("click", () => {
  currentStage = Number(button.dataset.stage);
  render();
}));
fields.next.addEventListener("click", () => {
  currentStage = (currentStage + 1) % stageNames.length;
  render();
});

render();

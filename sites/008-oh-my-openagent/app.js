const flowSteps = {
  input: {
    label: "STEP 01 / INPUT", glyph: "◎", title: "从目标进入",
    description: "用户提出开发目标；`ulw` 等关键词或命令可选择更强的工作模式。简单任务也可以直接交给主智能体。",
    source: "https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/orchestration.md",
    sourceLabel: "查看编排指南 ↗"
  },
  plan: {
    label: "STEP 02 / PLAN", glyph: "▦", title: "把目标变成计划",
    description: "主智能体维护任务和证据。复杂工作可以先用 `/ulw-plan` 形成可审阅计划，再用 `/ulw-execute` 在同一会话中执行。",
    source: "https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/overview.md",
    sourceLabel: "查看计划流程 ↗"
  },
  delegate: {
    label: "STEP 03 / DELEGATE", glyph: "◇", title: "按工作类型分派",
    description: "主智能体通过 `task` 指定任务类别；类别决定工作会话使用的模型和技能。探索、文档搜索与实现任务各有不同角色。",
    source: "https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/overview.md#how-it-works-agent-orchestration",
    sourceLabel: "查看分派机制 ↗"
  },
  tools: {
    label: "STEP 04 / EXECUTE", glyph: "⌘", title: "工具与规则共同执行",
    description: "LSP、AST-Grep 和 MCP 提供代码及资料能力。Hooks 在消息、工具调用和会话事件中注入规则、拦截动作或处理失败。",
    source: "https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/reference/features.md#hooks",
    sourceLabel: "查看 Hooks 参考 ↗"
  },
  verify: {
    label: "STEP 05 / VERIFY", glyph: "✓", title: "读回结果并核查",
    description: "工作任务将结果交回主智能体；主智能体结合待办、诊断和证据确认交付。续跑机制服务于尚未完成的目标。",
    source: "https://github.com/code-yeongyu/oh-my-openagent/blob/dev/docs/guide/orchestration.md",
    sourceLabel: "查看编排指南 ↗"
  }
};

const stepButtons = [...document.querySelectorAll(".flow-step")];
const flowLabel = document.getElementById("flow-label");
const flowGlyph = document.getElementById("flow-glyph");
const flowTitle = document.getElementById("flow-title");
const flowDescription = document.getElementById("flow-description");
const flowSource = document.getElementById("flow-source");

for (const button of stepButtons) {
  button.addEventListener("click", () => {
    const step = flowSteps[button.dataset.step];
    if (!step) return;
    for (const other of stepButtons) {
      const active = other === button;
      other.classList.toggle("is-active", active);
      other.setAttribute("aria-pressed", String(active));
    }
    flowLabel.textContent = step.label;
    flowGlyph.textContent = step.glyph;
    flowTitle.textContent = step.title;
    flowDescription.textContent = step.description;
    flowSource.href = step.source;
    flowSource.textContent = step.sourceLabel;
  });
}

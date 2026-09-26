"""Build the original, source-backed Oh My OpenAgent research map."""

from html import escape
from pathlib import Path

WIDTH, HEIGHT = 2400, 2260
BG = "#f5f2ec"
INK = "#17233e"
MUTED = "#59677e"
ORANGE = "#ce5939"
BLUE = "#3c5d9f"
LINE = "#d6d9dc"
DARK = "#122344"
WHITE = "#fffdfa"
parts: list[str] = []


def add(markup: str) -> None:
    parts.append(markup)


def rect(x, y, w, h, fill=WHITE, radius=20, stroke="none", sw=1):
    add(
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
    )


def text(x, y, value, size=24, fill=INK, weight=500, anchor="start", spacing=0):
    add(
        f'<text x="{x}" y="{y}" fill="{fill}" font-size="{size}" '
        f'font-weight="{weight}" text-anchor="{anchor}" letter-spacing="{spacing}" '
        f'font-family="Microsoft YaHei, PingFang SC, Noto Sans CJK SC, Arial, sans-serif">'
        f'{escape(str(value))}</text>'
    )


def lines(x, y, values, size=22, step=34, fill=MUTED, weight=500):
    for index, value in enumerate(values):
        text(x, y + index * step, value, size, fill, weight)


def path(d, stroke=ORANGE, sw=3, dashed=False, arrow=False):
    dash = ' stroke-dasharray="8 8"' if dashed else ""
    marker = ' marker-end="url(#arrow)"' if arrow else ""
    add(
        f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{sw}" '
        f'stroke-linecap="round" stroke-linejoin="round"{dash}{marker}/>'
    )


def pill(x, y, w, label, fill, color, size=18):
    rect(x, y, w, 34, fill, 17)
    text(x + w / 2, y + 23, label, size, color, 750, "middle")


def section_label(x, y, tag, title):
    text(x, y, tag, 19, ORANGE, 800, spacing=2)
    text(x, y + 47, title, 40, INK, 800)


def mini_row(x, y, w, index, title, detail, tag=None):
    rect(x, y, w, 72, "#f7f7f5", 12, LINE)
    text(x + 18, y + 28, index, 18, ORANGE, 800)
    text(x + 72, y + 30, title, 22, INK, 750)
    text(x + 72, y + 57, detail, 17, MUTED)
    if tag:
        text(x + w - 18, y + 29, tag, 16, BLUE, 750, "end")


def scenario_task(x, y, w, h, code, title, detail, fill="#1e3459"):
    rect(x, y, w, h, fill, 13, "#54709f", 1.2)
    text(x + 18, y + 28, code, 17, "#f5aa75", 800, spacing=1)
    text(x + 18, y + 61, title, 23, "#fffdf7", 750)
    text(x + 18, y + 87, detail, 17, "#bfcce1")


add(
    f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
    f'viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-labelledby="title desc">'
)
add(
    '<title id="title">Oh My OpenAgent 能力、编排原理与真实研究任务示例调度全景图</title>'
    '<desc id="desc">上方解释交互模式、主智能体与子智能体、工具和生命周期控制；中部比较发行版、场景与扩展方向；下方以本仓库新增研究项目的真实需求展示示例调度及验收。该调度不是 OmO 运行日志。</desc>'
)
add(
    '<defs>'
    '<marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" orient="auto">'
    '<path d="M0 0L10 5L0 10Z" fill="#ce5939"/></marker>'
    '<pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">'
    '<circle cx="1" cy="1" r="1.2" fill="#ffffff" opacity=".12"/></pattern>'
    '</defs>'
)
rect(0, 0, WIDTH, HEIGHT, BG, 0)
rect(0, 0, WIDTH, 24, DARK, 0)
text(68, 91, "PROJECT 008  /  COMPLETE RESEARCH MAP", 20, ORANGE, 850, spacing=3)
text(68, 172, "Oh My OpenAgent：从目标到可核查交付", 64, INK, 850)
text(71, 224, "能力 · 技术原理 · 人机交互 · 发行版 · 使用场景 · 完整任务调度", 27, MUTED)
pill(1840, 78, 470, "基于公开文档整理  ·  2026-09-26", "#e5e9f0", "#365285", 20)

# 01. Main architecture: entry, orchestration, supporting mechanisms.
section_label(68, 290, "01 / SYSTEM AT A GLANCE", "系统如何接收、分派并完成工作")
rect(68, 360, 686, 570, WHITE, 20, LINE)
rect(774, 360, 852, 570, WHITE, 20, LINE)
rect(1646, 360, 686, 570, WHITE, 20, LINE)
text(96, 407, "入口与人机交互", 31, INK, 800)
text(802, 407, "主 Agent 保留全局计划与验收", 31, INK, 800)
text(1674, 407, "工具、规则与控制层", 31, INK, 800)
text(96, 439, "复杂度决定启动方式；并非每次都需要多 Agent。", 19, MUTED)
text(802, 439, "通过 task 下发单位工作，结果和证据回到主会话。", 19, MUTED)
text(1674, 439, "Hooks 在智能体循环的关键节点介入。", 19, MUTED)

mini_row(96, 468, 630, "A", "直接提出目标", "小修复：主 Agent 可以直接完成")
mini_row(96, 550, 630, "B", "ulw / ultrawork", "探索、执行、检查的自动工作模式")
mini_row(96, 632, 630, "C", "/ulw-plan → /ulw-execute", "先形成可审阅计划，再执行")
mini_row(96, 714, 630, "D", "mass-ulw", "有先后依赖的多任务图")
mini_row(96, 796, 630, "E", "Team Mode（可选）", "共享任务和消息；OpenCode 完整版", "ULTIMATE")
text(100, 902, "人的关键动作：给目标 · 审计划 · 检查最终证据", 19, ORANGE, 750)

# Center connections are drawn before their nodes.
path("M1200 569V597 M1200 597H904V624 M1200 597V624 M1200 597H1495V624", "#91a2bf", 3)
path("M904 750V775H1200 M1200 750V775 M1495 750V775H1200 M1200 775V798", ORANGE, 3)
rect(976, 474, 448, 95, DARK, 16)
text(1200, 515, "MAIN AGENT / ORCHESTRATOR", 20, "#f5ad76", 800, "middle", 1.5)
text(1200, 548, "规划 · 分解 · 分派 · 核查", 24, "#fffdf7", 750, "middle")
rect(806, 624, 286, 126, "#eaf0f9", 14, "#b5c7df")
rect(1103, 624, 286, 126, "#fff0e6", 14, "#edc6af")
rect(1400, 624, 194, 126, "#eef0f8", 14, "#c4c9df")
text(830, 660, "只读专员", 23, INK, 800)
lines(830, 692, ["explore：查代码", "librarian：查资料"], 18, 28)
text(1127, 660, "类别工作 Agent", 23, INK, 800)
lines(1127, 692, ["quick / deep / visual", "类别 → 模型 + 技能"], 18, 28)
text(1422, 660, "团队成员", 22, INK, 800)
lines(1422, 692, ["共享任务", "可选并行"], 17, 28)
rect(911, 798, 578, 84, "#f2f5f8", 14, "#cbd5e2")
text(1200, 833, "独立工作会话 → 返回结果与证据", 23, INK, 750, "middle")
text(1200, 861, "主 Agent 继续推进；失败或未完成项进入下一轮", 18, MUTED, 500, "middle")

mini_row(1674, 468, 630, "1", "代码工具", "LSP 诊断、AST-Grep 结构搜索")
mini_row(1674, 550, 630, "2", "MCP 与 Skills", "文档、网页、代码搜索及专用能力")
mini_row(1674, 632, 630, "3", "生命周期 Hooks", "Message / PreTool / PostTool / Event")
mini_row(1674, 714, 630, "4", "项目规则和状态", "AGENTS.md、计划、待办、续跑")
mini_row(1674, 796, 630, "5", "质量与恢复", "编辑保护、模型回退、可选 Hashline")
text(1678, 902, "可用性取决于版本、配置和宿主环境", 19, ORANGE, 750)

# Core loop.
rect(68, 954, 2264, 150, DARK, 20)
text(98, 994, "CORE LOOP / 运行闭环", 20, "#f4aa75", 850, spacing=2)
loop_items = [
    ("目标", "输入"),
    ("计划", "拆分"),
    ("分派", "并行 / 依赖"),
    ("执行", "工具 + Hooks"),
    ("验证", "证据 / 续跑"),
]
for index, (title, subtitle) in enumerate(loop_items):
    x = 104 + index * 445
    rect(x, 1012, 374, 64, "#20375e", 12, "#54709f")
    text(x + 20, 1040, f"{index + 1:02d}  {title}", 24, "#fffdf7", 800)
    text(x + 20, 1063, subtitle, 16, "#b9c8df")
    if index < len(loop_items) - 1:
        path(f"M{x + 378} 1044H{x + 428}", "#f3a56f", 3, arrow=True)

# Editions, fit, extensions.
section_label(68, 1170, "02 / CHOOSE THE RIGHT SHAPE", "发行版、适用场景与后续方向")
rect(68, 1240, 686, 265, WHITE, 20, LINE)
rect(774, 1240, 852, 265, WHITE, 20, LINE)
rect(1646, 1240, 686, 265, WHITE, 20, LINE)
text(96, 1285, "三个发行版", 30, INK, 800)
text(96, 1325, "Ultimate  /  OpenCode 插件：能力最全、Team Mode 可选", 20, MUTED)
text(96, 1366, "Light  /  Codex CLI 插件：移植规则、工具、续跑等组件", 20, MUTED)
text(96, 1407, "Native  /  独立命令：当前 beta", 20, MUTED)
text(96, 1470, "不可把完整版能力直接套用于 Codex 桌面会话", 18, ORANGE, 750)

text(802, 1285, "适用与边界", 30, INK, 800)
text(802, 1325, "适合：跨模块重构、调研后实现、长期迁移、依赖任务图", 20, MUTED)
text(802, 1366, "小任务：直接交给主 Agent；并行会增加协调成本", 20, MUTED)
text(802, 1407, "验收：真实结果应核对测试、来源、权限与交付物", 20, MUTED)
text(802, 1470, "本研究未安装 OmO，也没有效率或质量实测", 18, ORANGE, 750)

text(1674, 1285, "可扩展方向", 30, INK, 800)
text(1674, 1325, "上游：Core / MCP / Skills / Adapter 分层", 20, MUTED)
text(1674, 1366, "建议：固定任务的完成率、成本、缺陷评测", 20, MUTED)
text(1674, 1407, "建议：预算、停止条件、权限与证据链", 20, MUTED)
text(1674, 1470, "建议项是研究假设，不是已验证能力", 18, ORANGE, 750)

# Real requirement, example dispatch. Panel is deliberately distinct from the verified architecture.
text(68, 1554, "03 / REAL REQUIREMENT · EXAMPLE SCHEDULE", 19, ORANGE, 800, spacing=2)
text(68, 1600, "完整场景：为本研究仓库新增 OmO 研究页", 40, INK, 800)
rect(68, 1630, 2264, 520, DARK, 20)
add('<rect x="68" y="1630" width="2264" height="520" rx="20" fill="url(#dots)"/>')
pill(98, 1655, 470, "真实任务输入  /  示例调度", "#f5b27b", "#17233e", 20)
text(590, 1680, "目标：研究来源与许可 → 形成 README → 制作一张图与网页 → 更新索引 → 验收", 21, "#e4ecf7")
text(100, 1730, "阶段 0：规划与人审（/ulw-plan）", 24, "#f6b27f", 800)

phase0 = [
    (98, "0A / 主会话", "读取用户目标", "明确页面与来源标准"),
    (545, "0B / 并行只读", "explore + librarian", "本地规范 / 上游文档"),
    (992, "0C / 主会话", "整理任务简报", "定义文件、依赖和验收"),
    (1439, "0D / 用户", "确认关键决定", "允许写正式计划"),
    (1886, "0E / 顾问与评审", "补缺口、写计划", "plan-consultant / reviewer"),
]
for x, code, title, detail in phase0:
    scenario_task(x, 1751, 420, 100, code, title, detail)
for x in (523, 970, 1417, 1864):
    path(f"M{x} 1801H{x + 18}", "#f5aa75", 2.5, arrow=True)

text(100, 1891, "阶段 1：按依赖调度（/ulw-execute）", 24, "#f6b27f", 800)
text(872, 1891, "B 与 C 同一波次并行；D 在两者交付后启动", 18, "#bfcce1")
scenario_task(98, 1911, 400, 105, "1A / MAIN", "Goal + Todos", "登记状态与验收项")
scenario_task(548, 1911, 560, 105, "1B / WRITING  ·  同一波次", "研究 README", "来源、许可、机制、边界")
scenario_task(1144, 1911, 560, 105, "1C / VISUAL  ·  同一波次", "能力图 + 展示页", "SVG、交互、相对链接")
scenario_task(1754, 1911, 550, 105, "1D / QUICK  ·  等待 B/C", "索引集成", "根 README 与 sites/README")

text(100, 2054, "阶段 2：独立验收", 24, "#f6b27f", 800)
text(418, 2054, "来源/许可  →  链接/移动端  →  主 Agent 核查证据  →  失败则返工；通过后交付", 21, "#fffdf7")
text(100, 2116, "真实交付文件：projects/008-oh-my-openagent/README.md  ·  assets/capability-map.svg  ·  sites/008-oh-my-openagent/index.html", 18, "#bfcce1")

text(71, 2192, "图例 / 机制来源：README、编排指南、功能参考、Team Mode 与 ROADMAP；链接与验证范围见本研究 README。", 19, MUTED)
text(71, 2224, "场景说明：需求与交付文件真实存在；图中的 OmO 调度为按文档设计的样例，非 OmO 运行日志或性能证据。", 19, ORANGE, 750)
text(2330, 2224, "008  /  ORIGINAL RESEARCH DIAGRAM", 17, MUTED, 700, "end", 1)
add("</svg>")

destination = Path(__file__).with_name("capability-map.svg")
destination.write_text("\n".join(parts), encoding="utf-8")
print(destination)

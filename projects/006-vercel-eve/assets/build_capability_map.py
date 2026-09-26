"""Generate the self-contained Chinese SVG overview of vercel/eve."""

from pathlib import Path
from xml.sax.saxutils import escape

W, H = 2100, 3260
BG = "#07141b"
CARD = "#10242d"
CARD_ALT = "#12303a"
LINE = "#31515a"
WHITE = "#f1f8f6"
MUTED = "#b7cdca"
GREEN = "#8ef2c1"
CYAN = "#77d8e9"
AMBER = "#f2c883"
RED = "#f0a6a0"
FONT = "'Microsoft YaHei','PingFang SC','Noto Sans CJK SC',sans-serif"

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">']
svg.append('<title id="title">Vercel eve Agent 框架能力全景图</title>')
svg.append('<desc id="desc">一张图介绍 eve 的定位、输入输出、执行原理、能力、应用场景、验证结果、部署要求，以及它相对于个人使用 Codex 的意义。</desc>')
svg.append('''<defs>
  <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#07141b"/><stop offset=".57" stop-color="#0b2028"/><stop offset="1" stop-color="#08171f"/></linearGradient>
  <linearGradient id="hero" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#173c3c"/><stop offset="1" stop-color="#10242d"/></linearGradient>
  <marker id="arrow" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto"><path d="M1 1 L13 7 L1 13" fill="none" stroke="#8ef2c1" stroke-width="2.5"/></marker>
  <marker id="arrow-cyan" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto"><path d="M1 1 L13 7 L1 13" fill="none" stroke="#77d8e9" stroke-width="2.5"/></marker>
</defs>''')
svg.append(f'<rect width="{W}" height="{H}" fill="url(#background)"/>')
svg.append('<circle cx="1870" cy="120" r="300" fill="#143e3a" opacity=".34"/>')
svg.append('<circle cx="170" cy="1770" r="270" fill="#0e3b44" opacity=".19"/>')


def rect(x, y, w, h, fill=CARD, stroke=LINE, radius=24, sw=2):
    svg.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')


def text(x, y, value, size=25, color=WHITE, weight=400, anchor="start", spacing=0):
    svg.append(
        f'<text x="{x}" y="{y}" fill="{color}" font-family="{FONT}" font-size="{size}" '
        f'font-weight="{weight}" text-anchor="{anchor}" letter-spacing="{spacing}">{escape(value)}</text>'
    )


def lines(x, y, values, size=23, leading=38, color=MUTED, weight=400):
    for i, value in enumerate(values):
        text(x, y + i * leading, value, size, color, weight)


def pill(x, y, w, label, color=GREEN, fill="#173e37"):
    rect(x, y, w, 42, fill, color, 21, 1.5)
    text(x + w / 2, y + 29, label, 18, color, 700, "middle")


def section(num, title, y, subtitle=""):
    text(90, y, num, 22, GREEN, 800, spacing=3)
    text(172, y + 5, title, 42, WHITE, 800)
    if subtitle:
        text(2008, y + 1, subtitle, 21, MUTED, 400, "end")


def rule(x1, y1, x2, y2, color=LINE, sw=2, marker=None, dash=None):
    extra = f' marker-end="url(#{marker})"' if marker else ""
    extra += f' stroke-dasharray="{dash}"' if dash else ""
    svg.append(f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{color}" stroke-width="{sw}"{extra}/>')


# Header and the core distinction.
text(90, 88, "FIELD GUIDE  /  PROJECT 006  /  2026-09-26", 22, GREEN, 800, spacing=3)
text(90, 191, "eve：把 Agent 做成可持续运行的服务", 76, WHITE, 850)
text(92, 253, "Vercel 的文件式 TypeScript Agent 框架  ·  应用运行层与服务端能力", 29, MUTED, 500)
rect(90, 295, 1920, 85, "url(#hero)", "#3b786f", 21, 2)
text(126, 350, "一句话：模型负责判断，工具负责行动；eve 负责会话、循环、审批、恢复与多入口交付。", 32, GREEN, 750)

# Execution model.
section("01", "从输入到输出：一次任务如何运行", 457, "中心是 Agent 服务；网页只是可选入口")
rect(90, 505, 440, 654)
rect(560, 505, 980, 654, CARD_ALT, "#3e7174")
rect(1570, 505, 440, 654)

text(124, 562, "输入 INPUT", 31, CYAN, 800)
rule(124, 583, 496, 583)
text(124, 628, "开发时：定义能力", 25, WHITE, 750)
lines(124, 671, ["指令、模型与运行配置", "有类型的工具、技能、子 Agent", "连接、渠道、定时任务、鉴权", "模型密钥与工具凭据"], 23, 42)
rule(124, 834, 496, 834)
text(124, 879, "运行时：提交任务", 25, WHITE, 750)
lines(124, 922, ["用户消息 / HTTP 请求 / 聊天消息", "计划触发、会话 ID 与上下文", "人的审批答复或追加指令"], 23, 43)
text(124, 1109, "入口示例：网页、API、Slack 等", 21, CYAN, 650)

text(600, 562, "eve 运行核心", 31, GREEN, 800)
text(1500, 559, "session → turn → step", 19, MUTED, 600, "end")
rule(600, 583, 1500, 583)
nodes = [
    (600, "① 渠道 / 鉴权", "接入并识别请求"),
    (825, "② 持久会话", "定位任务与上下文"),
    (1050, "③ 模型判断", "决定回复或调用工具"),
    (1275, "④ 工具执行", "查询 API / 执行动作"),
]
for x, title, body in nodes:
    rect(x, 628, 205, 132, "#0a212a", "#49727a", 17, 2)
    text(x + 16, 681, title, 23, WHITE, 800)
    text(x + 16, 725, body, 17, MUTED, 500)
for x in (807, 1032, 1257):
    rule(x, 694, x + 14, 694, GREEN, 3, "arrow")
rule(1380, 786, 1165, 786, CYAN, 2.5, "arrow-cyan")
text(1265, 812, "工具结果回到模型，按需再次循环", 20, CYAN, 650, "middle")
rect(600, 838, 900, 105, "#19362f", "#5a9c7e", 16, 2)
text(628, 878, "人工审批 / 等待输入", 25, GREEN, 800)
text(628, 915, "敏感工具先暂停；人批准或拒绝后，任务从等待点继续。", 22, WHITE, 450)
rect(600, 968, 900, 148, "#0b2028", "#49727a", 16, 2)
text(628, 1010, "持久执行的关键：Workflow SDK 按步骤保存进度", 24, CYAN, 800)
lines(628, 1050, ["完成的步骤恢复时重放结果；中断中的步骤可能重跑。", "会话状态由 defineState 保存；外部写入仍需幂等处理。"], 21, 36)

text(1604, 562, "输出 OUTPUT", 31, AMBER, 800)
rule(1604, 583, 1976, 583)
text(1604, 628, "给用户", 25, WHITE, 750)
lines(1604, 671, ["回复文本、多轮对话", "流式事件、任务状态", "审批请求与处理结果"], 23, 42)
rule(1604, 813, 1976, 813)
text(1604, 858, "给业务系统", 25, WHITE, 750)
lines(1604, 901, ["工具执行结果 / 外部 API 动作", "会话内持久状态与事件记录", "跨会话数据需另配存储或记忆"], 22, 42)
text(1604, 1110, "具体效果取决于你接入的工具", 20, AMBER, 650)

# Capabilities.
section("02", "能力地图：它替应用开发者解决什么", 1235, "框架提供机制；具体业务能力由你编写或接入")
capabilities = [
    ("01", "文件式 Agent", ["用约定目录管理 instructions、", "agent.ts、tools、skills 等；", "便于审阅、版本化与扩展。"], CYAN),
    ("02", "模型 + 工具循环", ["模型决定下一步；工具输入受", "schema 约束，结果返回模型；", "可完成多轮查询与行动。"], GREEN),
    ("03", "持久会话与恢复", ["session / turn / step 分层；", "按步骤检查点恢复长期任务，", "等待时可暂停计算。"], CYAN),
    ("04", "人工审批", ["工具可配置每次、首次或", "按策略审批；把敏感动作", "停在人工决定之前。"], AMBER),
    ("05", "会话状态", ["defineState 保存会话内数据，", "供后续轮次读取；跨会话", "共享需外部存储或记忆。"], GREEN),
    ("06", "运行隔离与访问控制", ["自定义工具与凭据在应用环境；", "模型可用命令在沙箱；入口", "还需配置认证与权限。"], CYAN),
    ("07", "多入口与前端", ["HTTP、聊天渠道、定时任务；", "网页可用 React / Vue / Svelte", "客户端连接会话与事件流。"], GREEN),
    ("08", "组合与评测", ["可接 MCP / OpenAPI、技能与", "子 Agent；用评测检查行为", "变化，支持复用与分工。"], AMBER),
]
for idx, (number, title, body, accent) in enumerate(capabilities):
    col, row = idx % 4, idx // 4
    x, y = 90 + col * 490, 1280 + row * 310
    rect(x, y, 460, 280, CARD, LINE, 23, 2)
    text(x + 27, y + 48, number + " / CAPABILITY", 18, accent, 800, spacing=2)
    text(x + 27, y + 103, title, 29, WHITE, 800)
    lines(x + 27, y + 151, body, 21, 36, MUTED)

# Scenario and verification.
section("03", "使用场景与实现效果", 2011, "以下是可构建的应用方案，需接入业务 API 与权限")
scenarios = [
    ("仓库研究入口", ["输入 owner/repo → 查询 GitHub 元数据", "→ 模型给出初步建议 → 人审批保存", "→ 下一轮读回判断。"], GREEN),
    ("客服与业务办理", ["输入用户问题 → 查订单 / 知识库", "→ 草拟处理方案 → 敏感修改待审批", "→ 返回结果并保留会话轨迹。"], CYAN),
    ("周期巡检与通知", ["计划触发 → 调用监控或项目 API", "→ 汇总异常 → 按规则请求复核", "→ 经渠道发送摘要。"], AMBER),
]
for idx, (title, body, accent) in enumerate(scenarios):
    x = 90 + idx * 650
    rect(x, 2060, 620, 315, CARD_ALT, LINE, 23, 2)
    pill(x + 25, 2082, 130, "场景示意", accent, "#16333a")
    text(x + 26, 2179, title, 31, WHITE, 800)
    lines(x + 26, 2235, body, 22, 41, MUTED)

rect(90, 2405, 1920, 173, "#142830", "#42616a", 23, 2)
pill(116, 2429, 118, "本机实测", GREEN, "#163d34")
text(260, 2460, "示例已构建；GitHub 查询工具取回真实元数据；eve 服务健康检查返回 ready。", 23, WHITE, 600)
pill(116, 2501, 118, "待验证", AMBER, "#443624")
text(260, 2533, "完整模型工具循环、真实审批暂停、同一会话跨轮读回（本机未配置模型，dev 启动遇到路径错误）。", 22, MUTED, 500)

# Personal decision and operational conditions.
section("04", "对你的意义：已经有 Codex，还需要它吗？", 2658, "判断依据：你是否要自己运营一个长期 Agent 服务")
rect(90, 2708, 905, 280, CARD, "#3a6665", 23, 2)
rect(1025, 2708, 985, 280, CARD_ALT, "#609482", 23, 2)
pill(116, 2730, 185, "当前：Codex", CYAN, "#173442")
text(116, 2814, "自己发起研究与编写", 31, WHITE, 800)
lines(116, 2860, ["查资料、改 README、写代码、做一次性分析：", "继续用现成的 Codex 更直接。"], 23, 39)
pill(1051, 2730, 225, "出现产品需求：eve", GREEN, "#183f35")
text(1051, 2814, "让别人提交，服务持续处理", 31, WHITE, 800)
lines(1051, 2860, ["多用户、网页 / 聊天入口、跨天续跑、人工审批", "和自己的工具权限：再评估 eve 的工程价值。"], 23, 39)

rect(90, 3019, 1920, 111, "#0c2229", "#31515a", 20, 2)
text(120, 3062, "部署条件", 24, AMBER, 800)
text(267, 3062, "可部署到 Vercel 或自托管 Node；需要模型凭据、入口鉴权、工作流与沙箱配置。", 23, WHITE, 500)
text(267, 3101, "边界：eve 仍处 beta；持久步骤不保证外部动作只执行一次，写操作须考虑审批与幂等。", 21, MUTED)

rule(90, 3164, 2010, 3164)
text(90, 3200, "依据：vercel/eve 官方 README、执行模型、工具/审批、状态、前端与部署文档；完整链接见本项目 README。", 19, MUTED)
text(90, 3232, "制图：本仓库原创。图中场景为应用方案；实测范围明确标注。资料核对日：2026-09-26。", 18, MUTED)
text(2010, 3232, "GITHUB PROJECT RESEARCH  /  006", 18, GREEN, 800, "end", 1)

svg.append("</svg>")
output = Path(__file__).with_name("eve-capability-map.svg")
output.write_text("\n".join(svg) + "\n", encoding="utf-8")
print(output)

# 007 — Palmier Pro

Palmier Pro 是一款面向 AI Agent 的 macOS 非线性视频剪辑软件。视频、图片、声音和字幕进入工程后，可按画面语义或语音内容查找片段；Agent 经 MCP 调用编辑工具修改帧级时间线，人再预览、撤销或精修。它适合访谈课程初剪、批量短视频及实拍与生成素材混剪；对我们的价值是研究“可审查的 Agent 创作工作流”。[在线查看能力全景图](https://yydshly.github.io/0926_codex_project/sites/007-palmier-pro/)。

> 资料核对：2026-09-26。产品文档描述当前发行版；公开源码仅能验证截至 `last-gpl-source`（v0.7.6）的实现，后续二进制发行版为专有软件。

![Palmier Pro 能力全景图：输入、内部模块、实现主线、输出、扩展方向与当前工作意义](assets/capability-map.png)

图：本研究项目原创归纳，非 Palmier 官方架构图。[查看可缩放 SVG 原图](assets/capability-map.svg)。画面语义检索和声音分析在图中是并列路径。

## 来源与许可

- 源仓库：[palmier-io/palmier-pro](https://github.com/palmier-io/palmier-pro)，作者及版权方 Palmier, Inc.。
- 历史源码：[last-gpl-source](https://github.com/palmier-io/palmier-pro/tree/last-gpl-source)，许可为 [GPL-3.0](https://github.com/palmier-io/palmier-pro/blob/last-gpl-source/LICENSE)。据[当前仓库说明](https://github.com/palmier-io/palmier-pro)，v0.7.6 之后的二进制发行版为专有软件，仓库不再接受代码贡献。
- 当前功能依据：[Agent 与 MCP](https://www.palmier.io/docs/agent-and-mcp)、[时间线编辑](https://www.palmier.io/docs/timeline-editing)、[生成式 AI](https://www.palmier.io/docs/generative-ai)、[导出](https://www.palmier.io/docs/export)。
- 架构依据：[时间线模型](https://github.com/palmier-io/palmier-pro/blob/last-gpl-source/Sources/PalmierPro/Models/Timeline.swift)、[Agent 工具实现示例](https://github.com/palmier-io/palmier-pro/blob/last-gpl-source/Sources/PalmierPro/Agent/Tools/ToolExecutor%2BTimeline.swift)、[Swift 包配置](https://github.com/palmier-io/palmier-pro/blob/last-gpl-source/Package.swift)、[合成器](https://github.com/palmier-io/palmier-pro/blob/main/Sources/PalmierPro/Compositing/CustomVideoCompositor.swift)。

## 实际发现

1. **产品定位**：完整剪辑器加 Agent 操作接口。MCP 允许外部 Agent 读取工程、管理素材、编辑时间线、检查画面并发起导出；应用内也有 Agent 对话。它并非单纯的视频生成模型或可直接嵌入其他程序的剪辑 SDK。
2. **编辑能力**：多轨时间线、裁切、插入与波纹删除、字幕与转写、关键帧、调色与特效、多机位同步。当前文档列出 `get_timeline`、`add_clips`、`remove_silence`、`add_captions`、`export_project` 等工具；具体可用性应以所安装版本的工具发现结果为准。
3. **实现机制**：公开模型使用 Timeline → Track → Clip 结构，以帧表示片段位置、长度与关键帧；MCP 工具调用编辑器领域操作并使用共享撤销历史；AVFoundation 承担媒体处理，Core Image／Metal 用于画面合成。这里描述的是可见源码，不外推闭源新版内部实现。
4. **生成能力**：当前文档提供文生／图生视频、图片、配音、音乐、音效、扩分辨率等流程。生成结果进入媒体库并能放入时间线；生成服务需要积分，编辑器与 MCP 连接本身可免费使用。
5. **适用场景**：重复格式的视频初剪、访谈或课程的转写与字幕、多版本短视频、AI 生成镜头与实拍素材混剪，以及 Agent 初稿后人工审片。
6. **平台边界**：当前产品要求 macOS 26 及 Apple Silicon。本仓库的 Windows 工作环境无法直接运行它；研究价值主要在“可操作的创作软件”架构与自动化工作流。
7. **剪辑判断**：声音只是可用线索之一。画面语义检索、抽帧检查、多机位和时间线效果也参与素材选择与复核；公开资料没有证明产品内置一套适用于所有视频的固定“好镜头”评分标准。实际取舍取决于任务要求、Agent 的工具调用和人的审片。

## 可扩展方向（研究建议，非现成能力承诺）

- 将固定剪辑规则写成可复用 Skill，并通过 MCP 工具执行与复核。
- 做面向具体任务的复合操作，例如讲稿粗剪、批量画幅适配、字幕和镜头质量检查。
- 为长任务加入结构化结果、进度检查和可恢复执行；每一步保留可审查的时间线状态。
- 如需 Windows 原生产品，需独立设计跨平台编辑与渲染层；不能把当前 Swift/macOS 程序直接视为跨平台方案。

## 图片来源

- 网页与根索引封面：[`assets/cover.svg`](assets/cover.svg)，本研究项目原创示意图，表达“素材 → 时间线 → Agent → 导出”的架构，**不是 Palmier Pro 产品截图**。原项目真实界面可见[仓库截图](https://github.com/palmier-io/palmier-pro/blob/last-gpl-source/assets/palmier-ui.png)。
- 能力全景图：[`assets/capability-map.svg`](assets/capability-map.svg) 与其 PNG 版本 [`assets/capability-map.png`](assets/capability-map.png)，本研究项目依据上述官方文档与历史公开源码原创绘制；模块分组及扩展方向是研究归纳。

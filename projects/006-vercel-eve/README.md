# 006 · vercel/eve：把 Agent 做成可持续运行的服务

![eve 能力全景图：输入、运行机制、模块、输出、场景与对 Codex 用户的价值](assets/eve-capability-map.png)

**图片说明与来源：** 本仓库原创绘制的研究引导图，汇总输入输出、执行原理、能力模块、使用场景和验证边界；不是 eve 的运行截图或官方架构图。依据官方文档绘制，详见下方来源。[放大查看 SVG](assets/eve-capability-map.svg)。

## 项目速览

| 项目 | 内容 |
| --- | --- |
| 原仓库 | [Vercel / eve](https://github.com/vercel/eve) |
| 作者与归属 | Vercel 与 [原仓库贡献者](https://github.com/vercel/eve/graphs/contributors) |
| 原项目许可证 | [Apache License 2.0](https://github.com/vercel/eve/blob/main/LICENSE)；原仓库另有 [NOTICE](https://github.com/vercel/eve/blob/main/NOTICE) |
| 研究日期 | 2026-09-26 |
| 研究状态 | 官方文档已核查；示例已构建、读取真实 GitHub 数据、启动服务并通过健康检查；完整模型与审批流程尚未验证 |
| 本项目演示 | [`demo/`](demo/)：仓库研究筛选 Agent；完整对话需配置模型凭据 |
| 网页展示 | [交互教学页面](../../sites/006-vercel-eve/index.html)；网页查询真实 GitHub 数据，但审批与判断为模拟，不运行 eve 或模型 |

**一句话摘要：** eve 是采用文件约定的 TypeScript Agent 框架。开发者配置模型、指令、工具与入口；eve 管理多轮会话、工具调用、人工审批、暂停恢复和服务交付。网页可以作为客户端接入。它适合开发自己的长期 Agent 服务；对于个人临时研究，直接使用 Codex 更省事。[项目 README](https://github.com/vercel/eve/blob/main/README.md)

## 为什么研究

本仓库用 Codex 研究 GitHub 项目。这里要回答一个实际问题：已经能让 Codex 研究、编写和维护条目时，eve 增加了什么？结论是：当研究过程需要由**自己的服务**接收外部请求、长期保留会话、按计划触发、在业务动作前等待审批时，eve 才提供明显的工程价值。单次问答和当前由人主导的资料整理无需先引入它。这是基于本仓库工作方式的判断，不是原项目给出的性能结论。

## 能力地图

| 能力 | eve 提供的机制 | 对使用者意味着什么 |
| --- | --- | --- |
| 文件定义 Agent | `agent/instructions.md`、`tools/`、`skills/`、`channels/`、`schedules/` 等目录；可选 `agent.ts` | 改文件即可增减指令、工具和入口；配置可在 Git 中审阅。[项目结构](https://github.com/vercel/eve/blob/main/docs/README.md) |
| 多轮工具执行 | 模型根据上下文调用有输入 schema 的工具，结果返回模型继续处理 | 可把查询 GitHub、检索数据库或调用内部 API 组成多步任务。[工具文档](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx) |
| 持久会话 | Workflow SDK 在步骤边界保存进度；`defineState` 保存会话内状态 | 等待人工输入或进程重启后继续；已提交步骤可恢复。[执行模型](https://github.com/vercel/eve/blob/main/docs/concepts/execution-model-and-durability.mdx)、[状态](https://github.com/vercel/eve/blob/main/docs/concepts/state.md) |
| 人工审批 | 工具可以要求每次、首次或按策略审批 | 把写入、退款、发布等动作停在可审核的节点。[审批文档](https://github.com/vercel/eve/blob/main/docs/tools/human-in-the-loop.md) |
| 外部入口与服务 | HTTP、聊天渠道、MCP/OpenAPI 连接、定时任务 | 同一 Agent 可由人、其他服务或计划任务触发。[渠道](https://github.com/vercel/eve/blob/main/docs/channels/overview.mdx)、[连接](https://github.com/vercel/eve/blob/main/docs/connections/overview.mdx)、[定时任务](https://github.com/vercel/eve/blob/main/docs/schedules.mdx) |
| 扩展与评测 | 子 Agent、可复用 extension、会话评测 | 将通用能力复用到多个 Agent，并检查行为回归。[扩展](https://github.com/vercel/eve/blob/main/docs/extensions.md)、[评测](https://github.com/vercel/eve/blob/main/docs/evals/overview.mdx) |

## 如何拆分模块

| 模块 | 主要职责 | 对应的 eve 机制 |
| --- | --- | --- |
| Agent 定义 | 确定行为、模型、可用技能和工具 | `agent/instructions.md`、`agent.ts`、`tools/`、`skills/` |
| 入口与身份 | 接收网页、HTTP、聊天或计划任务，并判断调用者权限 | 渠道、路由鉴权、`schedules/`；网页只是可选客户端 |
| 会话执行 | 把一次请求拆成可恢复的多轮工作 | session → turn → step；Workflow SDK 在步骤边界保存进度 |
| 决策与行动 | 模型选下一步，工具查询 API 或执行应用代码 | 有输入 schema 的工具；MCP/OpenAPI 连接；沙箱中的命令能力 |
| 审批与状态 | 敏感动作先等人；保留同一会话的工作记忆 | 工具审批策略、暂停恢复、`defineState` |
| 交付与观察 | 返回回复和事件，接前端，部署运行，评估行为 | 客户端 SDK、流式事件、评测、Vercel 或自托管 Node 服务 |

**输入与输出：** 建置时输入的是指令、模型配置、工具实现、凭据和入口规则；运行时输入的是用户消息、渠道事件或定时触发，也可能有审批答复。输出包括回复、流式事件、审批请求、工具执行结果和会话状态。外部写入只会在开发者提供相应工具与权限后发生。[前端接入](https://github.com/vercel/eve/blob/main/docs/guides/frontend/overview.mdx)、[执行模型](https://github.com/vercel/eve/blob/main/docs/concepts/execution-model-and-durability.mdx)

### 一张图看全貌

![eve 能力全景图：输入输出、执行原理、八类能力、使用场景、实测范围与 Codex 选择](assets/eve-capability-map.png)

**图片说明与来源：** 本仓库原创绘制，提供[可放大的 SVG 原图](assets/eve-capability-map.svg)。机制依据 [原仓库 README](https://github.com/vercel/eve/blob/main/README.md)、[执行与持久化](https://github.com/vercel/eve/blob/main/docs/concepts/execution-model-and-durability.mdx)、[工具](https://github.com/vercel/eve/blob/main/docs/tools/overview.mdx)、[人工审批](https://github.com/vercel/eve/blob/main/docs/tools/human-in-the-loop.md)、[状态](https://github.com/vercel/eve/blob/main/docs/concepts/state.md)、[前端接入](https://github.com/vercel/eve/blob/main/docs/guides/frontend/overview.mdx)与[部署](https://github.com/vercel/eve/blob/main/docs/guides/deployment/overview.md)。图中使用场景是可构建的方案；实际验证范围单独标明。未使用第三方图片素材。

## 技术原理：一次请求怎样完成

```text
用户、HTTP、聊天渠道或定时任务
              │
              ▼
        eve 找到或创建会话
              │
              ▼
      大模型读取指令并决定下一步
              │
      ┌───────┴────────┐
      │                │
   直接回复        调用有类型的工具
                       │
             查询 API / 使用沙箱 / 等待审批
                       │
                       ▼
               返回结果给模型继续判断
                       │
                       ▼
              保存步骤和会话状态，输出结果
```

eve 的核心区分是**应用运行环境与沙箱分开**：模型可用的文件和命令在沙箱里；模型密钥、连接凭据和自定义工具代码在应用环境。一个默认步骤包含一次模型调用及随后的内联工具调用。中断发生在步骤执行中时，该步骤可能重跑，因此外部写入仍需幂等键或审批，不能把“持久”理解成外部副作用必定只发生一次。[执行模型与重放边界](https://github.com/vercel/eve/blob/main/docs/concepts/execution-model-and-durability.mdx)

## 实际场景演示：筛选一个 GitHub 研究对象

[`demo/`](demo/) 实现了一个小型 eve Agent。场景是：有人提交 `vercel/eve`，希望先看公开仓库信息，再决定是否继续研究。示例保留一个需要人工批准的“保存判断”动作，使循环、暂停和跨轮状态可以被观察。当前已验证工具和服务启动；审批环节仍需在有模型连接的会话中试跑。

想先看完整流程的位置，可以打开[交互网页](../../sites/006-vercel-eve/index.html)：输入公开仓库后，网页会实时读取 GitHub 元数据；也可手动选用标明日期的验证快照。初步建议、审批与下一轮读回均由浏览器代码模拟，状态只存在当前页面内，不能据此认定 eve 的模型循环或持久会话已经跑通。页面同时链接下面的实际 eve 示例源码。

| 阶段 | 示例中的实现 | 可观察的行为 |
| --- | --- | --- |
| 读取事实 | [`inspect_repository.ts`](demo/agent/tools/inspect_repository.ts) 请求 GitHub 公共 API | 返回仓库简介、许可证、默认分支、最后推送时间、来源 URL 和抓取时间；实时值以运行时为准 |
| 模型判断 | [`instructions.md`](demo/agent/instructions.md) 要求区分事实与推断 | 基于有限元数据提出“进一步研究/暂缓”的初步建议，不声称已审源码或运行项目 |
| 人工把关 | [`save_research_decision.ts`](demo/agent/tools/save_research_decision.ts) 使用 `approval: always()` | 写入会话状态前出现批准请求；拒绝时不保存 |
| 后续追问 | [`read_research_decision.ts`](demo/agent/tools/read_research_decision.ts) 读取 `defineState` | 在同一会话的下一轮读取经批准的最近判断 |

### 自己运行

要求 Node.js 24+、能访问 GitHub 公共 API，以及可用的模型连接。依赖版本参考研究日原仓库的 [`packages/eve/package.json`](https://github.com/vercel/eve/blob/main/packages/eve/package.json) 与 [`pnpm-workspace.yaml`](https://github.com/vercel/eve/blob/main/pnpm-workspace.yaml)；`just-bash` 是本地默认沙箱所需的独立依赖。在 [`demo/`](demo/) 中运行：

```bash
npm ci
npm run build
npm run dev
```

首次运行按 eve 终端界面提示完成模型登录，然后依次尝试：

```text
请评估 vercel/eve 是否值得加入我的研究清单，并记录初步判断。
```

检查 `inspect_repository` 的工具结果与模型给出的来源；遇到 `save_research_decision` 的审批请求时，先查看理由再选择批准或拒绝。批准后，**在同一会话**继续输入：

```text
刚才经我批准保存的判断是什么？
```

观察 `read_research_decision` 是否读回相同仓库、结论和理由。另可拒绝首次审批，再追问以确认没有保存。换成新会话时，`defineState` 从初始值开始；它不是跨用户或跨会话的研究数据库。[状态作用域](https://github.com/vercel/eve/blob/main/docs/concepts/state.md)

### 实际验证记录与边界

- **已核查的原项目事实：** 原仓库公开，项目说明将 eve 定位为 filesystem-first durable agent framework；研究日原仓库包文件声明版本 `0.66.3`、许可证 `Apache-2.0`，官方文档记录了上述文件目录、工具、审批、会话状态和 Workflow 执行机制。来源见本页各链接。
- **依赖与构建已验证：** 在 Windows、Node.js `v24.19.0` 上安装示例依赖，`eve build` 成功。首次构建提示默认沙箱缺少 `just-bash`，补齐依赖后通过。此机的 npm 对可选 Windows 原生绑定有安装问题，验证时单独补装了 `@rolldown/binding-win32-x64-msvc@1.2.11`。
- **真实数据查询已验证：** 直接执行示例的 `inspect_repository` 工具查询公开的 [`vercel/eve`](https://api.github.com/repos/vercel/eve)，在 `2026-09-26T04:27:41Z` 返回 `ok: true`、简介 `The Open Framework for Building Agents`、默认分支 `main`、许可证 `Apache-2.0` 和仓库来源 URL。日期与热度字段以今后重新查询的结果为准。这是工具本身的实际运行结果，不代表模型已调用它。
- **服务启动已验证：** 以 `eve start` 启动构建产物，访问 `/eve/v1/health` 返回 `status: ready`，随后已停止本地服务。
- **完整 Agent 对话尚未验证：** 本机尝试 `eve dev` 时，在创建 `.eve/dev-hosts/.../workspace-resources/ext:self-modification:subagents/agent` 路径处以 `ENOENT` 退出；也没有为示例配置模型凭据。因此未观察到真实模型调用、人工审批界面或跨轮读回。上面的对话是复现步骤，不是运行记录。

## 对我的意义与使用边界

目前本仓库主要是研究记录和可选静态展示。Codex 已能协助搜索资料、编写条目、更新代码和定期处理研究任务；直接把 eve 加进这个仓库，不会自动让研究更准确。若以后要让多位用户通过网页或聊天软件提交仓库、长期追踪、在发布前审批，eve 才有明确价值：它提供可部署的 Agent 后台和可组合的运行能力。这是针对本仓库的应用判断。

正式使用还需处理身份验证、凭据、数据隔离、外部副作用的幂等性以及模型费用。eve 支持 Vercel 部署和自行托管，但生产配置由部署者负责；项目当前仍标注 beta，接口可能变动。[部署文档](https://github.com/vercel/eve/blob/main/docs/guides/deployment/overview.md)、[原仓库 README](https://github.com/vercel/eve/blob/main/README.md)

## 参考与许可

- 原始项目、名称、文档和源码归 Vercel 及原仓库贡献者所有；许可参见 [LICENSE](https://github.com/vercel/eve/blob/main/LICENSE) 和 [NOTICE](https://github.com/vercel/eve/blob/main/NOTICE)。本研究只概括机制并链接来源，没有复制原项目图片。
- 本目录的示例代码、`assets/cover.svg` 和能力全景图为本仓库原创。封面和能力图用于解释结构，不代表已运行成果。能力图的生成源码为 [`assets/build_capability_map.py`](assets/build_capability_map.py)。
- GitHub 仓库元数据来自 [GitHub REST API](https://docs.github.com/en/rest/repos/repos#get-a-repository)。实时数据需在运行时重新获取，不能把本页研究日的核查结果当作当前状态。

window.semanticaGuide = {
  "stages": [
    {
      "id": "input",
      "title": "接入资料",
      "short": "把资料读进来",
      "input": "README、网页、PDF、表格或业务记录",
      "output": "带来源信息的可处理文本与记录",
      "modules": "ingest · parse · normalize · split",
      "capability": "连接来源，解析文件，统一格式，再把长文切成适合处理的片段。",
      "ours": "我们的脚本读取 4 份 README，保存路径、原文快照、行号和文件摘要；没有调用库的接入与解析模块。",
      "owner": "应用已实现",
      "level": "app",
      "example": "012 的 README → 一份原文快照 + 可定位的证据片段",
      "link": "./index.html#pilot",
      "linkLabel": "查看真实资料入口"
    },
    {
      "id": "extract",
      "title": "识别知识",
      "short": "找出对象和关系",
      "input": "文本片段 + 领域定义 + 抽取配置",
      "output": "候选实体、关系、事件与证据",
      "modules": "semantic_extract · llms",
      "capability": "可选择规则、正则、机器学习模型或 LLM 抽取。模型和方法要按语言、领域与预算配置，并检查错漏。",
      "ours": "“Hindsight 对应长期记忆”及其原文依据，由人先核对并写进输入清单；本例没有实测自动抽取。",
      "owner": "本例人工确认",
      "level": "manual",
      "example": "人工读原文 → 确认项目角色 → 保留支持这个判断的句子",
      "link": "../../projects/011-semantica/pilot-inputs.json",
      "linkLabel": "查看人工确认的输入清单"
    },
    {
      "id": "govern",
      "title": "核对含义",
      "short": "处理同名、矛盾和约束",
      "input": "候选知识 + 词汇定义 + 业务约束",
      "output": "经过复核的关系与待处理问题",
      "modules": "deduplication · conflicts · ontology",
      "capability": "对齐同一对象的不同写法，识别冲突，并用本体或约束约定什么关系可以成立。最终采用哪条事实，需要领域规则或人工判断。",
      "ours": "本例只检查证据原文是否唯一存在，以及来源文件是否变化。去重、冲突检测、本体约束的原生模块尚未实测。",
      "owner": "原生模块待实测",
      "level": "pending",
      "example": "下一步可检查：两个项目别名是否指向同一仓库？",
      "link": "./index.html#lab",
      "linkLabel": "查看冲突与规则的概念演示"
    },
    {
      "id": "store",
      "title": "建立并保存",
      "short": "沉淀能复用的知识",
      "input": "已确认的对象、关系与来源",
      "output": "图谱 + 证据 + 来源 + 处理记录",
      "modules": "kg · context · graph_store · triplet_store",
      "capability": "把对象写成节点、关系写成边，保留属性；按需要使用文件或数据库保存，让下一次查询复用已有知识。",
      "ours": "ContextGraph 实际写入并保存 12 个节点、10 条关系；用新实例从 JSON 重载。来源快照与处理履历由应用另行保存。",
      "owner": "库已实测",
      "level": "tested",
      "example": "长期记忆 → 对应项目 Hindsight → 有依据 README 原文",
      "link": "./index.html#graph-guide",
      "linkLabel": "沿真实关系读一遍"
    },
    {
      "id": "retrieve",
      "title": "查询与取证",
      "short": "把关联知识找回来",
      "input": "关键词、关系起点或业务条件",
      "output": "命中的对象、关联路径与原文",
      "modules": "context · vector_store · embeddings · reasoning",
      "capability": "可组合图遍历、向量检索和规则处理。图查询沿已记录的关系查找；语义搜索和推理需要额外配置与验证。",
      "ours": "关键词“记忆”经 ContextGraph.query 命中 012，再沿项目关系取回原文。主题查询返回 3 项角色；尚未接入自然语言问答、向量搜索或推理模块。",
      "owner": "库已实测一部分",
      "level": "tested",
      "example": "搜“记忆” → Hindsight → 为什么命中 + 原文出处",
      "link": "./index.html#pilot",
      "linkLabel": "进入流程的第 4 步搜索"
    },
    {
      "id": "deliver",
      "title": "呈现与行动",
      "short": "把知识交给人和应用",
      "input": "查询结果 + 证据 + 使用规则",
      "output": "交互图、导出文件、简报或应用接口",
      "modules": "visualization · export · REST / MCP / CLI",
      "capability": "生成图形、导出结构化数据，或通过服务接口供应用调用。任务创建、审批和发布等业务动作，还需应用定义权限、条件与执行逻辑。",
      "ours": "KGVisualizer 已实际生成 4 种图形视图；研究简报由我们的应用模板生成。页面导航、按钮和逐句解释也由我们制作，未连接外部业务系统。",
      "owner": "库 + 应用已实测",
      "level": "mixed",
      "example": "同一批知识 → 原生关系图 / 可追溯的研究简报",
      "link": "./native-graph.html#path",
      "linkLabel": "查看库自带画图的实际输出"
    }
  ],
  "modules": [
    {
      "title": "接入与文本准备",
      "names": "ingest / parse / normalize / split",
      "role": "把各类来源整理成文本和片段。",
      "status": "待实测",
      "detail": "本例由应用直接读取 Markdown，没有验证这些接入模块；复杂文件、数据库连接与认证需逐项配置。",
      "source": "architecture"
    },
    {
      "title": "实体与关系抽取",
      "names": "semantic_extract / llms",
      "role": "识别人、项目、事件及其关联。",
      "status": "待实测",
      "detail": "支持多种抽取方法。输出需要与标注样本对照；方法失败后的简单回退结果也要检查。",
      "source": "extract"
    },
    {
      "title": "去重与冲突处理",
      "names": "deduplication / conflicts",
      "role": "处理同一对象的多种写法与矛盾事实。",
      "status": "待实测",
      "detail": "自动发现候选问题与最终确认事实是两个环节；项目需定义合并和取舍规则。",
      "source": "architecture"
    },
    {
      "title": "领域定义与规则",
      "names": "ontology / reasoning",
      "role": "约定词义、合法关系和业务条件。",
      "status": "待实测",
      "detail": "包括本体、约束与规则推理。供应商示例只是前端概念演示，未调用这些原生模块。",
      "source": "architecture"
    },
    {
      "title": "建图与上下文",
      "names": "kg / context",
      "role": "组织节点、关系、属性和决策记录。",
      "status": "部分实测",
      "detail": "已实测 ContextGraph 的建图、保存、重载与查询；GraphBuilder、社群与中心性分析、时间查询和决策记录等能力尚未在本例验证。",
      "source": "readme"
    },
    {
      "title": "来源与可追溯性",
      "names": "provenance / context",
      "role": "保留知识与决策所依据的来源。",
      "status": "应用已记录来源",
      "detail": "本例用节点元数据和应用快照记录出处；未实测原生 ProvenanceManager 或完整 PROV-O 导出。",
      "source": "architecture"
    },
    {
      "title": "存储与检索",
      "names": "graph_store / triplet_store / vector_store / embeddings",
      "role": "保存图、三元组与向量，服务后续查询。",
      "status": "外部后端待实测",
      "detail": "当前只验证本地 JSON 重载和关键词查询；外部图数据库、向量索引及混合检索还未接入。",
      "source": "readme"
    },
    {
      "title": "可视化与导出",
      "names": "visualization / export",
      "role": "把已知结构画出来或交给其他系统。",
      "status": "画图已实测",
      "detail": "KGVisualizer 已生成力导向、环形和高亮视图；其他图形类型及 RDF 等导出格式未在本例验证。",
      "source": "visualization"
    },
    {
      "title": "编排、服务与维护",
      "names": "pipeline / change_management / evals / explorer / mcp_server / CLI",
      "role": "组织处理流程、服务访问和后续评估。",
      "status": "待实测",
      "detail": "库提供相关模块与服务入口。本例的网页接口和版本核对由应用编写；生产同步、评估与权限仍需设计。",
      "source": "readme"
    }
  ],
  "scenarios": [
    {
      "group": "研究",
      "name": "跨项目检索",
      "input": "项目 README、研究记录",
      "question": "哪些项目负责长期记忆，依据在哪里？",
      "output": "项目 + 角色 + 证据路径",
      "status": "已实测关键词与图查询"
    },
    {
      "group": "研究",
      "name": "结论追溯",
      "input": "研究结论、上游资料",
      "question": "网页上的一句判断来自哪份文件？",
      "output": "结论 → 研究 → 来源",
      "status": "已实测本地证据回查"
    },
    {
      "group": "研究",
      "name": "更新影响检查",
      "input": "文档版本、功能与许可记录",
      "question": "上游资料变化后，哪些结论要复核？",
      "output": "受影响结论与复核清单",
      "status": "仅实测来源变化检查"
    },
    {
      "group": "研究",
      "name": "持续研究助手",
      "input": "任务、历史决策、验证记录",
      "question": "上次做到哪里，为什么这么选？",
      "output": "历史依据与下一项任务上下文",
      "status": "扩展方向"
    },
    {
      "group": "团队",
      "name": "多 Agent 协作",
      "input": "任务依赖、产物、负责人",
      "question": "这项工作要等谁的哪份产物？",
      "output": "共享上下文与依赖路径",
      "status": "待验证场景"
    },
    {
      "group": "团队",
      "name": "客服排查",
      "input": "工单、版本说明、知识文档",
      "question": "相似故障涉及哪个版本和修复？",
      "output": "问题 → 版本 → 修复依据",
      "status": "待验证场景"
    },
    {
      "group": "团队",
      "name": "事故复盘",
      "input": "事件、变更、服务与处置记录",
      "question": "哪些变化和决定与这次故障相关？",
      "output": "事件时间线与已记录关联",
      "status": "待验证；因果需另证"
    },
    {
      "group": "团队",
      "name": "依赖风险定位",
      "input": "组件、版本、服务依赖",
      "question": "一个组件的问题影响哪些服务？",
      "output": "组件 → 服务 → 负责人",
      "status": "待验证场景"
    },
    {
      "group": "业务",
      "name": "供应商选型",
      "input": "审查报告、合同、选择条件",
      "question": "说法冲突在哪里，条件满足了吗？",
      "output": "候选、冲突、规则与证据",
      "status": "仅有前端概念演示"
    },
    {
      "group": "业务",
      "name": "审批与审计",
      "input": "申请、规则版本、审批记录",
      "question": "当时按什么规则作出决定？",
      "output": "决策与来源、规则之间的记录",
      "status": "待验证场景"
    },
    {
      "group": "业务",
      "name": "供应链追踪",
      "input": "供应商、零件、批次、客户",
      "question": "某批零件可能波及哪些客户？",
      "output": "零件 → 批次 → 产品 → 客户",
      "status": "待验证场景"
    },
    {
      "group": "业务",
      "name": "跨系统实体对齐",
      "input": "CRM、合同、工单中的客户资料",
      "question": "不同名字是否表示同一个客户？",
      "output": "匹配候选与确认后的统一对象",
      "status": "待验证场景"
    }
  ],
  "roadmap": [
    {
      "title": "扩大样本，先量收益",
      "work": "挑选更多编号项目，设计固定检索问题，对比直接搜 README 与图谱查询。",
      "deliver": "问题集、人工答案与基线记录",
      "check": "记录答案正确率、找证据用时、人工维护时间；当前没有收益数字。"
    },
    {
      "title": "验证中文自动抽取",
      "work": "给实体和关系定范围，用未参与配置的中文资料测试规则或模型，再人工复核。",
      "deliver": "候选实体、关系、原文位置及错误清单",
      "check": "统计漏抽、错抽和无依据关系；记录模型或 API 的耗时与费用。"
    },
    {
      "title": "组合语义搜索与图查询",
      "work": "为近义表达增加向量检索，沿图补充依据；生成答案时保留引用。",
      "deliver": "带原文引用的问答原型",
      "check": "检查是否找到正确证据，以及回答是否超出证据；与关键词方式对照。"
    },
    {
      "title": "跟踪资料变化",
      "work": "把来源版本与相关结论连接起来，更新后列出需要复核的知识。",
      "deliver": "更新队列、知识版本与影响清单",
      "check": "旧来源可回查；删除、纠错和更新能传递到下游，避免继续引用失效依据。"
    },
    {
      "title": "交给研究任务或 Agent",
      "work": "通过选定接口提供查询工具，将确认的结果交给后续任务。",
      "deliver": "可调用的研究检索与简报工具",
      "check": "定义谁能读写、什么条件下执行，以及失败时如何停止与回退。"
    },
    {
      "title": "按规模扩展存储与运行",
      "work": "在样本验证收益后，再评估图数据库、向量存储、批处理和持续评估。",
      "deliver": "持久服务、监测与质量记录",
      "check": "测数据规模下的成本、响应时间、更新一致性和维护负担。"
    }
  ],
  "sources": {
    "readme": {
      "title": "Semantica 官方 README",
      "url": "https://github.com/semantica-agi/semantica/blob/main/README.md",
      "note": "能力范围、模块入口与集成说明；主分支内容可能变化。"
    },
    "architecture": {
      "title": "官方架构图",
      "url": "https://github.com/semantica-agi/semantica/blob/main/ARCHITECTURE.md",
      "note": "资料接入、知识处理、存储与输出的完整路径。"
    },
    "extract": {
      "title": "实体与关系抽取指南",
      "url": "https://github.com/semantica-agi/semantica/blob/main/semantica/semantic_extract/semantic_extract_usage.md",
      "note": "抽取方法、配置与回退机制；本例未实测其中文效果。"
    },
    "context": {
      "title": "ContextGraph 源码",
      "url": "https://github.com/semantica-agi/semantica/blob/main/semantica/context/context_graph.py",
      "note": "建图、重载、查询与上下文接口；实际运行以本地 0.7.0 为准。"
    },
    "visualization": {
      "title": "KGVisualizer 源码",
      "url": "https://github.com/semantica-agi/semantica/blob/main/semantica/visualization/kg_visualizer.py",
      "note": "布局、图形输出与路径高亮；本项目已运行。"
    },
    "obsidian": {
      "title": "Obsidian Graph view 官方说明",
      "url": "https://obsidian.md/help/plugins/graph",
      "note": "默认关系图的笔记节点与内部链接；产品对比依据之一。"
    },
    "obsidianProperties": {
      "title": "Obsidian Properties 官方说明",
      "url": "https://obsidian.md/help/properties",
      "note": "结构化笔记属性的类型与使用方式。"
    },
    "obsidianBases": {
      "title": "Obsidian Bases 官方说明",
      "url": "https://obsidian.md/help/bases",
      "note": "按文件与属性查看、编辑、排序和筛选笔记；未在本项目实机对测。"
    }
  }
};

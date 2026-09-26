"""Build a precise, text-based overview SVG and the offline guide data bundle."""
from __future__ import annotations

import json
import unicodedata
from html import escape
from pathlib import Path

PROJECT = Path(__file__).resolve().parent
SITE = PROJECT.parents[1] / "sites" / "011-semantica"
DATA = json.loads((PROJECT / "guide-content.json").read_text(encoding="utf-8"))
ASSETS = PROJECT / "assets"

def build():
    (SITE / "guide-content.js").write_text("window.semanticaGuide = " + json.dumps(DATA, ensure_ascii=False, indent=2).replace("<", "\\u003c") + ";\n", encoding="utf-8")
    parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2940" viewBox="0 0 1600 2940" role="img" aria-labelledby="title desc">',
             '<title id="title">Semantica 完整理解与使用引导图</title>',
             '<desc id="desc">从 Obsidian 关系图类比出发，依次介绍完整流程、主要模块、使用场景、使用方法、已验证效果、对研究工作的意义和可扩展方向。此图为本项目整理的说明图。</desc>',
             '<style>text{font-family:"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",sans-serif} .body{fill:#687c5f} .title{fill:#254b36;font-weight:700}</style>',
             '<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#7e9a6c"/></marker></defs>']
    def rect(x,y,w,h,fill="#fbfcf7",stroke="#d3dfc7",r=14):
        parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}"/>')
    def text(x,y,value,size=22,color="#687c5f",weight=400):
        parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}">{escape(str(value))}</text>')
    def lines(value, size, max_width):
        result=[]; line=""; width=0
        for char in value:
            step = size * (1 if unicodedata.east_asian_width(char) in "WF" else .56)
            if char == "\n" or (width + step > max_width and line):
                result.append(line); line=""; width=0
                if char == "\n": continue
            line += char; width += step
        if line: result.append(line)
        return result
    def paragraph(x,y,value,w,size=22,line_height=33,color="#687c5f",max_lines=None):
        rows=lines(value,size,w)
        if max_lines is not None and len(rows)>max_lines:
            raise ValueError(f"Poster text would overflow ({len(rows)} > {max_lines}): {value}")
        for i,row in enumerate(rows): text(x,y+i*line_height,row,size,color)
        return y+len(rows)*line_height
    def heading(number,label,y,note=""):
        text(48,y,number,20,"#8da67a",700); text(101,y,label,29,"#2a513b",700)
        if note: text(1552-len(note)*17,y,note,17,"#859775")
    def arrow(x1,y1,x2,y2):
        parts.append(f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="#7e9a6c" stroke-width="2" marker-end="url(#arrow)"/>')

    rect(0,0,1600,2940,"#f4f6ed","none",0)
    rect(0,0,1600,220,"#203e31","none",0)
    text(48,49,"011 / SEMANTICA · 完整理解与使用引导",20,"#a9c493",700)
    text(48,115,"让资料成为有关系、有来源、能复用的知识。",47,"#f3f8e9",700)
    text(48,166,"能力 → 模块 → 使用场景 → 接入方式 → 实际效果 → 对我们的意义 → 扩展方向",22,"#b2c5a3")
    text(48,197,"说明图由本项目整理  /  官方能力与本地实测分开标注  /  实测 Semantica 0.7.0",17,"#849d77")

    heading("01","先理解：图模型相通，产品与处理机制各有侧重。",267)
    rect(48,293,730,151); rect(800,293,752,151,"#e6efda")
    text(71,332,"Obsidian：笔记、属性与内部链接",26,"#365b3e",700)
    paragraph(71,369,"直接读写和整理知识；Bases 可按属性筛选笔记，关系图用于浏览连接。",680,22,33,max_lines=2)
    text(824,332,"Semantica：知识处理与查询组件",25,"#365b3e",700)
    paragraph(824,369,"抽取、关系与规则需配置验证。本例人工整理与笔记方式有较大重合，额外收益尚未测定。",704,22,33,max_lines=2)

    heading("02","完整流程：每一步都有输入，也要留下可检查的产物。",494)
    card_w=234; gap=20
    status_colors={"app":"#9a8250","manual":"#a17745","pending":"#a17745","tested":"#3c794e","mixed":"#3c794e"}
    outputs=["原文与来源","候选对象与关系","核对后的知识","图谱、证据与版本","结果、路径与原文","交互图 / 简报 / 接口"]
    for index,item in enumerate(DATA["stages"]):
        x=48+index*(card_w+gap)
        rect(x,520,card_w,204)
        text(x+19,553,"0"+str(index+1),17,"#92a781",700)
        text(x+19,594,item["title"],27,"#2e593c",700)
        text(x+19,628,item["short"],18,"#829473")
        paragraph(x+19,662,"留下："+outputs[index],card_w-38,18,26,max_lines=2)
        if index<5: arrow(x+card_w+3,594,x+card_w+gap-4,594)
    rect(48,743,1504,64,"#e4edda")
    text(69,782,"本例路径",20,"#4b7245",700)
    text(204,782,"应用读文件 → 人工定关系 → 脚本核对来源 → 库建图重载 → 库查询 → 库画图 + 应用简报",20,"#648059")
    text(50,841,"↩  资料变化 / 发现错误：回到来源与关系复核，再更新图谱及下游产物。",20,"#7d956c")

    heading("03","主要模块：按职责分为九组，可独立组合。",891,"具体接口与依赖以版本为准")
    for index,item in enumerate(DATA["modules"]):
        col=index%3; row=index//3; x=48+col*510; y=916+row*167
        rect(x,y,484,149)
        text(x+20,y+33,item["title"],24,"#325c3d",700)
        text(x+20,y+66,item["role"],19,"#748969")
        display_names = item["names"]
        if index == 6: display_names = "graph_store / triplet_store\nvector_store / embeddings"
        if index == 8: display_names = "pipeline / change_management / evals\nexplorer / mcp_server / CLI"
        paragraph(x+20,y+94,display_names,444,16,22,"#93a385",max_lines=2)
        text(x+20,y+134,item["status"],16,"#937c52")

    heading("04","使用场景：跨资料找关系，同时说明答案依据。",1460)
    blocks=[("研究工作","跨项目检索 · 结论追溯\n资料更新影响 · 持续研究助手","输入：README、研究与验证记录","产物：项目角色、证据和复核清单"),
            ("团队协作","多 Agent 协作 · 客服排查\n事故复盘 · 依赖风险定位","输入：任务、工单、版本和依赖","产物：关联路径与交接上下文"),
            ("业务应用","供应商选型 · 审批审计\n供应链追踪 · 跨系统实体对齐","输入：合同、规则、批次和客户记录","产物：候选、冲突、依据和决策记录")]
    for i,(title,examples,ins,outs) in enumerate(blocks):
        x=48+i*510; rect(x,1486,484,193,"#e9efdf")
        text(x+20,1522,title,26,"#3d6341",700)
        paragraph(x+20,1558,examples,440,21,31,max_lines=2)
        text(x+20,1630,ins,18,"#869978"); text(x+20,1660,outs,18,"#869978")
    text(50,1711,"验证范围：已跑通研究检索与证据回查；其他场景为扩展设想，供应商部分仅为概念演示。",18,"#957d52")

    heading("05","如何使用",1773); text(827,1773,"06  最终效果与沉淀",29,"#2a513b",700)
    rect(48,1800,730,267); rect(800,1800,752,267)
    use_lines=["1. 定一个具体问题，挑可信的小样本资料。","2. 定义对象、关系和必须保留的来源。","3. 配置抽取或人工确认，复核错漏与冲突。","4. 保存并重载图谱，用固定问题验证查询。","5. 生成图形或简报，再评估持续接入业务。"]
    for i,line in enumerate(use_lines): text(70,1840+i*36,line,22,"#67825b")
    text(70,2041,"本例入口：网页五步流程 + 输入清单 + 本机服务",19,"#94a182")
    text(824,1842,"4 份 README · 12 个节点 · 10 条关系",26,"#44784c",700)
    for i,line in enumerate(["搜“记忆” → Hindsight → 原文依据","原文快照 / 证据记录 / 图谱 / 运行记录","库生成四种图形视图；应用生成研究简报","长标签易拥挤；尚未测出效率或准确率提升"]): text(824,1885+i*38,line,21,"#748a65")

    heading("07","对我的意义：为持续整理的 GitHub 研究集提供知识底座。",2127)
    rect(48,2153,1504,147,"#223f31","none")
    for i,(title,body) in enumerate([("找项目","按能力找候选，并一起取回依据。"),("管结论","保留来源版本，资料变更后复核。"),("交接任务","把已核对知识交给后续研究或 Agent。")]):
        x=73+i*503; text(x,2197,title,26,"#d8e9c5",700); paragraph(x,2237,body,440,21,32,"#a3bd8d",max_lines=2)

    heading("08","可扩展方向：先量收益，再增加自动化与规模。",2360,"建议路线，尚未完成")
    shortchecks=["量正确率、找证据用时与维护成本。","查漏抽、错抽、无依据关系与费用。","查引用是否正确、回答是否超出证据。","查旧版可回溯、更新能否影响下游。","查权限、触发条件和失败回退。","测成本、响应时间与更新一致性。"]
    for i,item in enumerate(DATA["roadmap"]):
        x=48+(i%3)*510; y=2387+(i//3)*152; rect(x,y,484,134)
        text(x+20,y+37,f"0{i+1}  {item['title']}",22,"#3e6743",700)
        paragraph(x+20,y+72,shortchecks[i],440,20,30,max_lines=2)
        text(x+20,y+112,"产物："+item["deliver"],17,"#8a9a7b")

    rect(48,2713,1504,99,"#e5ebda")
    paragraph(70,2748,"已实测：人工关系 + ContextGraph 建图、重载、查询 + KGVisualizer 画图。\n待验证：自动抽取、语义问答、冲突推理、外部存储、规模效果与实际收益。",1460,20,33,"#658153",max_lines=2)
    text(48,2854,"来源：Semantica 官方 README / 架构 / 模块源码；Obsidian Graph view 官方说明；本项目运行记录。",17,"#8c9c7d")
    text(48,2885,"这是一张人工整理的引导图，不是库自动生成的知识图谱。图形与流程的真实效果请在对应网页核对。",17,"#8c9c7d")
    text(48,2917,"2026-09-26 · projects/011-semantica · 详细依据、实际批次与复现方法见项目 README",16,"#9caa8f")
    parts.append("</svg>")
    target=ASSETS/"guide-overview.svg"; target.write_text("\n".join(parts),encoding="utf-8")
    print(json.dumps({"svg":str(target),"stages":len(DATA["stages"]),"modules":len(DATA["modules"]),"scenarios":len(DATA["scenarios"]),"roadmap":len(DATA["roadmap"])}))

if __name__ == "__main__": build()

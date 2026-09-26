"""Reviewed README inputs -> saved Semantica graph -> search -> research brief."""
from __future__ import annotations
import hashlib
import json
import time
import uuid
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path
from semantica.context import ContextGraph

ROOT = Path(__file__).resolve().parents[2]
PROJECT = Path(__file__).resolve().parent
SITE = ROOT / "sites" / "011-semantica"
INPUTS = PROJECT / "pilot-inputs.json"
ARTIFACTS = PROJECT / "artifacts"
GRAPH_FILE = ARTIFACTS / "knowledge-graph.json"
RESULT_FILE = PROJECT / "pilot-result.json"
THEME_ID = "theme:agent-context-stack"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def new_graph() -> ContextGraph:
    return ContextGraph(advanced_analytics=False, extract_entities=False, extract_relationships=False)


def load_graph() -> ContextGraph:
    if not GRAPH_FILE.is_file():
        raise ValueError("尚未建立知识库，请先读取资料并建图。")
    graph = new_graph()
    graph.load_from_file(GRAPH_FILE)
    return graph


def source_path(sample: dict) -> Path:
    path = (ROOT / sample["path"]).resolve()
    if not path.is_relative_to(ROOT / "projects") or path.suffix != ".md":
        raise ValueError("演示资料必须是本仓库 projects 目录内的 Markdown 文件。")
    if not path.is_file():
        number = sample["number"]
        if not isinstance(number, str) or len(number) != 3 or not number.isdigit():
            raise ValueError("项目编号必须为三位数字。")
        snapshot = ARTIFACTS / "sources" / f"{number}.md"
        if not snapshot.is_file():
            raise ValueError(f"{sample['name']} 的原文和存档快照均不存在，请先接入资料。")
        return snapshot
    return path


def source_record(sample: dict) -> dict:
    path = source_path(sample)
    raw = path.read_bytes()
    text = raw.decode("utf-8-sig")
    anchor = sample["anchor"]
    if not anchor or text.count(anchor) != 1:
        raise ValueError(f"{sample['name']} 的证据锚点已变化或不唯一，请先人工复核输入清单。")
    line = text[:text.index(anchor)].count("\n") + 1
    input_path = path.relative_to(ROOT).as_posix()
    return {**sample, "input_path": input_path,
            "source_mode": "original" if input_path == sample["path"] else "archived_snapshot",
            "line": line, "line_text": text.splitlines()[line - 1],
            "sha256": digest(raw), "bytes": len(raw),
            "snapshot": f"projects/011-semantica/artifacts/sources/{sample['number']}.md"}


def project_result(graph: ContextGraph, number: str, record: dict) -> dict:
    project = graph.find_node(f"project:{number}")
    evidence = graph.find_node(f"evidence:{number}")
    if not project or not evidence:
        raise ValueError(f"图谱中缺少项目 {number} 或其证据。")
    neighbors = graph.get_neighbors(project["id"], hops=1, include_distance_metadata=True)
    path = next(row["path_to_anchor"] for row in neighbors if row["id"] == evidence["id"])
    role = graph.find_node(f"role:{number}")
    return {"number": number, "project": project["content"],
            "role": role["content"] if role else None, "reason": record["reason"],
            "quote": evidence["content"], "source": evidence["metadata"]["source_path"],
            "line": evidence["metadata"]["line"], "source_sha256": evidence["metadata"]["sha256"],
            "snapshot": evidence["metadata"]["snapshot"], "path": path}


def build() -> dict:
    started = time.perf_counter()
    records = [source_record(item) for item in read_json(INPUTS)["sources"]]
    numbers = [row["number"] for row in records]
    if len(numbers) != len(set(numbers)):
        raise ValueError("输入清单的项目编号不能重复。")
    graph = new_graph()
    graph.add_node(THEME_ID, "question", "Agent 的任务协调、知识上下文与长期记忆")
    for record in records:
        number = record["number"]
        project_id, evidence_id = f"project:{number}", f"evidence:{number}"
        graph.add_node(project_id, "project", record["name"], project_number=number)
        graph.add_node(evidence_id, "evidence", record["anchor"],
                       project_number=number, source_path=record["path"],
                       line=record["line"], sha256=record["sha256"], snapshot=record["snapshot"])
        graph.add_edge(project_id, evidence_id, "supported_by")
        if record["role"]:
            role_id = f"role:{number}"
            graph.add_node(role_id, "role", record["role"], project_number=number)
            graph.add_edge(THEME_ID, role_id, "includes_layer")
            graph.add_edge(role_id, project_id, "represented_by")

    ARTIFACTS.mkdir(exist_ok=True)
    graph.save_to_file(GRAPH_FILE)
    restored = load_graph()
    stats = restored.stats()
    neighbors = restored.get_neighbors(THEME_ID, hops=3, include_distance_metadata=True)
    paths = {row["id"]: row["path_to_anchor"] for row in neighbors}
    catalog = [project_result(restored, row["number"], row) for row in records]
    answers = [{**row, "path": paths[f"evidence:{row['number']}"]} for row in catalog
               if f"evidence:{row['number']}" in paths]
    if "project:005" in paths:
        raise AssertionError("排除对照不应进入预设主题查询。")
    for record in records:
        snapshot = ROOT / record["snapshot"]
        snapshot.parent.mkdir(exist_ok=True)
        raw = (ROOT / record["input_path"]).read_bytes()
        if digest(raw) != record["sha256"]:
            raise ValueError("读取期间来源发生变化，请重新执行。")
        snapshot.write_bytes(raw)

    build_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:6]
    report = {
        "build_id": build_id, "built_at": datetime.now(timezone.utc).isoformat(),
        "semantica_version": version("semantica"), "inputs_sha256": digest(INPUTS.read_bytes()),
        "duration_ms": round((time.perf_counter() - started) * 1000),
        "source_count": len(records), "node_count": stats["node_count"], "edge_count": stats["edge_count"],
        "checks": {"anchors_unique": True, "graph_reloaded": True, "source_snapshots_match": True},
        "steps": [
            {"title": "读取入口清单", "owner": "接入脚本", "detail": f"读取 {len(records)} 份真实 README，记录文件路径、字节数与摘要。其中 {sum(row['source_mode'] == 'archived_snapshot' for row in records)} 份使用已保存快照。"},
            {"title": "核对证据锚点", "owner": "人工标注 + 脚本校验", "detail": "每段原文必须存在且只出现一次；角色含义由人预先确认。"},
            {"title": "写入并保存图谱", "owner": "Semantica", "detail": f"保存 {stats['node_count']} 个节点和 {stats['edge_count']} 条关系。"},
            {"title": "从磁盘重新加载", "owner": "Semantica", "detail": f"重新加载保存的图文件，三跳主题查询返回 {len(answers)} 个项目及来源路径。"},
        ],
    }
    write_json(ARTIFACTS / "source-manifest.json", {"build_id": build_id, "sources": records})
    write_json(ARTIFACTS / "evidence.json", {"build_id": build_id, "records": catalog})
    write_json(ARTIFACTS / "run-report.json", report)
    from native_graph import generate_native_views
    native_views = generate_native_views(restored, build_id, digest(GRAPH_FILE.read_bytes()))
    result = {
        "question": "本仓库哪些项目分别负责 Agent 的任务协调、知识上下文和长期记忆？依据是什么？",
        "method": "人工确认角色与证据；Semantica 建图、保存、重新加载、查询。",
        "semantica_version": version("semantica"), "source_count": len(records),
        "answer_count": len(answers), "node_count": stats["node_count"], "edge_count": stats["edge_count"],
        "build": report, "sources": records, "catalog": catalog, "answers": answers,
        "knowledge_graph": read_json(GRAPH_FILE),
        "native_visualization": native_views,
        "negative_control": {"number": "005", "project": "Autoresearch", "reached_by_query": False},
        "artifacts": [
            {"title": "原文与版本", "file": "source-manifest.json", "purpose": "记录来自哪个文件、哪一版，并链接到完整原文快照。"},
            {"title": "证据记录", "file": "evidence.json", "purpose": "保存项目、角色、原文片段和出处，供核查与应用复用。"},
            {"title": "可重载的图谱", "file": "knowledge-graph.json", "purpose": "保存节点与关系；下次查询可以直接加载，继续找关联。"},
            {"title": "处理履历", "file": "run-report.json", "purpose": "记录本次处理时间、库版本、规模与校验结果。"},
        ],
        "limitations": ["关系由人标注；未启用中文自动抽取或语义向量搜索。",
                        "本试验使用本地 JSON 保存最新一批知识，未接外部数据库或业务系统。"],
    }
    write_json(RESULT_FILE, result)
    (SITE / "pilot-result.js").write_text("window.semanticaPilot = " + json.dumps(result, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    return result


def freshness(result: dict) -> dict:
    states = []
    for record in result["sources"]:
        try:
            path = source_path(record)
            exists = path.is_file()
            same = exists and path.relative_to(ROOT).as_posix() == record.get("input_path", record["path"]) and digest(path.read_bytes()) == record["sha256"]
        except ValueError:
            exists, same = False, False
        states.append({"number": record["number"], "current": bool(same), "exists": exists})
    inputs_current = digest(INPUTS.read_bytes()) == result["build"]["inputs_sha256"]
    return {"sources": states, "inputs_current": inputs_current,
            "all_current": inputs_current and all(row["current"] for row in states)}


def search(query: str) -> dict:
    result = read_json(RESULT_FILE)
    graph = load_graph()
    query = query.strip()[:200]
    if query:
        hits = graph.query(query, limit=100)
    else:
        hits = [{"node": row, "score": 1} for row in graph.find_nodes(node_type="project")]
    grouped = {}
    for hit in hits:
        node = hit["node"]
        properties = node.get("metadata", node.get("properties", {}))
        number = properties.get("project_number")
        if number:
            content = hit.get("content", node.get("content", properties.get("content", "")))
            grouped.setdefault(number, []).append({"type": node["type"], "content": content})
    catalog = {row["number"]: row for row in result["catalog"]}
    rows = [{**project_result(graph, number, catalog[number]), "matches": hits} for number, hits in grouped.items()]
    return {"query": query, "engine": "Semantica ContextGraph.query + get_neighbors",
            "build_id": result["build"]["build_id"], "results": rows}


def make_brief(numbers: list[str]) -> dict:
    result = read_json(RESULT_FILE)
    state = freshness(result)
    numbers = list(dict.fromkeys(numbers))
    catalog = {row["number"]: row for row in result["catalog"]}
    if not numbers or any(number not in catalog for number in numbers):
        raise ValueError("请先选择知识库中的项目。")
    current = {row["number"]: row["current"] for row in state["sources"]}
    if not state["inputs_current"] or any(not current[number] for number in numbers):
        raise ValueError("选中资料或标注清单已有更新，请复核后重建知识库，再生成简报。")
    lines = ["# Agent 研究任务简报", "", "目标：依据已核对的研究记录，明确候选项目的职责与待验证问题。", "",
             f"知识批次：{result['build']['build_id']}", "",
             "以下是应用模板根据查询结果编排的研究简报，不是模型生成的技术选型结论。", ""]
    for number in numbers:
        row = catalog[number]
        source = next(item for item in result["sources"] if item["number"] == number)
        lines += [f"## {number} · {row['project']}", "",
                  f"已记录角色：{row['role'] or '训练实验；预设主题之外'}。{row['reason']}", "",
                  f"> {row['quote']}", "", f"来源：{row['source']}，第 {row['line']} 行。",
                  f"来源摘要：{row['source_sha256']}", "",
                  f"[查看本批完整原文](sources/{number}.md)。读取方式：" + ("原文件缺失，使用已保存快照。" if source.get("source_mode") == "archived_snapshot" else "读取当前项目文件。"), ""]
    lines += ["## 下一步核查", "", "- 根据具体任务核对各项目的接口、许可与运行条件。",
              "- 对计划采用的能力做真实集成试验，记录输入、输出与失败情况。",
              "- 来源变更后复核相关归类与简报，再决定是否沿用。", ""]
    text = "\n".join(lines)
    (ARTIFACTS / "research-brief.md").write_text(text, encoding="utf-8")
    return {"markdown": text, "file": "projects/011-semantica/artifacts/research-brief.md",
            "build_id": result["build"]["build_id"], "selected": numbers}


if __name__ == "__main__":
    output = build()
    print(json.dumps({key: output[key] for key in ("semantica_version", "source_count", "answer_count", "node_count", "edge_count")}, ensure_ascii=True))

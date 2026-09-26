"""Render the saved graph with Semantica's own KGVisualizer (no custom drawing)."""
from __future__ import annotations

import copy
import json
from importlib.metadata import distribution, version
from pathlib import Path
from shutil import copyfile

from semantica.visualization import KGVisualizer
from semantica.visualization.utils.export_formats import export_plotly_figure

PROJECT = Path(__file__).resolve().parent
SITE = PROJECT.parents[1] / "sites" / "011-semantica"


def generate_native_views(graph, build_id: str, graph_sha256: str) -> dict:
    output = SITE / "native"
    output.mkdir(exist_ok=True)
    copyfile(distribution("plotly").locate_file("plotly-7.1.0.dist-info/licenses/LICENSE.txt"), output / "LICENSE-plotly.txt")
    canonical = graph.to_kg_dict()
    original = copy.deepcopy(canonical)
    # In 0.7.0, the visualizer reads source/target while the canonical adapter
    # emits source_id/target_id. Keep the canonical fields and supply aliases.
    for edge in original["relationships"]:
        edge["source"] = edge["source_id"]
        edge["target"] = edge["target_id"]
    compact = copy.deepcopy(original)
    for entity in compact["entities"]:
        entity["metadata"]["原文"] = entity["text"]
        if entity["type"] == "evidence":
            number = entity["metadata"]["project_number"]
            line = entity["metadata"]["line"]
            entity["text"] = f"{number} · 原文第 {line} 行"
        elif entity["type"] == "question":
            entity["text"] = "研究主题"

    memory_path = next(item["path_to_anchor"] for item in graph.get_neighbors(
        "theme:agent-context-stack", hops=3, include_distance_metadata=True
    ) if item["id"] == "evidence:012")
    variants = [
        ("force", "力导向布局", "force", compact, None),
        ("circular", "环形布局", "circular", compact, None),
        ("path", "Hindsight 路径高亮", "force", compact, memory_path),
        ("raw", "原始长标签", "force", original, None),
    ]
    views = []
    for name, title, layout, payload, path in variants:
        visualizer = KGVisualizer(layout=layout)
        figure = visualizer.visualize_network(
            payload, output="interactive", seed=42,
            hover_data=["原文"] if name != "raw" else None,
            highlight_path=path,
        )
        # Verify actual rendered content, especially after the endpoint adapter.
        node_trace = next(trace for trace in figure.data if trace.mode == "markers+text")
        assert len(node_trace.x) == len(canonical["entities"])
        assert len(figure.layout.annotations) == len(canonical["relationships"])
        if path:
            highlighted = next(trace for trace in figure.data if trace.mode == "lines" and trace.line.color == "#e05c00")
            assert sum(value is None for value in highlighted.x) == len(path) - 1
        # Semantica's exporter writes the Plotly figure unchanged. A local shared
        # Plotly script keeps all four files usable offline without duplicating it.
        filename = name + ".html"
        export_plotly_figure(figure, output / filename, format="html", include_plotlyjs="directory")
        views.append({"id": name, "title": title, "file": "native/" + filename,
                      "layout": layout, "node_count": len(node_trace.x),
                      "edge_count": len(figure.layout.annotations), "highlight_path": path})

    report = {
        "build_id": build_id, "graph_sha256": graph_sha256,
        "semantica_version": version("semantica"), "plotly_version": version("plotly"),
        "renderer": "semantica.visualization.KGVisualizer.visualize_network",
        "exporter": "semantica.visualization.utils.export_formats.export_plotly_figure",
        "seed": 42, "views": views,
        "input_adjustments": [
            "source_id/target_id duplicated as source/target for the 0.7.0 visualizer",
            "compact views shorten question/evidence labels; full text remains in hover metadata",
        ],
        "unchanged": "Node IDs, node types, relation types and endpoints remain unchanged; no hand-set coordinates or custom drawing.",
        "extraction": "Roles and evidence were human-reviewed in pilot-inputs.json; this run does not perform automatic extraction.",
    }
    raw = json.dumps(report, ensure_ascii=False, indent=2)
    (PROJECT / "artifacts" / "native-visualization.json").write_text(raw + "\n", encoding="utf-8")
    (SITE / "native-result.js").write_text("window.semanticaNative = " + raw + ";\n", encoding="utf-8")
    return report


if __name__ == "__main__":
    from run_pilot import GRAPH_FILE, RESULT_FILE, digest, load_graph, read_json
    result = read_json(RESULT_FILE)
    report = generate_native_views(load_graph(), result["build"]["build_id"], digest(GRAPH_FILE.read_bytes()))
    print(json.dumps({"renderer": report["renderer"], "views": len(report["views"])}))

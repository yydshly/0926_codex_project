"""Serve the local teaching UI and Semantica API on loopback only."""
from __future__ import annotations

import argparse
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, unquote, urlparse

from run_pilot import ROOT, SITE, PROJECT, RESULT_FILE, INPUTS, build, freshness, make_brief, read_json, search


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def same_host(self):
        expected = f"127.0.0.1:{self.server.server_port}"
        if self.headers.get("Host") != expected:
            self.respond(403, {"error": "仅允许通过本机演示地址访问。"})
            return False
        origin = self.headers.get("Origin")
        if origin and origin != "http://" + expected:
            self.respond(403, {"error": "操作须来自本机演示页面。"})
            return False
        return True

    def do_GET(self):
        if not self.same_host():
            return
        request = urlparse(self.path)
        try:
            if request.path == "/":
                self.send_response(302)
                self.send_header("Location", "/sites/011-semantica/index.html#pilot")
                self.end_headers()
                return
            if request.path == "/api/state":
                result = read_json(RESULT_FILE)
                self.respond(200, {"data": result, "freshness": freshness(result)})
                return
            if request.path == "/api/search":
                query = parse_qs(request.query).get("q", [""])[0]
                self.respond(200, search(query))
                return
            relative = unquote(request.path).lstrip("/") or "sites/011-semantica/index.html"
            target = (ROOT / relative).resolve()
            if target.is_dir():
                target = target / "index.html"
            input_paths = {(ROOT / row["path"]).resolve() for row in read_json(INPUTS)["sources"]}
            allowed = target.is_relative_to(SITE) or target in input_paths
            if target.is_relative_to(PROJECT):
                subpath = target.relative_to(PROJECT)
                allowed = not any(part.startswith(".") or part == "__pycache__" for part in subpath.parts)
            if not allowed or not target.is_file():
                self.respond(404, {"error": "文件不存在或不在本演示公开范围内。"})
                return
            raw = target.read_bytes()
            content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
            if target.suffix in (".md", ".py", ".txt"):
                content_type = "text/plain"
            self.send_response(200)
            self.send_header("Content-Type", content_type + ("; charset=utf-8" if content_type.startswith("text/") else ""))
            self.send_header("Content-Length", str(len(raw)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(raw)
        except (ValueError, OSError) as error:
            self.respond(400, {"error": str(error)})

    def do_POST(self):
        if not self.same_host():
            return
        # A custom header prevents cross-site form POSTs from triggering writes.
        if self.headers.get("X-Semantica-Pilot") != "1":
            self.respond(403, {"error": "请使用本机演示页面的操作按钮。"})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 0 or size > 4096:
                raise ValueError("请求过大。")
            payload = json.loads(self.rfile.read(size) or b"{}")
            if not isinstance(payload, dict):
                raise ValueError("请求须为对象。")
            if self.path == "/api/build":
                result = build()
                self.respond(200, {"data": result, "freshness": freshness(result)})
            elif self.path == "/api/brief":
                numbers = payload.get("numbers", [])
                if not isinstance(numbers, list) or not all(isinstance(item, str) for item in numbers):
                    raise ValueError("项目编号格式错误。")
                self.respond(200, make_brief(numbers))
            else:
                self.respond(404, {"error": "接口不存在。"})
        except (ValueError, OSError) as error:
            self.respond(400, {"error": str(error)})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8761)
    args = parser.parse_args()
    if not RESULT_FILE.exists() or "sources" not in read_json(RESULT_FILE):
        build()
    server = HTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Semantica pilot: http://127.0.0.1:{args.port}/sites/011-semantica/index.html#pilot", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()

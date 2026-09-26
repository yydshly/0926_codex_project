// Integration check against a running serve_pilot.py; uses installed Chrome.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const port = 20000 + Math.floor(Math.random() * 10000);
const snapshot = process.argv.includes("--snapshot");
const targetUrl = process.env.SEMANTICA_PREVIEW_URL || (snapshot ? pathToFileURL(resolve("sites/011-semantica/index.html")).href : "http://127.0.0.1:8761/sites/011-semantica/index.html");
const profile = join(tmpdir(), `semantica-flow-${process.pid}`);
await mkdir(profile, { recursive: true });
const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--window-size=1440,1100", targetUrl,
], { windowsHide: true, stdio: "ignore" });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, send;
const errors = [];
try {
  let page;
  for (let i = 0; i < 60; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(item => item.type === "page"); } catch {}
    if (page) break;
    await pause(100);
  }
  assert.ok(page, "Chrome debugging target started");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let id = 0;
  const jobs = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    if (!message.id) return;
    const job = jobs.get(message.id);
    if (!job) return;
    clearTimeout(job.timer); jobs.delete(message.id);
    if (message.error) job.reject(new Error(message.error.message)); else job.resolve(message.result);
  });
  send = (method, params = {}) => new Promise((resolve, reject) => {
    const key = ++id;
    const timer = setTimeout(() => { jobs.delete(key); reject(new Error(`CDP timeout: ${method}`)); }, 12000);
    jobs.set(key, { resolve, reject, timer }); socket.send(JSON.stringify({ id: key, method, params }));
  });
  const evaluate = async expression => {
    const output = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (output.exceptionDetails) throw new Error(output.exceptionDetails.text);
    return output.result.value;
  };
  const waitFor = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await pause(100); }
    throw new Error(`Condition timed out: ${expression}`);
  };
  const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const screenshot = async (path, selector = "#pilot") => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:"instant"})`);
    await pause(200);
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(path, Buffer.from(shot.data, "base64"));
  };
  await send("Runtime.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await waitFor(`document.getElementById("runtime-mode")?.textContent === ${JSON.stringify(snapshot ? "保存的运行快照" : "本机实时运行")}`);
  assert.equal(await evaluate('document.querySelectorAll(".source-choice").length'), 4);
  assert.ok(await evaluate('document.querySelector(".overview-figure img").complete && document.querySelector(".overview-figure img").naturalWidth > 0'), "Overview diagram loads");
  await screenshot(join(profile, "overview-desktop.png"), ".topbar");
  await screenshot(join(profile, "summary-desktop.png"), "#summary");
  if (snapshot) assert.ok(await evaluate('document.getElementById("rebuild-button").disabled'));
  else {
    await click("#rebuild-button");
    await waitFor('document.getElementById("build-status").textContent.startsWith("本次完成")');
  }
  await click('[data-step="1"]');
  assert.equal(await evaluate('document.querySelectorAll("#run-steps li").length'), 4);
  await click('[data-step="2"]');
  assert.equal(await evaluate('document.querySelectorAll(".asset-card").length'), 4);
  assert.equal(await evaluate('document.querySelectorAll(".map-node").length'), 12);
  assert.equal(await evaluate('document.querySelectorAll(".map-edge").length'), 10);
  assert.equal(await evaluate('document.querySelectorAll(".map-node.is-active").length'), 4);
  assert.equal(await evaluate('document.querySelectorAll(".map-edge.is-active").length'), 3);
  assert.equal(await evaluate('document.querySelectorAll(".map-reading-list li").length'), 3);
  assert.ok(await evaluate('document.querySelector("#map-evidence").textContent.includes("Hindsight")'));
  await click('[data-map-project="005"]');
  assert.equal(await evaluate('document.querySelectorAll(".map-node.is-active").length'), 2);
  assert.equal(await evaluate('document.querySelectorAll(".map-edge.is-active").length'), 1);
  assert.ok(await evaluate('!document.querySelector(".map-kind-question").classList.contains("is-active")'));
  await click('[data-map-project="all"]');
  assert.equal(await evaluate('document.querySelectorAll(".map-node.is-active").length'), 12);
  assert.equal(await evaluate('document.querySelectorAll(".map-edge.is-active").length'), 10);
  await click('[data-map-project="012"]');
  await screenshot(snapshot ? join(profile, "graph-snapshot.png") : "projects/011-semantica/assets/graph-preview.png", "#graph-guide");
  await click('#try-map-search');
  await waitFor('document.querySelectorAll(".search-card").length === 1 && document.querySelector(".search-card h4").textContent.includes("012")');
  await evaluate('document.getElementById("search-query").value = ""');
  await click('[data-step="3"]');
  await waitFor('document.querySelectorAll(".search-card").length === 4');
  await click('[data-query="记忆"]');
  await waitFor('document.querySelectorAll(".search-card").length === 1 && document.querySelector(".search-card h4").textContent.includes("012")');
  await screenshot(join(profile, "search.png"));
  await click('.search-card input[type="checkbox"]');
  await click('[data-step="4"]');
  assert.equal(await evaluate('document.querySelectorAll(".brief-selected").length'), 1);
  await click("#select-theme");
  assert.equal(await evaluate('document.querySelectorAll(".brief-selected").length'), 3);
  await click("#make-brief");
  await waitFor(`document.getElementById("brief-status").textContent.includes(${JSON.stringify(snapshot ? "快照简报已生成" : "检查通过")})`);
  const brief = await evaluate('document.getElementById("brief-text").value');
  assert.ok(brief.includes("Hindsight") && brief.includes("Oh My OpenAgent") && brief.includes("来源"));
  await screenshot(join(profile, "business.png"));
  await click('[data-step="0"]');
  await screenshot(snapshot ? join(profile, "snapshot.png") : "projects/011-semantica/assets/pilot-preview.png");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot(join(profile, "overview-mobile.png"), ".topbar");
  await screenshot(snapshot ? join(profile, "snapshot-mobile.png") : "projects/011-semantica/assets/pilot-mobile-preview.png");
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), "No page horizontal overflow on mobile");
  await evaluate('location.hash = "graph-guide"');
  await waitFor('!document.querySelectorAll("[data-panel]")[2].hidden');
  await screenshot(join(profile, "graph-mobile.png"), "#graph-guide");
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'), "Graph scroll stays inside mobile page");
  await click('[data-map-project="008"]');
  assert.ok(await evaluate('document.getElementById("map-evidence").textContent.includes("Oh My OpenAgent")'));
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(JSON.stringify({ passed: true, mode: snapshot ? "snapshot" : "live", sourceCount: 4, steps: 5, graphNodes: 12, graphEdges: 10, memorySearch: "012", briefProjects: 3, mobileOverflow: false, screenshots: [join(profile, "graph-mobile.png"), join(profile, "search.png"), join(profile, "business.png")] }));
} finally {
  if (send) { try { await send("Browser.close"); } catch {} }
  socket?.close(); chrome.kill();
}

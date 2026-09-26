// Verify the real KGVisualizer exports in the browser, including native hover.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const port = 20000 + Math.floor(Math.random() * 10000);
const profile = join(tmpdir(), `semantica-native-${process.pid}`);
await mkdir(profile, { recursive: true });
const browser = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", "--disable-gpu", "--no-first-run", "--disable-extensions",
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  "--window-size=1440,1100", "http://127.0.0.1:8761/sites/011-semantica/native-graph.html",
], { windowsHide: true, stdio: "ignore" });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, send;
const errors = [];
try {
  let page;
  for (let attempt = 0; attempt < 60; attempt++) {
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(item => item.type === "page"); } catch {}
    if (page) break;
    await pause(100);
  }
  assert.ok(page);
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let id = 0;
  const jobs = new Map();
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
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
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async expression => {
    for (let attempt = 0; attempt < 100; attempt++) { if (await evaluate(expression)) return; await pause(100); }
    throw new Error(`Timed out: ${expression}`);
  };
  const screenshot = async path => {
    await pause(200);
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(path, Buffer.from(result.data, "base64"));
  };
  const graphExpr = 'document.getElementById("native-frame")?.contentDocument?.querySelector(".js-plotly-plot")';
  await send("Runtime.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await waitFor(`!!(${graphExpr})?.data`);
  const base = await evaluate(`(${graphExpr}).data.find(t=>t.mode==="markers+text").text`);
  for (const variant of ["force", "circular", "path", "raw"]) {
    await evaluate(`document.querySelector('[data-native="${variant}"]').click()`);
    await waitFor(`document.getElementById("native-frame").contentWindow.location.pathname.endsWith("/${variant}.html") && !!(${graphExpr})?.data`);
    const stats = await evaluate(`(() => { const g=${graphExpr}; return {nodes:g.data.find(t=>t.mode==="markers+text").text.length,edges:g.layout.annotations.length,highlight:g.data.find(t=>t.line?.color==="#e05c00")?.x.filter(v=>v===null).length || 0,labels:g.data.find(t=>t.mode==="markers+text").text}; })()`);
    assert.equal(stats.nodes, 12); assert.equal(stats.edges, 10);
    assert.equal(stats.highlight, variant === "path" ? 3 : 0);
    if (variant !== "raw") assert.deepEqual(stats.labels, base);
    else assert.ok(stats.labels.some(text => text.length > 30));
    if (variant === "force") {
      // Use a real mouse move to verify the library's hover tooltip.
      await waitFor('document.getElementById("native-frame").contentDocument.querySelectorAll(".scatterlayer .point").length === 12');
      await screenshot("projects/011-semantica/assets/native-preview.png");
      const point = await evaluate(`(() => { const frame=document.getElementById("native-frame"); const points=frame.contentDocument.querySelectorAll(".scatterlayer .point"); const p=points[9].getBoundingClientRect(); const r=frame.getBoundingClientRect(); return {x:r.x+p.x+p.width/2,y:r.y+p.y+p.height/2}; })()`);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
      await pause(300);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x + 1, y: point.y });
      await waitFor('document.getElementById("native-frame").contentDocument.querySelector(".hoverlayer")?.textContent.includes("Type:")');
      await screenshot(join(profile, "native-hover.png"));
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 30, y: 30 });
      await screenshot("projects/011-semantica/assets/native-preview.png");
    } else if (variant === "path") await screenshot("projects/011-semantica/assets/native-path-preview.png");
    else await screenshot(join(profile, `native-${variant}.png`));
  }
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate('document.querySelector("[data-native=force]").click()');
  await waitFor(`document.getElementById("native-frame").contentWindow.location.pathname.endsWith("/force.html") && !!(${graphExpr})?.data`);
  assert.ok(await evaluate('document.documentElement.scrollWidth <= innerWidth + 1'));
  await screenshot(join(profile, "native-mobile.png"));
  await send("Page.navigate", { url: pathToFileURL(resolve("sites/011-semantica/native/force.html")).href });
  await waitFor('location.protocol === "file:" && !!document.querySelector(".js-plotly-plot")?.data');
  assert.equal(await evaluate('document.querySelector(".js-plotly-plot").data.find(t=>t.mode==="markers+text").text.length'), 12);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({passed:true,views:4,nodes:12,edges:10,highlightedEdges:3,nativeHover:true,localFile:true,mobileOverflow:false,screenshots:profile}));
} finally {
  if (send) { try { await send("Browser.close"); } catch {} }
  socket?.close(); browser.kill();
}

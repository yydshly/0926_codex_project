// Browser checks and real renders for the guide page and its exportable poster.
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const port = 20000 + Math.floor(Math.random() * 10000);
const profile = join(tmpdir(), `semantica-guide-${process.pid}`);
await mkdir(profile, {recursive:true});
const url = "http://127.0.0.1:8761/sites/011-semantica/guide.html";
const browser = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", ["--headless=new","--disable-gpu","--no-first-run","--disable-extensions",`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,"--window-size=1440,1100",url], {windowsHide:true,stdio:"ignore"});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket,send;
const errors=[];
try {
  let page;
  for(let i=0;i<60;i++){try{page=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(p=>p.type==="page");}catch{} if(page)break;await pause(100);}
  assert.ok(page);
  socket=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
  let id=0;const jobs=new Map();
  socket.addEventListener("message",event=>{const m=JSON.parse(event.data);if(m.method==="Runtime.exceptionThrown")errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);const job=jobs.get(m.id);if(!job)return;clearTimeout(job.timer);jobs.delete(m.id);m.error?job.reject(new Error(m.error.message)):job.resolve(m.result);});
  send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{jobs.delete(key);reject(new Error(`CDP timeout: ${method}`));},12000);jobs.set(key,{resolve,reject,timer});socket.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const r=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
  const waitFor=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await pause(100);}throw new Error(`Timed out: ${expression}`);};
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const scroll=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:"instant",block:"start"})`);
  const shot=async path=>{await pause(150);const r=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});await writeFile(path,Buffer.from(r.data,"base64"));};
  await send("Runtime.enable");await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride",{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await waitFor('document.querySelectorAll(".module-card").length === 9');
  assert.equal(await evaluate('document.querySelectorAll(".journey-step").length'),6);
  assert.equal(await evaluate('document.querySelectorAll(".roadmap-card").length'),6);
  assert.equal(await evaluate('document.querySelectorAll(".guide-scenario").length'),12);
  assert.equal(await evaluate('document.querySelectorAll("#comparison tbody tr").length'),6);
  await scroll("#comparison");
  await shot("projects/011-semantica/assets/comparison-preview.png");
  await scroll(".compare-example");await shot(join(profile,"comparison-example-desktop.png"));
  // Verify that each step can show both capability and actual responsibility.
  for(const mode of ["capability","ours"]){
    await click(`[data-view="${mode}"]`);
    for(const id of ["input","extract","govern","store","retrieve","deliver"]){
      await click(`[data-stage="${id}"]`);
      const body=await evaluate('document.getElementById("journey-detail").textContent');
      assert.ok(body.includes(mode==="ours"?"我们具体怎么做":"这一步发生什么"));
      if(mode==="ours"&&id==="extract")assert.ok(body.includes("没有实测自动抽取"));
    }
  }
  await click('[data-stage="store"]');await scroll("#journey");
  await shot("projects/011-semantica/assets/guide-flow-preview.png");
  for(const group of ["研究","团队","业务","全部"]){await click(`[data-group="${group}"]`);assert.equal(await evaluate('document.querySelectorAll(".guide-scenario").length'),group==="全部"?12:4);}
  await click("#toggle-poster");assert.equal(await evaluate('document.getElementById("full-poster").hidden'),false);await click("#toggle-poster");
  const broken=await evaluate('Array.from(document.links).filter(a=>a.getAttribute("href").startsWith("#")&&!document.getElementById(a.hash.slice(1))).map(a=>a.hash)');assert.deepEqual(broken,[]);
  await evaluate('window.scrollTo({top:0,behavior:"instant"})');
  await shot("projects/011-semantica/assets/guide-preview.png");
  await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await shot("projects/011-semantica/assets/guide-mobile-preview.png");
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),"No page overflow on mobile");
  await scroll("#comparison");await shot("projects/011-semantica/assets/comparison-mobile-preview.png");
  await scroll(".compare-table");await shot(join(profile,"comparison-table-mobile.png"));
  assert.ok(await evaluate('Array.from(document.querySelectorAll("#comparison td")).every(n=>n.getBoundingClientRect().right<=innerWidth)'),"Comparison table fits mobile width");
  await scroll(".compare-example");await shot(join(profile,"comparison-example-mobile.png"));
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),"Comparison fits mobile width");
  await scroll("#journey");await shot(join(profile,"guide-flow-mobile.png"));
  assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'));
  // Export a real PNG from the standalone, vector-based explanation diagram.
  await send("Emulation.setDeviceMetricsOverride",{width:1600,height:2940,deviceScaleFactor:1,mobile:false});
  await send("Page.navigate",{url:pathToFileURL(resolve("projects/011-semantica/assets/guide-overview.svg")).href});
  await waitFor('document.documentElement.tagName.toLowerCase()==="svg"');
  await evaluate('document.fonts.ready');
  assert.equal(await evaluate('document.querySelectorAll("parsererror").length'),0);
  const textOverflow=await evaluate('Array.from(document.querySelectorAll("text")).map(n=>({text:n.textContent,b:n.getBBox()})).filter(r=>r.b.x<0||r.b.x+r.b.width>1600||r.b.y<0||r.b.y+r.b.height>2940).map(r=>r.text)');assert.deepEqual(textOverflow,[],"Poster text stays inside image");
  await shot("projects/011-semantica/assets/guide-overview.png");
  // File mode needs no local service or network to read the guide data.
  await send("Emulation.setDeviceMetricsOverride",{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send("Page.navigate",{url:pathToFileURL(resolve("sites/011-semantica/guide.html")).href});
  await waitFor('document.querySelectorAll(".module-card").length===9');
  await click('[data-group="研究"]');assert.equal(await evaluate('document.querySelectorAll(".guide-scenario").length'),4);
  const html=await readFile("sites/011-semantica/guide.html","utf8");
  for(const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
    if(/^(https?:|mailto:)/.test(m[1]))continue;
    await access(resolve("sites/011-semantica",m[1].split("#")[0]));
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,steps:6,moduleGroups:9,scenarios:12,comparisonRows:6,roadmapSteps:6,liveAndFile:true,mobileOverflow:false,poster:"1600x2940",screenshots:profile}));
}finally{if(send){try{await send("Browser.close");}catch{}}socket?.close();browser.kill();}

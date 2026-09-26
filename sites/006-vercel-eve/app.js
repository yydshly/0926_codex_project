"use strict";

const $ = (id) => document.getElementById(id);
const elements = {
  input: $("repo-input"), start: $("start-button"), snapshot: $("snapshot-button"), reset: $("reset-button"),
  approve: $("approve-button"), reject: $("reject-button"), recall: $("recall-button"),
  clearLog: $("clear-log-button"), session: $("session-label"), origin: $("data-origin"),
  facts: $("fact-list"), fetchStatus: $("fetch-status"), reviewStatus: $("review-status"),
  recommendation: $("recommendation"), recallResult: $("recall-result"), log: $("event-log")
};

// This is a dated result of the repository's independently verified GitHub query tool.
// It is deliberately opt-in and is never presented as a fresh API response.
const verifiedSnapshot = {
  full_name: "vercel/eve",
  description: "The Open Framework for Building Agents",
  html_url: "https://github.com/vercel/eve",
  default_branch: "main",
  license: { spdx_id: "Apache-2.0" },
  archived: false,
  stargazers_count: 5372,
  pushed_at: "2026-09-26T04:22:38Z"
};
const snapshotTime = "2026-09-26 04:27 UTC";

let sessionNumber = 0;
let runVersion = 0;
let activeController = null;
let current = null;

function setStep(name, state, label) {
  const item = document.querySelector(`[data-step="${name}"]`);
  item.classList.remove("done", "active", "skipped");
  if (state) item.classList.add(state);
  item.querySelector(".step-state").textContent = label;
}

function resetSteps() {
  for (const name of ["receive", "tool", "reason", "approve", "resume"]) setStep(name, "", "待执行");
}

function log(message) {
  if (elements.log.firstElementChild?.textContent === "等待你启动演示。") elements.log.replaceChildren();
  const entry = document.createElement("li");
  const clock = document.createElement("time");
  clock.textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  entry.append(clock, document.createTextNode(message));
  elements.log.append(entry);
  elements.log.scrollTop = elements.log.scrollHeight;
}

function newSession() {
  runVersion += 1;
  activeController?.abort();
  activeController = null;
  current = null;
  sessionNumber += 1;
  elements.session.textContent = `演示会话 #${sessionNumber}`;
  elements.origin.textContent = "等待数据";
  elements.facts.replaceChildren();
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = "开始研究后，这里显示真实 GitHub 元数据。";
  elements.facts.append(empty);
  elements.fetchStatus.textContent = "";
  elements.reviewStatus.textContent = "等待判断";
  elements.recommendation.textContent = "查询完成后出现初步建议。此页的建议由固定规则生成，专用于理解审批节点。";
  elements.recallResult.textContent = "尚无会话记录。";
  elements.approve.disabled = true;
  elements.reject.disabled = true;
  elements.start.disabled = false;
  elements.snapshot.disabled = false;
  resetSteps();
  elements.log.replaceChildren();
  log("新的浏览器演示会话已开始；状态只保存在当前页面内。");
}

function validSlug(value) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value) && !value.includes("..");
}

function begin(slug, source) {
  newSession();
  setStep("receive", "done", "已接收");
  setStep("tool", "active", "进行中");
  log(`网页收到研究请求：${slug}。`);
  log(source === "live" ? "浏览器正在调用 GitHub 公共 API。" : `加载 ${snapshotTime} 验证过的 GitHub 查询快照。`);
}

function fact(label, value, url) {
  const row = document.createElement("div");
  row.className = "fact-row";
  const term = document.createElement("dt");
  term.textContent = label;
  const detail = document.createElement("dd");
  if (url) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = value;
    detail.append(link);
  } else detail.textContent = value;
  row.append(term, detail);
  elements.facts.append(row);
}

function showResearch(data, source) {
  const slug = String(data.full_name || "");
  if (!validSlug(slug)) throw new Error("返回的仓库名称无效。 ");
  const url = `https://github.com/${slug}`;
  const license = data.license?.spdx_id || "未标明";
  const archived = Boolean(data.archived);
  const advice = archived
    ? "该仓库已归档。固定规则建议暂缓进一步采用，先人工确认维护状态。"
    : license === "未标明" || license === "NOASSERTION"
      ? "仓库未显示明确许可。固定规则建议先核对使用权限，再评估技术价值。"
      : "仓库未归档且可读取许可信息。固定规则建议进入人工技术复核。";
  current = { slug, advice, decision: null };
  elements.facts.replaceChildren();
  fact("仓库", slug, url);
  fact("描述", data.description || "未提供");
  fact("默认分支", data.default_branch || "未提供");
  fact("许可标识", license);
  fact("归档状态", archived ? "已归档" : "未归档");
  fact("星标", Number.isFinite(data.stargazers_count) ? data.stargazers_count.toLocaleString("zh-CN") : "未提供");
  if (data.pushed_at) fact("最近推送", new Date(data.pushed_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
  elements.origin.textContent = source === "live" ? "GitHub 实时数据" : "已验证历史快照";
  elements.fetchStatus.textContent = source === "live"
    ? `来源：GitHub 公共 API；读取于 ${new Date().toLocaleString("zh-CN")}。`
    : `快照读取于 ${snapshotTime}；仅供离线演示，数值可能已变化。`;
  elements.recommendation.textContent = `${advice} 这是网页固定规则演示，不是模型输出。`;
  elements.reviewStatus.textContent = "等待你审批";
  elements.approve.disabled = false;
  elements.reject.disabled = false;
  setStep("tool", "done", "已读取");
  setStep("reason", "done", "规则演示");
  setStep("approve", "active", "等待你");
  log(`查询工具得到 ${slug} 的仓库元数据。`);
  log("网页用固定规则生成初步建议，等待你的决定。");
}

async function runLive() {
  const slug = elements.input.value.trim();
  if (!validSlug(slug)) {
    elements.fetchStatus.textContent = "请输入 owner/repo 格式的公开 GitHub 仓库。";
    elements.input.focus();
    return;
  }
  begin(slug, "live");
  const version = runVersion;
  const controller = new AbortController();
  activeController = controller;
  elements.start.disabled = true;
  elements.snapshot.disabled = true;
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`https://api.github.com/repos/${slug}`, {
      headers: { Accept: "application/vnd.github+json" }, signal: controller.signal
    });
    if (!response.ok) {
      if (response.status === 404) throw new Error("找不到此公开仓库。请检查名称。 ");
      if (response.status === 403) throw new Error("GitHub API 暂时限制了请求。可使用已验证快照演示。 ");
      throw new Error(`GitHub API 返回状态 ${response.status}。`);
    }
    const data = await response.json();
    if (version !== runVersion) return;
    showResearch(data, "live");
  } catch (error) {
    if (version !== runVersion) return;
    const message = error.name === "AbortError" ? "请求超时或已取消；可以使用已验证快照。" : error.message;
    elements.fetchStatus.textContent = message;
    elements.origin.textContent = "查询失败";
    setStep("tool", "skipped", "未完成");
    log(`查询未完成：${message}`);
  } finally {
    clearTimeout(timeout);
    if (version === runVersion) {
      activeController = null;
      elements.start.disabled = false;
      elements.snapshot.disabled = false;
    }
  }
}

function runSnapshot() {
  elements.input.value = verifiedSnapshot.full_name;
  begin(verifiedSnapshot.full_name, "snapshot");
  showResearch(verifiedSnapshot, "snapshot");
}

function decide(approved) {
  if (!current || current.decision !== null) return;
  current.decision = approved ? "approved" : "rejected";
  elements.approve.disabled = true;
  elements.reject.disabled = true;
  elements.reviewStatus.textContent = approved ? "已批准（网页模拟）" : "已拒绝（网页模拟）";
  setStep("approve", approved ? "done" : "skipped", approved ? "已批准" : "已拒绝");
  setStep("resume", "active", "可读回");
  elements.recallResult.textContent = approved
    ? "判断已保存在当前网页会话中。点击下方按钮模拟下一轮询问。"
    : "本次判断未保存。点击下方按钮查看下一轮会得到什么。";
  log(approved ? "你批准了初步建议；网页仅在内存中记录此决定。" : "你拒绝了初步建议；网页没有保存判断。 ");
}

function recall() {
  if (!current) {
    elements.recallResult.textContent = "还没有研究结果。请先查询仓库。";
    return;
  }
  if (current.decision === null) {
    elements.recallResult.textContent = "还在等待你的审批决定。";
    return;
  }
  if (current.decision === "approved") {
    elements.recallResult.textContent = `当前网页会话读回：${current.slug} —— ${current.advice}`;
    log(`模拟下一轮询问：读回 ${current.slug} 的已批准判断。`);
  } else {
    elements.recallResult.textContent = `当前网页会话读回：${current.slug} 的建议已被拒绝，没有保存的判断。`;
    log(`模拟下一轮询问：${current.slug} 没有已批准判断。`);
  }
  setStep("resume", "done", "已读回");
}

elements.start.addEventListener("click", runLive);
elements.input.addEventListener("keydown", (event) => { if (event.key === "Enter") runLive(); });
elements.snapshot.addEventListener("click", runSnapshot);
elements.reset.addEventListener("click", newSession);
elements.approve.addEventListener("click", () => decide(true));
elements.reject.addEventListener("click", () => decide(false));
elements.recall.addEventListener("click", recall);
elements.clearLog.addEventListener("click", () => elements.log.replaceChildren());

const walkthroughs = {
  repo: [
    {
      title: "先给它一个公开仓库地址",
      description: "你在 GitReverse 网页里贴入 GitHub URL，或直接输入“作者/仓库”。下面用 GitReverse 自己的公开仓库说明这个过程。",
      label: "本页使用的真实输入例子",
      text: "https://github.com/filiksyos/gitreverse",
      caveat: "输入的是仓库地址，不是手机 App 安装包，也不是一段运行中的程序。"
    },
    {
      title: "它只提取有限的仓库线索",
      description: "服务通过 GitHub API 收集仓库资料，再把精简后的内容交给大模型。这样做很快，但证据范围也很有限。",
      label: "模型实际可得到的主要线索",
      items: ["仓库描述、主要语言、主题等元数据", "根目录一层文件树", "README 的前 8,000 个字符"],
      caveat: "快速路线没有逐个打开源码文件，也没有运行这个仓库。"
    },
    {
      title: "大模型把线索改写成一条需求",
      description: "GitReverse 的系统提示词要求模型用自然语言说明“要做什么”，写得像用户发给编程助手的一条请求。",
      label: "本研究页手写的教学示例 · 非原服务输出",
      text: "请做一个网页：用户贴入公开 GitHub 仓库链接后，系统整理仓库简介、README 和根目录结构，写出一条简洁、容易复制的开发需求，让用户可以拿给编程助手作为起点。",
      caveat: "这段话只是帮助理解输出形态；我们没有调用 GitReverse 生成它。"
    },
    {
      title: "把它当起点，再自己核对",
      description: "你可以拿这条需求去讨论或制作原型，但正式研究还要核对功能、源码、许可证和实际效果。",
      label: "合理的下一步",
      items: ["先把提示词当作“这个项目可能要做什么”的草稿", "对照官方文档和关键源码，删掉无依据的说法", "补上你的目标用户、功能范围与验收标准，再交给编程助手"],
      caveat: "它不能找回作者真正输入过的原始提示词。"
    }
  ],
  site: [
    {
      title: "把 Chippy Tea 的官网地址交给它",
      description: "我们在 GitReverse 官网切到 Website 模式，粘贴了 Chippy Tea 的公开网页地址，并点击 Get Prompt。",
      label: "2026-09-26 的真实输入",
      text: "https://www.chippytea.com/",
      caveat: "输入的是产品介绍网页，不是 macOS 应用本身，也不是 SwiftUI 或 Rust 源码。"
    },
    {
      title: "它从网页拿到可见的产品线索",
      description: "我们直接核对了原网页，再对照 GitReverse 生成结果：核心信息进入了提示词，具体设计细节则有遗漏。",
      label: "官网实际展示的例子",
      items: ["标题：Free up space on your Mac", "用途：查找旧构建文件夹、项目依赖与安装包", "操作原则：先看估算大小和删除影响，再由用户选择", "视觉：奶油色底、黄色下载按钮、手绘感边框"],
      caveat: "网页上的 85.43 GB 等数字属于官网标注的虚构演示，不能当作真实清理成绩。"
    },
    {
      title: "它实际给出两份生成结果",
      description: "GitReverse 返回了公开结果页：一条英文建站提示词，以及可单独查看或下载的 design.md。",
      label: "实际输出的核心意思",
      items: ["提示词：制作 Chippy Tea 的简洁产品营销网页", "页面内容：首屏、下载与源码入口、示例清理项目、清理历史说明", "视觉说明：奶油色背景、圆润字体、灰褐色链接等"],
      caveat: "这是 GitReverse 的真实输出概述；它没有生成原生 Mac 应用源码。设计说明还漏掉了醒目的黄色按钮。"
    },
    {
      title: "把结果用于网页原型，而非应用复原",
      description: "如果你想做一个同类产品的介绍网页，可以拿这条提示词作为第一稿，再依据官网补齐遗漏的视觉和交互。",
      label: "从这次实测得到的判断",
      items: ["适合：起草产品介绍页、整理文案与视觉方向", "仍需：逐项核对截图、响应式布局与点击行为", "不适合：凭此还原 SwiftUI／Rust 应用实现或作者原始提示词"],
      caveat: "公开网页无法证明原生应用内部的完整功能和技术细节。"
    }
  ]
};

let activeMode = "site";
let activeStep = 0;

const modeButtons = [...document.querySelectorAll(".mode-button")];
const stepButtons = [...document.querySelectorAll(".step-button")];
const kicker = document.getElementById("step-kicker");
const count = document.getElementById("step-count");
const title = document.getElementById("step-title");
const description = document.getElementById("step-description");
const example = document.getElementById("step-example");
const caveat = document.getElementById("step-caveat");
const prev = document.getElementById("prev-step");
const next = document.getElementById("next-step");

function render() {
  const data = walkthroughs[activeMode][activeStep];
  const stepLabel = String(activeStep + 1).padStart(2, "0");
  kicker.textContent = `${activeMode === "repo" ? "仓库路线" : "网站路线"} · 第 ${activeStep + 1} 步`;
  count.textContent = `${stepLabel} / 04`;
  title.textContent = data.title;
  description.textContent = data.description;
  caveat.textContent = data.caveat;

  example.replaceChildren();
  const label = document.createElement("div");
  label.className = "example-label";
  label.textContent = data.label;
  example.append(label);
  if (data.items) {
    const list = document.createElement("ul");
    data.items.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item;
      list.append(li);
    });
    example.append(list);
  } else {
    const paragraph = document.createElement("p");
    paragraph.textContent = data.text;
    example.append(paragraph);
  }

  modeButtons.forEach(button => {
    const selected = button.dataset.mode === activeMode;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  stepButtons.forEach((button, index) => {
    const selected = index === activeStep;
    button.classList.toggle("active", selected);
    if (selected) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  prev.disabled = activeStep === 0;
  next.innerHTML = activeStep === 3 ? "从头再看 <span aria-hidden=\"true\">↺</span>" : "下一步 <span aria-hidden=\"true\">→</span>";
}

modeButtons.forEach(button => button.addEventListener("click", () => {
  activeMode = button.dataset.mode;
  activeStep = 0;
  render();
}));
stepButtons.forEach((button, index) => button.addEventListener("click", () => {
  activeStep = index;
  render();
}));
prev.addEventListener("click", () => {
  if (activeStep > 0) activeStep -= 1;
  render();
});
next.addEventListener("click", () => {
  activeStep = activeStep === 3 ? 0 : activeStep + 1;
  render();
});

render();

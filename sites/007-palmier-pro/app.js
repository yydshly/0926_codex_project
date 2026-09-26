const capabilities = {
  media: {
    number: "01",
    title: "先理解素材，再决定怎么剪。",
    description: "读取项目和时间线，导入媒体，检查画面与语音内容，并按画面或对白搜索素材。",
    features: [
      ["项目与时间线", "读取轨道、片段、标记和工程设置。"],
      ["媒体导入", "导入本地文件、目录、URL 或字幕。"],
      ["内容检索", "按画面内容或所说的话查找素材。"],
      ["画面检查", "抽取帧并检查合成后的时间线画面。"]
    ],
    tools: "get_timeline · import_media · search_media · inspect_timeline"
  },
  edit: {
    number: "02",
    title: "把剪辑意图落到每一帧。",
    description: "放置、分割、移动、删除和替换片段；使用波纹编辑维护后续镜头与音频的对齐。",
    features: [
      ["片段操作", "添加、插入、移动、分割和删除片段。"],
      ["精确调整", "设置裁切、时长、速度、音量和透明度。"],
      ["波纹编辑", "删除区间并自动闭合间隙。"],
      ["轨道组织", "管理轨道顺序、名称、静音与同步锁定。"]
    ],
    tools: "add_clips · split_clips · ripple_delete_ranges · set_clip_properties"
  },
  finish: {
    number: "03",
    title: "让粗剪走向可交付。",
    description: "为对白生成字幕，设置文本样式和关键帧，并处理调色、效果、遮罩和多机位素材。",
    features: [
      ["语音与字幕", "读取转写、移除口头禅、添加字幕。"],
      ["画面处理", "应用调色、LUT、模糊、锐化或遮罩。"],
      ["动画", "设置位置、缩放、旋转、透明度等关键帧。"],
      ["多机位", "同步摄影机与麦克风并切换角度。"]
    ],
    tools: "add_captions · apply_color · set_keyframes · manage_multicam"
  },
  generate: {
    number: "04",
    title: "缺素材时，在工程里补齐。",
    description: "当前产品文档提供图片、视频、配音、音乐、音效、口型同步和增强等生成流程；相关服务使用积分。",
    features: [
      ["图片与视频", "从文字或参考素材生成新的镜头。"],
      ["音频制作", "生成配音、音乐、音效或译配。"],
      ["素材改造", "视频重构、画幅调整、补帧与放大。"],
      ["回到时间线", "生成结果进入媒体库，可继续裁切与组合。"]
    ],
    tools: "list_models · generate_image · generate_video · generate_audio"
  },
  deliver: {
    number: "05",
    title: "从可编辑工程走到交付。",
    description: "渲染成片，或导出给其他剪辑软件继续处理的时间线交换文件。",
    features: [
      ["视频成片", "导出 H.264、H.265、ProRes 等格式。"],
      ["编辑器交换", "导出 XML 或 FCPXML，继续在其他 NLE 中精修。"],
      ["工程归档", "打包工程及可用媒体，便于移交或备份。"],
      ["任务状态", "查看导出进度、告警、结果或取消任务。"]
    ],
    tools: "export_project · manage_exports"
  }
};

const tabs = [...document.querySelectorAll(".capability-tab")];
const panel = document.getElementById("capability-panel");
const title = document.getElementById("panel-title");
const description = document.getElementById("panel-description");
const counter = document.getElementById("panel-counter");
const grid = document.getElementById("feature-grid");
const tools = document.getElementById("panel-tools");

function selectCategory(category, focus = false) {
  const data = capabilities[category];
  const active = tabs.find((tab) => tab.dataset.category === category);
  if (!data || !active) return;

  tabs.forEach((tab) => {
    const selected = tab === active;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  panel.setAttribute("aria-labelledby", active.id);
  counter.textContent = `CAPABILITY / ${data.number}`;
  title.textContent = data.title;
  description.textContent = data.description;
  tools.textContent = data.tools;
  grid.replaceChildren(...data.features.map(([name, detail]) => {
    const item = document.createElement("div");
    item.className = "feature";
    const dot = document.createElement("span");
    dot.className = "feature-dot";
    dot.setAttribute("aria-hidden", "true");
    const heading = document.createElement("strong");
    heading.textContent = name;
    const copy = document.createElement("p");
    copy.textContent = detail;
    item.append(dot, heading, copy);
    return item;
  }));

  if (focus) active.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectCategory(tab.dataset.category));
  tab.addEventListener("keydown", (event) => {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectCategory(tabs[next].dataset.category, true);
  });
});

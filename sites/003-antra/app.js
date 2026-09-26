const copy = {
  input: {
    spotify: "展开 Spotify 歌单，获取其中曲目的标题、艺人等元数据。",
    youtube: "读取 YouTube Music 歌曲链接，提取曲目信息；可获得的信息取决于该链接。",
    apple: "展开 Apple Music 专辑，取得曲目、艺人及专辑信息。"
  },
  format: {
    auto: {
      source: "按配置与质量偏好查询可用适配器，结果可能来自链接所属平台之外。",
      output: "检查文件，必要时转换格式；写入标签、封面和歌词，再放入本地曲库。",
      summary: "自动模式优先选择可用的较高质量来源；没有符合条件的结果时可能失败。"
    },
    flac: {
      source: "优先寻找能提供无损音频的适配器；没有合格来源时应让该曲目失败。",
      output: "校验实际文件与所选无损要求，再写入标签并归档；容器名本身不能证明音质。",
      summary: "FLAC 是目标格式和质量约束，不保证每首歌都有可用的真实无损音源。"
    },
    mp3: {
      source: "查找满足匹配要求的有损候选；必要时才使用可转换的其他来源。",
      output: "校验文件并生成所需 MP3，补充标签后放入曲库。转换不会提高原音频质量。",
      summary: "MP3 更便于兼容设备，但最终结果仍取决于实际音源和匹配质量。"
    }
  }
};

let selectedInput = "spotify";
let selectedFormat = "auto";

function update() {
  document.getElementById("step-input").textContent = copy.input[selectedInput];
  document.getElementById("step-source").textContent = copy.format[selectedFormat].source;
  document.getElementById("step-output").textContent = copy.format[selectedFormat].output;
  document.getElementById("summary").textContent = copy.format[selectedFormat].summary;
}

function select(group, attribute, value) {
  for (const button of group.querySelectorAll("button")) {
    const active = button.dataset[attribute] === value;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

const inputChoices = document.getElementById("input-choices");
inputChoices.addEventListener("click", event => {
  const button = event.target.closest("button[data-input]");
  if (!button || !inputChoices.contains(button)) return;
  selectedInput = button.dataset.input;
  select(inputChoices, "input", selectedInput);
  update();
});

const formatChoices = document.getElementById("format-choices");
formatChoices.addEventListener("click", event => {
  const button = event.target.closest("button[data-format]");
  if (!button || !formatChoices.contains(button)) return;
  selectedFormat = button.dataset.format;
  select(formatChoices, "format", selectedFormat);
  update();
});

const suggestions = {
  build: { name: "Old build folders", size: "2.40 GB", gb: 2.4, description: "Build files from past projects. Review them before deciding whether to remove them." },
  dependencies: { name: "Project dependencies", size: "1.20 GB", gb: 1.2, description: "Dependencies from older projects. Make sure you no longer need them before removing them." },
  installer: { name: "Older installer", size: "580 MB", gb: 0.58, description: "A downloaded installer that may be safe to remove after you finish using it." }
};

const dialog = document.getElementById("review-dialog");
const activityList = document.getElementById("activity-list");
const history = [];
let currentKey = null;
let saved = 85.43;

document.querySelectorAll("[data-review]").forEach(button => {
  button.addEventListener("click", () => {
    currentKey = button.dataset.review;
    const item = suggestions[currentKey];
    document.getElementById("review-title").textContent = item.name;
    document.getElementById("review-description").textContent = item.description;
    document.getElementById("review-size").textContent = item.size;
    dialog.returnValue = "cancel";
    dialog.showModal();
  });
});

dialog.addEventListener("close", () => {
  const choice = dialog.returnValue;
  if (!currentKey || !["keep", "remove"].includes(choice)) return;
  const item = suggestions[currentKey];
  const row = document.querySelector(`[data-item="${currentKey}"]`);
  row.classList.add("is-done");
  const button = row.querySelector("button");
  button.disabled = true;
  button.textContent = choice === "keep" ? "Kept" : "Marked";
  if (choice === "remove") {
    saved += item.gb;
    document.getElementById("saved-number").textContent = saved.toFixed(2);
    document.getElementById("chips-number").textContent = String(Math.round(saved * 10));
  }
  history.unshift(`${item.name}: ${choice === "keep" ? "kept" : "marked as removed"} in this illustrative demo.`);
  activityList.replaceChildren(...history.map(entry => {
    const li = document.createElement("li");
    li.textContent = entry;
    return li;
  }));
  currentKey = null;
});

const tabs = [...document.querySelectorAll('[role="tab"]')];
tabs.forEach(tab => tab.addEventListener("click", () => {
  tabs.forEach(other => other.setAttribute("aria-selected", String(other === tab)));
  document.getElementById("panel-find").hidden = tab.id !== "tab-find";
  document.getElementById("panel-activity").hidden = tab.id !== "tab-activity";
}));

tabs.forEach((tab, index) => tab.addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  const nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
}));

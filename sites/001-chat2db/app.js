// 教学模拟：所有问题、SQL 与结果都写在本文件中；没有数据库或模型连接。
const examples = {
  "beijing-total": {
    sql: "SELECT SUM(amount) AS total_amount\nFROM orders\nWHERE city = '北京';",
    result: { type: "number", value: "1,098", caption: "北京两笔示例订单：199 + 899。结果根据本页模拟数据预先计算。" }
  },
  "top-product": {
    sql: "SELECT product, SUM(amount) AS sales_amount\nFROM orders\nGROUP BY product\nORDER BY sales_amount DESC\nLIMIT 1;",
    result: { type: "number", value: "显示器 · 899", caption: "按示例订单金额汇总；键盘为 398，鼠标为 89。" }
  },
  "beijing-orders": {
    sql: "SELECT order_id, city, product, amount\nFROM orders\nWHERE city = '北京'\nORDER BY order_id;",
    result: { type: "table", columns: ["订单", "城市", "商品", "金额"], rows: [["1001", "北京", "键盘", "199"], ["1003", "北京", "显示器", "899"]] }
  }
};

const questions = [...document.querySelectorAll(".question-button")];
const sqlOutput = document.getElementById("sql-output");
const sqlLabel = document.getElementById("sql-label");
const status = document.getElementById("status");
const resultWrap = document.getElementById("result-wrap");
const resultOutput = document.getElementById("result-output");
const generateButton = document.getElementById("generate");
const runButton = document.getElementById("run");
let selected = "beijing-total";

function chooseQuestion(id) {
  if (!Object.hasOwn(examples, id)) return;
  selected = id;
  for (const button of questions) {
    const active = button.dataset.question === id;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  sqlOutput.textContent = "点击下方按钮，查看这个问题对应的示例 SQL。";
  sqlLabel.textContent = "等待起草";
  runButton.disabled = true;
  resultWrap.hidden = true;
  resultOutput.replaceChildren();
  status.textContent = "已切换问题。先让 AI 起草 SQL，再模拟运行。";
}

function generateSql() {
  sqlOutput.textContent = examples[selected].sql;
  sqlLabel.textContent = "模拟 AI 草稿 · 请先检查";
  runButton.disabled = false;
  resultWrap.hidden = true;
  resultOutput.replaceChildren();
  status.textContent = "SQL 草稿已展示。这是预写示例，不是实时模型生成。";
}

function showResult() {
  if (runButton.disabled) return;
  const result = examples[selected].result;
  resultOutput.replaceChildren();
  if (result.type === "number") {
    const value = document.createElement("p");
    value.className = "result-big";
    value.textContent = result.value;
    const caption = document.createElement("p");
    caption.className = "result-caption";
    caption.textContent = result.caption;
    resultOutput.append(value, caption);
  } else {
    const table = document.createElement("table");
    table.className = "result-table";
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const column of result.columns) {
      const th = document.createElement("th");
      th.textContent = column;
      headRow.append(th);
    }
    head.append(headRow);
    const body = document.createElement("tbody");
    for (const row of result.rows) {
      const tr = document.createElement("tr");
      for (const cell of row) {
        const td = document.createElement("td");
        td.textContent = cell;
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(head, body);
    resultOutput.append(table);
  }
  resultWrap.hidden = false;
  status.textContent = "已显示本页预设的模拟结果；没有执行真实 SQL。";
}

for (const button of questions) {
  button.addEventListener("click", () => chooseQuestion(button.dataset.question));
}
generateButton.addEventListener("click", generateSql);
runButton.addEventListener("click", showResult);

// 语义关联教学示例：两种状态都是预写内容，不调用 Chat2DB 或 AI。
const meaningResult = document.getElementById("meaning-result");
const meaningButtons = [...document.querySelectorAll(".meaning-button")];
const rawMeaning = meaningResult.innerHTML;
const definedMeaning = `
  <p class="meaning-state">当前：业务方补充了明确口径</p>
  <div class="meaning-definitions">
    <div><strong>有效订单</strong><span>status = 'paid'</span></div>
    <div><strong>订单金额</strong><span>pay_amount（实付金额）</span></div>
    <div><strong>按月统计</strong><span>paid_at（支付时间）</span></div>
  </div>
  <p>模型因此有依据生成类似下面的查询：</p>
  <pre class="meaning-sql"><code>SELECT SUM(pay_amount) AS valid_order_amount
FROM orders
WHERE status = 'paid'
  AND paid_at &gt;= '2026-08-01'
  AND paid_at &lt; '2026-09-01';</code></pre>
  <p class="meaning-conclusion">规则由人提供；模型负责把规则与真实字段组合成 SQL。此处是示意草稿，未运行查询。</p>
`;

for (const button of meaningButtons) {
  button.addEventListener("click", () => {
    const selectedMode = button.dataset.meaning;
    for (const item of meaningButtons) {
      const active = item.dataset.meaning === selectedMode;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    }
    meaningResult.innerHTML = selectedMode === "defined" ? definedMeaning : rawMeaning;
  });
}

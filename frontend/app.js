// พยากรณ์สภาพคล่อง — ตรรกะฝั่งหน้าเว็บ
// ทำหน้าที่แค่เรียก API, แสดงผล, และคำนวณ "เดือนที่เสี่ยงต่ำกว่าจุดต่ำสุด" ใหม่ทันทีเมื่อผู้ใช้ปรับค่า
// จุดต่ำสุดที่ยอมรับได้ (ไม่ต้องยิง API ซ้ำ เพราะ backend ส่งค่า mid/lower/upper ของทุกเดือนพยากรณ์มาให้ครบแล้ว)

const REQUIRED_FIELDS = [
  { key: "month", label: "เดือน (YYYY-MM)" },
  { key: "deposit_in", label: "เงินฝากเข้า (บาท)" },
  { key: "withdrawal_out", label: "เงินถอนออก (บาท)" },
  { key: "loan_disbursed", label: "เงินกู้เบิกจ่ายใหม่ (บาท)" },
  { key: "loan_repaid", label: "เงินกู้รับชำระคืน (บาท)" },
  { key: "cash_start", label: "เงินสด/เงินฝากธนาคารคงเหลือต้นเดือน (บาท)" },
];

const state = {
  file: null,
  columns: [],
  previewRows: [],
  suggestedMapping: {},
  forecastResult: null,
};

let balanceChart = null;

const $ = (id) => document.getElementById(id);

function fmtBaht(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(n) + " บาท";
}

function showStep(stepId) {
  ["step-upload", "step-mapping", "step-dashboard"].forEach((id) => {
    $(id).classList.toggle("hidden", id !== stepId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------------------------------------------------------------------
// ขั้นตอนที่ 1: อัปโหลดไฟล์
// ---------------------------------------------------------------------

$("fileInput").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) selectFile(f);
});

function selectFile(file) {
  state.file = file;
  $("fileStatus").textContent = `เลือกไฟล์แล้ว: ${file.name}`;
  $("btnGoMapping").disabled = false;
  $("uploadError").classList.add("hidden");
}

async function loadSampleFile(url, filename) {
  $("uploadError").classList.add("hidden");
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("โหลดไฟล์ตัวอย่างไม่สำเร็จ");
    const blob = await resp.blob();
    const file = new File([blob], filename, { type: "text/csv" });
    selectFile(file);
  } catch (err) {
    showUploadError(err.message);
  }
}

$("loadSample24").addEventListener("click", () => loadSampleFile("/samples/sample_24_months.csv", "sample_24_months.csv"));
$("loadSample6").addEventListener("click", () => loadSampleFile("/samples/sample_6_months.csv", "sample_6_months.csv"));

function showUploadError(msg) {
  $("uploadError").textContent = msg;
  $("uploadError").classList.remove("hidden");
}

$("btnGoMapping").addEventListener("click", async () => {
  if (!state.file) return;
  $("btnGoMapping").disabled = true;
  $("btnGoMapping").textContent = "กำลังอ่านไฟล์...";
  try {
    const fd = new FormData();
    fd.append("file", state.file);
    const resp = await fetch("/api/preview", { method: "POST", body: fd });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || "อ่านไฟล์ไม่สำเร็จ");

    state.columns = data.columns;
    state.previewRows = data.preview_rows;
    state.suggestedMapping = data.suggested_mapping;
    $("mapNRows").textContent = data.n_rows;

    buildMappingUI();
    buildPreviewTable();
    showStep("step-mapping");
  } catch (err) {
    showUploadError(err.message);
  } finally {
    $("btnGoMapping").disabled = false;
    $("btnGoMapping").textContent = "ถัดไป: จับคู่คอลัมน์ →";
  }
});

// ---------------------------------------------------------------------
// ขั้นตอนที่ 2: จับคู่คอลัมน์
// ---------------------------------------------------------------------

function buildMappingUI() {
  const container = $("mappingFields");
  container.innerHTML = "";
  REQUIRED_FIELDS.forEach((field) => {
    const wrap = document.createElement("div");
    wrap.className = "mapping-field";
    const label = document.createElement("label");
    label.textContent = field.label;
    label.htmlFor = `map_${field.key}`;
    const select = document.createElement("select");
    select.id = `map_${field.key}`;

    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "-- เลือกคอลัมน์ --";
    select.appendChild(emptyOpt);

    state.columns.forEach((col) => {
      const opt = document.createElement("option");
      opt.value = col;
      opt.textContent = col;
      if (state.suggestedMapping[field.key] === col) opt.selected = true;
      select.appendChild(opt);
    });

    wrap.appendChild(label);
    wrap.appendChild(select);
    container.appendChild(wrap);
  });
}

function buildPreviewTable() {
  const table = $("previewTable");
  table.innerHTML = "";
  if (!state.columns.length) return;
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  state.columns.forEach((c) => {
    const th = document.createElement("th");
    th.textContent = c;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  state.previewRows.forEach((row) => {
    const tr = document.createElement("tr");
    state.columns.forEach((c) => {
      const td = document.createElement("td");
      td.textContent = row[c] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

function collectMapping() {
  const mapping = {};
  REQUIRED_FIELDS.forEach((field) => {
    mapping[field.key] = $(`map_${field.key}`).value || null;
  });
  return mapping;
}

$("btnBackToUpload").addEventListener("click", () => showStep("step-upload"));

$("btnRunForecast").addEventListener("click", async () => {
  $("mappingError").classList.add("hidden");
  const mapping = collectMapping();
  const missing = REQUIRED_FIELDS.filter((f) => !mapping[f.key]);
  if (missing.length) {
    $("mappingError").textContent =
      "กรุณาจับคู่คอลัมน์ให้ครบ: " + missing.map((f) => f.label).join(", ");
    $("mappingError").classList.remove("hidden");
    return;
  }

  $("btnRunForecast").disabled = true;
  $("btnRunForecast").textContent = "กำลังพยากรณ์...";
  try {
    const threshold = parseFloat($("thresholdInput").value) || 0;
    const fd = new FormData();
    fd.append("file", state.file);
    fd.append("mapping", JSON.stringify(mapping));
    fd.append("horizon", "6");
    fd.append("min_cash_threshold", String(threshold));

    const resp = await fetch("/api/forecast", { method: "POST", body: fd });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || "พยากรณ์ไม่สำเร็จ");

    state.forecastResult = data;
    $("thresholdInputDash").value = threshold;
    renderDashboard();
    showStep("step-dashboard");
  } catch (err) {
    $("mappingError").textContent = err.message;
    $("mappingError").classList.remove("hidden");
  } finally {
    $("btnRunForecast").disabled = false;
    $("btnRunForecast").textContent = "พยากรณ์สภาพคล่อง →";
  }
});

// ---------------------------------------------------------------------
// ขั้นตอนที่ 3: แดชบอร์ด
// ---------------------------------------------------------------------

function renderDashboard() {
  const data = state.forecastResult;

  renderWarnings(data);
  renderSummaryCards(data, currentThreshold());
  renderChart(data, currentThreshold());
  renderBacktestTable(data);

  $("selectionReason").textContent = data.selection_reason;
}

function currentThreshold() {
  return parseFloat($("thresholdInputDash").value) || 0;
}

function renderWarnings(data) {
  const banner = $("warningsBanner");
  if (!data.warnings || data.warnings.length === 0) {
    banner.classList.add("hidden");
    banner.innerHTML = "";
    return;
  }
  banner.classList.remove("hidden");
  banner.innerHTML =
    "⚠️ คำเตือนความแม่นยำของการพยากรณ์" +
    "<ul>" +
    data.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("") +
    "</ul>";
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function riskMonths(data, threshold) {
  return data.forecast.filter((row) => row.balance_lower < threshold);
}

function renderSummaryCards(data, threshold) {
  $("cardNextMonth").textContent = fmtBaht(data.next_month_net_flow);
  $("cardNextMonth").className = "summary-value " + (data.next_month_net_flow < 0 ? "danger" : "ok");

  $("cardLastBalance").textContent = fmtBaht(data.last_actual_balance);

  const risks = riskMonths(data, threshold);
  const riskCard = $("cardRiskMonths");
  if (risks.length === 0) {
    riskCard.textContent = "ไม่พบความเสี่ยง";
    riskCard.className = "summary-value ok";
  } else {
    riskCard.textContent = risks.map((r) => r.month).join(", ");
    riskCard.className = "summary-value danger";
  }

  $("cardMethod").textContent = data.chosen_method_label;
}

function renderChart(data, threshold) {
  const historicalLabels = data.historical.map((r) => r.month);
  const forecastLabels = data.forecast.map((r) => r.month);
  const allLabels = [...historicalLabels, ...forecastLabels];

  const historicalValues = data.historical.map((r) => r.actual_end_balance);
  const nHist = historicalValues.length;

  // เชื่อมเส้นพยากรณ์ต่อจากจุดสุดท้ายของข้อมูลจริง ให้กราฟต่อเนื่องไม่ขาดช่วง
  const forecastMid = new Array(nHist - 1).fill(null).concat([historicalValues[nHist - 1]], data.forecast.map((r) => r.balance_mid));
  const forecastLower = new Array(nHist - 1).fill(null).concat([historicalValues[nHist - 1]], data.forecast.map((r) => r.balance_lower));
  const forecastUpper = new Array(nHist - 1).fill(null).concat([historicalValues[nHist - 1]], data.forecast.map((r) => r.balance_upper));
  const historicalPadded = historicalValues.concat(new Array(forecastLabels.length).fill(null));
  const thresholdLine = new Array(allLabels.length).fill(threshold);

  const ctx = $("balanceChart").getContext("2d");
  if (balanceChart) balanceChart.destroy();

  balanceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: allLabels,
      datasets: [
        {
          label: "ช่วงความไม่แน่นอน (สูง)",
          data: forecastUpper,
          borderColor: "transparent",
          backgroundColor: "rgba(15, 118, 110, 0.12)",
          fill: "+1",
          pointRadius: 0,
          tension: 0.15,
        },
        {
          label: "ช่วงความไม่แน่นอน (ต่ำ)",
          data: forecastLower,
          borderColor: "transparent",
          backgroundColor: "rgba(15, 118, 110, 0.12)",
          fill: false,
          pointRadius: 0,
          tension: 0.15,
        },
        {
          label: "พยากรณ์ (ค่ากลาง)",
          data: forecastMid,
          borderColor: "#0f766e",
          borderDash: [6, 4],
          backgroundColor: "transparent",
          pointRadius: 2,
          tension: 0.15,
        },
        {
          label: "เงินสดคงเหลือจริง",
          data: historicalPadded,
          borderColor: "#1f2937",
          backgroundColor: "transparent",
          pointRadius: 2,
          tension: 0.15,
        },
        {
          label: "จุดต่ำสุดที่ยอมรับได้",
          data: thresholdLine,
          borderColor: "#b91c1c",
          borderDash: [3, 3],
          backgroundColor: "transparent",
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${fmtBaht(item.raw)}`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (v) => new Intl.NumberFormat("th-TH", { notation: "compact" }).format(v),
          },
        },
      },
    },
  });
}

function renderBacktestTable(data) {
  const table = $("backtestTable");
  table.innerHTML = "";
  const thead = document.createElement("thead");
  thead.innerHTML =
    "<tr><th>วิธีพยากรณ์</th><th>MAPE (%)</th><th>MAE (บาท)</th><th>จำนวนจุดทดสอบ</th><th>หมายเหตุ</th></tr>";
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  data.backtest_table.forEach((row) => {
    const tr = document.createElement("tr");
    if (row.is_selected) tr.classList.add("selected-method");
    if (!row.usable) tr.classList.add("unusable-method");
    tr.innerHTML = `
      <td style="text-align:left">${escapeHtml(row.method_label)}${row.is_selected ? " ✅ เลือกใช้" : ""}</td>
      <td>${row.mape !== null ? row.mape.toFixed(1) + "%" : "-"}</td>
      <td>${row.mae !== null ? fmtBaht(row.mae) : "-"}</td>
      <td>${row.n_points}</td>
      <td style="text-align:left">${escapeHtml(row.reason || "")}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

$("thresholdInputDash").addEventListener("input", () => {
  if (!state.forecastResult) return;
  const threshold = currentThreshold();
  renderSummaryCards(state.forecastResult, threshold);
  renderChart(state.forecastResult, threshold);
});

$("btnStartOver").addEventListener("click", () => {
  state.file = null;
  state.forecastResult = null;
  $("fileInput").value = "";
  $("fileStatus").textContent = "ยังไม่ได้เลือกไฟล์";
  $("btnGoMapping").disabled = true;
  showStep("step-upload");
});

const storageKeys = {
  referralCode: "amb_dash_ref_code",
};

const sessionKey = "ambassador_token";
let apiBase = "";

const elements = {
  loginSection: document.getElementById("loginSection"),
  dashboardSection: document.getElementById("dashboardSection"),
  logoutBtn: document.getElementById("logoutBtn"),
  loginForm: document.getElementById("loginForm"),
  refreshBtn: document.getElementById("refreshBtn"),
  referralCode: document.getElementById("referralCode"),
  password: document.getElementById("password"),
  activityChart: document.getElementById("activityChart"),
  activityHint: document.getElementById("activityHint"),
  statusText: document.getElementById("statusText"),
  statReferral: document.getElementById("statReferral"),
  statTotal: document.getElementById("statTotal"),
  statLast7: document.getElementById("statLast7"),
  statPrev7: document.getElementById("statPrev7"),
};

function setStatus(text) {
  elements.statusText.textContent = text;
}

function saveSettings() {
  localStorage.setItem(storageKeys.referralCode, elements.referralCode.value.trim());
}

function loadSettings() {
  elements.referralCode.value = localStorage.getItem(storageKeys.referralCode) || "";
}

function getApiBase() {
  return apiBase.trim().replace(/\/$/, "");
}

function getToken() {
  return sessionStorage.getItem(sessionKey) || "";
}

function setToken(token) {
  sessionStorage.setItem(sessionKey, token);
}

function clearToken() {
  sessionStorage.removeItem(sessionKey);
}

async function loadEnv() {
  try {
    const response = await fetch("./.env", { cache: "no-store" });
    if (!response.ok) return;

    const text = await response.text();
    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separator = line.indexOf("=");
      if (separator <= 0) continue;

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^['\"]|['\"]$/g, "");

      if (key === "AMBASSADOR_DASHBOARD_API_BASE") {
        apiBase = value;
      }
    }
  } catch {
    // no-op
  }

  if (!apiBase) {
    apiBase = "http://localhost:8000";
  }
}

async function apiRequest(path, options = {}, withAuth = false) {
  const apiBase = getApiBase();
  if (!apiBase) throw new Error("Backend API URL obbligatorio");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (withAuth) {
    const token = getToken();
    if (!token) throw new Error("Sessione scaduta, fai login");
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Errore ${response.status}`;
    try {
      const data = await response.json();
      if (data.detail) message = data.detail;
    } catch {
      // no-op
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

function showDashboard(authenticated) {
  elements.loginSection.classList.toggle("hidden", authenticated);
  elements.dashboardSection.classList.toggle("hidden", !authenticated);
  elements.logoutBtn.classList.toggle("hidden", !authenticated);
}

function renderStats(stats) {
  elements.statReferral.textContent = stats.referral_code || "-";
  elements.statTotal.textContent = stats.total_clicks ?? 0;
  elements.statLast7.textContent = stats.clicks_last_7d ?? 0;
  elements.statPrev7.textContent = stats.clicks_prev_7d ?? 0;
}

function fillMissingDays(series, days) {
  const map = new Map(series.map((item) => [new Date(item.day).toISOString().slice(0, 10), item.clicks]));
  const now = new Date();
  const output = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(now.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    output.push({ day: key, clicks: map.get(key) || 0 });
  }

  return output;
}

function drawActivityChart(series) {
  const canvas = elements.activityChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth;
  const height = canvas.height;

  canvas.width = width;
  ctx.clearRect(0, 0, width, height);

  if (!series.length) {
    elements.activityHint.textContent = "Nessun dato disponibile";
    return;
  }

  const values = series.map((item) => item.clicks);
  const maxValue = Math.max(1, ...values);

  const padding = { top: 20, right: 20, bottom: 30, left: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  ctx.strokeStyle = "#1f6feb";
  ctx.lineWidth = 2;
  ctx.beginPath();

  series.forEach((item, index) => {
    const x = padding.left + (index / Math.max(1, series.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - (item.clicks / maxValue) * chartHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  const last = series[series.length - 1];
  const total = series.reduce((sum, item) => sum + item.clicks, 0);
  elements.activityHint.textContent = `Ultimo giorno: ${last.clicks} click • Totale periodo: ${total}`;
}

async function loadDashboardData() {
  setStatus("Caricamento dati...");
  try {
    const stats = await apiRequest("/api/ambassador/me/stats", {}, true);
    renderStats(stats);

    try {
      const activity = await apiRequest("/api/ambassador/me/activity?days=30", {}, true);
      const series = fillMissingDays(activity.series || [], activity.days || 30);
      drawActivityChart(series);
    } catch {
      drawActivityChart([]);
      elements.activityHint.textContent = "Grafico temporaneamente non disponibile";
    }

    setStatus(`Aggiornato alle ${new Date().toLocaleTimeString("it-IT")}`);
  } catch (error) {
    if (String(error.message).includes("401") || String(error.message).includes("Sessione")) {
      clearToken();
      showDashboard(false);
    }
    setStatus(error.message);
  }
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveSettings();
  setStatus("Login in corso...");

  try {
    const data = await apiRequest("/api/ambassador/login", {
      method: "POST",
      body: JSON.stringify({
        referral_code: elements.referralCode.value.trim(),
        password: elements.password.value,
      }),
    });

    setToken(data.access_token);
    elements.password.value = "";
    showDashboard(true);
    await loadDashboardData();
  } catch (error) {
    setStatus(error.message);
  }
});

elements.refreshBtn.addEventListener("click", async () => {
  await loadDashboardData();
});

elements.logoutBtn.addEventListener("click", () => {
  clearToken();
  showDashboard(false);
  setStatus("Logout eseguito");
});

async function bootstrap() {
  await loadEnv();
  loadSettings();

  if (getToken()) {
    showDashboard(true);
    await loadDashboardData();
  } else {
    showDashboard(false);
    setStatus("Inserisci le credenziali per accedere");
  }
}

bootstrap();

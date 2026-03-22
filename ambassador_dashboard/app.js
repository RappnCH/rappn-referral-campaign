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
  clicksTable: document.getElementById("clicksTable"),
  statusText: document.getElementById("statusText"),
  statReferral: document.getElementById("statReferral"),
  statTotal: document.getElementById("statTotal"),
  statSwiss: document.getElementById("statSwiss"),
  statRatio: document.getElementById("statRatio"),
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
  elements.statSwiss.textContent = stats.swiss_clicks ?? 0;
  elements.statRatio.textContent = `${Math.round((stats.swiss_ratio ?? 0) * 100)}%`;
}

function renderClicks(clicks) {
  elements.clicksTable.innerHTML = "";

  for (const click of clicks) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(click.clicked_at).toLocaleString("it-IT")}</td>
      <td>${click.ip_masked || "-"}</td>
      <td>${click.is_swiss ? "Sì" : "No"}</td>
      <td>${click.user_agent || "-"}</td>
    `;
    elements.clicksTable.appendChild(tr);
  }

  if (!clicks.length) {
    elements.clicksTable.innerHTML = `<tr><td colspan="4">Nessun click registrato.</td></tr>`;
  }
}

async function loadDashboardData() {
  setStatus("Caricamento dati...");
  try {
    const [stats, clicks] = await Promise.all([
      apiRequest("/api/ambassador/me/stats", {}, true),
      apiRequest("/api/ambassador/me/clicks?limit=200", {}, true),
    ]);
    renderStats(stats);
    renderClicks(clicks);
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

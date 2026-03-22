const storageKeys = {
  apiBase: "ref_dashboard_api_base",
  adminToken: "ref_dashboard_admin_token",
};

const elements = {
  apiBase: document.getElementById("apiBase"),
  adminToken: document.getElementById("adminToken"),
  refreshBtn: document.getElementById("refreshBtn"),
  createForm: document.getElementById("createForm"),
  newCode: document.getElementById("newCode"),
  newName: document.getElementById("newName"),
  statusText: document.getElementById("statusText"),
  totalAmbassadors: document.getElementById("totalAmbassadors"),
  totalClicks: document.getElementById("totalClicks"),
  swissClicks: document.getElementById("swissClicks"),
  swissRatio: document.getElementById("swissRatio"),
  ambassadorsTable: document.getElementById("ambassadorsTable"),
};

async function loadEnvFile() {
  try {
    const response = await fetch("./.env", { cache: "no-store" });
    if (!response.ok) {
      return {};
    }

    const text = await response.text();
    const env = {};

    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) continue;

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim().replace(/^['\"]|['\"]$/g, "");
      env[key] = value;
    }

    return env;
  } catch {
    return {};
  }
}

function getApiBase() {
  return elements.apiBase.value.trim().replace(/\/$/, "");
}

function getHeaders() {
  const token = elements.adminToken.value.trim();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["x-admin-token"] = token;
  }
  return headers;
}

function setStatus(text) {
  elements.statusText.textContent = text;
}

async function apiRequest(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("Inserisci Backend URL");
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
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

function renderStats(stats) {
  elements.totalAmbassadors.textContent = stats.total_ambassadors ?? 0;
  elements.totalClicks.textContent = stats.total_clicks ?? 0;
  elements.swissClicks.textContent = stats.swiss_clicks ?? 0;
  elements.swissRatio.textContent = `${Math.round((stats.swiss_ratio ?? 0) * 100)}%`;
}

function buildReferralLink(code) {
  return `${getApiBase()}/ref/${code}`;
}

function renderAmbassadors(items) {
  elements.ambassadorsTable.innerHTML = "";
  for (const row of items) {
    const tr = document.createElement("tr");
    const referralLink = buildReferralLink(row.referral_code);

    tr.innerHTML = `
      <td>${row.referral_code}</td>
      <td>${row.name ?? "-"}</td>
      <td>${row.total_clicks ?? 0}</td>
      <td>${row.swiss_clicks ?? 0}</td>
      <td><a href="${referralLink}" target="_blank" rel="noreferrer">Apri</a></td>
      <td>
        <div class="actions">
          <button data-copy="${referralLink}">Copia</button>
          <button class="danger" data-delete="${row.referral_code}">Elimina</button>
        </div>
      </td>
    `;

    elements.ambassadorsTable.appendChild(tr);
  }

  if (!items.length) {
    elements.ambassadorsTable.innerHTML = `<tr><td colspan="6">Nessun referral creato.</td></tr>`;
  }
}

async function loadDashboard() {
  setStatus("Caricamento...");
  try {
    const [stats, ambassadors] = await Promise.all([
      apiRequest("/api/stats"),
      apiRequest("/api/ambassadors"),
    ]);

    renderStats(stats);
    renderAmbassadors(ambassadors);
    setStatus(`Ultimo aggiornamento: ${new Date().toLocaleTimeString("it-IT")}`);
  } catch (error) {
    setStatus(error.message);
  }
}

function persistSettings() {
  localStorage.setItem(storageKeys.apiBase, elements.apiBase.value.trim());
  localStorage.setItem(storageKeys.adminToken, elements.adminToken.value.trim());
}

function loadSettings() {
  elements.apiBase.value = localStorage.getItem(storageKeys.apiBase) || elements.apiBase.value || "http://localhost:8000";
  elements.adminToken.value = localStorage.getItem(storageKeys.adminToken) || elements.adminToken.value || "";
}

elements.refreshBtn.addEventListener("click", async () => {
  persistSettings();
  await loadDashboard();
});

elements.apiBase.addEventListener("change", persistSettings);

elements.adminToken.addEventListener("change", persistSettings);

elements.createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  persistSettings();

  const referral_code = elements.newCode.value.trim();
  const name = elements.newName.value.trim();

  if (!referral_code) return;

  setStatus("Creazione referral...");
  try {
    await apiRequest("/api/ambassadors", {
      method: "POST",
      body: JSON.stringify({ referral_code, name: name || null }),
    });

    elements.newCode.value = "";
    elements.newName.value = "";
    await loadDashboard();
  } catch (error) {
    setStatus(error.message);
  }
});

elements.ambassadorsTable.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.dataset.copy) {
    await navigator.clipboard.writeText(target.dataset.copy);
    setStatus("Link copiato");
    return;
  }

  if (target.dataset.delete) {
    const code = target.dataset.delete;
    const confirmed = window.confirm(`Eliminare il referral ${code}?`);
    if (!confirmed) return;

    setStatus("Eliminazione...");
    try {
      await apiRequest(`/api/ambassadors/${encodeURIComponent(code)}`, {
        method: "DELETE",
      });
      await loadDashboard();
    } catch (error) {
      setStatus(error.message);
    }
  }
});

async function bootstrap() {
  const env = await loadEnvFile();

  if (env.DASHBOARD_API_BASE) {
    elements.apiBase.value = env.DASHBOARD_API_BASE;
  }

  if (env.DASHBOARD_ADMIN_TOKEN) {
    elements.adminToken.value = env.DASHBOARD_ADMIN_TOKEN;
  }

  loadSettings();
  loadDashboard();
}

bootstrap();

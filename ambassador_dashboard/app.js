const storageKeys = {
  referralCode: "amb_dash_ref_code",
  language: "amb_dash_language",
};

const sessionKey = "ambassador_token";
let apiBase = "";
const defaultLanguage = "en";
const supportedLanguages = ["en", "it", "fr", "de"];
const localeByLanguage = {
  en: "en-US",
  it: "it-IT",
  fr: "fr-FR",
  de: "de-DE",
};
let currentLanguage = defaultLanguage;

const elements = {
  loginSection: document.getElementById("loginSection"),
  dashboardSection: document.getElementById("dashboardSection"),
  logoutBtn: document.getElementById("logoutBtn"),
  languageSelect: document.getElementById("languageSelect"),
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
  statSwiss: document.getElementById("statSwiss"),
  statOther: document.getElementById("statOther"),
  statEarnings: document.getElementById("statEarnings"),
};

const translations = {
  en: {
    "header.title": "Rappn Ambassador Dashboard",
    "header.subtitle": "Restricted access with credentials",
    "header.languageLabel": "Language",
    "login.title": "Login",
    "login.referralCodeLabel": "Referral code",
    "login.referralCodePlaceholder": "e.g. test01",
    "login.passwordLabel": "Password",
    "actions.login": "Sign in",
    "actions.logout": "Logout",
    "actions.refresh": "Refresh",
    "stats.referral": "Referral",
    "stats.totalPeople": "Total People",
    "stats.last7Days": "Last 7 days",
    "stats.previousWeek": "Previous week",
    "stats.swissClicks": "Swiss Clicks",
    "stats.otherCountries": "Other Countries",
    "stats.earnings": "Earnings (Swiss clicks)",
    "activity.title": "Valid vs total clicks (last 30 days)",
    "errors.apiBaseRequired": "Backend API URL is required",
    "errors.sessionExpired": "Session expired, please log in again",
    "messages.noDataAvailable": "No data available",
    "messages.chartUnavailable": "Chart temporarily unavailable",
    "messages.loadingData": "Loading data...",
    "messages.updatedAt": "Updated at {time}",
    "messages.loginInProgress": "Signing in...",
    "messages.loggedOut": "Logged out",
    "messages.enterCredentials": "Enter your credentials to access",
    "messages.validVsTotal": "Valid period clicks: {validTotal} • Total period clicks: {total}",
  },
  it: {
    "header.title": "Dashboard Ambassador Rappn",
    "header.subtitle": "Accesso riservato con credenziali",
    "header.languageLabel": "Lingua",
    "login.title": "Accesso",
    "login.referralCodeLabel": "Codice referral",
    "login.referralCodePlaceholder": "es. test01",
    "login.passwordLabel": "Password",
    "actions.login": "Entra",
    "actions.logout": "Logout",
    "actions.refresh": "Aggiorna",
    "stats.referral": "Referral",
    "stats.totalPeople": "Persone Totali",
    "stats.last7Days": "Ultimi 7 giorni",
    "stats.previousWeek": "Settimana precedente",
    "stats.swissClicks": "Click Svizzeri",
    "stats.otherCountries": "Altri Paesi",
    "stats.earnings": "Guadagno (click CH)",
    "activity.title": "Click validi vs totali (ultimi 30 giorni)",
    "errors.apiBaseRequired": "URL API backend obbligatorio",
    "errors.sessionExpired": "Sessione scaduta, fai login",
    "messages.noDataAvailable": "Nessun dato disponibile",
    "messages.chartUnavailable": "Grafico temporaneamente non disponibile",
    "messages.loadingData": "Caricamento dati...",
    "messages.updatedAt": "Aggiornato alle {time}",
    "messages.loginInProgress": "Login in corso...",
    "messages.loggedOut": "Logout eseguito",
    "messages.enterCredentials": "Inserisci le credenziali per accedere",
    "messages.validVsTotal": "Click validi periodo: {validTotal} • Click totali periodo: {total}",
  },
  fr: {
    "header.title": "Tableau de bord ambassadeur Rappn",
    "header.subtitle": "Accès restreint avec identifiants",
    "header.languageLabel": "Langue",
    "login.title": "Connexion",
    "login.referralCodeLabel": "Code de parrainage",
    "login.referralCodePlaceholder": "ex. test01",
    "login.passwordLabel": "Mot de passe",
    "actions.login": "Se connecter",
    "actions.logout": "Déconnexion",
    "actions.refresh": "Actualiser",
    "stats.referral": "Parrainage",
    "stats.totalPeople": "Personnes totales",
    "stats.last7Days": "7 derniers jours",
    "stats.previousWeek": "Semaine précédente",
    "stats.swissClicks": "Clics suisses",
    "stats.otherCountries": "Autres pays",
    "stats.earnings": "Gain (clics CH)",
    "activity.title": "Clics valides vs totaux (30 derniers jours)",
    "errors.apiBaseRequired": "URL API backend requise",
    "errors.sessionExpired": "Session expirée, reconnectez-vous",
    "messages.noDataAvailable": "Aucune donnée disponible",
    "messages.chartUnavailable": "Graphique temporairement indisponible",
    "messages.loadingData": "Chargement des données...",
    "messages.updatedAt": "Mis à jour à {time}",
    "messages.loginInProgress": "Connexion en cours...",
    "messages.loggedOut": "Déconnecté",
    "messages.enterCredentials": "Saisissez vos identifiants pour accéder",
    "messages.validVsTotal": "Clics valides période : {validTotal} • Clics totaux période : {total}",
  },
  de: {
    "header.title": "Rappn Ambassador-Dashboard",
    "header.subtitle": "Geschützter Zugang mit Anmeldedaten",
    "header.languageLabel": "Sprache",
    "login.title": "Anmeldung",
    "login.referralCodeLabel": "Referral-Code",
    "login.referralCodePlaceholder": "z. B. test01",
    "login.passwordLabel": "Passwort",
    "actions.login": "Einloggen",
    "actions.logout": "Abmelden",
    "actions.refresh": "Aktualisieren",
    "stats.referral": "Referral",
    "stats.totalPeople": "Gesamtpersonen",
    "stats.last7Days": "Letzte 7 Tage",
    "stats.previousWeek": "Vorherige Woche",
    "stats.swissClicks": "Schweizer Klicks",
    "stats.otherCountries": "Andere Länder",
    "stats.earnings": "Verdienst (CH-Klicks)",
    "activity.title": "Gültige vs. gesamte Klicks (letzte 30 Tage)",
    "errors.apiBaseRequired": "Backend-API-URL erforderlich",
    "errors.sessionExpired": "Sitzung abgelaufen, bitte erneut einloggen",
    "messages.noDataAvailable": "Keine Daten verfügbar",
    "messages.chartUnavailable": "Diagramm vorübergehend nicht verfügbar",
    "messages.loadingData": "Daten werden geladen...",
    "messages.updatedAt": "Aktualisiert um {time}",
    "messages.loginInProgress": "Anmeldung läuft...",
    "messages.loggedOut": "Abgemeldet",
    "messages.enterCredentials": "Geben Sie Ihre Zugangsdaten ein",
    "messages.validVsTotal": "Gültige Klicks Zeitraum: {validTotal} • Gesamtklicks Zeitraum: {total}",
  },
};

function t(key, vars = {}) {
  const template = translations[currentLanguage]?.[key] ?? translations[defaultLanguage]?.[key] ?? key;
  return Object.entries(vars).reduce((output, [name, value]) => output.replaceAll(`{${name}}`, String(value)), template);
}

function getLanguage() {
  const stored = localStorage.getItem(storageKeys.language);
  return supportedLanguages.includes(stored) ? stored : defaultLanguage;
}

function setLanguage(language) {
  currentLanguage = supportedLanguages.includes(language) ? language : defaultLanguage;
  localStorage.setItem(storageKeys.language, currentLanguage);
  document.documentElement.lang = currentLanguage;
  if (elements.languageSelect) elements.languageSelect.value = currentLanguage;
  applyTranslations();
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    node.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    node.placeholder = t(key);
  });
}

function getLocale() {
  return localeByLanguage[currentLanguage] || localeByLanguage[defaultLanguage];
}

function getZurichTimeString() {
  return new Intl.DateTimeFormat(getLocale(), {
    timeZone: "Europe/Zurich",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function formatCurrencyCHF(amount) {
  const value = Number(amount || 0);
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

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
  if (!apiBase) throw new Error(t("errors.apiBaseRequired"));

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (withAuth) {
    const token = getToken();
    if (!token) throw new Error(t("errors.sessionExpired"));
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
  const totalClicks = stats.total_clicks ?? 0;
  const swissClicks = stats.swiss_clicks ?? 0;
  const otherCountriesClicks = Math.max(0, totalClicks - swissClicks);
  const estimatedEarnings = stats.estimated_earnings_chf ?? (swissClicks * (stats.payout_per_swiss_click ?? 0));

  elements.statTotal.textContent = totalClicks;
  elements.statLast7.textContent = stats.clicks_last_7d ?? 0;
  elements.statPrev7.textContent = stats.clicks_prev_7d ?? 0;
  elements.statSwiss.textContent = swissClicks;
  elements.statOther.textContent = otherCountriesClicks;
  elements.statEarnings.textContent = formatCurrencyCHF(estimatedEarnings);
}

function normalizeActivitySeries(series) {
  return (series || []).map((item) => ({
    day: String(item.day || ""),
    clicks: Number(item.clicks || 0),
    swiss_clicks: Number(item.swiss_clicks || 0),
  }));
}

function drawActivityChart(series) {
  const canvas = elements.activityChart;
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth;
  const height = canvas.height;

  canvas.width = width;
  ctx.clearRect(0, 0, width, height);

  if (!series.length) {
    elements.activityHint.textContent = t("messages.noDataAvailable");
    return;
  }

  const totals = series.map((item) => item.clicks || 0);
  const valids = series.map((item) => item.swiss_clicks || 0);
  const maxValue = Math.max(1, ...totals, ...valids);
  const padding = { top: 20, right: 16, bottom: 42, left: 34 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.strokeStyle = "#d3e8df";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  const count = series.length;
  const slot = chartWidth / Math.max(1, count);
  const groupWidth = Math.max(4, Math.min(22, slot * 0.7));
  const barWidth = Math.max(2, groupWidth / 2 - 1);

  series.forEach((item, index) => {
    const xCenter = padding.left + slot * index + slot / 2;

    const totalValue = item.clicks || 0;
    const validValue = item.swiss_clicks || 0;

    const totalHeight = (totalValue / maxValue) * chartHeight;
    const validHeight = (validValue / maxValue) * chartHeight;

    ctx.fillStyle = "#10a5a7";
    ctx.fillRect(xCenter - barWidth - 1, padding.top + chartHeight - totalHeight, barWidth, totalHeight);

    ctx.fillStyle = "#37ad3e";
    ctx.fillRect(xCenter + 1, padding.top + chartHeight - validHeight, barWidth, validHeight);

    const day = String(item.day).slice(-2).replace(/^0/, "") || "0";
    const shouldLabel = count <= 12 || index % 5 === 0 || index === count - 1;
    if (shouldLabel) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(day, xCenter, padding.top + chartHeight + 14);
    }
  });

  ctx.fillStyle = "#10a5a7";
  ctx.fillRect(padding.left, padding.top, 10, 10);
  ctx.fillStyle = "#111827";
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Tot", padding.left + 14, padding.top + 9);

  ctx.fillStyle = "#37ad3e";
  ctx.fillRect(padding.left + 46, padding.top, 10, 10);
  ctx.fillStyle = "#111827";
  ctx.fillText("Valid", padding.left + 60, padding.top + 9);

  const totalPeriodClicks = totals.reduce((sum, value) => sum + value, 0);
  const validPeriodClicks = valids.reduce((sum, value) => sum + value, 0);
  elements.activityHint.textContent = t("messages.validVsTotal", {
    validTotal: validPeriodClicks,
    total: totalPeriodClicks,
  });
}

async function loadDashboardData() {
  setStatus(t("messages.loadingData"));
  try {
    const stats = await apiRequest("/api/ambassador/me/stats", {}, true);
    renderStats(stats);

    try {
      const activity = await apiRequest("/api/ambassador/me/activity?days=30", {}, true);
      const series = normalizeActivitySeries(activity.series || []);
      drawActivityChart(series);
    } catch {
      drawActivityChart([]);
      elements.activityHint.textContent = t("messages.chartUnavailable");
    }

    setStatus(t("messages.updatedAt", { time: getZurichTimeString() }));
  } catch (error) {
    if (String(error.message).includes("401") || String(error.message).includes(t("errors.sessionExpired"))) {
      clearToken();
      showDashboard(false);
    }
    setStatus(error.message);
  }
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveSettings();
  setStatus(t("messages.loginInProgress"));

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
  setStatus(t("messages.loggedOut"));
});

elements.languageSelect.addEventListener("change", async (event) => {
  setLanguage(event.target.value);

  if (!elements.dashboardSection.classList.contains("hidden") && getToken()) {
    await loadDashboardData();
  }
});

async function bootstrap() {
  await loadEnv();
  setLanguage(getLanguage());
  loadSettings();

  if (getToken()) {
    showDashboard(true);
    await loadDashboardData();
  } else {
    showDashboard(false);
    setStatus(t("messages.enterCredentials"));
  }
}

bootstrap();

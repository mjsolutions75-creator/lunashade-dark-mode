/**
 * LunaShade — Popup controller
 *
 * Reads and writes the single `lunashade_settings` object in chrome.storage.sync.
 * Background and content scripts react to that change automatically, so we
 * never need to message tabs directly from here.
 */

const STORAGE_KEY = "lunashade_settings";
const DEFAULTS = Object.freeze({
  enabled: true,
  globalMode: true,
  brightness: 100,
  contrast: 100,
  exclusions: [],
  allowlist: [],
});

const $ = (id) => document.getElementById(id);

const els = {
  siteLabel: $("site-label"),
  toggleEnabled: $("toggle-enabled"),
  toggleGlobal: $("toggle-global"),
  siteActionLabel: $("site-action-label"),
  siteActionHint: $("site-action-hint"),
  siteActionBtn: $("site-action-btn"),
  brightness: $("brightness"),
  contrast: $("contrast"),
  brightnessValue: $("brightness-value"),
  contrastValue: $("contrast-value"),
  resetAppearance: $("reset-appearance"),
  addForm: $("add-form"),
  exclusionInput: $("exclusion-input"),
  exclusionList: $("exclusion-list"),
  exclusionEmpty: $("exclusion-empty"),
};

let state = { ...DEFAULTS };
let currentHost = "";
let isRestrictedTab = false;

/* ---------------- Utilities ---------------- */

function clamp(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Extract and normalize a hostname from arbitrary user input. */
function normalizeDomain(raw) {
  if (!raw) return "";
  let value = String(raw).trim().toLowerCase();
  if (!value) return "";
  // Allow the user to paste a full URL.
  if (!/^[a-z]+:\/\//.test(value)) value = "http://" + value;
  try {
    const url = new URL(value);
    let host = url.hostname;
    if (host.startsWith("www.")) host = host.slice(4);
    // Reject obvious garbage; require at least one dot OR localhost.
    if (host !== "localhost" && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) return "";
    return host;
  } catch {
    return "";
  }
}

function hostMatches(host, domain) {
  if (!host || !domain) return false;
  return host === domain || host.endsWith("." + domain);
}

/* ---------------- Storage ---------------- */

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const stored = result?.[STORAGE_KEY];
    state = { ...DEFAULTS, ...(stored && typeof stored === "object" ? stored : {}) };
  } catch {
    state = { ...DEFAULTS };
  }
}

async function saveSettings(patch) {
  state = { ...state, ...patch };
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: state });
  } catch (error) {
    console.warn("[LunaShade] Could not save settings:", error);
  }
}

/* ---------------- Tab detection ---------------- */

async function detectCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return { host: "", restricted: true };
    const url = new URL(tab.url);
    if (!/^https?:$/.test(url.protocol)) return { host: "", restricted: true };
    let host = url.hostname.toLowerCase();
    if (host.startsWith("www.")) host = host.slice(4);
    return { host, restricted: false };
  } catch {
    return { host: "", restricted: true };
  }
}

/* ---------------- Rendering ---------------- */

function renderSiteLabel() {
  if (isRestrictedTab) {
    els.siteLabel.textContent = "Unsupported page";
  } else {
    els.siteLabel.textContent = currentHost || "—";
  }
}

function renderToggles() {
  els.toggleEnabled.checked = !!state.enabled;
  els.toggleGlobal.checked = !!state.globalMode;
}

function renderSiteAction() {
  if (isRestrictedTab || !currentHost) {
    els.siteActionLabel.textContent = "This site can't be themed";
    els.siteActionHint.textContent = "Chrome restricts internal pages.";
    els.siteActionBtn.textContent = "—";
    els.siteActionBtn.disabled = true;
    els.siteActionBtn.style.opacity = "0.5";
    els.siteActionBtn.style.cursor = "not-allowed";
    return;
  }
  els.siteActionBtn.disabled = false;
  els.siteActionBtn.style.opacity = "";
  els.siteActionBtn.style.cursor = "";

  const excluded = state.exclusions.some((d) => hostMatches(currentHost, d));
  const allowed = state.allowlist.some((d) => hostMatches(currentHost, d));

  if (state.globalMode) {
    els.siteActionLabel.textContent = excluded
      ? `Enable on ${currentHost}`
      : `Disable on ${currentHost}`;
    els.siteActionHint.textContent = excluded
      ? "Remove from your exclusion list."
      : "Add to your exclusion list.";
    els.siteActionBtn.textContent = excluded ? "Enable" : "Disable";
  } else {
    els.siteActionLabel.textContent = allowed
      ? `Stop theming ${currentHost}`
      : `Theme ${currentHost}`;
    els.siteActionHint.textContent = allowed
      ? "Remove from your allowed sites."
      : "Add to your allowed sites.";
    els.siteActionBtn.textContent = allowed ? "Remove" : "Add";
  }
}

function renderSliders() {
  const b = clamp(state.brightness, 50, 150);
  const c = clamp(state.contrast, 50, 150);
  els.brightness.value = String(b);
  els.contrast.value = String(c);
  els.brightnessValue.textContent = b + "%";
  els.contrastValue.textContent = c + "%";
  updateSliderFill(els.brightness);
  updateSliderFill(els.contrast);
}

function updateSliderFill(input) {
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const value = Number(input.value);
  const pct = ((value - min) / (max - min)) * 100;
  input.style.setProperty("--p", pct + "%");
}

function renderExclusions() {
  els.exclusionList.innerHTML = "";
  if (!state.exclusions.length) {
    els.exclusionEmpty.classList.remove("hidden");
    return;
  }
  els.exclusionEmpty.classList.add("hidden");

  const fragment = document.createDocumentFragment();
  for (const domain of state.exclusions) {
    const li = document.createElement("li");
    li.className = "chip";

    const span = document.createElement("span");
    span.textContent = domain;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", `Remove ${domain}`);
    btn.title = `Remove ${domain}`;
    btn.textContent = "×";
    btn.addEventListener("click", () => removeExclusion(domain));

    li.appendChild(span);
    li.appendChild(btn);
    fragment.appendChild(li);
  }
  els.exclusionList.appendChild(fragment);
}

function renderAll() {
  renderSiteLabel();
  renderToggles();
  renderSiteAction();
  renderSliders();
  renderExclusions();
}

/* ---------------- Actions ---------------- */

async function addExclusion(rawDomain) {
  const domain = normalizeDomain(rawDomain);
  if (!domain) {
    flashInputError();
    return;
  }
  if (state.exclusions.includes(domain)) {
    els.exclusionInput.value = "";
    return;
  }
  const next = [...state.exclusions, domain].sort((a, b) => a.localeCompare(b));
  await saveSettings({ exclusions: next });
  els.exclusionInput.value = "";
  renderExclusions();
  renderSiteAction();
}

async function removeExclusion(domain) {
  const next = state.exclusions.filter((d) => d !== domain);
  await saveSettings({ exclusions: next });
  renderExclusions();
  renderSiteAction();
}

async function toggleCurrentSite() {
  if (!currentHost) return;
  if (state.globalMode) {
    const excluded = state.exclusions.some((d) => hostMatches(currentHost, d));
    if (excluded) {
      const next = state.exclusions.filter((d) => !hostMatches(currentHost, d));
      await saveSettings({ exclusions: next });
    } else {
      const next = [...new Set([...state.exclusions, currentHost])].sort();
      await saveSettings({ exclusions: next });
    }
  } else {
    const allowed = state.allowlist.some((d) => hostMatches(currentHost, d));
    if (allowed) {
      const next = state.allowlist.filter((d) => !hostMatches(currentHost, d));
      await saveSettings({ allowlist: next });
    } else {
      const next = [...new Set([...state.allowlist, currentHost])].sort();
      await saveSettings({ allowlist: next });
    }
  }
  renderAll();
}

function flashInputError() {
  els.exclusionInput.style.borderColor = "var(--danger)";
  els.exclusionInput.style.boxShadow = "0 0 0 3px rgba(255,107,129,0.25)";
  setTimeout(() => {
    els.exclusionInput.style.borderColor = "";
    els.exclusionInput.style.boxShadow = "";
  }, 700);
}

/* ---------------- Event wiring ---------------- */

function wireEvents() {
  els.toggleEnabled.addEventListener("change", async (e) => {
    await saveSettings({ enabled: !!e.target.checked });
  });

  els.toggleGlobal.addEventListener("change", async (e) => {
    await saveSettings({ globalMode: !!e.target.checked });
    renderSiteAction();
  });

  els.siteActionBtn.addEventListener("click", toggleCurrentSite);

  const onSlider = (input, key, valueEl) => {
    input.addEventListener("input", () => {
      const v = clamp(input.value, 50, 150);
      valueEl.textContent = v + "%";
      updateSliderFill(input);
      // Debounce-free: chrome.storage.sync handles ~120 writes/minute easily,
      // but we throttle via requestIdleCallback-style microtask coalescing.
      scheduleSliderSave(key, v);
    });
  };

  let pendingPatch = null;
  let pendingTimer = null;
  function scheduleSliderSave(key, value) {
    pendingPatch = { ...(pendingPatch || {}), [key]: value };
    if (pendingTimer) return;
    pendingTimer = setTimeout(async () => {
      const patch = pendingPatch;
      pendingPatch = null;
      pendingTimer = null;
      if (patch) await saveSettings(patch);
    }, 80);
  }

  onSlider(els.brightness, "brightness", els.brightnessValue);
  onSlider(els.contrast, "contrast", els.contrastValue);

  els.resetAppearance.addEventListener("click", async () => {
    await saveSettings({ brightness: 100, contrast: 100 });
    renderSliders();
  });

  els.addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addExclusion(els.exclusionInput.value);
  });

  // Live-update if storage changes from another popup or device.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes[STORAGE_KEY]) return;
    state = { ...DEFAULTS, ...(changes[STORAGE_KEY].newValue || {}) };
    renderAll();
  });
}

/* ---------------- Bootstrap ---------------- */

(async function init() {
  await loadSettings();
  const { host, restricted } = await detectCurrentTab();
  currentHost = host;
  isRestrictedTab = restricted;
  wireEvents();
  renderAll();
})();

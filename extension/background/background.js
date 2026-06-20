/**
 * LunaShade — Background Service Worker
 *
 * Responsibilities:
 *  - Initialize default settings on install / update
 *  - Broadcast settings changes to all tabs so content scripts can react
 *  - Keep the toolbar icon badge in sync with the enabled state
 */

const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  globalMode: true,
  brightness: 100,
  contrast: 100,
  exclusions: [], // list of hostnames where LunaShade is disabled
  allowlist: [],  // when globalMode === false, only these hostnames are themed
});

const STORAGE_KEY = "lunashade_settings";

/** Safely read settings, falling back to defaults on any failure. */
async function readSettings() {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    const stored = result?.[STORAGE_KEY];
    if (!stored || typeof stored !== "object") return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (error) {
    console.warn("[LunaShade] Failed to read settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

/** Persist settings safely. */
async function writeSettings(settings) {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
  } catch (error) {
    console.warn("[LunaShade] Failed to write settings:", error);
  }
}

/** Update the toolbar badge to reflect the global on/off state. */
async function updateBadge(enabled) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#7C5CFF" : "#3A3A45" });
    await chrome.action.setBadgeText({ text: enabled ? "" : "off" });
  } catch {
    /* Some Chrome builds restrict badges; ignore safely. */
  }
}

/** Broadcast a settings update to every tab. Content scripts decide whether to apply. */
async function broadcast(settings) {
  let tabs = [];
  try {
    tabs = await chrome.tabs.query({});
  } catch {
    return;
  }
  for (const tab of tabs) {
    if (!tab.id || !tab.url) continue;
    if (!/^https?:/i.test(tab.url)) continue;
    chrome.tabs
      .sendMessage(tab.id, { type: "LUNASHADE_SETTINGS", settings })
      .catch(() => {
        /* No receiver in this tab — silently ignore. */
      });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await readSettings();
  await writeSettings(current);
  await updateBadge(current.enabled);
});

chrome.runtime.onStartup.addListener(async () => {
  const current = await readSettings();
  await updateBadge(current.enabled);
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync" || !changes[STORAGE_KEY]) return;
  const next = { ...DEFAULT_SETTINGS, ...(changes[STORAGE_KEY].newValue || {}) };
  await updateBadge(next.enabled);
  await broadcast(next);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "LUNASHADE_GET_SETTINGS") {
    readSettings().then(sendResponse);
    return true; // async response
  }
  return false;
});

/**
 * LunaShade — Content Script
 *
 * Strategy:
 *  - Inject a single <style id="lunashade-theme"> element at document_start
 *    so the dark theme is visible before first paint (no flash of white).
 *  - Use CSS custom properties + a CSS filter on <html> for brightness/contrast.
 *  - Preserve images, videos, canvases, iframes, SVG and picture elements by
 *    reverting the inversion on those nodes (when invert filter is applied).
 *  - Use a *throttled* MutationObserver only to re-apply the theme class if
 *    a hostile script removes it. No per-node DOM traversal.
 */

(() => {
  // Avoid double-injection (e.g. extension reloaded, or running in iframes
  // where the parent already ran).
  if (window.__lunashadeInjected) return;
  window.__lunashadeInjected = true;

  const STYLE_ID = "lunashade-theme";
  const ROOT_ATTR = "data-lunashade";
  const DEFAULTS = {
    enabled: true,
    globalMode: true,
    brightness: 100,
    contrast: 100,
    exclusions: [],
    allowlist: [],
  };

  /** Return true when LunaShade should theme the current document. */
  function shouldApply(settings) {
    if (!settings || settings.enabled === false) return false;
    const host = location.hostname.toLowerCase();
    if (!host) return false;
    const exclusions = Array.isArray(settings.exclusions) ? settings.exclusions : [];
    if (exclusions.some((d) => matchesHost(host, d))) return false;
    if (settings.globalMode === false) {
      const allow = Array.isArray(settings.allowlist) ? settings.allowlist : [];
      return allow.some((d) => matchesHost(host, d));
    }
    return true;
  }

  function matchesHost(host, domain) {
    if (!domain) return false;
    const d = String(domain).toLowerCase().trim();
    if (!d) return false;
    return host === d || host.endsWith("." + d);
  }

  /** Build the CSS that powers LunaShade's theme. */
  function buildCss(settings) {
    const brightness = clamp(Number(settings.brightness) || 100, 50, 150) / 100;
    const contrast = clamp(Number(settings.contrast) || 100, 50, 150) / 100;

    // We deliberately avoid `filter: invert()` on <html> because it visually
    // breaks images and media. Instead we paint a dark theme with high-
    // specificity overrides and use filter only for user-tunable brightness
    // and contrast.
    return `
:root[${ROOT_ATTR}="on"] {
  --ls-bg: #0e0f13;
  --ls-bg-elev: #15171d;
  --ls-fg: #e6e8ee;
  --ls-muted: #a4a8b3;
  --ls-border: #262932;
  --ls-link: #8ab4ff;
  --ls-link-visited: #c8a8ff;
  --ls-accent: #7c5cff;
  color-scheme: dark;
}

html[${ROOT_ATTR}="on"] {
  background-color: var(--ls-bg) !important;
  filter: brightness(${brightness}) contrast(${contrast});
}

html[${ROOT_ATTR}="on"] body,
html[${ROOT_ATTR}="on"] body * {
  scrollbar-color: #3a3d48 #15171d;
}

/* Broad, low-cost overrides. We only touch backgrounds, text and borders
   so layout, spacing and typography remain untouched. */
html[${ROOT_ATTR}="on"] body,
html[${ROOT_ATTR}="on"] body :not(svg):not(svg *):not(path) {
  background-color: transparent !important;
  border-color: var(--ls-border) !important;
}

html[${ROOT_ATTR}="on"] body {
  background-color: var(--ls-bg) !important;
  color: var(--ls-fg) !important;
}

html[${ROOT_ATTR}="on"] body :where(div, section, article, aside, header,
footer, nav, main, form, fieldset, dialog, details, summary, li, ul, ol,
table, thead, tbody, tr, td, th, p, span, pre, code, blockquote, h1, h2,
h3, h4, h5, h6, label) {
  color: var(--ls-fg) !important;
}

/* Inputs and surfaces get a subtle elevated tone. */
html[${ROOT_ATTR}="on"] :where(input, textarea, select, button) {
  background-color: var(--ls-bg-elev) !important;
  color: var(--ls-fg) !important;
  border-color: var(--ls-border) !important;
  caret-color: var(--ls-fg) !important;
}

html[${ROOT_ATTR}="on"] :where(input::placeholder, textarea::placeholder) {
  color: var(--ls-muted) !important;
  opacity: 1;
}

html[${ROOT_ATTR}="on"] :where(dialog, [role="dialog"], [role="menu"],
[role="listbox"], [role="tooltip"]) {
  background-color: var(--ls-bg-elev) !important;
}

html[${ROOT_ATTR}="on"] :where(a, a *) {
  color: var(--ls-link) !important;
}

html[${ROOT_ATTR}="on"] :where(a:visited, a:visited *) {
  color: var(--ls-link-visited) !important;
}

html[${ROOT_ATTR}="on"] ::selection {
  background-color: var(--ls-accent) !important;
  color: #fff !important;
}

/* Preserve media: never recolor and never apply a filter that would tint them. */
html[${ROOT_ATTR}="on"] :where(img, picture, video, canvas, iframe, embed,
object, svg, [style*="background-image"]) {
  background-color: transparent !important;
}

/* Make sure code blocks remain readable. */
html[${ROOT_ATTR}="on"] :where(pre, code, kbd, samp) {
  background-color: var(--ls-bg-elev) !important;
  color: #f1d6a8 !important;
}
`;
  }

  function clamp(value, min, max) {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  function ensureStyleElement() {
    let el = document.getElementById(STYLE_ID);
    if (el) return el;
    el = document.createElement("style");
    el.id = STYLE_ID;
    el.type = "text/css";
    // Insert into <head> if possible; otherwise into <html> directly so we
    // are active at document_start before <head> exists.
    (document.head || document.documentElement).appendChild(el);
    return el;
  }

  function applyTheme(settings) {
    try {
      const root = document.documentElement;
      if (!root) return;
      if (!shouldApply(settings)) {
        removeTheme();
        return;
      }
      const style = ensureStyleElement();
      const css = buildCss(settings);
      if (style.textContent !== css) style.textContent = css;
      if (root.getAttribute(ROOT_ATTR) !== "on") root.setAttribute(ROOT_ATTR, "on");
    } catch (error) {
      // Some pages (PDF viewer, chrome:// internals) restrict DOM access.
      // Failing silently is the correct behavior here.
      void error;
    }
  }

  function removeTheme() {
    try {
      const root = document.documentElement;
      if (root && root.hasAttribute(ROOT_ATTR)) root.removeAttribute(ROOT_ATTR);
      const style = document.getElementById(STYLE_ID);
      if (style && style.parentNode) style.parentNode.removeChild(style);
    } catch {
      /* ignore */
    }
  }

  // A tiny, throttled MutationObserver. We only care about ensuring our
  // <style> element and the root attribute survive — we do NOT scan added
  // nodes, which keeps overhead negligible even on infinite-scroll pages.
  let currentSettings = { ...DEFAULTS };
  let observerScheduled = false;
  function scheduleReassert() {
    if (observerScheduled) return;
    observerScheduled = true;
    requestAnimationFrame(() => {
      observerScheduled = false;
      if (shouldApply(currentSettings)) applyTheme(currentSettings);
    });
  }

  function startObserver() {
    if (!document.documentElement) return;
    const observer = new MutationObserver(() => scheduleReassert());
    try {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: false,
        attributes: true,
        attributeFilter: [ROOT_ATTR],
      });
      // Also watch <head> for childList changes so SPAs that rewrite <head>
      // (e.g. removing our style) trigger a reassert.
      if (document.head) {
        observer.observe(document.head, { childList: true, subtree: false });
      } else {
        // <head> not ready yet; attach when it is.
        document.addEventListener(
          "DOMContentLoaded",
          () => {
            if (document.head) {
              observer.observe(document.head, { childList: true, subtree: false });
            }
          },
          { once: true },
        );
      }
    } catch {
      /* ignore */
    }
  }

  // Live updates from background / popup.
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "LUNASHADE_SETTINGS" && message.settings) {
      currentSettings = { ...DEFAULTS, ...message.settings };
      applyTheme(currentSettings);
    }
  });

  // Initial bootstrap.
  chrome.runtime
    .sendMessage({ type: "LUNASHADE_GET_SETTINGS" })
    .then((settings) => {
      currentSettings = { ...DEFAULTS, ...(settings || {}) };
      applyTheme(currentSettings);
      startObserver();
    })
    .catch(() => {
      // Background may be cold-starting; try storage directly as a fallback.
      try {
        chrome.storage.sync.get("lunashade_settings", (result) => {
          const s = result?.lunashade_settings;
          currentSettings = { ...DEFAULTS, ...(s || {}) };
          applyTheme(currentSettings);
          startObserver();
        });
      } catch {
        startObserver();
      }
    });
})();

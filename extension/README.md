# LunaShade

A premium, lightweight dark-mode Chrome extension.

## Install (developer mode)

1. Download and unzip the LunaShade folder.
2. Open `chrome://extensions` in Chrome (or any Chromium browser).
3. Toggle **Developer mode** in the top-right.
4. Click **Load unpacked** and select the unzipped `extension/` folder.
5. Pin LunaShade to your toolbar for one-click access.

Works in Chrome, Edge, Brave, Arc, Vivaldi, and Opera.

## Project structure

```
manifest.json
popup/      → popup UI (HTML/CSS/JS)
content/    → page-level dark-mode engine
background/ → service worker (settings broadcast, badge)
assets/     → toolbar icons
docs/       → privacy policy, release notes, store listing
```

## Tech

- Manifest V3
- Vanilla HTML / CSS / JS — no frameworks, no libraries
- `chrome.storage.sync` for persistence
- Minimal permissions: `storage`, `activeTab`, `scripting`

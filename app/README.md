# Device Screenshot Tool (desktop app)

Electron + Playwright desktop app that captures screenshots of any website — including internal/intranet/VPN-only apps — across a set of device presets.

## Develop

```bash
npm install
npm run dev
```

First run downloads Playwright's Chromium and WebKit into the app's `userData/browsers` folder (shown as an in-app progress screen). This only happens once per machine.

## Build

```bash
npm run build        # electron-vite build (main/preload/renderer -> out/)
npm run dist:win      # electron-builder, Windows target
npm run dist:mac      # electron-builder, macOS target
npm run dist:linux    # electron-builder, Linux target
```

## Architecture

- `src/main` — Electron main process: window creation, security (CSP, sandboxed/isolated renderer), IPC handlers, the Playwright capture engine, preset storage, and per-host session (`storageState`) management.
- `src/preload` — the only bridge between main and renderer; exposes a minimal typed `window.deviceScreenshotApi`. Built as CommonJS (`format: "cjs"` in `electron.vite.config.mjs`) because Electron's sandboxed preload loader doesn't support ESM.
- `src/renderer` — React UI (Vite). Tailwind v4, `@headlessui/react`, `lucide-react`, per the `eat-sleep-code-react` house style.
- `data/presets.json` — seed device presets, shipped as an `extraResource` in packaged builds. Phone/tablet dimensions are copied from `playwright-core`'s device registry; re-verify before each release (see the file's own `$comment`).

## Known open items (see repo root `CLAUDE.md`)

Domain (`screenshot.eat-sleep-code.com`) and the release repo (`eat-sleep-code/screenshot.eat-sleep-code.com`, same repo as this app code) are confirmed and already set in `electron-builder.yml`. Still pending Jeff:
- the app's real product/display name (`appId`/`productName` in `electron-builder.yml` use a placeholder)
- an Apple Developer ID + notarization credentials, and a Windows code-signing certificate — unsigned builds will show OS security warnings until then

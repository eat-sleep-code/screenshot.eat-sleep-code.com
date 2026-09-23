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
- `resources/icon.png` — 1024×1024 source icon; electron-builder generates the platform-specific `.ico`/`.icns`/PNG set from it automatically. Placeholder design (device outline framed by capture-corner brackets, matching the download site's dark/cyan palette) — swap for real branding whenever it's supplied.

## Cross-building Linux/macOS targets from Windows

`npm run dist:linux` packages an AppImage, which embeds POSIX symlinks (e.g. for the icon). Creating those on Windows needs either admin rights or **Developer Mode** enabled (Settings → Privacy & security → For developers), otherwise it fails with `EISDIR` on a symlink path. macOS builds can't be signed/notarized from Windows at all. For real releases, build each target on its native OS — see CI below — rather than cross-building locally.

## CI (`.github/workflows/build.yml`)

- Every push/PR: installs from a clean `node_modules` and runs `electron-vite build` on Linux — a fast compile check (this is also how the vite/electron-vite version mismatch mentioned above would get caught automatically going forward).
- Pushing a `v*` tag (e.g. `git tag v0.2.0 && git push --tags`): a Windows/macOS/Linux matrix packages each native target with electron-builder and publishes to this repo's GitHub Releases via `--publish always`, using the default `GITHUB_TOKEN`.
- Code signing is opt-in via repo secrets (`WIN_CSC_LINK`/`WIN_CSC_KEY_PASSWORD`, `MAC_CSC_LINK`/`MAC_CSC_KEY_PASSWORD`, `APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID`) — electron-builder just produces an unsigned build when they're absent, so the workflow runs end-to-end today and starts signing the moment Jeff adds certificates, no workflow changes needed.

## Known open items (see repo root `CLAUDE.md`)

Domain (`screenshot.eat-sleep-code.com`) and the release repo (`eat-sleep-code/screenshot.eat-sleep-code.com`, same repo as this app code) are confirmed and already set in `electron-builder.yml`. Still pending Jeff:
- the app's real product/display name (`appId`/`productName` in `electron-builder.yml` use a placeholder)
- an Apple Developer ID + notarization credentials, and a Windows code-signing certificate — unsigned builds will show OS security warnings until then

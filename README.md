# Device Screenshot Tool

Cross-platform desktop app that captures screenshots of any website — including internal/intranet apps — across a set of device presets, plus a small download page.

See [`CLAUDE.md`](CLAUDE.md) for the full brief and decisions log.

## Repo layout

```
/app    Electron desktop app (electron-vite: main / preload / renderer) — see app/README.md
/docs   Simple static download page, published via GitHub Pages (must live at repo root — see docs/README.md)
```

## Open items

Domain (`screenshot.eat-sleep-code.com`) and the release repo (`eat-sleep-code/screenshot.eat-sleep-code.com`, same repo as the app code) are confirmed. App display name and code-signing certificates are still pending Jeff's sign-off — see the "Open items" section in `CLAUDE.md`.

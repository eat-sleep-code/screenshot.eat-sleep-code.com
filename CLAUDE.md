# Device Screenshot Tool

Cross-platform desktop app that captures screenshots of any website, including internal/intranet apps, across a set of device presets. Plus a small public web page where people can download the installer.

Follow the **eat-sleep-code-react** skill for all React work. Verify guidance by testing it, not by asserting it.

## Repo layout

```
/app    Electron desktop app (electron-vite: main / preload / renderer)
/site   Download landing page (Vite + React, Cloudflare Pages)
```

## Decisions already made

- **Desktop, not a hosted web service.** Captures must run on the user's machine so VPN, intranet, localhost, and staging sites are reachable.
- **Electron, not Tauri.** Playwright is a Node library and runs directly in Electron's main process. Tauri would need a Node sidecar.
- **Playwright for capture.** It provides real WebKit for iPhone presets, Chromium for Android presets, and maintained device descriptors.
- **No zip library.** Files are written straight to a user-chosen folder.

## Approved dependencies

These are approved in addition to the ones the house-style skill pre-approves. Check npm for the latest versions when installing.

- `electron`
- `electron-vite`
- `playwright`
- `electron-builder`
- `electron-updater`

Anything beyond this list or the skill's pre-approved list needs Jeff's sign-off first.

## App features

1. **URL input** with validation.
2. **Preset picker** built with @headlessui checkboxes:
	- Groups by device family.
	- Portrait and landscape toggles per preset.
	- Select all / none.
3. **Presets are data, not code.**
	- Store them in a JSON config: name, CSS-pixel width/height, deviceScaleFactor, isMobile, hasTouch, userAgent, and engine (webkit or chromium).
	- Landscape swaps width and height.
	- Seed the list from Playwright's device descriptors, and verify the dimensions for current models.
	- Include current iPhone, iPhone Pro Max, Pixel, and Pixel Pro models, plus Galaxy Z Fold and Pixel Fold in folded and unfolded states.
	- Include a few desktop/tablet sizes.
	- Users can add, edit, and delete custom presets.
4. **Capture options:**
	- Viewport-only or full-page.
	- A settle delay.
	- Scroll-through before capture, to trigger lazy loading.
	- Optional CSS/JS injection, for example to hide cookie banners.
5. **Internal-app support:**
	- A "Sign in" action opens a headed Playwright browser so the user can log in manually (works with SSO and MFA).
	- Save the session with `storageState`, one per host, in the app's userData folder.
	- Never store passwords.
	- Per-URL "ignore HTTPS errors" toggle for self-signed internal certs, off by default, with a warning.
6. **Output:**
	- User picks the output folder with a native dialog; remember the last choice.
	- Filenames use the pattern `host_preset_orientation.png`.
	- Show a progress list during capture and a thumbnail gallery afterward, with "open folder."
7. **Browsers:**
	- Download Playwright's Chromium and WebKit on first run, with a progress UI, rather than bundling them into the installer.
	- Confirm WebKit behavior on Windows early, since Playwright's Windows WebKit build differs from macOS Safari.
8. **Check for Updates** in the settings screen via electron-updater.

## Security (Electron)

- Enable `contextIsolation` and `sandbox`, and disable `nodeIntegration` in the renderer.
- The preload script exposes a minimal typed IPC API. Playwright runs only in the main process.
- Validate every IPC payload in the main process.
- Add a strict CSP on the renderer.

## House-style applicability

**Applies to /app renderer and /site:**
- Translations in `/src/translations/en-US.jsx`.
- Light and dark mode; /app follows the OS via `nativeTheme`.
- Accessibility.
- Tailwind v4 and btn classes.
- lucide-react icons.
- ModalShell.
- Tab indentation and kebab-case files.
- `/src/components/*`.
- No dead code.

**Does not apply to /app:**
- Service worker, manifest, `_headers`/CSP pipeline.
- Cloudflare `_middleware`.
- Legal-route modals. Put Privacy/Terms links in an About screen instead.

**/site is a normal house-style Cloudflare Pages project:**
- Full checklist applies, including footer, legal modals and routes, `_headers`, service worker, manifest, and meta tags.

## Download site (/site)

- A single page covering what the app does, screenshots, and download buttons.
- Detect the visitor's OS and highlight the matching installer (Windows, macOS, Linux), with the others listed below it.
- Proposed, pending Jeff's confirmation: installers are hosted on GitHub Releases. electron-builder publishes there and electron-updater reads from it, so the site links to the latest release assets.
- Show the version number and release notes link.

## Open items (ask Jeff)

- Domain for /site: confirmed as `screenshot.eat-sleep-code.com`. App display name still TBD (code currently uses "Device Screenshot Tool" as a placeholder).
- GitHub Releases as the host for installers and updates: confirmed, using the same repo as the app code (`eat-sleep-code/screenshot.eat-sleep-code.com`), same pattern as `skills.eat-sleep-code.com`.
- Code-signing certificates:
	- Apple Developer ID with notarization.
	- A Windows signing certificate.
	- Unsigned builds will show OS security warnings.
- Whether "iPhone Duo" meant Surface Duo. The current assumption is Galaxy/Pixel foldables.
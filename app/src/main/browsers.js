import { app } from "electron";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { platform } from "node:os";
import { join } from "node:path";
import { chromium, webkit } from "playwright";

// index.js sets process.env.PLAYWRIGHT_BROWSERS_PATH to browsersCacheDir()
// before this module (or `playwright`) is ever imported, so installBrowsers()
// and chromium.launch()/webkit.launch() always agree on where browsers live.

// Keep Playwright's browser cache inside userData so it's per-install, not
// shared with any system-wide Playwright cache, and survives app updates.
export function browsersCacheDir() {
	return join(app.getPath("userData"), "browsers");
}

function markerPath() {
	return join(browsersCacheDir(), ".installed");
}

// Separate from markerPath(): the browser binaries can be fully installed
// while the Linux system libraries they need (nss, atk, gtk, etc., via
// `playwright install-deps`) are still missing — that failure is invisible
// to an existsSync() check on the binaries themselves. Tracking it
// separately means anyone who already has browsers installed (including
// from before this deps step existed) still gets sent through the deps
// install exactly once, instead of the gate short-circuiting on the old
// marker and never running it.
function depsMarkerPath() {
	return join(browsersCacheDir(), ".deps-installed");
}

export function areBrowsersInstalled() {
	if (!existsSync(markerPath())) return false;
	// The marker alone isn't proof the binaries are actually usable — a
	// partial/corrupted install (or one made before this env var wiring
	// existed) can leave it behind with no browser at the expected path.
	// Checking the real executablePath()s means a broken install is
	// detected and re-run instead of silently stuck forever.
	try {
		if (!existsSync(chromium.executablePath()) || !existsSync(webkit.executablePath())) return false;
	} catch {
		return false;
	}
	if (platform() === "linux" && !existsSync(depsMarkerPath())) return false;
	return true;
}

function driverCliPath() {
	// playwright's CLI entry, used to invoke `install` the same way `npx playwright install` does.
	// asarUnpack (electron-builder.yml) pulls playwright out of app.asar into a
	// sibling app.asar.unpacked/ directory in packaged builds, since asar
	// archives can't run playwright's own child-process driver scripts.
	const appPath = app.isPackaged ? app.getAppPath().replace("app.asar", "app.asar.unpacked") : app.getAppPath();
	return join(appPath, "node_modules", "playwright", "cli.js");
}

// On Linux, Chromium/WebKit also need a set of system shared libraries
// (nss, atk, gtk, etc.) that Playwright's browser download alone doesn't
// provide — without them, launch() fails with a "missing dependencies"
// error. `playwright install-deps` installs those via apt/dnf/etc, but
// that needs root. We elevate through pkexec so users get a normal GUI
// auth prompt instead of a silent failure or a hung sudo waiting on a
// password on a terminal that doesn't exist. `env` (not our own env
// object) is used to hand the elevated process the one var it needs,
// since pkexec sanitizes the environment it inherits from us.
function installDepsCommand() {
	return ["env", "ELECTRON_RUN_AS_NODE=1", process.execPath, driverCliPath(), "install-deps", "chromium", "webkit"];
}

function installLinuxDeps(onProgress) {
	if (platform() !== "linux") return Promise.resolve();
	onProgress?.("Installing system libraries required by Chromium/WebKit (you may be prompted for your password)...");
	return new Promise((resolve) => {
		const child = spawn("pkexec", installDepsCommand(), { windowsHide: true });

		const emit = (chunk) => {
			const text = chunk.toString("utf-8");
			text
				.split(/\r?\n/)
				.filter(Boolean)
				.forEach((line) => onProgress?.(line));
		};

		child.stdout?.on("data", emit);
		child.stderr?.on("data", emit);

		child.on("error", (err) => {
			onProgress?.(`Couldn't run the system dependency installer (${err.message}). If screenshots fail to launch, run: sudo npx playwright install-deps`);
			// Mark it attempted anyway — if pkexec/PolicyKit just isn't present
			// on this system, retrying it on every launch would trap the user
			// in the install screen forever with no way to get past it.
			writeFileSync(depsMarkerPath(), "failed");
			resolve();
		});
		child.on("close", (code) => {
			if (code !== 0) {
				onProgress?.("System dependency install didn't complete. If screenshots fail to launch, run: sudo npx playwright install-deps");
			}
			writeFileSync(depsMarkerPath(), code === 0 ? new Date().toISOString() : "failed");
			resolve();
		});
	});
}

export function installBrowsers(onProgress) {
	return new Promise((resolve, reject) => {
		const env = {
			...process.env,
			PLAYWRIGHT_BROWSERS_PATH: browsersCacheDir(),
			// Run electron's own binary as plain Node rather than launching a
			// second Electron app instance (which would fight the main
			// process for the single-instance lock / GUI subsystem).
			ELECTRON_RUN_AS_NODE: "1",
		};
		const child = spawn(process.execPath, [driverCliPath(), "install", "chromium", "webkit"], {
			env,
			windowsHide: true,
		});

		const emit = (chunk) => {
			const text = chunk.toString("utf-8");
			text
				.split(/\r?\n/)
				.filter(Boolean)
				.forEach((line) => onProgress?.(line));
		};

		child.stdout?.on("data", emit);
		child.stderr?.on("data", emit);

		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				mkdirSync(browsersCacheDir(), { recursive: true });
				writeFileSync(markerPath(), new Date().toISOString());
				installLinuxDeps(onProgress).then(resolve);
			} else {
				reject(new Error(`playwright install exited with code ${code}`));
			}
		});
	});
}

export function engineFor(name) {
	return name === "webkit" ? webkit : chromium;
}

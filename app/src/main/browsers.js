import { app } from "electron";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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

export function areBrowsersInstalled() {
	return existsSync(markerPath());
}

function driverCliPath() {
	// playwright's CLI entry, used to invoke `install` the same way `npx playwright install` does.
	// asarUnpack (electron-builder.yml) pulls playwright out of app.asar into a
	// sibling app.asar.unpacked/ directory in packaged builds, since asar
	// archives can't run playwright's own child-process driver scripts.
	const appPath = app.isPackaged ? app.getAppPath().replace("app.asar", "app.asar.unpacked") : app.getAppPath();
	return join(appPath, "node_modules", "playwright", "cli.js");
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
				resolve();
			} else {
				reject(new Error(`playwright install exited with code ${code}`));
			}
		});
	});
}

export function engineFor(name) {
	return name === "webkit" ? webkit : chromium;
}

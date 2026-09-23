import { app } from "electron";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { engineFor } from "./browsers.js";

function sessionsDir() {
	const dir = join(app.getPath("userData"), "sessions");
	mkdirSync(dir, { recursive: true });
	return dir;
}

function sessionPath(host) {
	// Host names are validated (isValidHost) before reaching here, so this is
	// safe as a filename component.
	return join(sessionsDir(), `${host}.json`);
}

export function hasSession(host) {
	return existsSync(sessionPath(host));
}

export function loadStorageState(host) {
	const file = sessionPath(host);
	return existsSync(file) ? JSON.parse(readFileSync(file, "utf-8")) : undefined;
}

export function listSessions() {
	return readdirSync(sessionsDir())
		.filter((name) => name.endsWith(".json"))
		.map((name) => name.replace(/\.json$/, ""));
}

export function removeSession(host) {
	const file = sessionPath(host);
	if (existsSync(file)) rmSync(file);
}

// Playwright's bundled Chromium sets --enable-automation and other flags
// that expose navigator.webdriver, which Cloudflare Turnstile (and similar
// bot-detection challenges) treat as a signal to fail the challenge even for
// a real human clicking through a headed, hand-driven sign-in window. WebKit
// has no equivalent flags/args to suppress.
const CHROMIUM_LAUNCH_OPTIONS = {
	ignoreDefaultArgs: ["--enable-automation"],
	args: ["--disable-blink-features=AutomationControlled"],
};

/**
 * Opens a headed browser so the user can sign in by hand (SSO/MFA included),
 * then saves the resulting cookies/localStorage as this host's storageState.
 * Resolves once the user closes the window.
 */
export async function signIn(url, engineName) {
	const engine = engineFor(engineName);
	const launchOptions =
		engineName === "chromium" ? { headless: false, ...CHROMIUM_LAUNCH_OPTIONS } : { headless: false };
	const browser = await engine.launch(launchOptions);
	const context = await browser.newContext();
	const page = await context.newPage();
	await page.goto(url);

	const host = new URL(url).host;
	let state = null;

	// Wait for the user to finish signing in and close the window themselves,
	// then capture storageState while the context is still open.
	await new Promise((resolve) => {
		page.on("close", async () => {
			state = await context.storageState().catch(() => null);
			resolve();
		});
	});

	await browser.close().catch(() => {});

	if (state) {
		writeFileSync(sessionPath(host), JSON.stringify(state, null, "\t"), "utf-8");
	}

	return host;
}

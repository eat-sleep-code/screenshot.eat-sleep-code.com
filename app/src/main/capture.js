import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { engineFor } from "./browsers.js";
import { loadStorageState } from "./sessions.js";

function sanitizeForFilename(value) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9.-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

function filenameFor(host, presetName, orientation) {
	return `${sanitizeForFilename(host)}-${sanitizeForFilename(presetName)}-${orientation}.png`;
}

// Generic (frame-less) viewports used for the extra "Full page" shots.
// These are deliberately separate from the device presets: a full-page
// screenshot can be many times taller than any device's screen, so it
// can never be composited into a device frame, and running it through
// a phone's real deviceScaleFactor (2-3x) makes it much more likely to
// trip Playwright's ~32767px screenshot dimension limit on tall pages.
// A deviceScaleFactor of 1 keeps that risk as low as possible.
const VIRTUAL_FULL_PAGE_DEVICES = [
	{
		label: "Full page (Desktop)",
		deviceKind: "desktop",
		width: 1440,
		height: 900,
		deviceScaleFactor: 1,
		isMobile: false,
		hasTouch: false,
		engine: "chromium",
		userAgent: "",
	},
	{
		label: "Full page (Mobile)",
		deviceKind: "mobile",
		width: 412,
		height: 915,
		deviceScaleFactor: 1,
		isMobile: true,
		hasTouch: true,
		engine: "chromium",
		userAgent:
			"Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.12 Mobile Safari/537.36",
	},
];

async function scrollThroughPage(page) {
	await page.evaluate(async () => {
		const step = Math.max(200, window.innerHeight);
		const delay = 120;
		let last = -1;
		// Scroll to the bottom in steps so lazy-loaded content (images,
		// infinite-scroll sections) has a chance to trigger, then back to top.
		while (document.scrollingElement.scrollTop !== last) {
			last = document.scrollingElement.scrollTop;
			window.scrollBy(0, step);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
		window.scrollTo(0, 0);
		await new Promise((resolve) => setTimeout(resolve, delay));
	});
}

/**
 * Loads `url` in a fresh context matching `contextOptions`, applies the
 * shared capture options (scroll-through, injected CSS/JS, settle delay),
 * and screenshots it to `filePath`. Shared by both the per-preset capture
 * loop and the extra "Full page" virtual-device pass below.
 */
async function captureOne(browser, contextOptions, { url, options, storageState, label, onProgress, filePath, fullPage, meta }) {
	const context = await browser.newContext({ ...contextOptions, storageState });
	try {
		const page = await context.newPage();
		onProgress?.({ label, status: "loading", ...meta });
		await page.goto(url, { waitUntil: "load", timeout: 60000 });

		// The "load" event fires as soon as the initial HTML/assets are in —
		// JS-heavy pages often keep fetching and rendering well after that
		// (more so on wider/tablet-ish viewports that load a heavier layout),
		// so a screenshot taken right away can catch it mid-render. Give it a
		// bounded extra wait for network activity to quiet down; sites with
		// constant polling/websockets never go idle, so this is expected to
		// time out harmlessly on some of them rather than block the capture.
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

		if (options.scrollThrough) {
			onProgress?.({ label, status: "scrolling", ...meta });
			await scrollThroughPage(page);
		}

		if (options.injectCss) {
			await page.addStyleTag({ content: options.injectCss });
		}
		if (options.injectJs) {
			await page.evaluate(options.injectJs);
		}

		if (options.settleDelayMs > 0) {
			await page.waitForTimeout(options.settleDelayMs);
		}

		onProgress?.({ label, status: "capturing", ...meta });
		await page.screenshot({ path: filePath, fullPage });
	} finally {
		await context.close();
	}
}

/**
 * Captures `url` across every (preset, orientation) selection, writing PNGs
 * into outputDir. Calls onProgress after each shot with a status update.
 * Reuses one browser instance per engine (chromium/webkit) across selections.
 *
 * When options.fullPage is set, the selected presets are still captured as
 * plain viewport shots (a device frame overlay can't be composited onto a
 * full-page screenshot, and a phone's real deviceScaleFactor makes tall
 * pages much more likely to blow past Playwright's screenshot size limit).
 * Instead, two extra frame-less "virtual device" shots — one desktop, one
 * mobile — are captured full-page at the end.
 */
export async function runCapture({ url, selections, presets, outputDir, options }, onProgress) {
	mkdirSync(outputDir, { recursive: true });
	const host = new URL(url).host;
	const storageState = loadStorageState(host);
	const browsers = new Map();
	const results = [];

	const presetById = new Map(presets.map((preset) => [preset.id, preset]));

	async function getBrowser(engineName) {
		if (!browsers.has(engineName)) {
			browsers.set(engineName, await engineFor(engineName).launch());
		}
		return browsers.get(engineName);
	}

	try {
		for (const selection of selections) {
			const preset = presetById.get(selection.presetId);
			if (!preset) continue;
			const { orientation } = selection;
			const label = `${preset.name} (${orientation})`;
			const meta = { kind: "device", presetId: preset.id, orientation };

			try {
				const browser = await getBrowser(preset.engine);
				// A preset's stored width/height are its natural shape (e.g. a phone
				// preset is stored portrait, a desktop preset is stored landscape).
				// Only swap the two when the requested orientation doesn't already
				// match that natural shape — swapping unconditionally is wrong for
				// presets whose natural shape is landscape (width > height), like
				// Desktop/Laptop: requesting "landscape" for those must leave the
				// dimensions alone rather than swapping them into a tall/narrow
				// viewport (which was cropping the page instead of its top).
				const isNaturalLandscape = preset.width > preset.height;
				const wantsLandscape = orientation === "landscape";
				const shouldSwap = wantsLandscape !== isNaturalLandscape;
				const viewport = {
					width: shouldSwap ? preset.height : preset.width,
					height: shouldSwap ? preset.width : preset.height,
				};

				const filename = filenameFor(host, preset.name, orientation);
				const filePath = join(outputDir, filename);

				await captureOne(
					browser,
					{
						viewport,
						deviceScaleFactor: preset.deviceScaleFactor,
						isMobile: preset.isMobile,
						hasTouch: preset.hasTouch,
						userAgent: preset.userAgent || undefined,
					},
					{ url, options, storageState, label, onProgress, filePath, fullPage: false, meta }
				);

				const fileUrl = pathToFileURL(filePath).href;
				onProgress?.({ label, status: "done", filePath, fileUrl, ...meta });
				results.push({ label, filePath, fileUrl, ok: true, ...meta });
			} catch (error) {
				onProgress?.({ label, status: "error", message: error.message, ...meta });
				results.push({ label, ok: false, message: error.message, ...meta });
			}
		}

		if (options.fullPage) {
			for (const virtualDevice of VIRTUAL_FULL_PAGE_DEVICES) {
				const { label, deviceKind } = virtualDevice;
				const meta = { kind: "fullpage", deviceKind };

				try {
					const browser = await getBrowser(virtualDevice.engine);
					const filename = filenameFor(host, label, "full");
					const filePath = join(outputDir, filename);

					await captureOne(
						browser,
						{
							viewport: { width: virtualDevice.width, height: virtualDevice.height },
							deviceScaleFactor: virtualDevice.deviceScaleFactor,
							isMobile: virtualDevice.isMobile,
							hasTouch: virtualDevice.hasTouch,
							userAgent: virtualDevice.userAgent || undefined,
						},
						{ url, options, storageState, label, onProgress, filePath, fullPage: true, meta }
					);

					const fileUrl = pathToFileURL(filePath).href;
					onProgress?.({ label, status: "done", filePath, fileUrl, ...meta });
					results.push({ label, filePath, fileUrl, ok: true, ...meta });
				} catch (error) {
					onProgress?.({ label, status: "error", message: error.message, ...meta });
					results.push({ label, ok: false, message: error.message, ...meta });
				}
			}
		}
	} finally {
		for (const browser of browsers.values()) {
			await browser.close().catch(() => {});
		}
	}

	return results;
}

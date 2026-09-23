import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { engineFor } from "./browsers.js";
import { loadStorageState } from "./sessions.js";

function sanitizeForFilename(value) {
	return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function filenameFor(host, presetName, orientation) {
	return `${sanitizeForFilename(host)}_${sanitizeForFilename(presetName)}_${orientation}.png`;
}

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
 * Captures `url` across every (preset, orientation) selection, writing PNGs
 * into outputDir. Calls onProgress after each shot with a status update.
 * Reuses one browser instance per engine (chromium/webkit) across selections.
 */
export async function runCapture({ url, selections, presets, outputDir, options }, onProgress) {
	mkdirSync(outputDir, { recursive: true });
	const host = new URL(url).host;
	const storageState = loadStorageState(host);
	const browsers = new Map();
	const results = [];

	const presetById = new Map(presets.map((preset) => [preset.id, preset]));

	try {
		for (const selection of selections) {
			const preset = presetById.get(selection.presetId);
			if (!preset) continue;
			const { orientation } = selection;
			const label = `${preset.name} (${orientation})`;

			try {
				if (!browsers.has(preset.engine)) {
					const engine = engineFor(preset.engine);
					browsers.set(preset.engine, await engine.launch());
				}
				const browser = browsers.get(preset.engine);

				const isLandscape = orientation === "landscape";
				const viewport = {
					width: isLandscape ? preset.height : preset.width,
					height: isLandscape ? preset.width : preset.height,
				};

				const context = await browser.newContext({
					viewport,
					deviceScaleFactor: preset.deviceScaleFactor,
					isMobile: preset.isMobile,
					hasTouch: preset.hasTouch,
					userAgent: preset.userAgent || undefined,
					ignoreHTTPSErrors: options.ignoreHttpsErrors,
					storageState,
				});

				const page = await context.newPage();
				onProgress?.({ label, status: "loading" });
				await page.goto(url, { waitUntil: "load", timeout: 60000 });

				if (options.scrollThrough) {
					onProgress?.({ label, status: "scrolling" });
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

				const filename = filenameFor(host, preset.name, orientation);
				const filePath = join(outputDir, filename);
				onProgress?.({ label, status: "capturing" });
				await page.screenshot({ path: filePath, fullPage: options.fullPage });

				await context.close();
				const fileUrl = pathToFileURL(filePath).href;
				onProgress?.({ label, status: "done", filePath, fileUrl });
				results.push({ label, filePath, fileUrl, ok: true });
			} catch (error) {
				onProgress?.({ label, status: "error", message: error.message });
				results.push({ label, ok: false, message: error.message });
			}
		}
	} finally {
		for (const browser of browsers.values()) {
			await browser.close().catch(() => {});
		}
	}

	return results;
}

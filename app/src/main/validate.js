const ENGINES = new Set(["chromium", "webkit"]);
const ORIENTATIONS = new Set(["portrait", "landscape"]);

export function isPlainObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidUrl(value) {
	if (typeof value !== "string" || value.trim() === "") return false;
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export function isValidPresetDefinition(preset) {
	if (!isPlainObject(preset)) return false;
	if (typeof preset.name !== "string" || preset.name.trim() === "") return false;
	if (!Number.isFinite(preset.width) || preset.width <= 0 || preset.width > 8000) return false;
	if (!Number.isFinite(preset.height) || preset.height <= 0 || preset.height > 8000) return false;
	if (!Number.isFinite(preset.deviceScaleFactor) || preset.deviceScaleFactor <= 0 || preset.deviceScaleFactor > 6) return false;
	if (typeof preset.isMobile !== "boolean") return false;
	if (typeof preset.hasTouch !== "boolean") return false;
	if (!ENGINES.has(preset.engine)) return false;
	if (typeof preset.userAgent !== "string") return false;
	return true;
}

export function isValidCaptureRequest(request) {
	if (!isPlainObject(request)) return false;
	if (!isValidUrl(request.url)) return false;
	if (!Array.isArray(request.selections) || request.selections.length === 0) return false;
	for (const selection of request.selections) {
		if (!isPlainObject(selection)) return false;
		if (typeof selection.presetId !== "string" || selection.presetId.trim() === "") return false;
		if (!ORIENTATIONS.has(selection.orientation)) return false;
	}
	if (typeof request.outputDir !== "string" || request.outputDir.trim() === "") return false;
	if (!isPlainObject(request.options)) return false;
	const { options } = request;
	if (typeof options.fullPage !== "boolean") return false;
	if (typeof options.scrollThrough !== "boolean") return false;
	if (!Number.isFinite(options.settleDelayMs) || options.settleDelayMs < 0 || options.settleDelayMs > 60000) return false;
	if (options.injectCss != null && typeof options.injectCss !== "string") return false;
	if (options.injectJs != null && typeof options.injectJs !== "string") return false;
	return true;
}

export function isValidHost(value) {
	return typeof value === "string" && /^[a-z0-9.-]+(:\d+)?$/i.test(value);
}

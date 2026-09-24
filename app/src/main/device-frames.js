import { app } from "electron";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

function manifestPath() {
	// Packaged: shipped as an extraResource, alongside the frame PNGs. Dev:
	// read straight from /data and /resources.
	return app.isPackaged ? join(process.resourcesPath, "device-frames.json") : join(app.getAppPath(), "data", "device-frames.json");
}

function framesDir() {
	return app.isPackaged
		? join(process.resourcesPath, "device-frames")
		: join(app.getAppPath(), "resources", "devices", "frames");
}

let manifestCache = null;

function loadManifest() {
	if (manifestCache) return manifestCache;
	const raw = readFileSync(manifestPath(), "utf-8");
	manifestCache = JSON.parse(raw);
	return manifestCache;
}

export function frameFilePath(variant) {
	return join(framesDir(), variant.file);
}

/** Devices with their variants, plus a `previewUrl` (file://) for each variant's frame PNG. */
export function listDeviceFrames() {
	const { devices } = loadManifest();
	return devices.map((device) => ({
		...device,
		variants: device.variants.map((variant) => ({
			...variant,
			previewUrl: pathToFileURL(frameFilePath(variant)).href,
		})),
	}));
}

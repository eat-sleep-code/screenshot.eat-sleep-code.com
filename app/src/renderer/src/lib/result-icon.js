import { Smartphone, Tablet, Laptop, Monitor, Fullscreen } from "lucide-react";

/**
 * Picks the icon (and whether it needs a 90° CCW rotation) representing a
 * capture result or progress item, given the `kind`/`presetId`/`orientation`/
 * `deviceKind` metadata that main/capture.js attaches to it. Device-frame
 * overlay entries built in capture-view.jsx carry the same fields as their
 * parent device capture, so they resolve to the same icon.
 */
export function getResultIcon({ kind, presetId, orientation }, presets) {
	if (kind === "fullpage") {
		return { Icon: Fullscreen, rotate: false };
	}

	const preset = presets.find((candidate) => candidate.id === presetId);
	if (!preset) return { Icon: Monitor, rotate: false };

	if (preset.family === "Phones" || preset.family === "Foldables") {
		return { Icon: Smartphone, rotate: orientation === "landscape" };
	}
	if (preset.family === "Tablets") {
		return { Icon: Tablet, rotate: orientation === "landscape" };
	}

	const isLaptop =
		preset.id === "laptop" ||
		preset.deviceFrameId?.includes("macbook") ||
		preset.name?.toLowerCase().includes("laptop");
	return { Icon: isLaptop ? Laptop : Monitor, rotate: false };
}

/** Strips the trailing " (portrait)"/" (landscape)" suffix now shown as an icon instead. */
export function stripOrientationSuffix(label) {
	return label.replace(/\s*\((?:portrait|landscape)\)\s*$/i, "");
}

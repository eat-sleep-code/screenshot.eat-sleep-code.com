function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load ${src}`));
		img.src = src;
	});
}

/**
 * Composites `screenshotUrl` into `frameUrl`'s transparent screen cutout,
 * cover-fit (filling the cutout, cropping any overflow) so mismatched
 * aspect ratios don't letterbox, then draws the frame on top so its bezel
 * covers the screenshot's edges. Runs on a plain in-memory <canvas> in the
 * app's own renderer, so both images just need to be reachable file:// (or
 * blob:) URLs — no extra browser process involved.
 */
export async function compositeDeviceMockup({ screenshotUrl, frameUrl, canvasWidth, canvasHeight, screen }) {
	const [shot, frame] = await Promise.all([loadImage(screenshotUrl), loadImage(frameUrl)]);

	const canvas = document.createElement("canvas");
	canvas.width = canvasWidth;
	canvas.height = canvasHeight;
	const ctx = canvas.getContext("2d");

	const scale = Math.max(screen.width / shot.width, screen.height / shot.height);
	const drawWidth = shot.width * scale;
	const drawHeight = shot.height * scale;
	const dx = screen.x + (screen.width - drawWidth) / 2;
	const dy = screen.y + (screen.height - drawHeight) / 2;

	ctx.save();
	ctx.beginPath();
	ctx.rect(screen.x, screen.y, screen.width, screen.height);
	ctx.clip();
	ctx.drawImage(shot, dx, dy, drawWidth, drawHeight);
	ctx.restore();

	ctx.drawImage(frame, 0, 0, canvasWidth, canvasHeight);

	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null"))), "image/png");
	});
}

export function findDeviceFrameVariant(deviceFrames, variantId) {
	for (const device of deviceFrames) {
		const variant = device.variants.find((v) => v.id === variantId);
		if (variant) return { device, variant };
	}
	return null;
}

/**
 * Devices with both orientations (phones, tablets) ship separate portrait
 * and landscape frame PNGs. If the requested variant doesn't match the
 * screenshot's orientation, swap to its same-color sibling so a batch of
 * mixed portrait/landscape captures doesn't get force-cropped into the
 * wrong frame shape.
 */
export function matchOrientation(device, variant, orientation) {
	if (!orientation || variant.orientation === orientation) return variant;
	const sibling = device.variants.find((v) => v.color === variant.color && v.orientation === orientation);
	return sibling ?? variant;
}

/** Recovers "portrait"/"landscape" from a capture result's label, e.g. "iPhone 18 Pro (portrait)". */
export function orientationFromLabel(label) {
	if (label.endsWith("(portrait)")) return "portrait";
	if (label.endsWith("(landscape)")) return "landscape";
	return null;
}

/** Inserts `suffix` before the extension of a filename or full path. */
export function withFilenameSuffix(filePath, suffix) {
	const base = filePath.split(/[\\/]/).pop();
	const dot = base.lastIndexOf(".");
	return dot === -1 ? `${base}_${suffix}` : `${base.slice(0, dot)}_${suffix}${base.slice(dot)}`;
}

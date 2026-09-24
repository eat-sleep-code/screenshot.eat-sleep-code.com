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

/**
 * Picks the frame variant for `color` that matches `orientation`. Devices
 * with both orientations (phones, tablets) ship separate portrait/landscape
 * PNGs per color; devices with a single fixed shape (laptops, displays)
 * have one variant per color with orientation: null, which fits either.
 */
export function pickVariant(device, color, orientation) {
	return (
		device.variants.find((v) => v.color === color && v.orientation === orientation) ??
		device.variants.find((v) => v.color === color && v.orientation == null) ??
		device.variants.find((v) => v.color === color) ??
		null
	);
}

/** Inserts `suffix` before the extension of a filename or full path. */
export function withFilenameSuffix(filePath, suffix) {
	const base = filePath.split(/[\\/]/).pop();
	const dot = base.lastIndexOf(".");
	return dot === -1 ? `${base}_${suffix}` : `${base.slice(0, dot)}_${suffix}${base.slice(dot)}`;
}

function loadImage(src) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error(`Failed to load ${src}`));
		img.src = src;
	});
}

/**
 * Floods outward from the screen cutout's center over the frame's
 * transparent pixels, producing a mask that covers only that connected
 * cutout region — not the frame's other transparent pixels (the background
 * outside the device body, which is transparent for the same reason but is
 * a separate, unconnected region). A plain "invert the whole alpha channel"
 * mask can't tell those apart, and right at the device's rounded corners
 * the cutout's bounding box grazes that outside-the-body background, which
 * would let the screenshot leak through there too.
 */
function floodFillCutoutMask(frame, canvasWidth, canvasHeight, screen) {
	const sampleCanvas = document.createElement("canvas");
	sampleCanvas.width = canvasWidth;
	sampleCanvas.height = canvasHeight;
	const sampleCtx = sampleCanvas.getContext("2d");
	sampleCtx.drawImage(frame, 0, 0, canvasWidth, canvasHeight);
	const frameData = sampleCtx.getImageData(0, 0, canvasWidth, canvasHeight);
	const frameAlpha = frameData.data;

	const w = canvasWidth;
	const h = canvasHeight;
	const TRANSPARENT_THRESHOLD = 128;
	const visited = new Uint8Array(w * h);
	const stack = new Int32Array(w * h);
	let stackLength = 0;

	const startX = Math.min(w - 1, Math.max(0, Math.round(screen.x + screen.width / 2)));
	const startY = Math.min(h - 1, Math.max(0, Math.round(screen.y + screen.height / 2)));
	const startIdx = startY * w + startX;
	visited[startIdx] = 1;
	stack[stackLength++] = startIdx;

	const tryPush = (idx) => {
		if (!visited[idx] && frameAlpha[idx * 4 + 3] < TRANSPARENT_THRESHOLD) {
			visited[idx] = 1;
			stack[stackLength++] = idx;
		}
	};

	while (stackLength > 0) {
		const idx = stack[--stackLength];
		const x = idx % w;
		const y = (idx - x) / w;
		if (x > 0) tryPush(idx - 1);
		if (x < w - 1) tryPush(idx + 1);
		if (y > 0) tryPush(idx - w);
		if (y < h - 1) tryPush(idx + w);
	}

	const maskData = sampleCtx.createImageData(w, h);
	const maskPixels = maskData.data;
	for (let i = 0; i < visited.length; i++) {
		if (visited[i]) maskPixels[i * 4 + 3] = 255 - frameAlpha[i * 4 + 3];
	}

	const maskCanvas = document.createElement("canvas");
	maskCanvas.width = w;
	maskCanvas.height = h;
	maskCanvas.getContext("2d").putImageData(maskData, 0, 0);
	return maskCanvas;
}

/**
 * Composites `screenshotUrl` into `frameUrl`'s transparent screen cutout,
 * cover-fit (filling the cutout, cropping any overflow) so mismatched
 * aspect ratios don't letterbox, then draws the frame on top so its bezel
 * covers the screenshot's edges. Runs on a plain in-memory <canvas> in the
 * app's own renderer, so both images just need to be reachable file:// (or
 * blob:) URLs — no extra browser process involved.
 *
 * `screen` gives the cutout's bounding box, but the cutout itself is
 * rounded (or otherwise non-rectangular) — clipping to that box alone would
 * let the screenshot's square corners poke out past the frame's curves. So
 * after the box clip, the screenshot is further masked to the cutout's
 * exact silhouette (see `floodFillCutoutMask`) before the frame is drawn on
 * top.
 */
export async function compositeDeviceMockup({ screenshotUrl, frameUrl, canvasWidth, canvasHeight, screen }) {
	const [shot, frame] = await Promise.all([loadImage(screenshotUrl), loadImage(frameUrl)]);

	const maskCanvas = floodFillCutoutMask(frame, canvasWidth, canvasHeight, screen);

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

	ctx.globalCompositeOperation = "destination-in";
	ctx.drawImage(maskCanvas, 0, 0);
	ctx.globalCompositeOperation = "source-over";

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

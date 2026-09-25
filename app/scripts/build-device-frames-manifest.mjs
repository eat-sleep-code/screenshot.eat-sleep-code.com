// Dev-only tool: derives data/device-frames.json from the frame PNGs in
// resources/devices/frames/. Each frame's screen cutout is found by looking
// for the connected component of fully-transparent alpha pixels that does
// NOT touch the canvas edge (the outer background is transparent too, but
// touches the edge; the screen cutout is an isolated island inside the
// bezel). Requires ImageMagick's `magick` on PATH. Re-run this whenever
// frame PNGs are added/changed; the output is committed, not generated at
// app runtime.
import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMES_DIR = join(__dirname, "..", "resources", "devices", "frames");
const OUT_FILE = join(__dirname, "..", "data", "device-frames.json");

const DEVICE_META = {
	"iphone-18-pro": { label: "iPhone 18 Pro", family: "Phones" },
	"iphone-18-pro-max": { label: "iPhone 18 Pro Max", family: "Phones" },
	"iphone-duo": { label: "iPhone Duo", family: "Foldables" },
	"ipad-pro-11": { label: 'iPad Pro 11"', family: "Tablets" },
	"ipad-pro-13": { label: 'iPad Pro 13"', family: "Tablets" },
	"ipad-a16": { label: "iPad", family: "Tablets" },
	"pixel-10": { label: "Pixel 10", family: "Phones" },
	"pixel-10-pro": { label: "Pixel 10 Pro", family: "Phones" },
	"pixel-10-pro-fold": { label: "Pixel 10 Pro Fold", family: "Foldables" },
	"macbook-air-13": { label: "MacBook Air 13-inch", family: "Laptops" },
	"macbook-air-15": { label: "MacBook Air 15-inch", family: "Laptops" },
	"macbook-pro-14": { label: "MacBook Pro 14-inch", family: "Laptops" },
	"macbook-pro-16": { label: "MacBook Pro 16-inch", family: "Laptops" },
	"macbook-neo": { label: "MacBook Neo", family: "Laptops" },
	"studio-display": { label: "Studio Display", family: "Desktops" },
	"studio-display-xdr": { label: "Studio Display XDR", family: "Desktops" },
};

function titleCase(slug) {
	return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function parseVariant(filename) {
	const name = filename.replace(/\.png$/i, "");
	const orientationMatch = name.match(/-(portrait|landscape)$/);
	const orientation = orientationMatch ? orientationMatch[1] : null;
	const colorSlug = orientation ? name.slice(0, -(orientationMatch[0].length)) : name;
	return { orientation, color: titleCase(colorSlug) };
}

function magick(args) {
	return execFileSync("magick", args, { encoding: "utf-8", maxBuffer: 1024 * 1024 * 32 });
}

function analyzeFrame(filePath) {
	const identifyOut = magick(["identify", "-format", "%w %h", filePath]);
	const [canvasWidth, canvasHeight] = identifyOut.trim().split(/\s+/).map(Number);

	const ccOut = magick([
		filePath,
		"-alpha", "extract",
		"-threshold", "50%",
		"-define", "connected-components:verbose=true",
		"-connected-components", "4",
		"-auto-level",
		"null:",
	]);

	// Lines look like: "  2: 1668x2420+106+110 939.5,1319.5 4033470 srgb(0,0,0)"
	const components = ccOut
		.split("\n")
		.map((line) => line.match(/^\s*\d+:\s+(\d+)x(\d+)\+(\d+)\+(\d+)\s+[\d.]+,[\d.]+\s+([\d.e+]+)\s+srgb\((\d+),(\d+),(\d+)\)/))
		.filter(Boolean)
		.map((m) => ({
			width: Number(m[1]),
			height: Number(m[2]),
			x: Number(m[3]),
			y: Number(m[4]),
			area: Number(m[5]),
			isBlack: Number(m[6]) < 128,
		}));

	// Transparent (black-on-mask) components that don't span the full canvas
	// are screen cutouts; the one spanning the full canvas is the outer
	// background, not a screen.
	const screens = components
		.filter((c) => c.isBlack && !(c.width === canvasWidth && c.height === canvasHeight))
		.filter((c) => c.area > (canvasWidth * canvasHeight) * 0.01) // drop tiny alpha-antialiasing specks
		.sort((a, b) => b.area - a.area);

	return { canvasWidth, canvasHeight, screens };
}

const devices = [];

for (const deviceId of readdirSync(FRAMES_DIR)) {
	const meta = DEVICE_META[deviceId];
	if (!meta) {
		console.warn(`Skipping unknown device folder: ${deviceId}`);
		continue;
	}
	const dir = join(FRAMES_DIR, deviceId);
	const variants = [];

	for (const filename of readdirSync(dir).sort()) {
		if (!filename.toLowerCase().endsWith(".png")) continue;
		const filePath = join(dir, filename);
		const { orientation, color } = parseVariant(filename);
		const { canvasWidth, canvasHeight, screens } = analyzeFrame(filePath);

		if (screens.length !== 1) {
			console.warn(
				`Skipping ${deviceId}/${filename}: found ${screens.length} screen region(s), expected exactly 1 (multi-screen frames aren't supported yet).`
			);
			continue;
		}

		const screen = screens[0];
		variants.push({
			id: `${deviceId}-${filename.replace(/\.png$/i, "")}`,
			color,
			orientation,
			file: `${deviceId}/${filename}`,
			canvasWidth,
			canvasHeight,
			screen: { x: screen.x, y: screen.y, width: screen.width, height: screen.height },
		});
		console.log(`${deviceId}/${filename}: canvas ${canvasWidth}x${canvasHeight}, screen ${JSON.stringify(screen)}`);
	}

	if (variants.length > 0) {
		devices.push({ id: deviceId, label: meta.label, family: meta.family, variants });
	}
}

writeFileSync(OUT_FILE, JSON.stringify({ devices }, null, "\t") + "\n");
console.log(`\nWrote ${OUT_FILE} with ${devices.length} devices, ${devices.reduce((n, d) => n + d.variants.length, 0)} variants.`);

import { app, BrowserWindow, session } from "electron";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Must run before `playwright` is imported anywhere (including
// transitively, e.g. by ./browsers.js), so install and launch agree on
// where browser binaries live. A static `import` of anything that itself
// imports `playwright` would be hoisted above this assignment, so every
// other main-process module is imported dynamically, below.
process.env.PLAYWRIGHT_BROWSERS_PATH = join(app.getPath("userData"), "browsers");

const { registerIpcHandlers } = await import("./ipc.js");

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const isDev = !app.isPackaged;

const CSP = [
	"default-src 'self'",
	"script-src 'self'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob: file:",
	"connect-src 'self' https://api.github.com https:",
	"font-src 'self'",
	"object-src 'none'",
	"base-uri 'none'",
].join("; ");

let mainWindow = null;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1280,
		height: 860,
		minWidth: 960,
		minHeight: 640,
		show: false,
		webPreferences: {
			preload: join(__dirname, "../preload/index.js"),
			contextIsolation: true,
			sandbox: true,
			nodeIntegration: false,
			webviewTag: false,
		},
	});

	mainWindow.once("ready-to-show", () => mainWindow.show());

	if (isDev) {
		mainWindow.webContents.on("console-message", (event) => {
			console.log("[renderer]", event.message);
		});
	}

	mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

	if (isDev && process.env.ELECTRON_RENDERER_URL) {
		mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
	} else {
		mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
	}

	return mainWindow;
}

app.whenReady().then(() => {
	session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
		callback({
			responseHeaders: {
				...details.responseHeaders,
				"Content-Security-Policy": [CSP],
			},
		});
	});

	registerIpcHandlers(() => mainWindow);
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

// Playwright launches its own browser windows for the "Sign in" flow — deny
// any renderer-initiated navigation away from the app shell, and block new
// windows from the renderer's own webContents (already denied above).
app.on("web-contents-created", (_event, contents) => {
	contents.on("will-navigate", (navigationEvent, url) => {
		if (contents === mainWindow?.webContents && !url.startsWith("file://") && !isDev) {
			navigationEvent.preventDefault();
		}
	});
});

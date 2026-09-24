import { ipcMain, dialog, shell, nativeTheme, app } from "electron";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;
// Install explicitly via updates:install once the user confirms, instead of
// electron-updater's implicit install-on-quit: that path races the NSIS
// installer against our own app.quit() (window-all-closed), which is how the
// old install gets removed while the new one never finishes installing.
autoUpdater.autoInstallOnAppQuit = false;
import { listPresets, addPreset, updatePreset, deletePreset } from "./presets.js";
import { listDeviceFrames } from "./device-frames.js";
import { runCapture } from "./capture.js";
import { signIn, listSessions, removeSession, hasSession } from "./sessions.js";
import { areBrowsersInstalled, installBrowsers } from "./browsers.js";
import { getSetting, setSetting } from "./store.js";
import { isValidUrl, isValidCaptureRequest, isValidPresetDefinition, isValidHost } from "./validate.js";

const SAFE_MOCKUP_FILENAME = /^[a-z0-9._-]+\.png$/i;

function badRequest(message) {
	throw new Error(`Invalid request: ${message}`);
}

export function registerIpcHandlers(getMainWindow) {
	ipcMain.handle("presets:list", () => listPresets());

	ipcMain.handle("presets:add", (_event, definition) => {
		if (!isValidPresetDefinition(definition)) badRequest("preset definition");
		return addPreset(definition);
	});

	ipcMain.handle("presets:update", (_event, id, definition) => {
		if (typeof id !== "string" || !isValidPresetDefinition(definition)) badRequest("preset definition");
		return updatePreset(id, definition);
	});

	ipcMain.handle("presets:delete", (_event, id) => {
		if (typeof id !== "string") badRequest("preset id");
		deletePreset(id);
	});

	ipcMain.handle("deviceFrames:list", () => listDeviceFrames());

	ipcMain.handle("deviceFrames:saveMockup", (_event, { outputDir, filename, buffer }) => {
		if (typeof outputDir !== "string" || outputDir.trim() === "") badRequest("output dir");
		if (typeof filename !== "string" || !SAFE_MOCKUP_FILENAME.test(filename)) badRequest("mockup filename");
		const filePath = join(outputDir, filename);
		writeFileSync(filePath, Buffer.from(buffer));
		return { filePath, fileUrl: pathToFileURL(filePath).href };
	});

	ipcMain.handle("output:chooseFolder", async () => {
		const win = getMainWindow();
		const result = await dialog.showOpenDialog(win, {
			properties: ["openDirectory", "createDirectory"],
		});
		if (result.canceled || result.filePaths.length === 0) return null;
		const dir = result.filePaths[0];
		setSetting("lastOutputDir", dir);
		return dir;
	});

	ipcMain.handle("output:getLast", () => getSetting("lastOutputDir"));

	ipcMain.handle("output:openFolder", (_event, dir) => {
		if (typeof dir !== "string") badRequest("output dir");
		return shell.openPath(dir);
	});

	ipcMain.handle("output:openFile", (_event, filePath) => {
		if (typeof filePath !== "string") badRequest("output file");
		return shell.openPath(filePath);
	});

	ipcMain.handle("capture:start", async (event, request) => {
		if (!isValidCaptureRequest(request)) badRequest("capture request");
		const presets = listPresets();
		return runCapture(
			{ ...request, presets },
			(update) => event.sender.send("capture:progress", update)
		);
	});

	ipcMain.handle("session:signIn", async (_event, { url, engine }) => {
		if (!isValidUrl(url)) badRequest("url");
		if (engine !== "chromium" && engine !== "webkit") badRequest("engine");
		return signIn(url, engine);
	});

	ipcMain.handle("session:list", () => listSessions());

	ipcMain.handle("session:has", (_event, host) => {
		if (!isValidHost(host)) badRequest("host");
		return hasSession(host);
	});

	ipcMain.handle("session:remove", (_event, host) => {
		if (!isValidHost(host)) badRequest("host");
		removeSession(host);
	});

	ipcMain.handle("browsers:isInstalled", () => areBrowsersInstalled());

	ipcMain.handle("browsers:install", async (event) => {
		await installBrowsers((line) => event.sender.send("browsers:progress", line));
	});

	ipcMain.handle("theme:get", () => (nativeTheme.shouldUseDarkColors ? "dark" : "light"));

	ipcMain.handle("theme:getPreference", () => nativeTheme.themeSource);

	ipcMain.handle("theme:setPreference", (_event, value) => {
		if (value !== "system" && value !== "light" && value !== "dark") badRequest("theme preference");
		nativeTheme.themeSource = value;
		setSetting("themePreference", value);
	});

	ipcMain.handle("app:getVersion", () => app.getVersion());

	ipcMain.handle("shell:openExternal", (_event, url) => {
		if (!isValidUrl(url)) badRequest("url");
		return shell.openExternal(url);
	});

	ipcMain.handle("updates:check", async (event) => {
		try {
			const result = await autoUpdater.checkForUpdates();
			return { updateAvailable: Boolean(result?.updateInfo), info: result?.updateInfo ?? null };
		} catch (error) {
			event.sender.send("updates:status", { status: "error", message: error.message });
			return { updateAvailable: false, error: error.message };
		}
	});

	ipcMain.handle("updates:install", () => {
		autoUpdater.quitAndInstall(false, true);
	});

	nativeTheme.on("updated", () => {
		getMainWindow()?.webContents.send("theme:changed", nativeTheme.shouldUseDarkColors ? "dark" : "light");
	});

	autoUpdater.on("update-downloaded", () => {
		getMainWindow()?.webContents.send("updates:status", { status: "downloaded" });
	});
	autoUpdater.on("download-progress", (progress) => {
		getMainWindow()?.webContents.send("updates:status", { status: "downloading", percent: progress.percent });
	});
}

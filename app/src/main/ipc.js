import { ipcMain, dialog, shell, nativeTheme, app } from "electron";
import electronUpdater from "electron-updater";

const { autoUpdater } = electronUpdater;
import { listPresets, addPreset, updatePreset, deletePreset } from "./presets.js";
import { runCapture } from "./capture.js";
import { signIn, listSessions, removeSession, hasSession } from "./sessions.js";
import { areBrowsersInstalled, installBrowsers } from "./browsers.js";
import { getSetting, setSetting, updateSetting } from "./store.js";
import { isValidUrl, isValidCaptureRequest, isValidPresetDefinition, isValidHost } from "./validate.js";

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

	ipcMain.handle("capture:start", async (event, request) => {
		if (!isValidCaptureRequest(request)) badRequest("capture request");
		const presets = listPresets();
		return runCapture(
			{ ...request, presets },
			(update) => event.sender.send("capture:progress", update)
		);
	});

	ipcMain.handle("session:signIn", async (_event, { url, engine, ignoreHttpsErrors }) => {
		if (!isValidUrl(url)) badRequest("url");
		if (engine !== "chromium" && engine !== "webkit") badRequest("engine");
		return signIn(url, engine, Boolean(ignoreHttpsErrors));
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

	ipcMain.handle("settings:getIgnoreHttps", (_event, host) => {
		if (!isValidHost(host)) badRequest("host");
		return (getSetting("ignoreHttpsHosts") ?? []).includes(host);
	});

	ipcMain.handle("settings:setIgnoreHttps", (_event, host, value) => {
		if (!isValidHost(host)) badRequest("host");
		updateSetting("ignoreHttpsHosts", (hosts = []) =>
			value ? [...new Set([...hosts, host])] : hosts.filter((h) => h !== host)
		);
	});

	ipcMain.handle("browsers:isInstalled", () => areBrowsersInstalled());

	ipcMain.handle("browsers:install", async (event) => {
		await installBrowsers((line) => event.sender.send("browsers:progress", line));
	});

	ipcMain.handle("theme:get", () => (nativeTheme.shouldUseDarkColors ? "dark" : "light"));

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

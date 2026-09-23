import { contextBridge, ipcRenderer } from "electron";

function subscribe(channel, callback) {
	const listener = (_event, payload) => callback(payload);
	ipcRenderer.on(channel, listener);
	return () => ipcRenderer.removeListener(channel, listener);
}

const api = {
	presets: {
		list: () => ipcRenderer.invoke("presets:list"),
		add: (definition) => ipcRenderer.invoke("presets:add", definition),
		update: (id, definition) => ipcRenderer.invoke("presets:update", id, definition),
		remove: (id) => ipcRenderer.invoke("presets:delete", id),
	},
	output: {
		chooseFolder: () => ipcRenderer.invoke("output:chooseFolder"),
		getLast: () => ipcRenderer.invoke("output:getLast"),
		openFolder: (dir) => ipcRenderer.invoke("output:openFolder", dir),
	},
	capture: {
		start: (request) => ipcRenderer.invoke("capture:start", request),
		onProgress: (callback) => subscribe("capture:progress", callback),
	},
	session: {
		signIn: (url, engine) => ipcRenderer.invoke("session:signIn", { url, engine }),
		list: () => ipcRenderer.invoke("session:list"),
		has: (host) => ipcRenderer.invoke("session:has", host),
		remove: (host) => ipcRenderer.invoke("session:remove", host),
	},
	browsers: {
		isInstalled: () => ipcRenderer.invoke("browsers:isInstalled"),
		install: () => ipcRenderer.invoke("browsers:install"),
		onProgress: (callback) => subscribe("browsers:progress", callback),
	},
	theme: {
		get: () => ipcRenderer.invoke("theme:get"),
		onChange: (callback) => subscribe("theme:changed", callback),
		getPreference: () => ipcRenderer.invoke("theme:getPreference"),
		setPreference: (value) => ipcRenderer.invoke("theme:setPreference", value),
	},
	updates: {
		check: () => ipcRenderer.invoke("updates:check"),
		onStatus: (callback) => subscribe("updates:status", callback),
	},
	app: {
		getVersion: () => ipcRenderer.invoke("app:getVersion"),
	},
	shell: {
		openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
	},
};

contextBridge.exposeInMainWorld("deviceScreenshotApi", api);

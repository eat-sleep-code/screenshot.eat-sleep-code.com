import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const STORE_PATH = join(app.getPath("userData"), "settings.json");

const DEFAULTS = {
	customPresets: [],
	lastOutputDir: null,
};

function readStore() {
	try {
		if (!existsSync(STORE_PATH)) return { ...DEFAULTS };
		const raw = readFileSync(STORE_PATH, "utf-8");
		return { ...DEFAULTS, ...JSON.parse(raw) };
	} catch {
		return { ...DEFAULTS };
	}
}

function writeStore(data) {
	mkdirSync(dirname(STORE_PATH), { recursive: true });
	writeFileSync(STORE_PATH, JSON.stringify(data, null, "\t"), "utf-8");
}

export function getSetting(key) {
	return readStore()[key];
}

export function setSetting(key, value) {
	const data = readStore();
	data[key] = value;
	writeStore(data);
	return value;
}

export function updateSetting(key, updater) {
	const data = readStore();
	data[key] = updater(data[key]);
	writeStore(data);
	return data[key];
}

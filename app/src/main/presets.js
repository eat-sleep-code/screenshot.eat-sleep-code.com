import { app } from "electron";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getSetting, setSetting } from "./store.js";
import { isValidPresetDefinition } from "./validate.js";

function seedPath() {
	// Packaged: shipped as an extraResource. Dev: read straight from /data.
	return app.isPackaged
		? join(process.resourcesPath, "presets.json")
		: join(app.getAppPath(), "data", "presets.json");
}

let seedCache = null;

function loadSeedPresets() {
	if (seedCache) return seedCache;
	const raw = readFileSync(seedPath(), "utf-8");
	const parsed = JSON.parse(raw);
	seedCache = parsed.presets.map((preset) => ({ ...preset, custom: false }));
	return seedCache;
}

export function listPresets() {
	const custom = getSetting("customPresets") ?? [];
	return [...loadSeedPresets(), ...custom.map((preset) => ({ ...preset, custom: true }))];
}

export function addPreset(definition) {
	if (!isValidPresetDefinition(definition)) {
		throw new Error("Invalid preset definition");
	}
	const preset = { ...definition, id: randomUUID(), custom: true };
	setSetting("customPresets", [...(getSetting("customPresets") ?? []), preset]);
	return preset;
}

export function updatePreset(id, definition) {
	if (!isValidPresetDefinition(definition)) {
		throw new Error("Invalid preset definition");
	}
	const custom = getSetting("customPresets") ?? [];
	if (!custom.some((preset) => preset.id === id)) {
		throw new Error("Preset not found or not editable");
	}
	const next = custom.map((preset) => (preset.id === id ? { ...definition, id, custom: true } : preset));
	setSetting("customPresets", next);
	return next.find((preset) => preset.id === id);
}

export function deletePreset(id) {
	const custom = getSetting("customPresets") ?? [];
	setSetting("customPresets", custom.filter((preset) => preset.id !== id));
}

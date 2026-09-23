import { useMemo, useState } from "react";
import { Checkbox } from "@headlessui/react";
import { Check, Pencil, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useTranslation } from "../../../hooks/use-translation.jsx";
import PresetEditorModal from "./preset-editor-modal.jsx";

function groupByFamily(presets) {
	const groups = new Map();
	for (const preset of presets) {
		if (!groups.has(preset.family)) groups.set(preset.family, []);
		groups.get(preset.family).push(preset);
	}
	return groups;
}

export default function PresetPicker({ presets, selections, onSelectionsChange, onPresetsChanged }) {
	const t = useTranslation();
	const [editing, setEditing] = useState(null); // null | "new" | preset object
	const grouped = useMemo(() => groupByFamily(presets), [presets]);

	const selectedOrientations = (presetId) =>
		selections.filter((selection) => selection.presetId === presetId).map((selection) => selection.orientation);

	function toggleOrientation(presetId, orientation) {
		const current = selectedOrientations(presetId);
		const has = current.includes(orientation);
		const withoutPresetOrientation = selections.filter(
			(selection) => !(selection.presetId === presetId && selection.orientation === orientation)
		);
		onSelectionsChange(has ? withoutPresetOrientation : [...withoutPresetOrientation, { presetId, orientation }]);
	}

	function selectAll() {
		const all = presets.flatMap((preset) => [
			{ presetId: preset.id, orientation: "portrait" },
			{ presetId: preset.id, orientation: "landscape" },
		]);
		onSelectionsChange(all);
	}

	function selectNone() {
		onSelectionsChange([]);
	}

	async function handleDelete(preset) {
		await window.deviceScreenshotApi.presets.remove(preset.id);
		onSelectionsChange(selections.filter((selection) => selection.presetId !== preset.id));
		onPresetsChanged();
	}

	return (
		<div>
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold">{t("presets.title")}</h2>
				<div className="flex gap-2">
					<button type="button" className="btn btn-tertiary" onClick={selectAll}>
						{t("presets.selectAll")}
					</button>
					<button type="button" className="btn btn-tertiary" onClick={selectNone}>
						{t("presets.selectNone")}
					</button>
					<button type="button" className="btn btn-secondary" onClick={() => setEditing("new")}>
						<Plus size={16} aria-hidden="true" />
						{t("presets.addCustom")}
					</button>
				</div>
			</div>

			<div className="mt-3 space-y-4">
				{[...grouped.entries()].map(([family, familyPresets]) => (
					<fieldset key={family}>
						<legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
							{family}
						</legend>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{familyPresets.map((preset) => {
								const orientations = selectedOrientations(preset.id);
								return (
									<div
										key={preset.id}
										className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3"
									>
										<div className="flex items-start justify-between gap-2">
											<div>
												<p className="text-sm font-medium flex items-center gap-1.5">
													{preset.name}
													{preset.needsVerification ? (
														<AlertTriangle
															size={14}
															className="text-amber-500"
															aria-label={t("presets.needsVerification")}
															title={t("presets.needsVerification")}
														/>
													) : null}
												</p>
												<p className="text-xs text-neutral-500 dark:text-neutral-400">
													{preset.width}&times;{preset.height} &middot; {preset.engine} &middot;{" "}
													{preset.custom ? t("presets.custom") : t("presets.builtIn")}
												</p>
											</div>
											{preset.custom ? (
												<div className="flex gap-1">
													<button
														type="button"
														className="btn btn-tertiary p-1.5"
														onClick={() => setEditing(preset)}
														aria-label={t("presets.editPreset")}
														title={t("presets.editPreset")}
													>
														<Pencil size={14} aria-hidden="true" />
													</button>
													<button
														type="button"
														className="btn btn-tertiary p-1.5"
														onClick={() => handleDelete(preset)}
														aria-label={t("presets.deletePreset")}
														title={t("presets.deletePreset")}
													>
														<Trash2 size={14} aria-hidden="true" />
													</button>
												</div>
											) : null}
										</div>
										<div className="mt-2 flex gap-3">
											{["portrait", "landscape"].map((orientation) => (
												<label key={orientation} className="flex items-center gap-1.5 text-sm">
													<Checkbox
														checked={orientations.includes(orientation)}
														onChange={() => toggleOrientation(preset.id, orientation)}
														className="group flex h-5 w-5 items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 data-[checked]:bg-cyan-600 data-[checked]:border-cyan-600"
													>
														<Check size={14} className="hidden text-white group-data-[checked]:block" aria-hidden="true" />
													</Checkbox>
													{orientation === "portrait" ? t("presets.portrait") : t("presets.landscape")}
												</label>
											))}
										</div>
									</div>
								);
							})}
						</div>
					</fieldset>
				))}
			</div>

			{editing ? (
				<PresetEditorModal
					preset={editing === "new" ? null : editing}
					onClose={() => setEditing(null)}
					onSaved={() => {
						setEditing(null);
						onPresetsChanged();
					}}
				/>
			) : null}
		</div>
	);
}

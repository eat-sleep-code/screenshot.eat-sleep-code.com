import { useState } from "react";
import ModalShell from "../../ui/modal-shell.jsx";
import { useTranslation } from "../../../hooks/use-translation.jsx";

const EMPTY = {
	name: "",
	family: "Custom",
	width: 390,
	height: 844,
	deviceScaleFactor: 3,
	isMobile: true,
	hasTouch: true,
	engine: "chromium",
	userAgent: "",
};

export default function PresetEditorModal({ preset, onClose, onSaved }) {
	const t = useTranslation();
	const [form, setForm] = useState(preset ?? EMPTY);
	const [error, setError] = useState(null);
	const [saving, setSaving] = useState(false);

	function update(field, value) {
		setForm((current) => ({ ...current, [field]: value }));
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setSaving(true);
		setError(null);
		try {
			const definition = {
				...form,
				width: Number(form.width),
				height: Number(form.height),
				deviceScaleFactor: Number(form.deviceScaleFactor),
			};
			if (preset) {
				await window.deviceScreenshotApi.presets.update(preset.id, definition);
			} else {
				await window.deviceScreenshotApi.presets.add(definition);
			}
			onSaved();
		} catch (err) {
			setError(err.message);
		} finally {
			setSaving(false);
		}
	}

	return (
		<ModalShell open onClose={onClose} title={preset ? t("presets.editPreset") : t("presets.addCustom")}>
			<form className="space-y-3 mt-4" onSubmit={handleSubmit}>
				<div>
					<label className="field-label" htmlFor="preset-name">
						{t("presets.form.name")}
					</label>
					<input
						id="preset-name"
						className="field-input"
						required
						value={form.name}
						onChange={(event) => update("name", event.target.value)}
					/>
				</div>
				<div>
					<label className="field-label" htmlFor="preset-family">
						{t("presets.form.family")}
					</label>
					<input
						id="preset-family"
						className="field-input"
						required
						value={form.family}
						onChange={(event) => update("family", event.target.value)}
					/>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<div>
						<label className="field-label" htmlFor="preset-width">
							{t("presets.form.width")}
						</label>
						<input
							id="preset-width"
							type="number"
							min="1"
							max="8000"
							className="field-input"
							required
							value={form.width}
							onChange={(event) => update("width", event.target.value)}
						/>
					</div>
					<div>
						<label className="field-label" htmlFor="preset-height">
							{t("presets.form.height")}
						</label>
						<input
							id="preset-height"
							type="number"
							min="1"
							max="8000"
							className="field-input"
							required
							value={form.height}
							onChange={(event) => update("height", event.target.value)}
						/>
					</div>
				</div>
				<div>
					<label className="field-label" htmlFor="preset-dsf">
						{t("presets.form.deviceScaleFactor")}
					</label>
					<input
						id="preset-dsf"
						type="number"
						min="0.1"
						max="6"
						step="0.05"
						className="field-input"
						required
						value={form.deviceScaleFactor}
						onChange={(event) => update("deviceScaleFactor", event.target.value)}
					/>
				</div>
				<div className="flex gap-4">
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							className="h-4 w-4"
							checked={form.isMobile}
							onChange={(event) => update("isMobile", event.target.checked)}
						/>
						{t("presets.form.isMobile")}
					</label>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							className="h-4 w-4"
							checked={form.hasTouch}
							onChange={(event) => update("hasTouch", event.target.checked)}
						/>
						{t("presets.form.hasTouch")}
					</label>
				</div>
				<div>
					<label className="field-label" htmlFor="preset-engine">
						{t("presets.form.engine")}
					</label>
					<select
						id="preset-engine"
						className="field-input"
						value={form.engine}
						onChange={(event) => update("engine", event.target.value)}
					>
						<option value="chromium">Chromium</option>
						<option value="webkit">WebKit</option>
					</select>
				</div>
				<div>
					<label className="field-label" htmlFor="preset-ua">
						{t("presets.form.userAgent")}
					</label>
					<input
						id="preset-ua"
						className="field-input"
						value={form.userAgent}
						onChange={(event) => update("userAgent", event.target.value)}
					/>
				</div>

				{error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

				<div className="flex gap-2 pt-2">
					<button type="submit" className="btn btn-primary" disabled={saving}>
						{t("presets.form.save")}
					</button>
					<button type="button" className="btn btn-tertiary" onClick={onClose}>
						{t("presets.form.cancel")}
					</button>
				</div>
			</form>
		</ModalShell>
	);
}

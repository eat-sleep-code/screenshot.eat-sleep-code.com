import { ChevronRight } from "lucide-react";
import { useTranslation } from "../../hooks/use-translation.jsx";

export default function CaptureOptions({ options, onChange, deviceFrames }) {
	const t = useTranslation();

	function update(field, value) {
		onChange({ ...options, [field]: value });
	}

	function updateDeviceMockup(field, value) {
		update("deviceMockup", { ...options.deviceMockup, [field]: value });
	}

	return (
		<details className="group">
			<summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold mb-2 select-none">
				<ChevronRight size={16} className="transition-transform group-open:rotate-90" aria-hidden="true" />
				{t("options.title")}
			</summary>
			<div className="space-y-3 pl-1">
				<label className="flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						className="h-4 w-4"
						checked={options.fullPage}
						onChange={(event) => update("fullPage", event.target.checked)}
					/>
					{t("options.fullPage")}
				</label>

				<div>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							className="h-4 w-4"
							checked={options.scrollThrough}
							onChange={(event) => update("scrollThrough", event.target.checked)}
						/>
						{t("options.scrollThrough")}
					</label>
					<p className="ml-6 text-xs text-neutral-500 dark:text-neutral-400">{t("options.scrollThroughHint")}</p>
				</div>

				<div>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							className="h-4 w-4"
							checked={options.deviceMockup.enabled}
							onChange={(event) => {
								const enabled = event.target.checked;
								const variantId = options.deviceMockup.variantId ?? deviceFrames[0]?.variants[0]?.id ?? null;
								update("deviceMockup", { enabled, variantId });
							}}
						/>
						{t("options.deviceMockup")}
					</label>
					<p className="ml-6 text-xs text-neutral-500 dark:text-neutral-400">{t("options.deviceMockupHint")}</p>

					{options.deviceMockup.enabled ? (
						<div className="ml-6 mt-2 max-w-xs">
							<label className="field-label" htmlFor="device-mockup-variant">
								{t("options.deviceMockupVariant")}
							</label>
							<select
								id="device-mockup-variant"
								className="field-input"
								value={options.deviceMockup.variantId ?? ""}
								onChange={(event) => updateDeviceMockup("variantId", event.target.value)}
							>
								{deviceFrames.map((device) => (
									<optgroup key={device.id} label={device.label}>
										{device.variants.map((variant) => (
											<option key={variant.id} value={variant.id}>
												{variant.color}
												{variant.orientation ? ` (${variant.orientation === "portrait" ? t("presets.portrait") : t("presets.landscape")})` : ""}
											</option>
										))}
									</optgroup>
								))}
							</select>
						</div>
					) : null}
				</div>

				<div className="max-w-xs">
					<label className="field-label" htmlFor="settle-delay">
						{t("options.settleDelay")}
					</label>
					<input
						id="settle-delay"
						type="number"
						min="0"
						max="60000"
						step="100"
						className="field-input"
						value={options.settleDelayMs}
						onChange={(event) => update("settleDelayMs", Number(event.target.value))}
					/>
				</div>

				<div>
					<label className="field-label" htmlFor="inject-css">
						{t("options.injectCss")}
					</label>
					<textarea
						id="inject-css"
						className="field-input font-mono text-xs"
						rows={2}
						placeholder={t("options.injectCssPlaceholder")}
						value={options.injectCss}
						onChange={(event) => update("injectCss", event.target.value)}
					/>
				</div>

				<div>
					<label className="field-label" htmlFor="inject-js">
						{t("options.injectJs")}
					</label>
					<textarea
						id="inject-js"
						className="field-input font-mono text-xs"
						rows={2}
						placeholder={t("options.injectJsPlaceholder")}
						value={options.injectJs}
						onChange={(event) => update("injectJs", event.target.value)}
					/>
				</div>
			</div>
		</details>
	);
}

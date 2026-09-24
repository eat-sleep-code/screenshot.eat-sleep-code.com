import { Check, ChevronRight } from "lucide-react";
import { Checkbox, Field, Label } from "@headlessui/react";
import { useTranslation } from "../../hooks/use-translation.jsx";

export default function CaptureOptions({ options, onChange }) {
	const t = useTranslation();

	function update(field, value) {
		onChange({ ...options, [field]: value });
	}

	return (
		<details className="group">
			<summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold mb-2 select-none">
				<ChevronRight size={16} className="transition-transform group-open:rotate-90" aria-hidden="true" />
				{t("options.title")}
			</summary>
			<div className="space-y-3 pl-1">
				<div>
					<Field className="flex items-center gap-2 text-sm">
						<Checkbox
							checked={options.fullPage}
							onChange={(checked) => update("fullPage", checked)}
							className="group flex h-5 w-5 items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 data-[checked]:bg-cyan-600 data-[checked]:border-cyan-600"
						>
							<Check size={14} className="hidden text-white group-data-[checked]:block" aria-hidden="true" />
						</Checkbox>
						<Label className="cursor-pointer">{t("options.fullPage")}</Label>
					</Field>
					<p className="ml-7 text-xs text-neutral-500 dark:text-neutral-400">{t("options.fullPageHint")}</p>
				</div>

				<div>
					<Field className="flex items-center gap-2 text-sm">
						<Checkbox
							checked={options.scrollThrough}
							onChange={(checked) => update("scrollThrough", checked)}
							className="group flex h-5 w-5 items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 data-[checked]:bg-cyan-600 data-[checked]:border-cyan-600"
						>
							<Check size={14} className="hidden text-white group-data-[checked]:block" aria-hidden="true" />
						</Checkbox>
						<Label className="cursor-pointer">{t("options.scrollThrough")}</Label>
					</Field>
					<p className="ml-7 text-xs text-neutral-500 dark:text-neutral-400">{t("options.scrollThroughHint")}</p>
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

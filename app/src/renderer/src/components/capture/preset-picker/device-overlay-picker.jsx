import { Popover, PopoverButton, PopoverPanel, Checkbox, Field, Label } from "@headlessui/react";
import { Check, ChevronDown, MonitorSmartphone } from "lucide-react";
import { useTranslation } from "../../../hooks/use-translation.jsx";

/**
 * Per-preset "Device overlay" control. Shown next to a preset's
 * Portrait/Landscape checkboxes when that preset has a matching device
 * frame (preset.deviceFrameId). Devices with more than one color/finish
 * get a multi-select popover so several overlay colors can be generated
 * from the same capture; single-color devices (rare) collapse to a plain
 * checkbox.
 */
export default function DeviceOverlayPicker({ device, selectedColors, onChange }) {
	const t = useTranslation();
	const colors = [...new Set(device.variants.map((variant) => variant.color))];

	function toggleColor(color) {
		onChange(selectedColors.includes(color) ? selectedColors.filter((c) => c !== color) : [...selectedColors, color]);
	}

	if (colors.length <= 1) {
		const color = colors[0];
		return (
			<Field className="flex items-center gap-1.5 text-sm">
				<Checkbox
					checked={selectedColors.includes(color)}
					onChange={() => onChange(selectedColors.includes(color) ? [] : [color])}
					className="group flex h-5 w-5 items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 data-[checked]:bg-cyan-600 data-[checked]:border-cyan-600"
				>
					<Check size={14} className="hidden text-white group-data-[checked]:block" aria-hidden="true" />
				</Checkbox>
				<Label className="cursor-pointer">{t("presets.deviceOverlay")}</Label>
			</Field>
		);
	}

	return (
		<Popover className="relative">
			<PopoverButton
				className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm transition-colors ${
					selectedColors.length > 0
						? "border-cyan-600 bg-cyan-50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-950 dark:text-cyan-300"
						: "border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
				}`}
			>
				<MonitorSmartphone size={14} aria-hidden="true" />
				{t("presets.deviceOverlay")}
				{selectedColors.length > 0 ? (
					<span className="rounded-full bg-cyan-600 px-1.5 text-xs font-semibold text-white dark:bg-cyan-500">
						{selectedColors.length}
					</span>
				) : null}
				<ChevronDown size={14} aria-hidden="true" />
			</PopoverButton>
			<PopoverPanel
				anchor="bottom start"
				className="z-20 mt-1 w-48 rounded-md border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
			>
				{colors.map((color) => (
					<Field
						key={color}
						className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
					>
						<Checkbox
							checked={selectedColors.includes(color)}
							onChange={() => toggleColor(color)}
							className="group flex h-4 w-4 shrink-0 items-center justify-center rounded border border-neutral-300 dark:border-neutral-600 data-[checked]:bg-cyan-600 data-[checked]:border-cyan-600"
						>
							<Check size={12} className="hidden text-white group-data-[checked]:block" aria-hidden="true" />
						</Checkbox>
						<Label className="cursor-pointer">{color}</Label>
					</Field>
				))}
			</PopoverPanel>
		</Popover>
	);
}

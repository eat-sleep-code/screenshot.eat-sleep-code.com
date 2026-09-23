import { FolderOpen, FolderInput } from "lucide-react";
import { useTranslation } from "../../hooks/use-translation.jsx";

export default function OutputFolder({ outputDir, onChoose }) {
	const t = useTranslation();

	return (
		<div>
			<h2 className="text-sm font-semibold mb-2">{t("output.title")}</h2>
			<div className="flex items-center gap-2">
				<button type="button" className="btn btn-secondary" onClick={onChoose}>
					<FolderInput size={16} aria-hidden="true" />
					{t("output.choose")}
				</button>
				{outputDir ? (
					<button
						type="button"
						className="btn btn-tertiary"
						onClick={() => window.deviceScreenshotApi.output.openFolder(outputDir)}
					>
						<FolderOpen size={16} aria-hidden="true" />
						{t("output.openFolder")}
					</button>
				) : null}
			</div>
			<p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 truncate">
				{outputDir ?? t("output.none")}
			</p>
		</div>
	);
}

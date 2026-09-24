import { ExternalLink } from "lucide-react";
import { useTranslation } from "../../hooks/use-translation.jsx";
import { getResultIcon, stripOrientationSuffix } from "../../lib/result-icon.js";

function basename(filePath) {
	return filePath.split(/[\\/]/).pop();
}

export default function ThumbnailGallery({ results, presets }) {
	const t = useTranslation();
	const succeeded = results
		.filter((result) => result.ok)
		.sort((a, b) => basename(a.filePath).localeCompare(basename(b.filePath)));
	if (succeeded.length === 0) return null;

	return (
		<div>
			<h2 className="text-sm font-semibold mb-2">{t("capture.resultsTitle")}</h2>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
				{succeeded.map((result) => {
					const { Icon, rotate } = getResultIcon(result, presets);
					return (
						<figure
							key={result.filePath}
							className="group relative rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden"
						>
							<img
								src={result.fileUrl}
								alt={result.label}
								className="w-full h-32 object-cover bg-neutral-100 dark:bg-neutral-900"
							/>
							<button
								type="button"
								onClick={() => window.deviceScreenshotApi.output.openFile(result.filePath)}
								aria-label={t("capture.open")}
								title={t("capture.open")}
								className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
							>
								<span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-800 dark:bg-cyan-900">
									<ExternalLink size={16} className="text-cyan-200" aria-hidden="true" />
								</span>
							</button>
							<figcaption className="flex items-center gap-1.5 px-2 py-1 text-xs truncate">
								<Icon size={12} className={`shrink-0 ${rotate ? "-rotate-90" : ""}`} aria-hidden="true" />
								<span className="truncate">{stripOrientationSuffix(result.label)}</span>
							</figcaption>
						</figure>
					);
				})}
			</div>
		</div>
	);
}

import { useTranslation } from "../../hooks/use-translation.jsx";

export default function ThumbnailGallery({ results }) {
	const t = useTranslation();
	const succeeded = results.filter((result) => result.ok);
	if (succeeded.length === 0) return null;

	return (
		<div>
			<h2 className="text-sm font-semibold mb-2">{t("capture.resultsTitle")}</h2>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
				{succeeded.map((result) => (
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
							className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
						>
							{t("capture.open")}
						</button>
						<figcaption className="px-2 py-1 text-xs truncate">{result.label}</figcaption>
					</figure>
				))}
			</div>
		</div>
	);
}

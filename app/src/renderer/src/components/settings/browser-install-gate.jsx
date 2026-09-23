import { useEffect, useState } from "react";
import { DownloadCloud } from "lucide-react";
import { useTranslation } from "../../hooks/use-translation.jsx";

// Playwright's install CLI reports progress as carriage-return-updated lines
// like "Downloading Chromium 66.6 Mb [====>] 42% 12.3s". Pull the latest
// percentage out of the recent log lines so we can show a real progress bar
// instead of raw CLI output.
function latestPercent(log) {
	for (let i = log.length - 1; i >= 0; i--) {
		const match = log[i].match(/(\d{1,3})%/);
		if (match) return Math.min(100, Number(match[1]));
	}
	return null;
}

export default function BrowserInstallGate({ children }) {
	const t = useTranslation();
	const [ready, setReady] = useState(null); // null = checking
	const [log, setLog] = useState([]);

	useEffect(() => {
		let cancelled = false;
		window.deviceScreenshotApi.browsers.isInstalled().then(async (installed) => {
			if (installed) {
				if (!cancelled) setReady(true);
				return;
			}
			const unsubscribe = window.deviceScreenshotApi.browsers.onProgress((line) => {
				setLog((current) => [...current.slice(-20), line]);
			});
			try {
				await window.deviceScreenshotApi.browsers.install();
				if (!cancelled) setReady(true);
			} finally {
				unsubscribe();
			}
		});
		return () => {
			cancelled = true;
		};
	}, []);

	if (ready) return children;

	const percent = latestPercent(log);

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
			<DownloadCloud size={32} className="text-cyan-600 dark:text-cyan-400 animate-pulse" aria-hidden="true" />
			<p className="text-sm font-medium">{t("browsers.installing")}</p>
			<p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">{t("browsers.installingHint")}</p>
			{percent == null ? (
				<div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
					<div className="h-full w-1/3 animate-[install-indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-cyan-500" />
				</div>
			) : (
				<div
					className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
					role="progressbar"
					aria-valuenow={percent}
					aria-valuemin={0}
					aria-valuemax={100}
				>
					<div
						className="h-full rounded-full bg-cyan-500 transition-[width] duration-300"
						style={{ width: `${percent}%` }}
					/>
				</div>
			)}
		</div>
	);
}

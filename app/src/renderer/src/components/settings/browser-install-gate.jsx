import { useEffect, useState } from "react";
import { DownloadCloud } from "lucide-react";
import { useTranslation } from "../../hooks/use-translation.jsx";

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
				setLog((current) => [...current.slice(-8), line]);
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

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
			<DownloadCloud size={32} className="text-cyan-600 dark:text-cyan-400 animate-pulse" aria-hidden="true" />
			<p className="text-sm font-medium">{t("browsers.installing")}</p>
			<p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">{t("browsers.installingHint")}</p>
			<pre className="w-full max-w-md h-32 overflow-y-auto rounded-md bg-neutral-100 dark:bg-neutral-900 p-2 text-left text-[11px] text-neutral-600 dark:text-neutral-400">
				{log.join("\n")}
			</pre>
		</div>
	);
}

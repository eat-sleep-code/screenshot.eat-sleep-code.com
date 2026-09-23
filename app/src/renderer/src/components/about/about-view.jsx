import { useEffect, useState } from "react";
import { useTranslation } from "../../hooks/use-translation.jsx";

function ExternalLink({ href, children }) {
	return (
		<button
			type="button"
			className="text-cyan-600 dark:text-cyan-400 hover:underline"
			onClick={() => window.deviceScreenshotApi.shell.openExternal(href)}
		>
			{children}
		</button>
	);
}

export default function AboutView() {
	const t = useTranslation();
	const [version, setVersion] = useState("");

	useEffect(() => {
		window.deviceScreenshotApi.app.getVersion().then(setVersion);
	}, []);

	return (
		<div className="mx-auto max-w-lg space-y-4">
			<h2 className="text-lg font-semibold">{t("about.title")}</h2>
			<p className="text-sm text-neutral-500 dark:text-neutral-400">{t("about.version", { version })}</p>
			<div className="flex gap-4 text-sm">
				<ExternalLink href="https://eat-sleep-code.com/privacy">{t("about.privacy")}</ExternalLink>
				<ExternalLink href="https://eat-sleep-code.com/terms-of-use">{t("about.terms")}</ExternalLink>
			</div>
		</div>
	);
}

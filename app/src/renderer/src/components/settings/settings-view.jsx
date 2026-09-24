import { useEffect, useState } from "react";
import { RefreshCcw, Trash2, Monitor } from "lucide-react";
import { useTranslation } from "../../hooks/use-translation.jsx";
import { useThemePreference } from "../../hooks/use-theme.jsx";

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

export default function SettingsView() {
	const t = useTranslation();
	const [sessions, setSessions] = useState([]);
	const [checking, setChecking] = useState(false);
	const [updateStatus, setUpdateStatus] = useState(null);
	const [version, setVersion] = useState("");
	const [themePreference, setThemePreference] = useThemePreference();

	useEffect(() => {
		window.deviceScreenshotApi.session.list().then(setSessions);
		window.deviceScreenshotApi.app.getVersion().then(setVersion);
		const unsubscribe = window.deviceScreenshotApi.updates.onStatus((status) => setUpdateStatus(status));
		return () => unsubscribe();
	}, []);

	async function handleRemoveSession(host) {
		await window.deviceScreenshotApi.session.remove(host);
		setSessions((current) => current.filter((h) => h !== host));
	}

	async function handleCheckForUpdates() {
		setChecking(true);
		try {
			const result = await window.deviceScreenshotApi.updates.check();
			if (!result.updateAvailable && !result.error) {
				setUpdateStatus({ status: "up-to-date" });
			}
		} finally {
			setChecking(false);
		}
	}

	return (
		<div className="mx-auto max-w-4xl space-y-8">
			<section>
				<h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
					<Monitor size={16} aria-hidden="true" />
					{t("settings.theme")}
				</h2>
				<select
					className="field-input max-w-xs"
					value={themePreference}
					onChange={(event) => setThemePreference(event.target.value)}
					aria-label={t("settings.theme")}
				>
					<option value="system">{t("settings.themeSystem")}</option>
					<option value="light">{t("settings.themeLight")}</option>
					<option value="dark">{t("settings.themeDark")}</option>
				</select>
			</section>

			<section>
				<h2 className="text-sm font-semibold mb-2">{t("settings.sessions")}</h2>
				{sessions.length === 0 ? (
					<p className="text-sm text-neutral-500 dark:text-neutral-400">{t("settings.noSessions")}</p>
				) : (
					<ul className="space-y-1">
						{sessions.map((host) => (
							<li
								key={host}
								className="flex items-center justify-between rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm"
							>
								{host}
								<button
									type="button"
									className="btn btn-tertiary p-1.5"
									onClick={() => handleRemoveSession(host)}
									aria-label={t("urlInput.forgetSession")}
									title={t("urlInput.forgetSession")}
								>
									<Trash2 size={14} aria-hidden="true" />
								</button>
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
				<h2 className="text-sm font-semibold mb-2">{t("settings.about")}</h2>
				<p className="text-sm text-neutral-500 dark:text-neutral-400">{t("about.version", { version })}</p>

				<button type="button" className="btn btn-secondary mt-2" onClick={handleCheckForUpdates} disabled={checking}>
					<RefreshCcw size={16} className={checking ? "animate-spin" : ""} aria-hidden="true" />
					{checking ? t("settings.checking") : t("settings.checkForUpdates")}
				</button>
				{updateStatus ? (
					<p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
						{updateStatus.status === "up-to-date" && t("settings.upToDate")}
						{updateStatus.status === "downloading" && t("settings.updateAvailable")}
						{updateStatus.status === "downloaded" && t("settings.updateDownloaded")}
						{updateStatus.status === "error" && updateStatus.message}
					</p>
				) : null}

				<div className="mt-4 flex gap-4 text-sm">
					<ExternalLink href="https://eat-sleep-code.com/privacy">{t("about.privacy")}</ExternalLink>
					<ExternalLink href="https://eat-sleep-code.com/terms-of-use">{t("about.terms")}</ExternalLink>
				</div>
			</section>
		</div>
	);
}

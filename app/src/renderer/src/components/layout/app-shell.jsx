import { Camera, Settings, Info } from "lucide-react";
import { useTranslation } from "../../hooks/use-translation.jsx";

const TABS = [
	{ id: "capture", icon: Camera, labelKey: "nav.capture" },
	{ id: "settings", icon: Settings, labelKey: "nav.settings" },
	{ id: "about", icon: Info, labelKey: "nav.about" },
];

export default function AppShell({ activeTab, onTabChange, children }) {
	const t = useTranslation();

	return (
		<div className="flex h-full flex-col">
			<header className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-3">
				<h1 className="text-base font-semibold">{t("app.title")}</h1>
				<nav className="flex gap-1" aria-label={t("app.title")}>
					{TABS.map(({ id, icon: Icon, labelKey }) => (
						<button
							key={id}
							type="button"
							className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium min-h-11 transition-colors ${
								activeTab === id
									? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300"
									: "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
							}`}
							onClick={() => onTabChange(id)}
							aria-current={activeTab === id ? "page" : undefined}
						>
							<Icon size={16} aria-hidden="true" />
							{t(labelKey)}
						</button>
					))}
				</nav>
			</header>
			<main className="flex-1 overflow-y-auto p-6">{children}</main>
		</div>
	);
}

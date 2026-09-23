import { Loader2, CheckCircle2, XCircle, MousePointerClick, ScanEye } from "lucide-react";
import { useTranslation } from "../../hooks/use-translation.jsx";

const STATUS_ICON = {
	loading: Loader2,
	scrolling: MousePointerClick,
	capturing: ScanEye,
	done: CheckCircle2,
	error: XCircle,
};

const STATUS_KEY = {
	loading: "capture.statusLoading",
	scrolling: "capture.statusScrolling",
	capturing: "capture.statusCapturing",
	done: "capture.statusDone",
	error: "capture.statusError",
};

const STATUS_COLOR = {
	loading: "text-neutral-500 dark:text-neutral-400",
	scrolling: "text-neutral-500 dark:text-neutral-400",
	capturing: "text-cyan-600 dark:text-cyan-400",
	done: "text-emerald-600 dark:text-emerald-400",
	error: "text-red-600 dark:text-red-400",
};

const SPINNING = new Set(["loading", "scrolling", "capturing"]);

export default function ProgressList({ items }) {
	const t = useTranslation();
	if (items.length === 0) return null;

	return (
		<div>
			<h2 className="text-sm font-semibold mb-2">{t("capture.progressTitle")}</h2>
			<ul className="space-y-1">
				{items.map((item) => {
					const Icon = STATUS_ICON[item.status] ?? Loader2;
					return (
						<li key={item.label} className="flex items-center gap-2 text-sm">
							<Icon
								size={16}
								className={`${STATUS_COLOR[item.status]} ${SPINNING.has(item.status) ? "animate-spin" : ""}`}
								aria-hidden="true"
							/>
							<span>{item.label}</span>
							<span className={`text-xs ${STATUS_COLOR[item.status]}`}>{t(STATUS_KEY[item.status])}</span>
							{item.message ? <span className="text-xs text-red-500">{item.message}</span> : null}
						</li>
					);
				})}
			</ul>
		</div>
	);
}

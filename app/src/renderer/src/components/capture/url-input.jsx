import { useState } from "react";
import { LogIn, Trash2 } from "lucide-react";
import { useTranslation } from "../../hooks/use-translation.jsx";

function isValidHttpUrl(value) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export default function UrlInput({
	url,
	onUrlChange,
	sessionHost,
	onSignIn,
	onForgetSession,
	signingIn,
}) {
	const t = useTranslation();
	const [touched, setTouched] = useState(false);
	const valid = url === "" || isValidHttpUrl(url);

	return (
		<div>
			<label className="field-label" htmlFor="url">
				{t("urlInput.label")}
			</label>
			<div className="flex gap-2">
				<input
					id="url"
					type="text"
					className="field-input"
					placeholder={t("urlInput.placeholder")}
					value={url}
					onChange={(event) => onUrlChange(event.target.value)}
					onBlur={() => setTouched(true)}
					aria-invalid={touched && !valid}
				/>
				<button
					type="button"
					className="btn btn-secondary whitespace-nowrap"
					onClick={onSignIn}
					disabled={!isValidHttpUrl(url) || signingIn}
					title={t("urlInput.signInHint")}
				>
					<LogIn size={16} aria-hidden="true" />
					{t("urlInput.signIn")}
				</button>
			</div>
			{touched && !valid ? (
				<p className="mt-1 text-sm text-red-600 dark:text-red-400">{t("urlInput.invalid")}</p>
			) : (
				<p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t("urlInput.signInHint")}</p>
			)}

			{sessionHost ? (
				<div className="mt-2 flex items-center justify-between rounded-md bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm">
					<span>{t("urlInput.signedInAs", { host: sessionHost })}</span>
					<button
						type="button"
						className="btn btn-tertiary"
						onClick={onForgetSession}
						aria-label={t("urlInput.forgetSession")}
						title={t("urlInput.forgetSession")}
					>
						<Trash2 size={16} aria-hidden="true" />
					</button>
				</div>
			) : null}
		</div>
	);
}

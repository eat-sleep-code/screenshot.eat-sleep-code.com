import { useCallback, useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import UrlInput from "./url-input.jsx";
import PresetPicker from "./preset-picker/preset-picker.jsx";
import CaptureOptions from "./capture-options.jsx";
import OutputFolder from "./output-folder.jsx";
import ProgressList from "./progress-list.jsx";
import ThumbnailGallery from "./thumbnail-gallery.jsx";
import { useTranslation } from "../../hooks/use-translation.jsx";

const DEFAULT_OPTIONS = {
	fullPage: false,
	scrollThrough: false,
	settleDelayMs: 500,
	ignoreHttpsErrors: false,
	injectCss: "",
	injectJs: "",
};

export default function CaptureView() {
	const t = useTranslation();
	const [url, setUrl] = useState("");
	const [presets, setPresets] = useState([]);
	const [selections, setSelections] = useState([]);
	const [options, setOptions] = useState(DEFAULT_OPTIONS);
	const [outputDir, setOutputDir] = useState(null);
	const [sessionHost, setSessionHost] = useState(null);
	const [signingIn, setSigningIn] = useState(false);
	const [capturing, setCapturing] = useState(false);
	const [progressItems, setProgressItems] = useState([]);
	const [results, setResults] = useState([]);

	const loadPresets = useCallback(() => {
		window.deviceScreenshotApi.presets.list().then(setPresets);
	}, []);

	useEffect(() => {
		loadPresets();
		window.deviceScreenshotApi.output.getLast().then(setOutputDir);
	}, [loadPresets]);

	useEffect(() => {
		if (!url) {
			setSessionHost(null);
			return;
		}
		let host;
		try {
			host = new URL(url).host;
		} catch {
			setSessionHost(null);
			return;
		}
		window.deviceScreenshotApi.session.has(host).then((has) => setSessionHost(has ? host : null));
		window.deviceScreenshotApi.settings.getIgnoreHttps(host).then((ignore) =>
			setOptions((current) => ({ ...current, ignoreHttpsErrors: ignore }))
		);
	}, [url]);

	async function handleSignIn() {
		setSigningIn(true);
		try {
			const preset = presets.find((candidate) => selections.some((s) => s.presetId === candidate.id)) ?? presets[0];
			const engine = preset?.engine ?? "chromium";
			const host = await window.deviceScreenshotApi.session.signIn(url, engine, options.ignoreHttpsErrors);
			setSessionHost(host);
		} finally {
			setSigningIn(false);
		}
	}

	async function handleForgetSession() {
		if (!sessionHost) return;
		await window.deviceScreenshotApi.session.remove(sessionHost);
		setSessionHost(null);
	}

	async function handleIgnoreHttpsChange(value) {
		setOptions((current) => ({ ...current, ignoreHttpsErrors: value }));
		try {
			const host = new URL(url).host;
			await window.deviceScreenshotApi.settings.setIgnoreHttps(host, value);
		} catch {
			// URL not valid yet; nothing to persist
		}
	}

	async function handleChooseFolder() {
		const dir = await window.deviceScreenshotApi.output.chooseFolder();
		if (dir) setOutputDir(dir);
	}

	async function handleCapture() {
		if (!outputDir || selections.length === 0) return;
		setCapturing(true);
		setResults([]);
		setProgressItems(
			selections.map((selection) => {
				const preset = presets.find((p) => p.id === selection.presetId);
				return { label: `${preset?.name ?? selection.presetId} (${selection.orientation})`, status: "loading" };
			})
		);

		const unsubscribe = window.deviceScreenshotApi.capture.onProgress((update) => {
			setProgressItems((current) =>
				current.map((item) => (item.label === update.label ? { ...item, ...update } : item))
			);
		});

		try {
			const outcome = await window.deviceScreenshotApi.capture.start({
				url,
				selections,
				outputDir,
				options,
			});
			setResults(outcome);
		} finally {
			unsubscribe();
			setCapturing(false);
		}
	}

	const canCapture = Boolean(url) && selections.length > 0 && Boolean(outputDir) && !capturing;

	return (
		<div className="mx-auto max-w-3xl space-y-8">
			<UrlInput
				url={url}
				onUrlChange={setUrl}
				ignoreHttps={options.ignoreHttpsErrors}
				onIgnoreHttpsChange={handleIgnoreHttpsChange}
				sessionHost={sessionHost}
				onSignIn={handleSignIn}
				onForgetSession={handleForgetSession}
				signingIn={signingIn}
			/>

			<PresetPicker
				presets={presets}
				selections={selections}
				onSelectionsChange={setSelections}
				onPresetsChanged={loadPresets}
			/>

			<CaptureOptions options={options} onChange={setOptions} />

			<OutputFolder outputDir={outputDir} onChoose={handleChooseFolder} />

			<div>
				<button type="button" className="btn btn-primary" disabled={!canCapture} onClick={handleCapture}>
					{capturing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
					{capturing ? t("capture.starting") : t("capture.start")}
				</button>
			</div>

			<ProgressList items={progressItems} />
			<ThumbnailGallery results={results} />
		</div>
	);
}

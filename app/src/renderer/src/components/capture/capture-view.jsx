import { useCallback, useEffect, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import UrlInput from "./url-input.jsx";
import PresetPicker from "./preset-picker/preset-picker.jsx";
import CaptureOptions from "./capture-options.jsx";
import OutputFolder from "./output-folder.jsx";
import ProgressList from "./progress-list.jsx";
import ThumbnailGallery from "./thumbnail-gallery.jsx";
import { useTranslation } from "../../hooks/use-translation.jsx";
import {
	compositeDeviceMockup,
	findDeviceFrameVariant,
	matchOrientation,
	orientationFromLabel,
	withFilenameSuffix,
} from "../../lib/device-mockup.js";

const DEFAULT_OPTIONS = {
	fullPage: false,
	scrollThrough: false,
	settleDelayMs: 500,
	injectCss: "",
	injectJs: "",
	deviceMockup: { enabled: false, variantId: null },
};

export default function CaptureView() {
	const t = useTranslation();
	const [url, setUrl] = useState("");
	const [presets, setPresets] = useState([]);
	const [deviceFrames, setDeviceFrames] = useState([]);
	const [selections, setSelections] = useState([]);
	const [options, setOptions] = useState(DEFAULT_OPTIONS);
	const [outputDir, setOutputDir] = useState(null);
	const [sessionHost, setSessionHost] = useState(null);
	const [signingIn, setSigningIn] = useState(false);
	const [capturing, setCapturing] = useState(false);
	const [progressItems, setProgressItems] = useState([]);
	const [results, setResults] = useState([]);
	const [activeStage, setActiveStage] = useState("setup");

	const loadPresets = useCallback(() => {
		window.deviceScreenshotApi.presets.list().then(setPresets);
	}, []);

	useEffect(() => {
		loadPresets();
		window.deviceScreenshotApi.output.getLast().then(setOutputDir);
		window.deviceScreenshotApi.deviceFrames.list().then(setDeviceFrames);
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
	}, [url]);

	async function handleSignIn() {
		setSigningIn(true);
		try {
			const preset = presets.find((candidate) => selections.some((s) => s.presetId === candidate.id)) ?? presets[0];
			const engine = preset?.engine ?? "chromium";
			const host = await window.deviceScreenshotApi.session.signIn(url, engine);
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

	async function handleChooseFolder() {
		const dir = await window.deviceScreenshotApi.output.chooseFolder();
		if (dir) setOutputDir(dir);
	}

	async function handleCapture() {
		if (!outputDir || selections.length === 0) return;
		setCapturing(true);
		setResults([]);
		setActiveStage("downloading");
		setProgressItems(
			selections.map((selection) => {
				const preset = presets.find((p) => p.id === selection.presetId);
				return { label: `${preset?.name ?? selection.presetId} (${selection.orientation})`, status: "loading" };
			})
		);

		const unsubscribe = window.deviceScreenshotApi.capture.onProgress((update) => {
			setProgressItems((current) => {
				const exists = current.some((item) => item.label === update.label);
				return exists
					? current.map((item) => (item.label === update.label ? { ...item, ...update } : item))
					: [...current, update];
			});
		});

		try {
			const outcome = await window.deviceScreenshotApi.capture.start({
				url,
				selections,
				outputDir,
				options,
			});
			const finalResults = await generateMockups(outcome);
			setResults(finalResults);
			if (finalResults.some((result) => result.ok)) setActiveStage("results");
		} finally {
			unsubscribe();
			setCapturing(false);
		}
	}

	async function generateMockups(outcome) {
		if (!options.deviceMockup.enabled) return outcome;
		const chosen = findDeviceFrameVariant(deviceFrames, options.deviceMockup.variantId);
		if (!chosen) return outcome;

		const withMockups = [...outcome];
		for (const result of outcome) {
			if (!result.ok) continue;
			const variant = matchOrientation(chosen.device, chosen.variant, orientationFromLabel(result.label));
			const mockupLabel = `${result.label} — ${variant.color} mockup`;
			setProgressItems((current) => [...current, { label: mockupLabel, status: "capturing" }]);
			try {
				const blob = await compositeDeviceMockup({
					screenshotUrl: result.fileUrl,
					frameUrl: variant.previewUrl,
					canvasWidth: variant.canvasWidth,
					canvasHeight: variant.canvasHeight,
					screen: variant.screen,
				});
				const buffer = await blob.arrayBuffer();
				const filename = withFilenameSuffix(result.filePath, variant.id);
				const saved = await window.deviceScreenshotApi.deviceFrames.saveMockup(outputDir, filename, buffer);
				setProgressItems((current) =>
					current.map((item) => (item.label === mockupLabel ? { ...item, status: "done" } : item))
				);
				withMockups.push({ label: mockupLabel, filePath: saved.filePath, fileUrl: saved.fileUrl, ok: true });
			} catch (error) {
				setProgressItems((current) =>
					current.map((item) => (item.label === mockupLabel ? { ...item, status: "error", message: error.message } : item))
				);
				withMockups.push({ label: mockupLabel, ok: false, message: error.message });
			}
		}
		return withMockups;
	}

	const canCapture = Boolean(url) && selections.length > 0 && Boolean(outputDir) && !capturing;

	const STAGES = [
		{ id: "setup", labelKey: "capture.tabSetup" },
		{ id: "downloading", labelKey: "capture.tabDownloading", disabled: progressItems.length === 0 },
		{ id: "results", labelKey: "capture.tabResults", disabled: results.length === 0 },
	];

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-800" role="tablist">
				{STAGES.map((stage) => (
					<button
						key={stage.id}
						type="button"
						role="tab"
						aria-selected={activeStage === stage.id}
						disabled={stage.disabled}
						className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
							activeStage === stage.id
								? "border-cyan-600 text-cyan-700 dark:border-cyan-400 dark:text-cyan-300"
								: "border-transparent text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
						}`}
						onClick={() => setActiveStage(stage.id)}
					>
						{t(stage.labelKey)}
					</button>
				))}
			</div>

			{activeStage === "setup" ? (
				<div className="space-y-8">
					<UrlInput
						url={url}
						onUrlChange={setUrl}
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

					<CaptureOptions options={options} onChange={setOptions} deviceFrames={deviceFrames} />

					<OutputFolder outputDir={outputDir} onChoose={handleChooseFolder} />

					<div>
						<button type="button" className="btn btn-primary" disabled={!canCapture} onClick={handleCapture}>
							{capturing ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Camera size={16} aria-hidden="true" />}
							{capturing ? t("capture.starting") : t("capture.start")}
						</button>
					</div>
				</div>
			) : null}

			{activeStage === "downloading" ? <ProgressList items={progressItems} /> : null}
			{activeStage === "results" ? <ThumbnailGallery results={results} /> : null}
		</div>
	);
}

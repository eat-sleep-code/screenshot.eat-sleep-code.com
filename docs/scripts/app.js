const REPO = "eat-sleep-code/screenshot.eat-sleep-code.com";

const PLATFORMS = {
	windows: { label: "Windows", match: (asset) => /\.exe$/i.test(asset.name) },
	//macos: { label: "macOS", match: (asset) => /\.dmg$/i.test(asset.name) }, // not yet available, so we don't want to show it as the primary download option
	linux: { label: "Linux", match: (asset) => /\.AppImage$/i.test(asset.name) },
};

function detectOS() {
	const ua = navigator.userAgent;
	if (/Win/i.test(ua)) return "windows";
	//if (/Mac/i.test(ua)) return "macos"; // not yet available, so we don't want to show it as the primary download option
	if (/Linux/i.test(ua)) return "linux";
	return "windows";
}

function pickAsset(assets, platformKey) {
	return assets.find(PLATFORMS[platformKey].match);
}

function showNotice(platformKey) {
	document.querySelectorAll(".smartscreen-notice").forEach((notice) => {
		notice.classList.toggle("hidden", notice.dataset.platform !== platformKey);
	});
}

function addSecondaryButton(container, label, href, downloadable, platformKey) {
	const a = document.createElement("a");
	a.className = "download-btn download-btn-secondary";
	a.textContent = label;
	a.href = href;
	if (downloadable) a.setAttribute("download", "");
	a.addEventListener("click", () => showNotice(platformKey));
	const macosBtn = document.getElementById("macos-download-btn");
	container.insertBefore(a, macosBtn || null);
}

async function loadRelease() {
	const versionLine = document.getElementById("version-line");
	const primaryLink = document.getElementById("primary-download");
	const primaryOsLabel = document.getElementById("primary-os");
	const buttonsContainer = document.getElementById("download-buttons");
	const osKey = detectOS();
	primaryOsLabel.textContent = PLATFORMS[osKey].label;

	try {
		const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
		if (!res.ok) throw new Error("no releases yet");
		const release = await res.json();
		const assets = release.assets || [];

		const primaryAsset = pickAsset(assets, osKey);
		if (primaryAsset) {
			primaryLink.href = primaryAsset.browser_download_url;
		} else {
			primaryLink.href = release.html_url;
		}
		primaryLink.addEventListener("click", () => showNotice(osKey));

		Object.keys(PLATFORMS).forEach((key) => {
			if (key === osKey) return;
			const asset = pickAsset(assets, key);
			addSecondaryButton(buttonsContainer, PLATFORMS[key].label, asset ? asset.browser_download_url : release.html_url, Boolean(asset), key);
		});

		versionLine.innerHTML = `Version ${release.tag_name}`;
	} catch (err) {
		versionLine.textContent = "No release published yet.";
		primaryLink.href = `https://github.com/${REPO}/releases`;
		primaryLink.addEventListener("click", () => showNotice(osKey));
		Object.keys(PLATFORMS).forEach((key) => {
			if (key === osKey) return;
			addSecondaryButton(buttonsContainer, PLATFORMS[key].label, `https://github.com/${REPO}/releases`, false, key);
		});
	}
}

loadRelease();

const macosBtn = document.getElementById("macos-download-btn");
if (macosBtn) {
	macosBtn.addEventListener("click", () => macosBtn.classList.toggle("show-hover-label"));
	document.addEventListener("click", (e) => {
		if (!macosBtn.contains(e.target)) macosBtn.classList.remove("show-hover-label");
	});
}

document.querySelectorAll(".cmd-copy-btn").forEach((btn) => {
	btn.addEventListener("click", async () => {
		try {
			await navigator.clipboard.writeText(btn.dataset.copy);
			btn.classList.add("copied");
			setTimeout(() => btn.classList.remove("copied"), 1500);
		} catch (err) {
			// clipboard access denied or unavailable; nothing to fall back to
		}
	});
});
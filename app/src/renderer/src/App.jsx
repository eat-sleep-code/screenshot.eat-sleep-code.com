import { useState } from "react";
import AppShell from "./components/layout/app-shell.jsx";
import BrowserInstallGate from "./components/settings/browser-install-gate.jsx";
import CaptureView from "./components/capture/capture-view.jsx";
import SettingsView from "./components/settings/settings-view.jsx";
import { useTheme } from "./hooks/use-theme.jsx";

export default function App() {
	useTheme();
	const [activeTab, setActiveTab] = useState("capture");

	return (
		<BrowserInstallGate>
			<AppShell activeTab={activeTab} onTabChange={setActiveTab}>
				{activeTab === "capture" && <CaptureView />}
				{activeTab === "settings" && <SettingsView />}
			</AppShell>
		</BrowserInstallGate>
	);
}

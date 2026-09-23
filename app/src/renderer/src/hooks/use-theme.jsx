import { useEffect, useState } from "react";

export function useTheme() {
	const [theme, setTheme] = useState("light");

	useEffect(() => {
		let unsubscribe;
		window.deviceScreenshotApi.theme.get().then(setTheme);
		unsubscribe = window.deviceScreenshotApi.theme.onChange(setTheme);
		return () => unsubscribe?.();
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle("dark", theme === "dark");
	}, [theme]);

	return theme;
}

// Separate from useTheme(): this tracks the user's System/Light/Dark
// *preference* (persisted, drives nativeTheme.themeSource), not the
// resolved light/dark value used to paint the UI.
export function useThemePreference() {
	const [preference, setPreference] = useState("system");

	useEffect(() => {
		window.deviceScreenshotApi.theme.getPreference().then(setPreference);
	}, []);

	async function updatePreference(value) {
		setPreference(value);
		await window.deviceScreenshotApi.theme.setPreference(value);
	}

	return [preference, updatePreference];
}

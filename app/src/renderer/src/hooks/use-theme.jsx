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

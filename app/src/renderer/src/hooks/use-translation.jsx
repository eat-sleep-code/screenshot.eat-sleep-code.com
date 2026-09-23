import { createContext, useContext, useMemo } from "react";
import { locales, defaultLocale } from "../translations/index.js";

const LocaleContext = createContext(defaultLocale);

export function LocaleProvider({ children, locale = defaultLocale }) {
	return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

function resolve(strings, key) {
	return key.split(".").reduce((node, part) => (node == null ? undefined : node[part]), strings);
}

function interpolate(template, vars) {
	if (!vars) return template;
	return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function useTranslation() {
	const locale = useContext(LocaleContext);
	const strings = locales[locale] ?? locales[defaultLocale];

	return useMemo(
		() =>
			function t(key, vars) {
				const value = resolve(strings, key);
				if (typeof value !== "string") return key;
				return interpolate(value, vars);
			},
		[strings]
	);
}

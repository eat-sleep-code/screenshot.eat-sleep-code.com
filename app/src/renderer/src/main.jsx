import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { LocaleProvider } from "./hooks/use-translation.jsx";
import "./styles/app.css";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<LocaleProvider>
			<App />
		</LocaleProvider>
	</StrictMode>
);

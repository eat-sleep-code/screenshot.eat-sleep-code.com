// Shared modal wrapper enforcing house-style dismissal rules: an outside
// click does nothing, only Escape or an explicit close/action button closes
// the modal. Used by the legal-page modals (see
// references/legal-modals-and-routing.md) and any other modal in the app --
// don't reach for a bare Headless UI <Dialog> directly, wrap it with this
// instead so every modal in the project behaves the same way.

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";

export default function ModalShell({ open, onClose, title, children, className = "" }) {
	function handleKeyDown(event) {
		if (event.key === "Escape") {
			onClose();
		}
	}

	return (
		<Dialog
			open={open}
			onClose={() => {}} // no-op: disables Headless UI's built-in outside-click/Escape closing
			modal={false}
			className="relative z-50"
			onKeyDown={handleKeyDown}
		>
			{/* No onClick here on purpose -- clicking the backdrop must not close the modal */}
			<div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />

			<div className="fixed inset-0 flex items-center justify-center p-4">
				<DialogPanel
					className={`w-full max-w-lg rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl ${className}`}
				>
					{title ? (
						<DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
							{title}
						</DialogTitle>
					) : null}

					{children}

					<button
						type="button"
						className="btn btn-tertiary mt-4"
						onClick={onClose}
						aria-label="Close"
					>
						Close
					</button>
				</DialogPanel>
			</div>
		</Dialog>
	);
}

export default function PageLoader() {
	return (
		<div className="flex items-center justify-center h-full min-h-[60vh]">
			<div className="flex flex-col items-center gap-3 text-[var(--app-muted)] dark:text-white">
				<div className="w-8 h-8 border-4 border-[var(--app-border)] dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
				<span className="text-sm">Loading…</span>
			</div>
		</div>
	);
}
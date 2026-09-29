import { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useTheme } from '@/shared/contexts/ThemeContext';

export default function Layout() {
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [mini, setMini] = useState(false);
	const { theme } = useTheme();
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		iframeRef.current?.contentWindow?.postMessage(
			{ type: "theme-change", theme },
			window.location.origin
		);
	}, [theme]);

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<TopBar
				onToggle={() => setSidebarOpen((v) => !v)}
				onMiniToggle={() => setMini((v) => !v)}
			/>

			<div className="flex flex-1 pt-14 bg-[var(--app-surface)] dark:bg-gray-900 overflow-hidden">
				<Sidebar
					open={sidebarOpen}
					mini={mini}
					onClose={() => setSidebarOpen(false)}
				/>

				{/* Mobile overlay */}
				{sidebarOpen && (
					<div
						onClick={() => setSidebarOpen(false)}
						className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-30 md:hidden"
					/>
				)}

				<main className="flex-1 overflow-y-auto">
					<iframe
						ref={iframeRef}
						title="Layout"
						name="main1"
						onLoad={() =>
							iframeRef.current?.contentWindow?.postMessage(
								{ type: "theme-change", theme },
								window.location.origin
							)
						}
						className="w-full h-full border-none bg-white dark:bg-gray-900"
					/>
				</main>
			</div>
		</div>
	);
}
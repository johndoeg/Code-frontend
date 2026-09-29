import { useEffect, useRef } from "react";

export default function Dashboard() {
	const iframeRef = useRef<HTMLIFrameElement>(null);

	useEffect(() => {
		if (iframeRef.current) {
			iframeRef.current.src = "about:blank";
		}
	}, []);

	return (
		<main className="flex-1 bg-[var(--app-card)] overflow-auto h-full">
			<iframe
				ref={iframeRef}
				title="Dashboard"
				name="main1"
				id="main1"
				className="border-none w-full h-full"
			/>
		</main>
	);
}
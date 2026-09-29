import { useMemo } from "react";
import { useAuth } from '@/shared/contexts/AuthContext';
import { formatCountdown } from '@/shared/hooks/useSessionTimeout';
import ThemeToggle from "./ThemeToggle";

export default function TopHeader({ remainingMs }: { remainingMs: number }) {
	const { user } = useAuth();
	const dateOverride = new URLSearchParams(window.location.search).get("date");

	const today = useMemo(
		() =>
			dateOverride ||
			new Date().toLocaleDateString("id-ID", {
				timeZone: "Asia/Jakarta",
				weekday: "long",
				year: "numeric",
				month: "long",
				day: "numeric",
			}),
		[dateOverride],
	);

	return (
		<header className="flex justify-between items-center bg-white dark:bg-black shadow p-4 border-b dark:border-gray-800 shrink-0">
			<div className="text-[var(--app-text)] dark:text-white font-medium">
				{user ? (
					<>
						Hello,{" "}
						<span className="font-semibold text-blue-800 dark:text-white dark:font-bold">{user.username}</span>
						{" — "}
						<span className="text-blue-700 dark:text-white dark:font-bold">{user.branch_name}</span>
						{" — "}
						<span className="text-[var(--app-muted)] dark:text-white">{today}</span>
					</>
				) : (
					"Loading..."
				)}
			</div>
			<div className="flex items-center gap-4">
				{user && (
					<span className="text-sm text-[var(--app-muted)] dark:text-white font-mono" title="Time until auto logout">
						Remaining Time : {formatCountdown(remainingMs)}
					</span>
				)}
				<ThemeToggle />
			</div>
		</header>
	);
}
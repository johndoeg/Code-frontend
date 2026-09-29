import { useTheme } from '@/shared/contexts/ThemeContext';

export default function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();

	return (
		<button
			onClick={toggleTheme}
			className="rounded-lg px-3 py-1.5 text-sm bg-[var(--app-surface)] dark:bg-gray-700 text-[var(--app-text)] dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
			aria-label="Toggle dark mode"
		>
			{theme === "dark" ? "☀️ Light" : "🌙 Dark"}
		</button>
	);
}
export default {
	darkMode: 'class',
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				surface: 'var(--app-surface)',
				'surface-alt': 'var(--app-surface-alt)',
				card: 'var(--app-card)',
				'text-primary': 'var(--app-text)',
				'text-muted': 'var(--app-muted)',
				border: 'var(--app-border)',
			},
		},
	},
	plugins: [],
}
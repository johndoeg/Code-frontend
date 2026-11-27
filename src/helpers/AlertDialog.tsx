import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

export type DialogVariant = 'warning' | 'error' | 'success' | 'info';

export interface AlertOptions {
	title?: string;
	variant?: DialogVariant;
	okText?: string;
}

export interface ConfirmOptions extends AlertOptions {
	cancelText?: string;
}

export const FILL_FIELD_MESSAGE = 'Please Fill The Field';

const THEMES = {
	light: {
		backdrop: 'bg-slate-900/40',
		card: 'bg-white text-slate-900 ring-1 ring-black/5',
		message: 'text-slate-600',
		cancel: 'border-slate-300 text-slate-700 hover:bg-slate-100 focus:ring-slate-300',
	},
	dark: {
		backdrop: 'bg-black/50',
		card: 'bg-[var(--app-card,#1e293b)] text-[var(--app-text,#f1f5f9)] ring-1 ring-white/10',
		message: 'opacity-80',
		cancel: 'border-[var(--app-border,#475569)] hover:bg-[var(--app-surface,#334155)] focus:ring-slate-500',
	},
};

type ThemeName = keyof typeof THEMES;

const parseRgb = (value: string): [number, number, number, number] | null => {
	const m = value.match(/rgba?\(([^)]+)\)/);
	if (!m) return null;
	const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
	if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
	return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
};

const isDarkColor = ([r, g, b]: [number, number, number, number]) =>
	(0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;

const hasThemeMarker = (el: Element | null, theme: ThemeName) =>
	!!el && (el.classList.contains(theme) || el.getAttribute('data-theme') === theme || el.getAttribute('data-mode') === theme);

const detectTheme = (): ThemeName => {
	const html = document.documentElement;
	const body = document.body;
	if (hasThemeMarker(html, 'dark') || hasThemeMarker(body, 'dark')) return 'dark';
	if (hasThemeMarker(html, 'light') || hasThemeMarker(body, 'light')) return 'light';

	const probes = document.querySelectorAll('[class*="--app-card"]');
	for (const el of Array.from(probes)) {
		const rgb = parseRgb(getComputedStyle(el).backgroundColor);
		if (rgb && rgb[3] > 0) return isDarkColor(rgb) ? 'dark' : 'light';
	}
	return 'light';
};

const VARIANTS: Record<DialogVariant, { title: string; circle: string; icon: string; button: string; path: string }> = {
	warning: {
		title: 'Attention',
		circle: 'bg-amber-100',
		icon: 'text-amber-600',
		button: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-300',
		path: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
	},
	error: {
		title: 'Error',
		circle: 'bg-red-100',
		icon: 'text-red-600',
		button: 'bg-red-600 hover:bg-red-700 focus:ring-red-300',
		path: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
	},
	success: {
		title: 'Success',
		circle: 'bg-green-100',
		icon: 'text-green-600',
		button: 'bg-green-600 hover:bg-green-700 focus:ring-green-300',
		path: 'M5 13l4 4L19 7',
	},
	info: {
		title: 'Information',
		circle: 'bg-blue-100',
		icon: 'text-blue-600',
		button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300',
		path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
	},
};

interface DialogProps {
	id: string;
	message: string;
	title: string;
	variant: DialogVariant;
	okText: string;
	cancelText?: string;
	theme: ThemeName;
	onResult: (ok: boolean) => void;
}

const ANIMATION_MS = 150;

const Dialog: React.FC<DialogProps> = ({ id, message, title, variant, okText, cancelText, theme, onResult }) => {
	const [visible, setVisible] = useState(false);
	const okRef = useRef<HTMLButtonElement>(null);
	const doneRef = useRef(false);
	const isConfirm = cancelText !== undefined;
	const style = VARIANTS[variant];
	const palette = THEMES[theme];

	const finish = useCallback((ok: boolean) => {
		if (doneRef.current) return;
		doneRef.current = true;
		setVisible(false);
		window.setTimeout(() => onResult(ok), ANIMATION_MS);
	}, [onResult]);

	useEffect(() => {
		const frame = requestAnimationFrame(() => setVisible(true));
		okRef.current?.focus();
		return () => cancelAnimationFrame(frame);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				finish(!isConfirm);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [finish, isConfirm]);

	return (
		<div
			className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
			role="alertdialog"
			aria-modal="true"
			aria-labelledby={`${id}-title`}
			aria-describedby={`${id}-message`}
		>
			<div className={`absolute inset-0 backdrop-blur-sm ${palette.backdrop}`} onClick={() => finish(!isConfirm)} />

			<div
				className={`relative w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl transition-transform duration-150 ${palette.card} ${visible ? 'scale-100' : 'scale-95'}`}
			>
				<div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${style.circle}`}>
					<svg className={`h-7 w-7 ${style.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={style.path} />
					</svg>
				</div>

				<h3 id={`${id}-title`} className="mb-2 text-lg font-semibold">{title}</h3>
				<p id={`${id}-message`} className={`mb-6 whitespace-pre-line text-sm ${palette.message}`}>{message}</p>

				<div className={`flex gap-3 ${isConfirm ? '' : 'justify-center'}`}>
					{isConfirm && (
						<button
							type="button"
							onClick={() => finish(false)}
							className={`flex-1 rounded-lg border px-4 py-2.5 font-medium transition-colors focus:outline-none focus:ring-2 ${palette.cancel}`}
						>
							{cancelText}
						</button>
					)}
					<button
						ref={okRef}
						type="button"
						onClick={() => finish(true)}
						className={`${isConfirm ? 'flex-1' : 'min-w-[8rem]'} rounded-lg px-4 py-2.5 font-medium text-white shadow transition-colors focus:outline-none focus:ring-2 ${style.button}`}
					>
						{okText}
					</button>
				</div>
			</div>
		</div>
	);
};

let dialogSeq = 0;

function openDialog(props: Omit<DialogProps, 'id' | 'theme' | 'onResult'>): Promise<boolean> {
	return new Promise((resolve) => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const root = createRoot(host);
		const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

		const onResult = (ok: boolean) => {
			window.setTimeout(() => {
				root.unmount();
				host.remove();
				previousFocus?.focus();
			}, 0);
			resolve(ok);
		};

		root.render(<Dialog id={`app-dialog-${++dialogSeq}`} {...props} theme={detectTheme()} onResult={onResult} />);
	});
}

export function showAlert(message: string, options: AlertOptions = {}): Promise<void> {
	const variant = options.variant ?? 'warning';
	return openDialog({
		message,
		variant,
		title: options.title ?? VARIANTS[variant].title,
		okText: options.okText ?? 'OK',
	}).then(() => undefined);
}

export function showConfirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
	const variant = options.variant ?? 'warning';
	return openDialog({
		message,
		variant,
		title: options.title ?? VARIANTS[variant].title,
		okText: options.okText ?? 'Yes',
		cancelText: options.cancelText ?? 'Cancel',
	});
}

export function alertFillField(message?: string, options: AlertOptions = {}): Promise<void> {
	const text = message && message.trim() ? message : FILL_FIELD_MESSAGE;
	return showAlert(text, { variant: 'warning', ...options });
}

export default showAlert;
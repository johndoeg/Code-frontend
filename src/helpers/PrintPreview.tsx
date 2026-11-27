import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface PrintPreviewProps {
	label: string;
	onClose: () => void;
	children: React.ReactNode;
	pageWidth?: number;
	landscape?: boolean;
}

export const PRINT_TD: React.CSSProperties = {
	border: '1px solid #000',
	padding: '2px 4px',
	verticalAlign: 'top',
	wordBreak: 'break-word',
	overflowWrap: 'break-word',
};

export const PRINT_TH: React.CSSProperties = {
	...PRINT_TD,
	verticalAlign: 'middle',
	textAlign: 'center',
	fontWeight: 'bold',
	backgroundColor: '#f0f0f0',
};

const ROOT_ID = 'app-print-root';

const PrintPreview: React.FC<PrintPreviewProps> = ({ label, onClose, children, pageWidth = 1100, landscape = true }) => {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [onClose]);

	return createPortal(
		<div id={ROOT_ID} className="fixed inset-0 z-50 overflow-auto bg-[var(--app-surface-alt)]" role="dialog" aria-modal="true" aria-label={label}>
			<style>{`
				@page { size: ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }
				@media print {
					html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
					body > *:not(#${ROOT_ID}) { display: none !important; }
					#${ROOT_ID} { position: static !important; inset: auto !important; overflow: visible !important; background: #fff !important; }
					#${ROOT_ID} .pp-no-print { display: none !important; }
					#${ROOT_ID} .pp-area { padding: 0 !important; background: #fff !important; min-height: 0 !important; }
					#${ROOT_ID} .pp-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-width: 100% !important; }
					#${ROOT_ID} thead { display: table-header-group; }
					#${ROOT_ID} tr { page-break-inside: avoid; break-inside: avoid; }
				}
			`}</style>

			<div className="pp-no-print sticky top-0 z-10 border-b border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<div className="mx-auto flex items-center justify-between gap-4 px-4 py-3" style={{ maxWidth: pageWidth }}>
					<button
						onClick={onClose}
						className="flex items-center gap-2 px-4 py-2 text-[var(--app-text)] bg-[var(--app-surface-alt)] hover:bg-gray-200 rounded-lg transition font-medium"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
						</svg>
						Close
					</button>

					<span className="truncate text-sm text-[var(--app-muted)] font-medium">{label}</span>

					<button
						onClick={() => window.print()}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium shadow"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
								d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
						</svg>
						Print
					</button>
				</div>
			</div>

			<div className="pp-area min-h-screen py-6 px-4">
				<div
					className="pp-page mx-auto bg-white p-6 shadow-md"
					style={{ maxWidth: pageWidth, fontFamily: 'Tahoma, sans-serif', fontSize: 12, color: '#000' }}
				>
					{children}
				</div>
			</div>
		</div>,
		document.body
	);
};

export default PrintPreview;
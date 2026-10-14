import React, { useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

function getTopWindow(): Window {
	try {
		return window.top ?? window;
	} catch {
		return window;
	}
}

const STYLE_BRIDGE_ID = 'cam-app-style-bridge';
function ensureStylesBridged(topWindow: Window) {
	if (topWindow === window) return;
	try {
		const topDoc = topWindow.document;
		if (topDoc.getElementById(STYLE_BRIDGE_ID)) return;
		const marker = topDoc.createElement('meta');
		marker.id = STYLE_BRIDGE_ID;
		topDoc.head.appendChild(marker);
		document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
			topDoc.head.appendChild(node.cloneNode(true));
		});
	} catch {}
}

export async function fetchAllResponses<R>(
	fetchPage: (page: number) => Promise<R>,
	totalPagesOf: (first: R) => number,
	batch = 5,
): Promise<R[]> {
	const first = await fetchPage(1);
	const all: R[] = [first];
	const last = Math.max(1, totalPagesOf(first));
	for (let p = 2; p <= last; p += batch) {
		const nums = Array.from({ length: Math.min(batch, last - p + 1) }, (_, i) => p + i);
		all.push(...(await Promise.all(nums.map(fetchPage))));
	}
	return all;
}

export const PRINT_CELL: React.CSSProperties = { border: '1px solid #000', padding: '2px 4px', verticalAlign: 'middle' };
export const PRINT_HEAD: React.CSSProperties = { ...PRINT_CELL, textAlign: 'center', backgroundColor: '#f0f0f0' };

const todayLong = () =>
	new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

interface ReportPrintModalProps {
	title: string;
	leftHeader?: string;
	periodLabel?: string;
	summaryText?: string;
	landscape?: boolean;
	onClose: () => void;
	children: React.ReactNode;
}

const ReportPrintModal: React.FC<ReportPrintModalProps> = ({
	title, leftHeader, periodLabel, summaryText, landscape = true, onClose, children,
}) => {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		const topWindow = getTopWindow();
		topWindow.addEventListener('keydown', handler);
		return () => topWindow.removeEventListener('keydown', handler);
	}, [onClose]);

	useLayoutEffect(() => {
		ensureStylesBridged(getTopWindow());
	}, []);

	return createPortal(
		<div className="rpt-overlay fixed inset-0 z-50 bg-[var(--app-card)] overflow-auto" role="dialog" aria-modal="true">
			<style>{`
				@media print {
					@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }
					body > *:not(.rpt-overlay) { display: none !important; }
					html, body {
						margin: 0 !important;
						padding: 0 !important;
						height: auto !important;
						overflow: visible !important;
						background: #fff !important;
					}
					.rpt-overlay {
						position: static !important;
						inset: auto !important;
						display: block !important;
						height: auto !important;
						overflow: visible !important;
						background: #fff !important;
					}
					.rpt-no-print { display: none !important; }
					.rpt-area { background: #fff !important; padding: 0 !important; min-height: 0 !important; color: #000; }
					.rpt-page {
						box-shadow: none !important;
						margin: 0 !important;
						padding: 0 !important;
						max-width: 100% !important;
						background: #fff !important;
						color: #000 !important;
						font-size: 10px !important;
					}

					.rpt-table thead { display: table-header-group; }
					.rpt-table tr { break-inside: avoid; page-break-inside: avoid; }
					.rpt-table,
					.rpt-table th,
					.rpt-table td { border: 1px solid #000 !important; }
					.rpt-keep { break-inside: avoid; page-break-inside: avoid; }
				}
			`}</style>

			<div className="rpt-no-print sticky top-0 z-10 bg-[var(--app-card)] border-b border-[var(--app-border)] px-6 py-3 flex items-center justify-between shadow-sm">
				<button
					onClick={onClose}
					className="flex items-center gap-2 px-4 py-2 text-[var(--app-text)] bg-[var(--app-surface-alt)] hover:bg-gray-200 rounded-lg transition font-medium"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Close
				</button>

				<span className="text-sm text-[var(--app-muted)] font-medium">
					{title}{summaryText ? ` — ${summaryText}` : ''}
				</span>

				<button
					onClick={() => getTopWindow().print()}
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium shadow"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
							d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
					</svg>
					Print
				</button>
			</div>

			<div className="rpt-area bg-[var(--app-surface-alt)] min-h-screen py-6 px-4">
				<div
					className="rpt-page bg-[var(--app-card)] mx-auto p-6 shadow-md"
					style={{ maxWidth: 1200, fontFamily: 'Tahoma, sans-serif', fontSize: 12, color: '#000' }}
				>
					<table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
						<tbody>
							<tr>
								<td style={{ width: '76%' }}>{leftHeader ?? ''}</td>
								<td>Date: {todayLong()}</td>
							</tr>
						</tbody>
					</table>

					<div style={{ textAlign: 'center', marginBottom: 8 }}>
						<strong>
							<u>{title}</u>
							{periodLabel && (<><br />{periodLabel}</>)}
						</strong>
					</div>

					{children}
				</div>
			</div>
		</div>,
		getTopWindow().document.body
	);
};

export default ReportPrintModal;
import React, { useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

interface ContractInfo {
	LESSEE_NO: string; trans_code: string; LESSEE_NM: string;
	ADDRESS: string; PHONE1: string; PHONE2: string; PHONE3: string;
	BPKB_AN: string; POLICENO: string; CHASIS: string; ENGINE: string;
	TAHUN: string; COLOUR: string; suppname: string; TYPE_NM: string;
	MODEL_NM: string; BRANCH_NAME: string; DATEBLOKIR: string;
	NOPOLBLOKIR: string; status_kontrak: string; JFG: string;
}

interface PaymentRow {
	girono: string; girodt: string; payment: string; bank: string;
	nominal: number; period: string; penalty: number; Shortage: number;
	inkaso: number; status: string | null; reject_description: string;
	penalty_payment: number; ShortagePay: number; InkasoPay: number;
}

interface LeaseReport {
	leaseNo: string;
	contractInfo: ContractInfo;
	payments: PaymentRow[];
	totAmount: number; totPenalty: number; totShortage: number; totInkaso: number;
	penaltyPayment: number; shortagePay: number; inkasoPay: number;
}

const fmt = (n: number) => (n ? n.toLocaleString('id-ID') : '0');
const todayLong = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
const todayShort = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

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
	} catch {
	}
}

function buildLeaseReport(
	leaseNo: string,
	data: { contractInfo: ContractInfo; payments: PaymentRow[] }
): LeaseReport {
	let totAmount = 0, totPenalty = 0, totShortage = 0, totInkaso = 0;
	let penaltyPayment = 0, shortagePay = 0, inkasoPay = 0;
	data.payments.forEach((row, idx) => {
		if (!String(row.period ?? '').includes('*')) totAmount += row.nominal ?? 0;
		totPenalty += row.penalty ?? 0;
		totShortage += row.Shortage ?? 0;
		totInkaso += (row.inkaso ?? 0) * 25000;
		if (idx === 0) {
			penaltyPayment = row.penalty_payment ?? 0;
			shortagePay = row.ShortagePay ?? 0;
			inkasoPay = row.InkasoPay ?? 0;
		}
	});
	return {
		leaseNo, contractInfo: data.contractInfo, payments: data.payments,
		totAmount, totPenalty, totShortage, totInkaso, penaltyPayment, shortagePay, inkasoPay
	};
}

function PrintPreview({ report, onClose }: { report: LeaseReport; onClose: () => void }) {
	const ci = report.contractInfo;
	let prevGiro = '';
	let rowNum = 0;
	const td: React.CSSProperties = { border: '1px solid #000', padding: '2px 4px' };

	return (
		<>
			<style>{`
				@media print {
					.hp-no-print { display: none !important; }
					.hp-print-area { background: white !important; padding: 0 !important; }
					.hp-page { box-shadow: none !important; margin: 0 !important; padding: 12px !important; max-width: 100% !important; }
				}
      `}</style>

			<div className="hp-no-print sticky top-0 z-10 bg-[var(--app-card)] border-b border-[var(--app-border)] px-6 py-3 flex items-center justify-between shadow-sm">
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
					{report.leaseNo} — Customer History Payment Report
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

			<div className="hp-print-area bg-[var(--app-surface-alt)] min-h-screen py-6 px-4">
				<div
					className="hp-page bg-[var(--app-card)] mx-auto p-6 shadow-md"
					style={{ maxWidth: 1050, fontFamily: 'Tahoma, sans-serif', fontSize: 12 }}
				>
					<table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
						<tbody>
							<tr>
								<td style={{ width: '76%' }}>{ci.BRANCH_NAME} Branch</td>
								<td>Date: {todayShort()}</td>
							</tr>
							<tr><td /><td>Page: 1</td></tr>
						</tbody>
					</table>

					<div style={{ textAlign: 'center', marginBottom: 8 }}>
						<strong><u>CUSTOMER HISTORY PAYMENT REPORT</u><br />As of {todayLong()}</strong>
					</div>

					<table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
						<tbody>
							<tr>
								<td style={{ width: '15%' }}>Transaction Code</td>
								<td style={{ width: '33%' }}>: {ci.trans_code}</td>
								<td style={{ width: '10%' }} rowSpan={2}>Address</td>
								<td style={{ width: '42%' }} rowSpan={2}>: {ci.ADDRESS}</td>
							</tr>
							<tr>
								<td>Customer No.</td>
								<td>: {ci.LESSEE_NO}</td>
							</tr>
							<tr>
								<td>Contract No.</td>
								<td>: {report.leaseNo} \ {ci.LESSEE_NM}</td>
								<td>Telp</td>
								<td>: {[ci.PHONE1, ci.PHONE2, ci.PHONE3].filter(Boolean).join(', ')}</td>
							</tr>
						</tbody>
					</table>

					<table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
						<thead>
							<tr style={{ backgroundColor: '#f0f0f0', textAlign: 'center' }}>
								{['No.', 'Cheque No.', 'Date Due', 'Bank', 'Amount', 'OD Days', 'Sts', 'Payment Date', 'Penalty Charge', 'Shortage', 'Inkaso', 'Remark'].map(h => (
									<th key={h} style={td}>{h}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{report.payments.map((row, ri) => {
								let displayGiro: string;
								if (row.girono === prevGiro) { displayGiro = ''; }
								else { displayGiro = row.girono ?? ''; prevGiro = row.girono ?? ''; }

								const isAsterisk = String(row.period ?? '').includes('*');
								if (!isAsterisk) rowNum++;

								let odDays = '';
								if (row.status != null && row.payment && row.girodt) {
									const [pd, pm, py] = row.payment.split('-').map(Number);
									const [gd, gm, gy] = row.girodt.split('-').map(Number);
									const diff = Math.floor(
										(new Date(gy, gm - 1, gd).getTime() - new Date(py, pm - 1, pd).getTime()) / 86400000
									);
									odDays = diff > 0 ? String(diff) : '0';
								}

								return (
									<tr key={ri}>
										<td style={{ ...td, textAlign: 'center' }}>{isAsterisk ? '' : rowNum}</td>
										<td style={{ ...td, textAlign: 'center' }}>{displayGiro}</td>
										<td style={{ ...td, textAlign: 'center' }}>{row.girodt}</td>
										<td style={td}>{row.bank}</td>
										<td style={{ ...td, textAlign: 'right' }}>{fmt(row.nominal)}</td>
										<td style={{ ...td, textAlign: 'center' }}>{odDays}</td>
										<td style={{ ...td, textAlign: 'center' }}>{row.status}</td>
										<td style={{ ...td, textAlign: 'center' }}>{row.payment}</td>
										<td style={{ ...td, textAlign: 'right' }}>{fmt(row.penalty)}</td>
										<td style={{ ...td, textAlign: 'right' }}>{fmt(row.Shortage)}</td>
										<td style={{ ...td, textAlign: 'right' }}>{fmt(row.inkaso * 25000)}</td>
										<td style={td}>{row.reject_description}</td>
									</tr>
								);
							})}

							<tr>
								<td colSpan={4} style={{ ...td, textAlign: 'right' }}><strong>TOTAL</strong></td>
								<td style={{ ...td, textAlign: 'right' }}><strong>{fmt(report.totAmount)}</strong></td>
								<td colSpan={3} style={td} />
								<td style={{ ...td, textAlign: 'right' }}><strong>{fmt(report.totPenalty)}</strong></td>
								<td style={{ ...td, textAlign: 'right' }}><strong>{fmt(report.totShortage)}</strong></td>
								<td style={{ ...td, textAlign: 'right' }}><strong>{fmt(report.totInkaso)}</strong></td>
								<td style={td} />
							</tr>
							<tr>
								<td colSpan={8} style={{ ...td, textAlign: 'right' }}><strong>TOTAL PAYMENT</strong></td>
								<td style={{ ...td, textAlign: 'right' }}><strong>{fmt(report.penaltyPayment)}</strong></td>
								<td style={{ ...td, textAlign: 'right' }}><strong>{fmt(report.shortagePay)}</strong></td>
								<td style={{ ...td, textAlign: 'right' }}><strong>{fmt(report.inkasoPay)}</strong></td>
								<td style={td} />
							</tr>
						</tbody>
					</table>

					<table style={{ width: '100%', borderCollapse: 'collapse' }}>
						<tbody>
							<tr>
								<td style={{ width: '11%' }}>Supplier</td>
								<td style={{ width: '35%' }}>: {ci.suppname}</td>
								<td style={{ width: '7%' }}>Chasis</td>
								<td style={{ width: '18%' }}>: {ci.CHASIS}</td>
								<td style={{ width: '10%' }}>Blocking Date</td>
								<td style={{ width: '19%' }}>: {ci.DATEBLOKIR}</td>
							</tr>
							<tr>
								<td>BPKB A/N</td><td>: {ci.BPKB_AN}</td>
								<td>Engine</td><td>: {ci.ENGINE}</td>
								<td>No. Blocking</td><td>: {ci.NOPOLBLOKIR}</td>
							</tr>
							<tr>
								<td>Police No.</td><td>: {ci.POLICENO}</td>
								<td>Year</td><td>: {ci.TAHUN}</td>
								<td>Contract Status</td><td>: {ci.status_kontrak} {ci.JFG}</td>
							</tr>
							<tr>
								<td>Type</td><td>: {ci.TYPE_NM}</td>
								<td>Colour</td><td colSpan={3}>: {ci.COLOUR}</td>
							</tr>
							<tr>
								<td>Model</td><td>: {ci.MODEL_NM}</td>
								<td /><td colSpan={3} />
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</>
	);
}

export default function LeasePaymentReportModal({ leaseNo, onClose }: { leaseNo: string; onClose: () => void }) {
	useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		const topWindow = getTopWindow();
		topWindow.addEventListener('keydown', handler);
		return () => topWindow.removeEventListener('keydown', handler);
	}, [onClose]);

	useLayoutEffect(() => {
		ensureStylesBridged(getTopWindow());
	}, []);

	const { data: report, isLoading, isError } = useQuery({
		queryKey: ['cam-history-payment-report', leaseNo],
		queryFn: async () => {
			const { data } = await api.get<{ contractInfo: ContractInfo; payments: PaymentRow[] }>(
				'/HistoryPayment/history-payment/print',
				{ params: { lease_no: leaseNo } },
			);
			return buildLeaseReport(leaseNo, data);
		},
	});

	return createPortal(
		<div className="fixed inset-0 z-50 bg-[var(--app-card)] overflow-auto" role="dialog" aria-modal="true">
			{isLoading && (
				<div className="flex flex-col items-center justify-center min-h-screen gap-3 text-[var(--app-muted)]">
					<svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
					</svg>
					<span className="text-sm">Loading payment history…</span>
				</div>
			)}
			{isError && (
				<div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
					<p className="text-red-600 text-center">Could not load payment history for this contract.</p>
					<button
						onClick={onClose}
						className="px-4 py-2 bg-[var(--app-surface-alt)] hover:bg-gray-200 rounded-lg text-[var(--app-text)] font-medium transition"
					>
						Close
					</button>
				</div>
			)}
			{!isLoading && !isError && report && (
				<PrintPreview report={report} onClose={onClose} />
			)}
		</div>,
		getTopWindow().document.body
	);
}
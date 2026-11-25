import React, { useState } from 'react';
import api from '@/shared/api/axiosInstance';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';

const SipesatPage: React.FC = () => {
	const [period, setPeriod] = useState<Date | null>(null);
	const [exporting, setExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const formatPeriod = (date: Date | null): string => (date ? format(date, 'MM-yyyy') : '');

	const filenameFrom = (disposition: unknown, fallback: string): string => {
		const raw = typeof disposition === 'string' ? disposition : '';
		const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(raw);
		if (!match) return fallback;
		try {
			return decodeURIComponent(match[1]).trim();
		} catch {
			return match[1].trim();
		}
	};

	const handleExport = async () => {
		if (!period) {
			setError('Please select period first');
			return;
		}

		setExporting(true);
		setError(null);
		try {
			const response = await api.get('/SIPESAT/export/excel', {
				params: { period: formatPeriod(period) },
				responseType: 'blob',
			});
			const blob = new Blob([response.data], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const fallback = `PELAPORAN SIPESAT ${format(period, 'MMMM yyyy').toUpperCase()}.xlsx`;
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filenameFrom(response.headers?.['content-disposition'], fallback);
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error('SIPESAT export error:', err);
			setError('Failed to generate report. Please try again.');
		} finally {
			setExporting(false);
		}
	};

	const handleClose = () => {
		window.location.href = '/';
	};

	return (
		<div className="min-h-screen bg-[var(--app-surface)] py-6">
			<div className="max-w-full mx-auto">
				<div className="mb-6">
					<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-lg shadow p-4 flex justify-between items-center">
						<h1 className="text-xl font-bold text-[var(--app-text)]">PELAPORAN SIPESAT</h1>
					</div>
				</div>

				<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-lg shadow">
					<div className="p-6 space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="space-y-2">
								<label className="block text-sm font-medium text-[var(--app-text)]">
									As Of <span className="text-red-500">*</span>
								</label>
								<DatePicker
									selected={period}
									onChange={(date) => setPeriod(date)}
									showMonthYearPicker
									dateFormat="MM/yyyy"
									placeholderText="Select Month & Year"
									className="w-full px-4 py-3 border border-[var(--app-border)] rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all bg-white text-slate-900 placeholder-slate-400 [color-scheme:light]"
									popperPlacement="bottom-start"
									calendarClassName="rounded-lg shadow-xl border border-[var(--app-border)]"
								/>
							</div>

							<div className="md:col-span-2 flex items-start h-full pt-1">
								<p className="text-sm text-red-500 italic leading-relaxed">
									*Data yang disajikan merupakan data per akhir bulan dari bulan yang dipilih.
								</p>
							</div>
						</div>

						{error && (
							<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
								{error}
							</div>
						)}

						<div className="flex flex-wrap gap-4 pt-4 border-t border-[var(--app-border)]">
							<button
								onClick={handleClose}
								className="px-6 py-2.5 border border-[var(--app-border)] rounded-lg font-medium text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors"
							>
								Close
							</button>
							<button
								onClick={handleExport}
								disabled={exporting || !period}
								className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all flex items-center gap-2
									${exporting || !period
										? 'bg-orange-300 cursor-not-allowed'
										: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 shadow-sm hover:shadow'
									}`}
							>
								{exporting ? (
									<>
										<svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
										</svg>
										Exporting...
									</>
								) : (
									<>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
												d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
										Export to Excel
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SipesatPage;
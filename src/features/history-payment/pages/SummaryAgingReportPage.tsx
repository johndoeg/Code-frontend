import React, { useState, useEffect } from 'react';
import api from '@/shared/api/axiosInstance';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';

const toISO = (d: Date): string => d.toISOString().split('T')[0];

interface ComboOption {
	value: string;
	label: string;
}

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const fileMessage = async (err: any, fallback: string): Promise<string> => {
	const d = err?.response?.data;
	if (d instanceof Blob) {
		try {
			const j = JSON.parse(await d.text());
			return j.error || j.message || fallback;
		} catch {
			return fallback;
		}
	}
	return d?.error || d?.message || fallback;
};

const saveBlob = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const openPdf = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	if (!window.open(url, '_blank')) saveBlob(blob, filename);
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const SummaryAgingReportPage: React.FC = () => {
	const [asof, setAsof] = useState<Date | null>(new Date());
	const [by, setBy] = useState('0');
	const [excludeJf, setExcludeJf] = useState(false);
	const [byOptions, setByOptions] = useState<ComboOption[]>([]);
	const [exporting, setExporting] = useState<null | 'excel' | 'pdf'>(null);
	const [comboLoad, setComboLoad] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		api.get('/SummaryAging/combo')
			.then(res => setByOptions(res.data ?? []))
			.catch(() => setError('Failed to load filter options.'))
			.finally(() => setComboLoad(false));
	}, []);

	const handleExport = async (type: 'excel' | 'pdf') => {
		if (!asof) { alert('Please select a date first.'); return; }
		if (type === 'pdf' && by !== '0') {
			alert('PDF export is only available for By Branch.');
			return;
		}

		setExporting(type);
		setError(null);

		try {
			const response = await api.get(`/SummaryAging/${type}`, {
				params: { asof: toISO(asof), by, cek_jf: excludeJf ? '1' : '0' },
				responseType: 'blob',
				timeout: 0,
			});

			const mime = type === 'excel' ? XLSX : 'application/pdf';
			const blob = new Blob([response.data], { type: mime });
			const stamp = toISO(asof);

			if (type === 'pdf') {
				openPdf(blob, `SummaryAging_${stamp}.pdf`);
			} else {
				saveBlob(blob, `SummaryAging_${stamp}.xlsx`);
			}
		} catch (err: any) {
			console.error(err);
			setError(await fileMessage(err, `Failed to export ${type.toUpperCase()}. Please try again.`));
		} finally {
			setExporting(null);
		}
	};

	const busy = exporting !== null;

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">

					<div className="mb-6">
						<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">
							Summary Aging Report
						</h1>
						<p className="text-sm text-[var(--app-muted)] mt-1">Car Financing Only</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
						<AsOfDatePicker value={asof} onChange={setAsof} format="DD MMM YYYY" />
						<div>
							<label className="block text-sm font-medium text-[var(--app-text)] mb-1">
								By
							</label>
							<select
								value={by}
								onChange={e => setBy(e.target.value)}
								disabled={comboLoad || busy}
								className="w-full px-4 py-3 border border-[var(--app-border)] rounded-lg shadow-sm bg-white text-slate-900
								           focus:outline-none focus:ring-2 focus:ring-blue-500
								           focus:border-blue-500 disabled:bg-[var(--app-surface-alt)]"
							>
								{byOptions.map(o => (
									<option key={o.value} value={o.value} style={optionStyle}>{o.label}</option>
								))}
							</select>
						</div>
					</div>

					<div className="mb-6">
						<label className="flex items-center gap-2 cursor-pointer w-fit">
							<input
								type="checkbox"
								checked={excludeJf}
								onChange={e => setExcludeJf(e.target.checked)}
								disabled={busy}
								className="w-4 h-4 accent-blue-600"
							/>
							<span className="text-sm text-[var(--app-text)]">Exclude JF Portion</span>
						</label>
					</div>

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
							{error}
						</div>
					)}

					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => handleExport('excel')}
							disabled={busy}
							className="bg-gradient-to-r from-green-600 to-emerald-700
							           hover:from-green-700 hover:to-emerald-800
							           text-white px-4 py-2 text-sm rounded-lg font-medium
							           shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{exporting === 'excel' ? 'Exporting…' : 'Export to Excel'}
						</button>

						<button
							onClick={() => handleExport('pdf')}
							disabled={busy || by !== '0'}
							title={by !== '0' ? 'PDF is only available for By Branch' : ''}
							className="bg-gradient-to-r from-red-600 to-rose-700
							           hover:from-red-700 hover:to-rose-800
							           text-white px-4 py-2 text-sm rounded-lg font-medium
							           shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{exporting === 'pdf' ? 'Generating…' : 'Export to PDF'}
						</button>
					</div>

				</div>
			</div>
		</div>
	);
};

export default SummaryAgingReportPage;
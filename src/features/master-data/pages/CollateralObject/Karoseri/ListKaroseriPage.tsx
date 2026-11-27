import React, { useCallback, useEffect, useState } from "react";
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';
import { filenameFromDisposition } from '@/shared/utils/helpers';
import { alertFillField, showAlert } from '@/helpers/AlertDialog';
import PrintPreview, { PRINT_TD, PRINT_TH } from '@/helpers/PrintPreview';

interface KaroseriRow {
	MODEL_NM: string;
	KAROSERI_DESC: string;
}

interface ModelOption {
	value: string;
	label: string;
}

interface PrintReport {
	rows: KaroseriRow[];
	printBy: string;
	printDate: string;
}

const MODEL_REQUIRED_MESSAGE = "Please select a Model.";

function KaroseriPrintPreview({ report, onClose }: { report: PrintReport; onClose: () => void }) {
	return (
		<PrintPreview label="List of Karoseri" onClose={onClose} landscape={false} pageWidth={900}>
			<div style={{ textAlign: 'center', fontSize: 16, letterSpacing: '0.2em', fontWeight: 'bold' }}>
				List of Karoseri
			</div>
			<div style={{ textAlign: 'center', marginBottom: 8 }}>
				Print By - Date : {report.printBy} - {report.printDate}
			</div>

			<table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
				<colgroup>
					<col style={{ width: '10%' }} />
					<col style={{ width: '20%' }} />
					<col style={{ width: '70%' }} />
				</colgroup>
				<thead>
					<tr>
						<th style={PRINT_TH}>No.</th>
						<th style={PRINT_TH}>Model</th>
						<th style={PRINT_TH}>Karoseri</th>
					</tr>
				</thead>
				<tbody>
					{report.rows.length === 0 ? (
						<tr>
							<td colSpan={3} style={{ ...PRINT_TD, textAlign: 'center', color: '#EE0000', fontSize: 16 }}>
								Data Not Found..
							</td>
						</tr>
					) : (
						report.rows.map((r, idx) => (
							<tr key={idx}>
								<td style={{ ...PRINT_TD, textAlign: 'center' }}>{idx + 1}</td>
								<td style={PRINT_TD}>{r.MODEL_NM}</td>
								<td style={PRINT_TD}>{r.KAROSERI_DESC}</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</PrintPreview>
	);
}

const ListKaroseriPage: React.FC = () => {
	const [rows, setRows] = useState<KaroseriRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [printing, setPrinting] = useState(false);
	const [printReport, setPrintReport] = useState<PrintReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [previewed, setPreviewed] = useState(false);

	const [model, setModel] = useState("");
	const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);

	const [page, setPage] = useState(1);
	const limit = DEFAULT_PAGE_LIMIT;

	useEffect(() => {
		const fetchOptions = async () => {
			try {
				const res = await api.get('/MasterData/list-karoseri/model-options');
				setModelOptions(res.data.data.map((m: any) => ({ value: m.MODEL, label: m.MODEL_NM })));
			} catch { }
		};
		fetchOptions();
	}, []);

	const hasModel = () => {
		if (!model) {
			alertFillField(MODEL_REQUIRED_MESSAGE);
			return false;
		}
		return true;
	};

	const handleModelChange = (value: string) => {
		setModel(value);
		setPreviewed(false);
		setRows([]);
		setPage(1);
		setError(null);
	};

	const handlePreview = async () => {
		if (!hasModel()) return;
		setLoading(true);
		setError(null);
		try {
			const res = await api.get('/MasterData/list-karoseri', { params: { model } });
			setRows(res.data.data || []);
			setPreviewed(true);
			setPage(1);
		} catch {
			setError("Failed to load data. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handlePrint = async () => {
		if (!hasModel()) return;
		setPrinting(true);
		try {
			const { data } = await api.get('/MasterData/list-karoseri/print', { params: { model } });
			setPrintReport({
				rows: data.data || [],
				printBy: data.print_by || '',
				printDate: data.print_date || '',
			});
		} catch {
			showAlert('Failed to load print data. Please try again.', { variant: 'error' });
		} finally {
			setPrinting(false);
		}
	};

	const handleExportExcel = async () => {
		if (!hasModel()) return;
		setExporting(true);
		try {
			const res = await api.get('/MasterData/list-karoseri/excel', {
				params: { model },
				responseType: 'blob',
			});
			const blob = new Blob([res.data], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filenameFromDisposition(res.headers['content-disposition'], 'ListofKaroseri.xlsx');
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch {
			showAlert('Failed to export. Please try again.', { variant: 'error' });
		} finally {
			setExporting(false);
		}
	};

	const closePrint = useCallback(() => setPrintReport(null), []);

	const totalPages = Math.ceil(rows.length / limit);
	const paginatedRows = rows.slice((page - 1) * limit, page * limit);

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">

				<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6 mb-6">
					<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)] mb-6">List of Karoseri</h1>

					<div className="mb-6">
						<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Model</label>
						<div className="relative w-full md:w-80">
							<select
								value={model}
								onChange={(e) => handleModelChange(e.target.value)}
								className="w-full border border-[var(--app-border)] bg-white text-slate-900 rounded-lg pl-3 pr-14 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="" className="bg-white text-slate-900">Select</option>
								{modelOptions.map((m) => (
									<option key={m.value} value={m.value} className="bg-white text-slate-900">{m.label}</option>
								))}
							</select>
							{model && (
								<button
									type="button"
									onClick={() => handleModelChange("")}
									aria-label="Clear model"
									className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5
                             text-slate-500 hover:bg-slate-100 hover:text-slate-900"
								>
									<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
									</svg>
								</button>
							)}
						</div>
					</div>

					<div className="flex flex-wrap gap-3">
						<button
							onClick={handlePreview}
							disabled={loading}
							className={`bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all flex items-center gap-2 ${loading ? "opacity-75 cursor-not-allowed" : ""}`}
						>
							{loading ? (
								<>
									<svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
									</svg>
									Loading...
								</>
							) : (
								<>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
									Preview
								</>
							)}
						</button>

						<button
							onClick={handlePrint}
							disabled={printing}
							className={`border border-[var(--app-border)] text-[var(--app-text)] hover:bg-[var(--app-surface)] px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${printing ? "opacity-60 cursor-not-allowed" : ""}`}
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
							</svg>
							{printing ? "Preparing..." : "Print"}
						</button>

						<button
							onClick={handleExportExcel}
							disabled={exporting}
							className={`bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${exporting ? "opacity-60 cursor-not-allowed" : ""}`}
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							{exporting ? "Exporting..." : "Export to Excel"}
						</button>
					</div>
				</div>

				{error && (
					<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
						{error}
						<button onClick={handlePreview} className="ml-4 underline text-red-900">Retry</button>
					</div>
				)}

				{previewed && (
					<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold text-[var(--app-text)]">Results</h2>
							<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
								Total: {rows.length}
							</span>
						</div>

						<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
							<table className="w-full">
								<colgroup>
									<col style={{ width: '10%' }} />
									<col style={{ width: '20%' }} />
									<col style={{ width: '70%' }} />
								</colgroup>
								<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
									<tr>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-text)] uppercase tracking-wider">No.</th>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-text)] uppercase tracking-wider">Model</th>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-text)] uppercase tracking-wider">Karoseri</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--app-border)]">
									{rows.length === 0 ? (
										<tr>
											<td colSpan={3} className="py-10 px-6 text-center text-red-500 font-medium text-lg">
												Data Not Found..
											</td>
										</tr>
									) : (
										paginatedRows.map((row, idx) => (
											<tr
												key={(page - 1) * limit + idx}
												className={`align-top hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
											>
												<td className="py-4 px-6 text-sm text-[var(--app-text)]">{(page - 1) * limit + idx + 1}</td>
												<td className="py-4 px-6 text-sm font-medium text-[var(--app-text)]">{row.MODEL_NM}</td>
												<td className="py-4 px-6 text-sm text-[var(--app-text)]">{row.KAROSERI_DESC}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						{rows.length > 0 && (
							<Pagination
								page={page}
								totalPages={totalPages}
								onPageChange={setPage}
								totalItems={rows.length}
								itemsPerPage={limit}
								className="mt-5"
							/>
						)}
					</div>
				)}
			</div>

			{printReport && <KaroseriPrintPreview report={printReport} onClose={closePrint} />}
		</div>
	);
};

export default ListKaroseriPage;
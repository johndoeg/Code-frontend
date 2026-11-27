import React, { useCallback, useState } from "react";
import api from '@/shared/api/axiosInstance';
import { filenameFromDisposition } from '@/shared/utils/helpers';
import { showAlert } from '@/helpers/AlertDialog';
import PrintPreview, { PRINT_TD, PRINT_TH } from '@/helpers/PrintPreview';

interface ModelRow {
	no: number;
	MODEL_NM: string;
}

interface PrintReport {
	rows: ModelRow[];
	printBy: string;
	printDate: string;
}

function ModelPrintPreview({ report, onClose }: { report: PrintReport; onClose: () => void }) {
	return (
		<PrintPreview label="List of Model" onClose={onClose} landscape={false} pageWidth={800}>
			<div style={{ textAlign: 'center', fontSize: 16, letterSpacing: '0.2em', fontWeight: 'bold' }}>
				List of Model
			</div>
			<div style={{ textAlign: 'center', marginBottom: 8 }}>
				Print By - Date : {report.printBy} - {report.printDate}
			</div>

			<table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
				<colgroup>
					<col style={{ width: '10%' }} />
					<col style={{ width: '90%' }} />
				</colgroup>
				<thead>
					<tr>
						<th style={PRINT_TH}>No.</th>
						<th style={PRINT_TH}>Model</th>
					</tr>
				</thead>
				<tbody>
					{report.rows.length === 0 ? (
						<tr>
							<td colSpan={2} style={{ ...PRINT_TD, textAlign: 'center', color: '#EE0000', fontSize: 16 }}>
								Data Not Found..
							</td>
						</tr>
					) : (
						report.rows.map((r) => (
							<tr key={r.no}>
								<td style={{ ...PRINT_TD, textAlign: 'center' }}>{r.no}</td>
								<td style={PRINT_TD}>{r.MODEL_NM}</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</PrintPreview>
	);
}

const ListModelPage: React.FC = () => {
	const [rows, setRows] = useState<ModelRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [printing, setPrinting] = useState(false);
	const [printReport, setPrintReport] = useState<PrintReport | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [previewed, setPreviewed] = useState(false);

	const handlePreview = async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await api.get('/MasterData/list-model');
			setRows(res.data.data || []);
			setPreviewed(true);
		} catch {
			setError("Failed to load data. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handlePrint = async () => {
		setPrinting(true);
		try {
			const { data } = await api.get('/MasterData/list-model/print');
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
		setExporting(true);
		try {
			const res = await api.get('/MasterData/list-model/excel', { responseType: 'blob' });
			const blob = new Blob([res.data], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filenameFromDisposition(res.headers['content-disposition'], 'ListofModel.xlsx');
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

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">

				<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6 mb-6">
					<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)] mb-6">List of Model</h1>

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
									<col style={{ width: '90%' }} />
								</colgroup>
								<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
									<tr>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-text)] uppercase tracking-wider">No.</th>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-text)] uppercase tracking-wider">Model</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--app-border)]">
									{rows.length === 0 ? (
										<tr>
											<td colSpan={2} className="py-10 px-6 text-center text-red-500 font-medium text-lg">
												Data Not Found..
											</td>
										</tr>
									) : (
										rows.map((row, idx) => (
											<tr
												key={row.no}
												className={`hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
											>
												<td className="py-4 px-6 text-sm text-[var(--app-text)]">{row.no}</td>
												<td className="py-4 px-6 text-sm text-[var(--app-text)] font-medium">{row.MODEL_NM}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>

			{printReport && <ModelPrintPreview report={printReport} onClose={closePrint} />}
		</div>
	);
};

export default ListModelPage;
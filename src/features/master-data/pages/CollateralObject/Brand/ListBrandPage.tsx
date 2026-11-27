import React, { useEffect, useState, useCallback } from "react";
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';
import { filenameFromDisposition } from '@/shared/utils/helpers';
import { alertFillField, showAlert } from '@/helpers/AlertDialog';
import PrintPreview, { PRINT_TD, PRINT_TH } from '@/helpers/PrintPreview';

interface VehicleRow {
	no: number;
	TYPE: string;
	TYPE_NM: string;
	BRAND_NM: string;
	MODEL_NM: string;
}

interface SelectOption {
	value: string;
	label: string;
}

interface PrintReport {
	rows: VehicleRow[];
	printBy: string;
	printDate: string;
}

const COLUMNS: { label: string; key: keyof VehicleRow; width: string }[] = [
	{ label: 'No.', key: 'no', width: '10%' },
	{ label: 'Brand', key: 'BRAND_NM', width: '20%' },
	{ label: 'Model', key: 'MODEL_NM', width: '20%' },
	{ label: 'Type', key: 'TYPE', width: '20%' },
	{ label: 'Type Name', key: 'TYPE_NM', width: '30%' },
];

const ClearButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
	<button
		type="button"
		onClick={onClick}
		aria-label={label}
		className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5
               text-slate-500 hover:bg-slate-100 hover:text-slate-900"
	>
		<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
			<path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
		</svg>
	</button>
);

function BrandPrintPreview({ report, onClose }: { report: PrintReport; onClose: () => void }) {
	return (
		<PrintPreview label="List of Brand" onClose={onClose} landscape={false} pageWidth={900}>
			<div style={{ textAlign: 'center', fontSize: 16, letterSpacing: '0.2em', fontWeight: 'bold' }}>
				List of Brand
			</div>
			<div style={{ textAlign: 'center', marginBottom: 8 }}>
				Print By - Date : {report.printBy} - {report.printDate}
			</div>

			<table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
				<colgroup>
					{COLUMNS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
				</colgroup>
				<thead>
					<tr>
						{COLUMNS.map((c) => <th key={c.key} style={PRINT_TH}>{c.label}</th>)}
					</tr>
				</thead>
				<tbody>
					{report.rows.length === 0 ? (
						<tr>
							<td colSpan={COLUMNS.length} style={{ ...PRINT_TD, textAlign: 'center', color: '#EE0000', fontSize: 16 }}>
								Data Not Found..
							</td>
						</tr>
					) : (
						report.rows.map((r, idx) => (
							<tr key={`${r.TYPE}-${idx}`}>
								{COLUMNS.map((c) => (
									<td key={c.key} style={{ ...PRINT_TD, textAlign: c.key === 'no' ? 'center' : 'left' }}>
										{r[c.key]}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</PrintPreview>
	);
}

const ListBrandPage: React.FC = () => {
	const [rows, setRows] = useState<VehicleRow[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [previewed, setPreviewed] = useState(false);
	const limit = DEFAULT_PAGE_LIMIT;

	const [brand, setBrand] = useState("");
	const [model, setModel] = useState("");
	const [appliedBrand, setAppliedBrand] = useState("");
	const [appliedModel, setAppliedModel] = useState("");

	const [brandOptions, setBrandOptions] = useState<SelectOption[]>([]);
	const [modelOptions, setModelOptions] = useState<SelectOption[]>([]);

	const [exporting, setExporting] = useState(false);
	const [printing, setPrinting] = useState(false);
	const [printReport, setPrintReport] = useState<PrintReport | null>(null);

	useEffect(() => {
		const fetchOptions = async () => {
			try {
				const [brandsRes, modelsRes] = await Promise.all([
					api.get('/MasterData/list-brand/brand-options'),
					api.get('/MasterData/list-brand/model-options'),
				]);
				setBrandOptions(brandsRes.data.data.map((b: any) => ({ value: b.BRAND, label: b.BRAND_NM })));
				setModelOptions(modelsRes.data.data.map((m: any) => ({ value: m.MODEL, label: m.MODEL_NM })));
			} catch { }
		};
		fetchOptions();
	}, []);

	const fetchList = useCallback(async () => {
		if (!appliedBrand && !appliedModel) return;
		setLoading(true);
		setError(null);
		try {
			const response = await api.get('/MasterData/list-brand', {
				params: { brand: appliedBrand, model: appliedModel, page, limit },
			});
			setRows(response.data.data || []);
			setTotal(response.data.total || 0);
		} catch {
			setError("Failed to load data. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [appliedBrand, appliedModel, page, limit]);

	useEffect(() => {
		if (previewed) fetchList();
	}, [fetchList, previewed]);

	const hasFilter = () => {
		if (!brand && !model) {
			alertFillField("Please select at least Brand or Model.");
			return false;
		}
		return true;
	};

	const handlePreview = () => {
		if (!hasFilter()) return;
		setAppliedBrand(brand);
		setAppliedModel(model);
		setPage(1);
		setPreviewed(true);
	};

	const handlePrint = async () => {
		if (!hasFilter()) return;
		setPrinting(true);
		try {
			const { data } = await api.get('/MasterData/list-brand/print', { params: { brand, model } });
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
		if (!hasFilter()) return;
		setExporting(true);
		try {
			const res = await api.get('/MasterData/list-brand/excel', {
				params: { brand, model },
				responseType: 'blob',
			});
			const blob = new Blob([res.data], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filenameFromDisposition(res.headers['content-disposition'], 'ListofBrand.xlsx');
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

	const totalPages = Math.ceil(total / limit);

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">

				<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6 mb-6">
					<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)] mb-6">List of Brand</h1>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
						<div>
							<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Brand</label>
							<div className="relative">
								<select
									value={brand}
									onChange={(e) => setBrand(e.target.value)}
									className="w-full border border-[var(--app-border)] bg-white text-slate-900 rounded-lg pl-3 pr-14 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									<option value="" className="bg-white text-slate-900">Select</option>
									{brandOptions.map((b) => (
										<option key={b.value} value={b.value} className="bg-white text-slate-900">{b.label}</option>
									))}
								</select>
								{brand && <ClearButton onClick={() => setBrand("")} label="Clear brand" />}
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Model</label>
							<div className="relative">
								<select
									value={model}
									onChange={(e) => setModel(e.target.value)}
									className="w-full border border-[var(--app-border)] bg-white text-slate-900 rounded-lg pl-3 pr-14 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									<option value="" className="bg-white text-slate-900">Select</option>
									{modelOptions.map((m) => (
										<option key={m.value} value={m.value} className="bg-white text-slate-900">{m.label}</option>
									))}
								</select>
								{model && <ClearButton onClick={() => setModel("")} label="Clear model" />}
							</div>
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

				{previewed && (
					<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold text-[var(--app-text)]">Results</h2>
							<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
								Total: {total}
							</span>
						</div>

						{error && (
							<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
								{error}
								<button onClick={fetchList} className="ml-4 underline text-red-900">Retry</button>
							</div>
						)}

						<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
							<table className="w-full">
								<colgroup>
									{COLUMNS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
								</colgroup>
								<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
									<tr>
										{COLUMNS.map((c) => (
											<th key={c.key} className="py-4 px-6 text-left text-xs font-medium text-[var(--app-text)] uppercase tracking-wider">
												{c.label}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--app-border)]">
									{loading ? (
										<tr>
											<td colSpan={COLUMNS.length} className="py-4 px-6 text-center">
												<div className="flex justify-center">
													<svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
														<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
														<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
													</svg>
												</div>
											</td>
										</tr>
									) : rows.length === 0 ? (
										<tr>
											<td colSpan={COLUMNS.length} className="py-10 px-6 text-center text-red-500 font-medium text-lg">
												Data Not Found..
											</td>
										</tr>
									) : (
										rows.map((row, idx) => (
											<tr
												key={`${row.TYPE}-${idx}`}
												className={`align-top hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
											>
												<td className="py-4 px-6 text-sm text-[var(--app-text)]">{row.no}</td>
												<td className="py-4 px-6 text-sm font-medium text-[var(--app-text)]">{row.BRAND_NM}</td>
												<td className="py-4 px-6 text-sm text-[var(--app-text)]">{row.MODEL_NM}</td>
												<td className="py-4 px-6 text-sm text-[var(--app-text)]">{row.TYPE}</td>
												<td className="py-4 px-6 text-sm text-[var(--app-text)]">{row.TYPE_NM}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						{!loading && total > 0 && (
							<Pagination
								page={page}
								totalPages={totalPages}
								onPageChange={setPage}
								totalItems={total}
								itemsPerPage={limit}
								className="mt-6"
							/>
						)}
					</div>
				)}
			</div>

			{printReport && <BrandPrintPreview report={printReport} onClose={closePrint} />}
		</div>
	);
};

export default ListBrandPage;
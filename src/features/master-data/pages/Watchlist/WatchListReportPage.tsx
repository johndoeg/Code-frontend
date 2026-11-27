import React, { useCallback, useState } from 'react';
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';
import { filenameFromDisposition } from '@/shared/utils/helpers';
import { alertFillField, showAlert } from '@/helpers/AlertDialog';
import PrintPreview, { PRINT_TD, PRINT_TH } from '@/helpers/PrintPreview';

type SearchBy = '' | '1' | '2';

interface WatchlistRow {
	no: number;
	name: string;
	customer_no: string;
	address: string;
	id_card: string;
	phone: string;
	reason: string;
	create_user: string;
	create_date: string;
	status: 'Active' | 'Deleted';
	delete_by: string;
}

interface HeaderInfo {
	search_desc: string;
	view_desc: string;
	as_of: string;
	as_of_label: string;
}

interface ListResponse extends HeaderInfo {
	data: WatchlistRow[];
	page: number;
	page_size: number;
	total: number;
	total_pages: number;
}

interface PrintResponse extends HeaderInfo {
	data: WatchlistRow[];
	total: number;
}

interface FilterParams {
	as_of: string;
	searchby: SearchBy;
	searchbytext: string;
	existing: '1' | '0';
	deleted: '1' | '0';
}

const PAGE_SIZE = DEFAULT_PAGE_LIMIT;
const AS_OF_REQUIRED_MESSAGE = 'Please fill the as of date first.';

const COLUMNS: { label: string; width: string }[] = [
	{ label: 'No', width: '4%' },
	{ label: 'Customer Name', width: '13%' },
	{ label: 'Customer Number', width: '9%' },
	{ label: 'Address', width: '20%' },
	{ label: 'ID Card', width: '10%' },
	{ label: 'Phone', width: '8%' },
	{ label: 'Reason', width: '10%' },
	{ label: 'Create By', width: '7%' },
	{ label: 'Create Date', width: '7%' },
	{ label: 'Status', width: '5%' },
	{ label: 'Delete By', width: '7%' },
];

const toISO = (d: Date): string => {
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
};

const dateFieldClass =
	'text-[var(--app-text)] [&_label]:!text-[var(--app-text)] [&_input]:!bg-white [&_input]:!text-slate-900 [&_input]:![color-scheme:light]';

const ColGroup: React.FC = () => (
	<colgroup>
		{COLUMNS.map((c) => (
			<col key={c.label} style={{ width: c.width }} />
		))}
	</colgroup>
);

function WatchlistPrintPreview({ report, onClose }: { report: PrintResponse; onClose: () => void }) {
	const infoLabel: React.CSSProperties = { width: 90, padding: '1px 0', verticalAlign: 'top' };
	const infoColon: React.CSSProperties = { width: 12, padding: '1px 0', verticalAlign: 'top' };
	const center: React.CSSProperties = { ...PRINT_TD, textAlign: 'center' };

	return (
		<PrintPreview label="Watchlist Report" onClose={onClose}>
			<div style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold' }}>WATCHLIST REPORT</div>
			<div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 10 }}>As of {report.as_of_label}</div>

			<table style={{ borderCollapse: 'collapse', marginBottom: 8 }}>
				<tbody>
					<tr>
						<td style={infoLabel}>Branch</td>
						<td style={infoColon}>:</td>
						<td>Consolidate</td>
					</tr>
					<tr>
						<td style={infoLabel}>Search by</td>
						<td style={infoColon}>:</td>
						<td>{report.search_desc}</td>
					</tr>
					<tr>
						<td style={infoLabel}>View</td>
						<td style={infoColon}>:</td>
						<td>{report.view_desc}</td>
					</tr>
				</tbody>
			</table>

			<table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
				<ColGroup />
				<thead>
					<tr>
						{COLUMNS.map((c) => (
							<th key={c.label} style={PRINT_TH}>{c.label}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{report.data.length === 0 ? (
						<tr>
							<td colSpan={COLUMNS.length} style={{ ...center, color: '#EE0000', fontWeight: 'bold' }}>
								Data Not Found
							</td>
						</tr>
					) : (
						report.data.map((r) => (
							<tr key={r.no}>
								<td style={center}>{r.no}</td>
								<td style={PRINT_TD}>{r.name}</td>
								<td style={PRINT_TD}>{r.customer_no}</td>
								<td style={PRINT_TD}>{r.address}</td>
								<td style={PRINT_TD}>{r.id_card}</td>
								<td style={PRINT_TD}>{r.phone}</td>
								<td style={PRINT_TD}>{r.reason}</td>
								<td style={PRINT_TD}>{r.create_user}</td>
								<td style={center}>{r.create_date}</td>
								<td style={center}>{r.status}</td>
								<td style={center}>{r.delete_by}</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</PrintPreview>
	);
}

const WatchlistReportPage: React.FC = () => {
	const [asOf, setAsOf] = useState<Date | null>(null);
	const [searchBy, setSearchBy] = useState<SearchBy>('');
	const [searchByText, setSearchByText] = useState('');
	const [existing, setExisting] = useState(false);
	const [deleted, setDeleted] = useState(false);

	const [applied, setApplied] = useState<FilterParams | null>(null);
	const [results, setResults] = useState<WatchlistRow[]>([]);
	const [header, setHeader] = useState<HeaderInfo | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [loading, setLoading] = useState(false);
	const [printing, setPrinting] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [printReport, setPrintReport] = useState<PrintResponse | null>(null);

	const buildParams = (): FilterParams | null => {
		if (!asOf) {
			alertFillField(AS_OF_REQUIRED_MESSAGE);
			return null;
		}
		return {
			as_of: toISO(asOf),
			searchby: searchBy,
			searchbytext: searchBy ? searchByText.trim() : '',
			existing: existing ? '1' : '0',
			deleted: deleted ? '1' : '0',
		};
	};

	const fetchPage = async (params: FilterParams, targetPage: number) => {
		setLoading(true);
		setError(null);
		try {
			const { data } = await api.get<ListResponse>('/MasterData/watchlist-report/list', {
				params: { ...params, page: targetPage, page_size: PAGE_SIZE },
			});
			setResults(data.data || []);
			setHeader({
				search_desc: data.search_desc,
				view_desc: data.view_desc,
				as_of: data.as_of,
				as_of_label: data.as_of_label,
			});
			setPage(data.page);
			setTotalPages(data.total_pages);
			setTotal(data.total);
		} catch {
			setError('Failed to load data. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handlePreview = () => {
		const params = buildParams();
		if (!params) return;
		setApplied(params);
		fetchPage(params, 1);
	};

	const handlePageChange = (newPage: number) => {
		if (applied) fetchPage(applied, newPage);
	};

	const handlePrint = async () => {
		const params = buildParams();
		if (!params) return;
		setPrinting(true);
		try {
			const { data } = await api.get<PrintResponse>('/MasterData/watchlist-report/print', { params });
			setPrintReport({ ...data, data: data.data || [] });
		} catch {
			showAlert('Failed to load print data. Please try again.', { variant: 'error' });
		} finally {
			setPrinting(false);
		}
	};

	const handleExport = async () => {
		const params = buildParams();
		if (!params) return;
		setExporting(true);
		try {
			const res = await api.get('/MasterData/watchlist-report/excel', {
				params,
				responseType: 'blob',
			});
			const blob = new Blob([res.data], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filenameFromDisposition(res.headers['content-disposition'], 'Watchlist.xlsx');
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch {
			showAlert('Failed to export. Please try again.', { variant: 'error' });
		} finally {
			setExporting(false);
		}
	};

	const handleSearchByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSearchBy(e.target.value as SearchBy);
		setSearchByText('');
	};

	const closePrint = useCallback(() => setPrintReport(null), []);

	const cell = 'border border-[var(--app-border)] px-2 py-1 align-top';

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6 mb-6">
					<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)] mb-6">Watchlist Report</h1>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<div>
							<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Branch</label>
							<div className="px-3 py-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] text-sm">
								Consolidate
							</div>
						</div>

						<div className={dateFieldClass}>
							<AsOfDatePicker
								label="As of"
								format="DD-MM-YYYY"
								placeholder="dd-mm-yyyy"
								value={asOf}
								onChange={setAsOf}
								required
							/>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<div>
							<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Search by</label>
							<select
								value={searchBy}
								onChange={handleSearchByChange}
								className="w-full px-3 py-2 rounded-lg border border-[var(--app-border)] bg-white text-slate-900 text-sm
								           focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="" className="bg-white text-slate-900">Select</option>
								<option value="1" className="bg-white text-slate-900">Customer No</option>
								<option value="2" className="bg-white text-slate-900">Customer Name</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Keyword</label>
							<div className="relative">
								<input
									type="text"
									value={searchByText}
									onChange={(e) => setSearchByText(e.target.value)}
									onKeyDown={(e) => { if (e.key === 'Enter') handlePreview(); }}
									disabled={searchBy === ''}
									placeholder={searchBy === '' ? 'Choose "Search by" first' : ''}
									className="w-full pl-3 pr-10 py-2 rounded-lg border border-[var(--app-border)] bg-white text-slate-900 placeholder:text-slate-400 text-sm
									           focus:outline-none focus:ring-2 focus:ring-blue-500
									           disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
								/>
								{searchByText && (
									<button
										type="button"
										onClick={() => setSearchByText('')}
										aria-label="Clear keyword"
										className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5
										           text-slate-500 hover:bg-slate-100 hover:text-slate-900"
									>
										<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
										</svg>
									</button>
								)}
							</div>
						</div>
					</div>

					<div className="mb-6">
						<label className="block text-sm font-medium text-[var(--app-text)] mb-2">View</label>
						<div className="flex flex-wrap gap-6">
							<label className="flex items-center gap-2 text-sm text-[var(--app-text)] cursor-pointer">
								<input
									type="checkbox"
									checked={existing}
									onChange={(e) => setExisting(e.target.checked)}
									className="h-4 w-4 rounded border-[var(--app-border)] accent-blue-600"
								/>
								Existing in Watchlist Report
							</label>
							<label className="flex items-center gap-2 text-sm text-[var(--app-text)] cursor-pointer">
								<input
									type="checkbox"
									checked={deleted}
									onChange={(e) => setDeleted(e.target.checked)}
									className="h-4 w-4 rounded border-[var(--app-border)] accent-blue-600"
								/>
								Data Deleted from Watchlist Report
							</label>
						</div>
					</div>

					<div className="flex flex-wrap gap-3">
						<button
							onClick={handlePreview}
							disabled={loading}
							className={`bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all flex items-center gap-2 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
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
								'Preview'
							)}
						</button>

						<button
							onClick={handlePrint}
							disabled={printing}
							className={`border border-[var(--app-border)] text-[var(--app-text)] hover:bg-[var(--app-surface)] px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${printing ? 'opacity-60 cursor-not-allowed' : ''}`}
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
							</svg>
							{printing ? 'Preparing...' : 'Print'}
						</button>

						<button
							onClick={handleExport}
							disabled={exporting}
							className={`bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${exporting ? 'opacity-60 cursor-not-allowed' : ''}`}
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							{exporting ? 'Exporting...' : 'Export to Excel'}
						</button>
					</div>
				</div>

				{error && (
					<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
						{error}
						{applied && (
							<button onClick={() => fetchPage(applied, page)} className="ml-4 underline text-red-900">Retry</button>
						)}
					</div>
				)}

				{header && (
					<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6">
						<div className="relative mb-4">
							<h2 className="text-xl font-bold text-[var(--app-text)] text-center">WATCHLIST REPORT</h2>
							<p className="text-center text-sm font-semibold text-[var(--app-text)]">As of {header.as_of_label}</p>
							{total > 0 && (
								<span className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
									Total: {total}
								</span>
							)}
						</div>

						<table className="text-sm text-[var(--app-text)] mb-4">
							<tbody>
								<tr>
									<td className="pr-2 py-0.5 font-medium w-24">Branch</td>
									<td className="pr-2">:</td>
									<td>Consolidate</td>
								</tr>
								<tr>
									<td className="pr-2 py-0.5 font-medium">Search by</td>
									<td className="pr-2">:</td>
									<td>{header.search_desc}</td>
								</tr>
								<tr>
									<td className="pr-2 py-0.5 font-medium">View</td>
									<td className="pr-2">:</td>
									<td>{header.view_desc}</td>
								</tr>
							</tbody>
						</table>

						<div className="overflow-x-auto">
							<table className="w-full min-w-[1000px] text-sm border-collapse table-fixed">
								<ColGroup />
								<thead>
									<tr className="bg-[var(--app-surface-alt)] text-[var(--app-text)]">
										{COLUMNS.map((c) => (
											<th key={c.label} className="border border-[var(--app-border)] px-2 py-2 text-xs font-semibold">
												{c.label}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{results.length === 0 ? (
										<tr>
											<td colSpan={COLUMNS.length} className="border border-[var(--app-border)] px-2 py-6 text-center text-red-600 font-semibold">
												Data Not Found
											</td>
										</tr>
									) : (
										results.map((row, idx) => (
											<tr
												key={row.no}
												className={idx % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}
											>
												<td className={`${cell} text-center`}>{row.no}</td>
												<td className={`${cell} break-words`}>{row.name}</td>
												<td className={`${cell} break-words`}>{row.customer_no}</td>
												<td className={`${cell} break-words`}>{row.address}</td>
												<td className={`${cell} break-words`}>{row.id_card}</td>
												<td className={`${cell} break-words`}>{row.phone}</td>
												<td className={`${cell} break-words`}>{row.reason}</td>
												<td className={`${cell} break-words`}>{row.create_user}</td>
												<td className={`${cell} text-center whitespace-nowrap`}>{row.create_date}</td>
												<td className={`${cell} text-center`}>
													<span className={row.status === 'Deleted' ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
														{row.status}
													</span>
												</td>
												<td className={`${cell} text-center break-words`}>{row.delete_by}</td>
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
								onPageChange={handlePageChange}
								totalItems={total}
								itemsPerPage={PAGE_SIZE}
								className="mt-6"
							/>
						)}
					</div>
				)}
			</div>

			{printReport && <WatchlistPrintPreview report={printReport} onClose={closePrint} />}
		</div>
	);
};

export default WatchlistReportPage;
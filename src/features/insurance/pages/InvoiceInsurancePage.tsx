import React, { useEffect, useState, useCallback, useRef } from "react";
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';
import Formatter from '@/helpers/Formatter';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';

interface InvoiceSummary {
	asof: string;
	disb_month: string;
	tot_kontrak_inv: string;
	tot_biaya_inv: string;
	tot_kontrak_sys: string;
	tot_biaya_sys: string;
	confirmby: string;
	confirmdate: string;
	payment_dt?: string;
	batchno?: string;
}

interface InvoiceDetail {
	lease_no: string;
	lessee_nm: string;
	execution: string;
	batchdt: string;
	totalnett: string;
	gross: string;
	invoice: string;
	system: string;
	remark: string;
	branch: string;
	isconfirm: string;
	confirmby: string;
	confirmdate: string;
	hasil: string;
}

interface FilterOption { value: string; label: string; }

const toLocalISO = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DEFAULT_FILTER = '1';
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const isRejected = (d: InvoiceDetail) => d.invoice === 'N' || d.system === 'N';

const thCls = "py-3 px-4 text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider";

interface Props {
	insurer: 'raksa' | 'simas';
	title: string;
}

const InvoiceInsurancePage: React.FC<Props> = ({ insurer, title }) => {
	const base = `/Insurance/${insurer}`;
	const isRaksa = insurer === 'raksa';
	const isSimas = insurer === 'simas';
	const [summaries, setSummaries] = useState<InvoiceSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const limit = DEFAULT_PAGE_LIMIT;

	const [detailOpen, setDetailOpen] = useState(false);
	const [detailAsof, setDetailAsof] = useState('');
	const [detailMonth, setDetailMonth] = useState('');
	const [filter, setFilter] = useState(DEFAULT_FILTER);
	const [filterOptions, setFilterOptions] = useState<FilterOption[]>([]);
	const [details, setDetails] = useState<InvoiceDetail[]>([]);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detailError, setDetailError] = useState<string | null>(null);
	const [checked, setChecked] = useState<Set<string>>(new Set());
	const [locked, setLocked] = useState(false);
	const [confirmBy, setConfirmBy] = useState('');
	const [confirmDate, setConfirmDate] = useState('');
	const [confirming, setConfirming] = useState(false);
	const detailReq = useRef(0);

	const [uploadOpen, setUploadOpen] = useState(false);
	const [upMonth, setUpMonth] = useState('');
	const [upYear, setUpYear] = useState(String(new Date().getFullYear()));
	const [upFile, setUpFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [upError, setUpError] = useState<string | null>(null);

	const fetchSummaries = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await api.get(`${base}/invoice`, { params: { page, limit } });
			setSummaries(res.data?.data ?? []);
			setTotal(res.data?.total ?? 0);
		} catch {
			setError('Failed to load invoice data. Please try again.');
		} finally {
			setLoading(false);
		}
	}, [base, page, limit]);

	useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

	useEffect(() => {
		api.get('/Insurance/filter-options')
			.then(r => setFilterOptions(r.data ?? []))
			.catch(() => { });
	}, []);

	const loadDetail = useCallback(async (asof: string, flt: string) => {
		const req = ++detailReq.current;
		setDetailLoading(true);
		setDetailError(null);
		try {
			const res = await api.get(`${base}/detail`, { params: { id: asof, filter: flt } });
			if (req !== detailReq.current) return;
			const rows: InvoiceDetail[] = Array.isArray(res.data) ? res.data : [];
			setDetails(rows);
			const done = rows.length > 0 && rows[0].hasil === 'SUDAH';
			setLocked(done);
			setConfirmBy(done ? rows[0].confirmby : '');
			setConfirmDate(done ? rows[0].confirmdate : '');
			setChecked(new Set(rows.filter(d => !isRejected(d) && d.isconfirm === '1').map(d => d.lease_no)));
		} catch {
			if (req !== detailReq.current) return;
			setDetails([]);
			setDetailError('Failed to load invoice details. Please try again.');
		} finally {
			if (req === detailReq.current) setDetailLoading(false);
		}
	}, [base]);

	const openDetail = (row: InvoiceSummary) => {
		setDetailAsof(row.asof);
		setDetailMonth(row.disb_month);
		setFilter(DEFAULT_FILTER);
		setDetails([]);
		setDetailOpen(true);
		loadDetail(row.asof, DEFAULT_FILTER);
	};

	const closeDetail = () => {
		detailReq.current++;
		setDetailOpen(false);
		setDetailError(null);
	};

	const handleFilterChange = (value: string) => {
		setFilter(value);
		loadDetail(detailAsof, value);
	};

	const selectable = details.filter(d => !isRejected(d)).map(d => d.lease_no);
	const allChecked = selectable.length > 0 && selectable.every(l => checked.has(l));

	const toggleAll = (on: boolean) => setChecked(on ? new Set(selectable) : new Set());

	const toggleLease = (lease: string) => {
		setChecked(prev => {
			const next = new Set(prev);
			next.has(lease) ? next.delete(lease) : next.add(lease);
			return next;
		});
	};

	const handleConfirm = async () => {
		if (checked.size === 0) { alert('Please, select at least one contract!'); return; }
		setConfirming(true);
		try {
			const res = await api.post(`${base}/confirm`, {
				asof: detailAsof,
				leases: Array.from(checked),
			});
			alert(res.data?.message || 'Successful');
			closeDetail();
			fetchSummaries();
		} catch (e: any) {
			alert(e.response?.data?.message || 'Failed');
		} finally {
			setConfirming(false);
		}
	};

	const openUpload = () => {
		setUpMonth('');
		setUpYear(String(new Date().getFullYear()));
		setUpFile(null);
		setUpError(null);
		setUploadOpen(true);
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0] ?? null;
		setUpError(null);
		if (f) {
			const ext = f.name.split('.').pop()?.toLowerCase();
			if (ext !== 'xls' && ext !== 'xlsx') { setUpError('Only .xls and .xlsx files are allowed.'); e.target.value = ''; return; }
			if (f.size > MAX_UPLOAD_BYTES) { setUpError('File size exceeds the 25MB limit.'); e.target.value = ''; return; }
		}
		setUpFile(f);
	};

	const handleUpload = async () => {
		if (upMonth === '' || !/^\d{4}$/.test(upYear)) { setUpError('Please fill As Of (month and year).'); return; }
		if (!upFile) { setUpError('Please select an Excel file.'); return; }
		const form = new FormData();
		form.append('period', `${MONTHS[Number(upMonth)]}-${upYear}`);
		form.append('invoiceRaksa', upFile);
		setUploading(true);
		setUpError(null);
		try {
			await api.post(`${base}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
			alert('File uploaded and data inserted successfully!');
			setUploadOpen(false);
			fetchSummaries();
		} catch (e: any) {
			setUpError(e.response?.data?.message || e.response?.data?.error || 'Upload failed. Please try again.');
		} finally {
			setUploading(false);
		}
	};

	const [payOpen, setPayOpen] = useState(false);
	const [payBatch, setPayBatch] = useState('');
	const [payDate, setPayDate] = useState<Date>(new Date());
	const [paying, setPaying] = useState(false);
	const [payError, setPayError] = useState<string | null>(null);

	const openPayment = (batchno: string) => {
		setPayBatch(batchno);
		setPayDate(new Date());
		setPayError(null);
		setPayOpen(true);
	};

	const handlePayment = async () => {
		setPaying(true);
		setPayError(null);
		try {
			const res = await api.post(`${base}/payment`, { batchno: payBatch, pmt_dt: toLocalISO(payDate) });
			alert(res.data?.message || 'Successful');
			setPayOpen(false);
			fetchSummaries();
		} catch (e: any) {
			setPayError(e.response?.data?.message || 'Failed to submit payment date.');
		} finally {
			setPaying(false);
		}
	};

	const startIndex = (page - 1) * limit;
	const totalPages = Math.ceil(total / limit);

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">{title}</h1>
							<p className="text-[var(--app-muted)] mt-1">View and manage your invoice records</p>
						</div>
						<div className="flex items-center gap-3">
							<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
								Total: {total}
							</span>
						</div>
					</div>

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
							{error}
							<button onClick={fetchSummaries} className="ml-4 text-red-900 underline">Retry</button>
						</div>
					)}

					<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
						<table className="w-full">
							<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
								<tr>
									<th rowSpan={2} className={`${thCls} text-center`} style={{ width: '5%' }}>No.</th>
									<th rowSpan={2} className={`${thCls} text-center`} style={{ width: '15%' }}>Disbursement Month</th>
									<th colSpan={2} className={`${thCls} text-center`}>Total Invoice</th>
									<th colSpan={2} className={`${thCls} text-center`}>Total System</th>
									<th rowSpan={2} className={`${thCls} text-center`} style={{ width: '15%' }}>Confirmed by</th>
									<th rowSpan={2} className={`${thCls} text-center`} style={{ width: '15%' }}>Confirmed date</th>
									{isSimas && (
										<th rowSpan={2} className={`${thCls} text-center`} style={{ width: '10%' }}>Payment Date</th>
									)}
									<th rowSpan={2} className={`${thCls} text-center`} style={{ width: '10%' }}>
										{isRaksa && (
											<button
												onClick={openUpload}
												className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium
												           normal-case tracking-normal transition-colors"
											>
												Upload Invoice
											</button>
										)}
									</th>
								</tr>
								<tr>
									<th className={`${thCls} text-center`}>Contract</th>
									<th className={`${thCls} text-center`}>Amount</th>
									<th className={`${thCls} text-center`}>Contract</th>
									<th className={`${thCls} text-center`}>Amount</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--app-border)]">
								{loading ? (
									<tr>
										<td colSpan={isSimas ? 10 : 9} className="py-10 px-6 text-center text-[var(--app-muted)]">
											<div className="flex justify-center">
												<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
											</div>
										</td>
									</tr>
								) : summaries.length === 0 ? (
									<tr>
										<td colSpan={isSimas ? 10 : 9} className="py-10 px-6 text-center text-[var(--app-muted)]">
											<div className="flex flex-col items-center justify-center">
												<svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
												</svg>
												<p className="text-lg">No invoice records found</p>
											</div>
										</td>
									</tr>
								) : (
									summaries.map((row, index) => (
										<tr
											key={`${row.asof}-${index}`}
											className={`hover:bg-[var(--app-surface)] transition-colors ${index % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
										>
											<td className="py-4 px-4 whitespace-nowrap text-sm font-medium text-[var(--app-text)] text-center">{startIndex + index + 1}</td>
											<td className="py-4 px-4 whitespace-nowrap text-sm text-[var(--app-text)] font-medium text-center">{row.disb_month}</td>
											<td className="py-4 px-4 whitespace-nowrap text-sm text-[var(--app-text)] text-right">{row.tot_kontrak_inv}</td>
											<td className="py-4 px-4 whitespace-nowrap text-sm text-[var(--app-text)] text-right">{Formatter.formatThousands(row.tot_biaya_inv)}</td>
											<td className="py-4 px-4 whitespace-nowrap text-sm text-[var(--app-text)] text-right">{row.tot_kontrak_sys}</td>
											<td className="py-4 px-4 whitespace-nowrap text-sm text-[var(--app-text)] text-right">{Formatter.formatThousands(row.tot_biaya_sys)}</td>
											<td className="py-4 px-4 whitespace-nowrap text-sm text-[var(--app-text)] text-center">{row.confirmby}</td>
											<td className="py-4 px-4 whitespace-nowrap text-sm text-[var(--app-text)] text-center">{row.confirmdate}</td>
											{isSimas && (
												<td className="py-4 px-4 whitespace-nowrap text-sm text-[var(--app-text)] text-center">
													{row.payment_dt ? row.payment_dt : (
														<button
															onClick={() => openPayment(row.batchno ?? '')}
															className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
														>
															Edit
														</button>
													)}
												</td>
											)}
											<td className="py-4 px-4 whitespace-nowrap text-sm text-center">
												<button
													onClick={() => openDetail(row)}
													className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
												>
													Detail
												</button>
											</td>
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
			</div>

			{detailOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
						<div className="flex justify-between items-start p-6 border-b">
							<div className="space-y-3">
								<h2 className="text-xl font-bold text-[var(--app-text)]">{title}</h2>
								<p className="text-sm font-semibold text-[var(--app-text)]">Disbursement Period : {detailMonth}</p>
								<div className="flex items-center gap-2">
									<label htmlFor="filter_by" className="text-sm text-[var(--app-text)]">Filter by :</label>
									<select
										id="filter_by"
										value={filter}
										onChange={e => handleFilterChange(e.target.value)}
										className="px-3 py-1.5 border border-[var(--app-border)] rounded-md text-sm bg-white text-slate-900
										           focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										{filterOptions.map(o => (
											<option key={o.value} value={o.value} style={optionStyle}>{o.label}</option>
										))}
									</select>
								</div>
							</div>
							<button onClick={closeDetail} className="text-[var(--app-muted)] hover:text-[var(--app-text)]">
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						</div>

						{detailError && (
							<div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
								{detailError}
								<button onClick={() => loadDetail(detailAsof, filter)} className="ml-4 text-red-900 underline">Retry</button>
							</div>
						)}

						<div className="overflow-y-auto flex-grow min-h-0">
							<table className="w-full">
								<thead className="bg-[var(--app-surface)] sticky top-0">
									<tr>
										<th className={`${thCls} text-center`} style={{ width: '5%' }}>No.</th>
										<th className={`${thCls} text-left`} style={{ width: '10%' }}>Branch</th>
										<th className={`${thCls} text-left`} style={{ width: '10%' }}>Contract No.</th>
										<th className={`${thCls} text-left`} style={{ width: '15%' }}>Customer Name</th>
										<th className={`${thCls} text-center`} style={{ width: '5%' }}>Disbursement Date</th>
										<th className={`${thCls} text-center`} style={{ width: '5%' }}>Cover Date</th>
										<th className={`${thCls} text-right`} style={{ width: '10%' }}>Net Premi Invoice</th>
										<th className={`${thCls} text-right`} style={{ width: '10%' }}>Net Premi System</th>
										<th className={`${thCls} text-center`} style={{ width: '5%' }}>Invoice</th>
										<th className={`${thCls} text-center`} style={{ width: '5%' }}>System</th>
										<th className={`${thCls} text-left`} style={{ width: '25%' }}>Remark</th>
										<th className={`${thCls} text-center`} style={{ width: '5%' }}>
											<div className="flex flex-col items-center gap-1">
												Check All
												<input
													type="checkbox"
													checked={allChecked}
													disabled={locked || selectable.length === 0}
													onChange={e => toggleAll(e.target.checked)}
													className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
												/>
											</div>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--app-border)]">
									{detailLoading ? (
										<tr>
											<td colSpan={12} className="py-10 px-6 text-center">
												<div className="flex justify-center">
													<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
												</div>
											</td>
										</tr>
									) : details.length === 0 ? (
										<tr>
											<td colSpan={12} className="py-10 px-6 text-center text-[var(--app-muted)]">
												<p className="text-lg">No details found</p>
											</td>
										</tr>
									) : (
										details.map((d, index) => {
											const rejected = isRejected(d);
											return (
												<tr
													key={`${d.lease_no}-${index}`}
													className={`${rejected ? 'bg-red-500 text-white' : 'bg-[var(--app-card)] text-[var(--app-text)]'} hover:opacity-90 transition-opacity`}
												>
													<td className="py-3 px-4 whitespace-nowrap text-sm text-center">{index + 1}</td>
													<td className="py-3 px-4 whitespace-nowrap text-sm">{d.branch}</td>
													<td className="py-3 px-4 whitespace-nowrap text-sm">{d.lease_no}</td>
													<td className="py-3 px-4 whitespace-nowrap text-sm">{d.lessee_nm}</td>
													<td className="py-3 px-4 whitespace-nowrap text-sm text-center">{d.execution}</td>
													<td className="py-3 px-4 whitespace-nowrap text-sm text-center">{d.batchdt}</td>
													<td className="py-3 px-4 whitespace-nowrap text-sm text-right">{Formatter.formatThousands(d.totalnett)}</td>
													<td className="py-3 px-4 whitespace-nowrap text-sm text-right">{Formatter.formatThousands(d.gross)}</td>
													<td className="py-3 px-4 whitespace-nowrap text-sm text-center">{d.invoice}</td>
													<td className="py-3 px-4 whitespace-nowrap text-sm text-center">{d.system}</td>
													<td className="py-3 px-4 text-sm">
														{/* backend joins reasons with <br>; render as lines, never as raw HTML */}
														{d.remark.split('<br>').filter(Boolean).map((line, i) => <div key={i}>{line}</div>)}
													</td>
													<td className="py-3 px-4 text-center">
														{!rejected && (
															<input
																type="checkbox"
																checked={checked.has(d.lease_no)}
																disabled={locked}
																onChange={() => toggleLease(d.lease_no)}
																className="w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
															/>
														)}
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>

						<div className="p-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
							<div className="text-sm text-[var(--app-text)] space-y-0.5">
								<p>Confirmed by : <span className="font-semibold">{confirmBy}</span></p>
								<p>Confirmed date : <span className="font-semibold">{confirmDate}</span></p>
							</div>
							<div className="flex gap-3 justify-end">
								<button
									onClick={handleConfirm}
									disabled={locked || confirming || detailLoading}
									className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed
									           text-white px-4 py-2 rounded-md font-medium transition-colors"
								>
									{confirming ? 'Confirming…' : 'Confirm by CA'}
								</button>
								<button
									onClick={closeDetail}
									className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
								>
									Close
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{isSimas && payOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
						<div className="flex justify-between items-center p-6 border-b">
							<h2 className="text-xl font-bold text-[var(--app-text)]">Payment Date</h2>
							<button onClick={() => !paying && setPayOpen(false)} className="text-[var(--app-muted)] hover:text-[var(--app-text)]">
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						</div>
						<div className="p-6 space-y-4">
							<AsOfDatePicker
								label="Payment Date"
								value={payDate}
								onChange={(d) => { if (d) setPayDate(d); }}
								required
							/>
							{payError && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{payError}</div>
							)}
						</div>
						<div className="p-4 border-t flex justify-end gap-3">
							<button
								onClick={() => setPayOpen(false)}
								disabled={paying}
								className="px-4 py-2 border border-[var(--app-border)] rounded-md text-sm text-[var(--app-text)]
								           hover:bg-[var(--app-surface)] transition-colors"
							>
								Close
							</button>
							<button
								onClick={handlePayment}
								disabled={paying}
								className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
								           text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
							>
								{paying ? 'Submitting…' : 'Submit'}
							</button>
						</div>
					</div>
				</div>
			)}

			{isRaksa && uploadOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
						<div className="flex justify-between items-center p-6 border-b">
							<h2 className="text-xl font-bold text-[var(--app-text)]">Upload Invoice RAKSA</h2>
							<button onClick={() => !uploading && setUploadOpen(false)} className="text-[var(--app-muted)] hover:text-[var(--app-text)]">
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						</div>

						<div className="p-6 space-y-5">
							<div className="grid grid-cols-[7rem_1fr] items-center gap-3">
								<label className="text-sm text-[var(--app-text)]">As Of<span className="text-red-600"> *</span></label>
								<div className="flex gap-2">
									<select
										value={upMonth}
										onChange={e => setUpMonth(e.target.value)}
										className="px-3 py-2 border border-[var(--app-border)] rounded-md text-sm bg-white text-slate-900
										           focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="" style={optionStyle}>Month…</option>
										{MONTHS.map((m, i) => <option key={m} value={i} style={optionStyle}>{m}</option>)}
									</select>
									<input
										type="text"
										inputMode="numeric"
										maxLength={4}
										value={upYear}
										onChange={e => setUpYear(e.target.value.replace(/\D/g, ''))}
										className="w-24 px-3 py-2 border border-[var(--app-border)] rounded-md text-sm
										           focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>

								<label className="text-sm text-[var(--app-text)]">Select File</label>
								<div className="flex items-center gap-3 min-w-0">
									<label className="shrink-0 cursor-pointer bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors">
										Select Excel File
										<input type="file" accept=".xls,.xlsx" onChange={handleFileChange} className="hidden" />
									</label>
									<span className="text-sm italic text-[var(--app-muted)] truncate" title={upFile?.name}>
										{upFile ? upFile.name : 'No file selected'}
									</span>
									{upFile && (
										<button
											type="button"
											onClick={() => setUpFile(null)}
											className="shrink-0 text-sm text-[var(--app-muted)] hover:text-[var(--app-text)] underline"
										>
											Clear
										</button>
									)}
								</div>
							</div>

							{upError && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{upError}</div>
							)}
						</div>

						<div className="p-4 border-t flex justify-end gap-3">
							<button
								onClick={() => setUploadOpen(false)}
								disabled={uploading}
								className="px-4 py-2 border border-[var(--app-border)] rounded-md text-sm text-[var(--app-text)]
								           hover:bg-[var(--app-surface)] transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleUpload}
								disabled={uploading || !upFile}
								className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
								           text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
							>
								{uploading ? 'Uploading…' : 'Upload File'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default InvoiceInsurancePage;
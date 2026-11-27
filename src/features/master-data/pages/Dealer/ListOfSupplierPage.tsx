import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';
import { filenameFromDisposition } from '@/shared/utils/helpers';
import { alertFillField, showAlert } from '@/helpers/AlertDialog';
import PrintPreview, { PRINT_TD, PRINT_TH } from '@/helpers/PrintPreview';

interface Branch {
	branchCd: string;
	cityName: string;
	branchName: string;
}

interface DealerRecord {
	no: number;
	name: string;
	nickname: string;
	address: string;
	city: string;
	phone: string;
	contact: string;
	position: string;
	accNo: string;
	bank: string;
	bankBranch: string;
}

const COLUMNS: { label: string; key: keyof DealerRecord; width: string }[] = [
	{ label: 'No.', key: 'no', width: '3%' },
	{ label: 'Name', key: 'name', width: '9%' },
	{ label: 'Nickname', key: 'nickname', width: '8%' },
	{ label: 'Address', key: 'address', width: '19%' },
	{ label: 'City', key: 'city', width: '8%' },
	{ label: 'Phone', key: 'phone', width: '9%' },
	{ label: 'Contact', key: 'contact', width: '10%' },
	{ label: 'Position', key: 'position', width: '6%' },
	{ label: 'Acc No.', key: 'accNo', width: '7%' },
	{ label: 'Bank', key: 'bank', width: '10%' },
	{ label: 'Bank Branch', key: 'bankBranch', width: '11%' },
];

interface PrintReport {
	rows: DealerRecord[];
	printBy: string;
	printDate: string;
	branchName: string;
}

function DealerPrintPreview({ report, onClose }: { report: PrintReport; onClose: () => void }) {
	return (
		<PrintPreview label={`List of Dealer — ${report.branchName}`} onClose={onClose}>
			<div style={{ textAlign: 'center', fontSize: 16, letterSpacing: '0.2em', fontWeight: 'bold' }}>
				List of Dealer
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
							<tr key={`${r.no}-${idx}`}>
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

const Spinner: React.FC = () => (
	<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
	</svg>
);

const ListOfSupplierPage: React.FC = () => {
	const [branches, setBranches] = useState<Branch[]>([]);
	const [selectedBranch, setSelectedBranch] = useState<string>('');
	const [records, setRecords] = useState<DealerRecord[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [hasSearched, setHasSearched] = useState(false);
	const [printing, setPrinting] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [printReport, setPrintReport] = useState<PrintReport | null>(null);
	const limit = DEFAULT_PAGE_LIMIT;

	useEffect(() => {
		const fetchBranches = async () => {
			try {
				const response = await api.get('/MasterData/branches');
				setBranches(response.data);
			} catch (err) {
				console.error('Failed to load branches:', err);
				setError('Failed to load branch list');
			}
		};
		fetchBranches();
	}, []);

	const sortedBranches = useMemo(
		() => [...branches].sort((a, b) => a.branchCd.localeCompare(b.branchCd)),
		[branches]
	);

	const fetchDealerRecords = useCallback(async (branchOverride?: string, pageOverride?: number) => {
		const branchToUse = branchOverride ?? selectedBranch;
		const pageToUse = pageOverride ?? page;

		if (!branchToUse) {
			setRecords([]);
			setTotal(0);
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const response = await api.get('/MasterData/dealer-list', {
				params: { branch_cd: branchToUse, page: pageToUse, limit },
			});
			setRecords(response.data.data || []);
			setTotal(response.data.total || 0);
		} catch (err) {
			console.error('Failed to load dealer records:', err);
			setError('Failed to load dealer records. Please try again.');
			setRecords([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	}, [selectedBranch, page, limit]);

	useEffect(() => {
		if (!hasSearched) return;
		fetchDealerRecords();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page]);

	const handlePreview = () => {
		if (!selectedBranch.trim()) {
			alertFillField();
			return;
		}
		setHasSearched(true);
		if (page === 1) {
			fetchDealerRecords(selectedBranch, 1);
		} else {
			setPage(1);
		}
	};

	const handleClearBranch = () => {
		setSelectedBranch('');
		setRecords([]);
		setTotal(0);
		setPage(1);
		setHasSearched(false);
		setError(null);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') handlePreview();
	};

	const handlePrint = async () => {
		if (!selectedBranch.trim()) {
			alertFillField();
			return;
		}

		setPrinting(true);
		try {
			const { data } = await api.get('/MasterData/dealer-list/print', {
				params: { branch_cd: selectedBranch },
			});
			setPrintReport({
				rows: data.data || [],
				printBy: data.print_by || '',
				printDate: data.print_date || '',
				branchName: branches.find((b) => b.branchCd === selectedBranch)?.branchName || selectedBranch,
			});
		} catch (err) {
			console.error('Failed to load print data:', err);
			showAlert('Failed to load print data. Please try again.', { variant: 'error' });
		} finally {
			setPrinting(false);
		}
	};

	const closePrint = useCallback(() => setPrintReport(null), []);

	const handleExportExcel = async () => {
		if (!selectedBranch.trim()) {
			alertFillField();
			return;
		}
		setExporting(true);
		try {
			const res = await api.get('/MasterData/dealer-list/excel', {
				params: { branch_cd: selectedBranch },
				responseType: 'blob',
			});
			const blob = new Blob([res.data], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filenameFromDisposition(res.headers['content-disposition'], 'ListofDealer.xlsx');
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Failed to export dealer list:', err);
			showAlert('Failed to export. Please try again.', { variant: 'error' });
		} finally {
			setExporting(false);
		}
	};

	const totalPages = Math.ceil(total / limit);

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6 mb-6">
					<div className="mb-6 flex items-center justify-between">
						<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">List of Dealer</h1>
						{hasSearched && total > 0 && (
							<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
								Total: {total}
							</span>
						)}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-end">
						<div>
							<label htmlFor="branch_cd" className="block text-sm font-medium text-[var(--app-text)] mb-1">
								Branch
							</label>
							<div className="relative">
								<select
									id="branch_cd"
									value={selectedBranch}
									onChange={(e) => setSelectedBranch(e.target.value)}
									onKeyDown={handleKeyPress}
									className="w-full pl-4 pr-14 py-3 bg-white text-slate-900 border border-[var(--app-border)] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									<option value="" className="bg-white text-slate-900">Select</option>
									{sortedBranches.map((branch) => (
										<option key={branch.branchCd} value={branch.branchCd} className="bg-white text-slate-900">
											{branch.branchName}
										</option>
									))}
								</select>
								{selectedBranch && (
									<button
										type="button"
										onClick={handleClearBranch}
										aria-label="Clear branch"
										className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
									>
										<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
										</svg>
									</button>
								)}
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium mb-1 invisible" aria-hidden="true">
								Actions
							</label>
							<div className="flex flex-wrap gap-3">
								<button
									onClick={handlePreview}
									disabled={loading}
									className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
								>
									{loading && <Spinner />}
									{loading ? 'Loading…' : 'Preview'}
								</button>
								<button
									onClick={handlePrint}
									disabled={printing}
									className="inline-flex items-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
								>
									{printing && <Spinner />}
									{printing ? 'Preparing…' : 'Print'}
								</button>
								<button
									onClick={handleExportExcel}
									disabled={exporting}
									className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
								>
									{exporting && <Spinner />}
									{exporting ? 'Exporting…' : 'Export to Excel'}
								</button>
							</div>
						</div>
					</div>

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
							{error}
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
										<th key={c.key} className="py-3 px-3 text-left text-xs font-medium text-[var(--app-text)] uppercase tracking-wider">
											{c.label}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--app-border)]">
								{loading ? (
									<tr>
										<td colSpan={COLUMNS.length} className="py-4 px-4 text-center">
											<div className="flex justify-center">
												<svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
													<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
													<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
												</svg>
											</div>
										</td>
									</tr>
								) : records.length === 0 ? (
									<tr>
										<td colSpan={COLUMNS.length} className="py-10 px-4 text-center text-lg font-medium text-red-600">
											{hasSearched ? 'Data Not Found..' : ''}
										</td>
									</tr>
								) : (
									records.map((record, idx) => (
										<tr
											key={`${record.no}-${idx}`}
											className={`align-top hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
										>
											{COLUMNS.map((c) => (
												<td
													key={c.key}
													className={`py-3 px-3 text-sm text-[var(--app-text)] break-words ${c.key === 'no' ? 'text-center' : ''} ${c.key === 'accNo' ? 'font-mono' : ''}`}
												>
													{record[c.key]}
												</td>
											))}
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

			{printReport && <DealerPrintPreview report={printReport} onClose={closePrint} />}
		</div>
	);
};

export default ListOfSupplierPage;
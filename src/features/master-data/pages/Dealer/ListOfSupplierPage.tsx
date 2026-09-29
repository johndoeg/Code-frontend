import React, { useState, useEffect, useCallback } from 'react';
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface Branch {
	branchCd: string;
	cityName: string;
	branchName: string;
}

interface DealerRecord {
	no: number;
	dealerNo: string;
	name: string;
	address: string;
	accNo: string;
	bankName: string;
	bankBranch: string;
	npwpNo: string;
	status: string;
}

const Spinner: React.FC = () => (
	<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
	</svg>
);

const filenameFromDisposition = (header: string | undefined, fallback: string) => {
	if (!header) return fallback;
	const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
	if (utf8) return decodeURIComponent(utf8[1]);
	const plain = /filename="?([^";]+)"?/i.exec(header);
	return plain ? plain[1] : fallback;
};

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
			alert('Please select a branch');
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
			alert('Please select a branch');
			return;
		}

		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			alert('Popup blocked. Please allow popups for this site.');
			return;
		}
		printWindow.document.write('<p style="font-family:Arial;padding:20px">Preparing report…</p>');

		setPrinting(true);
		try {
			const res = await api.get<string>('/MasterData/dealer-list/print', {
				params: { branch_cd: selectedBranch },
				responseType: 'text',
				transformResponse: [(data) => data],
			});
			printWindow.document.open();
			printWindow.document.write(res.data);
			printWindow.document.close();
		} catch (err) {
			console.error('Failed to load print data:', err);
			printWindow.close();
			alert('Failed to load print data. Please try again.');
		} finally {
			setPrinting(false);
		}
	};

	const handleExportExcel = async () => {
		if (!selectedBranch.trim()) {
			alert('Please select a branch');
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
			link.download = filenameFromDisposition(res.headers['content-disposition'], 'List_of_Dealer.xlsx');
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Failed to export dealer list:', err);
			alert('Failed to export. Please try again.');
		} finally {
			setExporting(false);
		}
	};

	const totalPages = Math.ceil(total / limit);

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">
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
									className="w-full pl-4 pr-14 py-3 bg-white text-[var(--app-text)] border border-[var(--app-border)] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									<option value="" className="bg-white text-[var(--app-text)]">Select</option>
									{branches.map((branch) => (
										<option key={branch.branchCd} value={branch.branchCd} className="bg-white text-[var(--app-text)]">
											{branch.branchName}
										</option>
									))}
								</select>
								{selectedBranch && (
									<button
										type="button"
										onClick={handleClearBranch}
										aria-label="Clear branch"
										className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--app-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
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
							<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
								<tr>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider w-12">No.</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Dealer No.</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Name</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Address</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Acc No.</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Bank</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Bank Branch</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">NPWP</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--app-border)]">
								{records.length === 0 && !loading ? (
									<tr>
										<td colSpan={9} className="py-10 px-4 text-center text-[var(--app-muted)]">
											<div className="flex flex-col items-center justify-center">
												<svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
												</svg>
												<p className="text-lg">No Dealer records found</p>
												<p className="text-sm mt-1">Select a branch and click Preview</p>
											</div>
										</td>
									</tr>
								) : (
									<>
										{records.map((record, idx) => (
											<tr
												key={`${record.no}-${record.dealerNo}`}
												className={`hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
											>
												<td className="py-3 px-4 whitespace-nowrap text-sm text-center text-[var(--app-text)]">{record.no}</td>
												<td className="py-3 px-4 whitespace-nowrap text-sm font-medium text-[var(--app-text)]">{record.dealerNo}</td>
												<td className="py-3 px-4 whitespace-nowrap text-sm text-[var(--app-text)]">{record.name}</td>
												<td className="py-3 px-4 text-sm text-[var(--app-text)] max-w-xs break-words">{record.address || '-'}</td>
												<td className="py-3 px-4 whitespace-nowrap text-sm text-[var(--app-text)] font-mono">{record.accNo || '-'}</td>
												<td className="py-3 px-4 whitespace-nowrap text-sm text-[var(--app-text)]">{record.bankName || '-'}</td>
												<td className="py-3 px-4 whitespace-nowrap text-sm text-[var(--app-text)]">{record.bankBranch || '-'}</td>
												<td className="py-3 px-4 whitespace-nowrap text-sm text-[var(--app-text)] font-mono">{record.npwpNo || '-'}</td>
												<td className="py-3 px-4 whitespace-nowrap text-sm">
													<span className={`px-2 py-1 rounded-full text-xs font-medium ${record.status === 'Active'
														? 'bg-green-100 text-green-800'
														: 'bg-red-100 text-red-800'}`}>
														{record.status}
													</span>
												</td>
											</tr>
										))}
										{loading && (
											<tr>
												<td colSpan={9} className="py-4 px-4 text-center">
													<div className="flex justify-center">
														<svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
															<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
															<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
														</svg>
													</div>
												</td>
											</tr>
										)}
									</>
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
		</div>
	);
};

export default ListOfSupplierPage;
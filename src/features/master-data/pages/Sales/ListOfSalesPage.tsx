import React, { useState, useEffect, useCallback } from 'react';
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface Branch {
	branchCd: string;
	cityName: string;
	branchName: string;
}

interface SalesRecord {
	no: number;
	salesNo: string;
	name: string;
	address: string;
	accNo: string;
	bankName: string;
	bankBranch: string;
	npwpNo: string;
	status: string;
}

const todayShort = () =>
	new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });

const esc = (v: unknown) =>
	String(v ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

const buildPrintHtml = (records: SalesRecord[], printBy: string, branchName: string) => {
	const rows = records.length
		? records.map(r => `
			<tr>
				<td class="c">${r.no}</td>
				<td>${esc(r.salesNo)}</td>
				<td>${esc(r.name)}</td>
				<td>${esc(r.address || "-")}</td>
				<td>${esc(r.accNo || "-")}</td>
				<td>${esc(r.bankName || "-")}</td>
				<td>${esc(r.bankBranch || "-")}</td>
				<td>${esc(r.npwpNo || "-")}</td>
				<td>${esc(r.status)}</td>
			</tr>`).join("")
		: `<tr><td colspan="9" class="c">No sales records found</td></tr>`;

	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>List of Sales - ${esc(branchName)}</title>
	<style>
		body { font-family: Tahoma, sans-serif; font-size: 12px; margin: 16px; }
		.title { text-align: center; font-size: 16px; font-weight: bold; letter-spacing: 0.2em; margin-bottom: 6px; }
		.meta { text-align: center; margin-bottom: 12px; }
		table { border-collapse: collapse; width: 100%; }
		th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; text-align: left; }
		th { background: #f0f0f0; text-align: center; }
		thead { display: table-header-group; }
		tr { page-break-inside: avoid; }
		.c { text-align: center; }
		@page { size: landscape; margin: 10mm; }
	</style>
</head>
<body onload="window.print()" onafterprint="window.close()">
	<div class="title">List of Sales</div>
	<div class="meta">Branch : ${esc(branchName)}<br>Print By - Date : ${esc(printBy)} - ${todayShort()}</div>
	<table>
		<thead>
			<tr>
				<th style="width:5%">No.</th>
				<th style="width:10%">Sales No.</th>
				<th style="width:15%">Name</th>
				<th style="width:25%">Address</th>
				<th style="width:10%">Acc No.</th>
				<th style="width:10%">Bank</th>
				<th style="width:10%">Bank Branch</th>
				<th style="width:10%">NPWP</th>
				<th style="width:5%">Status</th>
			</tr>
		</thead>
		<tbody>${rows}</tbody>
	</table>
</body>
</html>`;
};

const filenameFromDisposition = (header: string | undefined, fallback: string) => {
	if (!header) return fallback;
	const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
	if (utf8) return decodeURIComponent(utf8[1]);
	const plain = /filename="?([^";]+)"?/i.exec(header);
	return plain ? plain[1] : fallback;
};

const Spinner: React.FC = () => (
	<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
	</svg>
);

const ListOfSalesPage: React.FC = () => {
	const [branches, setBranches] = useState<Branch[]>([]);
	const [selectedBranch, setSelectedBranch] = useState<string>('');
	const [activeBranch, setActiveBranch] = useState<string>('');
	const [records, setRecords] = useState<SalesRecord[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [printing, setPrinting] = useState(false);
	const [exporting, setExporting] = useState(false);
	const limit = DEFAULT_PAGE_LIMIT;

	useEffect(() => {
		const fetchBranches = async () => {
			try {
				const response = await api.get(`/MasterData/branches`);
				setBranches(response.data);
			} catch (err) {
				console.error('Failed to load branches:', err);
				setError('Failed to load branch list');
			}
		};
		fetchBranches();
	}, []);

	const fetchSalesRecords = useCallback(async () => {
		if (!activeBranch) {
			setRecords([]);
			setTotal(0);
			return;
		}

		setLoading(true);
		setError(null);
		try {
			const response = await api.get(`/MasterData/sales-list`, {
				params: { branch_cd: activeBranch, page, limit },
			});
			setRecords(response.data.data || []);
			setTotal(response.data.total || 0);
		} catch (err) {
			console.error('Failed to load sales records:', err);
			setError('Failed to load sales records. Please try again.');
			setRecords([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	}, [activeBranch, page, limit]);

	useEffect(() => {
		fetchSalesRecords();
	}, [fetchSalesRecords]);

	const handlePreview = () => {
		if (!selectedBranch.trim()) {
			alert('Please select a branch');
			return;
		}
		setPage(1);
		setActiveBranch(selectedBranch);
	};

	const handleClearBranch = () => {
		setSelectedBranch('');
		setActiveBranch('');
		setRecords([]);
		setTotal(0);
		setPage(1);
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
		printWindow.document.write('<p style="font-family:Tahoma;padding:20px">Preparing report…</p>');

		setPrinting(true);
		try {
			const { data } = await api.get('/MasterData/sales-list/print', {
				params: { branch_cd: selectedBranch },
			});
			if (!data.success) {
				printWindow.close();
				alert(data.message || 'Failed to load print data');
				return;
			}

			const branchName = selectedBranch === '000'
				? 'All Branches'
				: branches.find(b => b.branchCd === selectedBranch)?.branchName ?? selectedBranch;

			printWindow.document.open();
			printWindow.document.write(buildPrintHtml(data.records || [], data.printBy || '', branchName));
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
			const res = await api.get('/MasterData/sales-list/excel', {
				params: { branch_cd: selectedBranch },
				responseType: 'blob',
			});
			const blob = new Blob([res.data], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filenameFromDisposition(res.headers['content-disposition'], 'List_of_Sales.xlsx');
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Failed to export sales list:', err);
			alert('Failed to export. Please try again.');
		} finally {
			setExporting(false);
		}
	};

	const totalPages = Math.ceil(total / limit);
	const noBranchSelected = !selectedBranch.trim();

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">
					<div className="mb-6 flex items-center justify-between">
						<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">List of Sales</h1>
						{activeBranch && total > 0 && (
							<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
								Total: {total}
							</span>
						)}
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 md:items-end">
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
									className="w-full h-11 pl-4 pr-14 bg-white text-[var(--app-text)] border border-[var(--app-border)] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

						<div className="flex flex-wrap items-center gap-2.5">
							<button
								onClick={handlePreview}
								disabled={noBranchSelected || loading}
								title={noBranchSelected ? "Select a branch first" : undefined}
								className="inline-flex items-center gap-2 h-11 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 px-5 text-sm font-medium text-white shadow-md transition-all hover:from-blue-700 hover:to-indigo-800 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:from-blue-600 disabled:hover:to-indigo-700"
							>
								{loading ? <Spinner /> : (
									<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								)}
								{loading ? "Loading…" : "Preview"}
							</button>

							<button
								onClick={handlePrint}
								disabled={noBranchSelected || printing}
								title={noBranchSelected ? "Select a branch first" : undefined}
								className="inline-flex items-center gap-2 h-11 rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-4 text-sm font-medium text-[var(--app-text)] shadow-sm transition-colors hover:bg-[var(--app-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--app-card)]"
							>
								{printing ? <Spinner /> : (
									<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
									</svg>
								)}
								{printing ? "Preparing…" : "Print"}
							</button>

							<button
								onClick={handleExportExcel}
								disabled={noBranchSelected || exporting}
								title={noBranchSelected ? "Select a branch first" : undefined}
								className="inline-flex items-center gap-2 h-11 rounded-lg border border-emerald-300 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-emerald-50"
							>
								{exporting ? <Spinner /> : (
									<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
									</svg>
								)}
								{exporting ? "Exporting…" : "Export to Excel"}
							</button>
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
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Sales No.</th>
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
												<p className="text-lg">No sales records found</p>
												<p className="text-sm mt-1">Select a branch and click Preview</p>
											</div>
										</td>
									</tr>
								) : (
									<>
										{records.map((record) => (
											<tr
												key={`${record.salesNo}-${record.no}`}
												className={`hover:bg-[var(--app-surface)] transition-colors ${record.no % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
											>
												<td className="py-3 px-4 whitespace-nowrap text-sm text-center text-[var(--app-text)]">{record.no}</td>
												<td className="py-3 px-4 whitespace-nowrap text-sm font-medium text-[var(--app-text)]">{record.salesNo}</td>
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
													<div className="flex justify-center text-blue-600">
														<Spinner />
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

export default ListOfSalesPage;
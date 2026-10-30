import { useState, useEffect, useMemo } from 'react';
import api from '@/shared/api/axiosInstance';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface Branch {
	branch_cd: string;
	branch_name: string;
}

interface BranchInfo {
	is_admin: boolean;
	branches: Branch[];
	user_branch_cd: string;
	user_branch_name: string;
}

interface PendingRow {
	appl_no: string;
	lease_no: string;
	lessee_nm: string;
	appr_date: string | null;
	del_date: string | null;
	cmo: string;
}

interface DataResponse {
	rows: PendingRow[];
	total: number;
	page: number;
	limit: number;
}

const ROWS_PER_PAGE = DEFAULT_PAGE_LIMIT;
const DATA_URL = "/CAM/Others/PendingContractDelete/data";

const TABLE_HEADERS = [
	"No.",
	"CAM No.",
	"Contract No.",
	"Customer Name",
	"Last Approved Date",
	"Deleted Date By System",
	"CMO",
];

function fmtDate(dateStr: string | null): string {
	if (!dateStr) return "";
	const [y, m, d] = dateStr.split("-");
	return `${d}-${m}-${y}`;
}

function todayLong(): string {
	return new Date().toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	if (current <= 4) return [1, 2, 3, 4, 5, "…", total];
	if (current >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
	return [1, "…", current - 1, current, current + 1, "…", total];
}

const PendingContractWillBeDeletedBySystemPage: React.FC = () => {
	const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
	const [selectedBranch, setSelectedBranch] = useState<string>("");
	const [rows, setRows] = useState<PendingRow[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [branchLoading, setBranchLoading] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(false);
	const [exporting, setExporting] = useState<boolean>(false);
	const [printing, setPrinting] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [hasSearched, setHasSearched] = useState<boolean>(false);
	const [currentPage, setCurrentPage] = useState<number>(1);

	const [printRows, setPrintRows] = useState<PendingRow[] | null>(null);

	const asOf = todayLong();

	useEffect(() => {
		api.get<BranchInfo>("/CAM/Others/PendingContractDelete/branches")
			.then((res) => {
				setBranchInfo(res.data);
				if (!res.data.is_admin) {
					setSelectedBranch(res.data.user_branch_cd);
				}
			})
			.catch(() => setError("Gagal memuat daftar cabang."))
			.finally(() => setBranchLoading(false));
	}, []);

	useEffect(() => {
		if (!printRows) return;
		const t = window.setTimeout(() => window.print(), 0);
		return () => window.clearTimeout(t);
	}, [printRows]);

	const resetResults = () => {
		setRows([]);
		setTotal(0);
		setPrintRows(null);
		setCurrentPage(1);
		setHasSearched(false);
	};

	const fetchPage = async (page: number) => {
		if (!selectedBranch) return;
		setLoading(true);
		setError(null);
		try {
			const res = await api.get<DataResponse>(DATA_URL, {
				params: { branch_cd: selectedBranch, page, limit: ROWS_PER_PAGE },
			});
			setRows(res.data.rows);
			setTotal(res.data.total);
			setCurrentPage(res.data.page);
			setHasSearched(true);
		} catch {
			setError("Gagal memuat data. Silakan coba lagi.");
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = () => {
		if (!selectedBranch) return;
		setPrintRows(null);
		void fetchPage(1);
	};

	const handlePrint = async () => {
		if (!selectedBranch || !total) return;
		setPrinting(true);
		setError(null);
		try {
			const res = await api.get<DataResponse>(DATA_URL, {
				params: { branch_cd: selectedBranch, all: 1 },
			});
			setPrintRows(res.data.rows);
		} catch {
			setError("Gagal menyiapkan data cetak. Silakan coba lagi.");
		} finally {
			setPrinting(false);
		}
	};

	const handleExport = async () => {
		if (!selectedBranch || !total) return;
		setExporting(true);
		setError(null);
		try {
			const res = await api.get("/CAM/Others/PendingContractDelete/excel", {
				params: { branch_cd: selectedBranch },
				responseType: "blob",
			});
			const url = URL.createObjectURL(res.data as Blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = "ListPendingContractDeletedBySystem.xlsx";
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			window.setTimeout(() => URL.revokeObjectURL(url), 10000);
		} catch {
			setError("Gagal mengekspor data. Silakan coba lagi.");
		} finally {
			setExporting(false);
		}
	};

	const totalPages = Math.ceil(total / ROWS_PER_PAGE);
	const pageNumbers = useMemo(
		() => getPageNumbers(currentPage, totalPages),
		[currentPage, totalPages],
	);

	const branchName =
		branchInfo?.branches.find((b) => b.branch_cd === selectedBranch)?.branch_name ??
		branchInfo?.user_branch_name ??
		"";

	const busy = loading || printing || exporting;

	return (
		<>
			<style>{`
				@media print {
					.screen-only { display: none !important; }
					.print-only  { display: block !important; }
					body         { font-family: Tahoma, Arial, sans-serif; font-size: 12px; }
				}
				@media screen {
					.print-only { display: none; }
				}
			`}</style>

			<div className="screen-only min-h-screen bg-[var(--app-surface)] p-4 md:p-6">
				<div className="max-w-full mx-auto">

					<div className="mb-6">
						<h1 className="text-2xl font-semibold text-[var(--app-text)]">
							Pending Contract Will Be Deleted By System
						</h1>
						<p className="text-sm text-[var(--app-text)] mt-1">As of {asOf}</p>
					</div>

					<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-xl border border-[var(--app-border)] p-4 mb-6 flex flex-wrap gap-3 items-end">
						<div className="flex-1 min-w-[220px] max-w-sm">
							<label className="block text-xs font-medium text-[var(--app-text)] mb-1">
								Branch <span className="text-red-500 ml-1">*</span>
							</label>

							{branchInfo?.is_admin ? (
								<select
									value={selectedBranch}
									onChange={(e) => { setSelectedBranch(e.target.value); resetResults(); }}
									disabled={branchLoading}
									className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg text-sm bg-white text-slate-900
										focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
										disabled:opacity-60 disabled:cursor-not-allowed"
								>
									<option value="" className="bg-white text-slate-900">Select</option>
									{(branchInfo?.branches ?? []).map((b) => (
										<option key={b.branch_cd} value={b.branch_cd} className="bg-white text-slate-900">
											{b.branch_name}
										</option>
									))}
								</select>
							) : (
								<input
									type="text"
									readOnly
									value={branchInfo?.user_branch_name ?? ""}
									className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg text-sm bg-slate-100 text-slate-600 cursor-not-allowed"
								/>
							)}
						</div>

						<button
							onClick={handleSearch}
							disabled={!selectedBranch || busy || branchLoading}
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
								bg-blue-600 text-white border border-blue-700
								hover:bg-blue-700 disabled:bg-gray-500 disabled:border-gray-500 disabled:cursor-not-allowed"
						>
							{loading ? "Mencari…" : "Search"}
						</button>

						<button
							onClick={handlePrint}
							disabled={!total || busy}
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
								bg-[var(--app-surface-alt)] text-[var(--app-text)] border border-[var(--app-border)]
								hover:bg-[var(--app-surface)] disabled:opacity-60 disabled:cursor-not-allowed"
						>
							{printing ? "Menyiapkan…" : "Print"}
						</button>

						<button
							onClick={handleExport}
							disabled={!total || busy}
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
								bg-green-600 text-white border border-green-700
								hover:bg-green-700 disabled:bg-gray-500 disabled:border-gray-500 disabled:cursor-not-allowed"
						>
							{exporting ? "Mengekspor…" : "Export to Excel"}
						</button>
					</div>

					{error && (
						<div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
							{error}
						</div>
					)}

					{loading && (
						<div className="py-16 text-center text-sm text-[var(--app-text)]">Memuat data…</div>
					)}

					{!loading && hasSearched && total === 0 && (
						<div className="py-16 text-center text-sm text-[var(--app-text)] border border-dashed border-[var(--app-border)] rounded-xl">
							Tidak ada data untuk cabang yang dipilih
						</div>
					)}

					{!loading && total > 0 && (
						<>
							<div className="grid grid-cols-2 gap-3 mb-4 max-w-sm">
								<div className="bg-[var(--app-surface)] rounded-lg p-3">
									<div className="text-xs text-[var(--app-text)] mb-1">Total Unit</div>
									<div className="text-lg font-semibold tabular-nums text-[var(--app-text)]">
										{total}
									</div>
								</div>
							</div>

							<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-xl border border-[var(--app-border)] overflow-hidden">
								<div className="overflow-x-auto">
									<table className="w-full border-collapse text-sm">
										<thead>
											<tr className="bg-[var(--app-surface)]">
												{TABLE_HEADERS.map((h) => (
													<th
														key={h}
														className="px-3 py-2 text-xs font-medium text-[var(--app-text)] border-b border-[var(--app-border)] text-center whitespace-nowrap"
													>
														{h}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{rows.map((row, idx) => {
												const globalIdx = (currentPage - 1) * ROWS_PER_PAGE + idx;
												return (
													<tr
														key={`${row.appl_no}-${globalIdx}`}
														className={globalIdx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}
													>
														<td className="px-3 py-2 text-center border-b border-[var(--app-border)] text-[var(--app-text)] tabular-nums">
															{globalIdx + 1}
														</td>
														<td className="px-3 py-2 text-center border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
															{row.appl_no}
														</td>
														<td className="px-3 py-2 text-center border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
															{row.lease_no}
														</td>
														<td className="px-3 py-2 text-center border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
															{row.lessee_nm}
														</td>
														<td className="px-3 py-2 text-center border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
															{fmtDate(row.appr_date)}
														</td>
														<td className="px-3 py-2 text-center border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
															{fmtDate(row.del_date)}
														</td>
														<td className="px-3 py-2 text-center border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
															{row.cmo}
														</td>
													</tr>
												);
											})}
										</tbody>
										<tfoot>
											<tr className="bg-[var(--app-surface)] font-semibold">
												<td colSpan={7} className="px-3 py-2 border-t border-[var(--app-border)] text-[var(--app-text)]">
													Total Unit : {total}
												</td>
											</tr>
										</tfoot>
									</table>
								</div>

								{totalPages > 1 && (
									<div className="flex items-center justify-center gap-1.5 py-3 border-t border-[var(--app-border)] flex-wrap">
										<button
											onClick={() => void fetchPage(Math.max(1, currentPage - 1))}
											disabled={currentPage === 1 || busy}
											className="px-3 py-1 text-sm rounded border border-[var(--app-border)]
												disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[var(--app-surface)] transition-colors"
										>
											Previous
										</button>
										{pageNumbers.map((p, i) =>
											p === "…" ? (
												<span key={`el-${i}`} className="px-2 py-1 text-sm text-[var(--app-text)]">…</span>
											) : (
												<button
													key={p}
													onClick={() => void fetchPage(p as number)}
													disabled={busy}
													className={`px-3 py-1 text-sm rounded border transition-colors ${currentPage === p
														? "bg-blue-600 text-white border-blue-600"
														: "border-[var(--app-border)] hover:bg-[var(--app-surface)]"
														}`}
												>
													{p}
												</button>
											),
										)}
										<button
											onClick={() => void fetchPage(Math.min(totalPages, currentPage + 1))}
											disabled={currentPage === totalPages || busy}
											className="px-3 py-1 text-sm rounded border border-[var(--app-border)]
												disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[var(--app-surface)] transition-colors"
										>
											Next
										</button>
									</div>
								)}
							</div>
						</>
					)}
				</div>
			</div>

			<div className="print-only" style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: "12px", padding: "20px" }}>
				<table border={0} cellPadding={2} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse" }}>
					<tbody>
						<tr>
							<td colSpan={2} align="center" style={{ fontSize: "16px", fontWeight: "bold" }}>
								PENDING CONTRACT WILL BE DELETED BY SYSTEM
							</td>
						</tr>
						<tr>
							<td colSpan={2} align="center" style={{ fontSize: "14px", fontWeight: "bold" }}>
								As of {asOf}
							</td>
						</tr>
						<tr><td colSpan={2}>&nbsp;</td></tr>
						<tr>
							<td colSpan={2}>Branch : {branchName}</td>
						</tr>
						<tr>
							<td colSpan={2}>
								<table border={1} cellPadding={2} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse" }}>
									<thead>
										<tr style={{ fontSize: "12px", fontFamily: "Arial, Helvetica, sans-serif", textAlign: "center" }}>
											{TABLE_HEADERS.map((h) => (
												<td key={h} style={{ border: "1px solid #000", padding: "3px 6px", fontWeight: "bold" }}>
													{h}
												</td>
											))}
										</tr>
									</thead>
									<tbody>
										{(printRows ?? []).map((row, idx) => (
											<tr
												key={`${row.appl_no}-print-${idx}`}
												style={{ fontSize: "12px", fontFamily: "Arial, Helvetica, sans-serif" }}
											>
												<td align="center" style={{ border: "1px solid #000", padding: "2px 6px" }}>{idx + 1}</td>
												<td align="center" style={{ border: "1px solid #000", padding: "2px 6px" }}>{row.appl_no}</td>
												<td align="center" style={{ border: "1px solid #000", padding: "2px 6px" }}>{row.lease_no}</td>
												<td align="center" style={{ border: "1px solid #000", padding: "2px 6px" }}>{row.lessee_nm}</td>
												<td align="center" style={{ border: "1px solid #000", padding: "2px 6px" }}>{fmtDate(row.appr_date)}</td>
												<td align="center" style={{ border: "1px solid #000", padding: "2px 6px" }}>{fmtDate(row.del_date)}</td>
												<td align="center" style={{ border: "1px solid #000", padding: "2px 6px" }}>{row.cmo}</td>
											</tr>
										))}
									</tbody>
								</table>
							</td>
						</tr>
					</tbody>
				</table>
				<br />
				<span style={{ fontSize: "12px", fontWeight: "bold", fontFamily: "Arial, Helvetica, sans-serif" }}>
					Total Unit : {(printRows ?? []).length}
				</span>
			</div>
		</>
	);
};

export default PendingContractWillBeDeletedBySystemPage;
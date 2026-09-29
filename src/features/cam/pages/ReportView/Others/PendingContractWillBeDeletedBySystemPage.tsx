import { useState, useEffect, useMemo } from 'react';
import * as XLSX from "xlsx";
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

const ROWS_PER_PAGE = DEFAULT_PAGE_LIMIT;

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

function exportExcel(data: PendingRow[], branchName: string): void {
	const asOf = todayLong();
	const rows: (string | number | null)[][] = [];

	rows.push(["PENDING CONTRACT WILL BE DELETED BY SYSTEM"]);
	rows.push([`As of ${asOf}`]);
	rows.push([`Branch : ${branchName}`]);
	rows.push([]);
	rows.push(TABLE_HEADERS);

	data.forEach((r, i) => {
		rows.push([
			i + 1,
			r.appl_no,
			r.lease_no,
			r.lessee_nm,
			fmtDate(r.appr_date),
			fmtDate(r.del_date),
			r.cmo,
		]);
	});

	rows.push([]);
	rows.push([`Total Unit : ${data.length}`]);

	const ws = XLSX.utils.aoa_to_sheet(rows);
	ws["!cols"] = [
		{ wch: 5 }, { wch: 16 }, { wch: 16 }, { wch: 30 },
		{ wch: 18 }, { wch: 20 }, { wch: 25 },
	];
	ws["!merges"] = [
		{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
		{ s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
		{ s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
	];

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "PendingContractDelete");
	XLSX.writeFile(wb, "ListPendingContractDeletedBySystem.xlsx");
}

const PendingContractWillBeDeletedBySystemPage: React.FC = () => {
	const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null);
	const [selectedBranch, setSelectedBranch] = useState<string>("");
	const [data, setData] = useState<PendingRow[]>([]);
	const [branchLoading, setBranchLoading] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [hasSearched, setHasSearched] = useState<boolean>(false);
	const [currentPage, setCurrentPage] = useState<number>(1);

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

	const handleSearch = async () => {
		if (!selectedBranch) return;
		setLoading(true);
		setError(null);
		setData([]);
		setCurrentPage(1);
		try {
			const res = await api.get<PendingRow[]>("/CAM/Others/PendingContractDelete/data", {
				params: { branch_cd: selectedBranch },
			});
			setData(res.data);
			setHasSearched(true);
		} catch {
			setError("Gagal memuat data. Silakan coba lagi.");
		} finally {
			setLoading(false);
		}
	};

	const handlePrint = () => window.print();

	const handleExport = () => {
		if (!data.length) return;
		const branchName =
			branchInfo?.branches.find((b) => b.branch_cd === selectedBranch)?.branch_name ??
			branchInfo?.user_branch_name ??
			selectedBranch;
		exportExcel(data, branchName);
	};

	const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);
	const paginatedData = useMemo(() => {
		const start = (currentPage - 1) * ROWS_PER_PAGE;
		return data.slice(start, start + ROWS_PER_PAGE);
	}, [data, currentPage]);
	const pageNumbers = useMemo(
		() => getPageNumbers(currentPage, totalPages),
		[currentPage, totalPages],
	);

	const branchName =
		branchInfo?.branches.find((b) => b.branch_cd === selectedBranch)?.branch_name ??
		branchInfo?.user_branch_name ??
		"";

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
						<p className="text-sm text-[var(--app-muted)] mt-1">As of {asOf}</p>
					</div>

					<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] p-4 mb-6 flex flex-wrap gap-3 items-end">
						<div className="flex-1 min-w-[220px] max-w-sm">
							<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">
								Branch <span className="text-red-500 ml-1">*</span>
							</label>

							{branchInfo?.is_admin ? (
								<select
									value={selectedBranch}
									onChange={(e) => { setSelectedBranch(e.target.value); setHasSearched(false); setData([]); }}
									disabled={branchLoading}
									className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg text-sm bg-[var(--app-card)] text-[var(--app-text)]
										focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
										disabled:opacity-60 disabled:cursor-not-allowed"
								>
									<option value="">Select</option>
									{(branchInfo?.branches ?? []).map((b) => (
										<option key={b.branch_cd} value={b.branch_cd}>
											{b.branch_name}
										</option>
									))}
								</select>
							) : (
								<input
									type="text"
									readOnly
									value={branchInfo?.user_branch_name ?? ""}
									className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg text-sm bg-[var(--app-surface)] text-[var(--app-muted)] cursor-not-allowed"
								/>
							)}
						</div>

						<button
							onClick={handleSearch}
							disabled={!selectedBranch || loading || branchLoading}
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
								bg-[var(--app-surface)] text-blue-800 border border-blue-200
								hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed"
						>
							{loading ? "Mencari…" : "Search"}
						</button>

						<button
							onClick={handlePrint}
							disabled={!data.length}
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
								bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)]
								hover:bg-[var(--app-surface-alt)] disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Print
						</button>

						<button
							onClick={handleExport}
							disabled={!data.length}
							className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
								bg-green-50 text-green-800 border border-green-200
								hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Export to Excel
						</button>
					</div>

					{error && (
						<div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
							{error}
						</div>
					)}

					{loading && (
						<div className="py-16 text-center text-sm text-[var(--app-muted)]">Memuat data…</div>
					)}

					{!loading && !hasSearched && (
						<div className="py-16 text-center text-sm text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-xl">
							Pilih cabang dan klik <span className="font-medium">Search</span> untuk menampilkan data
						</div>
					)}

					{!loading && hasSearched && data.length === 0 && (
						<div className="py-16 text-center text-sm text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-xl">
							Tidak ada data untuk cabang yang dipilih
						</div>
					)}

					{!loading && data.length > 0 && (
						<>
							<div className="grid grid-cols-2 gap-3 mb-4 max-w-sm">
								<div className="bg-[var(--app-surface)] rounded-lg p-3">
									<div className="text-xs text-[var(--app-muted)] mb-1">Total Unit</div>
									<div className="text-lg font-semibold tabular-nums text-[var(--app-text)]">
										{data.length}
									</div>
								</div>
							</div>

							<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] overflow-hidden">
								<div className="overflow-x-auto">
									<table className="w-full border-collapse text-sm">
										<thead>
											<tr className="bg-[var(--app-surface)]">
												{TABLE_HEADERS.map((h) => (
													<th
														key={h}
														className="px-3 py-2 text-xs font-medium text-[var(--app-muted)] border-b border-[var(--app-border)] text-center whitespace-nowrap"
													>
														{h}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{paginatedData.map((row, idx) => {
												const globalIdx = (currentPage - 1) * ROWS_PER_PAGE + idx;
												return (
													<tr
														key={`${row.appl_no}-${globalIdx}`}
														className={globalIdx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}
													>
														<td className="px-3 py-2 text-center border-b border-[var(--app-border)] text-[var(--app-muted)] tabular-nums">
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
													Total Unit : {data.length}
												</td>
											</tr>
										</tfoot>
									</table>
								</div>

								{totalPages > 1 && (
									<div className="flex items-center justify-center gap-1.5 py-3 border-t border-[var(--app-border)] flex-wrap">
										<button
											onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
											disabled={currentPage === 1}
											className="px-3 py-1 text-sm rounded border border-[var(--app-border)]
												disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--app-surface)] transition-colors"
										>
											Previous
										</button>
										{pageNumbers.map((p, i) =>
											p === "…" ? (
												<span key={`el-${i}`} className="px-2 py-1 text-sm text-[var(--app-muted)]">…</span>
											) : (
												<button
													key={p}
													onClick={() => setCurrentPage(p as number)}
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
											onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
											disabled={currentPage === totalPages}
											className="px-3 py-1 text-sm rounded border border-[var(--app-border)]
												disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--app-surface)] transition-colors"
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
										<tr align="center" style={{ fontSize: "12px", fontFamily: "Arial, Helvetica, sans-serif" }}>
											{TABLE_HEADERS.map((h) => (
												<td key={h} style={{ border: "1px solid #000", padding: "3px 6px", fontWeight: "bold" }}>
													{h}
												</td>
											))}
										</tr>
									</thead>
									<tbody>
										{data.map((row, idx) => (
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
					Total Unit : {data.length}
				</span>
			</div>
		</>
	);
};

export default PendingContractWillBeDeletedBySystemPage;
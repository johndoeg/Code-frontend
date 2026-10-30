import { useState, useEffect } from 'react';
import api from '@/shared/api/axiosInstance';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';
import Pagination from '@/helpers/Pagination';

interface Branch {
	branch_cd: string;
	branch_name: string;
}

interface UndisburseRow {
	appl_no: string;
	cust_name: string;
	brand: string;
	type_nm: string;
	net_finance: number | null;
	emp_name: string;
	branch: string;
	lease_no: string;
	adm_date: string | null;
}

interface DataResponse {
	rows: UndisburseRow[];
	total: number;
	total_net_finance: number;
	page: number;
	limit: number;
}

const ROWS_PER_PAGE = DEFAULT_PAGE_LIMIT;

const TABLE_HEADERS = [
	"No.",
	"CAM No.",
	"Customer Name",
	"Collateral",
	"Total Net Finance",
	"CMO (Branch)",
	"Contract No.",
	"Last Approval Date",
];

function fmtNumber(v: number | null | undefined): string {
	if (v == null) return "";
	return new Intl.NumberFormat("id-ID").format(v);
}

function fmtDate(dateStr: string | null): string {
	if (!dateStr) return "";
	const d = new Date(dateStr);
	return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

const UndisbursedContractPage: React.FC = () => {
	const [branches, setBranches] = useState<Branch[]>([]);
	const [selectedBranch, setSelectedBranch] = useState<string>("");
	const [rows, setRows] = useState<UndisburseRow[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [totalNetFinance, setTotalNetFinance] = useState<number>(0);
	const [branchLoading, setBranchLoading] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(false);
	const [exporting, setExporting] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [searched, setSearched] = useState<boolean>(false);

	useEffect(() => {
		api.get<Branch[]>("/CAM/Others/UndisbursedContract/branches")
			.then((res) => setBranches(res.data))
			.catch(() => setError("Gagal memuat daftar cabang."))
			.finally(() => setBranchLoading(false));
	}, []);

	const fetchPage = async (branchCd: string, page: number) => {
		if (!branchCd) return;
		setLoading(true);
		setError(null);
		try {
			const res = await api.get<DataResponse>("/CAM/Others/UndisbursedContract/data", {
				params: { branch_cd: branchCd, page, limit: ROWS_PER_PAGE },
			});
			setRows(res.data.rows);
			setTotal(res.data.total);
			setTotalNetFinance(res.data.total_net_finance);
			setCurrentPage(res.data.page);
			setSearched(true);
		} catch {
			setError("Gagal memuat data. Silakan coba lagi.");
		} finally {
			setLoading(false);
		}
	};

	const handleBranchChange = (branchCd: string) => {
		setSelectedBranch(branchCd);
		setRows([]);
		setTotal(0);
		setTotalNetFinance(0);
		setCurrentPage(1);
		setSearched(false);
		setError(null);
		if (branchCd) void fetchPage(branchCd, 1);
	};

	const handleExport = async () => {
		if (!selectedBranch || !total) return;
		setExporting(true);
		setError(null);
		try {
			const res = await api.get("/CAM/Others/UndisbursedContract/excel", {
				params: { branch_cd: selectedBranch },
				responseType: "blob",
			});
			const url = URL.createObjectURL(res.data as Blob);
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = "UndisburseContract.xlsx";
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

	return (
		<div className="min-h-screen bg-[var(--app-surface)] p-4 md:p-6">
			<div className="max-w-full mx-auto">

				<div className="mb-6">
					<h1 className="text-2xl font-semibold text-[var(--app-text)]">List of Undisburse Contract</h1>
					<p className="text-sm text-[var(--app-text)] mt-1">
						Daftar kontrak yang belum dicairkan
					</p>
				</div>

				<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] p-4 mb-6 flex flex-wrap gap-3 items-end">
					<div className="flex-1 min-w-[220px] max-w-sm">
						<label className="block text-xs font-medium text-[var(--app-text)] mb-1">
							Branch <span className="text-red-500 ml-1">*</span>
						</label>
						<select
							value={selectedBranch}
							onChange={(e) => handleBranchChange(e.target.value)}
							disabled={branchLoading}
							className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg text-sm bg-white text-slate-900
								focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
								disabled:opacity-60 disabled:cursor-not-allowed"
						>
							<option value="" className="bg-white text-slate-900">Select</option>
							{branches.map((b) => (
								<option key={b.branch_cd} value={b.branch_cd} className="bg-white text-slate-900">
									{b.branch_name}
								</option>
							))}
						</select>
					</div>

					<button
						onClick={handleExport}
						disabled={!total || exporting}
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

				{!loading && searched && total === 0 && !error && (
					<div className="py-16 text-center text-sm text-[var(--app-text)] border border-dashed border-[var(--app-border)] rounded-xl">
						Tidak ada data untuk cabang yang dipilih
					</div>
				)}

				{!loading && total > 0 && (
					<>
						<div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
							<div className="bg-[var(--app-surface)] rounded-lg p-3">
								<div className="text-xs text-[var(--app-text)] mb-1">Total Kontrak</div>
								<div className="text-lg font-semibold tabular-nums text-[var(--app-text)]">
									{total}
								</div>
							</div>
							<div className="bg-[var(--app-surface)] rounded-lg p-3 col-span-1 md:col-span-2">
								<div className="text-xs text-[var(--app-text)] mb-1">Total Net Finance</div>
								<div className="text-lg font-semibold tabular-nums text-[var(--app-text)]">
									{fmtNumber(totalNetFinance)}
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
													<td className="px-3 py-2 border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
														{row.appl_no}
													</td>
													<td className="px-3 py-2 border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
														{row.cust_name}
													</td>
													<td className="px-3 py-2 border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
														{`${row.brand} ${row.type_nm}`.trim()}
													</td>
													<td className="px-3 py-2 border-b border-[var(--app-border)] text-right tabular-nums whitespace-nowrap text-[var(--app-text)]">
														{fmtNumber(row.net_finance)}
													</td>
													<td className="px-3 py-2 border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
														{row.emp_name}
														{row.branch && (
															<><br /><span className="text-[var(--app-text)] text-xs">({row.branch})</span></>
														)}
													</td>
													<td className="px-3 py-2 border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
														{row.lease_no}
													</td>
													<td className="px-3 py-2 border-b border-[var(--app-border)] whitespace-nowrap text-[var(--app-text)]">
														{fmtDate(row.adm_date)}
													</td>
												</tr>
											);
										})}
									</tbody>
									<tfoot>
										<tr className="bg-[var(--app-surface)] font-semibold">
											<td colSpan={4} className="px-3 py-2 text-right text-[var(--app-text)] border-t border-[var(--app-border)]">
												TOTAL
											</td>
											<td className="px-3 py-2 text-right tabular-nums text-[var(--app-text)] border-t border-[var(--app-border)]">
												{fmtNumber(totalNetFinance)}
											</td>
											<td colSpan={3} className="border-t border-[var(--app-border)]" />
										</tr>
									</tfoot>
								</table>
							</div>

							{totalPages > 1 && (
								<Pagination
									page={currentPage}
									totalPages={totalPages}
									onPageChange={(p) => void fetchPage(selectedBranch, p)}
									totalItems={total}
									itemsPerPage={ROWS_PER_PAGE}
									className="border-t border-[var(--app-border)]"
								/>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default UndisbursedContractPage;
import { useState, useEffect, useCallback } from "react";
import api from '@/shared/api/axiosInstance';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';
import Pagination from '@/helpers/Pagination';

interface Branch { branch_cd: string; branch_name: string; }

interface EContractRow {
	appl_no: string;
	lease_no: string;
	lessee_nm: string;
	brand_type: string;
	cmo_name: string;
	current_status: string;
	last_update: string;
}

interface DataResponse {
	rows: EContractRow[];
	total: number;
	page: number;
	limit: number;
	branch_name: string;
	company_name?: string;
	printed_by?: string;
}

interface BranchResponse {
	branches: Branch[];
	is_ho: boolean;
	branch_cd: string;
}

const BRANCHES_URL = "/CAM/Others/InProgressEContract/branches";
const DATA_URL     = "/CAM/Others/InProgressEContract/data";
const EXCEL_URL    = "/CAM/Others/InProgressEContract/excel";

const ROWS_PER_PAGE = DEFAULT_PAGE_LIMIT;
const CONSOLIDATE_CD = "000";

const HEADERS = ["No.", "CAM No.", "Contract No.", "Customer Name",
	"Brand / Type", "CMO", "Status", "Last Update"];

function PrintTable({ rows }: { rows: EContractRow[] }) {
	const td: React.CSSProperties = {
		border: "1px solid #000", padding: "2px 4px",
		fontFamily: "Tahoma, Arial, sans-serif", fontSize: 12,
	};
	return (
		<table border={0} cellPadding={2} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse" }}>
			<tbody>
				<tr style={{ textAlign: "center" }}>
					{HEADERS.map((h) => (
						<td key={h} style={{ ...td, fontWeight: "bold" }}>{h}</td>
					))}
				</tr>
				{rows.length === 0 ? (
					<tr>
						<td colSpan={HEADERS.length} align="center" style={{ ...td, color: "#c00", fontWeight: "bold" }}>
							Data Not Found
						</td>
					</tr>
				) : (
					rows.map((r, i) => (
						<tr key={`${r.appl_no}-${r.lease_no}-${i}`}>
							<td align="center" style={td}>{i + 1}</td>
							<td align="center" style={td}>{r.appl_no}</td>
							<td align="center" style={td}>{r.lease_no}</td>
							<td style={{ ...td, whiteSpace: "nowrap" }}>{r.lessee_nm}</td>
							<td align="center" style={td}>{r.brand_type}</td>
							<td align="center" style={td}>{r.cmo_name}</td>
							<td align="center" style={td}>{r.current_status}</td>
							<td align="center" style={td}>{r.last_update}</td>
						</tr>
					))
				)}
			</tbody>
		</table>
	);
}

const InProgressEContractPage: React.FC = () => {
	const [searchNo, setSearchNo] = useState<string>("");
	const [lesseeNm, setLesseeNm] = useState<string>("");
	const [branch, setBranch] = useState<string>(CONSOLIDATE_CD);

	const [branches, setBranches] = useState<Branch[]>([]);
	const [isHo, setIsHo] = useState<boolean>(false);
	const [branchLoading, setBranchLoading] = useState<boolean>(true);

	const [rows, setRows] = useState<EContractRow[]>([]);
	const [printRows, setPrintRows] = useState<EContractRow[] | null>(null);
	const [total, setTotal] = useState<number>(0);
	const [branchLabel, setBranchLabel] = useState<string>("");
	const [companyName, setCompanyName] = useState<string>("");
	const [printedBy, setPrintedBy] = useState<string>("");

	const [loading, setLoading] = useState<boolean>(false);
	const [printing, setPrinting] = useState<boolean>(false);
	const [exporting, setExporting] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [hasSearched, setHasSearched] = useState<boolean>(false);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [shouldPrint, setShouldPrint] = useState<boolean>(false);

	useEffect(() => {
		api.get<BranchResponse>(BRANCHES_URL)
			.then((res) => {
				setBranches(res.data.branches);
				setIsHo(res.data.is_ho);
				setBranch(res.data.branch_cd);
			})
			.catch(() => setError("Gagal memuat daftar cabang."))
			.finally(() => setBranchLoading(false));
	}, []);

	useEffect(() => {
		if (shouldPrint && printRows) {
			window.print();
			setShouldPrint(false);
		}
	}, [shouldPrint, printRows]);

	const filterParams = useCallback(
		() => ({ search_no: searchNo.trim(), lessee_nm: lesseeNm.trim(), branch }),
		[searchNo, lesseeNm, branch],
	);

	const resetResults = () => {
		setRows([]);
		setPrintRows(null);
		setTotal(0);
		setCurrentPage(1);
		setHasSearched(false);
	};

	const fetchPage = async (page: number) => {
		setLoading(true);
		setError(null);
		try {
			const res = await api.get<DataResponse>(DATA_URL, {
				params: { ...filterParams(), page, limit: ROWS_PER_PAGE },
			});
			setRows(res.data.rows);
			setTotal(res.data.total);
			setBranchLabel(res.data.branch_name);
			setCompanyName(res.data.company_name ?? "");
			setPrintedBy(res.data.printed_by ?? "");
			setCurrentPage(page);
			setHasSearched(true);
		} catch {
			setError("Gagal memuat data. Silakan coba lagi.");
			setRows([]);
			setTotal(0);
		} finally {
			setLoading(false);
		}
	};

	const handlePreview = () => {
		setPrintRows(null);
		void fetchPage(1);
	};

	const handlePrint = async () => {
		setPrinting(true);
		setError(null);
		try {
			const res = await api.get<DataResponse>(DATA_URL, {
				params: { ...filterParams(), all: 1 },
			});
			setPrintRows(res.data.rows);
			setBranchLabel(res.data.branch_name);
			setCompanyName(res.data.company_name ?? "");
			setPrintedBy(res.data.printed_by ?? "");
			setShouldPrint(true);
		} catch {
			setError("Gagal menyiapkan data cetak. Silakan coba lagi.");
		} finally {
			setPrinting(false);
		}
	};

	const handleExport = async () => {
		setExporting(true);
		setError(null);
		try {
			const res = await api.get(EXCEL_URL, {
				params: filterParams(),
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", "ListInProgressEContract.xlsx");
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch {
			setError("Gagal mengunduh Excel. Silakan coba lagi.");
		} finally {
			setExporting(false);
		}
	};

	const totalPages = Math.ceil(total / ROWS_PER_PAGE);
	const busy = loading || printing || exporting;
	const printDate = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
	const inputCls = "px-2 py-1.5 text-sm border border-[var(--app-border)] rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

	return (
		<>
			<style>{`
				@media print {
					body * { visibility: hidden !important; }
					.print-only, .print-only * { visibility: visible !important; }
					.print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
					.screen-only { display: none !important; }
					body { font-family: Tahoma, Arial, sans-serif; font-size: 12px; }
					@page { size: landscape; margin: 10mm; }
				}
				@media screen { .print-only { display: none; } }
			`}</style>

			<div className="screen-only min-h-screen bg-[var(--app-surface)] p-4 md:p-6">
				<div className="max-w-full mx-auto">

					<div className="mb-6">
						<h1 className="text-2xl font-semibold text-[var(--app-text)]">List In Progress E-Contract</h1>
					</div>

					<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-xl border border-[var(--app-border)] p-4 mb-6 flex flex-wrap gap-3 items-end">
						<div>
							<label className="block text-xs font-medium text-[var(--app-text)] mb-1">Contract No / CAM No</label>
							<input type="text" value={searchNo} onChange={(e) => { setSearchNo(e.target.value); resetResults(); }}
								className={inputCls} style={{ width: 200 }} />
						</div>

						<div>
							<label className="block text-xs font-medium text-[var(--app-text)] mb-1">Customer Name</label>
							<input type="text" value={lesseeNm} onChange={(e) => { setLesseeNm(e.target.value); resetResults(); }}
								className={inputCls} style={{ width: 220 }} />
						</div>

						<div>
							<label className="block text-xs font-medium text-[var(--app-text)] mb-1">Branch</label>
							<select value={branch} onChange={(e) => { setBranch(e.target.value); resetResults(); }}
								disabled={!isHo || branchLoading}
								className={inputCls + " disabled:bg-gray-100 disabled:cursor-not-allowed"} style={{ width: 240 }}>
								{branches.map((b) => (
									<option key={b.branch_cd} value={b.branch_cd} className="bg-white text-slate-900">
										{b.branch_name}
									</option>
								))}
							</select>
						</div>

						<button onClick={handlePreview} disabled={busy}
							className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 disabled:bg-gray-500 disabled:border-gray-500 disabled:cursor-not-allowed">
							{loading ? "Memuat…" : "Preview"}
						</button>

						<button onClick={handlePrint} disabled={busy}
							className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--app-surface-alt)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-[var(--app-surface)] disabled:opacity-60 disabled:cursor-not-allowed">
							{printing ? "Menyiapkan…" : "Print"}
						</button>

						<button onClick={handleExport} disabled={busy}
							className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white border border-green-700 hover:bg-green-700 disabled:bg-gray-500 disabled:border-gray-500 disabled:cursor-not-allowed">
							{exporting ? "Mengunduh…" : "Export to Excel"}
						</button>
					</div>

					{error && (
						<div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
					)}

					{loading && <div className="py-16 text-center text-sm text-[var(--app-text)]">Memuat data…</div>}

					{!loading && hasSearched && (
						<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-xl border border-[var(--app-border)] overflow-hidden">
							<div className="px-4 py-3 border-b border-[var(--app-border)] flex items-center gap-2">
								<span className="text-sm font-medium text-[var(--app-text)]">Branch : {branchLabel}</span>
								<span className="text-xs text-[var(--app-text)] ml-auto">{total} records</span>
							</div>

							<div className="overflow-x-auto">
								<table className="w-full border-collapse text-sm">
									<thead>
										<tr className="bg-[var(--app-surface)]">
											{HEADERS.map((h) => (
												<th key={h} className="px-3 py-2 text-xs font-medium text-[var(--app-text)] border-b border-[var(--app-border)] text-center whitespace-nowrap">
													{h}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{rows.length === 0 ? (
											<tr>
												<td colSpan={HEADERS.length} className="px-3 py-8 text-center text-sm text-red-600 font-semibold">
													Data Not Found
												</td>
											</tr>
										) : (
											rows.map((r, i) => (
												<tr key={`${r.appl_no}-${r.lease_no}-${i}`}
													className={i % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}>
													<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-center text-[var(--app-text)]">
														{(currentPage - 1) * ROWS_PER_PAGE + i + 1}
													</td>
													<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-center text-[var(--app-text)] whitespace-nowrap">{r.appl_no}</td>
													<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-center text-[var(--app-text)] whitespace-nowrap">{r.lease_no}</td>
													<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-[var(--app-text)] whitespace-nowrap">{r.lessee_nm}</td>
													<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-center text-[var(--app-text)]">{r.brand_type}</td>
													<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-center text-[var(--app-text)] whitespace-nowrap">{r.cmo_name}</td>
													<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-center text-[var(--app-text)] whitespace-nowrap">{r.current_status}</td>
													<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-center text-[var(--app-text)] whitespace-nowrap">{r.last_update}</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>

							{totalPages > 1 && (
								<Pagination
									page={currentPage}
									totalPages={totalPages}
									onPageChange={(p) => void fetchPage(p)}
									totalItems={total}
									itemsPerPage={ROWS_PER_PAGE}
									className="border-t border-[var(--app-border)]"
								/>
							)}
						</div>
					)}
				</div>
			</div>

			<div className="print-only" style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: 12, padding: 20 }}>
				<table border={0} cellPadding={2} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse" }}>
					<tbody>
						<tr>
							<td width="25%" style={{ whiteSpace: "nowrap" }}>{companyName}</td>
							<td width="50%"></td>
							<td width="10%"></td>
							<td width="15%">
								Date : {printDate}
								<br />
								Print By : {printedBy}
							</td>
						</tr>
						<tr>
							<td colSpan={4} align="center" style={{ fontSize: 16, fontWeight: "bold", letterSpacing: "0.2em" }}>
								List In Progress E-Contract
							</td>
						</tr>
						<tr>
							<td colSpan={4}>Branch : {branchLabel}</td>
						</tr>
					</tbody>
				</table>
				<br />
				<PrintTable rows={printRows ?? rows} />
			</div>
		</>
	);
};

export default InProgressEContractPage;
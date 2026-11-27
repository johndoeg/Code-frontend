import React, { useEffect, useState, useCallback, Suspense, lazy } from "react";
import api from '@/shared/api/axiosInstance';
import { useBranches } from '@/shared/hooks/useOptions';
import { filenameFromDisposition } from '@/shared/utils/helpers';
import { showAlert } from '@/helpers/AlertDialog';
import PrintPreview, { PRINT_TD, PRINT_TH } from '@/helpers/PrintPreview';

interface DealerDeletedRow {
	form_no: string;
	branch_name: string;
	supp: string;
	name: string;
	address: string;
	created_by: string;
	create_date: string;
	delete_by: string;
	delete_date: string;
	reason: string;
}

type SearchType = "1" | "2" | "";

interface AppliedFilter {
	branch: string;
	cekcek: SearchType;
	lempar: string;
}

type ColumnKey = keyof DealerDeletedRow | "no";

const PRINT_COLUMNS: { key: ColumnKey; label: string; width: string; consolidateWidth: string }[] = [
	{ key: "no", label: "No.", width: "4%", consolidateWidth: "4%" },
	{ key: "branch_name", label: "Branch", width: "0%", consolidateWidth: "9%" },
	{ key: "supp", label: "Dealer ID", width: "8%", consolidateWidth: "8%" },
	{ key: "name", label: "Dealer Name", width: "15%", consolidateWidth: "13%" },
	{ key: "address", label: "Address", width: "24%", consolidateWidth: "20%" },
	{ key: "created_by", label: "Created By", width: "8%", consolidateWidth: "8%" },
	{ key: "create_date", label: "Create Date", width: "8%", consolidateWidth: "8%" },
	{ key: "delete_by", label: "Delete By", width: "10%", consolidateWidth: "10%" },
	{ key: "delete_date", label: "Delete Date", width: "8%", consolidateWidth: "8%" },
	{ key: "reason", label: "Reason", width: "15%", consolidateWidth: "12%" },
];

const CENTERED: ColumnKey[] = ["no", "create_date", "delete_date"];

const asOfLabel = () =>
	new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const SupplierEntryLazy = lazy(() => import("@/features/master-data/pages/Dealer/SupplierEntryPage"));

class ModalBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
	state: { error: Error | null } = { error: null };
	static getDerivedStateFromError(error: Error) { return { error }; }
	componentDidCatch(error: Error, info: React.ErrorInfo) { console.error("Supplier Entry modal crashed:", error, info); }
	render() {
		if (this.state.error) {
			return (
				<div className="p-6 text-sm text-red-600">
					<p className="font-semibold">Supplier Entry failed to load</p>
					<p className="mt-1 break-words text-[var(--app-text)]">{this.state.error.message || String(this.state.error)}</p>
				</div>
			);
		}
		return this.props.children;
	}
}

function DealerDetailModal({ supp, onClose }: { supp: string; onClose: () => void }) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	return (
		<div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-2 md:p-4" onClick={onClose}>
			<div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-[var(--app-card)] text-[var(--app-text)] shadow-2xl" onClick={e => e.stopPropagation()}>
				<div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2">
					<span className="text-sm font-semibold text-[var(--app-text)]">Dealer — {supp}</span>
					<button type="button" onClick={onClose} aria-label="Close" className="rounded px-2 py-1 text-lg leading-none text-[var(--app-text)] hover:bg-[var(--app-card)]">✕</button>
				</div>
				<div className="flex-1 overflow-auto">
					<ModalBoundary>
						<Suspense fallback={<div className="p-10 text-center text-[var(--app-text)]">Loading…</div>}>
							<SupplierEntryLazy suppId={supp} mode="View" onClose={onClose} />
						</Suspense>
					</ModalBoundary>
				</div>
			</div>
		</div>
	);
}

function DeletedDealerPrint({
	rows, branchLabel, consolidate, onClose,
}: { rows: DealerDeletedRow[]; branchLabel: string; consolidate: boolean; onClose: () => void }) {
	const columns = PRINT_COLUMNS.filter((c) => consolidate || c.key !== "branch_name");

	return (
		<PrintPreview label={`Dealer Deleted Report — ${branchLabel}`} onClose={onClose}>
			<div style={{ textAlign: "center", marginBottom: 8 }}>
				<div style={{ fontSize: 16, fontWeight: "bold" }}>DEALER DELETED REPORT</div>
				<div>As of {asOfLabel()}</div>
			</div>
			<div style={{ marginBottom: 8, fontWeight: "bold" }}>Branch : {branchLabel}</div>

			<table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
				<colgroup>
					{columns.map((c) => <col key={c.key} style={{ width: consolidate ? c.consolidateWidth : c.width }} />)}
				</colgroup>
				<thead>
					<tr>
						{columns.map((c) => <th key={c.key} style={PRINT_TH}>{c.label}</th>)}
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 ? (
						<tr>
							<td colSpan={columns.length} style={{ ...PRINT_TD, textAlign: "center", fontWeight: "bold", color: "#dc2626" }}>
								Data Not Found
							</td>
						</tr>
					) : (
						rows.map((r, idx) => (
							<tr key={`${r.form_no}-${r.supp}-${idx}`}>
								{columns.map((c) => (
									<td key={c.key} style={{ ...PRINT_TD, textAlign: CENTERED.includes(c.key) ? "center" : "left" }}>
										{c.key === "no" ? idx + 1 : r[c.key]}
									</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>

			<div style={{ marginTop: 8, textAlign: "right" }}>
				Total : <strong>{rows.length}</strong> record{rows.length !== 1 ? "s" : ""}
			</div>
		</PrintPreview>
	);
}

const DealerDeletedReportPage: React.FC = () => {
	const { data: branches = [] } = useBranches();
	const [selectedBranch, setSelectedBranch] = useState<string>("");
	const [searchType, setSearchType] = useState<SearchType>("");
	const [searchVal, setSearchVal] = useState("");
	const [rows, setRows] = useState<DealerDeletedRow[]>([]);
	const [applied, setApplied] = useState<AppliedFilter | null>(null);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [printOpen, setPrintOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dealerModal, setDealerModal] = useState<string | null>(null);

	const searched = applied !== null;
	const isConsolidate = applied?.branch === "000";
	const branchLabel = (code: string) => branches.find((b) => b.branchCd === code)?.branchName ?? code;
	const appliedBranchLabel = applied ? branchLabel(applied.branch) : "";

	useEffect(() => {
		if (!selectedBranch && branches.length > 0) {
			setSelectedBranch(branches[0].branchCd);
		}
	}, [branches, selectedBranch]);

	const handleSearch = useCallback(async () => {
		const filter: AppliedFilter = {
			branch: selectedBranch,
			cekcek: searchType,
			lempar: searchType !== "" ? searchVal.trim() : "",
		};
		setLoading(true);
		setError(null);
		try {
			const res = await api.get('/MasterData/dealer-deleted-report', { params: filter });
			setRows(res.data.data || []);
			setApplied(filter);
		} catch (err) {
			console.error(err);
			setError("Failed to load data. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [selectedBranch, searchType, searchVal]);

	const handleExport = async () => {
		if (!applied) return;
		setExporting(true);
		try {
			const res = await api.get('/MasterData/dealer-deleted-report/excel', {
				params: applied,
				responseType: 'blob',
			});
			const blob = new Blob([res.data], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filenameFromDisposition(res.headers['content-disposition'], 'Dealer_Deleted_Report.xlsx');
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Export error:', err);
			showAlert('Failed to export. Please try again.', { variant: 'error' });
		} finally {
			setExporting(false);
		}
	};

	const closePrint = useCallback(() => setPrintOpen(false), []);
	const closeDealer = useCallback(() => setDealerModal(null), []);

	const openDealer = (supp: string) => {
		if (supp) setDealerModal(supp);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			{dealerModal && <DealerDetailModal supp={dealerModal} onClose={closeDealer} />}

			{printOpen && applied && (
				<DeletedDealerPrint
					rows={rows}
					branchLabel={appliedBranchLabel}
					consolidate={isConsolidate}
					onClose={closePrint}
				/>
			)}

			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6 mb-6">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">
								Dealer Deleted Report
							</h1>
							<p className="text-[var(--app-text)] mt-1 text-sm">As of {asOfLabel()}</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-[var(--app-text)] mb-1">
								Branch
							</label>
							<select
								value={selectedBranch}
								onChange={(e) => setSelectedBranch(e.target.value)}
								className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-slate-900 [&>option]:bg-white [&>option]:text-slate-900"
							>
								{branches.map((b, idx) => (
									<option key={b.branchCd || idx} value={b.branchCd}>
										{b.branchName}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-[var(--app-text)] mb-2">
								Search By
							</label>
							<div className="flex flex-col gap-2">
								<div className="flex items-center gap-3">
									<label className="flex items-center gap-2 cursor-pointer select-none">
										<input
											type="radio"
											name="searchType"
											value="1"
											checked={searchType === "1"}
											onChange={() => {
												setSearchType("1");
												setSearchVal("");
											}}
											className="accent-blue-600"
										/>
										<span className="text-sm text-[var(--app-text)]">Dealer ID</span>
									</label>
									{searchType === "1" && (
										<input
											type="text"
											placeholder="Enter Dealer ID..."
											value={searchVal}
											onChange={(e) => setSearchVal(e.target.value)}
											onKeyDown={(e) => e.key === "Enter" && handleSearch()}
											className="flex-1 border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
										/>
									)}
								</div>

								<div className="flex items-center gap-3">
									<label className="flex items-center gap-2 cursor-pointer select-none">
										<input
											type="radio"
											name="searchType"
											value="2"
											checked={searchType === "2"}
											onChange={() => {
												setSearchType("2");
												setSearchVal("");
											}}
											className="accent-blue-600"
										/>
										<span className="text-sm text-[var(--app-text)]">Dealer Name</span>
									</label>
									{searchType === "2" && (
										<input
											type="text"
											placeholder="Enter dealer name..."
											value={searchVal}
											onChange={(e) => setSearchVal(e.target.value)}
											onKeyDown={(e) => e.key === "Enter" && handleSearch()}
											className="flex-1 border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
										/>
									)}
								</div>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-3 mt-6">
						<button
							onClick={handleSearch}
							disabled={loading}
							className={`bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-2.5 rounded-lg font-medium shadow hover:shadow-lg transition-all flex items-center gap-2 ${loading ? "opacity-75 cursor-not-allowed" : ""}`}
						>
							{loading ? (
								<>
									<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
									</svg>
									Searching...
								</>
							) : (
								<>
									<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
										<path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor" />
									</svg>
									Search
								</>
							)}
						</button>

						{searched && rows.length > 0 && (
							<>
								<button
									onClick={() => setPrintOpen(true)}
									className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-2.5 rounded-lg font-medium shadow hover:shadow-lg transition-all flex items-center gap-2"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
									</svg>
									Print
								</button>

								<button
									onClick={handleExport}
									disabled={exporting}
									className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-6 py-2.5 rounded-lg font-medium shadow hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
								>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									{exporting ? 'Exporting…' : 'Export to Excel'}
								</button>
							</>
						)}
					</div>
				</div>

				{error && (
					<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
						<span>{error}</span>
						<button onClick={handleSearch} className="ml-4 underline text-sm text-red-900">
							Retry
						</button>
					</div>
				)}

				{searched && (
					<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-lg font-semibold text-[var(--app-text)]">Results</h2>
								<p className="text-sm text-[var(--app-text)]">
									Branch: <span className="font-medium">{appliedBranchLabel}</span>
									{" — "}
									<span className="font-medium text-blue-700">
										{rows.length} record{rows.length !== 1 ? "s" : ""}
									</span>
								</p>
							</div>
						</div>

						<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
							<table className="w-full text-sm">
								<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
									<tr>
										<th className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider w-10">No.</th>
										{isConsolidate && (
											<th className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">Branch</th>
										)}
										<th className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">Dealer ID</th>
										<th className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">Dealer Name</th>
										<th className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">Address</th>
										<th className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">Created By</th>
										<th className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">Create Date</th>
										<th className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">Delete By</th>
										<th className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">Delete Date</th>
										<th className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider">Reason</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--app-border)]">
									{rows.length === 0 ? (
										<tr>
											<td colSpan={isConsolidate ? 10 : 9} className="py-10 text-center text-[var(--app-text)]">
												<div className="flex flex-col items-center justify-center">
													<svg className="w-14 h-14 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
													<p className="text-base">No records found</p>
													<p className="text-xs mt-1">Try adjusting your search filters</p>
												</div>
											</td>
										</tr>
									) : (
										rows.map((row, idx) => (
											<tr
												key={`${row.form_no}-${row.supp}-${idx}`}
												className={`hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
											>
												<td className="py-3 px-4 text-center text-[var(--app-text)] font-medium">{idx + 1}</td>
												{isConsolidate && (
													<td className="py-3 px-4 text-[var(--app-text)]">{row.branch_name}</td>
												)}
												<td className="py-3 px-4 font-semibold">
													<button
														type="button"
														onClick={() => openDealer(row.supp)}
														title="Open dealer detail"
														className="text-blue-600 hover:text-blue-800 hover:underline font-semibold"
													>
														{row.supp}
													</button>
												</td>
												<td className="py-3 px-4 text-[var(--app-text)]">{row.name}</td>
												<td className="py-3 px-4 text-[var(--app-text)] max-w-xs">{row.address}</td>
												<td className="py-3 px-4 text-[var(--app-text)]">{row.created_by}</td>
												<td className="py-3 px-4 text-[var(--app-text)] whitespace-nowrap">{row.create_date}</td>
												<td className="py-3 px-4 text-[var(--app-text)]">{row.delete_by}</td>
												<td className="py-3 px-4 whitespace-nowrap">
													<span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
														{row.delete_date}
													</span>
												</td>
												<td className="py-3 px-4 text-[var(--app-text)]">{row.reason}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						{rows.length > 0 && (
							<p className="text-sm text-[var(--app-text)] mt-3 text-right">
								Total: <span className="font-semibold text-[var(--app-text)]">{rows.length}</span>{" "}
								record{rows.length !== 1 ? "s" : ""}
							</p>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default DealerDeletedReportPage;
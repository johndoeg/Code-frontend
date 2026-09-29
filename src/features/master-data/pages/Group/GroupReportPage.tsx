import React, { useState } from "react";
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';
interface GroupReportRow {
	APLESS: string;
	LESSEE_NM: string;
	ADDRESS1: string;
	CITY1: string;
	OUTS_TOTAL: number;
}

const fmt = (n: number) =>
	new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0 }).format(n);

const GroupReportPage: React.FC = () => {
	const [grpname, setGrpname] = useState("");
	const [appliedGrpname, setAppliedGrpname] = useState("");

	const [rows, setRows] = useState<GroupReportRow[]>([]);
	const [total, setTotal] = useState(0);
	const [grandTotal, setGrandTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [previewed, setPreviewed] = useState(false);
	const limit = DEFAULT_PAGE_LIMIT;

	const fetchData = async (name: string, pg: number) => {
		const res = await api.get('/MasterData/group-report', {
			params: { grpname: name, page: pg, limit },
		});
		return res.data;
	};

	const handlePreview = async () => {
		if (!grpname.trim()) {
			alert("Please fill the Group Name field.");
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const data = await fetchData(grpname, 1);
			setRows(data.data);
			setTotal(data.total);
			setGrandTotal(data.grand_total);
			setAppliedGrpname(grpname);
			setPage(1);
			setPreviewed(true);
		} catch {
			setError("Failed to load data. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handlePageChange = async (newPage: number) => {
		setLoading(true);
		setError(null);
		try {
			const data = await fetchData(appliedGrpname, newPage);
			setRows(data.data);
			setPage(newPage);
		} catch {
			setError("Failed to load page. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const fetchExportData = async (): Promise<GroupReportRow[]> => {
		const res = await api.get('/MasterData/group-report/export', {
			params: { grpname: appliedGrpname },
		});
		return res.data.data;
	};

	const handlePrint = async () => {
		if (!previewed) { alert("Please run Preview first."); return; }
		try {
			const data = await fetchExportData();
			const totalOuts = data.reduce((s, r) => s + r.OUTS_TOTAL, 0);
			const rowsHtml = data.map((r, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${r.LESSEE_NM}</td>
                    <td>${r.ADDRESS1} ${r.CITY1}</td>
                    <td style="text-align:right">${fmt(r.OUTS_TOTAL)}</td>
                </tr>
            `).join("");

			const win = window.open("", "_blank");
			if (!win) return;
			win.document.write(`
                <html>
                <head>
                    <title>Group Report — ${appliedGrpname}</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                        h2 { text-align: center; margin-bottom: 4px; }
                        p  { text-align: center; margin-top: 0; color: #555; }
                        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                        th, td { border: 1px solid #ccc; padding: 5px 8px; }
                        th { background: #f0f0f0; font-weight: bold; }
                        tr:nth-child(even) { background: #f9f9f9; }
                        .total-row td { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h2>Group Report</h2>
                    <p>Group Name: <strong>${appliedGrpname}</strong></p>
                    <table>
                        <thead>
                            <tr>
                                <th width="5%">No.</th>
                                <th width="26%">Group Member</th>
                                <th width="49%">Address</th>
                                <th width="20%">Outstanding</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                            <tr class="total-row">
                                <td colspan="3" style="text-align:right">TOTAL</td>
                                <td style="text-align:right">${fmt(totalOuts)}</td>
                            </tr>
                        </tbody>
                    </table>
                    <script>window.onload = () => { window.print(); window.close(); }<\/script>
                </body>
                </html>
            `);
			win.document.close();
		} catch {
			alert("Print failed. Please try again.");
		}
	};

	const handleExportExcel = async () => {
		if (!previewed) { alert("Please run Preview first."); return; }
		setExporting(true);
		try {
			const data = await fetchExportData();
			const totalOuts = data.reduce((s, r) => s + r.OUTS_TOTAL, 0);
			const XLSX = await import("xlsx");
			const wsData = [
				["No.", "Group Member", "Address", "Outstanding"],
				...data.map((r, i) => [
					i + 1,
					r.LESSEE_NM,
					`${r.ADDRESS1} ${r.CITY1}`.trim(),
					r.OUTS_TOTAL,
				]),
				["", "", "TOTAL", totalOuts],
			];
			const ws = XLSX.utils.aoa_to_sheet(wsData);

			const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
			for (let R = 1; R <= range.e.r; R++) {
				const cell = ws[XLSX.utils.encode_cell({ r: R, c: 3 })];
				if (cell) cell.z = '#,##0';
			}

			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, "Group Report");
			XLSX.writeFile(wb, `group_report_${appliedGrpname}.xlsx`);
		} catch {
			alert("Export failed. Please try again.");
		} finally {
			setExporting(false);
		}
	};

	const totalPages = Math.ceil(total / limit);

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">

				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
					<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)] mb-6">Group Report</h1>

					<div className="mb-6">
						<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Group Name</label>
						<input
							type="text"
							value={grpname}
							onChange={(e) => {
								setGrpname(e.target.value);
								setPreviewed(false);
								setRows([]);
							}}
							onKeyDown={(e) => { if (e.key === "Enter") handlePreview(); }}
							placeholder="Enter group name to search..."
							className="w-full md:w-96 border border-[var(--app-border)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div className="flex flex-wrap gap-3">
						<button
							onClick={handlePreview}
							disabled={loading}
							className={`bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all flex items-center gap-2 ${loading ? "opacity-75 cursor-not-allowed" : ""}`}
						>
							{loading ? (
								<>
									<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
									</svg>
									Loading...
								</>
							) : (
								<>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
									Preview
								</>
							)}
						</button>

						<button
							onClick={handlePrint}
							disabled={!previewed || loading}
							className={`border border-[var(--app-border)] text-[var(--app-text)] hover:bg-[var(--app-surface)] px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${(!previewed || loading) ? "opacity-40 cursor-not-allowed" : ""}`}
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
							</svg>
							Print
						</button>

						<button
							onClick={handleExportExcel}
							disabled={!previewed || loading || exporting}
							className={`bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${(!previewed || loading || exporting) ? "opacity-40 cursor-not-allowed" : ""}`}
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							{exporting ? "Exporting..." : "Export to Excel"}
						</button>
					</div>
				</div>

				{previewed && (
					<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-lg font-semibold text-[var(--app-text)]">Results</h2>
								<p className="text-sm text-[var(--app-muted)] mt-0.5">
									Group: <span className="font-medium">{appliedGrpname}</span>
								</p>
							</div>
							<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
								Total: {total}
							</span>
						</div>

						{error && (
							<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
								{error}
								<button
									onClick={() => handlePageChange(page)}
									className="ml-4 underline text-red-900"
								>
									Retry
								</button>
							</div>
						)}

						<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
							<table className="w-full">
								<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
									<tr>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider w-14">No.</th>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Group Member</th>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Address</th>
										<th className="py-4 px-6 text-right text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Outstanding</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--app-border)]">
									{rows.length === 0 && !loading ? (
										<tr>
											<td colSpan={4} className="py-10 px-6 text-center text-red-500 font-medium text-lg">
												Data Not Found
											</td>
										</tr>
									) : (
										<>
											{rows.map((row, idx) => (
												<tr
													key={row.APLESS || idx}
													className={`hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
												>
													<td className="py-4 px-6 text-sm text-[var(--app-muted)]">
														{(page - 1) * limit + idx + 1}
													</td>
													<td className="py-4 px-6 text-sm font-medium text-[var(--app-text)]">{row.LESSEE_NM}</td>
													<td className="py-4 px-6 text-sm text-[var(--app-text)]">
														{[row.ADDRESS1, row.CITY1].filter(Boolean).join(" ")}
													</td>
													<td className="py-4 px-6 text-sm text-[var(--app-text)] text-right font-mono">
														{fmt(row.OUTS_TOTAL)}
													</td>
												</tr>
											))}
											{loading && (
												<tr>
													<td colSpan={4} className="py-4 text-center">
														<div className="flex justify-center">
															<svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
																<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
																<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
															</svg>
														</div>
													</td>
												</tr>
											)}
										</>
									)}
								</tbody>

								{!loading && rows.length > 0 && (
									<tfoot>
										<tr className="bg-[var(--app-surface-alt)] border-t-2 border-[var(--app-border)]">
											<td colSpan={3} className="py-4 px-6 text-sm font-bold text-[var(--app-text)] text-right uppercase tracking-wide">
												Total
											</td>
											<td className="py-4 px-6 text-sm font-bold text-[var(--app-text)] text-right font-mono">
												{fmt(grandTotal)}
											</td>
										</tr>
									</tfoot>
								)}
							</table>
						</div>

						{!loading && total > limit && (
							<Pagination
								page={page}
								totalPages={totalPages}
								onPageChange={handlePageChange}
								totalItems={total}
								itemsPerPage={limit}
								className="mt-6"
							/>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default GroupReportPage;
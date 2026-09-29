import { useState, useMemo } from "react";
import api from '@/shared/api/axiosInstance';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface SummaryCMORow {
	fullname: string;
	is_cmh: boolean;
	unit1: number; unit2: number; tot_unit: number; pd_unit: number;
	op1: number; op2: number; tot_op: number; pd_op: number;
}

interface SummaryMonthlyRow {
	bulan: string;
	unit1: number; unit2: number; tot_unit: number; pd_unit: number;
	op1: number; op2: number; tot_op: number; pd_op: number;
}

interface RawRow {
	lease_no: string; lessee_nm: string;
	od: number; outs_princ: number; cmo: string;
}

interface ReportData {
	formatted_date: string;
	period1: string;
	summary_cmo: SummaryCMORow[];
	summary_monthly: SummaryMonthlyRow[];
	raw_data: RawRow[];
}

const MONTHS_ID = [
	"", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const CUR_YEAR = new Date().getFullYear();
const CUR_MONTH = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 21 }, (_, i) => CUR_YEAR + 10 - i);
const ROWS_PER_PAGE = DEFAULT_PAGE_LIMIT;

const fmtNum = (v: number) => new Intl.NumberFormat("id-ID").format(v);
const fmtPct = (v: number) => `${v.toFixed(2)}%`;

function getPageNumbers(cur: number, total: number): (number | "…")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	if (cur <= 4) return [1, 2, 3, 4, 5, "…", total];
	if (cur >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
	return [1, "…", cur - 1, cur, cur + 1, "…", total];
}

function MonthYearSelect({ month, year, onMonthChange, onYearChange }: {
	month: number; year: number;
	onMonthChange: (m: number) => void; onYearChange: (y: number) => void;
}) {
	const cls = "px-2 py-1.5 text-sm border border-[var(--app-border)] rounded-lg bg-[var(--app-card)] focus:outline-none focus:ring-2 focus:ring-blue-500";
	return (
		<>
			<select value={month} onChange={(e) => onMonthChange(Number(e.target.value))} className={cls} style={{ width: 110 }}>
				{MONTHS_ID.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
			</select>
			<select value={year} onChange={(e) => onYearChange(Number(e.target.value))} className={cls} style={{ width: 80 }}>
				{YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
			</select>
		</>
	);
}

interface SummaryTableProps<T> {
	rows: T[];
	labelKey: keyof T;
	labelHeader: string;
	isBold?: (row: T) => boolean;
}

function SummaryTable<T extends object>({ rows, labelKey, labelHeader, isBold }: SummaryTableProps<T>) {
	const thCls = "px-3 py-1.5 text-xs font-medium text-[var(--app-muted)] bg-[var(--app-surface)] border-b border-[var(--app-border)] text-center whitespace-nowrap";
	const tdCls = (bold: boolean, right = false) =>
		`px-3 py-1.5 border-b border-[var(--app-border)] text-xs ${right ? "text-right tabular-nums" : "text-center"} ${bold ? "font-semibold text-[var(--app-text)]" : "text-[var(--app-text)]"}`;

	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-xs">
				<thead>
					<tr>
						<th rowSpan={2} className={thCls} style={{ textAlign: "left" }}>{labelHeader}</th>
						<th colSpan={4} className={thCls + " border-l border-[var(--app-border)]"}>By Unit</th>
						<th colSpan={4} className={thCls + " border-l border-[var(--app-border)]"}>By Amount</th>
					</tr>
					<tr>
						{["≤ 30 DAYS", "> 30 DAYS", "GRAND TOTAL", "F6PD %",
							"≤ 30 DAYS", "> 30 DAYS", "GRAND TOTAL", "F6PD %"].map((h, i) => (
								<th key={i} className={thCls + (i === 0 || i === 4 ? " border-l border-[var(--app-border)]" : "")}>{h}</th>
							))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, i) => {
						const bold = isBold ? isBold(row) : false;
						const r = row as Record<string, unknown>;
						return (
							<tr key={i} className={bold ? "bg-[var(--app-surface)]/50" : (i % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]")}>
								<td className={`${tdCls(bold, false)} text-left whitespace-nowrap`}>
									{String(r[labelKey as string] ?? "")}
								</td>
								<td className={tdCls(bold, true) + " border-l border-[var(--app-border)]"}>{Number(r.unit1)}</td>
								<td className={tdCls(bold, true)}>{Number(r.unit2)}</td>
								<td className={tdCls(bold, true)}>{Number(r.tot_unit)}</td>
								<td className={tdCls(bold)}>{fmtPct(Number(r.pd_unit))}</td>
								<td className={tdCls(bold, true) + " border-l border-[var(--app-border)]"}>{fmtNum(Number(r.op1))}</td>
								<td className={tdCls(bold, true)}>{fmtNum(Number(r.op2))}</td>
								<td className={tdCls(bold, true)}>{fmtNum(Number(r.tot_op))}</td>
								<td className={tdCls(bold)}>{fmtPct(Number(r.pd_op))}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

const F6PDReportPage: React.FC = () => {
	const [bulan, setBulan] = useState<number>(CUR_MONTH);
	const [tahun, setTahun] = useState<number>(CUR_YEAR);
	const [data, setData] = useState<ReportData | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [exporting, setExporting] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [rawPage, setRawPage] = useState<number>(1);

	const params = { bulan_awal: bulan, tahun_awal: tahun };

	const handlePreview = async () => {
		setLoading(true);
		setError(null);
		setData(null);
		setRawPage(1);
		try {
			const res = await api.get<ReportData>("/CAM/Others/F6PD/data", { params });
			setData(res.data);
		} catch {
			setError("Gagal memuat data. Silakan coba lagi.");
		} finally {
			setLoading(false);
		}
	};

	const handleExport = async () => {
		setExporting(true);
		setError(null);
		try {
			const res = await api.get("/CAM/Others/F6PD/excel", {
				params,
				responseType: "blob",
			});
			const url = URL.createObjectURL(new Blob([res.data as BlobPart]));
			const link = document.createElement("a");
			link.href = url;
			link.download = "F6PDAging.xlsx";
			link.click();
			URL.revokeObjectURL(url);
		} catch {
			setError("Gagal mengekspor Excel. Silakan coba lagi.");
		} finally {
			setExporting(false);
		}
	};

	const rawTotal = data?.raw_data.length ?? 0;
	const rawPages = Math.ceil(rawTotal / ROWS_PER_PAGE);
	const rawSlice = useMemo(
		() => data?.raw_data.slice((rawPage - 1) * ROWS_PER_PAGE, rawPage * ROWS_PER_PAGE) ?? [],
		[data, rawPage],
	);
	const rawPageNums = useMemo(() => getPageNumbers(rawPage, rawPages), [rawPage, rawPages]);

	return (
		<div className="min-h-screen bg-[var(--app-surface)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="mb-6">
					<h1 className="text-2xl font-semibold text-[var(--app-text)]">F6PD Report</h1>
					{data && (
						<p className="text-sm text-[var(--app-muted)] mt-1">As of {data.formatted_date}</p>
					)}
				</div>

				<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] p-4 mb-6 flex flex-wrap gap-3 items-end">
					<div>
						<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Period</label>
						<div className="flex gap-2">
							<MonthYearSelect month={bulan} year={tahun} onMonthChange={setBulan} onYearChange={setTahun} />
						</div>
					</div>

					<button onClick={handlePreview} disabled={loading || exporting}
						className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--app-surface)] text-blue-800 border border-blue-200 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed">
						{loading ? "Memuat…" : "Preview"}
					</button>

					<button onClick={handleExport} disabled={loading || exporting}
						className="px-4 py-2 text-sm font-medium rounded-lg bg-green-50 text-green-800 border border-green-200 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed">
						{exporting ? "Mengunduh…" : "Export to Excel"}
					</button>
				</div>

				{error && (
					<div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
				)}

				{loading && <div className="py-16 text-center text-sm text-[var(--app-muted)]">Memuat data…</div>}

				{!loading && !data && (
					<div className="py-16 text-center text-sm text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-xl">
						Pilih periode dan klik <span className="font-medium">Preview</span> untuk menampilkan data,
						atau klik <span className="font-medium">Export to Excel</span> untuk langsung mengunduh
					</div>
				)}

				{!loading && data && (
					<>
						<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] overflow-hidden mb-4">
							<div className="px-4 py-3 border-b border-[var(--app-border)] flex items-center gap-2">
								<span className="text-sm font-medium text-[var(--app-text)]">Summary by CMO</span>
								<span className="text-xs text-[var(--app-muted)] ml-auto">
									<span className="inline-block w-2.5 h-2.5 rounded bg-blue-100 mr-1" />CMH row (bold)
								</span>
							</div>
							<SummaryTable
								rows={data.summary_cmo}
								labelKey="fullname"
								labelHeader="CMO"
								isBold={(r) => r.is_cmh}
							/>
						</div>

						<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] overflow-hidden mb-4">
							<div className="px-4 py-3 border-b border-[var(--app-border)]">
								<span className="text-sm font-medium text-[var(--app-text)]">Summary by Month</span>
							</div>
							<SummaryTable
								rows={data.summary_monthly}
								labelKey="bulan"
								labelHeader="Month-Year"
							/>
						</div>

						<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] overflow-hidden">
							<div className="px-4 py-3 border-b border-[var(--app-border)] flex items-center gap-2">
								<span className="text-sm font-medium text-[var(--app-text)]">Raw Data</span>
								<span className="text-xs text-[var(--app-muted)]">{rawTotal} records</span>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full border-collapse text-sm">
									<thead>
										<tr className="bg-[var(--app-surface)]">
											{["Contract No.", "Customer Name", "OD Days", "Outstanding Principal", "CMO"].map((h) => (
												<th key={h} className="px-3 py-2 text-xs font-medium text-[var(--app-muted)] border-b border-[var(--app-border)] text-center whitespace-nowrap">
													{h}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{rawSlice.map((row, i) => (
											<tr key={i} className={i % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}>
												<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-[var(--app-text)] whitespace-nowrap">{row.lease_no}</td>
												<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-[var(--app-text)] whitespace-nowrap">{row.lessee_nm}</td>
												<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-center text-[var(--app-text)]">{row.od}</td>
												<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-right tabular-nums text-[var(--app-text)]">{fmtNum(row.outs_princ)}</td>
												<td className="px-3 py-1.5 border-b border-[var(--app-border)] text-[var(--app-text)] whitespace-nowrap">{row.cmo}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{rawPages > 1 && (
								<div className="flex items-center justify-center gap-1.5 py-3 border-t border-[var(--app-border)] flex-wrap">
									<button onClick={() => setRawPage(p => Math.max(1, p - 1))} disabled={rawPage === 1}
										className="px-3 py-1 text-sm rounded border border-[var(--app-border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--app-surface)]">
										Previous
									</button>
									{rawPageNums.map((p, i) =>
										p === "…" ? (
											<span key={`el-${i}`} className="px-2 py-1 text-sm text-[var(--app-muted)]">…</span>
										) : (
											<button key={p} onClick={() => setRawPage(p as number)}
												className={`px-3 py-1 text-sm rounded border transition-colors ${rawPage === p ? "bg-blue-600 text-white border-blue-600" : "border-[var(--app-border)] hover:bg-[var(--app-surface)]"}`}>
												{p}
											</button>
										),
									)}
									<button onClick={() => setRawPage(p => Math.min(rawPages, p + 1))} disabled={rawPage === rawPages}
										className="px-3 py-1 text-sm rounded border border-[var(--app-border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--app-surface)]">
										Next
									</button>
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default F6PDReportPage;
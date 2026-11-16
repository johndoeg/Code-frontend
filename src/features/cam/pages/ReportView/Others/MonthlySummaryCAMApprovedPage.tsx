import { useState, useEffect, Fragment } from "react";
import api from '@/shared/api/axiosInstance';

interface DateInfo { day_num: number; day_str: string; is_holiday: boolean; }
interface Employee {
	no: number; employee_id: string; fullname: string;
	is_cmh: boolean; name_color: string; resigned: boolean;
	daily_counts: number[]; total: number; avg_per_day: number;
}

interface Branch {
	branch_cd: string; branch_name: string; cmo_count: number;
	employees: Employee[]; day_totals: number[];
	branch_total: number; branch_avg: number;
}

interface ReportData {
	asof: string; working_days: number; to_date: string;
	dates: DateInfo[]; branches: Branch[];
	grand_day_totals: number[];
	grand_total: number; grand_avg: number; grand_cmo_count: number;
	company_name?: string;
	printed_by?: string;
}

const MONTHS_ID = [
	"", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const CUR_YEAR = new Date().getFullYear();
const CUR_MONTH = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 21 }, (_, i) => CUR_YEAR + 10 - i);

const NO_W = 40;
const NAME_W = 170;

const CMH_BG = "#89CFF0";
const HOLIDAY_BG = "#ffcccc";
const WHITE = "#ffffff";
const GRAY_TOTAL = "#f3f4f6";
const GRAY_GRAND = "#e5e7eb";

function rowBg(emp: Employee) { return emp.is_cmh ? CMH_BG : WHITE; }

function MonthYearSelect({ month, year, onMonthChange, onYearChange }: {
	month: number; year: number;
	onMonthChange: (m: number) => void; onYearChange: (y: number) => void;
}) {
	const cls = "px-2 py-1.5 text-sm border border-[var(--app-border)] rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
	return (
		<>
			<select value={month} onChange={(e) => onMonthChange(Number(e.target.value))} className={cls} style={{ width: 110 }}>
				{MONTHS_ID.slice(1).map((m, i) => <option key={i + 1} value={i + 1} className="bg-white text-slate-900">{m}</option>)}
			</select>
			<select value={year} onChange={(e) => onYearChange(Number(e.target.value))} className={cls} style={{ width: 80 }}>
				{YEARS.map((y) => <option key={y} value={y} className="bg-white text-slate-900">{y}</option>)}
			</select>
		</>
	);
}

const tdBase: React.CSSProperties = { border: "1px solid #ccc", padding: "2px 4px", fontSize: 11, color: "#111827" };
const thBase: React.CSSProperties = { ...tdBase, fontWeight: "bold", backgroundColor: "#f9fafb" };

function TableBody({ data, isPrint }: { data: ReportData; isPrint: boolean }) {
	const dates = data.dates;
	const numDays = dates.length;
	if (!numDays) return null;
	const cellSz = isPrint ? 10 : 11;
	const tdS = (extra?: React.CSSProperties): React.CSSProperties =>
		({ ...tdBase, fontSize: cellSz, textAlign: "center", ...extra });
	const thS = (extra?: React.CSSProperties): React.CSSProperties =>
		({ ...thBase, fontSize: cellSz, textAlign: "center", ...extra });
	const noCls   = isPrint ? undefined : "sticky-no";
	const nameCls = isPrint ? undefined : "sticky-name";
	const dayW    = isPrint ? 22 : 26;

	return (
		<>
			{data.branches.map((branch) => (
				<Fragment key={branch.branch_cd}>
					<tr key={`${branch.branch_cd}-h1`}>
						<th rowSpan={2} className={noCls} style={thS({ width: NO_W, minWidth: NO_W })}>No.</th>
						<th rowSpan={2} className={nameCls} style={thS({ minWidth: NAME_W, textAlign: "left", paddingLeft: 4 })}>Name</th>
						<th colSpan={numDays} style={thS(isPrint ? undefined : { backgroundColor: "#dbeafe" })}>{branch.branch_name}</th>
						<th rowSpan={2} style={thS()}>Total</th>
						<th rowSpan={2} style={thS()}>Avg/Day</th>
					</tr>
					<tr key={`${branch.branch_cd}-h2`}>
						{dates.map((d) => (
							<th key={d.day_num} style={thS({ backgroundColor: d.is_holiday ? HOLIDAY_BG : "#f9fafb", color: d.is_holiday ? "#b91c1c" : "#374151", width: dayW, minWidth: dayW })}>
								{d.day_str}
							</th>
						))}
					</tr>

					{branch.employees.map((emp) => {
						const bg = rowBg(emp);
						return (
							<tr key={emp.employee_id} style={{ backgroundColor: bg }}>
								<td className={noCls} style={tdS({ backgroundColor: bg })}>{emp.no}</td>
								<td className={nameCls} style={tdS({ textAlign: "left", paddingLeft: 4, backgroundColor: bg, color: emp.name_color || "#000", fontWeight: emp.is_cmh ? "bold" : "normal", whiteSpace: "nowrap" })}>
									{emp.fullname}
								</td>
								{emp.daily_counts.map((count, di) => (
									<td key={di} style={tdS({ backgroundColor: dates[di].is_holiday ? HOLIDAY_BG : bg })}>
										{count > 0 ? count : ""}
									</td>
								))}
								<td style={tdS({ backgroundColor: bg })}>{emp.total}</td>
								<td style={tdS({ backgroundColor: bg })}>{emp.avg_per_day}</td>
							</tr>
						);
					})}

					<tr key={`${branch.branch_cd}-tot`} style={{ backgroundColor: GRAY_TOTAL }}>
						<td className={noCls} style={tdS({ backgroundColor: GRAY_TOTAL, fontWeight: "bold" })}>{branch.cmo_count}</td>
						<td className={nameCls} style={tdS({ backgroundColor: GRAY_TOTAL, fontWeight: "bold", textAlign: "left", paddingLeft: 4 })}>Total</td>
						{branch.day_totals.map((t, di) => (
							<td key={di} style={tdS({ backgroundColor: dates[di].is_holiday ? HOLIDAY_BG : GRAY_TOTAL, fontWeight: "bold" })}>
								{t > 0 ? t : ""}
							</td>
						))}
						<td style={tdS({ backgroundColor: GRAY_TOTAL, fontWeight: "bold" })}>{branch.branch_total}</td>
						<td style={tdS({ backgroundColor: GRAY_TOTAL, fontWeight: "bold" })}>{branch.branch_avg}</td>
					</tr>
				</Fragment>
			))}

			<tr style={{ backgroundColor: GRAY_GRAND }}>
				<td className={noCls} style={tdS({ backgroundColor: GRAY_GRAND, fontWeight: "bold" })}>{data.grand_cmo_count}</td>
				<td className={nameCls} style={tdS({ backgroundColor: GRAY_GRAND, fontWeight: "bold", textAlign: "left", paddingLeft: 4 })}>Grand Total</td>
				{data.grand_day_totals.map((t, di) => (
					<td key={di} style={tdS({ backgroundColor: dates[di].is_holiday ? HOLIDAY_BG : GRAY_GRAND, fontWeight: "bold" })}>
						{t > 0 ? t : ""}
					</td>
				))}
				<td style={tdS({ backgroundColor: GRAY_GRAND, fontWeight: "bold" })}>{data.grand_total}</td>
				<td style={tdS({ backgroundColor: GRAY_GRAND, fontWeight: "bold" })}>{data.grand_avg}</td>
			</tr>
		</>
	);
}

const MonthlySummaryCAMApprovedPage: React.FC = () => {
	const [bulan, setBulan] = useState<number>(CUR_MONTH);
	const [tahun, setTahun] = useState<number>(CUR_YEAR);
	const [data, setData] = useState<ReportData | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [shouldPrint, setShouldPrint] = useState<boolean>(false);
	const [exporting, setExporting] = useState<boolean>(false);

	useEffect(() => {
		if (shouldPrint && data) { window.print(); setShouldPrint(false); }
	}, [shouldPrint, data]);

	const fetchData = async (): Promise<ReportData | null> => {
		setLoading(true); setError(null);
		try {
			const res = await api.get<ReportData>("/CAM/Others/MonthlySummaryCAMApproved/data", { params: { bulan, tahun } });
			setData(res.data);
			return res.data;
		} catch {
			setError("Gagal memuat data. Silakan coba lagi.");
			return null;
		} finally {
			setLoading(false);
		}
	};

	const printDate = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");

	const handlePreview = () => { setData(null); fetchData(); };

	const handlePrint = async () => {
		if (data) { window.print(); }
		else { const d = await fetchData(); if (d) setShouldPrint(true); }
	};

	const handleExport = async () => {
		setExporting(true);
		setError(null);
		try {
			const res = await api.get("/CAM/Others/MonthlySummaryCAMApproved/excel", {
				params: { bulan, tahun },
				responseType: "blob",
			});
			const url = window.URL.createObjectURL(new Blob([res.data]));
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", "SummaryCAMbyCMO.xlsx");
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

	return (
		<>
			<style>{`
				@media print {
					body * { visibility: hidden !important; }
					.print-only, .print-only * { visibility: visible !important; }
					.print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
					.screen-only { display: none !important; }
					body { font-family: Tahoma, Arial, sans-serif; font-size: 10px; }
					@page { size: landscape; margin: 8mm; }
				}
				@media screen { .print-only { display: none; } }
				.sticky-no   { position: sticky; left: 0; z-index: 2; }
				.sticky-name { position: sticky; left: ${NO_W}px; z-index: 2; }
			`}</style>

			<div className="screen-only min-h-screen bg-[var(--app-surface)] p-4 md:p-6">
				<div className="max-w-full mx-auto">

					<div className="mb-6">
						<h1 className="text-2xl font-semibold text-[var(--app-text)]">CMO Productivity</h1>
					</div>

					<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-xl border border-[var(--app-border)] p-4 mb-6 flex flex-wrap gap-3 items-end">
						<div>
							<label className="block text-xs font-medium text-[var(--app-text)] mb-1">Approval Date</label>
							<div className="flex gap-2">
								<MonthYearSelect month={bulan} year={tahun} onMonthChange={setBulan} onYearChange={setTahun} />
							</div>
						</div>
						<button onClick={handlePreview} disabled={loading}
							className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 disabled:bg-gray-500 disabled:border-gray-500 disabled:cursor-not-allowed">
							{loading ? "Memuat…" : "Preview"}
						</button>
						<button onClick={handlePrint} disabled={loading}
							className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--app-surface-alt)] text-[var(--app-text)] border border-[var(--app-border)] hover:bg-[var(--app-surface)] disabled:opacity-60 disabled:cursor-not-allowed">
							Print
						</button>
						<button onClick={handleExport} disabled={loading || exporting}
							className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white border border-green-700 hover:bg-green-700 disabled:bg-gray-500 disabled:border-gray-500 disabled:cursor-not-allowed">
							{exporting ? "Menyiapkan…" : "Export to Excel"}
						</button>
					</div>

					{error && (
						<div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
					)}
					{loading && <div className="py-16 text-center text-sm text-[var(--app-text)]">Memuat data… (memerlukan beberapa saat)</div>}

					{!loading && data && (
						<>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
								{[
									{ label: "As of", value: data.asof },
									{ label: "Working Days", value: data.working_days },
									{ label: "Total CMOs", value: data.grand_cmo_count },
									{ label: "Grand Total CAMs", value: data.grand_total },
								].map((m) => (
									<div key={m.label} className="bg-[var(--app-surface)] rounded-lg p-3">
										<div className="text-xs text-[var(--app-text)] mb-1">{m.label}</div>
										<div className="text-lg font-semibold tabular-nums text-[var(--app-text)]">{m.value}</div>
									</div>
								))}
							</div>

							<div className="flex gap-4 mb-3 text-xs text-[var(--app-text)]">
								<span className="flex items-center gap-1">
									<span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: CMH_BG }} /> CMH
								</span>
								<span className="flex items-center gap-1">
									<span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: HOLIDAY_BG }} /> Holiday / Weekend
								</span>
								<span className="flex items-center gap-1 text-red-600 font-medium">● Resigned / Kondisi Merah</span>
							</div>

							<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] overflow-auto">
								<table style={{ borderCollapse: "collapse", fontSize: 11, whiteSpace: "nowrap" }}>
									<tbody>
										<TableBody data={data} isPrint={false} />
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>
			</div>

			{data && (
				<div className="print-only" style={{ fontFamily: "Tahoma, Arial, sans-serif", fontSize: 10, padding: "10px 15px" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
						<tbody>
							<tr>
								<td width="25%" style={{ whiteSpace: "nowrap" }}>{data.company_name ?? ""}</td>
								<td width="50%"></td>
								<td width="10%"></td>
								<td width="15%">
									Date : {printDate}
									<br />
									Print By : {data.printed_by ?? ""}
								</td>
							</tr>
							<tr>
								<td colSpan={4} align="center" style={{ fontSize: 16, fontWeight: "bold", letterSpacing: "0.2em" }}>
									CMO PRODUCTIVITY
								</td>
							</tr>
							<tr>
								<td colSpan={4} align="center" style={{ fontSize: 12, fontWeight: "bold" }}>
									Approval Date : {data.asof}
								</td>
							</tr>
							<tr>
								<td colSpan={4} align="center" style={{ fontSize: 11 }}>
									({data.working_days} Working Days)
								</td>
							</tr>
						</tbody>
					</table>

					<table border={1} cellPadding={2} cellSpacing={0} style={{ width: "100%", borderCollapse: "collapse" }}>
						<tbody>
							<TableBody data={data} isPrint />
						</tbody>
					</table>
				</div>
			)}
		</>
	);
};

export default MonthlySummaryCAMApprovedPage;
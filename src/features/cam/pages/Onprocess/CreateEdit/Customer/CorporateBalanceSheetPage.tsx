import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

interface FsItem {
	code: string;
	label: string;
	allowNegative: boolean;
}

interface FsGroup {
	section: "asset" | "liability_equity";
	header: string;
	items: FsItem[];
}

interface BalanceSheetData {
	currency: string;
	currencies: { value: string; label: string }[];
	periodOptions: string[];
	period1: string;
	period2: string;
	groups: FsGroup[];
	values: { period1: Record<string, string>; period2: Record<string, string> };
}

export interface CorporateBalanceSheetPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

const cellLabel =
	"border-b border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 py-2.5 align-top text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] whitespace-nowrap";
const cellValue = "border-b border-[var(--app-border)] px-4 py-2.5 align-top text-sm text-[var(--app-text)]";
const subheadCell =
	"border-b border-[var(--app-border)] bg-indigo-50/70 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-600";

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-t border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-3 first:border-t-0">
			<h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{children}</h2>
		</div>
	);
}

const inputCls =
	"border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full text-right focus:outline-none focus:ring-2 focus:ring-blue-400";
const selectCls = (editable: boolean) =>
	`border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${editable ? "bg-[var(--app-card)]" : "bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed"
	}`;

const fieldLabelCls = "text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1 block";

const toNumber = (v: string) => {
	const n = parseFloat((v || "0").replace(/,/g, ""));
	return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const numericKeyDown = (allowNegative: boolean) => (e: React.KeyboardEvent<HTMLInputElement>) => {
	const allowed = allowNegative ? /^[\d-]$/ : /^\d$/;
	if (!allowed.test(e.key) && !["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight"].includes(e.key)) {
		e.preventDefault();
	}
};

function sanitizeAmount(value: string, allowNegative: boolean): string {
	return allowNegative ? value.replace(/[^\d-]/g, "") : value.replace(/\D/g, "");
}

function isValidMonth(mm: string): boolean {
	if (mm.length !== 2) return false;
	const n = Number(mm);
	return n >= 1 && n <= 12;
}

function toPeriod(year: string, month: string): string {
	return `${year}${month}`;
}

function currentYYYYMM(): number {
	const now = new Date();
	return Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`);
}

function validateNewPeriod(year: string, month: string, label: string): string | null {
	if (year.length !== 4 || !/^\d{4}$/.test(year)) return `${label} not valid`;
	if (!isValidMonth(month)) return `${label} not valid`;
	if (Number(year) > new Date().getFullYear()) return `${label} not valid`;
	if (Number(toPeriod(year, month)) > currentYYYYMM()) return `${label} not valid`;
	return null;
}

function TrashIcon() {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
			<path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.808a2.75 2.75 0 002.741-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
		</svg>
	);
}

const PeriodPicker: React.FC<{
	label: string;
	options: string[];
	mode: "existing" | "new";
	existingValue: string;
	newYear: string;
	newMonth: string;
	onModeChange: (mode: "existing" | "new") => void;
	onExistingChange: (v: string) => void;
	onNewYearChange: (v: string) => void;
	onNewMonthChange: (v: string) => void;
	onNewPeriodBlur: () => void;
	onStageDelete: () => void;
	staged: boolean;
	loadingValues: boolean;
}> = ({
	label, options, mode, existingValue, newYear, newMonth,
	onModeChange, onExistingChange, onNewYearChange, onNewMonthChange, onNewPeriodBlur,
	onStageDelete, staged, loadingValues,
}) => (
		<div>
			<label className={fieldLabelCls}>{label}</label>
			<div className="flex items-center gap-2">
				<select
					className={selectCls(true)}
					value={mode === "existing" ? existingValue : "__new__"}
					onChange={e => {
						if (e.target.value === "__new__") onModeChange("new");
						else { onModeChange("existing"); onExistingChange(e.target.value); }
					}}
				>
					<option value="__new__">New</option>
					{options.map(p => <option key={p} value={p}>{p}</option>)}
				</select>
				{mode === "new" && (
					<>
						<input
							className={`${inputCls} w-16 text-left`}
							placeholder="mm"
							maxLength={2}
							value={newMonth}
							onChange={e => onNewMonthChange(e.target.value.replace(/\D/g, ""))}
							onBlur={onNewPeriodBlur}
						/>
						<input
							className={`${inputCls} w-24 text-left`}
							placeholder="yyyy"
							maxLength={4}
							value={newYear}
							onChange={e => onNewYearChange(e.target.value.replace(/\D/g, ""))}
							onBlur={onNewPeriodBlur}
						/>
					</>
				)}
				<button
					type="button"
					onClick={onStageDelete}
					title="Mark this period for deletion"
					className={`p-1.5 rounded-md ${staged ? "bg-orange-100 text-orange-600 ring-1 ring-orange-400" : "text-[var(--app-muted)] hover:text-orange-600 hover:bg-orange-50"}`}
				>
					<TrashIcon />
				</button>
				{loadingValues && <span className="text-xs text-[var(--app-muted)]">Loading…</span>}
			</div>
		</div>
	);

const CorporateBalanceSheetPage = forwardRef<CamTabHandle, CorporateBalanceSheetPageProps>(function CorporateBalanceSheetPage({ apless, applNo, finType, custName, onSaved }, ref) {
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<{ col: 1 | 2; period: string } | null>(null);
	const [loadingValues1, setLoadingValues1] = useState(false);
	const [loadingValues2, setLoadingValues2] = useState(false);
	const [formMessages, setFormMessages] = useState<string[]>([]);

	const [currency, setCurrency] = useState("IDR");
	const [mode1, setMode1] = useState<"existing" | "new">("existing");
	const [mode2, setMode2] = useState<"existing" | "new">("existing");
	const [existing1, setExisting1] = useState("");
	const [existing2, setExisting2] = useState("");
	const [newYear1, setNewYear1] = useState("");
	const [newMonth1, setNewMonth1] = useState("");
	const [newYear2, setNewYear2] = useState("");
	const [newMonth2, setNewMonth2] = useState("");
	const [values1, setValues1] = useState<Record<string, string>>({});
	const [values2, setValues2] = useState<Record<string, string>>({});

	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: ['cam-corporate-balance-sheet', apless, applNo],
		queryFn: async (): Promise<BalanceSheetData> => {
			const res = await api.get("/CAM/Customer/corporate", { params: { apless, applno: applNo } });
			return res.data;
		},
	});

	useEffect(() => {
		if (!data) return;
		setCurrency(data.currency || "IDR");
		setValues1(data.values.period1 || {});
		setValues2(data.values.period2 || {});
		if (data.period1) { setMode1("existing"); setExisting1(data.period1); } else { setMode1("new"); setNewYear1(""); setNewMonth1(""); }
		if (data.period2) { setMode2("existing"); setExisting2(data.period2); } else { setMode2("new"); setNewYear2(""); setNewMonth2(""); }
	}, [data]);

	const resolvedPeriod = (col: 1 | 2): string =>
		col === 1
			? (mode1 === "new" ? toPeriod(newYear1, newMonth1) : existing1)
			: (mode2 === "new" ? toPeriod(newYear2, newMonth2) : existing2);

	const handleExistingChange = async (col: 1 | 2, period: string) => {
		if (col === 1) setExisting1(period); else setExisting2(period);
		const setLoadingFlag = col === 1 ? setLoadingValues1 : setLoadingValues2;
		setLoadingFlag(true);
		const otherPeriod = resolvedPeriod(col === 1 ? 2 : 1);
		try {
			const res = await api.get("/CAM/Customer/corporate", {
				params: {
					apless, applno: applNo,
					period1: (col === 1 ? period : otherPeriod) || undefined,
					period2: (col === 1 ? otherPeriod : period) || undefined,
				},
			});
			const d: BalanceSheetData = res.data;
			if (col === 1) setValues1(d.values.period1 || {});
			else setValues2(d.values.period2 || {});
		} catch {
			setFormMessages(["Failed to load data for the selected period. Please try again."]);
		} finally {
			setLoadingFlag(false);
		}
	};

	const handleModeChange = (col: 1 | 2, mode: "existing" | "new") => {
		if (col === 1) {
			setMode1(mode);
			if (mode === "new") { setValues1({}); setNewYear1(""); setNewMonth1(""); }
		} else {
			setMode2(mode);
			if (mode === "new") { setValues2({}); setNewYear2(""); setNewMonth2(""); }
		}
	};

	const checkPeriodAgainstApplication = async (col: 1 | 2) => {
		const year = col === 1 ? newYear1 : newYear2;
		const month = col === 1 ? newMonth1 : newMonth2;
		if (year.length !== 4 || month.length !== 2) return;
		try {
			const res = await api.get("/CAM/Customer/corporate/period-check", {
				params: { apless, applno: applNo, period: toPeriod(year, month) },
			});
			if (res.data?.valid === false) {
				alert("Period not valid");
				if (col === 1) { setNewYear1(""); setNewMonth1(""); } else { setNewYear2(""); setNewMonth2(""); }
			}
		} catch { }
	};

	const setVal = (col: 1 | 2, item: FsItem, value: string) => {
		const clean = sanitizeAmount(value, item.allowNegative);
		if (col === 1) setValues1(prev => ({ ...prev, [item.code]: clean }));
		else setValues2(prev => ({ ...prev, [item.code]: clean }));
	};

	const groupSubtotal = (group: FsGroup, col: 1 | 2) =>
		group.items.reduce((sum, item) => sum + toNumber((col === 1 ? values1 : values2)[item.code] || "0"), 0);

	const sectionTotal = (section: "asset" | "liability_equity", col: 1 | 2) =>
		(data?.groups || [])
			.filter(g => g.section === section)
			.reduce((sum, g) => sum + groupSubtotal(g, col), 0);

	const stageDelete = (col: 1 | 2) => {
		setPendingDelete({ col, period: resolvedPeriod(col) });
	};

	const handleDeleteConfirmed = async () => {
		if (!pendingDelete || !pendingDelete.period) {
			alert("choose the period first please..");
			return;
		}
		const { period } = pendingDelete;
		if (!window.confirm(`Are you want to delete this period :${period}`)) return;

		setDeleting(true);
		try {
			await api.delete("/CAM/Customer/corporate", { params: { apless, period } });
			alert(`The delete process of period :${period} is success`);
			setPendingDelete(null);
			await refetch();
		} catch {
			alert("Delete failed. Please try again.");
		} finally {
			setDeleting(false);
		}
	};

	const doSave = useCallback(async (navigateAway: boolean) => {
		const period1 = mode1 === "new" ? toPeriod(newYear1, newMonth1) : existing1;
		const period2 = mode2 === "new" ? toPeriod(newYear2, newMonth2) : existing2;

		const messages: string[] = [];
		if (mode1 === "new") {
			const err1 = validateNewPeriod(newYear1, newMonth1, "Period 1 (Balance Sheet)");
			if (err1) messages.push(err1);
		} else if (!existing1) {
			messages.push("Period 1 (Balance Sheet) not valid");
		}
		if (mode2 === "new") {
			const err2 = validateNewPeriod(newYear2, newMonth2, "Period 2 (Balance Sheet)");
			if (err2) messages.push(err2);
		} else if (!existing2) {
			messages.push("Period 2 (Balance Sheet) not valid");
		}
		if (messages.length === 0 && period1 && period2 && period1 === period2) {
			messages.push("Data Period 1 and 2 must not be the same");
		}
		if (messages.length > 0) {
			setFormMessages(messages);
			return;
		}

		setFormMessages([]);
		setSaving(true);
		try {
			const res = await api.post("/CAM/Customer/corporate", {
				apless,
				applno: applNo,
				currency,
				period1: { period: period1, isNew: mode1 === "new", values: values1 },
				period2: { period: period2, isNew: mode2 === "new", values: values2 },
			});
			if (res.data.success) {
				if (navigateAway) {
					onSaved({ apless: res.data.apless ?? apless, applno: res.data.applno ?? applNo });
				} else {
					await refetch();
				}
			} else if (res.data.messages) {
				setFormMessages(res.data.messages);
			} else {
				setFormMessages([res.data.message || "Save failed — one or both periods may already exist."]);
			}
		} catch (err: any) {
			const respData = err?.response?.data;
			if (respData?.messages) {
				setFormMessages(respData.messages);
			} else if (respData?.message) {
				setFormMessages([respData.message]);
			} else {
				setFormMessages(["Save failed. Please try again."]);
			}
		} finally {
			setSaving(false);
		}
	}, [apless, applNo, currency, mode1, mode2, existing1, existing2, newYear1, newMonth1, newYear2, newMonth2, values1, values2, onSaved, refetch]);

	const handleSave = useCallback(() => doSave(true), [doSave]);
	const handleCalculate = useCallback(() => doSave(false), [doSave]);

	const handleClear = () => {
		setMode1("new"); setExisting1(""); setNewYear1(""); setNewMonth1("");
		setMode2("new"); setExisting2(""); setNewYear2(""); setNewMonth2("");
		setValues1({});
		setValues2({});
		setFormMessages([]);
		setPendingDelete(null);
	};

	useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

	if (isLoading || !data) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}
	if (isError) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
				Failed to load balance sheet data. Please try again.
				<button onClick={() => refetch()} className="underline ml-4">Retry</button>
			</div>
		);
	}

	const assetGroups = data.groups.filter(g => g.section === "asset");
	const liabilityGroups = data.groups.filter(g => g.section === "liability_equity");

	const renderGroups = (groups: FsGroup[]) => (
		<>
			{groups.map(group => (
				<React.Fragment key={group.header}>
					<tr>
						<td colSpan={3} className={subheadCell}>{group.header}</td>
					</tr>
					{group.items.map(item => (
						<tr key={item.code}>
							<td className={cellValue}>{item.label}</td>
							<td className={cellValue}>
								<input
									className={inputCls}
									value={values1[item.code] || ""}
									onKeyDown={numericKeyDown(item.allowNegative)}
									onChange={e => setVal(1, item, e.target.value)}
								/>
							</td>
							<td className={cellValue}>
								<input
									className={inputCls}
									value={values2[item.code] || ""}
									onKeyDown={numericKeyDown(item.allowNegative)}
									onChange={e => setVal(2, item, e.target.value)}
								/>
							</td>
						</tr>
					))}
					<tr>
						<td className={cellValue + " font-semibold"}>TOTAL {group.header}</td>
						<td className={cellValue + " font-semibold text-right"}>{fmt(groupSubtotal(group, 1))}</td>
						<td className={cellValue + " font-semibold text-right"}>{fmt(groupSubtotal(group, 2))}</td>
					</tr>
				</React.Fragment>
			))}
		</>
	);

	const renderSectionTable = (groups: FsGroup[], totalLabel: string, section: "asset" | "liability_equity") => (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[720px] border-collapse text-sm">
				<tbody>
					<tr>
						<td className={cellLabel}>Item</td>
						<td className={cellLabel + " text-right"}>Period 1</td>
						<td className={cellLabel + " text-right"}>Period 2</td>
					</tr>
					{renderGroups(groups)}
					<tr className="bg-[var(--app-surface)]">
						<td className="px-4 py-3 text-sm font-bold text-[var(--app-text)]">{totalLabel}</td>
						<td className="px-4 py-3 text-sm font-bold text-[var(--app-text)] text-right">{fmt(sectionTotal(section, 1))}</td>
						<td className="px-4 py-3 text-sm font-bold text-[var(--app-text)] text-right">{fmt(sectionTotal(section, 2))}</td>
					</tr>
				</tbody>
			</table>
		</div>
	);

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Neraca (Balance Sheet)</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>
			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<div className="flex gap-2">
					<span className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white">
						Neraca (Balance Sheet)
					</span>
					<span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed" title="Not yet implemented — needs legacy source">
						Laporan Laba Rugi (Profit/Loss)
					</span>
					<span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed" title="Not yet implemented — needs legacy source">
						Bank Summary
					</span>
				</div>

				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					<SectionHeader>Currency & Period</SectionHeader>
					<div className="flex flex-wrap items-end gap-6 px-6 py-4">
						<div>
							<label className={fieldLabelCls}>Currency</label>
							<select className={selectCls(true)} value={currency} onChange={e => setCurrency(e.target.value)}>
								{data.currencies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
							</select>
						</div>
						<PeriodPicker
							label="Period 1" options={data.periodOptions}
							mode={mode1} existingValue={existing1} newYear={newYear1} newMonth={newMonth1}
							onModeChange={m => handleModeChange(1, m)}
							onExistingChange={v => handleExistingChange(1, v)}
							onNewYearChange={setNewYear1} onNewMonthChange={setNewMonth1}
							onNewPeriodBlur={() => checkPeriodAgainstApplication(1)}
							onStageDelete={() => stageDelete(1)} staged={pendingDelete?.col === 1} loadingValues={loadingValues1}
						/>
						<PeriodPicker
							label="Period 2" options={data.periodOptions}
							mode={mode2} existingValue={existing2} newYear={newYear2} newMonth={newMonth2}
							onModeChange={m => handleModeChange(2, m)}
							onExistingChange={v => handleExistingChange(2, v)}
							onNewYearChange={setNewYear2} onNewMonthChange={setNewMonth2}
							onNewPeriodBlur={() => checkPeriodAgainstApplication(2)}
							onStageDelete={() => stageDelete(2)} staged={pendingDelete?.col === 2} loadingValues={loadingValues2}
						/>
					</div>

					<SectionHeader>Assets</SectionHeader>
					{renderSectionTable(assetGroups, "TOTAL ASSET", "asset")}

					<SectionHeader>Liabilities & Shareholder's Equity</SectionHeader>
					{renderSectionTable(liabilityGroups, "TOTAL LIABILITIES & SHAREHOLDER'S EQUITY", "liability_equity")}
				</div>

				<div className="flex justify-center gap-3 mt-6 mb-4">
					<button
						onClick={handleClear}
						disabled={saving || deleting}
						className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium"
					>
						Clear
					</button>
					<button
						onClick={handleCalculate}
						disabled={saving || deleting}
						className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium"
					>
						Calculate
					</button>
					<button
						onClick={handleDeleteConfirmed}
						disabled={saving || deleting}
						className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium"
					>
						{deleting ? "Deleting…" : pendingDelete ? `Delete Period ${pendingDelete.col} (${pendingDelete.period})` : "Delete"}
					</button>
				</div>

				{saving && <p className="text-sm text-[var(--app-muted)] mt-3">Saving…</p>}

				{formMessages.length > 0 && (
					<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
						<ul className="list-disc list-inside text-sm text-red-700 space-y-1">
							{formMessages.map((msg, i) => <li key={i}>{msg}</li>)}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
});

export default CorporateBalanceSheetPage;
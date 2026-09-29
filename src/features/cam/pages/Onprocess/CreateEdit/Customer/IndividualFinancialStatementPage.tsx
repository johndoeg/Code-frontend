import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

interface IncomeItem {
	code: string;
	label: string;
}

interface LiabilityRow {
	id: number;
	category: string;
	description: string;
	amount: string;
}

interface AssetRow {
	id: number;
	description: string;
	amount: string;
	notes: string;
}

interface FinancialData {
	currency: string;
	maritalStatus: string;
	currencies: { value: string; label: string }[];
	periodOptions: string[];
	selectedPeriod: string;
	incomeMain: IncomeItem[];
	incomeDeduction: IncomeItem[];
	incomeOther: IncomeItem[];
	incomeValues: Record<string, string>;
	liabilities: LiabilityRow[];
	assets: AssetRow[];
}

export interface IndividualFinancialStatementPageProps {
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
const inputClsLeft = inputCls.replace("text-right", "text-left");
const selectCls = (editable: boolean) =>
	`border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${editable ? "bg-[var(--app-card)]" : "bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed"
	}`;
const fieldLabelCls = "text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1 block";

const toNumber = (v: string) => {
	const n = parseFloat((v || "0").replace(/,/g, ""));
	return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

const padLiabilities = (rows: LiabilityRow[]): LiabilityRow[] => {
	const next = [...rows];
	while (next.length < 5) next.push({ id: 0, category: "", description: "", amount: "" });
	return next.slice(0, 5);
};
const padAssets = (rows: AssetRow[]): AssetRow[] => {
	const next = [...rows];
	while (next.length < 6) next.push({ id: 0, description: "", amount: "", notes: "" });
	return next.slice(0, 6);
};

const PeriodPicker: React.FC<{
	label: string;
	options: string[];
	mode: "existing" | "new";
	existingValue: string;
	newYear: string;
	onModeChange: (mode: "existing" | "new") => void;
	onExistingChange: (v: string) => void;
	onNewYearChange: (v: string) => void;
	onDelete: () => void;
	deleting: boolean;
}> = ({ label, options, mode, existingValue, newYear, onModeChange, onExistingChange, onNewYearChange, onDelete, deleting }) => (
	<div className="flex items-end gap-2">
		<div>
			<label className={fieldLabelCls}>{label}</label>
			<div className="flex gap-2">
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
					<input
						className={selectCls + " w-24"}
						placeholder="yyyy"
						maxLength={4}
						value={newYear}
						onChange={e => onNewYearChange(e.target.value.replace(/\D/g, ""))}
					/>
				)}
			</div>
		</div>
		<button
			onClick={onDelete}
			disabled={deleting}
			className="px-3 py-2 bg-red-700 hover:bg-red-800 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium"
		>
			{deleting ? "Deleting…" : "Delete"}
		</button>
	</div>
);

const IndividualFinancialStatementPage = forwardRef<CamTabHandle, IndividualFinancialStatementPageProps>(function IndividualFinancialStatementPage({ apless, applNo, finType, custName, onSaved }, ref) {
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const [periodMode, setPeriodMode] = useState<"existing" | "new">("existing");
	const [selectedExisting, setSelectedExisting] = useState("");
	const [newYear, setNewYear] = useState("");
	const [currency, setCurrency] = useState("IDR");
	const [incomeValues, setIncomeValues] = useState<Record<string, string>>({});
	const [liabilities, setLiabilities] = useState<LiabilityRow[]>(padLiabilities([]));
	const [assets, setAssets] = useState<AssetRow[]>(padAssets([]));

	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: ['cam-individual-financial', apless, applNo],
		queryFn: async (): Promise<FinancialData> => {
			const res = await api.get("/CAM/Customer/individual", { params: { apless, applno: applNo } });
			return res.data;
		},
	});

	useEffect(() => {
		if (!data) return;
		setCurrency(data.currency || "IDR");
		setIncomeValues(data.incomeValues || {});
		setLiabilities(padLiabilities(data.liabilities || []));
		setAssets(padAssets(data.assets || []));
		if (data.selectedPeriod) {
			setPeriodMode("existing");
			setSelectedExisting(data.selectedPeriod);
		} else {
			setPeriodMode("new");
			setNewYear("");
		}
	}, [data]);

	const setIncome = (code: string, value: string) =>
		setIncomeValues(prev => ({ ...prev, [code]: value.replace(/[^\d.-]/g, "") }));

	const setLiabilityField = (idx: number, field: keyof LiabilityRow, value: string) =>
		setLiabilities(prev => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));

	const setAssetField = (idx: number, field: keyof AssetRow, value: string) =>
		setAssets(prev => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));

	const spouseLocked = data?.maritalStatus === "D" || data?.maritalStatus === "S";

	const totalIncome = (data?.incomeMain || []).reduce((sum, item) => {
		if (spouseLocked && item.code === "310103") return sum;
		return sum + toNumber(incomeValues[item.code] || "0");
	}, 0);
	const totalDeduction = (data?.incomeDeduction || []).reduce(
		(sum, item) => sum + toNumber(incomeValues[item.code] || "0"), 0
	);
	const netIncomeBeforeLiabilities = totalIncome - totalDeduction;
	const totalLiabilities = liabilities.reduce((sum, row) => sum + toNumber(row.amount), 0);
	const netIncome = netIncomeBeforeLiabilities - totalLiabilities;
	const totalAssets = assets.reduce((sum, row) => sum + toNumber(row.amount), 0);

	const handleSave = useCallback(async () => {
		const period = periodMode === "new" ? newYear.trim() : selectedExisting;

		if (!period || period.length !== 4 || !/^\d{4}$/.test(period)) {
			alert("Period 1 not valid — must be a 4-digit year.");
			return;
		}
		const currentYear = new Date().getFullYear();
		if (Number(period) > currentYear) {
			alert("Period 1 not valid — year cannot be in the future.");
			return;
		}

		setSaving(true);
		try {
			const res = await api.post("/CAM/Customer/individual", {
				apless,
				applno: applNo,
				isNewPeriod: periodMode === "new",
				period,
				currency,
				incomeValues,
				liabilities,
				assets,
			});
			if (res.data.success) {
				onSaved({ apless: res.data.apless ?? apless, applno: res.data.applno ?? applNo });
			} else {
				alert(res.data.message || "Data for this period already exists, or is otherwise invalid.");
			}
		} catch {
			alert("Save failed. Please try again.");
		} finally {
			setSaving(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [apless, applNo, periodMode, newYear, selectedExisting, currency, incomeValues, liabilities, assets, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

	const handleDelete = async () => {
		const period = periodMode === "new" ? newYear.trim() : selectedExisting;
		if (!period) {
			alert("Choose the period first please.");
			return;
		}
		if (!window.confirm(`Are you want to delete this period: ${period}`)) return;

		setDeleting(true);
		try {
			await api.delete("/CAM/Customer/individual", { params: { apless, period } });
			await refetch();
		} catch {
			alert("Delete failed. Please try again.");
		} finally {
			setDeleting(false);
		}
	};

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
				Failed to load financial information. Please try again.
				<button onClick={() => refetch()} className="underline ml-4">Retry</button>
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			{judul && (
				<div className="judul border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-right text-xs font-semibold text-blue-400 sm:px-6">
					{judul}
				</div>
			)}
			<div>
				<h2 className="text-xl font-bold text-[var(--app-text)] mb-1">Financial Information</h2>
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
							label="Period" options={data.periodOptions}
							mode={periodMode} existingValue={selectedExisting} newYear={newYear}
							onModeChange={setPeriodMode} onExistingChange={setSelectedExisting} onNewYearChange={setNewYear}
							onDelete={handleDelete} deleting={deleting}
						/>
					</div>

					<SectionHeader>Liabilities</SectionHeader>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[640px] border-collapse text-sm">
							<tbody>
								<tr>
									<td className={cellLabel}>Category</td>
									<td className={cellLabel}>Description</td>
									<td className={cellLabel + " text-right"}>Amount</td>
								</tr>
								{liabilities.map((row, idx) => (
									<tr key={idx}>
										<td className={cellValue}>
											<input className={inputClsLeft} value={row.category} onChange={e => setLiabilityField(idx, "category", e.target.value)} />
										</td>
										<td className={cellValue}>
											<input className={inputClsLeft} value={row.description} onChange={e => setLiabilityField(idx, "description", e.target.value)} />
										</td>
										<td className={cellValue}>
											<input className={inputCls} value={row.amount} onChange={e => setLiabilityField(idx, "amount", e.target.value.replace(/[^\d.-]/g, ""))} />
										</td>
									</tr>
								))}
								<tr className="bg-[var(--app-surface)]">
									<td colSpan={2} className="px-4 py-3 text-sm font-bold text-[var(--app-text)]">Total</td>
									<td className="px-4 py-3 text-sm font-bold text-[var(--app-text)] text-right">{fmt(totalLiabilities)}</td>
								</tr>
							</tbody>
						</table>
					</div>

					<SectionHeader>Estimated Monthly Income</SectionHeader>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[480px] border-collapse text-sm">
							<tbody>
								{data.incomeMain.map(item => {
									const locked = spouseLocked && item.code === "310103";
									return (
										<tr key={item.code}>
											<td className={cellValue}>{item.label}</td>
											<td className={cellValue}>
												<input
													className={inputCls}
													value={locked ? "0" : (incomeValues[item.code] || "")}
													readOnly={locked}
													onChange={e => setIncome(item.code, e.target.value)}
												/>
											</td>
										</tr>
									);
								})}
								<tr>
									<td className={cellValue + " font-semibold"}>Total Income</td>
									<td className={cellValue + " font-semibold text-right"}>{fmt(totalIncome)}</td>
								</tr>
								{data.incomeDeduction.map(item => (
									<tr key={item.code}>
										<td className={cellValue}>{item.label}</td>
										<td className={cellValue}>
											<input className={inputCls} value={incomeValues[item.code] || ""} onChange={e => setIncome(item.code, e.target.value)} />
										</td>
									</tr>
								))}
								<tr>
									<td className={cellValue}>Liabilities</td>
									<td className={cellValue + " text-right"}>{fmt(totalLiabilities)}</td>
								</tr>
								<tr className="bg-[var(--app-surface)]">
									<td className="px-4 py-3 text-sm font-bold text-[var(--app-text)]">Net Income</td>
									<td className="px-4 py-3 text-sm font-bold text-[var(--app-text)] text-right">{fmt(netIncome)}</td>
								</tr>
								{data.incomeOther.length > 0 && (
									<>
										<tr>
											<td colSpan={2} className={subheadCell}>Other Income</td>
										</tr>
										{data.incomeOther.map(item => (
											<tr key={item.code}>
												<td className={cellValue}>{item.label}</td>
												<td className={cellValue}>
													<input className={inputCls} value={incomeValues[item.code] || ""} onChange={e => setIncome(item.code, e.target.value)} />
												</td>
											</tr>
										))}
									</>
								)}
							</tbody>
						</table>
					</div>

					<SectionHeader>Customer Asset Ownership</SectionHeader>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[640px] border-collapse text-sm">
							<tbody>
								<tr>
									<td className={cellLabel}>Description</td>
									<td className={cellLabel + " text-right"}>Amount Estimated</td>
									<td className={cellLabel}>Notes</td>
								</tr>
								{assets.map((row, idx) => (
									<tr key={idx}>
										<td className={cellValue}>
											<input className={inputClsLeft} value={row.description} onChange={e => setAssetField(idx, "description", e.target.value)} />
										</td>
										<td className={cellValue}>
											<input className={inputCls} value={row.amount} onChange={e => setAssetField(idx, "amount", e.target.value.replace(/[^\d.-]/g, ""))} />
										</td>
										<td className={cellValue}>
											<input className={inputClsLeft} value={row.notes} onChange={e => setAssetField(idx, "notes", e.target.value)} />
										</td>
									</tr>
								))}
								<tr className="bg-[var(--app-surface)]">
									<td className="px-4 py-3 text-sm font-bold text-[var(--app-text)]">Total Assets</td>
									<td className="px-4 py-3 text-sm font-bold text-[var(--app-text)] text-right">{fmt(totalAssets)}</td>
									<td className="px-4 py-3"></td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				{saving && <p className="text-sm text-[var(--app-muted)] mt-3">Saving…</p>}
			</div>
		</div>
	);
});

export default IndividualFinancialStatementPage;
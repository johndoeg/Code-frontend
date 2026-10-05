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

const toNumber = (v: string) => {
	const n = parseFloat((v || "0").replace(/,/g, ""));
	return Number.isFinite(n) ? n : 0;
};
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const formatMoney = (v: string) => (v === "" || v == null ? "" : fmt(toNumber(v)));
const cleanMoneyInput = (v: string) => v.replace(/[^\d.,-]/g, "");

const padLiabilities = (rows: LiabilityRow[]): LiabilityRow[] => {
	const next = [...rows];
	while (next.length < 5) next.push({ id: 0, category: "", description: "", amount: "" });
	return next.slice(0, Math.max(5, next.length));
};
const padAssets = (rows: AssetRow[]): AssetRow[] => {
	const next = [...rows];
	while (next.length < 6) next.push({ id: 0, description: "", amount: "", notes: "" });
	return next.slice(0, Math.max(6, next.length));
};

const cardCls = "mx-auto max-w-4xl overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm";
const cell = "border border-[var(--app-border)] px-2.5 py-1.5 align-middle";
const headCell = `${cell} bg-[var(--app-surface)] text-center text-[12px] font-semibold text-[var(--app-text)]`;
const bandCell = `${cell} bg-[var(--app-surface)] text-[13px] font-bold text-[var(--app-text)]`;
const labelCell = `${cell} text-[13px] text-[var(--app-text)]`;
const grayInput =
	"w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface-alt)] px-2 py-1 text-[13px] text-[var(--app-text)] transition-colors focus:border-blue-500 focus:bg-[var(--app-card)] focus:outline-none focus:ring-2 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:opacity-70";
const grayInputR = `${grayInput} text-right`;
const totalInput =
	"w-full rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-[13px] font-bold text-right text-[var(--app-text)]";
const selectCls =
	"rounded-md border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-1 text-[13px] text-[var(--app-text)] transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25";

const IndividualFinancialStatementPage = forwardRef<CamTabHandle, IndividualFinancialStatementPageProps>(function IndividualFinancialStatementPage({ apless, applNo, finType, custName, onSaved }, ref) {
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const [periodMode, setPeriodMode] = useState<"existing" | "new">("existing");
	const [selectedExisting, setSelectedExisting] = useState("");
	const [newYear, setNewYear] = useState("");
	const [loadedPeriod, setLoadedPeriod] = useState("");
	const [currency, setCurrency] = useState("IDR");
	const [incomeValues, setIncomeValues] = useState<Record<string, string>>({});
	const [liabilities, setLiabilities] = useState<LiabilityRow[]>(padLiabilities([]));
	const [assets, setAssets] = useState<AssetRow[]>(padAssets([]));

	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: ['cam-individual-financial', apless, applNo, loadedPeriod],
		queryFn: async (): Promise<FinancialData> => {
			const res = await api.get("/CAM/Customer/individual", {
				params: { apless, applno: applNo, ...(loadedPeriod ? { period: loadedPeriod } : {}) },
			});
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
		setIncomeValues(prev => ({ ...prev, [code]: value }));

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
	const totalLiabilities = liabilities.reduce((sum, row) => sum + toNumber(row.amount), 0);
	const netIncome = totalIncome - totalDeduction - totalLiabilities;
	const totalAssets = assets.reduce((sum, row) => sum + toNumber(row.amount), 0);

	const handlePeriodSelect = (value: string) => {
		if (value === "__new__") {
			setPeriodMode("new");
			setNewYear("");
			setIncomeValues({});
			setLiabilities(padLiabilities([]));
			setAssets(padAssets([]));
		} else {
			setPeriodMode("existing");
			setSelectedExisting(value);
			setLoadedPeriod(value);
		}
	};

	const handleClear = () => {
		setPeriodMode("new");
		setSelectedExisting("");
		setNewYear("");
		setCurrency("IDR");
		setIncomeValues({});
		setLiabilities(padLiabilities([]));
		setAssets(padAssets([]));
	};

	const handleSave = useCallback(async () => {
		const period = periodMode === "new" ? newYear.trim() : selectedExisting;

		if (!period || period.length !== 4 || !/^\d{4}$/.test(period)) {
			alert("Period 1 not valid — must be a 4-digit year.");
			return;
		}
		if (Number(period) > new Date().getFullYear()) {
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
			setLoadedPeriod("");
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
	const periodValue = periodMode === "new" ? "__new__" : selectedExisting;

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<div className="flex items-stretch justify-between gap-3 border-b border-[var(--app-border)] bg-[var(--app-card)]">
				<div className="flex items-stretch">
					<h2 className="flex items-center px-4 py-3 text-[17px] font-bold text-[var(--app-text)] sm:px-6">Financial Information</h2>
					<span
						className="flex min-w-[220px] cursor-not-allowed items-center bg-[var(--app-surface-alt)] px-4 py-3 text-[17px] font-bold text-[var(--app-muted)]"
						title="Not yet implemented — needs legacy source"
					>
						Bank Summary
					</span>
				</div>
				{judul && <span className="flex items-center px-4 text-xs font-bold text-blue-700 sm:px-6">{judul}</span>}
			</div>

			<div className="space-y-6 px-4 py-5 sm:px-6">
				<div className={cardCls}>
					<table className="w-full border-collapse">
						<colgroup>
							<col style={{ width: "25%" }} />
							<col style={{ width: "25%" }} />
							<col style={{ width: "50%" }} />
						</colgroup>
						<tbody>
							<tr>
								<td className={`${cell}`} colSpan={2}>
									<div className="flex items-center gap-2">
										<span className="text-[13px] text-[var(--app-text)]">Currency :</span>
										<select className={selectCls} style={{ minWidth: "15em" }} value={currency} onChange={e => setCurrency(e.target.value)}>
											<option value="">Select</option>
											{data.currencies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
										</select>
									</div>
								</td>
								<td className={cell}>
									<div className="flex items-center justify-center gap-2">
										<span className="whitespace-nowrap text-[13px] text-[var(--app-text)]" style={{ minWidth: "4.5rem" }}>Period :</span>
										<select className={selectCls} style={{ minWidth: "7.5rem" }} value={periodValue} onChange={e => handlePeriodSelect(e.target.value)}>
											<option value="__new__">New</option>
											{data.periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
										</select>
										<input
											className={`${grayInput} w-20 text-center`}
											maxLength={4}
											placeholder="yyyy"
											value={periodMode === "new" ? newYear : selectedExisting}
											disabled={periodMode !== "new"}
											onChange={e => setNewYear(e.target.value.replace(/\D/g, ""))}
										/>
										<span className="text-[12px] text-[var(--app-muted)]">(yyyy)</span>
									</div>
								</td>
							</tr>
							<tr><td className={bandCell} colSpan={3}>Liabilities</td></tr>
							<tr><td className={`${cell} text-center text-[13px] text-[var(--app-text)]`} colSpan={3}>Estimated Liabilities</td></tr>
							<tr>
								<td className={headCell}>Category</td>
								<td className={headCell}>Descriptions</td>
								<td className={headCell}>Amount</td>
							</tr>
							{liabilities.map((row, idx) => (
								<tr key={idx}>
									<td className={cell}>
										<input className={grayInput} value={row.category} onChange={e => setLiabilityField(idx, "category", e.target.value)} />
									</td>
									<td className={cell}>
										<input className={grayInput} value={row.description} onChange={e => setLiabilityField(idx, "description", e.target.value)} />
									</td>
									<td className={cell}>
										<input
											className={grayInputR}
											value={row.amount}
											onChange={e => setLiabilityField(idx, "amount", cleanMoneyInput(e.target.value))}
											onBlur={e => setLiabilityField(idx, "amount", formatMoney(e.target.value))}
										/>
									</td>
								</tr>
							))}
							<tr>
								<td className={`${cell} text-right text-[13px] font-bold text-[var(--app-text)]`} colSpan={2}>Total</td>
								<td className={cell}><input className={totalInput} value={fmt(totalLiabilities)} readOnly /></td>
							</tr>
						</tbody>
					</table>
				</div>

				<div className={cardCls}>
					<table className="w-full border-collapse">
						<colgroup>
							<col style={{ width: "40%" }} />
							<col style={{ width: "60%" }} />
						</colgroup>
						<tbody>
							<tr><td className={bandCell} colSpan={2}>Estimated Monthly Income</td></tr>
							{data.incomeMain.map(item => {
								const locked = spouseLocked && item.code === "310103";
								return (
									<tr key={item.code}>
										<td className={labelCell}>{item.label}</td>
										<td className={cell}>
											<input
												className={grayInputR}
												value={locked ? "0" : (incomeValues[item.code] || "")}
												readOnly={locked}
												onChange={e => setIncome(item.code, cleanMoneyInput(e.target.value))}
												onBlur={e => !locked && setIncome(item.code, formatMoney(e.target.value))}
											/>
										</td>
									</tr>
								);
							})}
							<tr>
								<td className={`${cell} text-right text-[13px] font-bold text-[var(--app-text)]`}>Total Income</td>
								<td className={cell}><input className={totalInput} value={fmt(totalIncome)} readOnly /></td>
							</tr>
							{data.incomeDeduction.map(item => (
								<tr key={item.code}>
									<td className={labelCell}>{item.label}</td>
									<td className={cell}>
										<input
											className={grayInputR}
											value={incomeValues[item.code] || ""}
											onChange={e => setIncome(item.code, cleanMoneyInput(e.target.value))}
											onBlur={e => setIncome(item.code, formatMoney(e.target.value))}
										/>
									</td>
								</tr>
							))}
							<tr>
								<td className={labelCell}>Liabilities</td>
								<td className={cell}><input className={grayInputR} value={fmt(totalLiabilities)} readOnly /></td>
							</tr>
							<tr>
								<td className={`${cell} text-right text-[13px] font-bold text-[var(--app-text)]`}>Total Income</td>
								<td className={cell}><input className={totalInput} value={fmt(netIncome)} readOnly /></td>
							</tr>
						</tbody>
					</table>
				</div>

				{data.incomeOther.length > 0 && (
					<div className={cardCls}>
						<table className="w-full border-collapse">
							<colgroup>
								<col style={{ width: "40%" }} />
								<col style={{ width: "60%" }} />
							</colgroup>
							<tbody>
								{data.incomeOther.map(item => (
									<tr key={item.code}>
										<td className={labelCell}>{item.label}</td>
										<td className={cell}><input className={grayInputR} value={incomeValues[item.code] || ""} readOnly /></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				<div className={cardCls}>
					<table className="w-full border-collapse">
						<colgroup>
							<col style={{ width: "30%" }} />
							<col style={{ width: "25%" }} />
							<col style={{ width: "45%" }} />
						</colgroup>
						<tbody>
							<tr><td className={bandCell} colSpan={3}>Customer Asset Ownership</td></tr>
							<tr><td className={`${cell} text-center`} colSpan={3}>&nbsp;</td></tr>
							<tr>
								<td className={headCell}>Descriptions</td>
								<td className={headCell}>Amount Estimated</td>
								<td className={headCell}>Notes</td>
							</tr>
							{assets.map((row, idx) => (
								<tr key={idx}>
									<td className={cell}>
										<input className={grayInput} value={row.description} onChange={e => setAssetField(idx, "description", e.target.value)} />
									</td>
									<td className={cell}>
										<input
											className={grayInputR}
											value={row.amount}
											onChange={e => setAssetField(idx, "amount", cleanMoneyInput(e.target.value))}
											onBlur={e => setAssetField(idx, "amount", formatMoney(e.target.value))}
										/>
									</td>
									<td className={cell}>
										<input className={grayInput} value={row.notes} onChange={e => setAssetField(idx, "notes", e.target.value)} />
									</td>
								</tr>
							))}
							<tr>
								<td className={`${cell} text-right text-[13px] font-bold text-[var(--app-text)]`}>Total Assets</td>
								<td className={cell}><input className={totalInput} value={fmt(totalAssets)} readOnly /></td>
								<td className={cell}></td>
							</tr>
							<tr>
								<td className={`${cell} text-center`} colSpan={3}>
									<div className="flex items-center justify-center gap-2 py-1">
										<button
											type="button"
											onClick={handleClear}
											className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-1.5 text-[13px] font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-alt)]"
										>
											Clear
										</button>
										<button
											type="button"
											onClick={handleSave}
											disabled={saving}
											className="rounded-md bg-blue-600 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
										>
											{saving ? "Calculating…" : "Calculate"}
										</button>
										<button
											type="button"
											onClick={handleDelete}
											disabled={deleting}
											className="rounded-md bg-red-600 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
										>
											{deleting ? "Deleting…" : "Delete"}
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
});

export default IndividualFinancialStatementPage;
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import api from '@/shared/api/axiosInstance';

export interface CamTabHandle {
	save: () => void;
}

export interface CAMFinancingDisbursementPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	contType: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

interface LookupOption {
	value: string;
	label: string;
}

type CategoryKey = "dealer" | "karoseri" | "accessories" | "others";

const CATEGORY_ORDER: CategoryKey[] = ["dealer", "karoseri", "accessories", "others"];

const CATEGORY_LABELS: Record<CategoryKey, string> = {
	dealer: "Dealer",
	karoseri: "Karoseri",
	accessories: "Accessories",
	others: "Others",
};

const CATEGORY_SPLIT: Record<CategoryKey, string> = {
	dealer: "Dealer",
	karoseri: "Karoseri",
	accessories: "Accessories",
	others: "Others",
};

interface CategoryFields {
	assetValue: number;
	dp: number;
	surveyFeeGross1: number;
	surveyFeeGross2: number;
	notaryFeeGross: number;
	provisionFee: number;
	businessTripFee: number;
	insurance: number;
	firstInstallment: number;
	advanceGraceMonths: number;
	advanceGraceAmount: number;
	agencyFeeGross: number;
	bbnFee: number;
	netFinance: number;
	commissionToDealer: number;
	totalPayment: number;
	othersFieldLabel?: string;
}

type NumericField = Exclude<keyof CategoryFields, "othersFieldLabel">;

interface AccountRow {
	id?: number;
	split: string;
	bank: string;
	bankLabel?: string;
	bankBranch: string;
	accName: string;
	accNo: string;
	amount: number | string;
	checked?: boolean;
}

interface CrossAccountRow {
	id?: number;
	crossNo: string;
	amount: number | string;
	purpose: string;
	purposeLabel?: string;
	checked?: boolean;
}

interface Totals {
	assetValue: number;
	dp: number;
	surveyFeeGross1: number;
	provisionFee: number;
	notaryFeeGross: number;
	businessTripFee: number;
	firstInstallment: number;
	advanceGraceAmount: number;
	agencyFeeGross: number;
	bbnFee: number;
	commissionToDealer: number;
}

const EMPTY_TOTALS: Totals = {
	assetValue: 0, dp: 0, surveyFeeGross1: 0, provisionFee: 0, notaryFeeGross: 0,
	businessTripFee: 0, firstInstallment: 0, advanceGraceAmount: 0, agencyFeeGross: 0,
	bbnFee: 0, commissionToDealer: 0,
};

const num = (value: any): number => {
	if (value === null || value === undefined) return 0;
	const parsed = parseFloat(String(value).replace(/,/g, ""));
	return Number.isFinite(parsed) ? parsed : 0;
};

const isBlank = (value: any) => value === null || value === undefined || String(value).trim() === "";

const fmt = (value: any) => Math.round(num(value)).toLocaleString("en-US");

const bySplit = (rows: AccountRow[]) =>
	[...rows].sort((a, b) => (a.split || "").localeCompare(b.split || ""));

const boxClass =
	"h-7 rounded border border-[var(--app-border)] bg-[var(--app-card)] px-1.5 text-sm text-[var(--app-text)] " +
	"read-only:bg-[var(--app-surface)] read-only:text-[var(--app-muted)] disabled:cursor-not-allowed disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)] disabled:opacity-70";

const selectClass =
	"h-7 rounded border border-[var(--app-border)] bg-white px-1.5 text-sm text-[var(--app-text)] [&>option]:bg-white " +
	"disabled:cursor-not-allowed disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)] disabled:opacity-70 " +
	"disabled:[&>option]:bg-[var(--app-surface)]";

const buttonClass =
	"rounded border border-[#CC5200] bg-[#FF6600] px-4 py-1 text-sm text-white hover:bg-[#E65C00] disabled:opacity-50";

const headCell = "border border-black bg-[#0066FF] px-1 py-1 text-center text-xs font-bold text-white";
const cellBorder = "border border-[var(--app-border)] px-1.5 py-1 text-sm text-[var(--app-text)]";
const rowLabel = "w-[280px] whitespace-nowrap py-[3px] pr-3 align-middle text-sm text-[var(--app-text)]";
const rowValue = "py-[3px] pr-3 align-middle";
const actionButton = "rounded border border-[#CC5200] bg-[#FF6600] px-2 py-[2px] text-xs text-white hover:bg-[#E65C00] disabled:opacity-50";
const money = "w-[200px]";

function Box({
	kind = "money",
	value,
	onChange,
	readOnly,
	disabled,
	maxLength,
	align = "right",
	className = "",
}: {
	kind?: "money" | "text";
	value: any;
	onChange?: (value: string) => void;
	readOnly?: boolean;
	disabled?: boolean;
	maxLength?: number;
	align?: "left" | "right";
	className?: string;
}) {
	const [draft, setDraft] = useState<string | null>(null);
	const editable = !readOnly && !disabled;
	const raw = value === null || value === undefined ? "" : String(value);
	const shown = kind === "money" ? (draft ?? (isBlank(raw) ? "" : fmt(raw))) : raw;
	return (
		<input
			type="text"
			inputMode={kind === "money" ? "numeric" : undefined}
			value={shown}
			readOnly={readOnly}
			disabled={disabled}
			maxLength={maxLength}
			onFocus={() => {
				if (!editable) return;
				if (kind === "money") setDraft(isBlank(raw) ? "" : String(Math.round(num(raw))));
			}}
			onChange={(e) => {
				if (!editable) return;
				const next = kind === "money" ? e.target.value.replace(/[^0-9-]/g, "") : e.target.value;
				if (kind === "money") setDraft(next);
				onChange?.(next);
			}}
			onBlur={() => {
				if (!editable) return;
				if (kind === "money") setDraft(null);
			}}
			className={`${boxClass} ${align === "right" ? "text-right" : "text-left"} ${className}`}
		/>
	);
}

function Dropdown({
	value,
	onChange,
	options,
	disabled,
	className = "",
}: {
	value: string;
	onChange: (value: string) => void;
	options: LookupOption[];
	disabled?: boolean;
	className?: string;
}) {
	return (
		<select
			value={value}
			disabled={disabled}
			onChange={(e) => onChange(e.target.value)}
			className={`${selectClass} ${className}`}
		>
			<option value="">Select</option>
			{options.map((o) => (
				<option key={o.value} value={o.value}>{o.label}</option>
			))}
		</select>
	);
}

function Spacer() {
	return <span className={`${money} inline-block`}>&nbsp;</span>;
}

function Divider({ symbol }: { symbol: string }) {
	return (
		<span className="flex items-center gap-2">
			<span className="inline-block h-px w-[200px] bg-[var(--app-border)]" />
			<span className="text-lg font-bold text-[var(--app-text)]">{symbol}</span>
		</span>
	);
}

const CAMFinancingDisbursementPage = forwardRef<CamTabHandle, CAMFinancingDisbursementPageProps>(function CAMFinancingDisbursementPage({
	apless,
	applNo,
	finType,
	custName,
	contType,
	onSaved,
}, ref) {
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [locked, setLocked] = useState(false);
	const [lockMessage, setLockMessage] = useState("");
	const [messages, setMessages] = useState<string[]>([]);
	const [successMessage, setSuccessMessage] = useState("");

	const [ketDpSecurity, setKetDpSecurity] = useState("Down Payment");
	const [splitView, setSplitView] = useState(false);
	const [active, setActive] = useState<Record<CategoryKey, boolean>>({
		dealer: true, karoseri: false, accessories: false, others: false,
	});
	const [categories, setCategories] = useState<Partial<Record<CategoryKey, CategoryFields>>>({});
	const [totals, setTotals] = useState<Totals>(EMPTY_TOTALS);
	const [othersField, setOthersField] = useState("");
	const [refundToDealer, setRefundToDealer] = useState(0);
	const [subsidyFromDealer, setSubsidyFromDealer] = useState(0);
	const [showRefund, setShowRefund] = useState(true);
	const [readonlyFirstInstallment, setReadonlyFirstInstallment] = useState(false);
	const [gracePeriodMaxMonths, setGracePeriodMaxMonths] = useState(0);
	const [gracePeriodAmountPerMonth, setGracePeriodAmountPerMonth] = useState(0);

	const [externalAccounts, setExternalAccounts] = useState<AccountRow[]>([]);
	const [internalAccounts, setInternalAccounts] = useState<CrossAccountRow[]>([]);
	const [stagingExternal, setStagingExternal] = useState<AccountRow[]>([]);
	const [stagingInternal, setStagingInternal] = useState<CrossAccountRow[]>([]);
	const [disbursementTypeOptions, setDisbursementTypeOptions] = useState<LookupOption[]>([]);
	const [disbursementType, setDisbursementType] = useState("");
	const [bankOptions, setBankOptions] = useState<LookupOption[]>([]);
	const [purposeOptions, setPurposeOptions] = useState<LookupOption[]>([]);
	const [disbursessToOptions, setDisbursessToOptions] = useState<LookupOption[]>([]);
	const [disbursessTo, setDisbursessTo] = useState("");

	const [calculating, setCalculating] = useState(false);
	const [resetting, setResetting] = useState(false);
	const [savingExternal, setSavingExternal] = useState(false);
	const [savingInternal, setSavingInternal] = useState(false);
	const [saving, setSaving] = useState(false);
	const [savingRow, setSavingRow] = useState(false);
	const [editExternalId, setEditExternalId] = useState<number | null>(null);
	const [editExternalDraft, setEditExternalDraft] = useState<AccountRow | null>(null);
	const [editInternalId, setEditInternalId] = useState<number | null>(null);
	const [editInternalDraft, setEditInternalDraft] = useState<CrossAccountRow | null>(null);

	const stateRef = useRef({ categories, splitView, othersField });
	stateRef.current = { categories, splitView, othersField };

	const load = useCallback(async () => {
		setLoading(true);
		setLoadError("");
		setMessages([]);
		setSuccessMessage("");
		try {
			const res = await api.get("/CAM/EditIndex/disbursement", {
				params: { apless, applno: applNo, finType, contType },
			});
			const d = res.data;
			if (d.blocked) {
				setLoadError(d.message || "The Application is on approval process or has finished. The Data cannot be changed");
				return;
			}
			setLocked(!!d.locked);
			setLockMessage(d.lockMessage || "");
			setKetDpSecurity(d.ketDpSecurity || "Down Payment");
			setSplitView(!!d.splitPurchaseOrder);
			setActive({
				dealer: true,
				karoseri: !!d.active?.karoseri,
				accessories: !!d.active?.accessories,
				others: !!d.active?.others,
			});
			setCategories(d.categories || {});
			setTotals({ ...EMPTY_TOTALS, ...(d.totals || {}) });
			setOthersField(d.categories?.others?.othersFieldLabel || "");
			setRefundToDealer(d.refundToDealer || 0);
			setSubsidyFromDealer(d.subsidyFromDealer || 0);
			setShowRefund(d.showRefund !== false);
			setReadonlyFirstInstallment(!!d.readonlyFirstInstallment);
			setGracePeriodMaxMonths(d.gracePeriodMaxMonths || 0);
			setGracePeriodAmountPerMonth(d.gracePeriodAmountPerMonth || 0);

			const flat: AccountRow[] = [];
			Object.entries(d.externalAccounts || {}).forEach(([split, rows]: [string, any]) => {
				(rows || []).forEach((r: any) => flat.push({ ...r, split, checked: true }));
			});
			setExternalAccounts(bySplit(flat));
			setInternalAccounts((d.internalAccounts || []).map((r: any) => ({ ...r, checked: true })));
			setStagingExternal([]);
			setStagingInternal([]);
			setDisbursementTypeOptions(d.disbursementTypeOptions || []);
			setDisbursementType("");
			setBankOptions(d.bankOptions || []);
			setPurposeOptions(d.purposeOptions || []);
			setDisbursessToOptions(d.disbursessToOptions || []);
			setDisbursessTo("");
		} catch {
			setLoadError("Failed to load Disbursement. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [apless, applNo, finType, contType]);

	useEffect(() => {
		void load();
	}, [load]);

	const visibleKeys = useMemo(
		() => (splitView ? CATEGORY_ORDER : (["dealer"] as CategoryKey[])),
		[splitView],
	);

	const sentKeys = useMemo(
		() => (splitView ? CATEGORY_ORDER.filter((k) => active[k]) : (["dealer"] as CategoryKey[])),
		[splitView, active],
	);

	const updateCategory = (key: CategoryKey, patch: Partial<CategoryFields>) =>
		setCategories((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key]!, ...patch } } : prev));

	const liveCategories = useMemo(() => {
		const out: Partial<Record<CategoryKey, CategoryFields>> = {};
		for (const key of CATEGORY_ORDER) {
			const c = categories[key];
			if (!c) continue;
			const isDealer = key === "dealer";
			const base =
				num(c.assetValue) - num(c.dp) - num(c.surveyFeeGross1) - num(c.provisionFee) -
				num(c.insurance) - num(c.firstInstallment) - num(c.agencyFeeGross) - num(c.bbnFee) +
				refundToDealer - subsidyFromDealer - num(c.surveyFeeGross2);
			const netFinance = isDealer
				? base - num(c.advanceGraceAmount) - num(c.notaryFeeGross) - num(c.businessTripFee)
				: base;
			const commission = isDealer ? num(c.commissionToDealer) : 0;
			out[key] = { ...c, netFinance, commissionToDealer: commission, totalPayment: netFinance + commission };
		}
		return out;
	}, [categories, refundToDealer, subsidyFromDealer]);

	const columnTotal = (field: NumericField) =>
		sentKeys.reduce((acc, key) => acc + num(liveCategories[key]?.[field]), 0);

	const handleGraceMonths = (raw: string) => {
		const months = num(raw);
		if (months > gracePeriodMaxMonths) {
			setMessages([`Maximum advance grace period is ${gracePeriodMaxMonths} months`]);
			const current = liveCategories.dealer;
			updateCategory("dealer", {
				advanceGraceMonths: num(current?.advanceGraceMonths),
				advanceGraceAmount: num(current?.advanceGraceAmount),
			});
			return;
		}
		setMessages([]);
		updateCategory("dealer", {
			advanceGraceMonths: months,
			advanceGraceAmount: gracePeriodAmountPerMonth * months,
		});
	};

	const buildCategoryPayload = () => {
		const out: Record<string, any> = {};
		for (const key of sentKeys) {
			const c = liveCategories[key];
			if (!c) continue;
			out[key] = { ...c, othersFieldLabel: key === "others" ? othersField : "" };
		}
		return out;
	};

	const handleCalculate = async () => {
		setCalculating(true);
		setMessages([]);
		setSuccessMessage("");
		try {
			const res = await api.post("/CAM/EditIndex/disbursement/calculate", {
				applno: applNo,
				apless,
				finType,
				splitPurchaseOrder: splitView,
				categories: buildCategoryPayload(),
			});
			if (res.data.success) {
				setCategories((prev) => ({ ...prev, ...(res.data.categories || {}) }));
				setSuccessMessage("Successful");
			} else {
				setMessages(String(res.data.message || "Failed").split("<br>").filter(Boolean));
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages(String(body?.message || body?.error || "Failed").split("<br>").filter(Boolean));
		} finally {
			setCalculating(false);
		}
	};

	const handleReset = async () => {
		setResetting(true);
		setMessages([]);
		setSuccessMessage("");
		try {
			const res = await api.post("/CAM/EditIndex/disbursement/reset", {
				applno: applNo, apless, finType, contType,
			});
			if (res.data.success) {
				await load();
				setSuccessMessage("Successful");
			} else {
				setMessages([res.data.message || "Reset failed"]);
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages([body?.message || body?.error || "Reset failed"]);
		} finally {
			setResetting(false);
		}
	};

	const savedExternalRows = externalAccounts.filter((r) => r.split === disbursessTo);

	const addExternalRow = () =>
		setStagingExternal((prev) => [...prev, {
			split: disbursessTo, bank: "", bankBranch: "", accName: "", accNo: "", amount: 0, checked: true,
		}]);

	const removeExternalRow = () => setStagingExternal((prev) => prev.slice(0, -1));

	const updateSavedExternal = (accNo: string, patch: Partial<AccountRow>) =>
		setExternalAccounts((prev) => prev.map((r) => (r.split === disbursessTo && r.accNo === accNo ? { ...r, ...patch } : r)));

	const updateStagingExternal = (index: number, patch: Partial<AccountRow>) =>
		setStagingExternal((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

	const saveExternalAccounts = async () => {
		setSavingExternal(true);
		setMessages([]);
		setSuccessMessage("");
		try {
			const rows = [
				...savedExternalRows.map((r) => ({ ...r, split: disbursessTo })),
				...stagingExternal.map((r) => ({ ...r, split: disbursessTo })),
			];
			const res = await api.post("/CAM/EditIndex/disbursement/accounts/save", {
				applno: applNo, apless, split: disbursessTo, rows,
			});
			if (res.data.success) {
				const saved = (res.data.accounts || []).map((a: any) => ({ ...a, split: disbursessTo, checked: true }));
				setExternalAccounts((prev) => bySplit([...prev.filter((r) => r.split !== disbursessTo), ...saved]));
				setStagingExternal([]);
				setSuccessMessage("Successful");
			} else {
				setMessages([res.data.message || "Failed"]);
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages([body?.message || body?.error || "Failed"]);
		} finally {
			setSavingExternal(false);
		}
	};

	const addInternalRow = () =>
		setStagingInternal((prev) => [...prev, { crossNo: "", amount: 0, purpose: "", checked: true }]);

	const removeInternalRow = () => setStagingInternal((prev) => prev.slice(0, -1));

	const updateSavedInternal = (id: number | undefined, patch: Partial<CrossAccountRow>) =>
		setInternalAccounts((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

	const updateStagingInternal = (index: number, patch: Partial<CrossAccountRow>) =>
		setStagingInternal((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

	const validateContract = async (crossNo: string) => {
		if (!crossNo) return;
		try {
			const res = await api.get("/CAM/EditIndex/disbursement/validate-contract", { params: { contract: crossNo } });
			if (!res.data.valid) setMessages([res.data.message || "Contract not exist"]);
		} catch {
			setMessages(["Contract not exist"]);
		}
	};

	const saveInternalAccounts = async () => {
		setSavingInternal(true);
		setMessages([]);
		setSuccessMessage("");
		try {
			const res = await api.post("/CAM/EditIndex/disbursement/cross-accounts/save", {
				applno: applNo,
				rows: [...internalAccounts, ...stagingInternal],
			});
			if (res.data.success) {
				setInternalAccounts((res.data.accounts || []).map((r: any) => ({ ...r, checked: true })));
				setStagingInternal([]);
				setSuccessMessage("Successful");
			} else {
				setMessages([res.data.message || "Failed"]);
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages([body?.message || body?.error || "Failed"]);
		} finally {
			setSavingInternal(false);
		}
	};

	const deleteExternalAccount = async (row: AccountRow) => {
		if (!window.confirm("Are you sure to delete?")) return;
		if (row.id) {
			try {
				await api.delete(`/CAM/EditIndex/disbursement/accounts/${row.id}`, { params: { applno: applNo } });
			} catch {
				setMessages(["Failed"]);
				return;
			}
		}
		setExternalAccounts((prev) => prev.filter((r) => r !== row));
	};

	const deleteInternalAccount = async (row: CrossAccountRow) => {
		if (!window.confirm("Are you sure to delete?")) return;
		if (row.id) {
			try {
				await api.delete(`/CAM/EditIndex/disbursement/cross-accounts/${row.id}`, { params: { applno: applNo } });
			} catch {
				setMessages(["Failed"]);
				return;
			}
		}
		setInternalAccounts((prev) => prev.filter((r) => r !== row));
	};

	const beginEditExternal = (row: AccountRow) => {
		if (row.id === undefined) return;
		setEditExternalId(row.id);
		setEditExternalDraft({ ...row });
	};

	const cancelEditExternal = () => {
		setEditExternalId(null);
		setEditExternalDraft(null);
	};

	const saveEditExternal = async () => {
		if (editExternalId === null || !editExternalDraft) return;
		setSavingRow(true);
		setMessages([]);
		setSuccessMessage("");
		try {
			const res = await api.put(`/CAM/EditIndex/disbursement/accounts/${editExternalId}`, {
				applno: applNo,
				bank: editExternalDraft.bank,
				bankBranch: editExternalDraft.bankBranch,
				accName: editExternalDraft.accName,
				accNo: editExternalDraft.accNo,
				amount: num(editExternalDraft.amount),
			});
			if (res.data.success) {
				setExternalAccounts(bySplit((res.data.accounts || []).map((a: any) => ({ ...a, checked: true }))));
				setStagingExternal([]);
				setEditExternalId(null);
				setEditExternalDraft(null);
				setSuccessMessage(res.data.message || "Success");
			} else {
				setMessages([res.data.message || "Data Failed"]);
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages([body?.message || body?.error || "Data Failed"]);
		} finally {
			setSavingRow(false);
		}
	};

	const beginEditInternal = (row: CrossAccountRow) => {
		if (row.id === undefined) return;
		setEditInternalId(row.id);
		setEditInternalDraft({ ...row });
	};

	const cancelEditInternal = () => {
		setEditInternalId(null);
		setEditInternalDraft(null);
	};

	const saveEditInternal = async () => {
		if (editInternalId === null || !editInternalDraft) return;
		setSavingRow(true);
		setMessages([]);
		setSuccessMessage("");
		try {
			const res = await api.put(`/CAM/EditIndex/disbursement/cross-accounts/${editInternalId}`, {
				applno: applNo,
				crossNo: editInternalDraft.crossNo,
				purpose: editInternalDraft.purpose,
				amount: num(editInternalDraft.amount),
			});
			if (res.data.success) {
				setInternalAccounts((res.data.accounts || []).map((r: any) => ({ ...r, checked: true })));
				setStagingInternal([]);
				setEditInternalId(null);
				setEditInternalDraft(null);
				setSuccessMessage(res.data.message || "Success");
			} else {
				setMessages([res.data.message || "Data Failed"]);
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages([body?.message || body?.error || "Data Failed"]);
		} finally {
			setSavingRow(false);
		}
	};

	const handleNext = useCallback(async () => {
		setSaving(true);
		setMessages([]);
		setSuccessMessage("");
		try {
			const state = stateRef.current;
			const keys = state.splitView
				? CATEGORY_ORDER.filter((k) => active[k])
				: (["dealer"] as CategoryKey[]);

			const payloadCategories: Record<string, any> = {};
			for (const key of keys) {
				const c = liveCategories[key];
				if (c) payloadCategories[key] = { ...c, othersFieldLabel: key === "others" ? state.othersField : "" };
			}
			const res = await api.post("/CAM/EditIndex/disbursement/next", {
				applno: applNo,
				apless,
				finType,
				splitPurchaseOrder: state.splitView,
				categories: payloadCategories,
			});
			if (res.data.success) {
				onSaved({ apless, applno: applNo });
			} else {
				setMessages(String(res.data.message || "Failed").split("<br>").filter(Boolean));
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages(String(body?.message || body?.error || "Failed").split("<br>").filter(Boolean));
		} finally {
			setSaving(false);
		}
	}, [apless, applNo, finType, active, liveCategories, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

	if (loading) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-[var(--app-muted)]">Loading…</p>
			</div>
		);
	}

	if (loadError) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-red-600">{loadError}</p>
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");
	const othersLabel = othersField || "Others";
	const editable = !locked;

	const fieldRow = (
		label: ReactNode,
		field: NumericField,
		options: { dealerEditable?: boolean; dealerOnly?: boolean; totalField?: keyof Totals } = {},
	) => (
		<tr>
			<td className={rowLabel}>{label}</td>
			{visibleKeys.map((key) => {
				const isDealer = key === "dealer";
				if (!active[key] || (options.dealerOnly && !isDealer)) {
					return <td key={key} className={rowValue}><Spacer /></td>;
				}
				const canEdit = editable && (options.dealerEditable === false ? false : isDealer || field === "assetValue" || field === "dp");
				return (
					<td key={key} className={rowValue}>
						<Box
							value={liveCategories[key]?.[field] ?? 0}
							readOnly={!canEdit}
							onChange={(v) => updateCategory(key, { [field]: num(v) } as Partial<CategoryFields>)}
							className={money}
						/>
					</td>
				);
			})}
			{splitView && (
				<td className={rowValue}>
					<Box
						value={options.totalField ? totals[options.totalField] : columnTotal(field)}
						readOnly
						className={money}
					/>
				</td>
			)}
		</tr>
	);

	const dividerRow = (symbol: string, key: string) => (
		<tr key={key}>
			<td className={rowLabel}>&nbsp;</td>
			{visibleKeys.map((k) => (
				<td key={k} className={rowValue}>{active[k] ? <Divider symbol={symbol} /> : <Spacer />}</td>
			))}
			{splitView && <td className={rowValue}><Divider symbol={symbol} /></td>}
		</tr>
	);

	return (
		<div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Disbursement</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>
			<div className="p-4 sm:p-6">
				<div className="overflow-x-auto">
					<table className={`border-collapse ${splitView ? "w-full" : ""}`}>
						<tbody>
							<tr>
								<td className={rowLabel}>Split Purchase Order</td>
								<td className={rowValue} colSpan={visibleKeys.length + (splitView ? 1 : 0)}>
									<span className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--app-text)]">
										<label className="inline-flex items-center gap-1">
											<input
												type="radio"
												name="pilihan_PO"
												checked={!splitView}
												disabled={!editable}
												onChange={() => setSplitView(false)}
											/>
											No
										</label>
										<label className="inline-flex items-center gap-1">
											<input
												type="radio"
												name="pilihan_PO"
												checked={splitView}
												disabled={!editable}
												onChange={() => setSplitView(true)}
											/>
											Yes
										</label>
										{active.others && (
											<span className="inline-flex items-center gap-1">
												<label>Other&apos;s name :</label>
												<Box
													kind="text"
													value={othersField}
													onChange={setOthersField}
													readOnly={!editable}
													align="left"
													className="w-[133px]"
												/>
											</span>
										)}
									</span>
								</td>
							</tr>

							<tr>
								<td className={rowLabel}>&nbsp;</td>
								{visibleKeys.map((key) => (
									<td key={key} className="py-[3px] pr-3 text-center text-sm text-[var(--app-text)]">
										{active[key] ? (key === "others" ? othersLabel : CATEGORY_LABELS[key]) : <Spacer />}
									</td>
								))}
								{splitView && <td className="py-[3px] pr-3 text-center text-sm text-[var(--app-text)]">Total</td>}
							</tr>

							{fieldRow("Asset Value", "assetValue", { totalField: "assetValue" })}
							{fieldRow(ketDpSecurity, "dp", { totalField: "dp" })}
							{fieldRow("Survey Fee Gross 1", "surveyFeeGross1", { totalField: "surveyFeeGross1" })}
							{fieldRow("Survey Fee Gross 2", "surveyFeeGross2")}
							{fieldRow("Notary Fee Gross", "notaryFeeGross", { totalField: "notaryFeeGross" })}
							{fieldRow("Provision Fee", "provisionFee", { totalField: "provisionFee" })}
							{fieldRow("Bussiness Trip Fee", "businessTripFee", { totalField: "businessTripFee" })}
							{fieldRow("Insurance", "insurance")}

							<tr>
								<td className={rowLabel}>First Installment</td>
								{visibleKeys.map((key) => (
									<td key={key} className={rowValue}>
										{active[key] ? (
											<Box
												value={liveCategories[key]?.firstInstallment ?? 0}
												readOnly={!editable || key !== "dealer" || readonlyFirstInstallment}
												onChange={(v) => updateCategory(key, { firstInstallment: num(v) })}
												className={money}
											/>
										) : <Spacer />}
									</td>
								))}
								{splitView && (
									<td className={rowValue}>
										<Box value={totals.firstInstallment} readOnly className={money} />
									</td>
								)}
							</tr>

							<tr>
								<td className={rowLabel}>
									<span className="flex items-center justify-between gap-4">
										<span>Advance Grace Period</span>
										<span>Month(s)</span>
									</span>
								</td>
								{visibleKeys.map((key) => (
									<td key={key} className={rowValue}>
										{!active[key] ? <Spacer /> : key === "dealer" ? (
											<span className="inline-flex items-center gap-1">
												<Box
													value={liveCategories.dealer?.advanceGraceMonths ?? 0}
													readOnly={!editable}
													onChange={handleGraceMonths}
													className="w-[40px]"
												/>
												<Box
													value={liveCategories.dealer?.advanceGraceAmount ?? 0}
													readOnly
													className="w-[155px]"
												/>
											</span>
										) : (
											<Box value={0} readOnly className={money} />
										)}
									</td>
								))}
								{splitView && (
									<td className={rowValue}>
										<Box value={columnTotal("advanceGraceAmount")} readOnly className={money} />
									</td>
								)}
							</tr>

							{fieldRow("Agency Fee Gross", "agencyFeeGross", { dealerEditable: false, totalField: "agencyFeeGross" })}
							{fieldRow("BBN Fee", "bbnFee", { dealerEditable: false, totalField: "bbnFee" })}

							{dividerRow("-", "minus1")}

							{showRefund && (
								<tr>
									<td className={rowLabel}>Refund to Dealer</td>
									{visibleKeys.map((key) => (
										<td key={key} className={rowValue}>
											{active[key]
												? <Box value={key === "dealer" ? refundToDealer : 0} readOnly className={money} />
												: <Spacer />}
										</td>
									))}
									{splitView && (
										<td className={rowValue}><Box value={refundToDealer} readOnly className={money} /></td>
									)}
								</tr>
							)}

							<tr>
								<td className={rowLabel}>Subsidy from Dealer</td>
								{visibleKeys.map((key) => (
									<td key={key} className={rowValue}>
										{active[key]
											? <Box value={key === "dealer" ? subsidyFromDealer : 0} readOnly className={money} />
											: <Spacer />}
									</td>
								))}
								{splitView && (
									<td className={rowValue}><Box value={subsidyFromDealer} readOnly className={money} /></td>
								)}
							</tr>

							{dividerRow("-", "minus2")}

							{fieldRow("Disbursement to Dealer", "netFinance", { dealerEditable: false })}
							{fieldRow("Commission to Dealer (Gross)", "commissionToDealer", {
								dealerEditable: false, dealerOnly: true, totalField: "commissionToDealer",
							})}

							{dividerRow("+", "plus1")}

							{fieldRow("Total Payment to Dealer", "totalPayment", { dealerEditable: false })}

							{editable && (
								<tr>
									<td className={rowLabel}>
										<button type="button" onClick={handleReset} disabled={resetting} className={buttonClass}>
											{resetting ? "Resetting…" : "Reset To Default"}
										</button>
									</td>
									<td className={rowValue} colSpan={visibleKeys.length + (splitView ? 1 : 0)}>
										<button type="button" onClick={handleCalculate} disabled={calculating} className={buttonClass}>
											{calculating ? "Calculating…" : "Calculate"}
										</button>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{(messages.length > 0 || successMessage) && (
					<div className="message mt-2 space-y-1">
						{successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
						{messages.map((line, i) => (
							<p key={i} className="text-sm text-red-600">{line}</p>
						))}
					</div>
				)}

				<div className="mt-6">
					<strong className="text-sm font-bold text-[var(--app-text)]">Disbursement To:</strong>
				</div>

				<table className="mt-2 border-collapse">
					<tbody>
						<tr>
							<td className={rowLabel}>Disbursement Type</td>
							<td className={rowValue}>
								<Dropdown
									value={disbursementType}
									onChange={setDisbursementType}
									options={disbursementTypeOptions}
									disabled={!editable}
									className="w-[200px]"
								/>
							</td>
						</tr>
					</tbody>
				</table>

				{disbursementType === "1" && (
					<div className="mt-4">
						<strong className="text-sm font-bold text-[var(--app-text)]">Disbursement To:</strong>
						<table className="mt-2 border-collapse">
							<tbody>
								<tr>
									<td className={rowLabel}>Disbursement to</td>
									<td className={rowValue}>
										<Dropdown
											value={disbursessTo}
											onChange={setDisbursessTo}
											options={disbursessToOptions}
											disabled={!editable}
											className="w-[200px]"
										/>
									</td>
								</tr>
							</tbody>
						</table>

						<div className="mt-3 overflow-x-auto">
							<table className="w-full border-collapse border border-[var(--app-border)]">
								<thead>
									<tr>
										<th className={`${headCell} w-[10%]`}>Disbursement to</th>
										<th className={`${headCell} w-[15%]`}>Bank Name</th>
										<th className={`${headCell} w-[15%]`}>Bank Branch</th>
										<th className={`${headCell} w-[18%]`}>Account Name</th>
										<th className={`${headCell} w-[14%]`}>Account Number</th>
										<th className={`${headCell} w-[11%]`}>Amount</th>
										<th className={`${headCell} w-[5%]`}>&nbsp;</th>
									</tr>
								</thead>
								<tbody>
									{savedExternalRows.map((row, index) => (
										<tr key={`saved-${row.id ?? index}`}>
											<td className={cellBorder}>{row.split}</td>
											<td className={cellBorder}>{row.bankLabel || row.bank}</td>
											<td className={cellBorder}>{row.bankBranch}</td>
											<td className={cellBorder}>{row.accName}</td>
											<td className={cellBorder}>{row.accNo}</td>
											<td className={`${cellBorder} text-center`}>
												<Box
													value={row.amount}
													readOnly={!editable}
													onChange={(v) => updateSavedExternal(row.accNo, { amount: num(v) })}
													className="w-[186px]"
												/>
											</td>
											<td className={`${cellBorder} text-center`}>
												<input
													type="checkbox"
													checked={row.checked !== false}
													disabled={!editable}
													onChange={(e) => updateSavedExternal(row.accNo, { checked: e.target.checked })}
												/>
											</td>
										</tr>
									))}
									{stagingExternal.map((row, index) => (
										<tr key={`new-${index}`}>
											<td className={cellBorder}>{disbursessTo}</td>
											<td className={cellBorder}>
												<Dropdown
													value={row.bank}
													onChange={(v) => updateStagingExternal(index, { bank: v })}
													options={bankOptions}
													className="w-[200px]"
												/>
											</td>
											<td className={cellBorder}>
												<Box
													kind="text"
													value={row.bankBranch}
													onChange={(v) => updateStagingExternal(index, { bankBranch: v })}
													align="left"
													maxLength={40}
													className="w-[173px]"
												/>
											</td>
											<td className={cellBorder}>
												<Box
													kind="text"
													value={row.accName}
													onChange={(v) => updateStagingExternal(index, { accName: v })}
													align="left"
													maxLength={50}
													className="w-[186px]"
												/>
											</td>
											<td className={cellBorder}>
												<Box
													kind="text"
													value={row.accNo}
													onChange={(v) => updateStagingExternal(index, { accNo: v.replace(/[^0-9]/g, "") })}
													align="left"
													maxLength={30}
													className="w-[133px]"
												/>
											</td>
											<td className={`${cellBorder} text-center`}>
												<Box
													value={row.amount}
													onChange={(v) => updateStagingExternal(index, { amount: num(v) })}
													className="w-[186px]"
												/>
											</td>
											<td className={`${cellBorder} text-center`}>
												<input
													type="checkbox"
													checked={row.checked !== false}
													onChange={(e) => updateStagingExternal(index, { checked: e.target.checked })}
												/>
											</td>
										</tr>
									))}
									<tr>
										<td className={`${cellBorder} text-right`} colSpan={5}>
											<span className="flex items-center gap-2">
												<button
													type="button"
													onClick={addExternalRow}
													disabled={!editable || !disbursessTo}
													className="h-5 w-5 rounded-full bg-[#FF6600] text-xs font-bold leading-none text-white disabled:opacity-50"
												>
													+
												</button>
												<button
													type="button"
													onClick={removeExternalRow}
													disabled={!editable || stagingExternal.length === 0}
													className="h-5 w-5 rounded-full bg-slate-400 text-xs font-bold leading-none text-white disabled:opacity-50"
												>
													−
												</button>
												<strong className="ml-auto">Total</strong>
											</span>
										</td>
										<td className={`${cellBorder} text-right`}>
											<Box
												value={[...savedExternalRows, ...stagingExternal].reduce((acc, r) => acc + num(r.amount), 0)}
												readOnly
												className="w-[186px]"
											/>
										</td>
										<td className={cellBorder}>&nbsp;</td>
									</tr>
								</tbody>
							</table>
						</div>

						{editable && (
							<div className="mt-3 text-center">
								<button type="button" onClick={saveExternalAccounts} disabled={savingExternal} className={buttonClass}>
									{savingExternal ? "Saving…" : "Save"}
								</button>
							</div>
						)}
					</div>
				)}

				{disbursementType === "2" && (
					<div className="mt-4 overflow-x-auto">
						<table className="w-full border-collapse border border-[var(--app-border)]">
							<thead>
								<tr>
									<th className={`${headCell} w-[10%]`}>Disbursement to</th>
									<th className={`${headCell} w-[15%]`}>Contract Number</th>
									<th className={`${headCell} w-[15%]`}>Amount</th>
									<th className={`${headCell} w-[18%]`}>Purpose</th>
									<th className={`${headCell} w-[14%]`}>&nbsp;</th>
									<th className={`${headCell} w-[11%]`}>&nbsp;</th>
									<th className={`${headCell} w-[5%]`}>&nbsp;</th>
								</tr>
							</thead>
							<tbody>
								{internalAccounts.map((row, index) => (
									<tr key={`saved-cross-${row.id ?? index}`}>
										<td className={cellBorder}>COMPANY</td>
										<td className={cellBorder}>
											<input
												type="text"
												value={row.crossNo}
												maxLength={20}
												readOnly={!editable}
												onChange={(e) => updateSavedInternal(row.id, { crossNo: e.target.value.replace(/[^0-9]/g, "") })}
												onBlur={(e) => void validateContract(e.target.value)}
												className={`${boxClass} w-[173px] text-left`}
											/>
										</td>
										<td className={`${cellBorder} text-right`}>
											<Box
												value={row.amount}
												readOnly={!editable}
												onChange={(v) => updateSavedInternal(row.id, { amount: num(v) })}
												className="w-[186px]"
											/>
										</td>
										<td className={cellBorder}>
											<Dropdown
												value={row.purpose}
												onChange={(v) => updateSavedInternal(row.id, { purpose: v })}
												options={purposeOptions}
												disabled={!editable}
												className="w-[200px]"
											/>
										</td>
										<td className={cellBorder} colSpan={2}>&nbsp;</td>
										<td className={`${cellBorder} text-center`}>
											<input
												type="checkbox"
												checked={row.checked !== false}
												disabled={!editable}
												onChange={(e) => updateSavedInternal(row.id, { checked: e.target.checked })}
											/>
										</td>
									</tr>
								))}
								{stagingInternal.map((row, index) => (
									<tr key={`new-cross-${index}`}>
										<td className={cellBorder}>COMPANY</td>
										<td className={cellBorder}>
											<input
												type="text"
												value={row.crossNo}
												maxLength={20}
												onChange={(e) => updateStagingInternal(index, { crossNo: e.target.value.replace(/[^0-9]/g, "") })}
												onBlur={(e) => void validateContract(e.target.value)}
												className={`${boxClass} w-[173px] text-left`}
											/>
										</td>
										<td className={`${cellBorder} text-right`}>
											<Box
												value={row.amount}
												onChange={(v) => updateStagingInternal(index, { amount: num(v) })}
												className="w-[186px]"
											/>
										</td>
										<td className={cellBorder}>
											<Dropdown
												value={row.purpose}
												onChange={(v) => updateStagingInternal(index, { purpose: v })}
												options={purposeOptions}
												className="w-[200px]"
											/>
										</td>
										<td className={cellBorder} colSpan={2}>&nbsp;</td>
										<td className={`${cellBorder} text-center`}>
											<input
												type="checkbox"
												checked={row.checked !== false}
												onChange={(e) => updateStagingInternal(index, { checked: e.target.checked })}
											/>
										</td>
									</tr>
								))}
								<tr>
									<td className={`${cellBorder} text-right`} colSpan={2}>
										<span className="flex items-center gap-2">
											<button
												type="button"
												onClick={addInternalRow}
												disabled={!editable}
												className="h-5 w-5 rounded-full bg-[#FF6600] text-xs font-bold leading-none text-white disabled:opacity-50"
											>
												+
											</button>
											<button
												type="button"
												onClick={removeInternalRow}
												disabled={!editable || stagingInternal.length === 0}
												className="h-5 w-5 rounded-full bg-slate-400 text-xs font-bold leading-none text-white disabled:opacity-50"
											>
												−
											</button>
											<strong className="ml-auto">Total</strong>
										</span>
									</td>
									<td className={`${cellBorder} text-right`}>
										<Box
											value={[...internalAccounts, ...stagingInternal].reduce((acc, r) => acc + num(r.amount), 0)}
											readOnly
											className="w-[186px]"
										/>
									</td>
									<td className={cellBorder} colSpan={4}>&nbsp;</td>
								</tr>
							</tbody>
						</table>

						{editable && (
							<div className="mt-3 text-center">
								<button type="button" onClick={saveInternalAccounts} disabled={savingInternal} className={buttonClass}>
									{savingInternal ? "Saving…" : "Save"}
								</button>
							</div>
						)}
					</div>
				)}

				<div className="mt-6">
					<strong className="text-sm font-bold text-[var(--app-text)]">Internal Disbursement</strong>
					<div className="mt-2 overflow-x-auto">
						<table className="w-full border-collapse border border-[var(--app-border)]">
							<thead>
								<tr>
									<th className={`${headCell} w-[10%]`}>Disbursement to</th>
									<th className={`${headCell} w-[15%]`}>Contract Number</th>
									<th className={`${headCell} w-[15%]`}>Amount</th>
									<th className={`${headCell} w-[18%]`}>Purpose</th>
									<th className={`${headCell} w-[25%]`} colSpan={3}>&nbsp;</th>
									<th className={`${headCell} w-[19%]`}>Action</th>
								</tr>
							</thead>
							<tbody>
								{internalAccounts.map((row, index) => {
									const editing = row.id !== undefined && editInternalId === row.id && editInternalDraft !== null;
									return (
										<tr key={`int-${row.id ?? index}`}>
											<td className={cellBorder}>COMPANY</td>
											<td className={cellBorder}>
												{editing && editInternalDraft ? (
													<Box
														kind="text"
														value={editInternalDraft.crossNo}
														onChange={(v) => setEditInternalDraft((prev) => (prev ? { ...prev, crossNo: v.replace(/[^0-9]/g, "") } : prev))}
														align="left"
														maxLength={20}
														className="w-[173px]"
													/>
												) : row.crossNo}
											</td>
											<td className={`${cellBorder} text-right`}>
												{editing && editInternalDraft ? (
													<Box
														value={editInternalDraft.amount}
														onChange={(v) => setEditInternalDraft((prev) => (prev ? { ...prev, amount: num(v) } : prev))}
														className="w-[186px]"
													/>
												) : fmt(row.amount)}
											</td>
											<td className={cellBorder} colSpan={4}>
												{editing && editInternalDraft ? (
													<Dropdown
														value={editInternalDraft.purpose}
														onChange={(v) => setEditInternalDraft((prev) => (prev ? { ...prev, purpose: v } : prev))}
														options={purposeOptions}
														className="w-[200px]"
													/>
												) : (row.purposeLabel || row.purpose)}
											</td>
											<td className={`${cellBorder} text-center`}>
												{editable && (
													<span className="inline-flex justify-center gap-1">
														{editing ? (
															<>
																<button
																	type="button"
																	onClick={cancelEditInternal}
																	className={actionButton}
																>
																	Cancel
																</button>
																<button
																	type="button"
																	onClick={() => void saveEditInternal()}
																	disabled={savingRow}
																	className={actionButton}
																>
																	Save
																</button>
															</>
														) : (
															<>
																<button
																	type="button"
																	onClick={() => beginEditInternal(row)}
																	className={actionButton}
																>
																	Edit
																</button>
																<button
																	type="button"
																	onClick={() => void deleteInternalAccount(row)}
																	className={actionButton}
																>
																	Delete
																</button>
															</>
														)}
													</span>
												)}
											</td>
										</tr>
									);
								})}
								<tr>
									<td className={cellBorder} colSpan={2}><strong>Total</strong></td>
									<td className={`${cellBorder} text-right`}>
										<strong>{fmt(internalAccounts.reduce((acc, r) => acc + num(r.amount), 0))}</strong>
									</td>
									<td className={cellBorder} colSpan={5}>&nbsp;</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				<div className="mt-6">
					<strong className="text-sm font-bold text-[var(--app-text)]">External Disbursement</strong>
					<div className="mt-2 overflow-x-auto">
						<table className="w-full border-collapse border border-[var(--app-border)]">
							<thead>
								<tr>
									<th className={`${headCell} w-[10%]`}>Disbursement to</th>
									<th className={`${headCell} w-[15%]`}>Bank Name</th>
									<th className={`${headCell} w-[15%]`}>Bank Branch</th>
									<th className={`${headCell} w-[18%]`}>Account Name</th>
									<th className={`${headCell} w-[14%]`}>Account Number</th>
									<th className={`${headCell} w-[11%]`}>Amount</th>
									<th className={`${headCell} w-[19%]`}>Action</th>
								</tr>
							</thead>
							<tbody>
								{externalAccounts.map((row, index) => {
									const editing = row.id !== undefined && editExternalId === row.id && editExternalDraft !== null;
									const companyRow = row.split === "Company";
									return (
										<tr key={`ext-${row.id ?? index}`}>
											<td className={cellBorder}>{row.split}</td>
											<td className={cellBorder}>
												{editing && editExternalDraft ? (
													<Dropdown
														value={editExternalDraft.bank}
														onChange={(v) => setEditExternalDraft((prev) => (prev ? { ...prev, bank: v } : prev))}
														options={bankOptions}
														disabled={companyRow}
														className="w-[200px]"
													/>
												) : (row.bankLabel || row.bank)}
											</td>
											<td className={cellBorder}>
												{editing && editExternalDraft ? (
													<Box
														kind="text"
														value={editExternalDraft.bankBranch}
														onChange={(v) => setEditExternalDraft((prev) => (prev ? { ...prev, bankBranch: v } : prev))}
														align="left"
														maxLength={40}
														disabled={companyRow}
														className="w-[173px]"
													/>
												) : row.bankBranch}
											</td>
											<td className={cellBorder}>
												{editing && editExternalDraft ? (
													<Box
														kind="text"
														value={editExternalDraft.accName}
														onChange={(v) => setEditExternalDraft((prev) => (prev ? { ...prev, accName: v } : prev))}
														align="left"
														maxLength={50}
														disabled={companyRow}
														className="w-[186px]"
													/>
												) : row.accName}
											</td>
											<td className={cellBorder}>
												{editing && editExternalDraft ? (
													<Box
														kind="text"
														value={editExternalDraft.accNo}
														onChange={(v) => setEditExternalDraft((prev) => (prev ? { ...prev, accNo: v.replace(/[^0-9]/g, "") } : prev))}
														align="left"
														maxLength={30}
														disabled={companyRow}
														className="w-[133px]"
													/>
												) : row.accNo}
											</td>
											<td className={`${cellBorder} whitespace-nowrap text-right`}>
												{editing && editExternalDraft ? (
													<Box
														value={editExternalDraft.amount}
														onChange={(v) => setEditExternalDraft((prev) => (prev ? { ...prev, amount: num(v) } : prev))}
														className="w-[186px]"
													/>
												) : fmt(row.amount)}
											</td>
											<td className={`${cellBorder} text-center`}>
												{editable && (
													<span className="inline-flex justify-center gap-1">
														{editing ? (
															<>
																<button
																	type="button"
																	onClick={cancelEditExternal}
																	className={actionButton}
																>
																	Cancel
																</button>
																<button
																	type="button"
																	onClick={() => void saveEditExternal()}
																	disabled={savingRow}
																	className={actionButton}
																>
																	Save
																</button>
															</>
														) : (
															<>
																<button
																	type="button"
																	onClick={() => beginEditExternal(row)}
																	className={actionButton}
																>
																	Edit
																</button>
																<button
																	type="button"
																	onClick={() => void deleteExternalAccount(row)}
																	className={actionButton}
																>
																	Delete
																</button>
															</>
														)}
													</span>
												)}
											</td>
										</tr>
									);
								})}
								<tr>
									<td className={`${cellBorder} text-right`} colSpan={5}><strong>Total</strong></td>
									<td className={`${cellBorder} text-right`}>
										<strong>{fmt(externalAccounts.reduce((acc, r) => acc + num(r.amount), 0))}</strong>
									</td>
									<td className={cellBorder}>&nbsp;</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				{saving && <p className="mt-3 text-right text-sm text-[var(--app-muted)]">Please wait…</p>}

				{locked && lockMessage && (
					<div className="message mt-3">
						<p className="text-sm text-red-600">{lockMessage}</p>
					</div>
				)}
			</div>
		</div>
	);
});

export default CAMFinancingDisbursementPage;
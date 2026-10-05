import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import api from '@/shared/api/axiosInstance';
import CAMFinancingSubsidyPanel from "./CAMFinancingSubsidyPanel";

export interface CamTabHandle {
	save: () => void;
}

export interface CAMFinancingPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	purpoffinc: string;
	contType: string;
	newCar: string;
	onSaved: (result: { apless: string; applno: string }) => void;
	onHome?: () => void;
}

type Form = Record<string, any>;

interface LookupOption {
	value: string;
	label: string;
}

interface SubsidySums {
	dp: number;
	installment: number;
	insurance: number;
	survey: number;
	provision: number;
	interest: number;
	surveyFee2: number;
}

interface FinancingData {
	apless: string;
	applno: string;
	finType: string;
	newCar: string;
	hasData: boolean;
	cleared: boolean;
	accountBlocked: boolean;
	accountBlockMessage: string;
	npwp: string;
	contract: {
		contType: string;
		contTypeName: string;
		consLeas: string;
		purpoffinc: string;
		purpoffincDesc: string;
	};
	form: Form;
	flags: {
		restricted: boolean;
		surveyFee2Locked: boolean;
		surveyFee2LockReason: string;
		surveyFee2: string;
		lesseeType: string;
		nationality: string;
		ageYears: number;
		ageMonths: number;
		ageDays: number;
		daysPast55: number;
		totalOutsBefore: number;
		notaryEditable: boolean;
	};
	dpMinimum: {
		downPayment: string;
		freeBaseRate: boolean;
		investasi: number | null;
		multiguna: number | null;
		asOfDate: string;
		npf: string;
		notif: string;
	};
	income: {
		grossPremium: number;
		netCommission: number;
		insuranceIncome: number;
		percentage: number;
		subsidy: SubsidySums;
	};
	outstanding: { totalFDana: number; totalFModal: number };
	lookups: {
		contractStatuses: LookupOption[];
		currencies: LookupOption[];
		paymentMethods: LookupOption[];
		amortizationTypes: LookupOption[];
		disbursementTypes: LookupOption[];
		// agencyNames: string[];
	};
}

interface ChainResult {
	form: Form;
	messages: string[];
	reset: boolean;
}

interface Ctx {
	purpose: string;
	restricted: boolean;
	ageYears: number;
	ageMonths: number;
	ageDays: number;
	daysPast55: number;
	outs: number;
	sums: SubsidySums;
}

const EMPTY_SUMS: SubsidySums = { dp: 0, installment: 0, insurance: 0, survey: 0, provision: 0, interest: 0, surveyFee2: 0 };
const CIGNA_RATES: Record<number, number> = { 1: 0.005, 2: 0.007, 3: 0.0093, 4: 0.012, 5: 0.014 };
const GUARANTEED_LIMIT = 300_000_000;
const MID_LIMIT = 1_000_000_000;
const HIGH_LIMIT = 1_500_000_000;
const FD_LIMIT = 500_000_000;
const FMU_LIMIT = 10_000_000_000;

const PAID_BY_MLCI: [string, string][] = [
	["Transfer", "Transfer"],
	["Deduct from disbursement", "Deduct from disbursement"],
	["Loan", "Loan"],
];
const PAID_BY_DEALER: [string, string][] = [["paid to Dealer", "Paid to Dealer"]];

const num = (value: any): number => {
	if (value === null || value === undefined) return 0;
	const parsed = parseFloat(String(value).replace(/,/g, ""));
	return Number.isFinite(parsed) ? parsed : 0;
};

const isBlank = (value: any) => value === null || value === undefined || String(value).trim() === "";

const phpEmpty = (value: any) => isBlank(value) || String(value).trim() === "0" || num(value) === 0;

const normalize = (value: any) => String(value ?? "").replace(/,/g, "").trim();

const fmt = (value: any) => Math.round(num(value)).toLocaleString("en-US");

const isFinanceLease = (finType: string) => finType === "S" || finType === "F";

const survey2Active = (f: Form) => f.surveyFee2 === "1" && !f.surveyLocked;

const totalNetFinance = (f: Form) =>
	num(f.lAmount) - num(f.security) + num(f.creditAmt) + num(f.otherLoan) + num(f.bbn?.bbnLoan) + num(f.provisionLoan);

const totalNetFinance2 = (f: Form) => totalNetFinance(f) + (survey2Active(f) ? num(f.surveyLoan2) : 0);

const cignaRate = (f: Form) => {
	const tenor = f.lType === "4" ? num(f.tenor1000) : num(f.tenor);
	return CIGNA_RATES[Math.ceil(tenor / 12)] ?? 0;
};

const zeroSurvey2 = (f: Form): Form => ({
	...f,
	surveyFee2: "0",
	survInc2: 0,
	baseSurv2: 0,
	surveyLoan2: 0,
	creditProtection: 0,
	guaranteed: "0",
	eligibleMode: "exc",
});

const lockSurvey2 = (f: Form): Form => ({ ...zeroSurvey2(f), surveyLocked: true });

const resetRates = (f: Form): Form => {
	const next: Form = {
		...f,
		flatRate: 0,
		declRate: 0,
		mlciFlat: 0,
		mlciDecl: 0,
		mlciRent: 0,
		declRateFull: "",
		mlciDeclFull: "",
	};
	if (f.lType !== "3") {
		next.rental = 0;
	} else {
		next.steps = (f.steps || []).map(() => ({ month: 0, rental: 0, base: 0 }));
	}
	return next;
};

const resetFinancing = (f: Form): Form => ({
	...resetRates(f),
	otherLoan: 0,
	security: 0,
	securityPersen: 0,
	creditAmt: 0,
	provisionLoan: 0,
	ltvDirty: true,
});

const recalcSurvey2 = (f: Form, ctx: Ctx): { form: Form; error?: string } => {
	if (!survey2Active(f)) return { form: f };
	const rate = cignaRate(f);
	const tot = totalNetFinance(f);
	const survInc2 = Math.ceil(rate * tot);
	const creditProtection = Math.ceil(rate * (tot + num(f.surveyLoan2)));
	const next: Form = { ...f, survInc2, creditProtection, eligibleMode: "exc" };
	if (creditProtection < survInc2) {
		return { form: { ...next, survInc2: 0 }, error: "Survey Fee 2 can't less than Credit Protection" };
	}
	const baseSurv2 = Math.round(0.8 * (survInc2 + ctx.sums.surveyFee2));
	return { form: { ...next, baseSurv2, baseSurv2Default: baseSurv2 } };
};

const evaluateSurvey2 = (f: Form, ctx: Ctx): "lock" | "unlock" | "none" => {
	if (ctx.restricted) return "none";
	const total = totalNetFinance2(f) + ctx.outs;
	const tenor = f.lType === "4" ? num(f.tenor1000) : num(f.tenor);
	const totalMonths = ctx.ageYears * 12 + tenor + ctx.ageMonths;
	if (ctx.purpose === "4" || ctx.purpose === "5") {
		if ((totalMonths === 780 && ctx.ageDays > 0) || totalMonths > 780) return "lock";
		return total > MID_LIMIT ? "lock" : "unlock";
	}
	if (ctx.purpose === "3") {
		if (ctx.daysPast55 > 0) return "lock";
		return total > HIGH_LIMIT ? "lock" : "unlock";
	}
	return "none";
};

const runTotals = (input: Form, ctx: Ctx): ChainResult => {
	const recalculated = recalcSurvey2(input, ctx);
	let form: Form = { ...recalculated.form, ltvDirty: true };
	if (recalculated.error) return { form, messages: [recalculated.error], reset: false };
	const action = evaluateSurvey2(form, ctx);
	if (action === "lock") {
		const wasLocked = !!form.surveyLocked;
		form = lockSurvey2(form);
		return wasLocked
			? { form, messages: [], reset: false }
			: { form, messages: ["Please ReCalculate Financing"], reset: true };
	}
	if (action === "unlock") form = { ...form, surveyLocked: false };
	return { form, messages: [], reset: false };
};

const bbnLoanReadOnly = (via?: string, paidBy?: string) => {
	if (via === "Dealer" && paidBy === "Loan") return false;
	if (via === "MLCI" || via === "Dealer") return true;
	return paidBy === "Deduct from disbursement" || paidBy === "paid to Dealer";
};

type BoxKind = "money" | "int" | "rate" | "text";

const sanitize = (kind: BoxKind, raw: string, decimals?: number) => {
	if (kind === "money" || kind === "int") return raw.replace(/[^0-9]/g, "");
	if (kind === "rate") {
		const cleaned = raw.replace(/[^0-9.]/g, "");
		const dot = cleaned.indexOf(".");
		if (dot < 0) return cleaned;
		const head = cleaned.slice(0, dot + 1);
		let tail = cleaned.slice(dot + 1).replace(/\./g, "");
		if (decimals !== undefined) tail = tail.slice(0, decimals);
		return head + tail;
	}
	return raw;
};

const boxClass =
	"h-7 rounded border border-[var(--app-border)] bg-[var(--app-card)] px-1.5 text-sm text-[var(--app-text)] " +
	"read-only:bg-[var(--app-surface)] read-only:text-[var(--app-muted)] disabled:cursor-not-allowed disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)] disabled:opacity-70";

function Box({
	kind = "text",
	value,
	onChange,
	onCommit,
	onKeyDown,
	readOnly,
	disabled,
	decimals,
	maxLength,
	align = "right",
	className = "",
}: {
	kind?: BoxKind;
	value: any;
	onChange?: (value: string) => void;
	onCommit?: () => void;
	onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
	readOnly?: boolean;
	disabled?: boolean;
	decimals?: number;
	maxLength?: number;
	align?: "left" | "right";
	className?: string;
}) {
	const [draft, setDraft] = useState<string | null>(null);
	const startRef = useRef("");
	const editable = !readOnly && !disabled;
	const raw = value === null || value === undefined ? "" : String(value);
	const shown = kind === "money" ? (draft ?? (isBlank(raw) ? "" : fmt(raw))) : raw;
	return (
		<input
			type="text"
			inputMode={kind === "money" || kind === "int" ? "numeric" : kind === "rate" ? "decimal" : undefined}
			value={shown}
			readOnly={readOnly}
			disabled={disabled}
			maxLength={maxLength}
			onFocus={() => {
				if (!editable) return;
				if (kind === "money") {
					const start = isBlank(raw) ? "" : String(Math.round(num(raw)));
					startRef.current = start;
					setDraft(start);
				} else {
					startRef.current = normalize(raw);
				}
			}}
			onChange={(e) => {
				if (!editable) return;
				const next = sanitize(kind, e.target.value, decimals);
				if (kind === "money") setDraft(next);
				onChange?.(next);
			}}
			onBlur={(e) => {
				if (!editable) return;
				const current = kind === "money" ? normalize(draft) : normalize(e.target.value);
				if (kind === "money") setDraft(null);
				if (current !== startRef.current) onCommit?.();
			}}
			onKeyDown={onKeyDown}
			className={`${boxClass} ${align === "right" ? "text-right" : "text-left"} ${className}`}
		/>
	);
}

function Choice({
	name,
	value,
	options,
	onChange,
	disabled,
	gap = "gap-x-4",
}: {
	name: string;
	value: string;
	options: [string, string][];
	onChange: (value: string) => void;
	disabled?: boolean;
	gap?: string;
}) {
	return (
		<span className={`inline-flex flex-wrap items-center ${gap} gap-y-1 text-sm text-[var(--app-text)]`}>
			{options.map(([val, label]) => (
				<label key={val} className={`inline-flex items-center gap-1 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
					<input
						type="radio"
						name={name}
						value={val}
						checked={value === val}
						disabled={disabled}
						onChange={() => onChange(val)}
					/>
					{label}
				</label>
			))}
		</span>
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
			className={`${boxClass} ${className}`}
		>
			<option value="">Select</option>
			{options.map((o) => (
				<option key={o.value} value={o.value}>{o.label}</option>
			))}
		</select>
	);
}

function Line({ label, children, labelClass = "" }: { label?: ReactNode; children?: ReactNode; labelClass?: string }) {
	return (
		<tr>
			<td className={`w-[34%] py-[3px] pr-2 align-middle text-sm text-[var(--app-text)] ${labelClass}`}>{label}</td>
			<td className="py-[3px] align-middle">{children}</td>
		</tr>
	);
}

const unit = "ml-1 text-sm text-[var(--app-text)]";
const headCell = "border border-black bg-[#0066FF] px-1 py-1 text-center text-xs font-bold text-white";
const labelCell = "border border-[var(--app-border)] px-1.5 py-1 text-sm text-[var(--app-text)]";
const valueCell = "border border-[var(--app-border)] px-1 py-1 text-right";
const greyCell = "border border-[var(--app-border)] bg-[#666666]";
const cellBox = "w-[90px]";

const CAMFinancingPage = forwardRef<CamTabHandle, CAMFinancingPageProps>(function CAMFinancingPage({
	apless: aplessProp,
	applNo: applNoProp,
	finType: finTypeProp,
	custName,
	purpoffinc: purpoffincProp,
	contType: contTypeProp,
	newCar: newCarProp,
	onSaved,
	onHome,
}, ref) {
	const apless = String(aplessProp ?? "").trim();
	const applNo = String(applNoProp ?? "").trim();
	const finType = String(finTypeProp ?? "").trim();
	const purpoffinc = String(purpoffincProp ?? "").trim();
	const contType = String(contTypeProp ?? "").trim();
	const newCarGiven = String(newCarProp ?? "").trim();
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [data, setData] = useState<FinancingData | null>(null);
	const [form, setForm] = useState<Form>({});
	const [sums, setSums] = useState<SubsidySums>(EMPTY_SUMS);
	const [messages, setMessages] = useState<{ type: "success" | "error"; lines: string[] } | null>(null);
	const [calculating, setCalculating] = useState(false);
	const [saving, setSaving] = useState(false);
	const [showSubsidyPanel, setShowSubsidyPanel] = useState(false);
	const [showCross, setShowCross] = useState(false);

	const formRef = useRef<Form>({});
	const onHomeRef = useRef(onHome);
	onHomeRef.current = onHome;
	const onSavedRef = useRef(onSaved);
	onSavedRef.current = onSaved;
	const sumsRef = useRef<SubsidySums>(EMPTY_SUMS);
	const dataRef = useRef<FinancingData | null>(null);
	const blockedRef = useRef(false);

	const newCar = newCarGiven || data?.newCar || "";
	const financeLease = isFinanceLease(finType);
	const flNewCar = newCar === "1" && financeLease;

	const commit = useCallback((next: Form) => {
		formRef.current = next;
		setForm(next);
	}, []);

	const applySums = useCallback((next: SubsidySums) => {
		sumsRef.current = next;
		setSums(next);
	}, []);

	const showError = useCallback((lines: string[]) => {
		setMessages(lines.length ? { type: "error", lines } : null);
	}, []);

	const setField = (key: string, value: any) => commit({ ...formRef.current, [key]: value });
	const setBbn = (patch: Form) => commit({ ...formRef.current, bbn: { ...formRef.current.bbn, ...patch } });

	const ctx = (): Ctx => {
		const d = dataRef.current;
		return {
			purpose: purpoffinc,
			restricted: !!d?.flags.restricted,
			ageYears: d?.flags.ageYears ?? 0,
			ageMonths: d?.flags.ageMonths ?? 0,
			ageDays: d?.flags.ageDays ?? 0,
			daysPast55: d?.flags.daysPast55 ?? 0,
			outs: d?.flags.totalOutsBefore ?? 0,
			sums: sumsRef.current,
		};
	};

	const contTypeCode = (data?.contract.contType || contType || "").trim();
	const isRestructuring = contTypeCode.slice(0, 2) === "RS";
	const disbForced: string | null = contTypeCode === "NEW"
		? (["S", "M", "D"].includes(finType) ? null : "N")
		: isRestructuring
			? "C"
			: null;

	const resetSurvey2Subsidy = useCallback(async () => {
		try {
			const res = await api.post("/CAM/EditIndex/fin-financing/subsidies/reset-survey-fee2", { applno: applNo });
			if (res.data?.sums) applySums(res.data.sums);
		} catch {
			showError(["Failed to reset Survey Fee 2 subsidy."]);
		}
	}, [applNo, applySums, showError]);

	const apply = (result: ChainResult) => {
		commit(result.form);
		showError(result.messages);
		if (result.reset) void resetSurvey2Subsidy();
	};

	const buildInitialForm = useCallback((res: FinancingData): Form => {
		const resNewCar = newCarGiven || res.newCar || "";
		const locked = res.flags.surveyFee2Locked || (resNewCar === "1" && isFinanceLease(finType));
		let f: Form = {
			...res.form,
			bbn: { ...res.form.bbn },
			steps: (res.form.steps || []).map((s: Form) => ({ ...s })),
			surveyFee2: locked ? "0" : res.flags.surveyFee2,
			surveyLocked: locked,
			eligibleMode: "fixed",
			ltvDirty: false,
			stepLastReadonly: false,
			disbTouched: false,
		};
		if (f.surveyFee2 !== "1") {
			f = { ...f, survInc2: 0, baseSurv2: 0, surveyLoan2: 0 };
		}
		const resContType = (res.contract.contType || contType || "").trim();
		if (resContType === "NEW" && !["S", "M", "D"].includes(finType)) f.disbType = "N";
		if (resContType.slice(0, 2) === "RS") f.disbType = "C";
		return f;
	}, [contType, finType, newCarGiven]);

	const load = useCallback(async () => {
		setLoading(true);
		setLoadError("");
		setMessages(null);
		try {
			const res = await api.get("/CAM/EditIndex/fin-financing", {
				params: { apless, applno: applNo, finType, contType, purpoffinc },
			});
			const payload: FinancingData = res.data;
			dataRef.current = payload;
			blockedRef.current = !!payload.accountBlocked;
			setData(payload);
			applySums(payload.income.subsidy);
			commit(buildInitialForm(payload));
			setShowCross(false);
		} catch (err: any) {
			if (err?.response?.status === 409 && err?.response?.data?.blocked) {
				const text = err.response.data.message || "The Application is on approval process or has finished. The Data cannot be changed";
				setLoadError(text);
				window.alert(text);
				onHomeRef.current?.();
			} else {
				setLoadError(err?.response?.data?.error || "Failed to load Financing data. Please try again.");
			}
		} finally {
			setLoading(false);
		}
	}, [apless, applNo, finType, contType, purpoffinc, applySums, commit, buildInitialForm]);

	useEffect(() => {
		load();
	}, [load]);

	const dpViolation = (pct: number): string | null => {
		const dp = dataRef.current?.dpMinimum;
		if (!dp) return null;
		if (dp.downPayment === "" && purpoffinc === "4" && pct < 5) return `${dp.notif}5%`;
		if (purpoffinc === "3" && dp.investasi !== null && pct < dp.investasi) return `${dp.notif}${dp.investasi}%`;
		if (purpoffinc === "5" && dp.multiguna !== null && pct < dp.multiguna) return `${dp.notif}${dp.multiguna}%`;
		return null;
	};

	const handleStatusChange = (value: string) => setField("contSts", value);

	const handleDisbTypeChange = (value: string) => {
		commit({ ...formRef.current, disbType: value, disbTouched: true });
		setShowCross(value === "C");
	};

	const handleAdvArrChange = (value: string) => commit(resetFinancing({ ...formRef.current, advArr: value }));

	const handleAssetCommit = () => commit(resetFinancing(formRef.current));

	const handleTenorCommit = () => apply(runTotals(formRef.current, ctx()));

	const handleGracePeriodCommit = () => {
		const f = formRef.current;
		if (num(f.gPeriod) === 0) commit({ ...f, gIntRate: 0, gIntAmt: 0 });
	};

	const handleSecurityCommit = () => {
		const f0 = resetRates(formRef.current);
		const lAmount = num(f0.lAmount);
		if (!lAmount) {
			commit({ ...f0, ltvDirty: true });
			return;
		}
		const pct = Number(((num(f0.security) * 100) / lAmount).toFixed(2));
		const violation = dpViolation(pct);
		if (violation) {
			commit({ ...f0, security: "", securityPersen: "", ltvDirty: true });
			showError([violation]);
			return;
		}
		apply(runTotals({ ...f0, securityPersen: pct }, ctx()));
	};

	const handleSecurityPercentCommit = () => {
		const f0 = resetRates(formRef.current);
		const pct = parseFloat(String(f0.securityPersen ?? "").replace(",", "."));
		if (!Number.isFinite(pct)) {
			commit({ ...f0, securityPersen: "", ltvDirty: true });
			return;
		}
		const violation = dpViolation(pct);
		if (violation) {
			commit({ ...f0, securityPersen: "", ltvDirty: true });
			showError([violation]);
			return;
		}
		const pctFixed = Number(pct.toFixed(2));
		const security = Math.round((pctFixed / 100) * num(f0.lAmount));
		apply(runTotals({ ...f0, securityPersen: pctFixed, security }, ctx()));
	};

	const handleLoanCommit = () => apply(runTotals(resetRates(formRef.current), ctx()));

	const handleOtherLoanCommit = () => {
		let f0 = resetRates(formRef.current);
		const other = num(f0.otherLoan);
		const survInc = num(f0.survInc);
		const lines: string[] = [];
		if (other !== 0 && survInc !== 0 && other > survInc) {
			lines.push("Otherloan not permited");
			f0 = { ...f0, otherLoan: 0 };
		}
		const result = runTotals(f0, ctx());
		apply({ ...result, messages: [...lines, ...result.messages] });
	};

	const handleSurveyLoan2Commit = () => {
		const c = ctx();
		let f: Form = { ...formRef.current, ltvDirty: true };
		const loan2 = num(f.surveyLoan2);
		const inc2 = num(f.survInc2);

		if (loan2 > inc2) {
			const result = runTotals({ ...f, surveyLoan2: 0, creditProtection: 0 }, c);
			apply({ ...result, form: resetRates(result.form), messages: ["Can't more than Survey Fee 2", ...result.messages] });
			return;
		}

		const withOuts = totalNetFinance2(f) + c.outs;
		const turnOff = (form: Form) => {
			const result = runTotals(zeroSurvey2(form), c);
			apply({ ...result, form: resetRates(result.form), reset: true });
		};

		if (withOuts > HIGH_LIMIT) {
			turnOff(f);
			return;
		}

		if (survey2Active(f)) {
			const creditProtection = Math.ceil(cignaRate(f) * (totalNetFinance(f) + loan2));
			f = { ...f, creditProtection };
			if (((purpoffinc === "4" || purpoffinc === "5") && withOuts > MID_LIMIT) || (purpoffinc === "3" && withOuts > HIGH_LIMIT)) {
				turnOff(f);
				return;
			}
			if (inc2 < creditProtection) {
				commit(resetRates({ ...f, survInc2: 0 }));
				showError(["Survey Fee 2 can't less than Credit Protection"]);
				return;
			}
		}

		const lines: string[] = [];
		const tot2 = totalNetFinance2(f);
		const outstanding = dataRef.current?.outstanding;
		if (finType === "D" && (outstanding?.totalFDana ?? 0) + tot2 > FD_LIMIT) {
			lines.push("CAM cannot be processed because 'Grand Total Customer's Outstanding Contract & CAM Net Finance for Fund Facility (FF)' > Rp. 500.000.000");
		} else if (finType === "M" && (outstanding?.totalFModal ?? 0) + tot2 > FMU_LIMIT) {
			lines.push("CAM cannot be processed because 'Grand Total Customer's Outstanding Fund Facility and Business Capital Facility' > Rp 10.000.000.000,-");
		}
		commit(resetRates(f));
		showError(lines);
	};

	const handleSurveyFee2Change = (value: string) => {
		const f = formRef.current;
		if (value === "1") {
			apply(runTotals({ ...f, surveyFee2: "1" }, ctx()));
			return;
		}
		const result = runTotals(zeroSurvey2(f), ctx());
		apply({ ...result, reset: true });
	};

	const handleAmortizationChange = (value: string) => {
		commit({ ...formRef.current, lType: value, noStep: "", steps: [], stepLastReadonly: false });
	};

	const rateCommit = (
		key: string,
		zeroKeys: string[],
		zeroCheck: (lType: string) => boolean,
		zeroMessage: string,
		fullKey: string,
	) => () => {
		let f: Form = { ...formRef.current, [fullKey]: "" };
		zeroKeys.forEach((k) => {
			f[k] = 0;
		});
		const raw = String(f[key] ?? "").trim();
		if (raw === "") {
			f[key] = 0;
		} else if (raw === "0" && zeroCheck(f.lType)) {
			f[key] = "";
			showError([zeroMessage]);
		}
		if (key === "declRate" && f.lType === "3" && (f.steps || []).length) {
			const last = f.steps.length - 1;
			f = {
				...f,
				stepLastReadonly: !phpEmpty(f.declRate),
				steps: f.steps.map((_: Form, i: number) => ({
					month: i === last ? num(f.tenor) : 0,
					rental: 0,
					base: 0,
				})),
			};
		}
		commit(f);
	};

	const handleFlatCommit = rateCommit("flatRate", ["declRate", "rental"], (t) => t === "0", "The Flat Rate cannot be 0", "declRateFull");
	const handleMlciFlatCommit = rateCommit("mlciFlat", ["mlciDecl", "mlciRent"], (t) => t !== "1", "The MLCI Flat Rate cannot be 0", "mlciDeclFull");
	const handleDeclCommit = rateCommit("declRate", ["flatRate", "rental"], (t) => t !== "1", "The effective Rate cannot be 0", "declRateFull");
	const handleMlciDeclCommit = rateCommit("mlciDecl", ["mlciFlat", "mlciRent"], (t) => t !== "1", "The MLCI effective Rate cannot be 0", "mlciDeclFull");
	const handleRentalCommit = () => commit({ ...formRef.current, declRate: 0, flatRate: 0, declRateFull: "" });
	const handleMlciRentCommit = () => commit({ ...formRef.current, mlciDecl: 0, mlciFlat: 0, mlciDeclFull: "" });

	const fetchLastStep = async (f: Form, months: number[], rentals: number[]) => {
		const res = await api.post("/CAM/EditIndex/fin-financing/step-rental-last-payment", {
			months,
			rentals,
			totalNetFinance: totalNetFinance(f),
			declRate: f.declRate,
			mlciDecl: f.mlciDecl,
			advArr: f.advArr,
			currCode: f.currCode,
			payCycle: f.payCycle,
		});
		return res.data as { lastStepSellingRental: number | null; lastStepBaseRental: number | null };
	};

	const recalcLastStep = async (f: Form) => {
		const steps: Form[] = f.steps || [];
		if (!steps.length) return;
		try {
			const result = await fetchLastStep(f, steps.map((s) => num(s.month)), steps.map((s) => num(s.rental)));
			const current = formRef.current;
			const last = (current.steps || []).length - 1;
			if (last < 0) return;
			commit({
				...current,
				steps: current.steps.map((s: Form, i: number) =>
					i === last
						? { ...s, rental: result.lastStepSellingRental ?? "", base: result.lastStepBaseRental ?? "" }
						: s,
				),
			});
		} catch (err: any) {
			showError([err?.response?.data?.error || "Failed to calculate the last step rental."]);
		}
	};

	const handleGo = async () => {
		const f = formRef.current;
		const count = parseInt(String(f.noStep ?? ""), 10);
		const tenor = num(f.tenor);
		if (Number.isFinite(count) && count > tenor) {
			commit({ ...f, noStep: 0, steps: [], stepLastReadonly: false });
			showError(["No. Step must not exceed Tenor"]);
			return;
		}
		if (!Number.isFinite(count) || count <= 0) {
			commit({ ...f, steps: [], stepLastReadonly: false });
			return;
		}
		const steps = Array.from({ length: count }, (_, i) => ({ month: i === count - 1 ? tenor : 0, rental: 0, base: 0 }));
		const declGiven = !phpEmpty(f.declRate);
		const mlciGiven = !phpEmpty(f.mlciDecl);
		const next: Form = { ...f, steps, stepLastReadonly: declGiven };
		commit(next);
		showError([]);
		if (!declGiven && !mlciGiven) return;
		try {
			const result = await fetchLastStep(next, steps.map((s) => s.month), steps.map((s) => s.rental));
			const current = formRef.current;
			const last = (current.steps || []).length - 1;
			if (last < 0) return;
			commit({
				...current,
				steps: current.steps.map((s: Form, i: number) => {
					if (i !== last) return s;
					return {
						...s,
						rental: declGiven ? result.lastStepSellingRental ?? "" : s.rental,
						base: mlciGiven ? result.lastStepBaseRental ?? "" : s.base,
					};
				}),
			});
		} catch (err: any) {
			showError([err?.response?.data?.error || "Failed to calculate the last step rental."]);
		}
	};

	const setStep = (index: number, patch: Form) => {
		const f = formRef.current;
		commit({ ...f, steps: f.steps.map((s: Form, i: number) => (i === index ? { ...s, ...patch } : s)) });
	};

	const handleStepMonthCommit = (index: number) => () => {
		const f = formRef.current;
		const steps: Form[] = f.steps.map((s: Form) => ({ ...s }));
		const last = steps.length - 1;
		const tenor = num(f.tenor);
		const lines: string[] = [];
		let others = steps.slice(0, last).reduce((acc, s) => acc + num(s.month), 0);
		if (others > tenor) {
			lines.push("Total month step rental must not exceed tenor");
			steps[index].month = 0;
			others = steps.slice(0, last).reduce((acc, s) => acc + num(s.month), 0);
		}
		steps[last].month = tenor - others;
		const next = { ...f, steps };
		commit(next);
		showError(lines);
		void recalcLastStep(next);
	};

	const handleStepRentalCommit = (index: number) => () => {
		const f = formRef.current;
		const steps = f.steps.map((s: Form, i: number) => (i === index ? { ...s, base: s.rental } : s));
		const next = { ...f, steps };
		commit(next);
		void recalcLastStep(next);
	};

	const handleBbnViaChange = (via: string) => {
		const f = formRef.current;
		const allowed = (via === "MLCI" ? PAID_BY_MLCI : PAID_BY_DEALER).map(([v]) => v);
		const paidBy = allowed.includes(f.bbn?.paidBy) ? f.bbn.paidBy : "";
		commit({ ...f, bbn: { ...f.bbn, via, paidBy, bbnFee: 0, agencyFeeGross: 0, bbnLoan: 0 } });
	};

	const handlePaidByChange = (paidBy: string) => {
		const f = formRef.current;
		const via = f.bbn?.via;
		const sa = num(f.bbn?.agencyFeeGross);
		const fee = num(f.bbn?.bbnFee);
		let bbn: Form = { ...f.bbn, paidBy };
		if (via === "MLCI" && paidBy === "Loan") {
			bbn = { ...bbn, bbnLoan: sa + fee };
		} else {
			bbn = { ...bbn, bbnFee: 0, agencyName: "", agencyFeeNet: 0, agencyFeeGross: 0, bbnLoan: 0 };
		}
		commit({ ...f, bbn });
	};

	const bbnTextbox = (f: Form): Form => {
		const via = f.bbn?.via;
		const paidBy = f.bbn?.paidBy;
		const sa = num(f.bbn?.agencyFeeGross);
		const fee = num(f.bbn?.bbnFee);
		let bbn: Form = { ...f.bbn, agencyFeeNet: sa };
		if (via === "MLCI" && paidBy === "Loan") {
			bbn = { ...bbn, bbnLoan: sa + fee };
		} else if (via === "Dealer" && (paidBy === "Loan" || paidBy === "paid to Dealer")) {
			bbn = { ...bbn, bbnFee: 0, agencyFeeGross: "" };
		}
		return { ...f, bbn };
	};

	const handleAgencyFeeGrossCommit = () => commit(bbnTextbox(formRef.current));

	const handleBbnFeeCommit = () => {
		const result = runTotals(bbnTextbox(formRef.current), ctx());
		apply({ ...result, form: resetRates(result.form) });
	};

	const handleAgencyNameChange = async (agent: string) => {
		setBbn({ agencyName: agent });
		try {
			const res = await api.get("/CAM/EditIndex/fin-financing/agency-fee", { params: { agent } });
			const fee = num(res.data?.fee);
			const f = formRef.current;
			const via = f.bbn?.via;
			const paidBy = f.bbn?.paidBy;
			const bbn: Form = { ...f.bbn, agencyName: agent, agencyFeeGross: fee, agencyFeeNet: fee };
			if (!(via === "MLCI" && (paidBy === "Transfer" || paidBy === "Deduct from disbursement"))) {
				bbn.bbnLoan = fee + num(f.bbn?.bbnFee);
			}
			commit({ ...f, bbn });
		} catch {
			showError(["Failed to load Agency Fee."]);
		}
	};

	const handleSurvIncCommit = () => {
		const f = formRef.current;
		const other = num(f.otherLoan);
		const survInc = num(f.survInc);
		if (other !== 0 && survInc !== 0 && other > survInc) {
			commit({ ...f, survInc: 0, eligibleMode: "exc" });
			showError(["Otherloan not permited"]);
			return;
		}
		commit({ ...f, eligibleMode: "exc" });
	};

	const handleSurvInc2Commit = () => {
		const f = formRef.current;
		const inc2 = num(f.survInc2);
		const cp = num(f.creditProtection);
		if (inc2 !== 0 && cp !== 0 && inc2 < cp) {
			commit({ ...f, survInc2: 0, eligibleMode: "exc" });
			showError(["Survey Fee 2 can't less than credit protection"]);
			return;
		}
		commit({ ...f, eligibleMode: "exc" });
	};

	const handleBaseSurvCommit = () => {
		const f = formRef.current;
		const d = dataRef.current;
		if (!d?.dpMinimum.freeBaseRate && (newCar === "1" || newCar === "2") && finType !== "W" && num(f.baseSurv) < 1500000) {
			commit({ ...f, baseSurv: 1500000 });
			showError(["Minimum Survey Fee is 1,500,000"]);
			return;
		}
		commit({ ...f, eligibleMode: "exc" });
	};

	const handleBaseSurv2Commit = () => {
		const f = formRef.current;
		const base2 = num(f.baseSurv2);
		const ttl2 = num(f.survInc2) + sumsRef.current.surveyFee2;
		const fail = (message: string, patch: Form) => {
			const result = runTotals({ ...f, ...patch }, ctx());
			apply({ ...result, messages: [message, ...result.messages] });
		};
		if (base2 < num(f.baseSurv2Default)) {
			fail("Can't less than default value", { baseSurv2: 0 });
			return;
		}
		if (base2 > ttl2) {
			fail("Can't more than total survey 2", { baseSurv2: 0, creditProtection: 0 });
			return;
		}
		if (base2 === 0 && ttl2 === 0) {
			fail("Can't less than default value", {});
			return;
		}
		commit({ ...f, eligibleMode: "exc" });
	};

	const handleProvIncCommit = () => commit({ ...formRef.current, eligibleMode: "exc" });

	const refreshSubsidy = useCallback(async () => {
		try {
			const res = await api.get("/CAM/EditIndex/fin-financing/income-summary", { params: { applno: applNo } });
			const next: SubsidySums = res.data.subsidy;
			applySums(next);
			const f = formRef.current;
			const baseSurv2 = survey2Active(f) ? Math.round(0.8 * (num(f.survInc2) + next.surveyFee2)) : 0;
			commit({ ...f, baseSurv2, eligibleMode: "exc" });
		} catch {
			showError(["Failed to refresh subsidy totals."]);
		}
	}, [applNo, applySums, commit, showError]);

	const derived = useMemo(() => {
		const f = form;
		const active = survey2Active(f);
		const netFinance = num(f.lAmount) - num(f.security);
		const tot = totalNetFinance(f);
		const tot2 = totalNetFinance2(f);
		const outs = data?.flags.totalOutsBefore ?? 0;
		const lAmount = num(f.lAmount);
		const loanToValue = f.ltvDirty ? (lAmount ? (tot2 / lAmount * 100).toFixed(2) : "") : f.loanToValue;
		const guaranteedDisabled = !active || tot2 + outs > GUARANTEED_LIMIT;

		const income = data?.income;
		const insuranceIncome = income?.insuranceIncome ?? 0;
		const percentage = income?.percentage ?? 17.5;
		const survInc = num(f.survInc);
		const baseSurv = num(f.baseSurv);
		const survInc2 = active ? num(f.survInc2) : 0;
		const baseSurv2 = active ? num(f.baseSurv2) : 0;
		const subSurv2 = active ? sums.surveyFee2 : 0;
		const provInc = num(f.provInc);
		const grossInt = num(f.grossIntRate);
		const netInt = num(f.netIntRate);

		let ttlSurv = survInc + sums.survey;
		if (finType === "I" && ttlSurv >= 2500000) ttlSurv = 2500000;
		if (finType === "S" && ttlSurv >= 5000000) ttlSurv = 5000000;
		const ttlSurv2 = active ? survInc2 + subSurv2 : 0;
		const excSurv = ttlSurv - baseSurv;
		const excSurv2 = active ? ttlSurv2 - baseSurv2 : 0;
		const ttlProv = provInc + sums.provision;
		const ttlInt = grossInt + sums.interest;
		const excInt = ttlInt - netInt;
		const subTotal = sums.survey + sums.provision + sums.interest + subSurv2;
		const ttlSubTot = ttlProv + ttlInt + ttlSurv + insuranceIncome + ttlSurv2;
		const ttlExcTot = insuranceIncome + excSurv + ttlProv + excInt + excSurv2;
		const maxComm = Math.round((ttlSubTot * percentage) / 100);
		const eligibleComm = f.eligibleMode === "exc" ? ttlExcTot : num(f.eligibleComm);
		const marketingFee = Math.max(eligibleComm - maxComm, 0);

		return {
			active,
			netFinance,
			tot,
			tot2,
			loanToValue,
			guaranteedDisabled,
			guaranteed: guaranteedDisabled ? "0" : f.guaranteed === "1" ? "1" : "0",
			percentage,
			insuranceIncome,
			survInc2,
			baseSurv2,
			subSurv2,
			ttlSurv,
			ttlSurv2,
			excSurv,
			excSurv2,
			ttlProv,
			ttlInt,
			excInt,
			subTotal,
			ttlSubTot,
			ttlExcTot,
			maxComm,
			eligibleComm,
			marketingFee,
		};
	}, [form, data, sums, finType]);

	const effectiveDisbType = disbForced ?? form.disbType ?? "";

	const buildPayload = (f: Form) => {
		const d = derived;
		return {
			apless,
			applno: applNo,
			finType,
			purpoffinc,
			contTypeName: data?.contract.contTypeName ?? "",
			contSts: f.contSts,
			colType: f.colType,
			lType: f.lType,
			disbType: disbForced ?? f.disbType,
			advArr: f.advArr,
			fixFloat: f.fixFloat,
			floatCyc: f.fixFloat === "L" ? f.floatCyc : "",
			currCode: f.currCode,
			crossNo: f.crossNo,
			payCycle: f.payCycle,
			tenor: f.tenor,
			gPeriod: f.gPeriod,
			gIntRate: f.gIntRate,
			gIntAmt: f.gIntAmt,
			tenor1000: f.tenor1000,
			flatRate1000: f.flatRate1000,
			declRate1000: f.declRate1000,
			lAmount: f.lAmount,
			security: f.security,
			securityPersen: f.securityPersen,
			residual: f.residual,
			creditAmt: f.creditAmt,
			commAdmFee: f.commAdmFee,
			otherLoan: f.otherLoan,
			provisionLoan: f.provisionLoan,
			bbnLoan: f.bbn?.bbnLoan,
			bbn: f.bbn,
			surveyFee2: survey2Active(f) ? "1" : "0",
			surveyLoan2: survey2Active(f) ? f.surveyLoan2 : 0,
			survInc: f.survInc,
			provInc: f.provInc,
			baseSurv: f.baseSurv,
			survInc2: d.survInc2,
			baseSurv2: d.baseSurv2,
			creditProtection: survey2Active(f) ? f.creditProtection : 0,
			guaranteed: d.guaranteed,
			flatRate: f.flatRate,
			mlciFlat: f.mlciFlat,
			declRate: f.declRate,
			mlciDecl: f.mlciDecl,
			declRateFull: f.declRateFull,
			mlciDeclFull: f.mlciDeclFull,
			rental: f.rental,
			mlciRent: f.mlciRent,
			steps: f.lType === "3" ? f.steps : [],
			notaryFee: f.notaryFee,
			notary: f.notary,
			fiduciary: f.fiduciary,
			otherFee: f.otherFee,
			businessTripFee: f.businessTripFee,
			grossIntRate: f.grossIntRate,
			netIntRate: f.netIntRate,
			eligibleComm: d.eligibleComm,
			ttlSubTot: d.ttlSubTot,
			maxComm: d.maxComm,
		};
	};

	const clearForm = useCallback((f: Form, notary: Form): Form => ({
		...f,
		...notary,
		contSts: "N",
		disbType: "N",
		disbTouched: false,
		fixFloat: "X",
		floatCyc: "",
		advArr: "V",
		currCode: "IDR",
		colType: "TR",
		lType: "0",
		payCycle: 1,
		tenor: "",
		crossNo: "",
		lAmount: "",
		security: "",
		securityPersen: "",
		creditAmt: "",
		commAdmFee: "",
		otherLoan: "",
		noStep: "",
		steps: [],
		stepLastReadonly: false,
		tenor1000: "",
		flatRate1000: "",
		declRate1000: "",
		flatRate: "",
		declRate: "",
		rental: "",
		mlciFlat: "",
		mlciDecl: "",
		mlciRent: "",
		otherFee: "",
		gPeriod: "",
		residual: "",
		declRateFull: "",
		mlciDeclFull: "",
		provisionLoan: "",
		businessTripFee: "",
		baseSurv2: 0,
		provInc: "",
		grossIntRate: 0,
		netIntRate: 0,
		eligibleComm: 0,
		eligibleMode: "fixed",
		loanToValue: "",
		ltvDirty: false,
		bbn: { ...f.bbn, bbnFee: "", agencyFeeGross: "", agencyName: "", bbnLoan: "" },
	}), []);

	const handleClear = useCallback(async () => {
		try {
			const res = await api.post("/CAM/EditIndex/fin-financing/clear", { applno: applNo, finType });
			applySums(res.data.subsidy);
			commit(clearForm(formRef.current, res.data.notary || {}));
			setShowCross(false);
			setMessages(null);
		} catch (err: any) {
			showError([err?.response?.data?.error || "Failed to clear."]);
		}
	}, [applNo, finType, applySums, commit, clearForm, showError]);

	const handleCalculate = async () => {
		if (data?.accountBlocked) return;
		setCalculating(true);
		setMessages(null);
		const f = formRef.current;
		try {
			const res = await api.post("/CAM/EditIndex/fin-financing/calculate", buildPayload(f));
			const r = res.data;
			const current = formRef.current;
			let next: Form = {
				...current,
				rental: r.rental,
				mlciRent: r.mlciRent,
				flatRate: r.flatRate,
				mlciFlat: r.mlciFlat,
				declRate: r.declRate,
				mlciDecl: r.mlciDecl,
				declRateFull: r.declRateFull,
				mlciDeclFull: r.mlciDeclFull,
				declRate1000: r.declRate1000,
				gIntRate: r.gIntRate,
				gIntAmt: r.gIntAmt,
				grossIntRate: r.grossIntRate,
				netIntRate: r.netIntRate,
				survInc: r.survInc,
				provInc: r.provInc,
				baseSurv: r.baseSurv,
				eligibleComm: r.eligibleComm,
				eligibleMode: "fixed",
			};
			if (r.notaryFee !== undefined) {
				next = { ...next, notaryFee: r.notaryFee, notary: r.notary, fiduciary: r.fiduciary };
			}
			if (r.surveyFee2 === "1") {
				next = {
					...next,
					survInc2: r.survInc2,
					baseSurv2: r.baseSurv2,
					baseSurv2Default: r.baseSurv2,
					surveyLoan2: r.surveyLoan2,
					creditProtection: r.creditProtection,
				};
			} else {
				next = { ...next, surveyFee2: "0", survInc2: 0, baseSurv2: 0, surveyLoan2: 0, creditProtection: 0, guaranteed: "0" };
			}
			if (r.subsidy) applySums(r.subsidy);
			commit(next);
		} catch (err: any) {
			const text = err?.response?.data?.error || "Calculation failed.";
			if (err?.response?.data?.shouldClear) {
				window.alert(text);
				await handleClear();
			} else {
				showError(String(text).split("<br>"));
			}
		} finally {
			setCalculating(false);
		}
	};

	const handleCrossNoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== "Enter") return;
		e.preventDefault();
		if (blockedRef.current || calculating) return;
		setShowCross(false);
		if (formRef.current.lType === "3") {
			void handleGo();
		} else {
			void handleCalculate();
		}
	};

	const handleSave = async () => {
		if (dataRef.current?.accountBlocked) {
			showError([dataRef.current.accountBlockMessage]);
			return;
		}
		setSaving(true);
		setMessages(null);
		try {
			const res = await api.post("/CAM/EditIndex/fin-financing/save", buildPayload(formRef.current));
			if (res.data.success) {
				if (res.data.warning) window.alert(res.data.warning);
				if (res.data.notice) window.alert(res.data.notice);
				onSavedRef.current({ apless: res.data.apless, applno: res.data.applno });
			} else {
				showError(String(res.data.message || "Save failed.").split("<br>"));
			}
		} catch (err: any) {
			const body = err?.response?.data;
			const text = body?.message || body?.error || "Save failed.";
			if (body?.shouldClear) {
				window.alert(text);
				await handleClear();
			} else {
				showError(String(text).split("<br>"));
			}
		} finally {
			setSaving(false);
		}
	};

	const saveRef = useRef(handleSave);
	saveRef.current = handleSave;

	useImperativeHandle(ref, () => ({ save: () => { void saveRef.current(); } }), []);

	if (loading) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-[var(--app-muted)]">Loading…</p>
			</div>
		);
	}
	if (loadError || !data) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-red-600">{loadError || "No data."}</p>
			</div>
		);
	}

	const blocked = data.accountBlocked;
	const bbnVia = form.bbn?.via || "";
	const bbnPaidBy = form.bbn?.paidBy || "";
	const dealerVia = bbnVia === "Dealer";
	const paidByOptions: [string, string][] = bbnVia === "MLCI"
		? PAID_BY_MLCI
		: bbnVia === "Dealer"
			? (bbnPaidBy === "Loan" ? [...PAID_BY_DEALER, ["Loan", "Loan"] as [string, string]] : PAID_BY_DEALER)
			: [];
	const notaryReadOnly = !data.flags.notaryEditable;
	const notaryLabel = finType === "S" ? "Notary Fee Gross *" : financeLease ? null : "Notary Fee *";
	const showNettFees = !financeLease || finType === "S";
	const surveyInputsDisabled = !derived.active;
	const crossVisible = effectiveDisbType === "C"
		|| isRestructuring
		|| (data.contract.consLeas === "S" && contTypeCode === "NEW" && effectiveDisbType !== "N" && !form.disbTouched);
	const lType = form.lType || "";
	const steps: Form[] = form.steps || [];
	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");
	const surveyLockTitle = form.surveyLocked
		? (data.flags.surveyFee2LockReason || (flNewCar ? "Survey Fee 2 is disabled for this Finance Lease until eligibility is re-checked" : undefined))
		: undefined;

	const sellingBase = (
		<div className="flex text-sm font-bold text-[var(--app-text)]">
			<span className="w-1/2">SELLING</span>
			<span className="w-1/2">BASE</span>
		</div>
	);

	const ratePair = (
		selling: { key: string; onCommit?: () => void; readOnly?: boolean },
		base: { key: string; onCommit?: () => void; readOnly?: boolean },
	) => (
		<div className="flex items-center">
			<span className="flex w-1/2 items-center">
				<Box kind="rate" value={form[selling.key]} onChange={(v) => setField(selling.key, v)} onCommit={selling.onCommit} readOnly={selling.readOnly} className="w-1/2" />
				<span className={unit}>% p.a</span>
			</span>
			<span className="flex w-1/2 items-center">
				<Box kind="rate" value={form[base.key]} onChange={(v) => setField(base.key, v)} onCommit={base.onCommit} readOnly={base.readOnly} className="w-1/2" />
				<span className={unit}>% p.a</span>
			</span>
		</div>
	);

	const installmentPair = (readOnly: boolean) => (
		<div className="flex items-center">
			<span className="w-1/2">
				<Box kind="money" value={form.rental} onChange={(v) => setField("rental", v)} onCommit={readOnly ? undefined : handleRentalCommit} readOnly={readOnly} className="w-[68%]" />
			</span>
			<span className="w-1/2">
				<Box kind="money" value={form.mlciRent} onChange={(v) => setField("mlciRent", v)} onCommit={readOnly ? undefined : handleMlciRentCommit} readOnly={readOnly} className="w-[68%]" />
			</span>
		</div>
	);

	const moneyLine = (label: ReactNode, key: string, opts: { readOnly?: boolean; onCommit?: () => void; width?: string; disabled?: boolean; value?: any } = {}) => (
		<Line label={label}>
			<Box
				kind="money"
				value={opts.value !== undefined ? opts.value : form[key]}
				onChange={(v) => setField(key, v)}
				onCommit={opts.onCommit}
				readOnly={opts.readOnly}
				disabled={opts.disabled}
				className={opts.width ?? "w-[78%]"}
			/>
		</Line>
	);

	const notaryLine = notaryLabel ? moneyLine(notaryLabel, "notaryFee", { readOnly: notaryReadOnly, width: "w-full" }) : null;
	const nettDeedLine = showNettFees ? moneyLine("Nett Deed Fee *", "notary", { readOnly: notaryReadOnly, width: "w-full" }) : null;
	const nettCertLine = showNettFees ? moneyLine("Nett Certificate Fee *", "fiduciary", { readOnly: notaryReadOnly, width: "w-full" }) : null;
	const businessTripLine = moneyLine("Business Trip Fee", "businessTripFee", { width: "w-full" });

	return (
		<div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Financing</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>
			<div className="p-4 sm:p-6">
				<div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
					<div className="min-w-0">
						<table className="w-full border-collapse">
							<tbody>
								<tr>
									<td colSpan={2} className="judul border-b border-[var(--app-border)] pb-1 text-sm font-bold text-[var(--app-text)]">
										Financing
									</td>
								</tr>

								<Line label="Status *">
									<Dropdown
										value={form.contSts || "N"}
										onChange={handleStatusChange}
										options={data.lookups.contractStatuses}
										className="w-[90%]"
									/>
								</Line>

								<Line label="Contract Type *">
									<Box value={data.contract.contTypeName} readOnly align="left" className="w-[89%]" />
								</Line>

								<Line label="Disbursement Type *">
									<div className="relative flex items-center gap-2">
										{disbForced ? (
											<Box
												value={disbForced === "N" ? "NEW DISBURSEMENT" : "CROSS DISBURSEMENT"}
												readOnly
												align="left"
												className="w-[60%]"
											/>
										) : (
											<Dropdown
												value={form.disbType || ""}
												onChange={handleDisbTypeChange}
												options={data.lookups.disbursementTypes}
												className="w-[60%]"
											/>
										)}
										{crossVisible && (
											<button
												type="button"
												onClick={() => setShowCross(true)}
												className="h-7 whitespace-nowrap rounded border border-[var(--app-border)] bg-[var(--app-surface)] px-2 text-sm text-[var(--app-text)] hover:bg-slate-200"
											>
												Add Cross No
											</button>
										)}
										{crossVisible && showCross && (
											<div className="absolute left-0 top-9 z-50 w-[350px] max-w-[90vw] rounded border-2 border-[#8AC007] bg-white p-3 shadow-lg">
												<div className="mb-3 flex">
													<button
														type="button"
														onClick={() => setShowCross(false)}
														aria-label="Close"
														className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-lg font-bold leading-none text-white hover:bg-red-700"
													>
														×
													</button>
												</div>
												<div className="flex items-center gap-2">
													<span className="whitespace-nowrap text-sm text-black">Cross No</span>
													<Box
														kind="int"
														value={form.crossNo || ""}
														onChange={(v) => setField("crossNo", v)}
														onKeyDown={handleCrossNoKeyDown}
														align="left"
														className="w-[64%]"
													/>
												</div>
											</div>
										)}
									</div>
								</Line>

								<Line label="Purpose of Finance *">
									<Box value={data.contract.purpoffincDesc} readOnly align="left" className="w-[89%]" />
								</Line>

								<Line label="Currency *">
									<Dropdown
										value={form.currCode || ""}
										onChange={(v) => setField("currCode", v)}
										options={data.lookups.currencies}
										className="w-[80%]"
									/>
								</Line>

								<Line label="Payment Method *">
									<Dropdown
										value={form.colType || ""}
										onChange={(v) => setField("colType", v)}
										options={data.lookups.paymentMethods}
										className="w-[90%]"
									/>
								</Line>

								<Line label="In Adv / In Arr *">
									<Choice
										name="advArr"
										value={form.advArr}
										options={[["V", "Adv"], ["R", "Arr"]]}
										onChange={handleAdvArrChange}
										gap="gap-x-6"
									/>
								</Line>

								<Line label="Fix / Float *">
									<div className="flex flex-wrap items-center gap-x-6 gap-y-1">
										<Choice
											name="fixFloat"
											value={form.fixFloat}
											options={[["X", "Fix"], ["L", "Float"]]}
											onChange={(v) => setField("fixFloat", v)}
											gap="gap-x-6"
										/>
										{form.fixFloat === "L" && (
											<span className="inline-flex items-center gap-2">
												<span className="text-sm text-[var(--app-text)]">Float Cycle *</span>
												<Box kind="int" value={form.floatCyc} onChange={(v) => setField("floatCyc", v)} maxLength={3} className="w-[54px]" />
												<span className="text-sm text-[var(--app-text)]">Month</span>
											</span>
										)}
									</div>
								</Line>

								<Line label="Tenor *">
									<div className="flex flex-wrap items-center gap-x-6 gap-y-1">
										<span className="inline-flex items-center gap-1 whitespace-nowrap">
											<Box kind="int" value={form.tenor} onChange={(v) => setField("tenor", v)} onCommit={handleTenorCommit} className="w-[54px]" />
											<span className="text-sm text-[var(--app-text)]">Month</span>
										</span>
										<span className="inline-flex items-center gap-2 whitespace-nowrap">
											<span className="text-sm text-[var(--app-text)]">Payment Cycle *</span>
											<Box kind="int" value={form.payCycle} onChange={(v) => setField("payCycle", v)} maxLength={3} className="w-[54px]" />
											<span className="text-sm text-[var(--app-text)]">Month</span>
										</span>
									</div>
								</Line>

								<Line label="Grace Period">
									<Box kind="int" value={form.gPeriod} onChange={(v) => setField("gPeriod", v)} onCommit={handleGracePeriodCommit} className="w-[100px]" />
									<span className={unit}>Month</span>
								</Line>

								<Line label="Grace Int. Rate">
									<Box value={form.gIntRate} readOnly className="w-[100px]" />
									<span className={unit}>%</span>
								</Line>

								{moneyLine("Grace Int. Amount", "gIntAmt", { readOnly: true })}

								<Line label={flNewCar ? "Survey Fee 2 *" : "Survey Fee 2"}>
									<span title={surveyLockTitle}>
										<Choice
											name="surveyFee2"
											value={form.surveyFee2}
											options={[["1", "Yes"], ["0", "No"]]}
											disabled={!!form.surveyLocked}
											onChange={handleSurveyFee2Change}
										/>
									</span>
								</Line>

								{moneyLine("Asset Value *", "lAmount", { onCommit: handleAssetCommit })}

								<Line label={financeLease ? "Security Deposit *" : "Down Payment *"}>
									<div className="flex items-center gap-1">
										<Box kind="money" value={form.security} onChange={(v) => setField("security", v)} onCommit={handleSecurityCommit} className="w-1/2" />
										<Box kind="rate" decimals={2} value={form.securityPersen} onChange={(v) => setField("securityPersen", v)} onCommit={handleSecurityPercentCommit} className="w-[22%]" />
										<span className="text-sm text-[var(--app-text)]">%</span>
									</div>
								</Line>

								{moneyLine("Net Finance *", "netFinance", { readOnly: true, value: derived.netFinance, width: "w-[79%]" })}

								<Line label={flNewCar ? "BBN Loan *" : "BBN Loan"}>
									<Box
										kind="money"
										value={form.bbn?.bbnLoan}
										onChange={(v) => setBbn({ bbnLoan: v })}
										onCommit={handleLoanCommit}
										readOnly={bbnLoanReadOnly(bbnVia, bbnPaidBy)}
										className="w-[79%]"
									/>
								</Line>

								{moneyLine("Provision Loan", "provisionLoan", { onCommit: handleLoanCommit })}
								{moneyLine("Insurance Loan", "creditAmt", { onCommit: handleLoanCommit })}
								{moneyLine("Other Loan", "otherLoan", { onCommit: handleOtherLoanCommit })}
								{moneyLine(flNewCar ? "Total Net Finance" : "Total Net Finance *", "totalNetFinance", { readOnly: true, value: derived.tot, width: "w-[79%]" })}

								<Line label="Survey Loan 2">
									<Box
										kind="money"
										value={derived.active ? form.surveyLoan2 : 0}
										onChange={(v) => setField("surveyLoan2", v)}
										onCommit={handleSurveyLoan2Commit}
										disabled={surveyInputsDisabled}
										className="w-[79%]"
									/>
								</Line>

								{moneyLine(
									flNewCar ? "Total Net Finance + Survey Loan 2" : "Total Net Finance + Survey Loan 2 *",
									"totalNetFinance2",
									{ readOnly: true, value: derived.tot2, width: "w-[79%]" },
								)}

								{!flNewCar && finType === "D" && (
									<>
										{moneyLine("Total Customer's Outstanding Contract & CAM Net Finance for Fund Facility (FD)", "totalFDana", { readOnly: true, value: data.outstanding.totalFDana, width: "w-[79%]" })}
										{moneyLine("Grand Total Customer's Outstanding Contract & CAM Net Finance for Fund Facility (FD)", "totalFDanas", { readOnly: true, value: data.outstanding.totalFDana + Math.trunc(derived.tot2), width: "w-[79%]" })}
									</>
								)}

								{!flNewCar && finType === "M" && (
									<>
										{moneyLine("Total Customer's Outstanding Contract & CAM Net Finance for Business Capital Facility (FMU)", "totalFModal", { readOnly: true, value: data.outstanding.totalFModal, width: "w-[79%]" })}
										{moneyLine("Grand Total Customer's Outstanding Contract & CAM Net Finance for Business Capital Facility (FMU)", "totalfunds", { readOnly: true, value: data.outstanding.totalFModal + Math.trunc(derived.tot2), width: "w-[79%]" })}
									</>
								)}

								<Line label="Loan to Value (LtV)">
									<Box value={derived.loanToValue} readOnly className="w-[79%]" />
									<span className="text-sm text-[var(--app-text)]">%</span>
								</Line>

								<Line label={flNewCar ? "Amortization Type" : "Amortization Type *"}>
									<Dropdown
										value={lType}
										onChange={handleAmortizationChange}
										options={data.lookups.amortizationTypes}
										className="w-[80%]"
									/>
								</Line>

								{lType === "4" ? (
									<>
										<Line label="Customer Flat Rate *">
											<Box kind="rate" value={form.flatRate1000} onChange={(v) => setField("flatRate1000", v)} className="w-[69%]" />
											<span className={unit}>% p.a</span>
										</Line>
										<Line label="Customer Tenor *">
											<Box kind="int" value={form.tenor1000} onChange={(v) => setField("tenor1000", v)} className="w-[69%]" />
											<span className={unit}>Month</span>
										</Line>
										<Line>{sellingBase}</Line>
										<Line label="Flat Rate *">
											{ratePair({ key: "flatRate", readOnly: true }, { key: "mlciFlat", onCommit: handleMlciFlatCommit })}
										</Line>
										<Line label="Effective Rate *">
											{ratePair({ key: "declRate", readOnly: true }, { key: "mlciDecl", readOnly: true })}
										</Line>
										<Line label="Installment *">
											{installmentPair(true)}
										</Line>
									</>
								) : (
									<>
										<Line>{sellingBase}</Line>
										<Line label="Flat Rate *">
											{ratePair({ key: "flatRate", onCommit: handleFlatCommit }, { key: "mlciFlat", onCommit: handleMlciFlatCommit })}
										</Line>
										<Line label="Effective Rate *">
											{ratePair({ key: "declRate", onCommit: handleDeclCommit }, { key: "mlciDecl", onCommit: handleMlciDeclCommit })}
										</Line>
										{lType === "3" ? (
											<Line label="No. of Step *">
												<div className="flex items-center gap-2">
													<Box kind="int" value={form.noStep} onChange={(v) => setField("noStep", v)} className="w-1/4" />
													<button
														type="button"
														onClick={handleGo}
														disabled={blocked}
														className="h-7 rounded border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)] hover:bg-slate-200 disabled:opacity-50"
													>
														Go
													</button>
												</div>
											</Line>
										) : (
											<Line label="Installment *">
												{installmentPair(false)}
											</Line>
										)}
									</>
								)}

								{lType === "3" && steps.length > 0 && (
									<tr>
										<td colSpan={2} className="py-1">
											<table className="w-full border-collapse">
												<thead>
													<tr className="text-left text-sm font-normal text-[var(--app-text)]">
														<td className="w-[10%] py-[3px]">Step *</td>
														<td className="w-[20%] py-[3px]">Month *</td>
														<td className="w-[35%] py-[3px]">Rental *</td>
														<td className="w-[35%] py-[3px]">Base *</td>
													</tr>
												</thead>
												<tbody>
													{steps.map((step, i) => {
														const isLast = i === steps.length - 1;
														return (
															<tr key={i}>
																<td className="py-[3px] text-sm text-[var(--app-text)]">{i + 1}</td>
																<td className="py-[3px]">
																	<Box
																		kind="int"
																		value={step.month}
																		onChange={(v) => setStep(i, { month: v })}
																		onCommit={isLast ? undefined : handleStepMonthCommit(i)}
																		readOnly={isLast}
																		className="w-[80%]"
																	/>
																</td>
																<td className="py-[3px]">
																	<Box
																		kind="money"
																		value={step.rental}
																		onChange={(v) => setStep(i, { rental: v })}
																		onCommit={isLast ? undefined : handleStepRentalCommit(i)}
																		readOnly={isLast && !!form.stepLastReadonly}
																		className="w-[80%]"
																	/>
																</td>
																<td className="py-[3px]">
																	<Box kind="money" value={step.base} readOnly className="w-[80%]" />
																</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</td>
									</tr>
								)}

								{!blocked && (
									<tr>
										<td colSpan={2} className="pt-4 text-right">
											<button
												type="button"
												onClick={handleCalculate}
												disabled={calculating}
												className="mr-2 rounded border border-[#CC5200] bg-[#FF6600] px-4 py-1 text-sm text-white hover:bg-[#E65C00] disabled:opacity-50"
											>
												{calculating ? "Calculating…" : "Calculate"}
											</button>
											<button
												type="button"
												onClick={() => handleClear()}
												className="rounded border border-[#CC5200] bg-[#FF6600] px-4 py-1 text-sm text-white hover:bg-[#E65C00] disabled:opacity-50"
											>
												Clear
											</button>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					<div className="min-w-0">
						<table className="w-full border-collapse">
							<tbody>
								<tr>
									<td colSpan={2} className="pb-1 text-sm">&nbsp;</td>
								</tr>
								{flNewCar ? (
									<>
										<Line label="BBN Via">
											<Choice
												name="bbnVia"
												value={bbnVia}
												options={[["MLCI", "Company"], ["Dealer", "Dealer"]]}
												onChange={handleBbnViaChange}
												gap="gap-x-16"
											/>
										</Line>
										{paidByOptions.length > 0 && (
											<Line label="Paid By">
												<Choice
													name="paidBy"
													value={bbnPaidBy}
													options={paidByOptions}
													onChange={handlePaidByChange}
													gap="gap-x-6"
												/>
											</Line>
										)}
										{/* <Line label="Agency Name">
										<Dropdown
											value={form.bbn?.agencyName || ""}
											onChange={handleAgencyNameChange}
											options={data.lookups.agencyNames.map((n) => ({ value: n, label: n }))}
											disabled={dealerVia}
											className="w-full"
										/>
									</Line> */}
										<Line label="Agency Fee Gross">
											<Box
												kind="money"
												value={form.bbn?.agencyFeeGross}
												onChange={(v) => setBbn({ agencyFeeGross: v })}
												onCommit={handleAgencyFeeGrossCommit}
												readOnly={dealerVia}
												className="w-full"
											/>
										</Line>
										<Line label="BBN Fee">
											<Box
												kind="money"
												value={form.bbn?.bbnFee}
												onChange={(v) => setBbn({ bbnFee: v })}
												onCommit={handleBbnFeeCommit}
												readOnly={dealerVia}
												className="w-full"
											/>
										</Line>
										<Line label="Agency Fee Net">
											<Box kind="money" value={form.bbn?.agencyFeeNet} readOnly className="w-full" />
										</Line>
										{notaryLine}
										{nettDeedLine}
										{nettCertLine}
										{businessTripLine}
										{moneyLine("Residual Value", "residual", { readOnly: true, width: "w-full" })}
									</>
								) : (
									<>
										{notaryLine}
										{businessTripLine}
										{nettDeedLine}
										{nettCertLine}
									</>
								)}
							</tbody>
						</table>

						<div className="mt-3 overflow-x-auto">
							<table className="w-full border-collapse border border-[var(--app-border)]">
								<thead>
									<tr>
										<th className={`${headCell} w-[15%]`}>
											<button
												type="button"
												onClick={() => setShowSubsidyPanel(true)}
												disabled={blocked}
												className="rounded bg-[#FF6600] px-2 py-0.5 text-xs font-normal text-white hover:bg-[#e65c00] disabled:opacity-50"
											>
												Detail
											</button>
										</th>
										<th className={`${headCell} w-[15%]`}>Income</th>
										<th className={`${headCell} w-[15%]`}>Subsidy</th>
										<th className={`${headCell} w-[15%]`}>Total Income (Include Subsidy)</th>
										<th className={`${headCell} w-[15%]`}>Base Rate</th>
										<th className={`${headCell} w-[15%]`}>Max Refund</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td className={labelCell}>Insurance Income</td>
										<td className={valueCell}><Box kind="money" value={derived.insuranceIncome} readOnly className={cellBox} /></td>
										<td className={greyCell} rowSpan={2} />
										<td className={greyCell} />
										<td className={valueCell}><Box kind="money" value={0} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={derived.insuranceIncome} readOnly className={cellBox} /></td>
									</tr>
									<tr>
										<td className={labelCell}>Net Insurance Prem. Received</td>
										<td className={valueCell}><Box kind="money" value={derived.insuranceIncome} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={derived.insuranceIncome} readOnly className={cellBox} /></td>
										<td className={greyCell} />
										<td className={greyCell} />
									</tr>
									<tr>
										<td className={labelCell}>Survey Fee 1</td>
										<td className={valueCell}>
											<Box kind="money" value={form.survInc} onChange={(v) => setField("survInc", v)} onCommit={handleSurvIncCommit} readOnly={blocked} className={cellBox} />
										</td>
										<td className={valueCell}><Box kind="money" value={sums.survey} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={derived.ttlSurv} readOnly className={cellBox} /></td>
										<td className={valueCell}>
											<Box kind="money" value={form.baseSurv} onChange={(v) => setField("baseSurv", v)} onCommit={handleBaseSurvCommit} readOnly={blocked} className={cellBox} />
										</td>
										<td className={valueCell}><Box kind="money" value={derived.excSurv} readOnly className={cellBox} /></td>
									</tr>
									<tr>
										<td className={labelCell}>Survey Fee 2</td>
										<td className={valueCell}>
											<Box kind="money" value={derived.survInc2} onChange={(v) => setField("survInc2", v)} onCommit={handleSurvInc2Commit} disabled={surveyInputsDisabled} readOnly={blocked} className={cellBox} />
										</td>
										<td className={valueCell}><Box kind="money" value={derived.subSurv2} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={derived.ttlSurv2} readOnly className={cellBox} /></td>
										<td className={valueCell}>
											<Box kind="money" value={derived.baseSurv2} onChange={(v) => setField("baseSurv2", v)} onCommit={handleBaseSurv2Commit} disabled={surveyInputsDisabled} readOnly={blocked} className={cellBox} />
										</td>
										<td className={valueCell}><Box kind="money" value={derived.excSurv2} readOnly className={cellBox} /></td>
									</tr>
									<tr>
										<td className={labelCell}>Provision Fee</td>
										<td className={valueCell}>
											<Box kind="money" value={form.provInc} onChange={(v) => setField("provInc", v)} onCommit={handleProvIncCommit} readOnly={blocked} className={cellBox} />
										</td>
										<td className={valueCell}><Box kind="money" value={sums.provision} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={derived.ttlProv} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={0} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={derived.ttlProv} readOnly className={cellBox} /></td>
									</tr>
									<tr>
										<td className={labelCell}>Interest Income</td>
										<td className={valueCell}><Box kind="money" value={form.grossIntRate} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={sums.interest} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={derived.ttlInt} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={form.netIntRate} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={derived.excInt} readOnly className={cellBox} /></td>
									</tr>
									<tr>
										<td className={labelCell} colSpan={2}>Total</td>
										<td className={valueCell}><Box kind="money" value={derived.subTotal} readOnly className={cellBox} /></td>
										<td className={valueCell}><Box kind="money" value={derived.ttlSubTot} readOnly className={`${cellBox} font-bold`} /></td>
										<td className={greyCell} />
										<td className={valueCell}><Box kind="money" value={derived.ttlExcTot} readOnly className={`${cellBox} font-bold`} /></td>
									</tr>
									<tr>
										<td className={labelCell} colSpan={3}>Incentive to 3rd Party {derived.percentage}%</td>
										<td className={valueCell}><Box kind="money" value={derived.maxComm} readOnly className={`${cellBox} font-bold`} /></td>
									</tr>
									<tr>
										<td className={labelCell} colSpan={3}>Marketing Fee</td>
										<td className={valueCell}><Box kind="money" value={derived.marketingFee} readOnly className={`${cellBox} font-bold`} /></td>
									</tr>
									<tr>
										<td className={labelCell} colSpan={5}>Incentive To Be Paid</td>
										<td className={valueCell}><Box kind="money" value={derived.eligibleComm} readOnly className={`${cellBox} font-bold`} /></td>
									</tr>
								</tbody>
							</table>
						</div>

						<table className="mt-2 w-full border-collapse">
							<tbody>
								{moneyLine("Credit Protection", "creditProtection", { readOnly: true, width: "w-[90%]" })}
								<Line label="Guaranteed Acceptance">
									<Choice
										name="guaranteed"
										value={derived.guaranteed}
										options={[["1", "Yes"], ["0", "No"]]}
										disabled={derived.guaranteedDisabled}
										onChange={(v) => setField("guaranteed", v)}
									/>
								</Line>
							</tbody>
						</table>
					</div>
				</div>

				{saving && (
					<p className="mt-3 text-right text-sm text-[var(--app-muted)]">Please wait…</p>
				)}

				{(messages || blocked) && (
					<div className="message mt-3 space-y-1">
						{messages?.lines.map((line, i) => (
							<p key={i} className={`text-sm ${messages.type === "success" ? "text-green-600" : "text-red-600"}`}>{line}</p>
						))}
						{blocked && <p className="text-sm text-red-600">{data.accountBlockMessage}</p>}
					</div>
				)}

				{showSubsidyPanel && (
					<CAMFinancingSubsidyPanel
						applNo={applNo}
						includeSurveyFee2Option={derived.active}
						onClose={() => setShowSubsidyPanel(false)}
						onChanged={refreshSubsidy}
					/>
				)}
			</div>
		</div>
	);
});

export default CAMFinancingPage;
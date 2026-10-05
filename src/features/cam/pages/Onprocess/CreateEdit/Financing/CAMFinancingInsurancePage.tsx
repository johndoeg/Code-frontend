import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import api from '@/shared/api/axiosInstance';

export interface CamTabHandle {
    save: () => void;
}

export interface CAMFinancingInsurancePageProps {
    apless: string;
    applNo: string;
    finType: string;
    custName?: string;
    insLoan?: string;
    creditAmt?: string | number;
    onSaved: (result: { apless: string; applno: string }) => void;
}

interface LookupOption {
    value: string;
    label: string;
}

const CLAUSE_NAMES = ["SRCC", "EQ", "FW", "AW", "COM", "TS"] as const;
type ClauseName = (typeof CLAUSE_NAMES)[number];

type ClauseCodes = Partial<Record<ClauseName, string>>;

interface InsuranceRow {
    year: number;
    insAmt: number | string;
    tplAmt: string;
    tloAr: string;
    prerAmt: number | string;
    prepAmt: number | string;
    savePremi: number | string;
    savePremicla: number | string;
    clauseCodes: ClauseCodes;
    clauseSelected: ClauseCodes;
    clauseLocked: boolean;
}

interface IncomeSummary {
    ttlIncome: number;
    ttlIncomeNet: number;
    ttlSubIncNet: number;
    baseInc: number;
    execInc: number;
    survInc: number;
    subSurv: number;
    ttlSurv: number;
    baseSurv: number;
    exceSurv: number;
    survInc2: number;
    subSurv2: number;
    ttlSurv2: number;
    baseSurv2: number;
    exceSurv2: number;
    provInc: number;
    subProv: number;
    ttlProv: number;
    provBase: number;
    provExec: number;
    interestIncome: number;
    subInt: number;
    ttlInt: number;
    baseInterest: number;
    excInt: number;
    subsidyTotal: number;
    ttlSubTot: number;
    ttlExcTot: number;
    maxComm: number;
    percentage: number;
    eligibleComm: number;
    marketingFee: number;
}

const EMPTY_SUMMARY: IncomeSummary = {
    ttlIncome: 0, ttlIncomeNet: 0, ttlSubIncNet: 0, baseInc: 0, execInc: 0,
    survInc: 0, subSurv: 0, ttlSurv: 0, baseSurv: 0, exceSurv: 0,
    survInc2: 0, subSurv2: 0, ttlSurv2: 0, baseSurv2: 0, exceSurv2: 0,
    provInc: 0, subProv: 0, ttlProv: 0, provBase: 0, provExec: 0,
    interestIncome: 0, subInt: 0, ttlInt: 0, baseInterest: 0, excInt: 0,
    subsidyTotal: 0, ttlSubTot: 0, ttlExcTot: 0, maxComm: 0, percentage: 0,
    eligibleComm: 0, marketingFee: 0,
};

const num = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const parsed = parseFloat(String(value).replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
};

const isBlank = (value: any) => value === null || value === undefined || String(value).trim() === "";

const fmt = (value: any) => Math.round(num(value)).toLocaleString("en-US");

const boxClass =
    "h-7 rounded border border-[var(--app-border)] bg-[var(--app-card)] px-1.5 text-sm text-[var(--app-text)] " +
    "read-only:bg-[var(--app-surface)] read-only:text-[var(--app-muted)] disabled:cursor-not-allowed disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)] disabled:opacity-70";

function Box({
    kind = "text",
    value,
    onChange,
    readOnly,
    disabled,
    maxLength,
    align = "right",
    className = "",
}: {
    kind?: "money" | "int" | "text";
    value: any;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    disabled?: boolean;
    maxLength?: number;
    align?: "left" | "right" | "center";
    className?: string;
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const editable = !readOnly && !disabled;
    const raw = value === null || value === undefined ? "" : String(value);
    const shown = kind === "money" ? (draft ?? (isBlank(raw) ? "" : fmt(raw))) : raw;
    const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
    return (
        <input
            type="text"
            inputMode={kind === "money" || kind === "int" ? "numeric" : undefined}
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
                const next = kind === "text" ? e.target.value : e.target.value.replace(/[^0-9]/g, "");
                if (kind === "money") setDraft(next);
                onChange?.(next);
            }}
            onBlur={() => {
                if (!editable) return;
                if (kind === "money") setDraft(null);
            }}
            className={`${boxClass} ${alignClass} ${className}`}
        />
    );
}

const selectClass =
    "h-7 rounded border border-[var(--app-border)] bg-white px-1.5 text-sm text-[var(--app-text)] [&>option]:bg-white " +
    "disabled:cursor-not-allowed disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)] disabled:opacity-70 " +
    "disabled:[&>option]:bg-[var(--app-surface)]";

const buttonClass =
    "rounded border border-[#CC5200] bg-[#FF6600] px-4 py-1 text-sm text-white hover:bg-[#E65C00] disabled:opacity-50";

function Dropdown({
    value,
    onChange,
    options,
    disabled,
    placeholder = true,
    className = "",
}: {
    value: string;
    onChange: (value: string) => void;
    options: LookupOption[];
    disabled?: boolean;
    placeholder?: boolean;
    className?: string;
}) {
    return (
        <select
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={`${selectClass} ${className}`}
        >
            {placeholder && <option value="">Select</option>}
            {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
    );
}

const headCell = "border border-black bg-[#0066FF] px-1 py-1 text-center text-xs font-bold text-white";
const labelCell = "border border-[var(--app-border)] px-1.5 py-1 text-sm text-[var(--app-text)]";
const valueCell = "border border-[var(--app-border)] px-1 py-1 text-right";
const greyCell = "border border-[var(--app-border)] bg-[#666666]";
const cellBox = "w-[90px]";
const gridLabel = "w-[15%] py-[3px] pr-2 align-middle text-sm text-[var(--app-text)]";
const gridValue = "w-[35%] py-[3px] pr-4 align-middle";
const wide = "w-[133px]";
const plain = "w-[177px]";
const auto = "w-auto min-w-[133px] pr-6";

const CAMFinancingInsurancePage = forwardRef<CamTabHandle, CAMFinancingInsurancePageProps>(function CAMFinancingInsurancePage({
    apless,
    applNo,
    finType,
    custName,
    insLoan,
    creditAmt,
    onSaved,
}, ref) {
    const [loading, setLoading] = useState(true);
    const [blocked, setBlocked] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [messages, setMessages] = useState<string[]>([]);

    const [insPol, setInsPol] = useState("");
    const [insCd, setInsCd] = useState("");
    const [payMethod, setPayMethod] = useState("");
    const [payMethodOptions, setPayMethodOptions] = useState<LookupOption[]>([]);
    const [payMethodLocked, setPayMethodLocked] = useState(false);
    const [model, setModel] = useState("");
    const [condition, setCondition] = useState("");
    const [conditionLabel, setConditionLabel] = useState("");
    const [equipCondition, setEquipCondition] = useState("");
    const [bpkbArea, setBpkbArea] = useState("");
    const [branchCd, setBranchCd] = useState("");
    const [insuranceAreaOptions, setInsuranceAreaOptions] = useState<LookupOption[]>([]);
    const [insuranceAreaDisabled, setInsuranceAreaDisabled] = useState(false);
    const [totalSeat, setTotalSeat] = useState("");
    const [grossPrem, setGrossPrem] = useState<number | string>(0);
    const [netCom, setNetCom] = useState<number | string>(0);

    const [companies, setCompanies] = useState<LookupOption[]>([]);
    const [models, setModels] = useState<LookupOption[]>([]);
    const [tplOptions, setTplOptions] = useState<string[]>([]);
    const [tloOptions, setTloOptions] = useState<LookupOption[]>([]);
    const [rows, setRows] = useState<InsuranceRow[]>([]);
    const [summary, setSummary] = useState<IncomeSummary>(EMPTY_SUMMARY);

    const [calculating, setCalculating] = useState(false);
    const [saving, setSaving] = useState(false);

    const rowsRef = useRef<InsuranceRow[]>([]);
    rowsRef.current = rows;

    const applyRowLookups = useCallback((incoming: any[]) => {
        const byYear: Record<number, any> = {};
        for (const row of incoming || []) byYear[Number(row.year)] = row;
        setRows((prev) => prev.map((row) => {
            const next = byYear[row.year];
            if (!next) return row;
            return {
                ...row,
                tplAmt: next.tplAmt ?? "",
                tloAr: next.tloAr ?? "",
                clauseCodes: (next.clauseCodes || {}) as ClauseCodes,
                clauseLocked: !!next.clauseLocked,
                clauseSelected: (next.clauseSelected || {}) as ClauseCodes,
            };
        }));
    }, []);

    const refreshLookups = useCallback(async (overrides: {
        insCd?: string;
        model?: string;
        bpkbArea?: string;
        rowsOverride?: InsuranceRow[];
    } = {}) => {
        const source = overrides.rowsOverride ?? rowsRef.current;
        try {
            const res = await api.post("/CAM/EditIndex/insurance/lookups", {
                applno: applNo,
                apless,
                insCd: overrides.insCd ?? insCd,
                model: overrides.model ?? model,
                bpkbArea: overrides.bpkbArea ?? bpkbArea,
                rows: source.map((row) => ({
                    year: row.year,
                    tplAmt: row.tplAmt,
                    tloAr: row.tloAr,
                    clauseSelected: row.clauseSelected,
                })),
            });
            setTplOptions(res.data.tplOptions || []);
            setTloOptions(res.data.tloOptions || []);
            applyRowLookups(res.data.rows || []);
        } catch {
            setTplOptions((prev) => prev);
        }
    }, [apless, applNo, insCd, model, bpkbArea, applyRowLookups]);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        setBlocked(false);
        setMessages([]);
        try {
            const res = await api.get("/CAM/EditIndex/insurance", {
                params: { apless, applno: applNo, finType, insLoan: insLoan ?? "", creditAmt: creditAmt ?? 0 },
            });
            const d = res.data;
            if (d.blocked) {
                setBlocked(true);
                setLoadError(d.message || "The Application is on approval process or has finished. The Data cannot be changed");
                return;
            }
            setInsPol(d.insPol || "");
            setInsCd(d.insCd || "");
            setPayMethod(d.payMethod || "");
            setPayMethodOptions(d.payMethodOptions || []);
            setPayMethodLocked(!!d.payMethodLocked);
            setModel(d.model || "");
            setCondition(d.condition || "");
            setConditionLabel(d.conditionLabel || "");
            setEquipCondition(d.equipCondition || "");
            setBpkbArea(d.bpkbArea || "");
            setBranchCd(d.branchCd || "");
            setInsuranceAreaOptions(d.insuranceAreaOptions || []);
            setInsuranceAreaDisabled(!!d.insuranceAreaDisabled);
            setTotalSeat(d.totalSeat || "");
            setGrossPrem(d.grossPrem ?? 0);
            setNetCom(d.netCom ?? 0);
            setCompanies(d.companies || []);
            setModels(d.models || []);
            setTplOptions(d.tplOptions || []);
            setTloOptions(d.tloOptions || []);
            setRows((d.rows || []).map((row: any) => ({
                year: Number(row.year),
                insAmt: row.insAmt ?? "",
                tplAmt: row.tplAmt ?? "",
                tloAr: row.tloAr ?? "",
                prerAmt: row.prerAmt ?? "",
                prepAmt: row.prepAmt ?? "",
                savePremi: row.savePremi ?? "",
                savePremicla: row.savePremicla ?? "",
                clauseCodes: (row.clauseCodes || {}) as ClauseCodes,
                clauseSelected: (row.clauseSelected || {}) as ClauseCodes,
                clauseLocked: !!row.clauseLocked,
            })));
            setSummary({ ...EMPTY_SUMMARY, ...(d.incomeSummary || {}) });
        } catch {
            setLoadError("Failed to load Insurance. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [apless, applNo, finType, insLoan, creditAmt]);

    useEffect(() => {
        void load();
    }, [load]);

    const setRowField = (year: number, patch: Partial<InsuranceRow>) => {
        setRows((prev) => prev.map((row) => (row.year === year ? { ...row, ...patch } : row)));
    };

    const handleInsCdChange = (value: string) => {
        setInsCd(value);
        void refreshLookups({ insCd: value });
    };

    const handleModelChange = (value: string) => {
        setModel(value);
        void refreshLookups({ model: value });
    };

    const toggleClause = (year: number, name: ClauseName) => {
        if (blocked) return;
        setRows((prev) => prev.map((row) => {
            if (row.year !== year || row.clauseLocked) return row;
            const code = row.clauseCodes[name];
            if (!code) return row;
            const selected: ClauseCodes = { ...row.clauseSelected };
            if (selected[name]) delete selected[name];
            else selected[name] = code;
            return { ...row, clauseSelected: selected };
        }));
    };

    const handleCalculate = async () => {
        setCalculating(true);
        setMessages([]);
        try {
            const res = await api.post("/CAM/EditIndex/insurance/calculate", {
                applno: applNo,
                apless,
                finType,
                insCd,
                model,
                bpkbArea,
                eligibleComm: summary.eligibleComm,
                rows: rowsRef.current.map((row) => ({
                    year: row.year,
                    insAmt: row.insAmt,
                    tplAmt: row.tplAmt,
                    tloAr: row.tloAr,
                    clauseSelected: row.clauseSelected,
                })),
            });
            setGrossPrem(res.data.grossPrem ?? 0);
            setNetCom(res.data.netCom ?? 0);
            setSummary({ ...EMPTY_SUMMARY, ...(res.data.incomeSummary || {}) });
            const byYear: Record<number, any> = {};
            for (const row of res.data.rows || []) byYear[Number(row.year)] = row;
            const nextRows = rowsRef.current.map((row) => {
                const calculated = byYear[row.year];
                if (!calculated) return row;
                return {
                    ...row,
                    prerAmt: calculated.prerAmt ?? "",
                    prepAmt: calculated.prepAmt ?? "",
                    savePremi: calculated.savePremi ?? "",
                    savePremicla: calculated.savePremicla ?? "",
                };
            });
            setRows(nextRows);
            await refreshLookups({ rowsOverride: nextRows });
        } catch (err: any) {
            const body = err?.response?.data;
            setMessages([body?.error || body?.message || "Calculation failed. Please try again."]);
        } finally {
            setCalculating(false);
        }
    };

    const handleClear = async () => {
        setMessages([]);
        setInsCd("");
        setPayMethod("1");
        setCondition(equipCondition);
        setTotalSeat("");
        if (branchCd === "101") setBpkbArea("2");
        const nextRows = rowsRef.current.map((row) => ({
            ...row,
            tplAmt: "",
            tloAr: "",
            prerAmt: "",
            prepAmt: "",
            savePremi: "",
            savePremicla: "",
            clauseCodes: {} as ClauseCodes,
            clauseSelected: {} as ClauseCodes,
            clauseLocked: false,
        }));
        setRows(nextRows);
        await refreshLookups({ insCd: "", rowsOverride: nextRows });
    };

    const handleNext = useCallback(async () => {
        setSaving(true);
        setMessages([]);
        try {
            const res = await api.post("/CAM/EditIndex/insurance/next", {
                applno: applNo,
                apless,
                finType,
                insCd,
                payMethod,
                model,
                condition,
                bpkbArea,
                totalSeat,
                grossPrem,
                netCom,
                eligibleComm: summary.eligibleComm,
                ttlSubTot: summary.ttlSubTot,
                maxComm: summary.maxComm,
                rows: rowsRef.current.map((row) => ({
                    year: row.year,
                    insAmt: row.insAmt,
                    tplAmt: row.tplAmt,
                    tloAr: row.tloAr,
                    prerAmt: row.prerAmt,
                    prepAmt: row.prepAmt,
                    savePremi: row.savePremi,
                    savePremicla: row.savePremicla,
                    clauseSelected: row.clauseSelected,
                })),
            });
            if (res.data.success) {
                onSaved({ apless, applno: applNo });
            } else {
                setMessages(String(res.data.message || "Save failed. Please try again.").split("<br>").filter(Boolean));
            }
        } catch (err: any) {
            const body = err?.response?.data;
            setMessages(String(body?.message || body?.error || "Save failed. Please try again.").split("<br>").filter(Boolean));
        } finally {
            setSaving(false);
        }
    }, [apless, applNo, finType, insCd, payMethod, model, condition, bpkbArea, totalSeat, grossPrem, netCom, summary, onSaved]);

    useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

    if (loading) {
        return (
            <div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
                <p className="text-sm text-[var(--app-muted)]">Loading…</p>
            </div>
        );
    }

    if (loadError && !blocked) {
        return (
            <div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
                <p className="text-sm text-red-600">{loadError}</p>
            </div>
        );
    }

    const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

    return (
        <div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                        <svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
                            <path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
                        </svg>
                    </span>
                    <h2 className="text-[15px] font-semibold text-[var(--app-text)]">Insurance</h2>
                </div>
                {judul && (
                    <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
                )}
            </div>
            <div className="p-4 sm:p-6">
                <table className="w-full border-collapse">
                    <tbody>
                        <tr>
                            <td className={gridLabel}>Ins. Policy *</td>
                            <td className={gridValue}>
                                <Box value={insPol} readOnly align="left" className={plain} />
                            </td>
                            <td className={gridLabel}>Pay Method *</td>
                            <td className={gridValue}>
                                <Dropdown
                                    value={payMethod}
                                    onChange={setPayMethod}
                                    options={payMethodOptions}
                                    disabled={blocked || payMethodLocked}
                                    className={auto}
                                />
                            </td>
                        </tr>

                        <tr>
                            <td className={gridLabel}>Ins. Company *</td>
                            <td className={gridValue}>
                                <Dropdown
                                    value={insCd}
                                    onChange={handleInsCdChange}
                                    options={companies}
                                    disabled={blocked}
                                    className={auto}
                                />
                            </td>
                            <td className={gridLabel}>Model *</td>
                            <td className={gridValue}>
                                <Dropdown
                                    value={model}
                                    onChange={handleModelChange}
                                    options={models}
                                    disabled={blocked}
                                    className={auto}
                                />
                            </td>
                        </tr>

                        <tr>
                            <td className={gridLabel}>Insurance Area *</td>
                            <td className={gridValue}>
                                <Dropdown
                                    value={bpkbArea}
                                    onChange={setBpkbArea}
                                    options={insuranceAreaOptions}
                                    disabled={blocked || insuranceAreaDisabled}
                                    className={auto}
                                />
                            </td>
                            <td className={gridLabel}>Condition *</td>
                            <td className={gridValue}>
                                <Box value={conditionLabel} readOnly align="left" className={plain} />
                            </td>
                        </tr>

                        <tr>
                            <td className={gridLabel}>Gross Premium</td>
                            <td className={gridValue}>
                                <Box kind="money" value={grossPrem} readOnly className={wide} />
                            </td>
                            <td className={gridLabel}>Seat</td>
                            <td className={gridValue}>
                                <Box
                                    kind="int"
                                    value={totalSeat}
                                    onChange={setTotalSeat}
                                    readOnly={blocked}
                                    maxLength={2}
                                    className="w-[53px]"
                                />
                            </td>
                        </tr>

                        <tr>
                            <td className={gridLabel}>Net Premium</td>
                            <td className={gridValue}>
                                <Box kind="money" value={netCom} readOnly className={wide} />
                            </td>
                            <td className={gridLabel}>&nbsp;</td>
                            <td className={gridValue}>&nbsp;</td>
                        </tr>

                        <tr>
                            <td colSpan={4} className="pt-3">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-[var(--app-border)]">
                                        <thead>
                                            <tr>
                                                <th className={`${labelCell} w-[10%] text-left font-normal`}>Year No</th>
                                                <th className={`${labelCell} w-[15%] text-left font-normal`}>Insurance Amount *</th>
                                                <th className={`${labelCell} w-[15%] text-left font-normal`}>TPL Amount</th>
                                                <th className={`${labelCell} w-[15%] text-left font-normal`}>TLO CP *</th>
                                                <th className={`${labelCell} w-[15%] text-left font-normal`}>CLAUSE</th>
                                                <th className={`${labelCell} w-[15%] text-left font-normal`}>Premium Receive *</th>
                                                <th className={`${labelCell} w-[15%] text-left font-normal`}>Premium Payment *</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row) => (
                                                <tr key={row.year}>
                                                    <td className={labelCell}>
                                                        <Box value={row.year} readOnly align="center" className="w-[53px]" />
                                                    </td>
                                                    <td className={labelCell}>
                                                        <Box kind="money" value={row.insAmt} readOnly className={wide} />
                                                    </td>
                                                    <td className={labelCell}>
                                                        <Dropdown
                                                            value={row.tplAmt}
                                                            onChange={(value) => setRowField(row.year, { tplAmt: value })}
                                                            options={tplOptions.map((v) => ({ value: v, label: v }))}
                                                            disabled={blocked}
                                                            placeholder={false}
                                                            className={`${wide} text-right`}
                                                        />
                                                    </td>
                                                    <td className={labelCell}>
                                                        <Dropdown
                                                            value={row.tloAr}
                                                            onChange={(value) => setRowField(row.year, { tloAr: value })}
                                                            options={tloOptions}
                                                            disabled={blocked}
                                                            placeholder={false}
                                                            className={wide}
                                                        />
                                                    </td>
                                                    <td className={labelCell}>
                                                        <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                                                            {CLAUSE_NAMES.filter((name) => row.clauseCodes[name]).map((name) => (
                                                                <label key={name} className="inline-flex items-center gap-1 text-sm">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={!!row.clauseSelected[name]}
                                                                        onChange={() => toggleClause(row.year, name)}
                                                                    />
                                                                    {name}
                                                                </label>
                                                            ))}
                                                        </span>
                                                    </td>
                                                    <td className={labelCell}>
                                                        <Box kind="money" value={row.prerAmt} readOnly className={wide} />
                                                    </td>
                                                    <td className={labelCell}>
                                                        <Box kind="money" value={row.prepAmt} readOnly className={wide} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </td>
                        </tr>

                        {!blocked && (
                            <tr>
                                <td colSpan={4} className="pt-4 text-center">
                                    <button
                                        type="button"
                                        onClick={handleCalculate}
                                        disabled={calculating}
                                        className={`mr-2 ${buttonClass}`}
                                    >
                                        {calculating ? "Calculating…" : "Calculate"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleClear()}
                                        className={buttonClass}
                                    >
                                        Clear
                                    </button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="min-w-0 overflow-x-auto">
                        <table className="w-full border-collapse border border-[var(--app-border)]">
                            <thead>
                                <tr>
                                    <th className={`${headCell} w-[18%]`}>&nbsp;</th>
                                    <th className={`${headCell} w-[18%]`}>Income</th>
                                    <th className={`${headCell} w-[18%]`}>Subsidy</th>
                                    <th className={`${headCell} w-[18%]`}>Total Income<br />(Include Subsidy)</th>
                                    <th className={`${headCell} w-[18%]`}>Base Rate</th>
                                    <th className={`${headCell} w-[18%]`}>Max Refund</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className={labelCell}>Insurance Income</td>
                                    <td className={valueCell}><Box kind="money" value={summary.ttlIncome} readOnly className={cellBox} /></td>
                                    <td className={greyCell} rowSpan={2} />
                                    <td className={greyCell} />
                                    <td className={valueCell}><Box kind="money" value={summary.baseInc} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.execInc} readOnly className={cellBox} /></td>
                                </tr>
                                <tr>
                                    <td className={labelCell}>Net Insurance Prem. Received</td>
                                    <td className={valueCell}><Box kind="money" value={summary.ttlIncomeNet} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.ttlSubIncNet} readOnly className={cellBox} /></td>
                                    <td className={greyCell} />
                                    <td className={greyCell} />
                                </tr>
                                <tr>
                                    <td className={labelCell}>Survey Fee 1</td>
                                    <td className={valueCell}><Box kind="money" value={summary.survInc} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.subSurv} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.ttlSurv} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.baseSurv} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.exceSurv} readOnly className={cellBox} /></td>
                                </tr>
                                <tr>
                                    <td className={labelCell}>Survey Fee 2</td>
                                    <td className={valueCell}><Box kind="money" value={summary.survInc2} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.subSurv2} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.ttlSurv2} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.baseSurv2} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.exceSurv2} readOnly className={cellBox} /></td>
                                </tr>
                                <tr>
                                    <td className={labelCell}>Provision Fee</td>
                                    <td className={valueCell}><Box kind="money" value={summary.provInc} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.subProv} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.ttlProv} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.provBase} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.provExec} readOnly className={cellBox} /></td>
                                </tr>
                                <tr>
                                    <td className={labelCell}>Interest Income</td>
                                    <td className={valueCell}><Box kind="money" value={summary.interestIncome} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.subInt} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.ttlInt} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.baseInterest} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.excInt} readOnly className={cellBox} /></td>
                                </tr>
                                <tr>
                                    <td className={labelCell} colSpan={2}>Total</td>
                                    <td className={valueCell}><Box kind="money" value={summary.subsidyTotal} readOnly className={cellBox} /></td>
                                    <td className={valueCell}><Box kind="money" value={summary.ttlSubTot} readOnly className={`${cellBox} font-bold`} /></td>
                                    <td className={greyCell} />
                                    <td className={valueCell}><Box kind="money" value={summary.ttlExcTot} readOnly className={`${cellBox} font-bold`} /></td>
                                </tr>
                                <tr>
                                    <td className={labelCell} colSpan={3}>Incentive to 3rd Party {summary.percentage}%</td>
                                    <td className={valueCell}><Box kind="money" value={summary.maxComm} readOnly className={`${cellBox} font-bold`} /></td>
                                </tr>
                                <tr>
                                    <td className={labelCell} colSpan={3}>Marketing Fee</td>
                                    <td className={valueCell}><Box kind="money" value={summary.marketingFee} readOnly className={`${cellBox} font-bold`} /></td>
                                </tr>
                                <tr>
                                    <td className={labelCell} colSpan={5}>Incentive To Be Paid</td>
                                    <td className={valueCell}><Box kind="money" value={summary.eligibleComm} readOnly className={`${cellBox} font-bold`} /></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="min-w-0" />
                </div>

                {saving && (
                    <p className="mt-3 text-right text-sm text-[var(--app-muted)]">Please wait…</p>
                )}

                {(messages.length > 0 || blocked) && (
                    <div className="message mt-3 space-y-1">
                        {messages.map((line, i) => (
                            <p key={i} className="text-sm text-red-600">{line}</p>
                        ))}
                        {blocked && <p className="text-sm text-red-600">{loadError}</p>}
                    </div>
                )}
            </div>
        </div>
    );
});

export default CAMFinancingInsurancePage;
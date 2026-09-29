import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import api from '@/shared/api/axiosInstance';

export interface CAMFinancingOutstandingPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

interface AmountRow {
	unit: number;
	amount: number;
}

interface ExposureSummary {
	disbursement: AmountRow;
	undisbursement: AmountRow;
	unapprove: AmountRow;
	group: AmountRow;
	guarantor: AmountRow;
	total: AmountRow;
}

interface DetailRow {
	no: number;
	contractNo: string | null;
	leaseKey?: string | null;
	brandType: string | null;
	carYear: number | string | null;
	marketPrice: number;
	outstandingPrincipal: number;
	installmentPerMonth: number;
	term: number | string | null;
	tenor: number | string | null;
	paymentStatus?: string | null;
	paymentStatusText?: string | null;
	userOfCar: string | null;
	loanRatio: number;
	branch: string | null;
	remark?: string | null;
	consLeas?: string | null;
}

interface SubTotal {
	marketPrice: number;
	outstandingPrincipal: number;
	installmentPerMonth: number;
	loanRatioPct: number;
}

interface SimpleSection {
	rows: DetailRow[];
	subTotal: SubTotal;
}

interface DisbursementSection extends SimpleSection {
	crossCollateral: {
		cross: SubTotal;
		nonCross: SubTotal;
		totalExposure: SubTotal;
	};
	financeTypeBreakdown: {
		leasing: { outstandingPrincipal: number; units: number };
		consumerFinance: { outstandingPrincipal: number; units: number };
		installmentFinancing: { outstandingPrincipal: number; units: number };
		financeLease: { outstandingPrincipal: number; units: number };
		saleLeaseback: { outstandingPrincipal: number; units: number };
	};
}

interface GrandTotals {
	disUndisUnapp: SubTotal;
	all: SubTotal | null;
}

interface OutstandingView {
	blocked?: boolean;
	message?: string;
	calcDate: string | null;
	notes: string;
	summary: ExposureSummary;
	disbursement: DisbursementSection;
	undisbursement: SimpleSection;
	unapprove: SimpleSection;
	group: SimpleSection;
	guarantor: SimpleSection;
	grandTotal: GrandTotals;
}

const PAYMENT_STATUS_OPTIONS: [string, string][] = [["medium", "Medium"], ["Good", "Good"]];

function num(value: unknown) {
	if (value === null || value === undefined || value === "") return 0;
	const cleaned = String(value).replace(/,/g, "").replace(/[^0-9.-]/g, "");
	const parsed = Number(cleaned);
	return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(value: number | string | null | undefined) {
	const parsed = typeof value === "number" ? value : num(value);
	if (!Number.isFinite(parsed)) return "0";
	const negative = parsed < 0;
	const digits = Math.abs(Math.round(parsed)).toString();
	const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return negative ? `-${grouped}` : grouped;
}

function pct(value: number | null | undefined) {
	if (value === undefined || value === null || !Number.isFinite(value)) return "0.00";
	const negative = value < 0;
	const fixed = Math.abs(value).toFixed(2);
	const [whole, decimals] = fixed.split(".");
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	return `${negative ? "-" : ""}${grouped}.${decimals}`;
}

function formatDate(iso: string | null) {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	const dd = String(d.getDate()).padStart(2, "0");
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	return `${dd}-${mm}-${d.getFullYear()}`;
}

function matchPaymentStatus(value: string | null | undefined) {
	return (value || "").toLowerCase() === "good" ? "Good" : "medium";
}

const headCell = "border border-black bg-[#0066FF] px-1 py-1 text-center text-xs font-bold text-white";
const cellBorder = "border border-[var(--app-border)] px-1.5 py-1 text-sm text-[var(--app-text)]";
const subTotalCell = "border border-[var(--app-border)] bg-[#0066FF] px-1.5 py-1 text-sm font-bold text-white";
const boxClass = "h-7 rounded border border-[var(--app-border)] bg-[var(--app-card)] px-1.5 text-sm text-[var(--app-text)] read-only:bg-[var(--app-surface)] read-only:text-[var(--app-muted)]";
const selectClass = "h-7 rounded border border-[var(--app-border)] bg-white px-1.5 text-sm text-[var(--app-text)] [&>option]:bg-white";
const buttonClass = "rounded border border-[#CC5200] bg-[#FF6600] px-4 py-1 text-sm text-white hover:bg-[#E65C00] disabled:opacity-50";
const rowLabel = "whitespace-nowrap py-[3px] pr-3 align-middle text-sm text-[var(--app-text)]";
const rowValue = "py-[3px] pr-3 align-middle";

function MoneyInput({
	value,
	readOnly,
	onChange,
	className = "",
}: {
	value: number;
	readOnly?: boolean;
	onChange?: (value: number) => void;
	className?: string;
}) {
	const [draft, setDraft] = useState<string | null>(null);
	return (
		<input
			type="text"
			inputMode="numeric"
			readOnly={readOnly}
			value={draft ?? fmt(value)}
			onFocus={() => {
				if (readOnly) return;
				setDraft(String(Math.round(value)));
			}}
			onChange={(e) => {
				if (readOnly) return;
				const next = e.target.value.replace(/[^0-9-]/g, "");
				setDraft(next);
				onChange?.(num(next));
			}}
			onBlur={() => {
				if (readOnly) return;
				setDraft(null);
			}}
			className={`${boxClass} text-right ${className}`}
		/>
	);
}

function PaymentStatusCell({
	row,
	onChange,
}: {
	row: DetailRow;
	onChange: (patch: Partial<DetailRow>) => void;
}) {
	return (
		<td className={cellBorder}>
			<span className="flex flex-col gap-1">
				<input
					type="text"
					value={row.paymentStatusText ?? row.paymentStatus ?? ""}
					onChange={(e) => onChange({ paymentStatusText: e.target.value })}
					className={`${boxClass} w-[120px] text-left`}
				/>
				<select
					value={matchPaymentStatus(row.paymentStatus)}
					onChange={(e) => onChange({ paymentStatus: e.target.value })}
					className={`${selectClass} w-[120px]`}
				>
					{PAYMENT_STATUS_OPTIONS.map(([value, label]) => (
						<option key={value} value={value}>{label}</option>
					))}
				</select>
			</span>
		</td>
	);
}

const CAMFinancingOutstandingPage = forwardRef<CamTabHandle, CAMFinancingOutstandingPageProps>(function CAMFinancingOutstandingPage({ apless, applNo, finType, custName, onSaved }, ref) {
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [view, setView] = useState<OutstandingView | null>(null);
	const [notes, setNotes] = useState("");

	const [disRows, setDisRows] = useState<DetailRow[]>([]);
	const [undisRows, setUndisRows] = useState<DetailRow[]>([]);
	const [unappRows, setUnappRows] = useState<DetailRow[]>([]);
	const [groupRows, setGroupRows] = useState<DetailRow[]>([]);
	const [guaRows, setGuaRows] = useState<DetailRow[]>([]);

	const [calculating, setCalculating] = useState(false);
	const [calcError, setCalcError] = useState("");
	const [advancing, setAdvancing] = useState(false);
	const [nextErrors, setNextErrors] = useState<string[]>([]);

	const applyView = (d: OutstandingView) => {
		const seed = (rows: DetailRow[]) =>
			(rows || []).map((r) => ({ ...r, paymentStatusText: r.paymentStatus ?? "" }));
		setView(d);
		setNotes(d.notes || "");
		setDisRows(seed(d.disbursement.rows));
		setUndisRows(seed(d.undisbursement.rows));
		setUnappRows(seed(d.unapprove.rows));
		setGroupRows(seed(d.group.rows));
		setGuaRows(seed(d.guarantor.rows));
	};

	const load = useCallback(async () => {
		setLoading(true);
		setLoadError("");
		try {
			const res = await api.get("/CAM/EditIndex/outstanding", { params: { apless, applno: applNo } });
			if (res.data.blocked) {
				setLoadError(res.data.message || "This application cannot be edited right now.");
				return;
			}
			applyView(res.data);
		} catch {
			setLoadError("Failed to load Outstanding. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [apless, applNo]);

	useEffect(() => {
		load();
	}, [load]);

	const handleCalculate = async () => {
		setCalculating(true);
		setCalcError("");
		setNextErrors([]);
		try {
			const res = await api.post("/CAM/EditIndex/outstanding/calculate", { apless, applno: applNo, notes });
			if (res.data.success === false) {
				setCalcError(res.data.message || "Calculation failed. Please try again.");
				return;
			}
			applyView(res.data);
		} catch (err: any) {
			setCalcError(err?.response?.data?.message || "Calculation failed. Please try again.");
		} finally {
			setCalculating(false);
		}
	};

	const handleNext = useCallback(async () => {
		setNextErrors([]);
		const warning =
			[...disRows, ...undisRows, ...unappRows, ...groupRows, ...guaRows]
				.some((r) => num(r.marketPrice) < 1);
		setAdvancing(true);
		try {
			const res = await api.post("/CAM/EditIndex/outstanding/next", {
				apless,
				applno: applNo,
				notes,
				disbursementRows: disRows,
				undisbursementRows: undisRows,
				unapproveRows: unappRows,
				groupRows,
				guarantorRows: guaRows,
			});
			const reported = res.data.success
				? []
				: String(res.data.message || "Please try again.").split("<br>").filter(Boolean);
			if (warning) reported.unshift("Market Price must not be 0 or empty");
			setNextErrors(reported.filter((m, i) => reported.indexOf(m) === i));
			if (res.data.success && !warning) {
				onSaved({ apless, applno: applNo });
			}
		} catch (err: any) {
			setNextErrors([err?.response?.data?.message || "Save failed. Please try again."]);
		} finally {
			setAdvancing(false);
		}
	}, [apless, applNo, notes, disRows, undisRows, unappRows, groupRows, guaRows, onSaved]);

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
	if (!view) return null;

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="rounded-2xl bg-[var(--app-card)] p-6 shadow">
			<div className="judul mb-3 border-b border-[var(--app-border)] pb-2">
				<div className="flex items-end justify-between">
					<strong className="text-sm font-bold text-[var(--app-text)]">Outstanding</strong>
					{judul && <span className="judul1 text-xs font-semibold text-blue-500">{judul}</span>}
				</div>
			</div>

			<div className="flex justify-center">
				<table className="border-collapse">
					<tbody>
						<tr>
							<td className={rowLabel}>&nbsp;</td>
							<td className="py-[3px] pr-3 text-center text-sm font-bold text-[var(--app-text)]" colSpan={2}>
								OUTSTANDING EXPOSURE
							</td>
						</tr>
						<tr>
							<td className={rowLabel}>Outstanding</td>
							<td className="py-[3px] pr-3 text-center text-sm font-bold text-[var(--app-text)]">Unit</td>
							<td className="py-[3px] pr-3 text-center text-sm font-bold text-[var(--app-text)]">Amount</td>
						</tr>
						<ExposureRow label="Disbursement" row={view.summary.disbursement} />
						<ExposureRow label="Undisbursement" row={view.summary.undisbursement} />
						<ExposureRow label="Unapprove" row={view.summary.unapprove} />
						<ExposureRow label="Group" row={view.summary.group} />
						<ExposureRow label="Guarantor" row={view.summary.guarantor} />
						<tr>
							<td className={rowLabel}>&nbsp;</td>
							<td className={rowValue}>&nbsp;</td>
							<td className={rowValue}>&nbsp;</td>
						</tr>
						<ExposureRow label="Total" row={view.summary.total} />
						<tr>
							<td className={rowLabel}>Calculation Date</td>
							<td className="py-[3px] pr-3 text-sm text-[var(--app-text)]" colSpan={2}>
								{formatDate(view.calcDate)}
							</td>
						</tr>
						<tr>
							<td className="py-3 text-center" colSpan={3}>
								<button type="button" onClick={handleCalculate} disabled={calculating} className={buttonClass}>
									{calculating ? "Calculating…" : "Calculate"}
								</button>
							</td>
						</tr>
						<tr>
							<td className={`${rowLabel} align-top`}>Outstanding Notes</td>
							<td className={rowValue} colSpan={2}>
								<textarea
									id="outstand_notes"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									rows={3}
									className="w-[300px] rounded border border-[var(--app-border)] bg-[var(--app-card)] px-1.5 py-1 text-sm text-[var(--app-text)]"
								/>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			{calcError && <p className="mt-2 text-center text-sm text-red-600">{calcError}</p>}

			{disRows.length > 0 && <DisbursementTable rows={disRows} setRows={setDisRows} section={view.disbursement} />}

			{undisRows.length > 0 && (
				<SimpleDetailTable
					title="Undisbursement"
					showCustomerRecords
					contractNoLabel="Contract No / Cam No"
					rows={undisRows}
					setRows={setUndisRows}
					subTotal={view.undisbursement.subTotal}
					showPaymentStatus
					marketPriceReadOnly={false}
				/>
			)}

			{unappRows.length > 0 && (
				<SimpleDetailTable
					title="Unapprove"
					contractNoLabel="Cam No"
					rows={unappRows}
					setRows={setUnappRows}
					subTotal={view.unapprove.subTotal}
					showPaymentStatus={false}
					showFinanceType
					marketPriceReadOnly
				/>
			)}

			<GrandTotalTable title="Grand Total" totals={view.grandTotal.disUndisUnapp} />

			{groupRows.length > 0 && (
				<SimpleDetailTable
					title="Group"
					contractNoLabel="Cam / Contract No"
					rows={groupRows}
					setRows={setGroupRows}
					subTotal={view.group.subTotal}
					showPaymentStatus
					marketPriceReadOnly={false}
				/>
			)}

			{guaRows.length > 0 && (
				<SimpleDetailTable
					title="Guarantor"
					contractNoLabel="Cam / Contract No"
					rows={guaRows}
					setRows={setGuaRows}
					subTotal={view.guarantor.subTotal}
					showPaymentStatus
					marketPriceReadOnly={false}
				/>
			)}

			{view.grandTotal.all && <GrandTotalTable title="Grand Total" totals={view.grandTotal.all} />}

			<RemarksLegend />

			{nextErrors.length > 0 && (
				<div className="message mt-3">
					{nextErrors.map((e, i) => (
						<p key={i} className="text-sm text-red-600">{e}</p>
					))}
				</div>
			)}
			{advancing && <p className="mt-3 text-right text-sm text-[var(--app-muted)]">Please wait…</p>}
		</div>
	);
});

export default CAMFinancingOutstandingPage;

function ExposureRow({ label, row }: { label: string; row: AmountRow }) {
	return (
		<tr>
			<td className={rowLabel}>{label}</td>
			<td className={rowValue}>
				<MoneyInput value={row.unit} readOnly className="w-[110px]" />
			</td>
			<td className={rowValue}>
				<MoneyInput value={row.amount} readOnly className="w-[200px]" />
			</td>
		</tr>
	);
}

function DisbursementTable({
	rows,
	setRows,
	section,
}: {
	rows: DetailRow[];
	setRows: (rows: DetailRow[]) => void;
	section: DisbursementSection;
}) {
	const updateRow = (no: number, patch: Partial<DetailRow>) => {
		setRows(rows.map((r) => (r.no === no ? { ...r, ...patch } : r)));
	};

	return (
		<div className="mt-6">
			<p className="text-center text-sm font-bold text-[var(--app-text)]">Customer Records (For Repeat Order Customer)</p>
			<p className="mt-2 text-sm font-bold text-[var(--app-text)]">Disbursement</p>
			<div className="mt-2 overflow-x-auto">
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<th className={`${headCell} w-[3%]`}>No.</th>
							<th className={`${headCell} w-[9%]`}>Contract No</th>
							<th className={`${headCell} w-[12%]`}>Brand/ Type</th>
							<th className={`${headCell} w-[6%]`}>Car Year</th>
							<th className={`${headCell} w-[10%]`}>Market Price</th>
							<th className={`${headCell} w-[11%]`}>Outstanding Principal</th>
							<th className={`${headCell} w-[11%]`}>Installment/ Month</th>
							<th className={`${headCell} w-[7%]`}>Terms</th>
							<th className={`${headCell} w-[10%]`}>Payment Status</th>
							<th className={`${headCell} w-[11%]`}>User of Car</th>
							<th className={`${headCell} w-[10%]`}>Loan Ratio (%)</th>
							<th className={`${headCell} w-[6%]`}>Branch</th>
							<th className={`${headCell} w-[15%]`}>Remark</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr key={row.no}>
								<td className={`${cellBorder} text-center`}>{row.no}</td>
								<td className={cellBorder}>{row.contractNo}</td>
								<td className={cellBorder}>{row.brandType}</td>
								<td className={`${cellBorder} text-right`}>{row.carYear}</td>
								<td className={cellBorder}>
									<MoneyInput
										value={num(row.marketPrice)}
										onChange={(v) => updateRow(row.no, { marketPrice: v })}
										className="w-[90%]"
									/>
								</td>
								<td className={`${cellBorder} text-right`}>{fmt(row.outstandingPrincipal)}</td>
								<td className={`${cellBorder} text-right`}>{fmt(row.installmentPerMonth)}</td>
								<td className={`${cellBorder} text-center`}>{row.term ?? ""} of {row.tenor}</td>
								<PaymentStatusCell row={row} onChange={(patch) => updateRow(row.no, patch)} />
								<td className={cellBorder}>{row.userOfCar}</td>
								<td className={`${cellBorder} text-right`}>{pct(row.loanRatio)}</td>
								<td className={`${cellBorder} text-right`}>{row.branch}</td>
								<td className={`${cellBorder} text-right`}>{row.remark}</td>
							</tr>
						))}
						<tr>
							<td className={subTotalCell} colSpan={4}>Sub Total</td>
							<td className={`${subTotalCell} text-right`}>{fmt(section.subTotal.marketPrice)}</td>
							<td className={`${subTotalCell} text-right`}>{fmt(section.subTotal.outstandingPrincipal)}</td>
							<td className={`${subTotalCell} text-right`}>{fmt(section.subTotal.installmentPerMonth)}</td>
							<td className={subTotalCell}>&nbsp;</td>
							<td className={subTotalCell}>&nbsp;</td>
							<td className={subTotalCell}>&nbsp;</td>
							<td className={`${subTotalCell} text-right`}>{pct(section.subTotal.loanRatioPct)}</td>
							<td className={subTotalCell}>&nbsp;</td>
							<td className={subTotalCell}>&nbsp;</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div className="mt-4 overflow-x-auto">
				<table className="w-[65%] border-collapse">
					<thead>
						<tr>
							<th className={`${headCell} w-[35%]`} colSpan={3}>&nbsp;</th>
							<th className={headCell}>Market Price</th>
							<th className={headCell}>Outstanding Principal</th>
							<th className={headCell}>Installment/ Month</th>
							<th className={`${headCell} whitespace-nowrap`}>Loan Ratio</th>
						</tr>
					</thead>
					<tbody>
						<BreakdownRow label="Total Cross Collateral Customer" totals={section.crossCollateral.cross} />
						<BreakdownRow label="Total non Cross Collateral Customer" totals={section.crossCollateral.nonCross} />
						<BreakdownRow label="Total Exposure Customer" totals={section.crossCollateral.totalExposure} />
						<FinanceTypeRow label="Leasing" data={section.financeTypeBreakdown.leasing} />
						<FinanceTypeRow label="Consumer Finance" data={section.financeTypeBreakdown.consumerFinance} />
						<FinanceTypeRow label="Installment Financing" data={section.financeTypeBreakdown.installmentFinancing} />
						<FinanceTypeRow label="Finance Lease" data={section.financeTypeBreakdown.financeLease} />
						<FinanceTypeRow label="Sale &amp; Leaseback" data={section.financeTypeBreakdown.saleLeaseback} />
					</tbody>
				</table>
			</div>
		</div>
	);
}

function BreakdownRow({ label, totals }: { label: string; totals: SubTotal }) {
	return (
		<tr>
			<td className={cellBorder} colSpan={3}>{label}</td>
			<td className={`${cellBorder} text-right`}>{fmt(totals.marketPrice)}</td>
			<td className={`${cellBorder} text-right`}>{fmt(totals.outstandingPrincipal)}</td>
			<td className={`${cellBorder} text-right`}>{fmt(totals.installmentPerMonth)}</td>
			<td className={`${cellBorder} text-right`}>{pct(totals.loanRatioPct)}</td>
		</tr>
	);
}

function FinanceTypeRow({ label, data }: { label: string; data: { outstandingPrincipal: number; units: number } }) {
	return (
		<tr>
			<td className={cellBorder} colSpan={4}>{label}</td>
			<td className={`${cellBorder} text-right`}>{fmt(data.outstandingPrincipal)}</td>
			<td className={`${cellBorder} text-right`}>{data.units} Unit</td>
			<td className={cellBorder}>&nbsp;</td>
		</tr>
	);
}

function SimpleDetailTable({
	title,
	contractNoLabel,
	rows,
	setRows,
	subTotal,
	showPaymentStatus,
	showFinanceType,
	marketPriceReadOnly,
	showCustomerRecords,
}: {
	title: string;
	contractNoLabel: string;
	rows: DetailRow[];
	setRows: (rows: DetailRow[]) => void;
	subTotal: SubTotal;
	showPaymentStatus: boolean;
	showFinanceType?: boolean;
	marketPriceReadOnly: boolean;
	showCustomerRecords?: boolean;
}) {
	const updateRow = (no: number, patch: Partial<DetailRow>) => {
		setRows(rows.map((r) => (r.no === no ? { ...r, ...patch } : r)));
	};

	return (
		<div className="mt-6">
			{showCustomerRecords && (
				<p className="text-center text-sm font-bold text-[var(--app-text)]">Customer Records (For Repeat Order Customer)</p>
			)}
			<p className="mt-2 text-sm font-bold text-[var(--app-text)]">{title}</p>
			<div className="mt-2 overflow-x-auto">
				<table className="w-full border-collapse">
					<thead>
						<tr>
							<th className={`${headCell} w-[3%]`}>No</th>
							<th className={`${headCell} w-[7%]`}>{contractNoLabel}</th>
							<th className={`${headCell} w-[12%]`}>Brand/Type</th>
							<th className={`${headCell} w-[6%]`}>Car Year</th>
							<th className={`${headCell} w-[11%]`}>Market Price</th>
							<th className={`${headCell} w-[9%]`}>Outstanding Principal</th>
							<th className={`${headCell} w-[9%]`}>Installment/ Month</th>
							<th className={`${headCell} w-[6%]`}>Terms</th>
							{showPaymentStatus && <th className={`${headCell} w-[13%]`}>Payment Status</th>}
							<th className={`${headCell} w-[16%]`}>User of Car</th>
							<th className={`${headCell} w-[8%]`}>Loan Ratio (%)</th>
							<th className={`${headCell} w-[6%]`}>Branch</th>
							{showFinanceType && <th className={`${headCell} w-[8%]`}>Finance Type</th>}
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => (
							<tr key={row.no}>
								<td className={`${cellBorder} text-center`}>{row.no}</td>
								<td className={cellBorder}>{row.contractNo}</td>
								<td className={cellBorder}>{row.brandType}</td>
								<td className={`${cellBorder} text-right`}>{row.carYear}</td>
								<td className={cellBorder}>
									<MoneyInput
										value={num(row.marketPrice)}
										readOnly={marketPriceReadOnly}
										onChange={(v) => updateRow(row.no, { marketPrice: v })}
										className="w-[90%]"
									/>
								</td>
								<td className={`${cellBorder} text-right`}>{fmt(row.outstandingPrincipal)}</td>
								<td className={`${cellBorder} text-right`}>{fmt(row.installmentPerMonth)}</td>
								<td className={`${cellBorder} text-center`}>{row.term ?? ""} of {row.tenor}</td>
								{showPaymentStatus && <PaymentStatusCell row={row} onChange={(patch) => updateRow(row.no, patch)} />}
								<td className={cellBorder}>{row.userOfCar}</td>
								<td className={`${cellBorder} text-right`}>{pct(row.loanRatio)}</td>
								<td className={`${cellBorder} text-right`}>{row.branch}</td>
								{showFinanceType && <td className={`${cellBorder} text-center`}>{row.consLeas}</td>}
							</tr>
						))}
						<tr>
							<td className={subTotalCell} colSpan={4}>Sub Total</td>
							<td className={`${subTotalCell} text-right`}>{fmt(subTotal.marketPrice)}</td>
							<td className={`${subTotalCell} text-right`}>{fmt(subTotal.outstandingPrincipal)}</td>
							<td className={`${subTotalCell} text-right`}>{fmt(subTotal.installmentPerMonth)}</td>
							<td className={subTotalCell}>&nbsp;</td>
							{showPaymentStatus && <td className={subTotalCell}>&nbsp;</td>}
							<td className={subTotalCell}>&nbsp;</td>
							<td className={`${subTotalCell} text-right`}>{pct(subTotal.loanRatioPct)}</td>
							<td className={subTotalCell}>&nbsp;</td>
							{showFinanceType && <td className={subTotalCell}>&nbsp;</td>}
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}

function GrandTotalTable({ title, totals }: { title: string; totals: SubTotal }) {
	return (
		<div className="mt-4 overflow-x-auto">
			<table className="w-[50%] border-collapse">
				<thead>
					<tr>
						<th className={`${headCell} w-[25%]`} colSpan={3}>&nbsp;</th>
						<th className={headCell}>Market Price</th>
						<th className={headCell}>Outstanding Principal</th>
						<th className={headCell}>Installment/ Month</th>
						<th className={headCell}>Loan Ratio</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td className={cellBorder} colSpan={3}>{title}</td>
						<td className={`${cellBorder} text-right`}>{fmt(totals.marketPrice)}</td>
						<td className={`${cellBorder} text-right`}>{fmt(totals.outstandingPrincipal)}</td>
						<td className={`${cellBorder} text-right`}>{fmt(totals.installmentPerMonth)}</td>
						<td className={`${cellBorder} text-right`}>{pct(totals.loanRatioPct)}</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}

function RemarksLegend() {
	const items: [string, string][] = [
		["F", "Finance Lease (FL)"],
		["I", "Installment Financing (IF)"],
		["S", "Sale & Leaseback (SL)"],
		["D", "Fund Facility (FD)"],
		["M", "Business Capital Facility (FMU)"],
	];
	return (
		<div className="mt-6">
			<table className="border-collapse">
				<tbody>
					<tr>
						<td className="py-[2px] pr-2 text-sm text-[var(--app-text)]" colSpan={3}>Remark for Finance Type :</td>
					</tr>
					{items.map(([code, label]) => (
						<tr key={code}>
							<td className="py-[2px] pr-2 text-sm text-[var(--app-text)]">- {code}</td>
							<td className="py-[2px] pr-2 text-sm text-[var(--app-text)]">=</td>
							<td className="py-[2px] pr-2 text-sm text-[var(--app-text)]">{label}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
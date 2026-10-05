import { useCallback, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import type { ReactNode } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

export interface CAMSurveyPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	indCor?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

interface LookupOption {
	value: string;
	label: string;
}

interface Lookups {
	creditHistory: LookupOption[];
	reference: LookupOption[];
	workExp: LookupOption[];
	dp: LookupOption[];
	sourceOfFund: LookupOption[];
	businessSize?: LookupOption[];
	livingType?: LookupOption[];
	livingStatusHouse?: LookupOption[];
	livingStatusApartment?: LookupOption[];
	carOwnership?: LookupOption[];
	spouseJob?: LookupOption[];
	paymentMethod?: LookupOption[];
	companyStatus?: LookupOption[];
	businessScale?: LookupOption[];
	businessLocation?: LookupOption[];
	unitOwned?: LookupOption[];
	unitFree?: LookupOption[];
	netProfitRatio?: LookupOption[];
	estimatedAsset?: LookupOption[];
}

interface IndividualForm {
	creditHis: string;
	reference: string;
	workExp: string;
	businessSize: string;
	businessSizeDisabled: boolean;
	noteChar: string;
	living: string;
	livingSts: string;
	carOwn: string;
	deposit: boolean;
	bankStat: boolean;
	depositAmt: number;
	bankStatAmt: string;
	noteCapital: string;
	fixInc: number;
	fixIncSource: string;
	fixIncSourceOther: string;
	spouseMaritalDisabled: boolean;
	spouseJob: string;
	spouseIncome: number;
	totOthInc: number;
	totOthIncSource: string;
	totOthIncSourceOther: string;
	totInc: number;
	totIncYear: number;
	totCredit: number;
	noteCapacity: string;
	dp: string;
	pmt: string;
	noteCollateral: string;
	noteSid: string;
}

interface CorporateForm {
	creditHis: string;
	reference: string;
	workExp: string;
	companyStatus: string;
	scale: string;
	businessSize: string;
	noteChar: string;
	businessLocation: string;
	unitOwned: string;
	unitFree: string;
	deposit: boolean;
	bankStat: boolean;
	bankStatDisabled: boolean;
	depositAmt: number;
	bankStatAmt: string;
	noteCapital: string;
	monthProfit: number;
	monthProfitSource: string;
	monthProfitSourceOther: string;
	monthSales: number;
	netProfit: string;
	totCredit: number;
	noteCapacity: string;
	dp: string;
	pmt: string;
	noteCollateral: string;
	noteSid: string;
	estimatedAsset: string;
	estimatedAssetAsOf: string | null;
}

interface SikDocument {
	subject: string | null;
	description: string | null;
	creditBureau: string | null;
	relatedParty: string | null;
	status: string | null;
	type: string | null;
	score: string | number | null;
	grade: string | null;
	downloadUrl: string | null;
}

interface SurveyView {
	blocked?: boolean;
	message?: string;
	apless: string;
	applno: string;
	indCor: string;
	showCreditHistory: boolean;
	showReference: boolean;
	lookups: Lookups;
	individual: IndividualForm | null;
	corporate: CorporateForm | null;
	sikCheckingDocuments: SikDocument[];
}

const OTHER_SOURCE_VALUE = "4";

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

const sectionTitle = "pt-3 text-sm font-bold text-[var(--app-text)]";
const rowLabel = "w-[25%] whitespace-nowrap py-[3px] pr-3 align-top text-sm text-[var(--app-text)]";
const rowValue = "w-[75%] py-[3px] pr-3 align-top text-sm text-[var(--app-text)]";
const boxClass = "h-7 rounded border border-[var(--app-border)] bg-[var(--app-card)] px-1.5 text-sm text-[var(--app-text)] read-only:bg-[var(--app-surface)] read-only:text-[var(--app-muted)] disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)]";
const selectClass = "h-7 rounded border border-[var(--app-border)] bg-white px-1.5 text-sm text-[var(--app-text)] [&>option]:bg-white disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)]";
const areaClass = "rounded border border-[var(--app-border)] bg-[var(--app-card)] px-1.5 py-1 text-sm text-[var(--app-text)]";
const buttonClass = "rounded border border-[#CC5200] bg-[#FF6600] px-4 py-1 text-sm text-white hover:bg-[#E65C00] disabled:opacity-50";

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
	return (
		<tr>
			<td className={rowLabel}>{label}</td>
			<td className={rowValue}>{children}</td>
		</tr>
	);
}

function SectionRow({ title }: { title: string }) {
	return (
		<tr>
			<td className={sectionTitle} colSpan={2}><strong>{title}</strong></td>
		</tr>
	);
}

function Dropdown({
	value,
	onChange,
	options,
	disabled,
	placeholder = "Select",
	className = "w-[260px]",
}: {
	value: string;
	onChange: (value: string) => void;
	options: LookupOption[];
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}) {
	return (
		<select
			value={value ?? ""}
			disabled={disabled}
			onChange={(e) => onChange(e.target.value)}
			className={`${selectClass} ${className}`}
		>
			<option value="">{placeholder}</option>
			{options.map((o) => (
				<option key={o.value} value={o.value}>{o.label}</option>
			))}
		</select>
	);
}

function Money({
	value,
	onChange,
	readOnly,
	className = "w-[140px]",
}: {
	value: number;
	onChange?: (value: number) => void;
	readOnly?: boolean;
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

function NoteArea({
	value,
	onChange,
	maxLength,
	className = "h-16 w-[400px]",
}: {
	value: string;
	onChange: (value: string) => void;
	maxLength?: number;
	className?: string;
}) {
	return (
		<textarea
			value={value ?? ""}
			maxLength={maxLength}
			onChange={(e) => onChange(e.target.value)}
			className={`${areaClass} ${className}`}
		/>
	);
}

function SikCheckingSection({ docs, noteSid, onNoteSid }: {
	docs: SikDocument[];
	noteSid: string;
	onNoteSid: (value: string) => void;
}) {
	return (
		<>
			<SectionRow title="SIK Checking Document" />
			<tr>
				<td className={rowLabel}>File</td>
				<td className={rowValue}>
					<table className="border-collapse">
						<tbody>
							{docs.map((doc, index) => (
								<SikDocumentRows key={index} doc={doc} />
							))}
						</tbody>
					</table>
				</td>
			</tr>
			<Row label="Note">
				<NoteArea value={noteSid} onChange={onNoteSid} maxLength={1000} className="h-[200px] w-full max-w-[930px]" />
			</Row>
		</>
	);
}

function SikDocumentRows({ doc }: { doc: SikDocument }) {
	const showRelatedParty = doc.subject === "RP";
	const showKeterangan = doc.relatedParty === "Other";
	const showType = (doc.relatedParty || "") !== "";
	return (
		<>
			<tr>
				<td className="py-[3px] pr-3 text-sm text-[var(--app-text)]">Subject</td>
				<td className="py-[3px] pr-3">
					<input type="text" value={doc.subject ?? ""} disabled className={`${boxClass} w-[133px]`} />
				</td>
				<td className="py-[3px] pr-3">
					{showRelatedParty && (
						<input type="text" value={doc.relatedParty ?? ""} disabled className={`${boxClass} w-[133px]`} />
					)}
				</td>
				<td className="py-[3px] pr-3">
					{showKeterangan && (
						<input type="text" value={doc.description ?? ""} disabled className={`${boxClass} w-[133px]`} />
					)}
					{showType && (
						<input type="text" value={doc.type ?? ""} disabled className={`${boxClass} ml-1 w-[133px]`} />
					)}
				</td>
			</tr>
			<tr>
				<td className="py-[3px] pr-3 text-sm text-[var(--app-text)]">Credit Bureau</td>
				<td className="py-[3px] pr-3">
					<input type="text" value={doc.creditBureau ?? ""} disabled className={`${boxClass} w-[133px]`} />
				</td>
				<td className="py-[3px] pr-3 text-sm text-[var(--app-text)]">Status</td>
				<td className="py-[3px] pr-3">
					<input type="text" value={doc.status ?? ""} disabled className={`${boxClass} w-[133px]`} />
				</td>
			</tr>
			<tr>
				<td className="py-[3px] pr-3 text-sm text-[var(--app-text)]">Score</td>
				<td className="py-[3px] pr-3">
					<input type="text" value={doc.score ?? ""} disabled className={`${boxClass} w-[133px]`} />
				</td>
				<td className="py-[3px] pr-3 text-sm text-[var(--app-text)]">Grade</td>
				<td className="py-[3px] pr-3">
					<input type="text" value={doc.grade ?? ""} disabled className={`${boxClass} w-[133px]`} />
				</td>
			</tr>
			<tr>
				<td className="py-[3px] pr-3" colSpan={4}>
					{doc.downloadUrl && (
						<a href={doc.downloadUrl} target="_blank" rel="noreferrer" className={`${buttonClass} inline-block`}>
							Download
						</a>
					)}
				</td>
			</tr>
			<tr>
				<td className="py-2" colSpan={4}>&nbsp;</td>
			</tr>
		</>
	);
}

const CAMSurveyPage = forwardRef<CamTabHandle, CAMSurveyPageProps>(function CAMSurveyPage({ apless, applNo, finType, custName, indCor, onSaved }, ref) {
	const [view, setView] = useState<SurveyView | null>(null);
	const [ind, setInd] = useState<IndividualForm | null>(null);
	const [corp, setCorp] = useState<CorporateForm | null>(null);
	const [saving, setSaving] = useState(false);
	const [messages, setMessages] = useState<string[]>([]);

	const { data, isLoading: loading, isError } = useQuery({
		queryKey: ['cam-survey', apless, applNo, indCor],
		queryFn: async (): Promise<SurveyView> => {
			const res = await api.get("/CAM/EditIndex/survey", {
				params: { apless, applno: applNo, indCor: indCor || "" },
			});
			return res.data;
		},
	});

	useEffect(() => {
		if (!data || data.blocked) return;
		setView(data);
		setInd(data.individual || null);
		setCorp(data.corporate || null);
	}, [data]);

	const setIndField = <K extends keyof IndividualForm>(key: K, value: IndividualForm[K]) =>
		setInd((prev) => (prev ? { ...prev, [key]: value } : prev));

	const setCorpField = <K extends keyof CorporateForm>(key: K, value: CorporateForm[K]) =>
		setCorp((prev) => (prev ? { ...prev, [key]: value } : prev));

	const handleNext = useCallback(async () => {
		setSaving(true);
		setMessages([]);
		try {
			const res = await api.post("/CAM/EditIndex/survey/next", {
				apless,
				applno: applNo,
				indCor: indCor || "",
				individual: ind,
				corporate: corp,
			});
			if (res.data.success) {
				onSaved({ apless, applno: applNo });
			} else {
				setMessages(String(res.data.message || "Failed to save survey.").split("<br>").filter(Boolean));
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages([body?.message || body?.error || "Failed to save survey."]);
		} finally {
			setSaving(false);
		}
	}, [apless, applNo, indCor, ind, corp, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

	const livingStatusOptions = useMemo(() => {
		if (!view || !ind) return [];
		if (ind.living === "1") return view.lookups.livingStatusHouse || [];
		if (ind.living === "2") return view.lookups.livingStatusApartment || [];
		return [];
	}, [view, ind]);

	const totalIncome = useMemo(() => {
		if (!ind) return 0;
		return num(ind.fixInc) + num(ind.totOthInc) + num(ind.spouseIncome);
	}, [ind]);

	const netProfitRatio = useMemo(() => {
		if (!corp) return "";
		const sales = num(corp.monthSales);
		if (!sales) return "";
		const ratio = (num(corp.monthProfit) / sales) * 100;
		if (ratio > 30) return "1";
		if (ratio >= 10) return "2";
		return "3";
	}, [corp]);

	useEffect(() => {
		if (!ind) return;
		const year = totalIncome * 12;
		if (num(ind.totInc) === totalIncome && num(ind.totIncYear) === year) return;
		setInd((prev) => (prev ? { ...prev, totInc: totalIncome, totIncYear: year } : prev));
	}, [totalIncome, ind]);

	useEffect(() => {
		if (!corp || !netProfitRatio) return;
		if (corp.netProfit === netProfitRatio) return;
		setCorp((prev) => (prev ? { ...prev, netProfit: netProfitRatio } : prev));
	}, [netProfitRatio, corp]);

	if (loading) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-[var(--app-muted)]">Loading…</p>
			</div>
		);
	}
	if (isError) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-red-600">Failed to load Survey. Please try again.</p>
			</div>
		);
	}
	if (data?.blocked) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-red-600">
					{data.message || "The Application is on approval process or has finished. The Data cannot be changed"}
				</p>
			</div>
		);
	}
	if (!view) return null;

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");
	const lookups = view.lookups;
	const avgIncomeCorp = corp ? num(corp.monthSales) * 12 : 0;

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
			<div className="flex items-center gap-2.5">
			<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
			<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
			<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
			</svg>
			</span>
			<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Survey</h2>
			</div>
			{judul && (
			<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
			)}
			</div>
			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-sm">
			<div className="overflow-x-auto">
				<table className="w-full border-collapse">
					<tbody>
						{ind && (
							<>
								<SectionRow title="Character" />
								{view.showCreditHistory && (
									<Row label="Credit History">
										<Dropdown
											value={ind.creditHis}
											onChange={(v) => setIndField("creditHis", v)}
											options={lookups.creditHistory}
										/>
									</Row>
								)}
								{view.showReference && (
									<Row label="Reference">
										<Dropdown
											value={ind.reference}
											onChange={(v) => setIndField("reference", v)}
											options={lookups.reference}
										/>
									</Row>
								)}
								<Row label="Working/ Business experience">
									<Dropdown
										value={ind.workExp}
										onChange={(v) => setIndField("workExp", v)}
										options={lookups.workExp}
									/>
								</Row>
								<Row label="Business Size">
									<Dropdown
										value={ind.businessSize}
										onChange={(v) => setIndField("businessSize", v)}
										options={lookups.businessSize || []}
										disabled={ind.businessSizeDisabled}
										className="w-[400px]"
									/>
								</Row>
								<Row label="Note">
									<NoteArea value={ind.noteChar} onChange={(v) => setIndField("noteChar", v)} />
								</Row>

								<SectionRow title="Capital" />
								<Row label="Residential Type">
									<Dropdown
										value={ind.living}
										onChange={(v) => setInd((prev) => (prev ? { ...prev, living: v, livingSts: "" } : prev))}
										options={lookups.livingType || []}
									/>
								</Row>
								{ind.living !== "" && (
									<Row label="Residential Status">
										<Dropdown
											value={ind.livingSts}
											onChange={(v) => setIndField("livingSts", v)}
											options={livingStatusOptions}
										/>
									</Row>
								)}
								<Row label="Car Ownership">
									<Dropdown
										value={ind.carOwn}
										onChange={(v) => setIndField("carOwn", v)}
										options={lookups.carOwnership || []}
									/>
								</Row>
								<Row label="Note">
									<NoteArea value={ind.noteCapital} onChange={(v) => setIndField("noteCapital", v)} />
								</Row>

								<SectionRow title="Capacity" />
								<Row label="Fixed Monthly Income">
									<span className="flex flex-wrap items-center gap-2">
										<Money value={num(ind.fixInc)} readOnly />
										<span className="pl-4">Source Of Fund</span>
										<Dropdown
											value={ind.fixIncSource}
											onChange={(v) => setInd((prev) => (prev
												? { ...prev, fixIncSource: v, fixIncSourceOther: v === OTHER_SOURCE_VALUE ? prev.fixIncSourceOther : "" }
												: prev))}
											options={lookups.sourceOfFund}
											className="w-[200px]"
										/>
										{ind.fixIncSource === OTHER_SOURCE_VALUE && (
											<input
												type="text"
												value={ind.fixIncSourceOther}
												onChange={(e) => setIndField("fixIncSourceOther", e.target.value)}
												className={`${boxClass} w-[200px] text-left`}
											/>
										)}
									</span>
								</Row>
								<Row label="Spouse Occupation">
									<Dropdown
										value={ind.spouseJob}
										onChange={(v) => setIndField("spouseJob", v)}
										options={ind.spouseMaritalDisabled ? [] : (lookups.spouseJob || [])}
									/>
								</Row>
								<Row label="Spouse Income per Month">
									<span className="flex items-center gap-1">
										Rp
										<Money value={num(ind.spouseIncome)} readOnly className="w-[120px]" />
									</span>
								</Row>
								<Row label="Total Other Income per Month">
									<span className="flex flex-wrap items-center gap-2">
										<span className="flex items-center gap-1">
											Rp
											<Money value={num(ind.totOthInc)} readOnly className="w-[120px]" />
										</span>
										<span className="pl-2">Source Of Fund</span>
										<Dropdown
											value={ind.totOthIncSource}
											onChange={(v) => setInd((prev) => (prev
												? { ...prev, totOthIncSource: v, totOthIncSourceOther: v === OTHER_SOURCE_VALUE ? prev.totOthIncSourceOther : "" }
												: prev))}
											options={lookups.sourceOfFund}
											className="w-[200px]"
										/>
										{ind.totOthIncSource === OTHER_SOURCE_VALUE && (
											<input
												type="text"
												value={ind.totOthIncSourceOther}
												onChange={(e) => setIndField("totOthIncSourceOther", e.target.value)}
												className={`${boxClass} w-[200px] text-left`}
											/>
										)}
									</span>
								</Row>
								<Row label="Total Income per Month">
									<span className="flex items-center gap-1">
										Rp
										<Money value={num(ind.totInc)} readOnly className="w-[120px]" />
									</span>
								</Row>
								<Row label="Average Income per Year">
									<span className="flex items-center gap-1">
										Rp
										<Money value={num(ind.totIncYear)} readOnly className="w-[120px]" />
									</span>
								</Row>
								<Row label="Note">
									<NoteArea value={ind.noteCapacity} onChange={(v) => setIndField("noteCapacity", v)} />
								</Row>

								<SectionRow title="Collateral" />
								<Row label="DP">
									<Dropdown value={ind.dp} onChange={(v) => setIndField("dp", v)} options={lookups.dp} />
								</Row>
								<Row label="Payment Method">
									<Dropdown
										value={ind.pmt}
										onChange={(v) => setIndField("pmt", v)}
										options={lookups.paymentMethod || []}
									/>
								</Row>
								<Row label="Note">
									<NoteArea value={ind.noteCollateral} onChange={(v) => setIndField("noteCollateral", v)} />
								</Row>

								<SikCheckingSection
									docs={view.sikCheckingDocuments}
									noteSid={ind.noteSid}
									onNoteSid={(v) => setIndField("noteSid", v)}
								/>
							</>
						)}

						{corp && (
							<>
								<SectionRow title="Company Background" />
								{view.showCreditHistory && (
									<Row label="Credit History">
										<Dropdown
											value={corp.creditHis}
											onChange={(v) => setCorpField("creditHis", v)}
											options={lookups.creditHistory}
										/>
									</Row>
								)}
								{view.showReference && (
									<Row label="Reference">
										<Dropdown
											value={corp.reference}
											onChange={(v) => setCorpField("reference", v)}
											options={lookups.reference}
										/>
									</Row>
								)}
								<Row label="Working/ Business experience">
									<Dropdown
										value={corp.workExp}
										onChange={(v) => setCorpField("workExp", v)}
										options={lookups.workExp}
									/>
								</Row>
								<Row label="Company Status">
									<Dropdown
										value={corp.companyStatus}
										onChange={(v) => setCorpField("companyStatus", v)}
										options={lookups.companyStatus || []}
									/>
								</Row>
								<Row label="Scale of Business">
									<Dropdown
										value={corp.scale}
										onChange={(v) => setCorpField("scale", v)}
										options={lookups.businessScale || []}
									/>
								</Row>
								<Row label="Business Size">
									<Dropdown
										value={corp.businessSize}
										onChange={(v) => setCorpField("businessSize", v)}
										options={lookups.businessSize || []}
										disabled
									/>
								</Row>
								<Row label="Note">
									<NoteArea value={corp.noteChar} onChange={(v) => setCorpField("noteChar", v)} />
								</Row>

								<SectionRow title="Capital" />
								<Row label="Business Location">
									<Dropdown
										value={corp.businessLocation}
										onChange={(v) => setCorpField("businessLocation", v)}
										options={lookups.businessLocation || []}
										className="w-[320px]"
									/>
								</Row>
								<Row label="Total Unit Owned (Vehicle)">
									<Dropdown
										value={corp.unitOwned}
										onChange={(v) => setCorpField("unitOwned", v)}
										options={lookups.unitOwned || []}
									/>
								</Row>
								<Row label="Unit Free from Finance">
									<Dropdown
										value={corp.unitFree}
										onChange={(v) => setCorpField("unitFree", v)}
										options={lookups.unitFree || []}
									/>
								</Row>
								<Row label={`Estimated Total Assets (as of ${corp.estimatedAssetAsOf || ""})`}>
									<Dropdown
										value={corp.estimatedAsset}
										onChange={(v) => setCorpField("estimatedAsset", v)}
										options={lookups.estimatedAsset || []}
										disabled
										className="w-[320px]"
									/>
								</Row>
								<Row label="Note">
									<NoteArea value={corp.noteCapital} onChange={(v) => setCorpField("noteCapital", v)} />
								</Row>

								<SectionRow title="Capacity" />
								<Row label="Monthly Profit">
									<span className="flex flex-wrap items-center gap-2">
										<Money value={num(corp.monthProfit)} onChange={(v) => setCorpField("monthProfit", v)} />
										<span className="pl-4">Source Of Fund</span>
										<Dropdown
											value={corp.monthProfitSource}
											onChange={(v) => setCorp((prev) => (prev
												? { ...prev, monthProfitSource: v, monthProfitSourceOther: v === OTHER_SOURCE_VALUE ? prev.monthProfitSourceOther : "" }
												: prev))}
											options={lookups.sourceOfFund}
											className="w-[200px]"
										/>
										{corp.monthProfitSource === OTHER_SOURCE_VALUE && (
											<input
												type="text"
												value={corp.monthProfitSourceOther}
												onChange={(e) => setCorpField("monthProfitSourceOther", e.target.value)}
												className={`${boxClass} w-[200px] text-left`}
											/>
										)}
									</span>
								</Row>
								<Row label="Sales/ Month">
									<Money value={num(corp.monthSales)} onChange={(v) => setCorpField("monthSales", v)} />
								</Row>
								<Row label="Monthly Sales to Profit (Nett Profit : Sales)">
									<Dropdown
										value={corp.netProfit}
										onChange={(v) => setCorpField("netProfit", v)}
										options={lookups.netProfitRatio || []}
									/>
								</Row>
								<Row label="Average Income per Year">
									<Money value={avgIncomeCorp} readOnly />
								</Row>
								<Row label="Note">
									<NoteArea value={corp.noteCapacity} onChange={(v) => setCorpField("noteCapacity", v)} />
								</Row>

								<SectionRow title="Collateral" />
								<Row label="DP">
									<Dropdown value={corp.dp} onChange={(v) => setCorpField("dp", v)} options={lookups.dp} />
								</Row>
								<Row label="Repayment">
									<Dropdown
										value={corp.pmt}
										onChange={(v) => setCorpField("pmt", v)}
										options={lookups.paymentMethod || []}
									/>
								</Row>
								<Row label="Note">
									<NoteArea value={corp.noteCollateral} onChange={(v) => setCorpField("noteCollateral", v)} />
								</Row>

								<SikCheckingSection
									docs={view.sikCheckingDocuments}
									noteSid={corp.noteSid}
									onNoteSid={(v) => setCorpField("noteSid", v)}
								/>
							</>
						)}
					</tbody>
				</table>
			</div>
				</div>

				{messages.length > 0 && (
					<div className="message">
						{messages.map((m, i) => (
							<p key={i} className="text-sm text-red-600">{m}</p>
						))}
					</div>
				)}
				{saving && <p className="text-right text-sm text-[var(--app-muted)]">Please wait…</p>}
			</div>
		</div>
	);
});

export default CAMSurveyPage;
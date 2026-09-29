import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';

interface FinancingHeader {
	l_type_label: string;
	status: string;
	currency: string;
	contract_type: string;
	asset_value: number;
	disbursement_type: string;
	cross_note: string | null;
	dp_label: string;
	security_percent: number;
	security_amount: number;
	payment_method: string;
	net_finance: number;
	purpose_of_finance: string;
	insurance_loan: number;
	type_of_payment: string;
	bbn_loan: number;
	fix_float: string;
	provision_loan: number;
	tenor_label: string;
	other_loan: number;
	subsidy_from_dealer: number;
	total_net_finance: number;
	incentive_or_subsidy_label: string;
	incentive_or_subsidy_amount: number;
	survey_loan_2: number;
	refund_to_dealer: number;
	total_net_finance_plus_survey_loan2: number;
	bbn_via: string;
	flat_rate_selling: string;
	flat_rate_base: string;
	paid_by: string;
	effective_rate_selling: string;
	effective_rate_base: string;
	agency_name: string;
	rental_selling: number | null;
	rental_base: number | null;
	agency_fee_gross: number;
	bbn_fee: number;
	show_restructuring_change: boolean;
	restructuring_change: string;
	notary_fee_gross: number;
	business_trip_fee: number;
	nett_deed_fee: number;
	nett_certificate_fee: number;
	nett_agency_fee: number;
	guaranteed_acceptance: string;
	show_customer_flat_rate: boolean;
	customer_flat_rate: string;
	fund_facility_label: string | null;
	fund_facility_amount: number | null;
	grand_fund_facility_label: string | null;
	grand_fund_facility_amount: number | null;
}

interface StepRentalRow { step: number; month: number; rental: number; based: number; }

interface CalcRow {
	label: string;
	income: number | null;
	subsidy: number | null;
	total_income: number | null;
	base_rate: number | null;
	max_refund: number | null;
}

interface Calculator {
	rows: CalcRow[];
	subsidy_total: number;
	total_income_total: number;
	max_refund_total: number;
	max_incentive_percent: number;
	max_incentive_amount: number;
	marketing_fee: number;
	incentive_to_be_paid: number;
}

interface InsuranceYearRow {
	year: number;
	ins_amount: number;
	tpl_amount: number;
	tlo_ar: string;
	clause: string;
	premium_receive: number;
	premium_payment: number;
}

interface Insurance {
	ins_policy: string;
	ins_company: string;
	pay_method: string;
	model_nm: string;
	condition: string;
	total_seat: number;
	show_usage: boolean;
	usage_label: string;
	rows: InsuranceYearRow[];
}

interface InternalDisbRow { no: number; contract_no: string; amount: number; purpose: string; }
interface ExternalDisbRow { no: number; name: string; address: string; bank_branch: string; account_no: string; account_name: string; amount: number; }

interface Disbursement {
	left: {
		asset_value: number; dp_label: string; dp_or_security_amount: number; survey_fee_gross: number;
		notary_fee_gross: number; provision_fee: number; business_trip_fee: number; insurance: number;
		first_installment: number; agency_fee_gross: number; bbn_fee: number; refund_to_dealer: number;
		subsidy_from_dealer: number; disbursement_to_dealer: number; commission_to_dealer_gross: number;
		total_payment_to_dealer: number;
	};
	internal: InternalDisbRow[];
	internal_total: number;
	external: ExternalDisbRow[];
	external_total: number;
}

interface CommissionRow { no: number; code: string; name: string; address: string; fee: number; }

interface Outstanding {
	rows: Record<'disbursement' | 'undisbursement' | 'unapprove' | 'group' | 'guarantor', { unit: number; amount: number }>;
	total_unit: number;
	total_amount: number;
	calc_date: string;
	notes: string | null;
}

interface LoanRatioRow {
	no: number;
	label: string | null;
	brand_type: string;
	tahun: number | string | null;
	market_price: number;
	op: number;
	rental: number;
	term: number | string | null;
	tenor: number | string | null;
	payment_status: string | null;
	user_usage: string | null;
	loan_ratio: number | string | null;
	branch: string | null;
	remark?: string | null;
	cons_leas?: string | null;
}

interface LoanRatioSection { rows: LoanRatioRow[]; sub_total: { market: number; op: number; rental: number; ratio: number | null }; }

interface LoanRatio {
	disbursement: LoanRatioSection;
	cross_collateral_breakdown: {
		cross: { market: number; op: number; rental: number; ratio: number | null };
		non_cross: { market: number; op: number; rental: number; ratio: number | null };
		total_exposure: { market: number; op: number; rental: number; ratio: number | null };
		by_finance_type: Record<'installment_financing' | 'finance_lease' | 'sale_leaseback' | 'dana' | 'modal_usaha', { op: number; units: number }>;
	};
	undisbursement: LoanRatioSection;
	unapprove: LoanRatioSection;
	grand_total_dis_undis_unapp: { market: number; op: number; rental: number; ratio: number | null };
	group: LoanRatioSection;
	guarantor: LoanRatioSection;
	grand_total_all: { market: number; op: number; rental: number; ratio: number | null } | null;
}

interface FinancingData {
	no_data: boolean;
	header: FinancingHeader;
	step_rental: StepRentalRow[] | null;
	calculator: Calculator;
	insurance: Insurance | null;
	disbursement: Disbursement;
	commission: CommissionRow[] | null;
	outstanding: Outstanding | null;
	loan_ratio: LoanRatio | null;
}

interface SubsidyRow {
	type: string;
	payment_for: string;
	amount: number;
}

function fmt(n: number | null | undefined): string {
	if (n === null || n === undefined) return '-';
	return Math.round(n).toLocaleString('en-US');
}

function pct(n: number | string | null | undefined): string {
	if (n === null || n === undefined || n === '') return '-';
	return `${n}%`;
}

const cellLabel = "border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 align-middle text-sm text-[var(--app-text)] whitespace-nowrap";
const cellValue = "border border-[var(--app-border)] px-3 py-1.5 align-middle text-sm text-[var(--app-text)]";
const thCell = "border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-center text-sm font-bold text-[var(--app-text)]";
const thCellBlue = "border border-[var(--app-border)] bg-[#0066FF] px-3 py-1.5 text-center text-sm font-bold text-white";
const tdCell = "border border-[var(--app-border)] px-3 py-1.5 text-sm text-[var(--app-text)]";
const tableWrap = "overflow-hidden rounded-lg border border-[var(--app-border)]";

function SectionBanner({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-[var(--app-border)] bg-[#64748b] px-5 py-2">
			<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{children}</h2>
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="mb-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<SectionBanner>{title}</SectionBanner>
			<div className="overflow-x-auto p-4">{children}</div>
		</div>
	);
}

function InfoRow({ left, right }: { left: [string, React.ReactNode]; right?: [string, React.ReactNode] | null }) {
	return (
		<tr>
			<td className={cellLabel}>{left[0]}</td>
			<td className={`${cellValue} text-right`}>{left[1]}</td>
			{right ? (
				<>
					<td className={cellLabel}>{right[0]}</td>
					<td className={`${cellValue} text-right`}>{right[1]}</td>
				</>
			) : (
				<>
					<td className="border-0 bg-transparent" />
					<td className="border-0 bg-transparent" />
				</>
			)}
		</tr>
	);
}

function SplitValue({ a, b }: { a: React.ReactNode; b: React.ReactNode }) {
	return (
		<div className="flex divide-x divide-[var(--app-border)]">
			<span className="flex-1 pr-2 text-right">{a}</span>
			<span className="flex-1 pl-2 text-right">{b}</span>
		</div>
	);
}

const DetailActionButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
	const [hovered, setHovered] = useState(false);

	return (
		<button
			type="button"
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				display: "inline-flex", alignItems: "center", gap: 6,
				border: `1px solid ${hovered ? "#ea580c" : "#f97316"}`,
				background: hovered ? "#f97316" : "#fff7ed",
				color: hovered ? "#fff" : "#c2410c",
				borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 500,
				cursor: "pointer", transition: "background 0.15s, color 0.15s, border-color 0.15s",
			}}
		>
			Detail
		</button>
	);
};

const CloseActionButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
	const [hovered, setHovered] = useState(false);

	return (
		<button
			type="button"
			onClick={onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				display: "inline-flex", alignItems: "center", gap: 6,
				border: `1px solid ${hovered ? "#ea580c" : "#f97316"}`,
				background: hovered ? "#f97316" : "#fff7ed",
				color: hovered ? "#fff" : "#c2410c",
				borderRadius: 6, padding: "5px 14px", fontSize: 13, fontWeight: 500,
				cursor: "pointer", transition: "background 0.15s, color 0.15s, border-color 0.15s",
			}}
		>
			Close
		</button>
	);
};

function SubTotalRow({ st, showRemark, showConsLeas }: { st: { market: number; op: number; rental: number; ratio: number | null }; showRemark: boolean; showConsLeas: boolean }) {
	return (
		<tr className="bg-[var(--app-surface)] font-semibold">
			<td className={tdCell} colSpan={4}>Sub Total</td>
			<td className={`${tdCell} text-right`}>{fmt(st.market)}</td>
			<td className={`${tdCell} text-right`}>{fmt(st.op)}</td>
			<td className={`${tdCell} text-right`}>{fmt(st.rental)}</td>
			<td className={tdCell} />
			<td className={tdCell} />
			<td className={`${tdCell} text-right`}>{st.ratio ?? '-'}{st.ratio !== null && '%'}</td>
			<td className={tdCell} />
			{showRemark && <td className={tdCell} />}
			{showConsLeas && <td className={tdCell} />}
		</tr>
	);
}

function LoanRatioTable({ rows, subTotal, contractNoLabel, showPaymentStatus, showRemark, showConsLeas }: {
	rows: LoanRatioRow[];
	subTotal: { market: number; op: number; rental: number; ratio: number | null };
	contractNoLabel: string;
	showPaymentStatus: boolean;
	showRemark: boolean;
	showConsLeas: boolean;
}) {
	return (
		<div className={tableWrap}>
			<table className="w-full min-w-[1000px] border-collapse text-sm">
				<thead>
					<tr>
						<th className={thCell}>No.</th>
						<th className={thCell}>{contractNoLabel}</th>
						<th className={thCell}>Brand/Type</th>
						<th className={thCell}>Car Year</th>
						<th className={thCell}>Market Price</th>
						<th className={thCell}>Outstanding Principal</th>
						<th className={thCell}>Installment/Month</th>
						<th className={thCell}>Terms</th>
						{showPaymentStatus && <th className={thCell}>Payment Status</th>}
						<th className={thCell}>User of Car</th>
						<th className={thCell}>Loan Ratio (%)</th>
						<th className={thCell}>Branch</th>
						{showRemark && <th className={thCell}>Remark</th>}
						{showConsLeas && <th className={thCell}>Finance Type</th>}
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 ? (
						<tr>
							<td className={tdCell} colSpan={11 + (showPaymentStatus ? 1 : 0) + (showRemark ? 1 : 0) + (showConsLeas ? 1 : 0)}>
								No Data
							</td>
						</tr>
					) : (
						rows.map((r) => (
							<tr key={r.no}>
								<td className={tdCell}>{r.no}</td>
								<td className={tdCell}>{r.label || '-'}</td>
								<td className={tdCell}>{r.brand_type}</td>
								<td className={tdCell}>{r.tahun ?? '-'}</td>
								<td className={`${tdCell} text-right`}>{fmt(r.market_price)}</td>
								<td className={`${tdCell} text-right`}>{fmt(r.op)}</td>
								<td className={`${tdCell} text-right`}>{fmt(r.rental)}</td>
								<td className={tdCell}>{r.term} of {r.tenor}</td>
								{showPaymentStatus && <td className={tdCell}>{r.payment_status}</td>}
								<td className={tdCell}>{r.user_usage}</td>
								<td className={`${tdCell} text-right`}>{r.loan_ratio ?? '-'}</td>
								<td className={tdCell}>{r.branch}</td>
								{showRemark && <td className={tdCell}>{r.remark}</td>}
								{showConsLeas && <td className={tdCell}>{r.cons_leas}</td>}
							</tr>
						))
					)}
					<SubTotalRow st={subTotal} showRemark={showRemark} showConsLeas={showConsLeas} />
				</tbody>
			</table>
		</div>
	);
}

function BreakdownTable({ b }: { b: LoanRatio['cross_collateral_breakdown'] }) {
	const row = (label: string, v: { market?: number; op: number; rental: number | string; ratio: number | null }) => (
		<tr key={label}>
			<td className={tdCell}>{label}</td>
			<td className={`${tdCell} text-right`}>{v.market !== undefined ? fmt(v.market) : ''}</td>
			<td className={`${tdCell} text-right`}>{fmt(v.op)}</td>
			<td className={`${tdCell} text-right`}>{typeof v.rental === 'number' ? fmt(v.rental) : v.rental}</td>
			<td className={`${tdCell} text-right`}>{v.ratio !== null && v.ratio !== undefined ? `${v.ratio}%` : ''}</td>
		</tr>
	);
	return (
		<div className={tableWrap}>
			<table className="w-full border-collapse text-sm">
				<thead>
					<tr>
						<th className={thCell} />
						<th className={thCell}>Market Price</th>
						<th className={thCell}>Outstanding Principal</th>
						<th className={thCell}>Installment/Month</th>
						<th className={thCell}>Loan Ratio</th>
					</tr>
				</thead>
				<tbody>
					{row('Total Cross Collateral Customer', b.cross)}
					{row('Total non Cross Collateral Customer', b.non_cross)}
					{row('Total Exposure Customer', b.total_exposure)}
					{row('Installment Financing', { op: b.by_finance_type.installment_financing.op, rental: `${b.by_finance_type.installment_financing.units} Unit`, ratio: null })}
					{row('Finance Lease', { op: b.by_finance_type.finance_lease.op, rental: `${b.by_finance_type.finance_lease.units} Unit`, ratio: null })}
					{row('Sale & Leaseback', { op: b.by_finance_type.sale_leaseback.op, rental: `${b.by_finance_type.sale_leaseback.units} Unit`, ratio: null })}
					{row('Fasilitas Dana', { op: b.by_finance_type.dana.op, rental: `${b.by_finance_type.dana.units} Unit`, ratio: null })}
					{row('Fasilitas Modal Usaha', { op: b.by_finance_type.modal_usaha.op, rental: `${b.by_finance_type.modal_usaha.units} Unit`, ratio: null })}
				</tbody>
			</table>
		</div>
	);
}

function GrandTotalTable({ title, gt }: { title: string; gt: { market: number; op: number; rental: number; ratio: number | null } }) {
	return (
		<div className={`${tableWrap} max-w-xl`}>
			<table className="w-full border-collapse text-sm">
				<thead>
					<tr>
						<th className={thCell} />
						<th className={thCell}>Market Price</th>
						<th className={thCell}>Outstanding Principal</th>
						<th className={thCell}>Installment/Month</th>
						<th className={thCell}>Loan Ratio</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td className={`${tdCell} font-semibold`}>{title}</td>
						<td className={`${tdCell} text-right`}>{fmt(gt.market)}</td>
						<td className={`${tdCell} text-right`}>{fmt(gt.op)}</td>
						<td className={`${tdCell} text-right`}>{fmt(gt.rental)}</td>
						<td className={`${tdCell} text-right`}>{gt.ratio !== null ? `${gt.ratio}%` : '-'}</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}

export default function FinancingView({ ctx }: { ctx: CamCtx }) {
	const [showCalcDetail, setShowCalcDetail] = useState(false);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-financing', ctx.apless, ctx.applno, ctx.finType, ctx.indCor],
		queryFn: async () => {
			const res = await api.get<FinancingData>('/CAM/View/financing', {
				params: { apless: ctx.apless, applno: ctx.applno, fin_type: ctx.finType, ind_cor: ctx.indCor },
			});
			return res.data;
		},
	});

	const {
		data: subsidyRows,
		isLoading: subsidyLoading,
		isError: subsidyIsError,
	} = useQuery({
		queryKey: ['cam-financing-subsidy-detail', ctx.apless, ctx.applno],
		queryFn: async () => {
			const res = await api.get<SubsidyRow[]>('/CAM/View/financing/subsidy-detail', {
				params: { apless: ctx.apless, applno: ctx.applno },
			});
			return res.data;
		},
		enabled: showCalcDetail,
	});

	if (isLoading) {
		return <LoadingCard message="Loading financing detail…" />;
	}

	if (isError || !data) {
		return <ErrorCard message="Failed to load financing detail." />;
	}

	if (data.no_data) {
		return <NoDataCard />;
	}

	const h = data.header;
	const c = data.calculator;
	const d = data.disbursement;
	const lr = data.loan_ratio;
	const isFundFacility = ctx.finType === 'D' || ctx.finType === 'M';

	return (
		<div>
			{showCalcDetail && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
					onClick={() => setShowCalcDetail(false)}
				>
					<div
						className="w-full max-w-2xl rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-lg"
						onClick={(e) => e.stopPropagation()}
					>
						<SectionBanner>Input Subsidy and Refund</SectionBanner>
						<div className="p-5">
							{subsidyLoading && <p className="text-sm text-[var(--app-muted)]">Loading…</p>}
							{!subsidyLoading && subsidyIsError && <p className="text-sm text-red-600">Failed to load subsidy/refund detail.</p>}
							{!subsidyLoading && !subsidyIsError && (
								<div className={tableWrap}>
									<table className="w-full border-collapse text-sm">
										<thead>
											<tr>
												<th className={thCellBlue}>Subsidy / Refund / Incentive</th>
												<th className={thCellBlue}>Payment For</th>
												<th className={thCellBlue}>Amount</th>
											</tr>
										</thead>
										<tbody>
											{!subsidyRows || subsidyRows.length === 0 ? (
												<tr><td className={tdCell} colSpan={3}>No subsidy, refund, or incentive recorded.</td></tr>
											) : (
												subsidyRows.map((r, ri) => (
													<tr key={ri}>
														<td className={`${tdCell} text-center font-semibold`}>{r.type}</td>
														<td className={`${tdCell} text-center`}>For {r.payment_for}</td>
														<td className={`${tdCell} text-right`}>{fmt(r.amount)}</td>
													</tr>
												))
											)}
										</tbody>
									</table>
								</div>
							)}
						</div>
						<div className="flex justify-end border-t border-[var(--app-border)] px-5 py-3">
							<CloseActionButton onClick={() => setShowCalcDetail(false)} />
						</div>
					</div>
				</div>
			)}

			<Section title={`Financing Detail Review - ${h.l_type_label}`}>
				<div className={tableWrap}>
					<table className="w-full border-collapse text-sm">
						<tbody>
							<InfoRow left={['Status', h.status]} right={['Currency', h.currency]} />
							<InfoRow left={['Contract Type', h.contract_type]} right={['Asset Value', fmt(h.asset_value)]} />
							<InfoRow
								left={['Disbursement Type', `${h.disbursement_type}${h.cross_note ? ` | ${h.cross_note}` : ''}`]}
								right={[h.dp_label, <SplitValue key="dp" a={pct(h.security_percent)} b={fmt(h.security_amount)} />]}
							/>
							<InfoRow left={['Payment Method', h.payment_method]} right={['Net Finance', fmt(h.net_finance)]} />
							<InfoRow left={['Purpose of Finance', h.purpose_of_finance]} right={['Insurance Loan', fmt(h.insurance_loan)]} />
							<InfoRow left={['Type of Payment', h.type_of_payment]} right={['BBN Loan', fmt(h.bbn_loan)]} />
							<InfoRow left={['Fix/Float', h.fix_float]} right={['Provision Loan', fmt(h.provision_loan)]} />
							<InfoRow left={['Tenor/Payment Cycle', h.tenor_label]} right={['Other Loan', fmt(h.other_loan)]} />
							<InfoRow left={['Subsidy from Dealer', fmt(h.subsidy_from_dealer)]} right={['Total Net Finance', fmt(h.total_net_finance)]} />
							<InfoRow left={[h.incentive_or_subsidy_label, fmt(h.incentive_or_subsidy_amount)]} right={['Survey Loan 2', fmt(h.survey_loan_2)]} />
							<InfoRow left={['Refund to Dealer', fmt(h.refund_to_dealer)]} right={['Total Net Finance + Survey Loan 2', fmt(h.total_net_finance_plus_survey_loan2)]} />
							{isFundFacility ? (
								<>
									<InfoRow left={['BBN Via', h.bbn_via]} right={[h.fund_facility_label || '', fmt(h.fund_facility_amount)]} />
									<InfoRow left={['Paid By', h.paid_by]} right={[h.grand_fund_facility_label || '', fmt(h.grand_fund_facility_amount)]} />
									<InfoRow left={['Agency Name', h.agency_name]} right={['Interest', <SplitValue key="hdr" a={<strong>SELLING</strong>} b={<strong>BASE</strong>} />]} />
									<InfoRow left={['Agency Fee Gross', fmt(h.agency_fee_gross)]} right={['Flat Rate', <SplitValue key="fr" a={`${h.flat_rate_selling}%`} b={`${h.flat_rate_base}%`} />]} />
									<InfoRow left={['BBN Fee', fmt(h.bbn_fee)]} right={['Effective Rate', <SplitValue key="er" a={`${h.effective_rate_selling}%`} b={`${h.effective_rate_base}%`} />]} />
									<InfoRow
										left={['Notary Fee Gross', fmt(h.notary_fee_gross)]}
										right={['Rental', <SplitValue key="rt" a={fmt(h.rental_selling)} b={fmt(h.rental_base)} />]}
									/>
								</>
							) : (
								<>
									<InfoRow left={['BBN Via', h.bbn_via]} right={['Interest', <SplitValue key="hdr" a={<strong>SELLING</strong>} b={<strong>BASE</strong>} />]} />
									<InfoRow left={['Paid By', h.paid_by]} right={['Flat Rate', <SplitValue key="fr" a={`${h.flat_rate_selling}%`} b={`${h.flat_rate_base}%`} />]} />
									<InfoRow left={['Agency Name', h.agency_name]} right={['Effective Rate', <SplitValue key="er" a={`${h.effective_rate_selling}%`} b={`${h.effective_rate_base}%`} />]} />
									<InfoRow
										left={['Agency Fee Gross', fmt(h.agency_fee_gross)]}
										right={h.rental_selling === null ? null : ['Rental', <SplitValue key="rt" a={fmt(h.rental_selling)} b={fmt(h.rental_base)} />]}
									/>
									<InfoRow left={['BBN Fee', fmt(h.bbn_fee)]} />
									<InfoRow
										left={['Notary Fee Gross', fmt(h.notary_fee_gross)]}
										right={h.show_restructuring_change ? ['Changes from Restructuring', h.restructuring_change] : null}
									/>
								</>
							)}
							<InfoRow left={['Business Trip Fee', fmt(h.business_trip_fee)]} />
							<InfoRow left={['Nett Deed Fee', fmt(h.nett_deed_fee)]} />
							<InfoRow left={['Nett Certificate Fee', fmt(h.nett_certificate_fee)]} />
							<InfoRow left={['Nett Agency Fee', fmt(h.nett_agency_fee)]} />
							<InfoRow left={['Guaranteed Acceptance', h.guaranteed_acceptance]} />
							{h.show_customer_flat_rate && <InfoRow left={['Customer Flat Rate', `${h.customer_flat_rate}%`]} />}
						</tbody>
					</table>
				</div>

				<div className={`${tableWrap} mt-4`}>
					<table className="w-full min-w-[800px] border-collapse text-sm">
						<thead>
							<tr>
								<th className={thCellBlue}>
									<DetailActionButton onClick={() => setShowCalcDetail(true)} />
								</th>
								<th className={thCellBlue}>Income</th>
								<th className={thCellBlue}>Subsidy</th>
								<th className={thCellBlue}>Total Income (Include Subsidy)</th>
								<th className={thCellBlue}>Base Rate</th>
								<th className={thCellBlue}>Max Refund</th>
							</tr>
						</thead>
						<tbody>
							{c.rows.map((r) => (
								<tr key={r.label}>
									<td className={tdCell}>{r.label}</td>
									<td className={`${tdCell} text-right`}>{r.income !== null ? fmt(r.income) : ''}</td>
									<td className={`${tdCell} text-right`}>{r.subsidy !== null ? fmt(r.subsidy) : ''}</td>
									<td className={`${tdCell} text-right`}>{r.total_income !== null ? fmt(r.total_income) : ''}</td>
									<td className={`${tdCell} text-right`}>{r.base_rate !== null ? fmt(r.base_rate) : ''}</td>
									<td className={`${tdCell} text-right`}>{r.max_refund !== null ? fmt(r.max_refund) : ''}</td>
								</tr>
							))}
							<tr className="bg-[var(--app-surface)] font-semibold">
								<td className={tdCell}>Total</td>
								<td className={tdCell} />
								<td className={`${tdCell} text-right`}>{fmt(c.subsidy_total)}</td>
								<td className={`${tdCell} text-right`}>{fmt(c.total_income_total)}</td>
								<td className={tdCell} />
								<td className={`${tdCell} text-right`}>{fmt(c.max_refund_total)}</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div className="mt-3 space-y-1 text-sm">
					<div className="flex justify-between border-b border-[var(--app-border)] py-1">
						<span>Max Incentive to 3rd Party ({c.max_incentive_percent}%)</span>
						<span className="font-semibold">{fmt(c.max_incentive_amount)}</span>
					</div>
					<div className="flex justify-between border-b border-[var(--app-border)] py-1">
						<span>Marketing Fee</span>
						<span className="font-semibold">{fmt(c.marketing_fee)}</span>
					</div>
					<div className="flex justify-between py-1">
						<span>Incentive To Be Paid</span>
						<span className="font-semibold">{fmt(c.incentive_to_be_paid)}</span>
					</div>
				</div>
			</Section>

			{data.step_rental && data.step_rental.length > 0 && (
				<Section title="Step Rental">
					<div className={tableWrap}>
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th className={thCell}>Step</th>
									<th className={thCell}>Month</th>
									<th className={thCell}>Rental</th>
									<th className={thCell}>Based</th>
								</tr>
							</thead>
							<tbody>
								{data.step_rental.map((s) => (
									<tr key={s.step}>
										<td className={tdCell}>{s.step}</td>
										<td className={tdCell}>{s.month}</td>
										<td className={`${tdCell} text-right`}>{fmt(s.rental)}</td>
										<td className={`${tdCell} text-right`}>{fmt(s.based)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Section>
			)}

			{data.insurance && (
				<Section title="Insurance">
					<div className={tableWrap}>
						<table className="w-full border-collapse text-sm">
							<tbody>
								<InfoRow left={['Ins. Policy', data.insurance.ins_policy]} right={['Model', data.insurance.model_nm]} />
								<InfoRow left={['Ins. Company', data.insurance.ins_company]} right={['Condition', data.insurance.condition]} />
								<InfoRow left={['Pay Method', data.insurance.pay_method]} right={['Seat', data.insurance.total_seat]} />
								{data.insurance.show_usage && <InfoRow left={['Usage', data.insurance.usage_label]} />}
							</tbody>
						</table>
					</div>
					<div className={`${tableWrap} mt-4`}>
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th className={thCell}>Year</th>
									<th className={thCell}>Insurance Amount</th>
									<th className={thCell}>TPL Amount</th>
									<th className={thCell}>TLO CP</th>
									<th className={thCell}>Clause</th>
									<th className={thCell}>Premium Receive</th>
									<th className={thCell}>Premium Payment</th>
								</tr>
							</thead>
							<tbody>
								{data.insurance.rows.map((r) => (
									<tr key={r.year}>
										<td className={`${tdCell} text-center`}>{r.year}</td>
										<td className={`${tdCell} text-right`}>{fmt(r.ins_amount)}</td>
										<td className={`${tdCell} text-right`}>{fmt(r.tpl_amount)}</td>
										<td className={tdCell}>{r.tlo_ar}</td>
										<td className={tdCell}>{r.clause}</td>
										<td className={`${tdCell} text-right`}>{fmt(r.premium_receive)}</td>
										<td className={`${tdCell} text-right`}>{fmt(r.premium_payment)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Section>
			)}

			<Section title="Disbursement">
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div className={tableWrap}>
						<table className="w-full border-collapse text-sm">
							<tbody>
								<InfoRow left={['Asset Value', fmt(d.left.asset_value)]} />
								<InfoRow left={[d.left.dp_label, fmt(d.left.dp_or_security_amount)]} />
								<InfoRow left={['Survey Fee Gross', fmt(d.left.survey_fee_gross)]} />
								<InfoRow left={['Notary Fee Gross', fmt(d.left.notary_fee_gross)]} />
								<InfoRow left={['Provision Fee', fmt(d.left.provision_fee)]} />
								<InfoRow left={['Business Trip Fee', fmt(d.left.business_trip_fee)]} />
								<InfoRow left={['Insurance', fmt(d.left.insurance)]} />
								<InfoRow left={['First Installment', fmt(d.left.first_installment)]} />
								<InfoRow left={['Agency Fee Gross', fmt(d.left.agency_fee_gross)]} />
								<InfoRow left={['BBN Fee', fmt(d.left.bbn_fee)]} />
								<InfoRow left={['Refund To Dealer', fmt(d.left.refund_to_dealer)]} />
								<InfoRow left={['Subsidy From Dealer', fmt(d.left.subsidy_from_dealer)]} />
								<InfoRow left={['Disbursement to Dealer', fmt(d.left.disbursement_to_dealer)]} />
								<InfoRow left={['Commission to Dealer (Gross)', fmt(d.left.commission_to_dealer_gross)]} />
								<InfoRow left={['Total Payment to Dealer', fmt(d.left.total_payment_to_dealer)]} />
							</tbody>
						</table>
					</div>
					<div>
						<h3 className="mb-2 text-center text-sm font-bold text-[var(--app-text)]">Internal Disbursement</h3>
						<div className={`${tableWrap} mb-6`}>
							<table className="w-full border-collapse text-sm">
								<thead>
									<tr>
										<th className={thCell}>No</th>
										<th className={thCell}>Contract Number</th>
										<th className={thCell}>Amount</th>
										<th className={thCell}>Purpose</th>
									</tr>
								</thead>
								<tbody>
									{d.internal.length === 0 ? (
										<tr><td className={tdCell} colSpan={4}>No Data</td></tr>
									) : (
										d.internal.map((r) => (
											<tr key={r.no}>
												<td className={tdCell}>{r.no}</td>
												<td className={tdCell}>{r.contract_no}</td>
												<td className={`${tdCell} text-right`}>{fmt(r.amount)}</td>
												<td className={tdCell}>{r.purpose}</td>
											</tr>
										))
									)}
									<tr className="bg-[var(--app-surface)] font-semibold">
										<td className={tdCell} />
										<td className={tdCell}>Total</td>
										<td className={`${tdCell} text-right`}>{fmt(d.internal_total)}</td>
										<td className={tdCell} />
									</tr>
								</tbody>
							</table>
						</div>

						<h3 className="mb-2 text-center text-sm font-bold text-[var(--app-text)]">External Disbursement</h3>
						<div className={tableWrap}>
							<table className="w-full border-collapse text-sm">
								<thead>
									<tr>
										<th className={thCell}>No</th>
										<th className={thCell}>Name</th>
										<th className={thCell}>Bank-Branch</th>
										<th className={thCell}>Account No.</th>
										<th className={thCell}>Beneficiary Name</th>
										<th className={thCell}>Amount</th>
									</tr>
								</thead>
								<tbody>
									{d.external.length === 0 ? (
										<tr><td className={tdCell} colSpan={6}>No Data</td></tr>
									) : (
										d.external.map((r) => (
											<tr key={r.no}>
												<td className={tdCell}>{r.no}</td>
												<td className={tdCell}>{r.name}</td>
												<td className={tdCell}>{r.bank_branch}</td>
												<td className={tdCell}>{r.account_no}</td>
												<td className={tdCell}>{r.account_name}</td>
												<td className={`${tdCell} text-right`}>{fmt(r.amount)}</td>
											</tr>
										))
									)}
									<tr className="bg-[var(--app-surface)] font-semibold">
										<td className={tdCell} colSpan={5}>Total</td>
										<td className={`${tdCell} text-right`}>{fmt(d.external_total)}</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</Section>

			{data.commission && (
				<Section title="Commission">
					<div className={tableWrap}>
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th className={thCell}>No.</th>
									<th className={thCell}>Code</th>
									<th className={thCell}>Name</th>
									<th className={thCell}>Address</th>
									<th className={thCell}>Fee</th>
								</tr>
							</thead>
							<tbody>
								{data.commission.map((r) => (
									<tr key={r.no}>
										<td className={`${tdCell} text-center`}>{r.no}</td>
										<td className={tdCell} dangerouslySetInnerHTML={{ __html: r.code }} />
										<td className={tdCell}>{r.name}</td>
										<td className={tdCell}>{r.address}</td>
										<td className={`${tdCell} text-right`}>{fmt(r.fee)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Section>
			)}

			{data.outstanding && (
				<Section title="Outstanding">
					<div className={tableWrap}>
						<table className="w-full border-collapse text-sm">
							<thead>
								<tr>
									<th className={thCell} />
									<th className={thCell} colSpan={2}>Oustanding Exposure</th>
								</tr>
								<tr>
									<th className={thCell}>Outstanding</th>
									<th className={thCell}>Unit</th>
									<th className={thCell}>Amount</th>
								</tr>
							</thead>
							<tbody>
								<tr><td className={tdCell}>Disbursement</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.rows.disbursement.unit)}</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.rows.disbursement.amount)}</td></tr>
								<tr><td className={tdCell}>Undisbursement</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.rows.undisbursement.unit)}</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.rows.undisbursement.amount)}</td></tr>
								<tr><td className={tdCell}>Unapprove</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.rows.unapprove.unit)}</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.rows.unapprove.amount)}</td></tr>
								<tr><td className={tdCell}>Group</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.rows.group.unit)}</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.rows.group.amount)}</td></tr>
								<tr><td className={tdCell}>Guarantor</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.rows.guarantor.unit)}</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.rows.guarantor.amount)}</td></tr>
								<tr className="bg-[var(--app-surface)] font-semibold"><td className={tdCell}>Total</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.total_unit)}</td><td className={`${tdCell} text-right`}>{fmt(data.outstanding.total_amount)}</td></tr>
							</tbody>
						</table>
					</div>
					<p className="mt-3 text-sm text-[var(--app-text)]">Calculation Date: {data.outstanding.calc_date}</p>
					{data.outstanding.notes && (
						<div className="mt-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-sm text-[var(--app-text)]">
							{data.outstanding.notes}
						</div>
					)}
				</Section>
			)}

			{lr && (
				<Section title="Loan Ratio">
					<div className="space-y-8">
						<div>
							<h3 className="mb-2 text-sm font-bold text-[var(--app-text)]">Disbursement</h3>
							<LoanRatioTable rows={lr.disbursement.rows} subTotal={lr.disbursement.sub_total} contractNoLabel="Contract No" showPaymentStatus showRemark showConsLeas={false} />
						</div>

						<BreakdownTable b={lr.cross_collateral_breakdown} />

						{lr.undisbursement.rows.length > 0 && (
							<div>
								<h3 className="mb-2 text-sm font-bold text-[var(--app-text)]">Undisbursement</h3>
								<LoanRatioTable rows={lr.undisbursement.rows} subTotal={lr.undisbursement.sub_total} contractNoLabel="Contract No / Cam No" showPaymentStatus showRemark={false} showConsLeas={false} />
							</div>
						)}

						{lr.unapprove.rows.length > 0 && (
							<div>
								<h3 className="mb-2 text-sm font-bold text-[var(--app-text)]">Unapprove</h3>
								<LoanRatioTable rows={lr.unapprove.rows} subTotal={lr.unapprove.sub_total} contractNoLabel="Cam No" showPaymentStatus={false} showRemark={false} showConsLeas />
							</div>
						)}

						<GrandTotalTable title="Grand Total" gt={lr.grand_total_dis_undis_unapp} />

						{lr.group.rows.length > 0 && (
							<div>
								<h3 className="mb-2 text-sm font-bold text-[var(--app-text)]">Group</h3>
								<LoanRatioTable rows={lr.group.rows} subTotal={lr.group.sub_total} contractNoLabel="Cam / Contract No" showPaymentStatus showRemark={false} showConsLeas={false} />
							</div>
						)}

						{lr.guarantor.rows.length > 0 && (
							<div>
								<h3 className="mb-2 text-sm font-bold text-[var(--app-text)]">Guarantor</h3>
								<LoanRatioTable rows={lr.guarantor.rows} subTotal={lr.guarantor.sub_total} contractNoLabel="Cam / Contract No" showPaymentStatus showRemark={false} showConsLeas={false} />
							</div>
						)}

						{lr.grand_total_all && <GrandTotalTable title="Grand Total (incl. Group/Guarantor)" gt={lr.grand_total_all} />}
					</div>
				</Section>
			)}

			{lr && (
				<div className="px-1 text-sm text-[var(--app-text)]">
					<p className="mb-1">Remark for Finance Type :</p>
					<ul className="space-y-0.5 pl-1">
						<li>- F = Finance Lease (FL)</li>
						<li>- I = Installment Financing (IF)</li>
						<li>- S = Sale &amp; Leaseback (SL)</li>
						<li>- D = Fasilitas Dana (FD)</li>
						<li>- M = Fasilitas Modal Usaha (FMU)</li>
					</ul>
				</div>
			)}
		</div>
	);
}
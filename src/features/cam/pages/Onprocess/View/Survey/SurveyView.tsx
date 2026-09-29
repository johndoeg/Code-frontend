import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';

interface Character {
	credit_history_label: string;
	reference: string;
	work_experience: string;
	note: string;
	company_status: string | null;
	scale_of_business: string | null;
}

interface Capital {
	living_label: string | null;
	living_status_label: string | null;
	car_ownership: string | null;
	note: string;
	business_location: string | null;
	office_status: string | null;
	total_unit_owned: string | null;
	unit_free_from_finance: string | null;
	estimated_total_assets_label: string | null;
	estimated_total_assets_asof: string | null;
}

interface Capacity {
	job_occupation_customer: string | null;
	fixed_monthly_income: number | null;
	fixed_income_source_label: string | null;
	job_occupation_spouse: string | null;
	spouse_income_per_month: number | null;
	total_other_income: number | null;
	total_other_income_status: string | null;
	total_other_income_source_label: string | null;
	total_income_per_month: number | null;
	total_income_status: string | null;
	average_income_per_year: number | null;
	note: string;
	monthly_profit: number | null;
	monthly_profit_status: string | null;
	monthly_profit_source_label: string | null;
	sales_per_month: number | null;
	net_profit_to_sales: string | null;
}

interface Collateral {
	unit_type: string;
	insurance: string;
	payment_method: string;
	note: string;
	loan_to_value: number;
	guarantor: string;
}

interface Condition {
	total_outstanding_label: string;
	dealer_status: string;
	usage_of_car: string;
	credit_period: string;
}

interface SidRow {
	subject: string;
	show_related_party: boolean;
	related_party: string;
	show_keterangan_text: boolean;
	keterangan_text: string;
	show_type: boolean;
	type_label: string;
	credit_bureau: string;
	status: string;
	score: string | number;
	grade: string;
	pefindo_download_url: string | null;
}

interface SurveyData {
	no_data: boolean;
	ind_cor: string;
	character: Character;
	capital: Capital;
	capacity: Capacity;
	collateral: Collateral;
	condition: Condition;
	sid_checking: { note: string; rows: SidRow[] };
}

function fmt(n: number | null | undefined): string {
	if (n === null || n === undefined) return '-';
	return Math.round(n).toLocaleString('en-US');
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="mb-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<div className="border-b border-[var(--app-border)] bg-[#2055DE] px-5 py-2.5">
				<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{title}</h2>
			</div>
			<div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[3fr_2fr]">{children}</div>
		</div>
	);
}

const cellLabel =
	"border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 align-top text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]";
const cellValue =
	"border border-[var(--app-border)] px-3 py-2 align-top text-sm text-[var(--app-text)]";
const thCell =
	"border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]";
const tdCell =
	"border border-[var(--app-border)] px-3 py-2.5 align-top text-sm text-[var(--app-text)]";

type FieldEntry = { label: string; value: React.ReactNode };

function FieldTable({ rows }: { rows: FieldEntry[] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full border-collapse text-sm">
				<colgroup>
					<col className="w-[38%]" />
					<col className="w-[62%]" />
				</colgroup>
				<tbody>
					{rows.map((r, i) => (
						<tr key={i}>
							<td className={cellLabel}>{r.label}</td>
							<td className={cellValue}>
								{r.value === '' || r.value === null || r.value === undefined ? '-' : r.value}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function Pill({ value }: { value: React.ReactNode }) {
	if (value === '' || value === null || value === undefined) {
		return <span className="text-[var(--app-muted)]">-</span>;
	}
	return (
		<span className="inline-flex items-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-alt)] px-2.5 py-0.5 text-xs font-semibold text-[var(--app-text)]">
			{value}
		</span>
	);
}

function NotePanel({ note }: { note: string }) {
	return (
		<div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-sm text-[var(--app-muted)]">
			{note || <span className="text-[var(--app-muted)]">No note.</span>}
		</div>
	);
}

function SidCheckingTable({ rows }: { rows: SidRow[] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full overflow-hidden rounded-lg border border-[var(--app-border)] border-collapse text-sm shadow-sm">
				<thead>
					<tr>
						<th className={thCell}>Subject</th>
						<th className={thCell}>Related Party</th>
						<th className={thCell}>Keterangan</th>
						<th className={thCell}>Type</th>
						<th className={thCell}>Credit Bureau</th>
						<th className={thCell}>Status</th>
						<th className={thCell}>Score</th>
						<th className={thCell}>Grade</th>
						<th className={thCell}>File</th>
					</tr>
				</thead>
				{rows.length > 0 && (
					<tbody>
						{rows.map((r, i) => (
							<tr key={i} className={i % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}>
								<td className={tdCell}>{r.subject || '-'}</td>
								<td className={tdCell}>{r.show_related_party ? (r.related_party || '-') : '-'}</td>
								<td className={tdCell}>{r.show_keterangan_text ? (r.keterangan_text || '-') : '-'}</td>
								<td className={tdCell}>{r.show_type ? (r.type_label || '-') : '-'}</td>
								<td className={tdCell}>{r.credit_bureau || '-'}</td>
								<td className={tdCell}><Pill value={r.status} /></td>
								<td className={tdCell}>{r.score === '' || r.score === null || r.score === undefined ? '-' : r.score}</td>
								<td className={tdCell}><Pill value={r.grade} /></td>
								<td className={tdCell}>
									{r.pefindo_download_url ? (
										<a
											href={r.pefindo_download_url}
											className="inline-flex items-center gap-1.5 rounded-md border border-orange-500 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 transition-colors hover:border-orange-600 hover:bg-orange-500 hover:text-white"
										>
											<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
												<path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
											</svg>
											Pefindo
										</a>
									) : (
										<span className="text-[var(--app-muted)]">-</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				)}
			</table>
		</div>
	);
}

export default function SurveyView({ ctx }: { ctx: CamCtx }) {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-survey', ctx.apless, ctx.applno, ctx.newCar, ctx.indCor],
		queryFn: async () => {
			const res = await api.get<SurveyData>('/CAM/View/survey', {
				params: { apless: ctx.apless, applno: ctx.applno, new_car: ctx.newCar, ind_cor: ctx.indCor },
			});
			return res.data;
		},
	});

	if (isLoading) {
		return <LoadingCard message="Loading survey…" />;
	}
	if (isError || !data) {
		return <ErrorCard message="Failed to load survey data." />;
	}
	if (data.no_data) {
		return <NoDataCard />;
	}

	const isCorp = data.ind_cor === '2';
	const ch = data.character;
	const cap = data.capital;
	const cy = data.capacity;
	const co = data.collateral;
	const cn = data.condition;

	const characterRows: FieldEntry[] = [
		{ label: 'Credit History', value: ch.credit_history_label },
		{ label: 'Reference', value: ch.reference },
		{ label: isCorp ? 'Business Experience' : 'Working/ Business Experience', value: ch.work_experience },
		...(isCorp ? [
			{ label: 'Company Status', value: ch.company_status },
			{ label: 'Scale of Business', value: ch.scale_of_business },
		] : []),
	];

	const capitalRows: FieldEntry[] = !isCorp
		? [
			{ label: 'Living', value: cap.living_label },
			{ label: `${cap.living_label || 'Living'} Status`, value: cap.living_status_label },
			{ label: 'Car Ownership', value: cap.car_ownership },
		]
		: [
			{ label: 'Business Location', value: cap.business_location },
			{ label: 'Office Status', value: cap.office_status },
			{ label: 'Total Unit Owned (Vehicle)', value: cap.total_unit_owned },
			{ label: 'Unit Free from Finance', value: cap.unit_free_from_finance },
			{ label: `Estimated Total Assets (as of ${cap.estimated_total_assets_asof || '-'})`, value: cap.estimated_total_assets_label },
		];

	const capacityRows: FieldEntry[] = !isCorp
		? [
			{ label: 'Job / Occupation (Customer)', value: cy.job_occupation_customer },
			{ label: 'Fixed Monthly Income (Rp.) / Source Of Fund', value: `${fmt(cy.fixed_monthly_income)} / ${cy.fixed_income_source_label || '-'}` },
			{ label: 'Job/ Occupation (Spouse)', value: cy.job_occupation_spouse },
			{ label: 'Spouse Income Per Month (Rp.)', value: fmt(cy.spouse_income_per_month) },
			{ label: 'Total Other Income Per Month (Rp.) / Source Of Fund', value: `${fmt(cy.total_other_income)} ${cy.total_other_income_status} / ${cy.total_other_income_source_label || '-'}` },
			{ label: 'Total Income per Month (Rp.)', value: `${fmt(cy.total_income_per_month)} ${cy.total_income_status}` },
			{ label: 'Average Income per Year (Rp.)', value: fmt(cy.average_income_per_year) },
		]
		: [
			{ label: 'Monthly Profit (Rp.) / Source Of Fund', value: `${fmt(cy.monthly_profit)} ${cy.monthly_profit_status} / ${cy.monthly_profit_source_label || '-'}` },
			{ label: 'Sales/ Month (Rp.)', value: fmt(cy.sales_per_month) },
			{ label: 'Net Profit : Sales (Rp.)', value: cy.net_profit_to_sales },
		];

	const collateralRows: FieldEntry[] = [
		{ label: 'Unit Type', value: co.unit_type },
		{ label: 'Loan to Value', value: `${co.loan_to_value}%` },
		{ label: 'Insurance', value: co.insurance },
		{ label: 'Guarantor', value: co.guarantor },
		{ label: 'Payment Method', value: co.payment_method },
	];

	const conditionRows: FieldEntry[] = [
		{ label: 'Credit Period', value: cn.credit_period },
		{ label: 'Total Outstanding (Rp.)', value: cn.total_outstanding_label },
		{ label: 'Dealer Status', value: cn.dealer_status },
		{ label: 'Usage of Car', value: cn.usage_of_car },
	];

	return (
		<div>
			<Card title="Character">
				<FieldTable rows={characterRows} />
				<NotePanel note={ch.note} />
			</Card>

			<Card title="Capital">
				<FieldTable rows={capitalRows} />
				<NotePanel note={cap.note} />
			</Card>

			<Card title="Capacity">
				<FieldTable rows={capacityRows} />
				<NotePanel note={cy.note} />
			</Card>

			<Card title="Collateral">
				<FieldTable rows={collateralRows} />
				<NotePanel note={co.note} />
			</Card>

			<Card title="Condition">
				<FieldTable rows={conditionRows} />
				<div />
			</Card>

			<div className="mb-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<div className="border-b border-[var(--app-border)] bg-[#2055DE] px-5 py-2.5">
					<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">File SID Checking</h2>
				</div>
				<div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[3fr_2fr]">
					<SidCheckingTable rows={data.sid_checking.rows} />
					<NotePanel note={data.sid_checking.note} />
				</div>
			</div>
		</div>
	);
}
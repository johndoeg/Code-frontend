import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import DocPreviewModal, { PREVIEW_CLOSED, type PreviewState } from '@/features/cam/components/DocPreviewModal';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';

interface LiabilityRow {
	category: string;
	description: string;
	amount: number;
}

interface IncomeItem {
	label: string;
	amount: number;
}

interface AssetRow {
	description: string;
	amount: number;
	notes: string;
}

interface IndividualFinance {
	no_data: boolean;
	period_label?: string;
	currency?: string;
	liabilities?: { rows: LiabilityRow[]; total: number };
	income?: {
		income_items: IncomeItem[];
		total_income: number;
		expense_items: IncomeItem[];
		liabilities_total: number;
		net_saving: number;
	};
	dscr?: string;
	assets?: { rows: AssetRow[]; total: number };
}

interface BalanceSheetRow {
	label: string;
	amount_a: number;
	amount_b: number;
}

interface BalanceSheetSection {
	header: string;
	rows: BalanceSheetRow[];
	subtotal_a: number;
	subtotal_b: number;
	show_subtotal: boolean;
}

interface ProfitLossRow {
	fs_code: string;
	label: string;
	amount: number;
	bold: boolean;
	section_header: boolean;
}

interface CorporateFinance {
	no_data: boolean;
	balance_sheet?: {
		period_label_1: string;
		period_label_2: string;
		asset_sections: BalanceSheetSection[];
		asset_total1: number;
		asset_total2: number;
		liability_sections: BalanceSheetSection[];
		liability_total1: number;
		liability_total2: number;
	};
	profit_loss?: { period_label: string; rows: ProfitLossRow[] };
	dscr?: string;
}

interface BankStatementRow {
	period_label: string;
	beginning_balance: number;
	debet: number;
	credit: number;
	ending_balance: number;
	notes: string;
}

interface BankAccount {
	bank_name: string;
	branch: string;
	account_no: string;
	account_name: string;
	currency: string;
	notes: string;
	statements: BankStatementRow[];
}

interface BankFile {
	id: number;
	name: string;
	download_url: string | null;
}

interface FinancialInfo {
	ind_cor: string;
	individual: IndividualFinance | null;
	corporate: CorporateFinance | null;
	bank_accounts: BankAccount[];
	bank_statement_files: BankFile[];
}

function fmt(n: number | undefined | null): string {
	if (n === undefined || n === null || Number.isNaN(n)) return '0';
	return Math.round(n).toLocaleString('en-US');
}

function fmtRp(n: number | undefined | null): string {
	return `Rp. ${fmt(n)}`;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-[var(--app-border)] bg-[#2055DE] px-6 py-2.5">
			<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{children}</h2>
		</div>
	);
}

function SubTitle({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
	return (
		<div className="px-6 pt-5 pb-1 text-center">
			<h3 className="text-sm font-bold text-[var(--app-text)]">{children}</h3>
			{sub && <p className="mt-0.5 text-xs text-[var(--app-muted)]">{sub}</p>}
		</div>
	);
}

function Panel({ children, widths }: { children: React.ReactNode; widths?: string[] }) {
	return (
		<div className="overflow-hidden rounded-xl">
			<table className="w-full border-collapse text-sm" style={widths ? { tableLayout: 'fixed' } : undefined}>
				{widths && (
					<colgroup>
						{widths.map((w, i) => (
							<col key={i} style={{ width: w }} />
						))}
					</colgroup>
				)}
				{children}
			</table>
		</div>
	);
}

const panelHead = "border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-left text-sm font-bold text-[var(--app-text)]";
const panelHeadCenter = "border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-center text-sm font-bold text-[var(--app-text)]";
const colHead = "border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]";
const dataCell = "border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]";
const totalRow = "border border-[var(--app-border)] bg-[var(--app-surface)]/60 px-3 py-2 font-semibold text-[var(--app-text)]";

function IndividualFinanceSection({ data }: { data: IndividualFinance }) {
	return (
		<div className="space-y-4 px-6 py-5">
			<Panel>
				<tbody>
					<tr>
						<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">Currency {data.currency}</td>
						<td colSpan={2} className="border border-[var(--app-border)] px-3 py-2 text-center font-semibold text-[var(--app-text)]">
							{data.period_label}
						</td>
					</tr>
					<tr>
						<td colSpan={3} className={panelHead}>Liabilities</td>
					</tr>
					<tr>
						<td colSpan={3} className="border border-[var(--app-border)] px-3 py-2 text-center text-sm text-[var(--app-muted)]">
							Estimated Liabilities
						</td>
					</tr>
					<tr>
						<th className={colHead}>Category</th>
						<th className={colHead}>Descriptions</th>
						<th className={colHead}>Amount</th>
					</tr>
					{data.liabilities?.rows.map((r, i) => (
						<tr key={i}>
							<td className={dataCell}>{r.category}</td>
							<td className={dataCell}>{r.description}</td>
							<td className={`${dataCell} text-right`}>{fmt(r.amount)}</td>
						</tr>
					))}
					<tr>
						<td colSpan={2} className={`${totalRow} text-right`}>Total</td>
						<td className={`${totalRow} text-right`}>{fmt(data.liabilities?.total)}</td>
					</tr>
				</tbody>
			</Panel>

			<Panel>
				<tbody>
					<tr>
						<td colSpan={2} className={panelHead}>Estimated Monthly Income</td>
					</tr>
					{data.income?.income_items.map((it, i) => (
						<tr key={`inc-${i}`}>
							<td className={dataCell}>{it.label}</td>
							<td className={`${dataCell} text-right`}>{fmt(it.amount)}</td>
						</tr>
					))}
					<tr>
						<td className={`${totalRow} text-right`}>Total Income</td>
						<td className={`${totalRow} text-right`}>{fmt(data.income?.total_income)}</td>
					</tr>
					{data.income?.expense_items.map((it, i) => (
						<tr key={`exp-${i}`}>
							<td className={dataCell}>{it.label}</td>
							<td className={`${dataCell} text-right`}>{fmt(it.amount)}</td>
						</tr>
					))}
					<tr>
						<td className={dataCell}>Liabilities</td>
						<td className={`${dataCell} text-right`}>{fmt(data.income?.liabilities_total)}</td>
					</tr>
					<tr>
						<td className={`${totalRow} text-right`}>Net Saving</td>
						<td className={`${totalRow} text-right`}>{fmt(data.income?.net_saving)}</td>
					</tr>
				</tbody>
			</Panel>

			<Panel>
				<tbody>
					<tr>
						<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">DSCR</td>
						<td className="border border-[var(--app-border)] px-3 py-2 text-right font-semibold text-[var(--app-text)]">{data.dscr}</td>
					</tr>
				</tbody>
			</Panel>

			<Panel>
				<tbody>
					<tr>
						<td colSpan={3} className={panelHeadCenter}>Customer Asset Ownership</td>
					</tr>
					<tr>
						<th className={colHead}>Descriptions</th>
						<th className={colHead}>Amount Estimated</th>
						<th className={colHead}>Notes</th>
					</tr>
					{data.assets?.rows.map((r, i) => (
						<tr key={i}>
							<td className={dataCell}>{r.description}</td>
							<td className={`${dataCell} text-right`}>{fmt(r.amount)}</td>
							<td className={dataCell}>{r.notes}</td>
						</tr>
					))}
					<tr>
						<td className={`${totalRow} text-right`}>Total Assets</td>
						<td className={`${totalRow} text-right`}>{fmt(data.assets?.total)}</td>
						<td className={totalRow} />
					</tr>
				</tbody>
			</Panel>
		</div>
	);
}

function BalanceSheetPanel({
	periodHeader,
	sections,
	total1,
	total2,
	totalLabel,
}: {
	periodHeader?: [string, string];
	sections: BalanceSheetSection[];
	total1: number;
	total2: number;
	totalLabel: string;
}) {
	return (
		<Panel widths={['50%', '25%', '25%']}>
			<tbody>
				{periodHeader && (
					<tr>
						<td className={panelHead}>Period Neraca</td>
						<td className={panelHeadCenter}>{periodHeader[0]}</td>
						<td className={panelHeadCenter}>{periodHeader[1]}</td>
					</tr>
				)}
				{sections.map((sec, si) => (
					<React.Fragment key={si}>
						<tr>
							<td colSpan={3} className={`${dataCell} text-center font-semibold`}>{sec.header}</td>
						</tr>
						{sec.rows.map((row, ri) => (
							<tr key={ri}>
								<td className={dataCell}>{row.label}</td>
								<td className={`${dataCell} text-right`}>{fmtRp(row.amount_a)}</td>
								<td className={`${dataCell} text-right`}>{fmtRp(row.amount_b)}</td>
							</tr>
						))}
						{sec.show_subtotal && (
							<tr>
								<td className={`${totalRow}`}>TOTAL {sec.header}</td>
								<td className={`${totalRow} text-right`}>{fmtRp(sec.subtotal_a)}</td>
								<td className={`${totalRow} text-right`}>{fmtRp(sec.subtotal_b)}</td>
							</tr>
						)}
					</React.Fragment>
				))}
				<tr>
					<td className={totalRow}>{totalLabel}</td>
					<td className={`${totalRow} text-right`}>{fmtRp(total1)}</td>
					<td className={`${totalRow} text-right`}>{fmtRp(total2)}</td>
				</tr>
			</tbody>
		</Panel>
	);
}

function CorporateFinanceSection({ data }: { data: CorporateFinance }) {
	const bs = data.balance_sheet;
	const pl = data.profit_loss;
	return (
		<div className="space-y-4 px-6 py-5">
			{bs && (
				<>
					<SubTitle>Neraca (Balance Sheet)</SubTitle>
					<div className="space-y-4">
						<BalanceSheetPanel
							periodHeader={[bs.period_label_1, bs.period_label_2]}
							sections={bs.asset_sections}
							total1={bs.asset_total1}
							total2={bs.asset_total2}
							totalLabel="TOTAL ASSET"
						/>
						<BalanceSheetPanel
							sections={bs.liability_sections}
							total1={bs.liability_total1}
							total2={bs.liability_total2}
							totalLabel="TOTAL LIABILITIES AND NET WORTH"
						/>
					</div>
				</>
			)}

			{pl && (
				<>
					<SubTitle sub={pl.period_label}>Laporan Laba/Rugi (Profit/Loss)</SubTitle>
					<Panel>
						<tbody>
							{pl.rows.map((r, i) =>
								r.section_header ? (
									<tr key={i}>
										<td colSpan={2} className={`${dataCell} text-center font-bold`}>{r.label}</td>
									</tr>
								) : (
									<tr key={i}>
										<td className={`${dataCell} ${r.bold ? 'font-semibold' : ''}`}>{r.label}</td>
										<td className={`${dataCell} text-right ${r.bold ? 'font-semibold' : ''}`}>{fmtRp(r.amount)}</td>
									</tr>
								)
							)}
						</tbody>
					</Panel>
				</>
			)}

			<Panel>
				<tbody>
					<tr>
						<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">DSCR</td>
						<td className="border border-[var(--app-border)] px-3 py-2 text-right font-semibold text-[var(--app-text)]">{data.dscr}</td>
					</tr>
				</tbody>
			</Panel>
		</div>
	);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div>
			<dt className="text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]">{label}</dt>
			<dd className="mt-0.5 text-sm text-[var(--app-text)]">{value || '-'}</dd>
		</div>
	);
}

const FileIcon = () => (
	<svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-[var(--app-muted)]" aria-hidden="true">
		<path
			d="M6 2.5h5.5L15.5 6.5V16a1 1 0 0 1-1 1h-8.5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z"
			stroke="currentColor"
			strokeWidth="1.3"
			strokeLinejoin="round"
		/>
		<path d="M11.25 2.5V6a1 1 0 0 0 1 1h3.25" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
	</svg>
);

const EyeIcon = () => (
	<svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
		<path
			d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z"
			stroke="currentColor"
			strokeWidth="1.4"
			strokeLinejoin="round"
		/>
		<circle cx="10" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.4" />
	</svg>
);

function DocFilesTable({
	files,
	onPreview,
}: {
	files: BankFile[];
	onPreview: (file: BankFile) => void;
}) {
	return (
		<table className="w-full max-w-2xl overflow-hidden rounded-lg border border-[var(--app-border)] text-sm shadow-sm">
			<thead>
				<tr className="bg-[var(--app-surface)]">
					<th className="w-12 border-b-2 border-[var(--app-border)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
						No.
					</th>
					<th className="border-b-2 border-[var(--app-border)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
						File Name
					</th>
					<th className="w-28 border-b-2 border-[var(--app-border)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
						Action
					</th>
				</tr>
			</thead>
			<tbody className="divide-y divide-[var(--app-border)]">
				{files.map((f, i) => (
					<tr key={f.id} className="bg-[var(--app-card)] transition-colors hover:bg-[var(--app-surface)]/60">
						<td className="px-3 py-2 text-[var(--app-muted)]">{i + 1}</td>
						<td className="px-3 py-2 text-[var(--app-text)]">
							<span className="flex min-w-0 items-center gap-2">
								<FileIcon />
								<span className="truncate" title={f.name}>{f.name}</span>
							</span>
						</td>
						<td className="px-3 py-2">
							{f.download_url ? (
								<button
									type="button"
									onClick={() => onPreview(f)}
									className="inline-flex items-center gap-1.5 rounded-md bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--app-card)]"
								>
									<EyeIcon />
									View
								</button>
							) : (
								<span className="text-xs text-[var(--app-muted)]">—</span>
							)}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

export default function FinancialInfoView({ ctx }: { ctx: CamCtx }) {
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-financial-info', ctx.apless, ctx.applno, ctx.indCor],
		queryFn: async () => {
			const res = await api.get<FinancialInfo>('/CAM/View/financial-info', {
				params: { apless: ctx.apless, applno: ctx.applno, ind_cor: ctx.indCor },
			});
			return res.data;
		},
	});

	const handlePreview = (file: BankFile) => {
		if (!file.download_url) return;
		setPreview({ open: true, name: file.name, url: file.download_url });
	};

	if (isLoading) {
		return <LoadingCard message="Loading financial information…" />;
	}
	if (isError || !data) {
		return <ErrorCard message="Failed to load financial information." />;
	}

	const section = data.ind_cor === '1' ? data.individual : data.ind_cor === '2' ? data.corporate : null;

	if (section?.no_data) {
		return <NoDataCard />;
	}

	return (
		<div>
			<DocPreviewModal state={preview} onClose={() => setPreview(PREVIEW_CLOSED)} />

			<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<SectionHeader>Financial Information Review</SectionHeader>

				{data.ind_cor === '1' && data.individual && <IndividualFinanceSection data={data.individual} />}
				{data.ind_cor === '2' && data.corporate && <CorporateFinanceSection data={data.corporate} />}

				{data.bank_accounts.length > 0 && (
					<>
						<SectionHeader>Bank Statement</SectionHeader>
						<div className="space-y-6 px-6 py-5">
							{data.bank_accounts.map((acc, i) => (
								<div key={i} className="overflow-hidden rounded-xl border border-[var(--app-border)]">
									<dl className="grid grid-cols-1 gap-x-8 gap-y-3 p-4 sm:grid-cols-2">
										<Field label="Bank" value={`${acc.bank_name} / ${acc.branch}`} />
										<Field label="Account Number" value={acc.account_no} />
										<Field label="Account Name" value={acc.account_name} />
										<Field label="Currency" value={acc.currency} />
										<Field label="Account Notes" value={acc.notes} />
									</dl>
									<div className="border-t border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2">
										<h4 className="text-center text-sm font-bold text-[var(--app-text)]">Bank Summary</h4>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full border-collapse text-sm">
											<thead>
												<tr>
													<th className={colHead}>Month - Year</th>
													<th className={colHead}>Beginning Balance</th>
													<th className={colHead}>Debet</th>
													<th className={colHead}>Credit</th>
													<th className={colHead}>Ending Balance</th>
													<th className={colHead}>Notes</th>
												</tr>
											</thead>
											<tbody>
												{acc.statements.map((s, si) => (
													<tr key={si} className={si % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}>
														<td className={`${dataCell} text-right`}>{s.period_label}</td>
														<td className={`${dataCell} text-right`}>{fmt(s.beginning_balance)}</td>
														<td className={`${dataCell} text-right`}>{fmt(s.debet)}</td>
														<td className={`${dataCell} text-right`}>{fmt(s.credit)}</td>
														<td className={`${dataCell} text-right`}>{fmt(s.ending_balance)}</td>
														<td className={`${dataCell} text-center`}>{s.notes}</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							))}
						</div>
					</>
				)}

				<SubTitle>Bank Statement Files</SubTitle>
				<div className="px-6 pb-6 pt-2">
					{data.bank_statement_files.length === 0 ? (
						<span className="text-sm text-[var(--app-muted)]">No file(s) uploaded.</span>
					) : (
						<DocFilesTable files={data.bank_statement_files} onPreview={handlePreview} />
					)}
				</div>
			</div>
		</div>
	);
}
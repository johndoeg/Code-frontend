import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';

interface BankAccount { bank_branch: string; account_no: string; account_name: string; amount: number; }
interface ApprovalRow { full_name: string; date: string; sent_to_admin: boolean; }
interface ReferenceRow { name: string; phone: string; remark: string; }
interface CommissionSale { label: string; amount: number; }
interface OutstandingRow { label: string; unit: number; amount: number; }
interface CreditScoringItem { description: string; result: string; score: number | string; }
interface InstallmentStep { months: number | string; amount: number; }

interface JobHistoryRow {
	from: string;
	until: string;
	company: string;
	address: string;
	city: string;
	province: string;
	postal_code: string;
	employee_id?: string;
	position: string;
	phone: string;
}

interface SidCheckingFile {
	subject: string;
	credit_bureau: string;
	status: string;
	score: string;
	grade: string;
	file_label?: string;
	file_url?: string;
}

interface CustomerSurveyDetail {
	is_corporate?: boolean;
	credit_history?: string;
	reference?: string;
	work_experience?: string;
	business_size?: string;
	company_status?: string;
	scale_of_business?: string;

	living?: string;
	living_status?: string;
	car_ownership?: string;
	business_location?: string;
	total_unit_owned?: string;
	unit_free_from_finance?: string;
	estimated_total_assets_as_of?: string;

	job_customer?: string;
	fixed_monthly_income?: number;
	income_source_note?: string;
	spouse_income?: number;
	other_income?: number;
	other_income_note?: string;
	total_income?: number;
	total_income_note?: string;
	average_income_per_year?: number;
	monthly_profit?: number;
	monthly_profit_note?: string;
	sales_per_month?: number;
	net_profit_ratio?: string;

	unit_type?: string;
	loan_to_value?: number;
	insurance_payment?: string;
	guarantor_available?: string;
	payment_method?: string;
	credit_period?: string;
	total_outstanding_bucket?: string;
	dealer_status?: string;
	usage_of_car?: string;
	job_history: JobHistoryRow[];
	sid_checking: SidCheckingFile[];
	sid_checking_notes?: string;
}

interface GuarantorDetail {
	entity_type: 'PR' | 'PT';
	name: string;
	name_without_title?: string;
	category?: string;
	id_card?: string;
	id_card_validity?: string;
	passport_no?: string;
	citizenship?: string;
	nationality?: string;
	date_of_birth?: string;
	place_of_birth?: string;
	gender?: string;
	marital_status?: string;
	address?: string;
	phone?: string;
	fax?: string;
	mobile?: string;
	email?: string;
	relationship_with_customer?: string;
	occupation?: string;
	bi_customer_type?: string;
	total_exposure?: number;
	npwp?: string;
	line_of_business?: string;
	contract_signer_name?: string;
	contract_signer_position?: string;
	contract_signer_id_card?: string;
	contract_signer_mobile?: string;
	contract_signer_email?: string;
	spouse_name?: string;
	spouse_id_card?: string;
	spouse_address?: string;
	spouse_status?: string;
	spouse_citizenship?: string;
	spouse_mobile?: string;
	spouse_email?: string;
}

interface BeneficialOwnerDetail {
	entity_type: 'PR' | 'PT';
	name: string;
	alias?: string;
	type_label?: string;
	address?: string;
	area?: string;
	province?: string;
	city?: string;
	kecamatan?: string;
	kelurahan?: string;
	rt_rw?: string;
	postal_code?: string;
	fax?: string;
	phone?: string;
	mobile?: string;
	email?: string;
	place_date_of_birth?: string;
	npwp?: string;
	siup_no?: string;
	line_of_business?: string;
	source_of_fund?: string;
	average_income?: number;
	contact_name?: string;
	contact_position?: string;
	contact_address?: string;
}

interface FinancialReviewLineItem { label: string; period1?: number; period2?: number; is_total?: boolean; }
interface AssetLineItem { description: string; amount: number; notes?: string; }
interface BankStatementPeriodRow {
	period: string;
	beginning_balance: number;
	debit: number;
	credit: number;
	ending_balance: number;
	notes?: string;
}
interface BankStatementAccount {
	bank_name: string;
	branch?: string;
	account_no: string;
	account_name: string;
	currency: string;
	notes?: string;
	rows: BankStatementPeriodRow[];
}
interface FinancialReview {
	currency?: string;
	period_label?: string;

	balance_sheet?: FinancialReviewLineItem[];
	profit_loss?: FinancialReviewLineItem[];

	liabilities?: AssetLineItem[];
	total_liabilities?: number;
	monthly_income?: AssetLineItem[];
	total_income?: number;
	net_saving?: number;
	assets?: AssetLineItem[];
	total_assets?: number;
	dscr?: number;
	bank_statements: BankStatementAccount[];
}

interface SignoffRole { code: string; label: string; }

interface ApuPptQuestion { no: string; question: string; answer: string; }
interface ApuPptParty {
	name: string;
	type: string;
	occupation_business_type: string;
	apu_ppt_status: string;
	identification_verification: string;
}
interface ApuPptData {
	customer: ApuPptParty;
	show_edd_customer: boolean;
	edd_customer_questions: ApuPptQuestion[];
	show_beneficial_owner: boolean;
	beneficial_owner: ApuPptParty;
	show_edd_bo: boolean;
	edd_bo_questions: ApuPptQuestion[];
}

interface EquipmentDetail {
	user_usage: string;
	vehicle_purpose: string;
	show_financing_purpose: boolean;
	financing_purpose: string;
	customer_purpose: string;
	parking_address: string;
	zip_code: string;
	insurance_area: string;
	additional_collateral: string;
	ojk_financing_goods: string;
	ojk_collateral_goods: string;
	karoseri_name?: string | null;
	karoseri_address?: string | null;
	accessories_name?: string | null;
	accessories_address?: string | null;
	other_name?: string | null;
	other_address?: string | null;
}

interface OrgShareholder { no: number; name: string; status: string; total_shares: number | string; nominal_shares: number; }
interface OrgComposition { no: number; name: string; position: string; owner: boolean; }
interface OrgDeed { no: number; state_gazette_no: string; deed_no: string; date_of_deed: string; notary_name: string; certificate: string; }
interface OrgSigner { name: string; position: string; }
interface OrgManagement { no: number; name: string; id_card: string; address: string; }
interface OrgSimpleDeed { no: number; deed_no: string; date_of_deed: string; notary_name: string; certificate: string; }
interface OrgStructure {
	entity_type: string;
	period: string;
	authorized_capital?: number;
	paid_in_capital?: number;
	shareholders?: OrgShareholder[];
	bod?: OrgComposition[];
	boc?: OrgComposition[];
	board_of_management?: OrgComposition[];
	board_of_supervisor?: OrgComposition[];
	fostering_foundation?: OrgComposition[];
	active_partner?: OrgComposition[];
	limited_partner?: OrgComposition[];
	deed: (OrgDeed | OrgSimpleDeed)[];
	deed_certificate_label?: string;
	contract_signer: string;
	pic: string;
	signers: OrgSigner[];
	management: OrgManagement[];
}

function OrgCompositionSection({ letter, title, positionHeader, rows }: { letter?: string; title: string; positionHeader: string; rows: OrgComposition[] }) {
	return (
		<>
			<tr>
				<td colSpan={4} style={{ border: 0 }}>
					<table cellPadding={2} cellSpacing={0}>
						<tbody>
							{title && <tr><td colSpan={4} className="bf2"><strong>{letter}. {title}</strong></td></tr>}
							<tr className="center">
								<td width="7%" className="bf3"><strong>No.</strong></td>
								<td width="53%" className="bf3"><strong>Name in ID Card</strong></td>
								<td width="40%" className="bf3"><strong>{positionHeader}</strong></td>
								<td width="5%" className="bf3"><strong>Owner</strong></td>
							</tr>
							{rows.map(r => (
								<tr key={r.no}>
									<td className="bf3 center">{r.no}</td>
									<td className="bf3">{r.name}</td>
									<td className="bf3">{r.position}</td>
									<td className="bf3 center"><input type="checkbox" checked={r.owner} disabled readOnly /></td>
								</tr>
							))}
						</tbody>
					</table>
				</td>
			</tr>
			<tr><td style={{ border: 0, height: 30 }} colSpan={4}></td></tr>
		</>
	);
}

function OrgDeedSection({ letter, certificateLabel, rows }: { letter: string; certificateLabel: string; rows: (OrgDeed | OrgSimpleDeed)[] }) {
	return (
		<>
			<tr>
				<td colSpan={4} style={{ border: 0 }}>
					<table cellPadding={2} cellSpacing={0}>
						<tbody>
							<tr><td colSpan={5} className="bf2"><strong>{letter}. DEED OF ESTABLISHMENT</strong></td></tr>
							<tr className="center">
								<td width="5%" className="bf1"><strong>No.</strong></td>
								<td width="20%" className="bf"><strong>Deed No.</strong></td>
								<td width="15%" className="bf"><strong>Date of Deed</strong></td>
								<td width="25%" className="bf"><strong>Notary Name</strong></td>
								<td width="35%" className="bf"><strong>{certificateLabel}</strong></td>
							</tr>
							{rows.map(r => (
								<tr key={r.no}>
									<td className="bf1 center">{r.no}</td>
									<td className="bf center">{(r as OrgSimpleDeed).deed_no}</td>
									<td className="bf center">{r.date_of_deed}</td>
									<td className="bf">{r.notary_name}</td>
									<td className="bf">{r.certificate}</td>
								</tr>
							))}
						</tbody>
					</table>
				</td>
			</tr>
			<tr><td style={{ border: 0, height: 30 }} colSpan={4}></td></tr>
		</>
	);
}

function OrgSignerSection({ signerLetter, signerTitle, picLetter, contractSigner, pic, signers }: { signerLetter: string; signerTitle: string; picLetter: string; contractSigner: string; pic: string; signers: OrgSigner[] }) {
	return (
		<>
			<tr>
				<td colSpan={4} style={{ border: 0 }}>
					<table cellPadding={2} cellSpacing={0}>
						<tbody>
							<tr><td colSpan={2} style={{ border: 0 }}><strong>{signerLetter}. {signerTitle}</strong></td></tr>
							<tr><td colSpan={2} style={{ border: 0, paddingLeft: 50 }}>{contractSigner}</td></tr>
							<tr><td colSpan={2} style={{ border: 0, height: 30 }}></td></tr>
							<tr><td colSpan={2} style={{ border: 0 }}><strong>{picLetter}. PERSON IN CHARGE TO SIGN CONTRACT</strong></td></tr>
							<tr><td colSpan={2} style={{ border: 0, paddingLeft: 50 }}>{pic}</td></tr>
							<tr><td colSpan={2} style={{ border: 0, height: 30 }}></td></tr>
							<tr><td colSpan={2} style={{ border: 0 }}>SIGNER :</td></tr>
							<tr>
								<td style={{ border: 0 }}><strong>Name</strong></td>
								<td style={{ border: 0 }}><strong>Position</strong></td>
							</tr>
							{signers.map((r, i) => (
								<tr key={i}>
									<td style={{ border: 0 }}>{r.name}</td>
									<td style={{ border: 0 }}>{r.position}</td>
								</tr>
							))}
						</tbody>
					</table>
				</td>
			</tr>
			<tr><td style={{ border: 0, height: 30 }} colSpan={4}></td></tr>
		</>
	);
}

function OrgManagementSection({ letter, nameHeader, addressHeader, rows }: { letter: string; nameHeader: string; addressHeader: string; rows: OrgManagement[] }) {
	return (
		<tr>
			<td colSpan={4} style={{ border: 0 }}>
				<table cellPadding={2} cellSpacing={0}>
					<tbody>
						<tr><td colSpan={5} className="bf2"><strong>{letter}. MANAGEMENT DETAIL INFORMATION</strong></td></tr>
						<tr>
							<td width="3%" className="bf3"><strong>No.</strong></td>
							<td width="15%" className="bf3"><strong>{nameHeader}</strong></td>
							<td width="17%" className="bf3"><strong>ID Card</strong></td>
							<td width="35%" className="bf3"><strong>{addressHeader}</strong></td>
							<td width="30%" className="bf3"><strong>Detail</strong></td>
						</tr>
						{rows.map(r => (
							<tr key={r.no}>
								<td className="bf3 center">{r.no}</td>
								<td className="bf3">{r.name}</td>
								<td className="bf3">{r.id_card}</td>
								<td className="bf3">{r.address}</td>
								<td className="bf3">&nbsp;</td>
							</tr>
						))}
					</tbody>
				</table>
			</td>
		</tr>
	);
}

interface InternalDisbursementRow { no: number; contract_no: string; amount: number; purpose: string; }
interface ExternalDisbursementRow {
	no: number;
	name: string;
	address: string;
	bank_branch: string;
	account_no: string;
	account_name: string;
	amount: number;
}

interface ReportCamData {
	header: {
		cam_no: string; appl_no: string; cont_type: string; contsts: string;
		contract_no: string; cross_disbursement_no: string;
		bis_type: string; purpose_finc: string; fin_type: string; branch_name: string;
		create_date: string; print_date: string; cmo_name: string;
		corporate_finance: boolean; cross_contract_numbers: string[];
	};
	customer: {
		name_in_label: string; name_in_id: string;
		customer_name_label: string; customer_name: string;
		address: string; phone1: string; phone2: string; phone3: string;
		mail_address: string; npwp: string; guarantor: string; industry: string;
	};
	finance: {
		asset_value: number; dp_label: string; dp_percent: number; security: number;
		insurance_loan: number; bbn_loan: number; provision_loan: number; others_loan: number;
		net_finance: number; loan_to_value: number; type_of_finance: string; payment_method: string;
		tenor: number; adv_arr_label: string; irr: number | null;
		selling_rate_flat: string; decl_rate: string; survey_fee_gross: number;
		notary_fee_gross: number; provision_fee: number; business_trip_fee: number;
		installment: number; installment_steps: InstallmentStep[];
		is_step_1000: boolean; customer_flat_rate: string; customer_tenor: number | string;
		grace_period_month: number | string; grace_int_rate: string; grace_int_amount: number;
		show_restructuring: boolean; restructuring_change: string;
	};
	insurance: { name: string; type: string; gross_premium: number; net_premium: number; };
	notary: { vendor: string; fiducia_deed: number; fiducia_cert: number; };
	agency: { bbn_via: string; paid_by: string; agency_name: string; agency_fee_gross: number; bbn_fee: number; nett_agency_fee: number; };
	asset: { condition_label: string; condition_model_year: string; brand_name: string; name_in_bpkb: string; purpose_of_finance: string; bpkb_address: string; };
	dealer: { name: string; type: string; address: string; disb_accounts: string[]; status: string; };
	disbursement: {
		paid_to_company: Record<string, number>;
		to_dealer: Record<string, number>;
		advance_grace_month: number | string;
		show_commission_to_dealer: boolean;
		apm_label: string;
		apm_amount: number;
		commission_sales: CommissionSale[];
		total_gross_commission: number;
		credit_protection: number;
		guaranteed_acceptance: string;
		signoff_roles?: SignoffRole[];
		related_survey_cam?: string;
	};
	outstanding: { process_date: string; rows: OutstandingRow[]; total_unit: number; total_amount: number; };
	equipment_detail: EquipmentDetail | null;
	org_structure: OrgStructure | null;
	lessee_name: string;
	internal_disbursement: { rows: InternalDisbursementRow[]; total: number; };
	external_disbursement: { rows: ExternalDisbursementRow[]; total: number; };
	bank_accounts: BankAccount[];
	approval_history: ApprovalRow[];
	references: ReferenceRow[];
	cam_notes: string;
	notes: string;
	revised_note?: string;
	pending_notes?: string;
	beneficial_owner_availability?: string;
	omitted_sections: string[];
	credit_scoring: { items: CreditScoringItem[]; total_score: number | string | null; recommendation?: string } | null;
	guarantor?: GuarantorDetail | null;
	beneficial_owner?: BeneficialOwnerDetail | null;
	customer_survey?: CustomerSurveyDetail | null;
	financial_review?: FinancialReview | null;
	apu_ppt?: ApuPptData | null;
}

const fmt = (n: number | null | undefined) => (n ? Math.round(n).toLocaleString('id-ID') : '0');
const paren = (n: number | null | undefined) => `(${fmt(Math.abs(n ?? 0))})`;

const REPORT_CSS = `
.cam-report table { border-collapse: collapse; width: 100%; }
.cam-report td, .cam-report th { background-color: #FFFFFF; font-size: 11px; padding: 2px; vertical-align: top; font-family: Arial, sans-serif; }
.cam-report em { font-family: Meiryo, sans-serif; font-style: oblique; font-size: 13px; }
.cam-report .bf { border-bottom: 1px solid #000; border-right: 1px solid #000; }
.cam-report .bf1 { border-bottom: 1px solid #000; border-right: 1px solid #000; border-left: 1px solid #000; }
.cam-report .bf2 { border-bottom: 1px solid #000; }
.cam-report .bf3 { border: 1px solid #000; }
.cam-report .bf4 { border-left: 1px solid #000; border-bottom: 1px solid #000; }
.cam-report .head { background-color: #CCCCCC; }
.cam-report .top { border-top: 1px solid #000; }
.cam-report .thin-top { border-top: 1px solid #000; }
.cam-report .right { text-align: right; }
.cam-report .center { text-align: center; }
.cam-report .bold { font-weight: bold; }
.cam-report .italic { font-style: italic; color: #94a3b8; }
.cam-report .pb-avoid { page-break-inside: avoid; }
`;

const PRINT_WINDOW_CSS = `
body { background-color: #FFFFFF; margin: 0; padding: 8px; }
${REPORT_CSS}
.cam-report .pb { page-break-before: always; }
.cam-report .print-only { display: block; }
.noPrint { display: none; }
`;

function LegacyStyle() {
	return (
		<style>{`
${REPORT_CSS}
.cam-report .print-only { display: none; }
@media print {
    .cam-report .pb { page-break-before: always; }
    .cam-report .print-only { display: block; }
    .noPrint { display: none; }
}
        `}</style>
	);
}

function SectionHead({ title, colSpan = 2 }: { title: string; colSpan?: number }) {
	return (
		<tr>
			<td colSpan={colSpan} className="bf1 head top"><strong>{title}</strong></td>
		</tr>
	);
}

function SubHead({ title, colSpan = 2, pageBreak }: { title: string; colSpan?: number; pageBreak?: boolean }) {
	return (
		<tr className={pageBreak ? 'head pb' : 'head'}>
			<td colSpan={colSpan} className="thin-top"><strong>{title}</strong></td>
		</tr>
	);
}

function LabelRow({ label, value, align, bold, widthLabel }: { label: React.ReactNode; value: React.ReactNode; align?: 'right' | 'left'; bold?: boolean; widthLabel?: string }) {
	return (
		<tr>
			<td className={`bf1 ${bold ? 'bold' : ''}`} width={widthLabel ?? '35%'}>{label}</td>
			<td className={`bf ${align === 'right' ? 'right' : ''} ${bold ? 'bold' : ''}`}>{value}</td>
		</tr>
	);
}

function OptionalLabelRow({ label, value, align, widthLabel }: { label: React.ReactNode; value?: React.ReactNode; align?: 'right' | 'left'; widthLabel?: string }) {
	if (value === undefined || value === null || value === '') return null;
	return <LabelRow label={label} value={value} align={align} widthLabel={widthLabel} />;
}

function DisbRow({ label, company, dealer }: { label: React.ReactNode; company: React.ReactNode; dealer: React.ReactNode }) {
	return (
		<tr>
			<td className="bf1" width="41%">{label}</td>
			<td className="bf right" width="29%">{company}</td>
			<td className="bf right" width="30%">{dealer}</td>
		</tr>
	);
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<tr>
			<td width="30%" style={{ borderLeft: '1px solid #000' }}>{label}</td>
			<td width="70%" style={{ borderRight: '1px solid #000' }}>: {value}</td>
		</tr>
	);
}

export default function ReportCamView({ ctx }: { ctx: CamCtx }) {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-report-cam', ctx.applno, ctx.apless],
		queryFn: async () => {
			const res = await api.get<ReportCamData>('/CAM/View/report-cam', {
				params: { applno: ctx.applno, apless: ctx.apless },
			});
			return res.data;
		},
	});

	if (isLoading) return <div className="p-8 text-center text-sm text-[var(--app-muted)]">Loading report…</div>;
	if (isError || !data) return <div className="p-8 text-center text-sm text-red-500">Failed to load Report CAM data.</div>;

	const { header, customer, finance, insurance, notary, agency, asset, dealer,
		disbursement, outstanding, equipment_detail, internal_disbursement, external_disbursement,
		bank_accounts, approval_history, references, cam_notes, notes, credit_scoring,
		org_structure, lessee_name,
		guarantor, beneficial_owner, customer_survey, financial_review, revised_note,
		pending_notes, beneficial_owner_availability, apu_ppt } = data;

	const paidCompany = disbursement.paid_to_company;
	const toDealer = disbursement.to_dealer;
	const approvalColSpan = Math.max(approval_history.length, 1);

	const ApprovalBlock = () => (
		<table cellPadding={2} cellSpacing={0} style={{ marginTop: 10 }}>
			<tbody>
				{approval_history.length > 0 && (
					<tr>
						<td colSpan={approvalColSpan} className="bf1 head top center">
							<strong>CREDIT COMMITTEE APPROVAL</strong>
						</td>
					</tr>
				)}
				<tr className="center">
					{approval_history.length === 0 ? (
						<td className="bf italic">&nbsp;</td>
					) : approval_history.map((a, i) => (
						<td key={i} className={i === 0 ? 'bf1' : 'bf'} style={{ height: 50 }}>
							<span style={{ color: 'red', fontFamily: 'tahoma', fontSize: 14 }}>
								<strong>{a.sent_to_admin ? <em><u>APPROVED</u></em> : 'APPROVED'}</strong>
							</span>
							<br />{a.full_name}
						</td>
					))}
				</tr>
				{approval_history.length > 0 && (
					<tr className="center">
						{approval_history.map((a, i) => (
							<td key={i} className={i === 0 ? 'bf1' : 'bf'}>{a.date}</td>
						))}
					</tr>
				)}
			</tbody>
		</table>
	);

	const printReport = () => {
		const node = document.getElementById('cam-report');
		if (!node) return;
		const win = window.open('', '_blank', 'width=1024,height=768');
		if (!win) return;
		win.document.open();
		win.document.write(
			'<!DOCTYPE html><html><head><meta charset="utf-8" />'
			+ '<title>Credit Approval Memorandum</title>'
			+ '<style>' + PRINT_WINDOW_CSS + '</style></head>'
			+ '<body onload="window.print(); window.close();">'
			+ '<div class="cam-report">' + node.innerHTML + '</div>'
			+ '</body></html>'
		);
		win.document.close();
		win.focus();
	};

	const PageFooter = () => (
		<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, paddingTop: 4 }}>
			<div>No. CAM : {header.appl_no}</div>
			<div>{header.print_date}</div>
		</div>
	);

	const PageEnd = () => (
		<div className="print-only">
			<ApprovalBlock />
			<PageFooter />
		</div>
	);

	return (
		<div>
			<div className="mb-3 flex items-center justify-between rounded-xl bg-[var(--app-card)] px-4 py-2 shadow print:hidden">
				<span className="text-sm font-semibold text-[var(--app-text)]">Report CAM — {header.appl_no}</span>
				<button
					onClick={printReport}
					className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
				>
					Print
				</button>
			</div>

			<LegacyStyle />

			<div id="cam-report" className="cam-report bg-[var(--app-card)] p-4 shadow print:shadow-none">
				<table cellPadding={2} cellSpacing={0} style={{ backgroundColor: '#FFFFFF' }}>
					<tbody>
						<tr>
							<td width="93%" className="center" style={{ paddingLeft: 90, fontFamily: 'sans-serif', fontSize: 12 }}>
								<strong><u>CREDIT APPROVAL MEMORANDUM (CAM)</u></strong>
							</td>
							<td width="7%" className="right" style={{ fontFamily: 'sans-serif', fontSize: 12 }}>
								<i>{header.cmo_name}</i>
							</td>
						</tr>
						<tr>
							<td className="center" style={{ paddingLeft: 90, fontFamily: 'sans-serif', fontSize: 12 }}>
								<strong>{header.bis_type}/&nbsp;{header.purpose_finc}/&nbsp;{header.fin_type} - {header.branch_name}</strong>
							</td>
							<td className="right" style={{ fontFamily: 'sans-serif', fontSize: 12, whiteSpace: 'nowrap' }}>
								<i>{header.create_date}</i>
							</td>
						</tr>
						{header.corporate_finance && (
							<>
								<tr>
									<td style={{ fontFamily: 'sans-serif', fontSize: 12 }}>
										<strong style={{ color: 'red', fontStyle: 'italic' }}>This customer has Contract in Corporate Finance.</strong>
									</td>
									<td style={{ fontFamily: 'sans-serif', fontSize: 12 }}><i>&nbsp;</i></td>
								</tr>
								<tr>
									<td style={{ fontFamily: 'sans-serif', fontSize: 12 }}>
										<strong style={{ color: 'red', fontStyle: 'italic' }}>Please make sure that the Branch has coordinated with Corporate Finance for this Financing Application.</strong>
									</td>
									<td style={{ fontFamily: 'sans-serif', fontSize: 12 }}><i>&nbsp;</i></td>
								</tr>
							</>
						)}
					</tbody>
				</table>

				<table cellPadding={2} cellSpacing={0}>
					<tbody>
						<tr>
							<td className="bf1 top" width="20%" style={{ whiteSpace: 'nowrap' }}>CAM No. {header.cam_no}</td>
							<td className="bf top" width="13%" style={{ whiteSpace: 'nowrap' }}>{header.cont_type}</td>
							<td className="bf top" width="4%">Status</td>
							<td className="bf top" width="12%">{header.contsts}</td>
							<td className="bf top" width="9%" style={{ whiteSpace: 'nowrap' }}>Contract No</td>
							<td className="bf top" width="15%" style={{ whiteSpace: 'nowrap' }}>{header.contract_no}</td>
							<td className="bf top" width="13%" style={{ whiteSpace: 'nowrap' }}>Cross Disbursement No</td>
							<td className="bf top" width="14%">&nbsp;{header.cross_disbursement_no}</td>
						</tr>
					</tbody>
				</table>

				<div style={{ height: 10 }} />

				<table cellPadding={0} cellSpacing={2}>
					<tbody>
						<tr style={{ verticalAlign: 'top' }}>
							<td width="50%" style={{ border: 0 }}>
								<table cellPadding={2} cellSpacing={0}>
									<tbody>
										<SectionHead title="CUSTOMER" />
										<LabelRow label={`Name in ${customer.name_in_label}`} value={customer.name_in_id} />
										<LabelRow label={customer.customer_name_label} value={customer.customer_name} />
										<LabelRow label="Address" value={<span dangerouslySetInnerHTML={{ __html: customer.address }} />} />
										<LabelRow label="Telephone" value={`(H) ${customer.phone2} (O) ${customer.phone1} (HP) ${customer.phone3}`} />
										<LabelRow label="Mail Address" value={customer.mail_address} />
										<LabelRow label="NPWP" value={customer.npwp} />
										<LabelRow label="Guarantor" value={customer.guarantor} />
										<LabelRow label="Industry" value={customer.industry} />
									</tbody>
								</table>

								<table cellPadding={2} cellSpacing={0}>
									<tbody>
										<SectionHead title="FINANCE INFORMATION" />
										<LabelRow label="Asset Value" value={fmt(finance.asset_value)} align="right" />
										<LabelRow
											label={<>{finance.dp_label}&nbsp;<span style={{ float: 'right' }}>{finance.dp_percent}%</span></>}
											value={fmt(finance.security)}
											align="right"
										/>
										<LabelRow label="Insurance Loan" value={fmt(finance.insurance_loan)} align="right" />
										<LabelRow label="BBN Loan" value={fmt(finance.bbn_loan)} align="right" />
										<LabelRow label="Provision Loan" value={fmt(finance.provision_loan)} align="right" />
										<LabelRow label="Others Loan" value={fmt(finance.others_loan)} align="right" />
										<LabelRow label="Total Net Finance" value={fmt(finance.net_finance)} align="right" />
										<LabelRow label="Loan to Value" value={`${finance.loan_to_value}%`} align="right" />
										<LabelRow label="Type of Finance" value={finance.type_of_finance} align="right" />
										<LabelRow label="Payment Method" value={finance.payment_method} align="right" />
										<LabelRow label={`Term ${finance.tenor} Months`} value={`(${finance.adv_arr_label}) 1 unit`} align="right" />
										<LabelRow label="IRR" value={`${finance.irr ?? 0}%`} align="right" />
										<LabelRow
											label={<>Selling Rate (Flat/ Yr) <span style={{ float: 'right' }}>{finance.selling_rate_flat}%</span></>}
											value={`${finance.decl_rate}%`}
											align="right"
										/>
										<LabelRow label="Survey Fee Gross" value={fmt(finance.survey_fee_gross)} align="right" />
										<LabelRow label="Notary Fee Gross" value={fmt(finance.notary_fee_gross)} align="right" />
										<LabelRow label="Provision Fee" value={fmt(finance.provision_fee)} align="right" />
										<LabelRow label="Business Trip Fee" value={fmt(finance.business_trip_fee)} align="right" />
										{finance.installment_steps.length > 0 ? (
											finance.installment_steps.map((s, i) => (
												<LabelRow
													key={i}
													label={i === 0 ? 'Installment' : ''}
													value={`${s.months}\u00A0X\u00A0${fmt(s.amount)}`}
													align="right"
												/>
											))
										) : (
											<LabelRow label="Installment" value={fmt(finance.installment)} align="right" />
										)}
										{finance.is_step_1000 && (
											<>
												<LabelRow label="Customer Flat Rate" value={`${finance.customer_flat_rate}%`} align="right" />
												<LabelRow label="Customer Tenor" value={`${finance.customer_tenor}\u00A0Month`} align="right" />
											</>
										)}
										<LabelRow
											label={
												<>
													Grace Period <label style={{ textAlign: 'left' }}>{finance.grace_period_month} Month(s)</label>
													<span style={{ float: 'right' }}>{finance.grace_int_rate}%</span>
												</>
											}
											value={fmt(finance.grace_int_amount)}
											align="right"
										/>
										{finance.show_restructuring && (
											<LabelRow label="Changes from Restructuring" value={finance.restructuring_change} align="right" />
										)}
									</tbody>
								</table>

								<table cellPadding={2} cellSpacing={0}>
									<tbody>
										<tr>
											<td colSpan={2} className="bf3 head"><strong>INSURANCE</strong></td>
										</tr>
										<LabelRow label="Insurance Name" value={insurance.name} />
										<LabelRow label="Type" value={insurance.type} />
										<LabelRow label="Gross Premium" value={fmt(insurance.gross_premium)} align="right" />
										<LabelRow label="Net Premium" value={fmt(insurance.net_premium)} align="right" />
										<tr>
											<td colSpan={2} className="bf1 head"><strong>NOTARY / LEGITIMATE</strong></td>
										</tr>
										<LabelRow label="Vendor Name" value={notary.vendor} />
										<LabelRow label="Fiducia/ Cessie/ Any Deed" value={fmt(notary.fiducia_deed)} align="right" />
										<LabelRow label="Fiducia/ Cessie/ Any Certificate" value={fmt(notary.fiducia_cert)} align="right" />
									</tbody>
								</table>

								<table cellPadding={2} cellSpacing={0}>
									<tbody>
										<SectionHead title="AGENCY" />
										<LabelRow label="BBN Via" value={agency.bbn_via} align="right" />
										<LabelRow label="Paid By" value={agency.paid_by} align="right" />
										<LabelRow label="Agency Name" value={agency.agency_name} align="right" />
										<LabelRow label="Agency Fee Gross" value={fmt(agency.agency_fee_gross)} align="right" />
										<LabelRow label="BBN Fee" value={fmt(agency.bbn_fee)} align="right" />
										<LabelRow label="Nett Agency Fee" value={fmt(agency.nett_agency_fee)} align="right" />
									</tbody>
								</table>
							</td>

							<td width="50%" style={{ border: 0 }}>
								<table cellPadding={2} cellSpacing={0}>
									<tbody>
										<SectionHead title="ASSET INFORMATION" />
										<LabelRow label={asset.condition_label} value={asset.condition_model_year} widthLabel="41%" />
										<LabelRow label="Brand Name" value={asset.brand_name} widthLabel="41%" />
										<LabelRow label="Name in BPKB" value={asset.name_in_bpkb} widthLabel="41%" />
										<LabelRow label="Purpose of Finance" value={asset.purpose_of_finance} widthLabel="41%" />
										<LabelRow label="Address" value={asset.bpkb_address} widthLabel="41%" />
										<tr>
											<td colSpan={2} className="bf1 head"><strong>DEALER INFORMATION</strong></td>
										</tr>
										<LabelRow label="Name" value={dealer.name} widthLabel="41%" />
										<LabelRow label="Dealer Type" value={dealer.type} widthLabel="41%" />
										<LabelRow label="Address" value={dealer.address} widthLabel="41%" />
										{dealer.disb_accounts.map((acc, i) => (
											<LabelRow key={i} label={i === 0 ? 'Disb. Account No' : '\u00A0'} value={acc} widthLabel="41%" />
										))}
										<LabelRow label="Dealer Status" value={dealer.status} widthLabel="41%" />
									</tbody>
								</table>

								<table cellPadding={2} cellSpacing={0}>
									<tbody>
										<tr>
											<td className="bf3 head"><strong>DISBURSEMENT</strong></td>
											<td className="bf3 head center"><strong>PAID TO COMPANY</strong></td>
											<td className="bf3 head">&nbsp;</td>
										</tr>
										<DisbRow label="Asset Value" company={<>&nbsp;</>} dealer={fmt(toDealer.asset_value)} />
										<DisbRow label={finance.dp_label} company={paren(paidCompany.dp)} dealer={paren(toDealer.dp)} />
										<DisbRow label="Survey Fee Gross" company={paren(paidCompany.survey_fee_gross)} dealer={paren(toDealer.survey_fee_gross)} />
										<DisbRow label="Notary Fee Gross" company={paren(paidCompany.notary_fee_gross)} dealer={paren(toDealer.notary_fee_gross)} />
										<DisbRow label="Provision Fee" company={paren(paidCompany.provision_fee)} dealer={paren(toDealer.provision_fee)} />
										<DisbRow label="Business Trip Fee" company={paren(paidCompany.business_trip_fee)} dealer={paren(toDealer.business_trip_fee)} />
										<DisbRow label="Insurance" company={paren(paidCompany.insurance)} dealer={paren(toDealer.insurance)} />
										<DisbRow label="First Installment" company={paren(paidCompany.first_installment)} dealer={paren(toDealer.first_installment)} />
										<DisbRow
											label={<>Advance Grace Period<span style={{ float: 'right' }}>{disbursement.advance_grace_month} Month(s)</span></>}
											company="(0)"
											dealer={paren(toDealer.advance_grace_period)}
										/>
										<DisbRow label="Agency Fee Gross" company={paren(paidCompany.agency_fee_gross)} dealer={paren(toDealer.agency_fee_gross)} />
										<DisbRow label="BBN Fee" company={paren(paidCompany.bbn_fee)} dealer={paren(toDealer.bbn_fee)} />
										<DisbRow label="Subsidy From Dealer" company="(0)" dealer={paren(toDealer.subsidy_from_dealer)} />
										<DisbRow
											label="Refund To Dealer"
											company="0"
											dealer={toDealer.refund_to_dealer < 0 ? paren(toDealer.refund_to_dealer) : fmt(toDealer.refund_to_dealer)}
										/>
										<DisbRow label="Disbursement to Dealer" company="0" dealer={fmt(toDealer.disbursement_to_dealer)} />
										{disbursement.show_commission_to_dealer && (
											<DisbRow label="Commission to Dealer (Gross)" company="0" dealer={fmt(toDealer.commission_to_dealer_gross)} />
										)}
										<DisbRow label="Total Payment to Dealer" company="0" dealer={fmt(toDealer.total_payment_to_dealer)} />
										<DisbRow label={disbursement.apm_label} company="0" dealer={fmt(disbursement.apm_amount)} />
										<DisbRow label={<>&nbsp;</>} company={<>&nbsp;</>} dealer={<>&nbsp;</>} />
										<tr>
											<td colSpan={3} className="bf1 head top"><strong>COMMISSION TO SALESMAN &amp; BROKER</strong></td>
										</tr>
										{disbursement.commission_sales.map((s, i) => (
											<tr key={i}>
												<td className="bf1"><span dangerouslySetInnerHTML={{ __html: s.label }} /></td>
												<td className="bf right" colSpan={2}>{fmt(s.amount)}</td>
											</tr>
										))}
										<tr>
											<td className="bf1 bold" style={{ borderRight: 0 }}>Total Gross Commission</td>
											<td className="bf right bold" colSpan={2}>{fmt(disbursement.total_gross_commission)}</td>
										</tr>
										<tr>
											<td colSpan={3} className="bf1 head top"><strong>CREDIT PROTECTION</strong></td>
										</tr>
										<tr>
											<td className="bf1" width="43%">Credit Protection</td>
											<td className="bf right" colSpan={2}>{fmt(disbursement.credit_protection)}</td>
										</tr>
										<tr>
											<td className="bf1">Guaranteed Acceptance</td>
											<td className="bf right" colSpan={2}>{disbursement.guaranteed_acceptance}</td>
										</tr>
									</tbody>
								</table>
							</td>
						</tr>
					</tbody>
				</table>

				<div style={{ display: 'block', clear: 'both', paddingTop: 10 }}>
					<ApprovalBlock />

					<table cellPadding={2} cellSpacing={0}>
						<tbody>
							<tr>
								<td colSpan={4} className="bf1 head top center"><strong>DISBURSEMENT</strong></td>
								<td colSpan={2} className="bf head top"><strong>CAM NOTES / COMMENTS</strong></td>
							</tr>
							<tr>
								<td width="17%" height="50" className="bf1">&nbsp;</td>
								<td width="17%" className="bf">&nbsp;</td>
								<td width="16%" className="bf">&nbsp;</td>
								<td width="15%" className="bf">&nbsp;</td>
								<td width="35%" className="bf" style={{ verticalAlign: 'top' }}>
									<div dangerouslySetInnerHTML={{ __html: cam_notes }} />
									{revised_note && (
										<div><i><strong>Revised Note</strong></i> : {revised_note}</div>
									)}
								</td>
							</tr>
							<tr className="center">
								{(disbursement.signoff_roles ?? []).map((role, i) => (
									<td key={role.code} className={i === 0 ? 'bf1' : 'bf'} height="15">{role.label}</td>
								))}
								<td className="bf" style={{ textAlign: 'left' }}><strong>Related Survey CAM</strong></td>
							</tr>
							<tr>
								{(disbursement.signoff_roles ?? []).map((role, i) => (
									<td key={role.code} className={i === 0 ? 'bf1' : 'bf'} height="15">DATE :</td>
								))}
								<td className="bf">{disbursement.related_survey_cam}</td>
							</tr>
						</tbody>
					</table>
				</div>

				<br />

				<table className="pb" cellPadding={2} cellSpacing={0}>
					<tbody>
						<tr>
							<td colSpan={3} className="bf1 head top center"><strong>OUTSTANDING</strong></td>
						</tr>
						<tr>
							<td className="bf4 top" width="30%"><strong>OUTSTANDING</strong></td>
							<td colSpan={2} className="bf3">
								<strong><i>Process Date: {outstanding.process_date}</i></strong>
							</td>
						</tr>
						<tr className="center">
							<td rowSpan={2} className="bf4">&nbsp;</td>
							<td colSpan={2} className="bf1">OUTSTANDING EXPOSURE</td>
						</tr>
						<tr className="center">
							<td className="bf1" width="15%">Unit</td>
							<td className="bf" width="20%">Amount</td>
						</tr>
						{outstanding.rows.map(r => (
							<tr key={r.label}>
								<td className="bf4">{r.label}</td>
								<td className="bf1 right">{fmt(r.unit)}</td>
								<td className="bf right">{fmt(r.amount)}</td>
							</tr>
						))}
						<tr>
							<td className="bf4">Total</td>
							<td className="bf1 right">{fmt(outstanding.total_unit)}</td>
							<td className="bf right">{fmt(outstanding.total_amount)}</td>
						</tr>
					</tbody>
				</table>

				<br />

				{equipment_detail && (
					<div style={{ marginBottom: 10 }}>
						<table cellPadding={2} cellSpacing={0}>
							<tbody>
								<tr>
									<td colSpan={2} className="bf3 head center">EQUIPMENT DETAIL REVIEW</td>
								</tr>
								<DetailRow label="User Usage" value={equipment_detail.user_usage} />
								<DetailRow label="Vehicle Purpose" value={equipment_detail.vehicle_purpose} />
								{equipment_detail.show_financing_purpose && (
									<>
										<DetailRow label="Financing Purpose" value={equipment_detail.financing_purpose} />
										<DetailRow label="Description for Customer Purpose" value={equipment_detail.customer_purpose} />
									</>
								)}
								<DetailRow label="Parking Address" value={equipment_detail.parking_address} />
								<DetailRow label="Zip Code" value={equipment_detail.zip_code} />
								<DetailRow label="Insurance Area" value={equipment_detail.insurance_area} />
								<DetailRow label="Additional Collateral" value={equipment_detail.additional_collateral} />
								<DetailRow label="OJK Financing Goods" value={equipment_detail.ojk_financing_goods} />
								<DetailRow label="OJK Collateral Goods" value={equipment_detail.ojk_collateral_goods} />
								{equipment_detail.karoseri_name != null && (
									<>
										<DetailRow label="Karoseri Name" value={equipment_detail.karoseri_name} />
										<DetailRow label="Karoseri Address" value={equipment_detail.karoseri_address} />
									</>
								)}
								{equipment_detail.accessories_name != null && (
									<>
										<DetailRow label="Accessories Name" value={equipment_detail.accessories_name} />
										<DetailRow label="Accessories Address" value={equipment_detail.accessories_address} />
									</>
								)}
								{equipment_detail.other_name != null && (
									<>
										<DetailRow label="Others Name" value={equipment_detail.other_name} />
										<DetailRow label="Others Address" value={equipment_detail.other_address} />
									</>
								)}
							</tbody>
						</table>
					</div>
				)}

				{internal_disbursement.rows.length > 0 && (
					<div style={{ display: 'block', clear: 'both', paddingTop: 10 }}>
						<table cellPadding={2} cellSpacing={0} style={{ marginTop: 10 }}>
							<tbody>
								<tr>
									<td colSpan={4} className="bf3 head center">INTERNAL DISBURSEMENT</td>
								</tr>
								<tr className="center">
									<td width="2%" className="bf4 top"><strong>No</strong></td>
									<td width="20%" className="bf3"><strong>Contract Number</strong></td>
									<td width="20%" className="bf4 top" style={{ borderRight: '1px solid #000' }}><strong>Amount</strong></td>
									<td width="58%" className="bf4 top" style={{ borderRight: '1px solid #000' }}><strong>Purpose</strong></td>
								</tr>
								{internal_disbursement.rows.map(r => (
									<tr key={r.no} className="center">
										<td className="bf1">{r.no}</td>
										<td className="bf1">{r.contract_no}</td>
										<td className="bf1">{fmt(r.amount)}</td>
										<td className="bf1">{r.purpose}</td>
									</tr>
								))}
								<tr className="center">
									<td className="bf1">&nbsp;</td>
									<td className="bf1"><strong>Total</strong></td>
									<td className="bf1">{fmt(internal_disbursement.total)}</td>
									<td className="bf1">&nbsp;</td>
								</tr>
							</tbody>
						</table>
					</div>
				)}

				{external_disbursement.rows.length > 0 && (
					<div className="pb-avoid" style={{ display: 'block', clear: 'both', paddingTop: 10 }}>
						<table cellPadding={2} cellSpacing={0} style={{ marginTop: 10 }}>
							<tbody>
								<tr>
									<td colSpan={7} className="bf3 head center"><strong>EXTERNAL DISBURSEMENT</strong></td>
								</tr>
								<tr className="center">
									<td width="2%" className="bf1"><strong>No</strong></td>
									<td width="15%" className="bf1"><strong>Name</strong></td>
									<td width="16%" className="bf1"><strong>Address</strong></td>
									<td width="20%" className="bf1"><strong>Bank - Branch</strong></td>
									<td width="12%" className="bf1"><strong>Account Number</strong></td>
									<td width="20%" className="bf1"><strong>Beneficiary Name</strong></td>
									<td width="15%" className="bf1"><strong>Amount</strong></td>
								</tr>
								{external_disbursement.rows.map(r => (
									<tr key={r.no}>
										<td className="bf1 center">{r.no}</td>
										<td className="bf1">{r.name}</td>
										<td className="bf1">{r.address}</td>
										<td className="bf1">{r.bank_branch}</td>
										<td className="bf1">{r.account_no}</td>
										<td className="bf1">{r.account_name}</td>
										<td className="bf1 right">{fmt(r.amount)}</td>
									</tr>
								))}
								<tr>
									<td className="bf1">&nbsp;</td>
									<td className="bf1">&nbsp;</td>
									<td className="bf1">&nbsp;</td>
									<td className="bf1">&nbsp;</td>
									<td className="bf1">&nbsp;</td>
									<td className="bf1 right"><strong>Total</strong></td>
									<td className="bf1 right">{fmt(external_disbursement.total)}</td>
								</tr>
							</tbody>
						</table>
					</div>
				)}

				{pending_notes && (
					<div style={{ display: 'block', clear: 'both', paddingTop: 10 }}>
						<table cellPadding={2} cellSpacing={0}>
							<tbody>
								<tr>
									<td className="bf3 head center">PENDING DOCUMENT NOTES</td>
								</tr>
								<tr>
									<td className="bf1" height="50">
										<div dangerouslySetInnerHTML={{ __html: pending_notes }} />
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				)}

				{beneficial_owner_availability && (
					<div style={{ clear: 'both', paddingTop: 10 }}>
						<table cellPadding={2} cellSpacing={0}>
							<tbody>
								<tr>
									<td style={{ fontSize: 12, textAlign: 'left' }}>Beneficial Owner : {beneficial_owner_availability}</td>
								</tr>
							</tbody>
						</table>
					</div>
				)}

				{header.cross_contract_numbers.length > 1 && (
					<table cellPadding={2} cellSpacing={1} style={{ marginTop: 10, border: 'thin solid #000' }}>
						<tbody>
							<tr>
								<td className="bf3 head center">CROSS CONTRACT</td>
							</tr>
							<tr>
								<td>&nbsp;{header.cross_contract_numbers.join(' / ')}</td>
							</tr>
						</tbody>
					</table>
				)}

				{bank_accounts.length > 0 && (
					<div style={{ display: 'block', clear: 'both', paddingTop: 10 }}>
						<table cellPadding={2} cellSpacing={0} style={{ marginTop: 10 }}>
							<tbody>
								<tr>
									<td colSpan={4} className="bf3 head center"><strong>Bank Account For DISBURSEMENT</strong></td>
								</tr>
								<tr className="center">
									<td className="bf1" width="34%"><strong>Bank - Branch</strong></td>
									<td className="bf1" width="29%"><strong>Account No.</strong></td>
									<td className="bf1" width="16%"><strong>Name</strong></td>
									<td className="bf1" width="21%"><strong>Amount</strong></td>
								</tr>
								{bank_accounts.map((b, i) => (
									<tr key={i}>
										<td className="bf1">{b.bank_branch}</td>
										<td className="bf1">{b.account_no}</td>
										<td className="bf1">{b.account_name}</td>
										<td className="bf1 right">{fmt(b.amount)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				<ApprovalBlock />
				<PageFooter />

				<PageEnd />

				{customer_survey && (
					<table className={customer_survey.is_corporate ? 'pb' : ''} cellPadding={2} cellSpacing={1} style={{ marginTop: 10 }}>
						<tbody>
							<tr>
								<td colSpan={2} className="bf3 head center"><strong>{customer_survey.is_corporate ? "COMPANY SURVEY REPORT" : "CUSTOMER SURVEY REPORT"}</strong></td>
							</tr>
							<tr className="pb">
								<td colSpan={2} className="bf2"><strong>CUSTOMER SURVEY DETAIL</strong></td>
							</tr>

							<SubHead title="Character" />
							<OptionalLabelRow label="Credit History" value={customer_survey.credit_history} />
							<OptionalLabelRow label="Reference" value={customer_survey.reference} />
							<OptionalLabelRow label="Working/ Business Experience" value={customer_survey.work_experience} />
							<OptionalLabelRow label="Business Size" value={customer_survey.business_size} />
							<OptionalLabelRow label="Company Status" value={customer_survey.company_status} />
							<OptionalLabelRow label="Scale of Business" value={customer_survey.scale_of_business} />

							<SubHead title="Capital" />
							<OptionalLabelRow label="Living" value={customer_survey.living} />
							<OptionalLabelRow label={`${customer_survey.living ?? 'Living'} Status`} value={customer_survey.living_status} />
							<OptionalLabelRow label="Car Ownership" value={customer_survey.car_ownership} />
							<OptionalLabelRow label="Business Location" value={customer_survey.business_location} />
							<OptionalLabelRow label="Total Unit Owned (Vehicle)" value={customer_survey.total_unit_owned} />
							<OptionalLabelRow label="Unit Free from Finance" value={customer_survey.unit_free_from_finance} />
							<OptionalLabelRow label="Estimated Total Assets" value={customer_survey.estimated_total_assets_as_of} />

							<SubHead title="Capacity" />
							<OptionalLabelRow label="Job/ Occupation" value={customer_survey.job_customer} />
							<OptionalLabelRow
								label="Fixed Monthly Income (Rp.)"
								value={customer_survey.fixed_monthly_income != null
									? `${fmt(customer_survey.fixed_monthly_income)}${customer_survey.income_source_note ? ' / ' + customer_survey.income_source_note : ''}`
									: undefined}
							/>
							<OptionalLabelRow label="Spouse Income (Rp.)" value={customer_survey.spouse_income != null ? fmt(customer_survey.spouse_income) : undefined} />
							<OptionalLabelRow
								label="Total Other Income per Month (Rp.)"
								value={customer_survey.other_income != null
									? `${fmt(customer_survey.other_income)} ${customer_survey.other_income_note ?? ''}`
									: undefined}
							/>
							<OptionalLabelRow
								label="Total Income per Month (Rp.)"
								value={customer_survey.total_income != null
									? `${fmt(customer_survey.total_income)} ${customer_survey.total_income_note ?? ''}`
									: undefined}
							/>
							<OptionalLabelRow label="Average Income per Year (Rp.)" value={customer_survey.average_income_per_year != null ? fmt(customer_survey.average_income_per_year) : undefined} />
							<OptionalLabelRow
								label="Monthly Profit (Rp.)"
								value={customer_survey.monthly_profit != null
									? `${fmt(customer_survey.monthly_profit)} ${customer_survey.monthly_profit_note ?? ''}`
									: undefined}
							/>
							<OptionalLabelRow label="Sales/ Month (Rp.)" value={customer_survey.sales_per_month != null ? fmt(customer_survey.sales_per_month) : undefined} />
							<OptionalLabelRow label="Net Profit : Sales" value={customer_survey.net_profit_ratio} />

							<SubHead title="Collateral" />
							<OptionalLabelRow label="Unit Type" value={customer_survey.unit_type} />
							<OptionalLabelRow label="Loan to Value" value={customer_survey.loan_to_value != null ? `${customer_survey.loan_to_value}%` : undefined} />
							<OptionalLabelRow label="Insurance" value={customer_survey.insurance_payment} />
							<OptionalLabelRow label="Guarantor" value={customer_survey.guarantor_available} />
							<OptionalLabelRow label="Payment Method" value={customer_survey.payment_method} />

							<SubHead title="Condition" />
							<OptionalLabelRow label="Credit Period" value={customer_survey.credit_period} />
							<OptionalLabelRow label="Total Outstanding" value={customer_survey.total_outstanding_bucket} />
							<OptionalLabelRow label="Dealer Status" value={customer_survey.dealer_status} />
							<OptionalLabelRow label="Usage of Car" value={customer_survey.usage_of_car} />

							<tr className="pb">
								<td colSpan={2} className="bf2"><strong>CUSTOMER JOB HISTORY</strong></td>
							</tr>
							<tr>
								<td colSpan={2} style={{ padding: 0 }}>
									<table cellPadding={1} cellSpacing={0}>
										<tbody>
											<tr className="center">
												<td className="bf1 top" width="5%"><strong>No.</strong></td>
												<td className="bf top" width="8%"><strong>From</strong></td>
												<td className="bf top" width="8%"><strong>Until</strong></td>
												<td className="bf top" width="15%"><strong>Company Name</strong></td>
												<td className="bf top" width="20%"><strong>Company Address</strong></td>
												<td className="bf top" width="10%"><strong>District/ City</strong></td>
												<td className="bf top" width="10%"><strong>Province</strong></td>
												<td className="bf top" width="10%"><strong>Post Code</strong></td>
												<td className="bf top" width="15%"><strong>Position</strong></td>
												<td className="bf top" width="10%"><strong>Phone</strong></td>
											</tr>
											{customer_survey.job_history.length === 0 ? (
												<tr><td className="bf1 italic center" colSpan={10}>No job history</td></tr>
											) : customer_survey.job_history.map((j, i) => (
												<tr key={i}>
													<td className="bf1 center">{i + 1}</td>
													<td className="bf">{j.from}</td>
													<td className="bf">{j.until}</td>
													<td className="bf">{j.company}</td>
													<td className="bf">{j.address}</td>
													<td className="bf">{j.city}</td>
													<td className="bf">{j.province}</td>
													<td className="bf">{j.postal_code}</td>
													<td className="bf">{j.position}</td>
													<td className="bf">{j.phone}</td>
												</tr>
											))}
										</tbody>
									</table>
								</td>
							</tr>

							{customer_survey.sid_checking.length > 0 && (
								<>
									<SubHead title="File SID Checking" pageBreak />
									<tr>
										<td colSpan={2} className="bf2" style={{ padding: 0 }}>
											{customer_survey.sid_checking.map((s, i) => (
												<table key={i} cellPadding={2} cellSpacing={0} style={{ marginBottom: 8 }}>
													<tbody>
														<LabelRow label="Subject" value={s.subject} />
														<LabelRow label="Credit Bureau" value={s.credit_bureau} />
														<LabelRow label="Status" value={s.status} />
														<LabelRow label="Score" value={s.score} />
														<LabelRow label="Grade" value={s.grade} />
														{s.file_url && (
															<LabelRow
																label="File"
																value={
																	<a href={s.file_url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
																		{s.file_label ?? 'Download'}
																	</a>
																}
															/>
														)}
													</tbody>
												</table>
											))}
											{customer_survey.sid_checking_notes && (
												<table cellPadding={2} cellSpacing={0}>
													<tbody>
														<LabelRow label="Notes" value={customer_survey.sid_checking_notes} />
													</tbody>
												</table>
											)}
										</td>
									</tr>
								</>
							)}
						</tbody>
					</table>
				)}

				<PageEnd />

				{apu_ppt && (
					<table className="pb" cellPadding={2} cellSpacing={1} style={{ marginTop: 10 }}>
						<tbody>
							<tr>
								<td colSpan={2} className="bf3 head center"><strong>APU PPT</strong></td>
							</tr>
							<tr>
								<td colSpan={2} className="bf2"><strong>CUSTOMER'S DATA</strong></td>
							</tr>
							<LabelRow label="Customer Name" value={apu_ppt.customer.name} />
							<LabelRow label="Customer Type" value={apu_ppt.customer.type} />
							<LabelRow label="Occupation/ Business Type" value={apu_ppt.customer.occupation_business_type} />
							<LabelRow label="APU PPT Status" value={apu_ppt.customer.apu_ppt_status} />
							<LabelRow label="Identification and Verification Process" value={apu_ppt.customer.identification_verification} />

							{apu_ppt.show_edd_customer && (
								<>
									<tr><td colSpan={2}><strong>Enhanced Due Diligence (EDD) Customer Questionnaire</strong></td></tr>
									{apu_ppt.edd_customer_questions.map(q => (
										<tr key={q.no}>
											<td className="bf1">{q.no}. {q.question}</td>
											<td className="bf right bold">{q.answer}</td>
										</tr>
									))}
								</>
							)}

							{apu_ppt.show_beneficial_owner && (
								<>
									<tr>
										<td colSpan={2} className="bf2"><strong>BENEFICIAL OWNER&apos;S DATA</strong></td>
									</tr>
									<LabelRow label="Beneficial Owner Name" value={apu_ppt.beneficial_owner.name} />
									<LabelRow label="Beneficial Owner Type" value={apu_ppt.beneficial_owner.type} />
									<LabelRow label="Occupation/ Business Type" value={apu_ppt.beneficial_owner.occupation_business_type} />
									<LabelRow label="APU PPT Status" value={apu_ppt.beneficial_owner.apu_ppt_status} />
									<LabelRow label="Identification and Verification Process" value={apu_ppt.beneficial_owner.identification_verification} />
								</>
							)}

							{apu_ppt.show_beneficial_owner && apu_ppt.show_edd_bo && (
								<>
									<tr><td colSpan={2}><strong>Enhanced Due Diligence (EDD) Beneficial Owner Questionnaire</strong></td></tr>
									{apu_ppt.edd_bo_questions.map(q => (
										<tr key={q.no}>
											<td className="bf1">{q.no}. {q.question}</td>
											<td className="bf right bold">{q.answer}</td>
										</tr>
									))}
								</>
							)}
						</tbody>
					</table>
				)}

				<PageEnd />

				{org_structure && (
					<table className="pb" cellPadding={2} cellSpacing={0} style={{ marginTop: 10, border: 'thin solid #000' }}>
						<tbody>
							<tr>
								<td colSpan={4} className="bf1 head center" style={{ borderLeft: 0, borderRight: 0 }}>
									ORGANIZATION STRUCTURE : {lessee_name}
								</td>
							</tr>
							{org_structure.entity_type === 'PT' && (
								<>
								<tr>
									<td colSpan={4} style={{ border: 0 }}>
										<table cellPadding={2} cellSpacing={0}>
											<tbody>
												<tr><td colSpan={4} style={{ border: 0 }}><strong>A. CAPITAL</strong></td></tr>
												<tr>
													<td width="10%" style={{ border: 0 }}>Authorized Capital</td>
													<td width="1%" style={{ border: 0 }}>:</td>
													<td width="10%" className="right" style={{ border: 0 }}>{fmt(org_structure.authorized_capital)}</td>
													<td width="79%" style={{ border: 0 }}></td>
												</tr>
												<tr>
													<td style={{ border: 0 }}>Paid-In Capital</td>
													<td style={{ border: 0 }}>:</td>
													<td className="right" style={{ border: 0 }}>{fmt(org_structure.paid_in_capital)}</td>
													<td style={{ border: 0 }}></td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
								<tr><td style={{ border: 0, height: 30 }} colSpan={4}></td></tr>
								<tr>
									<td colSpan={4} style={{ border: 0 }}>
										<table cellPadding={2} cellSpacing={0}>
											<tbody>
												<tr><td colSpan={5} className="bf2"><strong>B. SHAREHOLDER</strong></td></tr>
												<tr className="center">
													<td width="7%" className="bf1"><strong>No.</strong></td>
													<td width="35%" className="bf"><strong>Name in ID Card / Akta</strong></td>
													<td width="20%" className="bf"><strong>Status</strong></td>
													<td width="20%" className="bf"><strong>Total of Shares (Pieces)</strong></td>
													<td width="20%" className="bf"><strong>Nominal of Shares (Rp.)</strong></td>
												</tr>
												{(org_structure.shareholders || []).map(r => (
													<tr key={r.no}>
														<td className="bf3 center">{r.no}</td>
														<td className="bf3">{r.name}</td>
														<td className="bf3">{r.status}</td>
														<td className="bf3 right">{r.total_shares}</td>
														<td className="bf3 right">{fmt(r.nominal_shares)}</td>
													</tr>
												))}
											</tbody>
										</table>
									</td>
								</tr>
								<tr><td style={{ border: 0, height: 30 }} colSpan={4}></td></tr>
								<tr>
									<td colSpan={4} style={{ border: 0 }}>
										<table cellPadding={2} cellSpacing={0}>
											<tbody>
												<tr><td colSpan={4} className="bf2"><strong>C. COMPOSITION THE BOARD OF DIRECTORS (BOD) &amp; BOARD OF COMMISIONERS (BOC)</strong></td></tr>
												<tr className="center">
													<td width="7%" className="bf3"><strong>No.</strong></td>
													<td width="53%" className="bf3"><strong>Name in ID Card</strong></td>
													<td width="40%" className="bf3"><strong>BOD</strong></td>
													<td width="5%" className="bf3"><strong>Owner</strong></td>
												</tr>
												{(org_structure.bod || []).map(r => (
													<tr key={r.no}>
														<td className="bf3 center">{r.no}</td>
														<td className="bf3">{r.name}</td>
														<td className="bf3">{r.position}</td>
														<td className="bf3 center"><input type="checkbox" checked={r.owner} disabled readOnly /></td>
													</tr>
												))}
											</tbody>
										</table>
									</td>
								</tr>
								<tr><td style={{ border: 0, height: 30 }} colSpan={4}></td></tr>
								{(org_structure.boc || []).length > 0 && (
									<tr>
										<td colSpan={4} style={{ border: 0 }}>
											<table cellPadding={2} cellSpacing={0}>
												<tbody>
													<tr className="center">
														<td width="7%" className="bf3"><strong>No.</strong></td>
														<td width="53%" className="bf3"><strong>Name in ID Card</strong></td>
														<td width="40%" className="bf3"><strong>BOC</strong></td>
														<td width="5%" className="bf3"><strong>Owner</strong></td>
													</tr>
													{(org_structure.boc || []).map(r => (
														<tr key={r.no}>
															<td className="bf3 center">{r.no}</td>
															<td className="bf3">{r.name}</td>
															<td className="bf3">{r.position}</td>
															<td className="bf3 center"><input type="checkbox" checked={r.owner} disabled readOnly /></td>
														</tr>
													))}
												</tbody>
											</table>
										</td>
									</tr>
								)}
								<tr><td style={{ border: 0, height: 30 }} colSpan={4}></td></tr>
								<tr>
									<td colSpan={4} style={{ border: 0 }}>
										<table cellPadding={2} cellSpacing={0}>
											<tbody>
												<tr><td colSpan={6} className="bf2"><strong>D. DEED OF ESTABLISHMENT</strong></td></tr>
												<tr className="center">
													<td width="4%" className="bf1"><strong>No.</strong></td>
													<td width="16%" className="bf"><strong>State Gazette No.</strong></td>
													<td width="16%" className="bf"><strong>Deed No.</strong></td>
													<td width="14%" className="bf"><strong>Date of Deed/ State Gazette</strong></td>
													<td width="19%" className="bf"><strong>Notary Name</strong></td>
													<td width="31%" className="bf"><strong>Certificate of Ministry of Law &amp; Human Rights</strong></td>
												</tr>
												{(org_structure.deed as OrgDeed[]).map(r => (
													<tr key={r.no}>
														<td className="bf3 center">{r.no}</td>
														<td className="bf3 center">{r.state_gazette_no}</td>
														<td className="bf3 center">{r.deed_no}</td>
														<td className="bf3 center">{r.date_of_deed}</td>
														<td className="bf3">{r.notary_name}</td>
														<td className="bf3">{r.certificate}</td>
													</tr>
												))}
											</tbody>
										</table>
									</td>
								</tr>
								<tr><td style={{ border: 0, height: 30 }} colSpan={4}></td></tr>
								<tr>
									<td colSpan={4} style={{ border: 0 }}>
										<table cellPadding={2} cellSpacing={0}>
											<tbody>
												<tr>
													<td colSpan={2} style={{ border: 0 }}>
														<strong>E. CONTRACT SIGNER ACCORDING DEED OF ESTABLISHMENT THE ARTICLE: BOARD OF DIRECTOR&apos;S ROLES AND AUTHORITY</strong>
													</td>
												</tr>
												<tr><td colSpan={2} style={{ border: 0, paddingLeft: 50 }}>{org_structure.contract_signer}</td></tr>
												<tr><td colSpan={2} style={{ border: 0, height: 30 }}></td></tr>
												<tr><td colSpan={2} style={{ border: 0 }}><strong>F. PERSON IN CHARGE TO SIGN CONTRACT</strong></td></tr>
												<tr><td colSpan={2} style={{ border: 0, paddingLeft: 50 }}>{org_structure.pic}</td></tr>
												<tr><td colSpan={2} style={{ border: 0, height: 30 }}></td></tr>
												<tr><td colSpan={2} style={{ border: 0 }}>SIGNER :</td></tr>
												<tr>
													<td style={{ border: 0 }}><strong>Name</strong></td>
													<td style={{ border: 0 }}><strong>Position</strong></td>
												</tr>
												{org_structure.signers.map((r, i) => (
													<tr key={i}>
														<td style={{ border: 0 }}>{r.name}</td>
														<td style={{ border: 0 }}>{r.position}</td>
													</tr>
												))}
											</tbody>
										</table>
									</td>
								</tr>
								<tr><td style={{ border: 0, height: 30 }} colSpan={4}></td></tr>
								<tr>
									<td colSpan={4} style={{ border: 0 }}>
										<table cellPadding={2} cellSpacing={0}>
											<tbody>
												<tr><td colSpan={5} className="bf2"><strong>G. MANAGEMENT DETAIL INFORMATION</strong></td></tr>
												<tr>
													<td width="3%" className="bf3"><strong>No.</strong></td>
													<td width="15%" className="bf3"><strong>Name in ID Card / Akta</strong></td>
													<td width="17%" className="bf3"><strong>ID Card</strong></td>
													<td width="35%" className="bf3"><strong>Address in ID Card / SK. Domisili</strong></td>
													<td width="30%" className="bf3"><strong>Detail</strong></td>
												</tr>
												{org_structure.management.map(r => (
													<tr key={r.no}>
														<td className="bf3 center">{r.no}</td>
														<td className="bf3">{r.name}</td>
														<td className="bf3">{r.id_card}</td>
														<td className="bf3">{r.address}</td>
														<td className="bf3">&nbsp;</td>
													</tr>
												))}
											</tbody>
										</table>
									</td>
								</tr>
								</>
							)}

							{org_structure.entity_type === 'CO' && (
								<>
									<OrgCompositionSection letter="A" title="COMPOSITION OF BOARD OF MANAGEMENT" positionHeader="Position" rows={org_structure.board_of_management || []} />
									<OrgCompositionSection letter="B" title="COMPOSITION OF BOARD OF SUPERVISOR" positionHeader="Position" rows={org_structure.board_of_supervisor || []} />
									<OrgDeedSection letter="C" certificateLabel={org_structure.deed_certificate_label || ''} rows={org_structure.deed} />
									<OrgSignerSection
										signerLetter="D"
										signerTitle="CONTRACT SIGN FOLLOW THE ARTICLE: BOARD OF MANAGEMENT ROLES AND AUTHORITY"
										picLetter="E"
										contractSigner={org_structure.contract_signer}
										pic={org_structure.pic}
										signers={org_structure.signers}
									/>
									<OrgManagementSection letter="F" nameHeader="Name in ID Card" addressHeader="Address" rows={org_structure.management} />
								</>
							)}

							{org_structure.entity_type === 'CV' && (
								<>
									<OrgCompositionSection letter="A" title="COMPOSITION ACTIVE PARTNER &amp; LIMITED PARTNER" positionHeader="Active Partner" rows={org_structure.active_partner || []} />
									<OrgCompositionSection title="" positionHeader="Limited Partner" rows={org_structure.limited_partner || []} />
									<OrgDeedSection letter="B" certificateLabel={org_structure.deed_certificate_label || ''} rows={org_structure.deed} />
									<OrgSignerSection
										signerLetter="C"
										signerTitle="CONTRACT SIGNER ACCORDING DEED OF ESTABLISHMENT THE ARTICLE: BOARD OF DIRECTOR&apos;S ROLES AND AUTHORITY"
										picLetter="D"
										contractSigner={org_structure.contract_signer}
										pic={org_structure.pic}
										signers={org_structure.signers}
									/>
									<OrgManagementSection letter="E" nameHeader="Name in ID Card" addressHeader="Address" rows={org_structure.management} />
								</>
							)}

							{org_structure.entity_type === 'FD' && (
								<>
									<OrgCompositionSection letter="A" title="COMPOSITION OF FOSTERING FOUNDATION" positionHeader="Position" rows={org_structure.fostering_foundation || []} />
									<OrgCompositionSection letter="B" title="COMPOSITION OF BOARD OF MANAGEMENT" positionHeader="Position" rows={org_structure.board_of_management || []} />
									<OrgCompositionSection letter="C" title="COMPOSITION OF BOARD OF SUPERVISOR" positionHeader="Position" rows={org_structure.board_of_supervisor || []} />
									<OrgDeedSection letter="D" certificateLabel={org_structure.deed_certificate_label || ''} rows={org_structure.deed} />
									<OrgSignerSection
										signerLetter="E"
										signerTitle="CONTRACT SIGN FOLLOW THE ARTICLE: BOARD OF MANAGEMENT ROLES AND AUTHORITY"
										picLetter="F"
										contractSigner={org_structure.contract_signer}
										pic={org_structure.pic}
										signers={org_structure.signers}
									/>
									<OrgManagementSection letter="G" nameHeader="Name in ID Card" addressHeader="Address" rows={org_structure.management} />
								</>
							)}
						</tbody>
					</table>
				)}

				<PageEnd />

				{financial_review && (
					<table className="pb" cellPadding={2} cellSpacing={0} style={{ marginTop: 10 }}>
						<tbody>
							<tr>
								<td className="bf1 head top center"><strong>FINANCIAL INFORMATION REVIEW</strong></td>
							</tr>
							<tr>
								<td style={{ padding: 0 }}>
									{financial_review.period_label && (
										<div style={{ padding: 2 }}>{financial_review.period_label}</div>
									)}

									{financial_review.balance_sheet !== undefined && (
										<table cellPadding={2} cellSpacing={0} style={{ width: '70%', margin: '0 auto' }}>
											<tbody>
												<tr><td colSpan={3} className="bf1 top"><strong>Balance Sheet</strong></td></tr>
												{financial_review.balance_sheet.length === 0 ? (
													<tr><td colSpan={3} className="bf italic">No data</td></tr>
												) : financial_review.balance_sheet.map((r, i) => (
													<tr key={i}>
														<td className={`bf1 ${r.is_total ? 'bold' : ''}`} width="60%">{r.label}</td>
														<td className={`bf right ${r.is_total ? 'bold' : ''}`} width="20%">{fmt(r.period1)}</td>
														<td className={`bf right ${r.is_total ? 'bold' : ''}`} width="20%">{fmt(r.period2)}</td>
													</tr>
												))}
											</tbody>
										</table>
									)}

									{financial_review.profit_loss !== undefined && (
										<table cellPadding={2} cellSpacing={0} style={{ width: '70%', margin: '0 auto' }}>
											<tbody>
												<tr><td colSpan={2} className="bf1 top"><strong>Profit / Loss</strong></td></tr>
												{financial_review.profit_loss.length === 0 ? (
													<tr><td colSpan={2} className="bf italic">No data</td></tr>
												) : financial_review.profit_loss.map((r, i) => (
													<tr key={i}>
														<td className={`bf1 ${r.is_total ? 'bold' : ''}`} width="60%">{r.label}</td>
														<td className={`bf right ${r.is_total ? 'bold' : ''}`}>Rp. {fmt(r.period1)}</td>
													</tr>
												))}
											</tbody>
										</table>
									)}

									{financial_review.liabilities !== undefined && (
										<table cellPadding={2} cellSpacing={0} style={{ width: '70%', margin: '0 auto' }}>
											<tbody>
												<tr><td colSpan={3} className="bf1 top"><strong>Liabilities</strong></td></tr>
												{financial_review.liabilities.map((r, i) => (
													<tr key={i}>
														<td className="bf1" width="30%">{r.notes}</td>
														<td className="bf" width="45%">{r.description}</td>
														<td className="bf right" width="25%">{fmt(r.amount)}</td>
													</tr>
												))}
												<tr>
													<td colSpan={2} className="bf1 right bold">Total</td>
													<td className="bf right bold">{fmt(financial_review.total_liabilities)}</td>
												</tr>
											</tbody>
										</table>
									)}

									{financial_review.monthly_income !== undefined && (
										<table cellPadding={2} cellSpacing={0} style={{ width: '70%', margin: '0 auto' }}>
											<tbody>
												<tr><td colSpan={2} className="bf1 top"><strong>Estimated Monthly Income</strong></td></tr>
												{financial_review.monthly_income.map((r, i) => (
													<tr key={i}>
														<td className="bf1">{r.description}</td>
														<td className="bf right">{fmt(r.amount)}</td>
													</tr>
												))}
												<tr>
													<td className="bf1 right bold">Total Income</td>
													<td className="bf right bold">{fmt(financial_review.total_income)}</td>
												</tr>
												<tr>
													<td className="bf1">Liabilities</td>
													<td className="bf right">{fmt(financial_review.total_liabilities)}</td>
												</tr>
												<tr>
													<td className="bf1 right bold">Net saving</td>
													<td className="bf right bold">{fmt(financial_review.net_saving)}</td>
												</tr>
											</tbody>
										</table>
									)}

									{financial_review.dscr != null && (
										<table cellPadding={2} cellSpacing={0} style={{ width: '70%', margin: '0 auto' }}>
											<tbody>
												<tr>
													<td className="bf1 top">DSCR</td>
													<td className="bf right top">{financial_review.dscr}</td>
												</tr>
											</tbody>
										</table>
									)}

									{financial_review.assets !== undefined && (
										<table cellPadding={2} cellSpacing={0} style={{ width: '70%', margin: '0 auto' }}>
											<tbody>
												<tr><td colSpan={3} className="bf3"><strong>Customer Asset Ownership</strong></td></tr>
												<tr className="center">
													<td className="bf1" width="30%"><strong>Descriptions</strong></td>
													<td className="bf" width="25%"><strong>Amount Estimated</strong></td>
													<td className="bf" width="45%"><strong>Notes</strong></td>
												</tr>
												{financial_review.assets.map((r, i) => (
													<tr key={i}>
														<td className="bf1">{r.description}</td>
														<td className="bf right">{fmt(r.amount)}</td>
														<td className="bf">{r.notes}</td>
													</tr>
												))}
												<tr>
													<td className="bf1 right bold">Total Assets</td>
													<td className="bf right bold">{fmt(financial_review.total_assets)}</td>
													<td className="bf">&nbsp;</td>
												</tr>
											</tbody>
										</table>
									)}

									{financial_review.bank_statements.length > 0 && financial_review.bank_statements.map((acc, i) => (
										<table key={i} cellPadding={2} cellSpacing={0} style={{ width: '70%', margin: '10px auto' }}>
											<tbody>
												<LabelRow label="Bank" value={`${acc.bank_name}${acc.branch ? ' / ' + acc.branch : ''}`} />
												<LabelRow label="Account Number" value={acc.account_no} />
												<LabelRow label="Account name" value={acc.account_name} />
												<LabelRow label="Currency" value={acc.currency} />
												{acc.notes && <LabelRow label="Notes" value={acc.notes} />}
												<tr><td colSpan={6} className="bf3 head center"><strong>BANK SUMMARY</strong></td></tr>
												<tr className="center">
													<td className="bf1" width="11%"><strong>Month - Year</strong></td>
													<td className="bf" width="13%"><strong>Beginning Balance</strong></td>
													<td className="bf" width="11%"><strong>Debet</strong></td>
													<td className="bf" width="11%"><strong>Credit</strong></td>
													<td className="bf" width="11%"><strong>Ending Balance</strong></td>
													<td className="bf" width="25%"><strong>Notes</strong></td>
												</tr>
												{acc.rows.map((r, j) => (
													<tr key={j}>
														<td className="bf1">{r.period}</td>
														<td className="bf right">{fmt(r.beginning_balance)}</td>
														<td className="bf right">{fmt(r.debit)}</td>
														<td className="bf right">{fmt(r.credit)}</td>
														<td className="bf right">{fmt(r.ending_balance)}</td>
														<td className="bf center">{r.notes}</td>
													</tr>
												))}
											</tbody>
										</table>
									))}
								</td>
							</tr>
						</tbody>
					</table>
				)}

				<PageEnd />

				{guarantor && (
					<table className="pb" cellPadding={2} cellSpacing={0} style={{ marginTop: 10 }}>
						<tbody>
							<tr>
								<td colSpan={2} className="bf3 head center"><strong>GUARANTOR DETAIL REVIEW</strong></td>
							</tr>
							<LabelRow label="Guarantor Name" value={guarantor.name} />
							<OptionalLabelRow
								label={guarantor.entity_type === 'PR' ? 'Name Without Title' : 'Type'}
								value={guarantor.name_without_title ? `${guarantor.name_without_title}${guarantor.category ? ' - ' + guarantor.category : ''}` : guarantor.category}
							/>
							<OptionalLabelRow label="Gender" value={guarantor.gender} />
							<OptionalLabelRow label={guarantor.entity_type === 'PR' ? 'Date of Birth' : 'Establishment Date'} value={guarantor.date_of_birth} />
							<OptionalLabelRow label="Place of Birth" value={guarantor.place_of_birth} />
							<OptionalLabelRow label="Address" value={guarantor.address} />
							<OptionalLabelRow label="Mobile Phone No. / Fax" value={[guarantor.phone, guarantor.fax].filter(Boolean).join(' - ') || undefined} />
							<OptionalLabelRow label="Email" value={guarantor.email} />
							<OptionalLabelRow label="Relationship with Customer" value={guarantor.relationship_with_customer} />
							<OptionalLabelRow label="BI Customer Type" value={guarantor.bi_customer_type} />
							<OptionalLabelRow label="Occupation" value={guarantor.occupation} />
							<OptionalLabelRow label="Total Exposure (Rp)" value={guarantor.total_exposure != null ? fmt(guarantor.total_exposure) : undefined} />
							<OptionalLabelRow label="NPWP" value={guarantor.npwp} />
							<OptionalLabelRow label="Citizenship" value={[guarantor.citizenship, guarantor.nationality].filter(Boolean).join(' / ') || undefined} />
							<OptionalLabelRow label="ID Card No./ Validity" value={guarantor.id_card ? `${guarantor.id_card} / ${guarantor.id_card_validity ?? 'No Expire date'}` : undefined} />
							<OptionalLabelRow label="Passport No." value={guarantor.passport_no} />
							<OptionalLabelRow label="Marital Status" value={guarantor.marital_status} />
							<OptionalLabelRow label="Line of Business" value={guarantor.line_of_business} />
							{(guarantor.spouse_name || guarantor.contract_signer_name) && (
								<>
									<tr><td colSpan={2} className="bf2"><strong>{guarantor.entity_type === 'PR' ? 'SPOUSE' : 'CONTRACT SIGNER'}</strong></td></tr>
									<OptionalLabelRow label="Name" value={guarantor.spouse_name ?? guarantor.contract_signer_name} />
									<OptionalLabelRow label="Position" value={guarantor.contract_signer_position} />
									<OptionalLabelRow label="ID Card No." value={guarantor.spouse_id_card ?? guarantor.contract_signer_id_card} />
									<OptionalLabelRow label="Address" value={guarantor.spouse_address} />
									<OptionalLabelRow label="Status" value={guarantor.spouse_status} />
									<OptionalLabelRow label="Citizenship" value={guarantor.spouse_citizenship} />
									<OptionalLabelRow label="Mobile" value={guarantor.spouse_mobile ?? guarantor.contract_signer_mobile} />
									<OptionalLabelRow label="Email" value={guarantor.spouse_email ?? guarantor.contract_signer_email} />
								</>
							)}
						</tbody>
					</table>
				)}

				<PageEnd />

				{references.length > 0 && (
					<table className={ctx.guarantor !== '2' ? 'pb' : ''} cellPadding={2} cellSpacing={0} style={{ marginTop: 10 }}>
						<tbody>
							<tr>
								<td colSpan={4} className="bf1 head top center"><strong>REFERENCES</strong></td>
							</tr>
							<tr className="center">
								<td className="bf1"><strong>No.</strong></td>
								<td className="bf"><strong>Name</strong></td>
								<td className="bf"><strong>Telephone Number</strong></td>
								<td className="bf"><strong>Remark / Notes</strong></td>
							</tr>
							{references.map((r, i) => (
								<tr key={i} className="center">
									<td className="bf1">{i + 1}</td>
									<td className="bf">{r.name}</td>
									<td className="bf">{r.phone}</td>
									<td className="bf">{r.remark}</td>
								</tr>
							))}
						</tbody>
					</table>
				)}

				<PageEnd />

				{notes && (
					<table className="pb" cellPadding={2} cellSpacing={0} style={{ marginTop: 10 }}>
						<tbody>
							<tr>
								<td className="bf3 head center">CUSTOMER NOTES / COMMENTS</td>
							</tr>
							<tr>
								<td className="bf1" height="50">
									<div dangerouslySetInnerHTML={{ __html: notes }} />
								</td>
							</tr>
						</tbody>
					</table>
				)}

				<PageEnd />

				{beneficial_owner && (
					<table cellPadding={2} cellSpacing={0} style={{ marginTop: 10 }}>
						<tbody>
							<tr>
								<td colSpan={2} className="bf3 head center"><strong>BENEFICIAL OWNER DETAIL REVIEW</strong></td>
							</tr>
							<LabelRow label="Beneficial Owner Name" value={beneficial_owner.name} />
							<OptionalLabelRow label="Alias Name" value={beneficial_owner.alias} />
							<OptionalLabelRow label="Beneficial Owner Type" value={beneficial_owner.type_label} />
							<OptionalLabelRow label={beneficial_owner.entity_type === 'PR' ? 'ID Address' : 'Address'} value={beneficial_owner.address} />
							<OptionalLabelRow label="Area" value={beneficial_owner.area} />
							<OptionalLabelRow label="Province" value={beneficial_owner.province} />
							<OptionalLabelRow label="District/ City" value={beneficial_owner.city} />
							<OptionalLabelRow label="Kecamatan" value={beneficial_owner.kecamatan} />
							<OptionalLabelRow label="Kelurahan" value={beneficial_owner.kelurahan} />
							<OptionalLabelRow label="RT/ RW" value={beneficial_owner.rt_rw} />
							<OptionalLabelRow label="Post Code" value={beneficial_owner.postal_code} />
							<OptionalLabelRow label="Fax" value={beneficial_owner.fax} />
							<OptionalLabelRow label="Phone" value={beneficial_owner.phone} />
							<OptionalLabelRow label="Mobile" value={beneficial_owner.mobile} />
							<OptionalLabelRow label="Email" value={beneficial_owner.email} />
							<OptionalLabelRow label={beneficial_owner.entity_type === 'PR' ? 'Place/ Date of Birth' : 'Establishment Place/ Date'} value={beneficial_owner.place_date_of_birth} />
							<OptionalLabelRow label="NPWP" value={beneficial_owner.npwp} />
							<OptionalLabelRow label="SIUP No" value={beneficial_owner.siup_no} />
							<OptionalLabelRow label="Line of Business" value={beneficial_owner.line_of_business} />
							<OptionalLabelRow label="Source of Fund" value={beneficial_owner.source_of_fund} />
							<OptionalLabelRow label="Average Income per Year" value={beneficial_owner.average_income != null ? fmt(beneficial_owner.average_income) : undefined} />
							{beneficial_owner.contact_name && (
								<>
									<tr><td colSpan={2} className="bf2"><strong>CONTACT PERSON</strong></td></tr>
									<LabelRow label="Name" value={beneficial_owner.contact_name} />
									<OptionalLabelRow label="Position" value={beneficial_owner.contact_position} />
									<OptionalLabelRow label="Address" value={beneficial_owner.contact_address} />
								</>
							)}
						</tbody>
					</table>
				)}

				<PageEnd />

				{credit_scoring && (
					<table cellPadding={2} cellSpacing={0} style={{ marginTop: 10 }}>
						<tbody>
							<tr>
								<td colSpan={3} className="bf3 head center"><strong>CREDIT SCORING</strong></td>
							</tr>
							<tr><td colSpan={3}>Credit Scoring Result</td></tr>
							{credit_scoring.items.map((s, i) => (
								<tr key={i}>
									<td width="10%">{i + 1}. {s.description}</td>
									<td width="5%">: {s.result}</td>
									<td width="85%">({s.score})</td>
								</tr>
							))}
							<tr><td colSpan={3}>Note : 5 (Good) ...... 1 (Poor)</td></tr>
							<tr>
								<td width="15%"><strong>Final Result</strong></td>
								<td width="15%"><strong>: <u>{credit_scoring.recommendation ?? ''}</u></strong></td>
								<td width="70%"><strong>({credit_scoring.total_score ?? '-'})</strong></td>
							</tr>
						</tbody>
					</table>
				)}


			</div>
		</div>
	);
}
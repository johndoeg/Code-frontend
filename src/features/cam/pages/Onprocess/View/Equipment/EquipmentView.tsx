import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';
import LeasePaymentReportModal from '@/features/cam/components/LeasePaymentReportModal';

interface EquipmentDetail {
	brand: string;
	show_stnk_valid_date: boolean;
	stnk_valid_date: string;
	type: string;
	chassis: string;
	model_karoseri: string;
	engine: string;
	wheels: string;
	police_no: string;
	year_condition: string;
	color: string;
	type_of_equipment: string;
	user_usage: string;
	dealer_name: string;
	vehicle_purpose: string;
	show_financing_purpose: boolean;
	financing_purpose: string;
	fund_purpose: string;
	dealer_address: string;
	parking_address: string;
	red_code_gps: string;
	zip_code: string;
	karoseri_name: string | null;
	karoseri_address: string | null;
	accessories_name: string | null;
	accessories_address: string | null;
	other_name: string | null;
	other_address: string | null;
	bpkb_no: string;
	bpkb_name_type: string;
	show_family_status: boolean;
	family_status: string;
	relation: string;
	bpkb_address: string;
	area: string;
	notary_name: string;
	fdc_area: string;
}

interface FinancingHistoryRow {
	lease_no: string;
	lessee_no: string;
	lessee_nm: string;
	otr: number;
	net_finance: number;
	disburse_date: string;
	finish_date: string;
}

interface CtocDetail {
	supplier_type: string;
	supplier_category: string;
	supplier_id_name: string;
	address: string;
	city_postcode: string;
	phone: string;
	account_no_name: string;
	bank_branch: string;
}

interface EquipmentData {
	no_data: boolean;
	title: string;
	detail: EquipmentDetail;
	financing_history: FinancingHistoryRow[];
	show_ctoc: boolean;
	ctoc: CtocDetail | null;
}

function fmt(n: number): string {
	return Math.round(n).toLocaleString('en-US');
}

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-[var(--app-border)] bg-[#2055DE] px-6 py-2.5">
			<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{children}</h2>
		</div>
	);
}

const cellLabel =
	"border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 align-top text-sm text-[var(--app-muted)] whitespace-nowrap";
const cellValue =
	"border border-[var(--app-border)] px-3 py-2 align-top text-sm text-[var(--app-text)] whitespace-pre-line";
const cellEmpty = "border border-[var(--app-border)] px-3 py-2";
const thCell =
	"border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]";

function ContinuationRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<tr>
			<td className={cellLabel}>{label}</td>
			<td className={cellValue}>{value || '-'}</td>
		</tr>
	);
}

function Row({ left, right }: { left?: [string, React.ReactNode]; right?: [string, React.ReactNode] }) {
	return (
		<tr>
			{left ? (
				<>
					<td className={cellLabel}>{left[0]}</td>
					<td className={cellValue}>{left[1] || '-'}</td>
				</>
			) : (
				<>
					<td className={cellEmpty}></td>
					<td className={cellEmpty}></td>
				</>
			)}
			{right ? (
				<>
					<td className={cellLabel}>{right[0]}</td>
					<td className={cellValue}>{right[1] || '-'}</td>
				</>
			) : (
				<>
					<td className={cellEmpty}></td>
					<td className={cellEmpty}></td>
				</>
			)}
		</tr>
	);
}

function FullRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<tr>
			<td className={cellLabel}>{label}</td>
			<td colSpan={3} className={cellValue}>{value || '-'}</td>
		</tr>
	);
}

function TwoColGrid({ rows }: { rows: [string, React.ReactNode][] }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[500px] border-collapse text-sm">
				<colgroup>
					<col className="w-[20%]" />
					<col className="w-[80%]" />
				</colgroup>
				<tbody>
					{rows.map(([label, value]) => (
						<tr key={label}>
							<td className={cellLabel}>{label}</td>
							<td className={cellValue}>{value || '-'}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default function EquipmentView({ ctx }: { ctx: CamCtx }) {
	const [activeLeaseNo, setActiveLeaseNo] = React.useState<string | null>(null);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-equipment', ctx.applno, ctx.finType],
		queryFn: async () => {
			const res = await api.get<EquipmentData>('/CAM/View/equipment', {
				params: { applno: ctx.applno, fin_type: ctx.finType },
			});
			return res.data;
		},
	});

	if (isLoading) {
		return <LoadingCard message="Loading equipment detail…" />;
	}

	if (isError || !data) {
		return <ErrorCard message="Failed to load equipment detail." />;
	}

	if (data.no_data) {
		return <NoDataCard />;
	}

	const d = data.detail;

	return (
		<div className="space-y-4">
			<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<SectionHeader>{data.title}</SectionHeader>
				<div className="overflow-x-auto p-5">
					<table className="w-full min-w-[820px] border-collapse text-sm">
						<colgroup>
							<col className="w-[20%]" />
							<col className="w-[30%]" />
							<col className="w-[20%]" />
							<col className="w-[30%]" />
						</colgroup>
						<tbody>
							<Row
								left={['Brand', d.brand]}
								right={d.show_stnk_valid_date ? ['STNK Valid Date', d.stnk_valid_date] : undefined}
							/>
							<Row left={['Type', d.type]} right={['Chasis No.', d.chassis]} />
							<Row left={['Model / Karoseri', d.model_karoseri]} right={['Engine No.', d.engine]} />
							<Row left={['Wheels', d.wheels]} right={['Police No.', d.police_no]} />
							<Row left={['Year / Condition', d.year_condition]} right={['Color', d.color]} />
							<Row left={['Type of Equipment', d.type_of_equipment]} right={['User Usage', d.user_usage]} />
							<tr>
								<td rowSpan={d.show_financing_purpose ? 3 : 1} className={cellLabel}>Dealer Name</td>
								<td rowSpan={d.show_financing_purpose ? 3 : 1} className={cellValue}>{d.dealer_name || '-'}</td>
								<td className={cellLabel}>Vehicle Purpose</td>
								<td className={cellValue}>{d.vehicle_purpose || '-'}</td>
							</tr>
							{d.show_financing_purpose && (
								<>
									<ContinuationRow label="Financing Purpose" value={d.financing_purpose} />
									<ContinuationRow label="Description for Customer Purpose" value={d.fund_purpose} />
								</>
							)}
							<Row left={['Dealer Address', d.dealer_address]} right={['Parking Address', d.parking_address]} />
							<Row left={['Red Code (GPS Vendor)', d.red_code_gps]} right={['Zip Code', d.zip_code]} />
							{d.karoseri_name !== null && <FullRow label="Karoseri Name" value={d.karoseri_name} />}
							{d.karoseri_address !== null && <FullRow label="Karoseri Address" value={d.karoseri_address} />}
							{d.accessories_name !== null && <FullRow label="Accessories Name" value={d.accessories_name} />}
							{d.accessories_address !== null && <FullRow label="Accessories Address" value={d.accessories_address} />}
							{d.other_name !== null && <FullRow label="Others Name" value={d.other_name} />}
							{d.other_address !== null && <FullRow label="Others Address" value={d.other_address} />}
						</tbody>
					</table>
				</div>
			</div>

			<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<SectionHeader>Equipment Financing History</SectionHeader>
				<div className="overflow-x-auto p-5">
					<table className="w-full overflow-hidden rounded-lg border border-[var(--app-border)] border-collapse text-sm shadow-sm">
						<thead>
							<tr>
								<th className={thCell}>Contract No.</th>
								<th className={thCell}>Customer Name</th>
								<th className={`${thCell} text-right`}>OTR Amount</th>
								<th className={`${thCell} text-right`}>Total Net Finance</th>
								<th className={thCell}>Disbursement Date</th>
								<th className={thCell}>Finish Date</th>
							</tr>
						</thead>
						{data.financing_history.length > 0 && (
							<tbody>
								{data.financing_history.map((row, i) => (
									<tr key={i} className={i % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}>
										<td className="border border-[var(--app-border)] px-3 py-2">
											<button
												type="button"
												onClick={() => setActiveLeaseNo(row.lease_no)}
												className="text-blue-600 underline hover:text-blue-700"
											>
												{row.lease_no}
											</button>
										</td>
										<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.lessee_nm}</td>
										<td className="border border-[var(--app-border)] px-3 py-2 text-right text-[var(--app-text)]">{fmt(row.otr)}</td>
										<td className="border border-[var(--app-border)] px-3 py-2 text-right text-[var(--app-text)]">{fmt(row.net_finance)}</td>
										<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.disburse_date}</td>
										<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{row.finish_date}</td>
									</tr>
								))}
							</tbody>
						)}
					</table>
				</div>
			</div>

			<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<SectionHeader>BPKB</SectionHeader>
				<div className="p-5">
					<TwoColGrid
						rows={[
							['BPKB No.', d.bpkb_no],
							['BPKB Name / Type', d.bpkb_name_type],
							...(d.show_family_status ? ([['Family Status', d.family_status]] as [string, React.ReactNode][]) : []),
							['Relationship with Customer', d.relation],
							['BPKB Address', d.bpkb_address],
							['Area', d.area],
							['Notary Name', d.notary_name],
							['Fiducia/Cessie/Any Legitimate Area', d.fdc_area],
						]}
					/>
				</div>
			</div>

			{data.show_ctoc && data.ctoc && (
				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					<SectionHeader>C to C</SectionHeader>
					<div className="p-5">
						<TwoColGrid
							rows={[
								['Supplier Type', data.ctoc.supplier_type],
								['Supplier Category', data.ctoc.supplier_category],
								['Supplier ID / Name', data.ctoc.supplier_id_name],
								['Address', data.ctoc.address],
								['City / Post Code', data.ctoc.city_postcode],
								['Phone', data.ctoc.phone],
								['Account No. / Name', data.ctoc.account_no_name],
								['Bank / Branch', data.ctoc.bank_branch],
							]}
						/>
					</div>
				</div>
			)}

			{activeLeaseNo && (
				<LeasePaymentReportModal leaseNo={activeLeaseNo} onClose={() => setActiveLeaseNo(null)} />
			)}
		</div>
	);
}
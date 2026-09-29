import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import DocPreviewModal, { PREVIEW_CLOSED, type PreviewState } from '@/features/cam/components/DocPreviewModal';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';

interface AddressBlock {
	address_line: string;
	contact_line: string;
}

interface EmergencyInfo {
	name: string;
	address: string;
	phone: string;
	relation: string;
}

interface ReferenceRow {
	no: number;
	name: string;
	phone: string;
	remark: string;
}

interface DocumentFile {
	id: number;
	name: string;
	download_url: string | null;
}

interface DocumentRow {
	key: string;
	label: string;
	files: DocumentFile[];
}

interface DocumentGroup {
	header: string | null;
	rows: DocumentRow[];
}

interface CustomerDetail {
	lessee_nm: string;
	idcard_name: string;
	cust_type: string;
	id_address: AddressBlock | null;
	whatsapp: string;
	mobile: string;
	email: string;
	npwp_formatted: string;
	correspondence: AddressBlock | null;
	npwp_address: string;
	additional1: AddressBlock | null;
	group_name: string;
	contact: string;
	position: string;
	additional2: AddressBlock | null;
	establishment_place: string;
	establishment_date: string;
	line_of_business: string;
	industrial_code: string;
	other_phone1: string;
	other_phone1_notes: string;
	other_phone2: string;
	other_phone2_notes: string;
	bi_customer_type: string;
	number_of_employee: number | string | null;
	office_status: string;
	siup_no: string;
	domicile_no: string;
	business_entity: string;
	go_public: string;
	relationship: string;
	emergency: EmergencyInfo;
	references: ReferenceRow[];
	document_groups: DocumentGroup[];
	show_documents: boolean;
}

const cellLabel =
	"border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 align-top text-sm text-[var(--app-muted)] whitespace-nowrap";
const cellValue =
	"border border-[var(--app-border)] px-3 py-2 align-top text-sm text-[var(--app-text)]";
const cellEmpty = "border border-[var(--app-border)] px-3 py-2";
const subheadCell =
	"border border-[var(--app-border)] px-3 py-2 align-top text-sm font-bold text-[var(--app-text)] underline underline-offset-2";

function addressNode(block: AddressBlock | null): React.ReactNode {
	if (!block) return '-';
	return (
		<>
			<div>{block.address_line}</div>
			<div className="text-[var(--app-muted)]">{block.contact_line}</div>
		</>
	);
}

function Row({
	left,
	right,
	rightHeader,
}: {
	left?: [string, React.ReactNode];
	right?: [string, React.ReactNode];
	rightHeader?: string;
}) {
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
			{rightHeader ? (
				<td colSpan={2} className={subheadCell}>{rightHeader}</td>
			) : right ? (
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

function ContinuationRow({ right }: { right: [string, React.ReactNode] }) {
	return (
		<tr>
			<td className={cellLabel}>{right[0]}</td>
			<td className={cellValue}>{right[1] || '-'}</td>
		</tr>
	);
}

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-[var(--app-border)] bg-[#2055DE] px-6 py-2.5">
			<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{children}</h2>
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
	files: DocumentFile[];
	onPreview: (file: DocumentFile) => void;
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

export default function CorporateDetailView({ ctx }: { ctx: CamCtx }) {
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-corporate-detail', ctx.apless, ctx.applno],
		queryFn: async () => {
			const res = await api.get<CustomerDetail>('/CAM/View/corporate-detail', {
				params: { apless: ctx.apless, applno: ctx.applno },
			});
			return res.data;
		},
	});

	const handlePreview = (file: DocumentFile) => {
		if (!file.download_url) return;
		setPreview({ open: true, name: file.name, url: file.download_url });
	};

	if (isLoading) {
		return <LoadingCard message="Loading corporate detail…" bordered />;
	}
	if (isError || !data) {
		return <ErrorCard message="Failed to load corporate detail." bordered />;
	}

	return (
		<div>
			<DocPreviewModal state={preview} onClose={() => setPreview(PREVIEW_CLOSED)} />

			<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<SectionHeader>Customer Detail Review</SectionHeader>

				<div className="overflow-x-auto">
					<table className="w-full min-w-[820px] border-collapse text-sm">
						<colgroup>
							<col className="w-[15%]" />
							<col className="w-[35%]" />
							<col className="w-[15%]" />
							<col className="w-[35%]" />
						</colgroup>
						<tbody>
							<tr>
								<td colSpan={4} className={cellValue}>
									<span className="mr-1 text-[var(--app-muted)]">Name in Akta :</span>
									{data.lessee_nm || '-'}
								</td>
							</tr>
							<tr>
								<td colSpan={2} className={cellValue}>
									<span className="mr-1 text-[var(--app-muted)]">Customer Name Without Title :</span>
									{data.idcard_name || '-'}
								</td>
								<td className={cellLabel}>Type</td>
								<td className={cellValue}>{data.cust_type || '-'}</td>
							</tr>

							<tr>
								<td rowSpan={4} className={cellLabel}>Address in SK Domisili</td>
								<td rowSpan={4} className={cellValue}>{addressNode(data.id_address)}</td>
								<td className={cellLabel}>Whatsapp No.</td>
								<td className={cellValue}>{data.whatsapp || '-'}</td>
							</tr>
							<ContinuationRow right={['Mobile', data.mobile]} />
							<ContinuationRow right={['Email', data.email]} />
							<ContinuationRow right={['NPWP', data.npwp_formatted]} />

							<Row
								left={['Correspondence', addressNode(data.correspondence)]}
								right={['Address in NPWP', data.npwp_address]}
							/>

							<tr>
								<td rowSpan={3} className={cellLabel}>Additional 1</td>
								<td rowSpan={3} className={cellValue}>{addressNode(data.additional1)}</td>
								<td className={cellLabel}>Group</td>
								<td className={cellValue}>{data.group_name || '-'}</td>
							</tr>
							<ContinuationRow right={['Contact', data.contact]} />
							<ContinuationRow right={['Position', data.position]} />

							<tr>
								<td rowSpan={3} className={cellLabel}>Additional 2</td>
								<td rowSpan={3} className={cellValue}>{addressNode(data.additional2)}</td>
								<td className={cellLabel}>Establishment Place / Date</td>
								<td className={cellValue}>{`${data.establishment_place || '-'} / ${data.establishment_date || '-'}`}</td>
							</tr>
							<ContinuationRow right={['Line of Business', data.line_of_business]} />
							<ContinuationRow right={['Industrial Code', data.industrial_code]} />

							<Row left={['Other Phone 1', data.other_phone1]} right={['BI Customer Type', data.bi_customer_type]} />
							<Row
								left={['Other Phone Notes 1', data.other_phone1_notes]}
								right={['Number of Employee', data.number_of_employee != null ? `${data.number_of_employee} people(s)` : '-']}
							/>
							<Row left={['Other Phone 2', data.other_phone2]} />
							<Row left={['Other Phone Notes 2', data.other_phone2_notes]} rightHeader="Emergency Contact" />
							<Row left={['Office Status', data.office_status]} right={['Emergency Name', data.emergency.name]} />
							<Row left={['SIUP No.', data.siup_no]} right={['Emergency Address', data.emergency.address]} />
							<Row left={['Domicile No.', data.domicile_no]} right={['Emergency Phone', data.emergency.phone]} />
							<Row left={['Form of Business Entity', data.business_entity]} right={['Emergency Relation', data.emergency.relation]} />
							<Row left={['Go Public', data.go_public]} />
							<Row left={['Relationship with Company', data.relationship]} />
						</tbody>
					</table>
				</div>

				{data.references.length > 0 && (
					<>
						<SectionHeader>References</SectionHeader>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[600px] border-collapse text-sm">
								<colgroup>
									<col className="w-[8%]" />
									<col className="w-[33%]" />
									<col className="w-[24%]" />
									<col className="w-[35%]" />
								</colgroup>
								<thead>
									<tr>
										<th className="border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-center text-sm font-bold text-[var(--app-text)]">No.</th>
										<th className="border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-center text-sm font-bold text-[var(--app-text)]">Name</th>
										<th className="border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-center text-sm font-bold text-[var(--app-text)]">Telephone Number</th>
										<th className="border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-center text-sm font-bold text-[var(--app-text)]">Remark/ Notes</th>
									</tr>
								</thead>
								<tbody>
									{data.references.map((r) => (
										<tr key={r.no}>
											<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{r.no}</td>
											<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{r.name || '-'}</td>
											<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{r.phone || '-'}</td>
											<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{r.remark || '-'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}

				{data.show_documents && (
					<>
						<SectionHeader>Document</SectionHeader>
						<div className="space-y-5 px-6 py-5">
							{data.document_groups.map((group, gi) => (
								<div key={gi}>
									{group.header && (
										<h3 className="mb-1.5 text-sm font-bold text-[var(--app-text)]">
											{group.header}
										</h3>
									)}
									<div className="space-y-2.5">
										{group.rows.map((row) => (
											<div key={row.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-4">
												<div className="w-full shrink-0 text-sm text-[var(--app-text)] sm:w-56">{row.label}</div>
												<div className="flex-1">
													{row.files.length === 0 ? (
														<span className="text-sm text-[var(--app-muted)]">No file(s) uploaded.</span>
													) : (
														<DocFilesTable files={row.files} onPreview={handlePreview} />
													)}
												</div>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
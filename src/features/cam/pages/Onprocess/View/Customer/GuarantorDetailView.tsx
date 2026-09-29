import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import DocPreviewModal, { PREVIEW_CLOSED, type PreviewState } from '@/features/cam/components/DocPreviewModal';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';

interface GuarantorListItem {
	grnid: string;
	name: string;
	type: string;
	occupation: string;
	relation: string;
}

interface GuarantorListData {
	guarantors: GuarantorListItem[];
	no_data: boolean;
}

interface GuarantorSummary {
	guarantor_type: string;
	type_label: string;
	category: string;
	npwp: string;
	bi_customer_type: string;
	name_id_card?: string;
	name_without_title?: string;
	marital_status?: string;
	spouse_name?: string;
	spouse_status?: string;
	gender?: string;
	spouse_id_card_no?: string;
	date_of_birth?: string;
	spouse_address?: string;
	address?: string;
	spouse_citizenship?: string;
	phone_fax?: string;
	spouse_mobile?: string;
	email?: string;
	spouse_email?: string;
	relationship?: string;
	occupation?: string;
	total_exposure?: string;
	citizenship?: string;
	id_card_no?: string;
	id_card_validity?: string;
	passport_no?: string;
	name_akta?: string;
	name_npwp?: string;
	establishment_date?: string;
	address_sk_domisili?: string;
	pic_phone_fax?: string;
	address_npwp?: string;
	line_of_business?: string;
	contract_signer?: string;
	contract_signer_position?: string;
	contract_signer_id_card?: string;
	contract_signer_mobile?: string;
	contract_signer_email?: string;
	contract_signer_citizenship?: string;
}

interface GuarantorFile {
	id: number;
	name: string;
	download_url: string | null;
}

interface GuarantorDocumentRow {
	key: string;
	label: string;
	files: GuarantorFile[];
	dynamic_groups?: { key: string; files: GuarantorFile[] }[];
}

interface GuarantorDetailData {
	summary: GuarantorSummary;
	documents: GuarantorDocumentRow[];
	show_documents: boolean;
	bank_statement_files: GuarantorFile[];
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

function GuarantorSummaryPR({ s }: { s: GuarantorSummary }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[820px] border-collapse text-sm">
				<colgroup>
					<col className="w-[15%]" />
					<col className="w-[35%]" />
					<col className="w-[15%]" />
					<col className="w-[35%]" />
				</colgroup>
				<tbody>
					<Row left={['Guarantor Name in ID Card', s.name_id_card]} right={['Marital Status', s.marital_status]} />
					<Row
						left={['Guarantor Name Without Title', s.name_without_title]}
						right={['Spouse Name in ID Card', s.spouse_name]}
					/>
					<Row left={['Type', s.type_label]} right={['Spouse Status', s.spouse_status]} />
					<Row left={['Gender', s.gender]} right={['Spouse ID Card No.', s.spouse_id_card_no]} />
					<Row left={['Date of Birth', s.date_of_birth]} right={['Spouse Address in ID Card', s.spouse_address]} />
					<Row left={['Address', s.address]} right={['Spouse Citizenship', s.spouse_citizenship]} />
					<Row left={['Mobile Phone No. / Fax', s.phone_fax]} right={['Spouse Mobile Phone No.', s.spouse_mobile]} />
					<Row left={['Email', s.email]} right={['Spouse Email', s.spouse_email]} />
					<Row right={['Relationship with Customer', s.relationship]} />
					<Row right={['BI Customer Type', s.bi_customer_type]} />
					<Row right={['Occupation', s.occupation]} />
					<Row right={['Total Exposure (Rp)', s.total_exposure]} />
					<Row right={['NPWP', s.npwp]} />
					<Row right={['Citizenship', s.citizenship]} />
					<Row right={['ID Card No.', s.id_card_no]} />
					<Row right={['Validity ID Card', s.id_card_validity]} />
					<Row right={['Passport No.', s.passport_no]} />
				</tbody>
			</table>
		</div>
	);
}

function GuarantorSummaryPT({ s }: { s: GuarantorSummary }) {
	const rows: [string, React.ReactNode][] = [
		['Guarantor Name in Akta', s.name_akta],
		['Guarantor Name in NPWP', s.name_npwp],
		['Guarantor Name', s.name_without_title],
		['Type', s.type_label],
		['Establishment Date', s.establishment_date],
		['Address in SK. Domisili', s.address_sk_domisili],
		['PIC Mobile Phone No. / Fax', s.pic_phone_fax],
		['BI Customer Type', s.bi_customer_type],
		['NPWP', s.npwp],
		['Address in NPWP', s.address_npwp],
		['Line of Business', s.line_of_business],
		['Relationship with Customer', s.relationship],
		['Total Exposure', s.total_exposure],
		['Contract Signer', s.contract_signer],
		['Contract Signer Position', s.contract_signer_position],
		['Contract Signer ID Card No.', s.contract_signer_id_card],
		['Contract Signer Mobile Phone No.', s.contract_signer_mobile],
		['Contract Signer Email', s.contract_signer_email],
		['Contract Signer Citizenship', s.contract_signer_citizenship],
	];
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[600px] border-collapse text-sm">
				<colgroup>
					<col className="w-[28%]" />
					<col className="w-[72%]" />
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

function DocFilesTable({ files, onPreview }: { files: GuarantorFile[]; onPreview: (file: GuarantorFile) => void }) {
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

function GuarantorDetailView({
	ctx,
	grnid,
	grntp,
	onBack,
}: {
	ctx: CamCtx;
	grnid: string;
	grntp: string;
	onBack: () => void;
}) {
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-guarantor-detail', ctx.apless, ctx.applno, grnid, grntp],
		queryFn: async () => {
			const res = await api.get<GuarantorDetailData>('/CAM/View/guarantor-detail', {
				params: { apless: ctx.apless, applno: ctx.applno, grnid, grntp },
			});
			return res.data;
		},
	});

	const handlePreview = (file: GuarantorFile) => {
		if (!file.download_url) return;
		setPreview({ open: true, name: file.name, url: file.download_url });
	};

	return (
		<div>
			<button
				type="button"
				onClick={onBack}
				className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--app-muted)] hover:text-[var(--app-text)]"
			>
				← Back to list
			</button>

			{isLoading ? (
				<LoadingCard message="Loading guarantor detail…" />
			) : isError || !data ? (
				<ErrorCard message="Failed to load guarantor detail." />
			) : (
				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					<DocPreviewModal state={preview} onClose={() => setPreview(PREVIEW_CLOSED)} />

					<SectionHeader>Guarantor Detail Review</SectionHeader>

					<div className="p-5">
						{data.summary.guarantor_type === 'PT' ? (
							<GuarantorSummaryPT s={data.summary} />
						) : (
							<GuarantorSummaryPR s={data.summary} />
						)}
					</div>

					{data.show_documents && (
						<>
							<SectionHeader>Document</SectionHeader>
							<div className="space-y-4 px-6 py-5">
								{data.documents.map((row) => (
									<div key={row.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-4">
										<div className="w-full shrink-0 text-sm text-[var(--app-text)] sm:w-64">{row.label}</div>
										<div className="flex-1 space-y-3">
											{row.dynamic_groups ? (
												row.dynamic_groups.length === 0 ? (
													<span className="text-sm text-[var(--app-muted)]">No file(s) uploaded.</span>
												) : (
													row.dynamic_groups.map((g) => (
														<DocFilesTable key={g.key} files={g.files} onPreview={handlePreview} />
													))
												)
											) : row.files.length === 0 ? (
												<span className="text-sm text-[var(--app-muted)]">No file(s) uploaded.</span>
											) : (
												<DocFilesTable files={row.files} onPreview={handlePreview} />
											)}
										</div>
									</div>
								))}
							</div>
						</>
					)}

					<SectionHeader>Bank Statement Files</SectionHeader>
					<div className="px-6 pb-6 pt-5">
						{data.bank_statement_files.length === 0 ? (
							<span className="text-sm text-[var(--app-muted)]">No file(s) uploaded.</span>
						) : (
							<DocFilesTable files={data.bank_statement_files} onPreview={handlePreview} />
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export default function GuarantorView({ ctx }: { ctx: CamCtx }) {
	const [selected, setSelected] = useState<{ grnid: string; grntp: string } | null>(null);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-guarantor-list', ctx.applno],
		queryFn: async () => {
			const res = await api.get<GuarantorListData>('/CAM/View/guarantor-list', {
				params: { applno: ctx.applno },
			});
			return res.data;
		},
	});

	if (selected) {
		return (
			<GuarantorDetailView
				ctx={ctx}
				grnid={selected.grnid}
				grntp={selected.grntp}
				onBack={() => setSelected(null)}
			/>
		);
	}

	if (isLoading) {
		return <LoadingCard message="Loading guarantors…" />;
	}
	if (isError || !data) {
		return <ErrorCard message="Failed to load guarantor list." />;
	}
	if (data.no_data) {
		return <NoDataCard />;
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow">
			<SectionHeader>List of Guarantor</SectionHeader>
			<div className="overflow-x-auto p-5">
				<table className="w-full min-w-[700px] overflow-hidden rounded-lg border-collapse text-sm shadow-sm">
					<thead>
						<tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
							<th className="border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2">Name</th>
							<th className="border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2">Guarantor Type</th>
							<th className="border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2">Occupation</th>
							<th className="border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2">Relationship with Customer</th>
						</tr>
					</thead>
					<tbody>
						{data.guarantors.map((g, i) => (
							<tr key={g.grnid} className={i % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}>
								<td className="border border-[var(--app-border)] px-3 py-2">
									<button
										type="button"
										onClick={() => setSelected({ grnid: g.grnid, grntp: g.type })}
										className="text-left text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
									>
										{g.name || '-'}
									</button>
								</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{g.type || '-'}</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{g.occupation || '-'}</td>
								<td className="border border-[var(--app-border)] px-3 py-2 text-[var(--app-text)]">{g.relation || '-'}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
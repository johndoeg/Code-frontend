import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import DocPreviewModal, { PREVIEW_CLOSED, type PreviewState } from '@/features/cam/components/DocPreviewModal';

interface FileEntry { file_name: string; aws_key: string; }

interface AllFilesData {
	ind_cor: string;
	lessee_cat: string;
	citizen: string;
	spouse_citizen: string;
	customer_documents: Record<string, FileEntry[]>;
	bank_statement: FileEntry[];
	has_guarantor: boolean;
	guarantor_type_pr: string | null;
	guarantor_type_pt: string | null;
	guarantor_documents: Record<string, FileEntry[]>;
	guarantor_bank_statement: FileEntry[];
	cust_survey: Record<string, FileEntry[]>;
	eq_survey: Record<string, FileEntry[]>;
	is_approved: string;
	applno: string;
	apless: string;
}

const dlHref = (awsKey: string, fileName: string) =>
	`/CAM/files/download?aws_key=${encodeURIComponent(awsKey)}&file_name=${encodeURIComponent(fileName)}`;

function filesFor(docs: Record<string, FileEntry[]>, ...keys: string[]): FileEntry[] {
	return keys.flatMap(k => docs[k] ?? []);
}

function dynamicKeys(docs: Record<string, FileEntry[]>, prefix: string): string[] {
	return Object.keys(docs).filter(k => k.startsWith(prefix)).sort();
}

const PreviewContext = React.createContext<(file: FileEntry) => void>(() => { });

function ViewChip({ file }: { file: FileEntry }) {
	const onPreview = React.useContext(PreviewContext);

	if (!file.aws_key) {
		return (
			<span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-alt)] px-2 py-1 text-[11px] font-medium text-[var(--app-muted)] cursor-not-allowed">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
				View
			</span>
		);
	}
	return (
		<button
			type="button"
			onClick={() => onPreview(file)}
			className="inline-flex shrink-0 items-center gap-1 rounded-md border border-orange-500 bg-orange-50 px-2 py-1 text-[11px] font-medium text-orange-700 transition-colors hover:border-orange-600 hover:bg-orange-500 hover:text-white"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
				<circle cx="12" cy="12" r="3" />
			</svg>
			View
		</button>
	);
}

function DownloadChip({ file }: { file: FileEntry }) {
	if (!file.aws_key) {
		return (
			<span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-alt)] px-2 py-1 text-[11px] font-medium text-[var(--app-muted)] cursor-not-allowed">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
				</svg>
				Download
			</span>
		);
	}

	const handleDownload = () => {
		const link = document.createElement('a');
		link.href = dlHref(file.aws_key, file.file_name);
		link.download = file.file_name;
		link.rel = 'noopener noreferrer';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<button
			type="button"
			onClick={handleDownload}
			className="inline-flex shrink-0 items-center gap-1 rounded-md border border-orange-500 bg-orange-50 px-2 py-1 text-[11px] font-medium text-orange-700 transition-colors hover:border-orange-600 hover:bg-orange-500 hover:text-white"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
			</svg>
			Download
		</button>
	);
}

const thCell = "border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]";
const tdCell = "border border-[var(--app-border)] px-3 py-1.5 text-xs text-[var(--app-text)]";

function FileTable({ files }: { files: FileEntry[] }) {
	return (
		<table className="w-full table-fixed overflow-hidden rounded-lg border border-[var(--app-border)] border-collapse text-xs shadow-sm">
			<colgroup>
				<col style={{ width: 40 }} />
				<col />
				<col style={{ width: 190 }} />
			</colgroup>
			<thead>
				<tr>
					<th className={thCell}>No.</th>
					<th className={thCell}>File Name</th>
					<th className={thCell}>Actions</th>
				</tr>
			</thead>
			{files.length > 0 && (
				<tbody>
					{files.map((f, i) => (
						<tr key={i}>
							<td className={tdCell}>{i + 1}</td>
							<td className={`${tdCell} break-all`}>{f.file_name}</td>
							<td className={tdCell}>
								<div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
									<ViewChip file={f} />
									<DownloadChip file={f} />
								</div>
							</td>
						</tr>
					))}
				</tbody>
			)}
		</table>
	);
}

function FieldRow({ label, files }: { label: string; files: FileEntry[] }) {
	return (
		<div className="flex flex-col gap-2 border-b border-[var(--app-border)] py-2.5 last:border-0 sm:flex-row sm:gap-4">
			<div className="shrink-0 pt-1 text-xs text-[var(--app-muted)] sm:w-1/4">{label}</div>
			<div className="flex-1 overflow-x-auto"><FileTable files={files} /></div>
		</div>
	);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="mb-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow">
			<div className="border-b border-[var(--app-border)] bg-[#2055DE] px-5 py-2.5">
				<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{title}</h2>
			</div>
			<div className="px-5 pb-3 pt-1">{children}</div>
		</div>
	);
}

function Sub({ title }: { title: string }) {
	return <p className="mb-1 mt-3 text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]">{title}</p>;
}


function IndividualDocSection({
	docs, citizen, spouseCitizen,
}: { docs: Record<string, FileEntry[]>; citizen: string; spouseCitizen: string }) {
	const isWNA = citizen === 'WNA';
	const spouseIsWNA = spouseCitizen === 'WNA';
	return (
		<Section title="Customer's Document">
			{isWNA ? (
				<>
					<Sub title="WNA" />
					<FieldRow label="KITAS/KITAP a/n Pelanggan" files={filesFor(docs, 'cust-kitas')} />
					<FieldRow
						label="KITAS/KITAP a/n Suami/Istri Pelanggan"
						files={filesFor(docs, spouseIsWNA ? 'cust-spouse-kitas' : 'cust-wna-spouse-ktp')}
					/>
					<FieldRow label="SK. Susunan Keluarga Pendatang (SKSP) WNA" files={filesFor(docs, 'cust-family-tree')} />
					<FieldRow label="Surat Referensi Kerja dari Perusahaan WNA Bekerja" files={filesFor(docs, 'cust-reference')} />
				</>
			) : (
				<>
					<Sub title="WNI" />
					<FieldRow label="Customer's Spouse Family Card" files={filesFor(docs, 'cust-spouse-kk')} />
				</>
			)}
			<Sub title="Additional Document" />
			<FieldRow label="Salary Receipt" files={filesFor(docs, 'cust-salary-receipt')} />
			<Sub title="BPKB Document" />
			<FieldRow label="BPKB ID" files={filesFor(docs, 'cust-ktp-bpkb')} />
			<FieldRow label="BPKB Family Card" files={filesFor(docs, 'cust-kk-bpkb')} />
			<FieldRow label="Other" files={filesFor(docs, 'cust-other')} />
			<Sub title="Individual Document" />
			<FieldRow label="ID Card" files={filesFor(docs, 'cust-ktp')} />
			<FieldRow
				label="Spouse ID Card"
				files={filesFor(docs, spouseIsWNA ? 'cust-spouse-kitas' : 'cust-spouse-ktp')}
			/>
			<FieldRow label="KK" files={filesFor(docs, 'cust-kk')} />
			<FieldRow label="NPWP" files={filesFor(docs, 'cust-npwp')} />
			<FieldRow label="SPK" files={filesFor(docs, 'cust-spk')} />
			<FieldRow label="Marriage/Death/Divorce/Prenuptial Statement" files={filesFor(docs, 'cust-marriage-or-death-statement')} />
		</Section>
	);
}

function KoperasiDocSection({ docs }: { docs: Record<string, FileEntry[]> }) {
	const dynKtp = dynamicKeys(docs, 'corp-ocr-ktp_');
	const dynWna = dynamicKeys(docs, 'wna-corp-board_');
	return (
		<Section title="Customer's Document">
			<Sub title="Customer Type: KOPERASI" />
			<FieldRow label="Susunan Pengurus & Pengawas Koperasi" files={filesFor(docs, 'corp-structure')} />
			<FieldRow label="KTP a/n Pengawas Penanda Tangan Kontrak" files={filesFor(docs, 'corp-ktp-pengawas')} />
			<FieldRow label="SIUP" files={filesFor(docs, 'corp-siup')} />
			<FieldRow label="NIB" files={filesFor(docs, 'corp-nib')} />
			<Sub title="Dokumen BPKB" />
			<FieldRow label="KTP an. BPKB" files={filesFor(docs, 'corp-ktp-bpkb')} />
			<FieldRow label="Kartu Keluarga an. BPKB" files={filesFor(docs, 'corp-kk-bpkb')} />
			<FieldRow label="Other" files={filesFor(docs, 'corp-other')} />
			<Sub title="Dokumen Data Perusahaan" />
			<FieldRow label="Akta Pendirian" files={filesFor(docs, 'corp-akta')} />
			<FieldRow label="SK Kemenkumham Akta Pendirian" files={filesFor(docs, 'corp-sk-akta')} />
			<FieldRow label="Akta Perubahan Terakhir" files={filesFor(docs, 'corp-akta-terakhir')} />
			<FieldRow label="SK Kemenkumham atas Akta Perubahan Terakhir" files={filesFor(docs, 'corp-sk-akta-terakhir')} />
			<FieldRow label="KTP Pengurus pada Akta Perubahan Terakhir" files={filesFor(docs, 'corp-ktp-akta-terakhir')} />
			{dynKtp.map((k, i) => <React.Fragment key={k}><FieldRow label={`KTP Pengurus ${i + 1}`} files={docs[k] ?? []} /></React.Fragment>)}
			{dynWna.map((k, i) => <React.Fragment key={k}><FieldRow label={`WNA Board Document ${i + 1}`} files={docs[k] ?? []} /></React.Fragment>)}
			<FieldRow label="NPWP Perusahaan" files={filesFor(docs, 'corp-npwp')} />
			<FieldRow label="SPK" files={filesFor(docs, 'corp-spk')} />
		</Section>
	);
}

const CORP_LABELS: Record<string, string> = {
	'corp-structure': 'Susunan Pengurus',
	'corp-ktp-pengawas': 'KTP a/n Pengawas',
	'corp-siup': 'SIUP',
	'corp-nib': 'NIB',
	'corp-ktp-bpkb': 'KTP an. BPKB',
	'corp-kk-bpkb': 'Kartu Keluarga an. BPKB',
	'corp-other': 'Other',
	'corp-akta': 'Akta Pendirian',
	'corp-sk-akta': 'SK Kemenkumham Akta Pendirian',
	'corp-akta-terakhir': 'Akta Perubahan Terakhir',
	'corp-sk-akta-terakhir': 'SK Kemenkumham atas Akta Perubahan Terakhir',
	'corp-ktp-akta-terakhir': 'KTP Pengurus pada Akta Perubahan Terakhir',
	'corp-npwp': 'NPWP Perusahaan',
	'corp-spk': 'SPK',
};

function GenericCorpDocSection({ docs, lesseeCat }: { docs: Record<string, FileEntry[]>; lesseeCat: string }) {
	const typeLabel = ({ CV: 'CV', FD: 'YAYASAN', PT: 'PT' } as Record<string, string>)[lesseeCat] ?? lesseeCat;
	const dynKtp = dynamicKeys(docs, 'corp-ocr-ktp_');
	const dynWna = dynamicKeys(docs, 'wna-corp-board_');
	const knownKeys = Object.keys(CORP_LABELS);
	const otherKeys = Object.keys(docs).filter(
		k => !knownKeys.includes(k) && !k.startsWith('corp-ocr-ktp_') && !k.startsWith('wna-corp-board_')
	);
	return (
		<Section title="Customer's Document">
			<Sub title={`Customer Type: ${typeLabel}`} />
			{knownKeys.filter(k => docs[k]?.length).map(k => (
				<React.Fragment key={k}><FieldRow label={CORP_LABELS[k]} files={docs[k]} /></React.Fragment>
			))}
			{dynKtp.map((k, i) => <React.Fragment key={k}><FieldRow label={`KTP Pengurus ${i + 1}`} files={docs[k] ?? []} /></React.Fragment>)}
			{dynWna.map((k, i) => <React.Fragment key={k}><FieldRow label={`WNA Board Document ${i + 1}`} files={docs[k] ?? []} /></React.Fragment>)}
			{otherKeys.map(k => (
				<React.Fragment key={k}><FieldRow label={k.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} files={docs[k]} /></React.Fragment>
			))}
		</Section>
	);
}

function ManagementDetailSection({ docs }: { docs: Record<string, FileEntry[]> }) {
	const files = [
		...dynamicKeys(docs, 'corp-ocr-ktp_').flatMap(k => docs[k] ?? []),
		...dynamicKeys(docs, 'wna-corp-board_').flatMap(k => docs[k] ?? []),
	];
	if (!files.length) return null;
	return (
		<Section title="Management Detail">
			<FileTable files={files} />
		</Section>
	);
}

function GuarantorCorpSection({ docs }: { docs: Record<string, FileEntry[]> }) {
	const dynKtp = dynamicKeys(docs, 'corp-guarantor-ocr-ktp_');
	const dynWna = dynamicKeys(docs, 'corp-guarantor-wna-corp-board_');
	return (
		<Section title="Guarantor's Corporate Document">
			<FieldRow label="KK a/n Pemegang Saham (jika ada)" files={filesFor(docs, 'corp-guarantor-kk')} />
			<FieldRow label="Akta Pendirian" files={filesFor(docs, 'corp-guarantor-akta')} />
			<FieldRow label="SK Kemenkumham Akta Pendirian" files={filesFor(docs, 'corp-guarantor-sk-akta')} />
			<FieldRow label="Akta Perubahan Terakhir" files={filesFor(docs, 'corp-guarantor-akta-terakhir')} />
			<FieldRow label="SK Kemenkumham atas Akta Perubahan Terakhir" files={filesFor(docs, 'corp-guarantor-sk-akta-terakhir')} />
			<FieldRow label="KTP Pengurus atas Akta Perubahan Terakhir" files={filesFor(docs, 'corp-guarantor-ktp-akta-terakhir')} />
			{dynKtp.map((k, i) => <React.Fragment key={k}><FieldRow label={`KTP Pengurus Penjamin ${i + 1}`} files={docs[k] ?? []} /></React.Fragment>)}
			{dynWna.map((k, i) => <React.Fragment key={k}><FieldRow label={`WNA Board Penjamin ${i + 1}`} files={docs[k] ?? []} /></React.Fragment>)}
			<FieldRow label="NPWP" files={filesFor(docs, 'corp-guarantor-npwp')} />
		</Section>
	);
}

export default function AllFilesView({ ctx }: { ctx: CamCtx }) {
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);

	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-all-files', ctx.apless, ctx.applno, ctx.indCor],
		queryFn: async () => {
			const res = await api.get<AllFilesData>('/CAM/View/all-files', {
				params: { apless: ctx.apless, applno: ctx.applno, ind_cor: ctx.indCor },
			});
			return res.data;
		},
	});

	const handlePreview = (file: FileEntry) => {
		setPreview({
			open: true,
			name: file.file_name,
			url: dlHref(file.aws_key, file.file_name),
		});
	};

	if (isLoading) return <div className="p-8 text-center text-sm text-[var(--app-muted)]">Loading files…</div>;
	if (isError || !data) return <div className="p-8 text-center text-sm text-red-500">Failed to load files.</div>;

	const {
		ind_cor, lessee_cat, citizen, spouse_citizen,
		customer_documents, bank_statement,
		has_guarantor, guarantor_type_pr, guarantor_type_pt,
		guarantor_documents, guarantor_bank_statement,
		cust_survey, eq_survey, is_approved, applno,
	} = data;

	const isCorp = ind_cor === '2';

	return (
		<PreviewContext.Provider value={handlePreview}>
			<DocPreviewModal state={preview} onClose={() => setPreview(PREVIEW_CLOSED)} />

			<div>
				{!isCorp && (
					<IndividualDocSection docs={customer_documents} citizen={citizen} spouseCitizen={spouse_citizen} />
				)}
				{isCorp && lessee_cat === 'CO' && <KoperasiDocSection docs={customer_documents} />}
				{isCorp && lessee_cat !== 'CO' && (
					<GenericCorpDocSection docs={customer_documents} lesseeCat={lessee_cat} />
				)}

				<Section title="Bank Statement">
					<FieldRow label="Bank Statement Files" files={bank_statement} />
				</Section>

				{isCorp && <ManagementDetailSection docs={customer_documents} />}

				{has_guarantor && guarantor_type_pr && (
					<Section title="Guarantor's Individu Document">
						<FieldRow label="KK a/n Suami/Istri Penjamin" files={filesFor(guarantor_documents, 'guarantor-spouse-kk')} />
						<FieldRow label="KTP a/n Penjamin" files={filesFor(guarantor_documents, 'guarantor-ktp')} />
						<FieldRow label="KTP a/n Suami/Istri Penjamin" files={filesFor(guarantor_documents, 'guarantor-spouse-ktp')} />
						<FieldRow label="Kartu Keluarga a/n Penjamin" files={filesFor(guarantor_documents, 'guarantor-kk')} />
						<FieldRow label="NPWP a/n Penjamin" files={filesFor(guarantor_documents, 'guarantor-npwp')} />
						<FieldRow label="Akta Cerai/Mati a/n Penjamin" files={filesFor(guarantor_documents, 'guarantor-marriage-or-death-statement')} />
					</Section>
				)}

				{has_guarantor && guarantor_type_pt && <GuarantorCorpSection docs={guarantor_documents} />}

				{has_guarantor && (
					<Section title="Guarantor's Bank Statement">
						<FieldRow label="Bank Statement Files" files={guarantor_bank_statement} />
					</Section>
				)}

				<Section title="Customer Survey Files">
					<FieldRow label="Home Survey" files={cust_survey['home-survey'] ?? []} />
					<FieldRow label="Office Survey" files={cust_survey['office-survey'] ?? []} />
					<FieldRow label="Other Survey" files={cust_survey['other-survey'] ?? []} />
				</Section>

				<Section title="Vehicle Survey Files">
					<Sub title="Vehicle Photo" />
					<FieldRow label="Front only" files={eq_survey['vehicle-photo-front'] ?? []} />
					<FieldRow label="Vehicle Photo" files={eq_survey['vehicle-photo'] ?? []} />
					<Sub title="Vehicle Data" />
					<FieldRow label="BPKB, Faktur, Sertifikat NIK and/or Form A" files={eq_survey['vehicle-data-bpkb'] ?? []} />
					<FieldRow label="STNK" files={eq_survey['vehicle-data'] ?? []} />
				</Section>

				{is_approved === 'E' && (
					<Section title="Customer Analysis Result">
						<FieldRow
							label="Customer Analysis Result File"
							files={[{ file_name: `${applno}-CUSTOMER_ANALYSIS_RESULT.jpg`, aws_key: '' }]}
						/>
					</Section>
				)}
			</div>
		</PreviewContext.Provider>
	);
}
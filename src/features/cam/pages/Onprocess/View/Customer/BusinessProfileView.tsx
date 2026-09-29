import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import ViewContractInformation from './ViewContractInformation';
import DocPreviewModal, { PREVIEW_CLOSED, type PreviewState } from '@/features/cam/components/DocPreviewModal';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';

interface TableBlock {
	type: 'table';
	title: string | null;
	columns: string[];
	rows: string[][];
}

interface KeyValueBlock {
	type: 'key_value';
	title: string;
	rows: [string, string][];
}

interface TextBlock {
	type: 'text';
	title: string;
	content: string;
}

interface DetailParams {
	management_nm: string;
	share_status: string;
}

interface ManagementDetailRow {
	no: number;
	name: string;
	id_card: string;
	address: string;
	detail_params: DetailParams | null;
}

interface ManagementDetailBlock {
	type: 'management_detail';
	title: string;
	columns: string[];
	rows: ManagementDetailRow[];
}

interface DocumentFile {
	id: number;
	name: string;
	download_url: string | null;
}

interface DocumentsBlock {
	type: 'documents';
	title: string;
	rows: DocumentFile[];
}

type Block = TableBlock | KeyValueBlock | TextBlock | ManagementDetailBlock | DocumentsBlock;

interface BusinessProfile {
	lessee_cat: string;
	lessee_nm: string;
	period: string;
	blocks: Block[];
}

const DocActionButton: React.FC<{ file: DocumentFile; onPreview: (file: DocumentFile) => void }> = ({ file, onPreview }) => {
	const [hovered, setHovered] = useState(false);

	if (!file.download_url) {
		return <span className="text-xs text-[var(--app-muted)]">Unavailable</span>;
	}

	return (
		<button
			type="button"
			onClick={() => onPreview(file)}
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
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
				<circle cx="12" cy="12" r="3" />
			</svg>
			View
		</button>
	);
};

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
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
				<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
				<circle cx="12" cy="12" r="3" />
			</svg>
			Detail
		</button>
	);
};

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-[var(--app-border)] bg-[#2055DE] px-6 py-2.5">
			<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{children}</h2>
		</div>
	);
}

function SubSectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-[var(--app-border)] bg-[#2055DE] px-6 py-2.5">
			<h2 className="text-left text-sm font-bold uppercase tracking-wide text-white">{children}</h2>
		</div>
	);
}

const thCell = "border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]";
const tdCell = "border border-[var(--app-border)] px-4 py-2.5 text-sm text-[var(--app-text)]";
const BOD_BOC_WIDTHS = ['6%', '38%', '35%', '21%'];

function isBodBocBlock(block: TableBlock): boolean {
	return block.columns.length === 4 && (block.columns[2] === 'BOD' || block.columns[2] === 'BOC');
}

function TableBlockView({ block }: { block: TableBlock }) {
	const widths = isBodBocBlock(block) ? BOD_BOC_WIDTHS : undefined;
	return (
		<div className="overflow-x-auto">
			<table
				className="w-full min-w-[600px] overflow-hidden rounded-lg border border-[var(--app-border)] border-collapse text-sm shadow-sm"
				style={widths ? { tableLayout: 'fixed' } : undefined}
			>
				{widths && (
					<colgroup>
						{widths.map((w, i) => (
							<col key={i} style={{ width: w }} />
						))}
					</colgroup>
				)}
				<thead>
					<tr>
						{block.columns.map((col) => (
							<th key={col} className={thCell}>{col}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{block.rows.length === 0 ? (
						<tr><td className={tdCell} colSpan={block.columns.length}>No data.</td></tr>
					) : (
						block.rows.map((row, ri) => (
							<tr key={ri} className={ri % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}>
								{row.map((cell, ci) => (
									<td key={ci} className={tdCell}>{cell}</td>
								))}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

function KeyValueBlockView({ block }: { block: KeyValueBlock }) {
	return (
		<div className="px-6 py-4">
			<table className="w-full max-w-md border-collapse text-sm">
				<tbody>
					{block.rows.map(([label, value]) => (
						<tr key={label} className="border-b border-[var(--app-border)] last:border-0">
							<td className="py-2 pr-4 text-[var(--app-muted)]">{label}</td>
							<td className="py-2 text-right font-medium text-[var(--app-text)]">{value}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function TextBlockView({ block }: { block: TextBlock }) {
	return (
		<div className="px-6 py-4 text-sm text-[var(--app-text)]">{block.content}</div>
	);
}

function ManagementDetailBlockView({
	block,
	onOpenDetail,
}: {
	block: ManagementDetailBlock;
	onOpenDetail: (params: DetailParams) => void;
}) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[700px] overflow-hidden rounded-lg border border-[var(--app-border)] border-collapse text-sm shadow-sm" style={{ tableLayout: 'fixed' }}>
				<colgroup>
					<col style={{ width: '6%' }} />
					<col style={{ width: '22%' }} />
					<col style={{ width: '18%' }} />
					<col style={{ width: '39%' }} />
					<col style={{ width: '15%' }} />
				</colgroup>
				<thead>
					<tr>
						{block.columns.map((col) => (
							<th key={col} className={thCell}>{col}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{block.rows.length === 0 ? (
						<tr><td className={tdCell} colSpan={block.columns.length}>No data.</td></tr>
					) : (
						block.rows.map((row, ri) => (
							<tr key={row.no} className={ri % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}>
								<td className={tdCell}>{row.no}</td>
								<td className={tdCell}>{row.name}</td>
								<td className={tdCell}>{row.id_card}</td>
								<td className={tdCell}>{row.address}</td>
								<td className={tdCell}>
									{row.detail_params ? (
										<DetailActionButton onClick={() => onOpenDetail(row.detail_params!)} />
									) : (
										<span className="text-[var(--app-muted)]">—</span>
									)}
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

function DocumentsBlockView({ block, onPreview }: { block: DocumentsBlock; onPreview: (file: DocumentFile) => void }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[500px] overflow-hidden rounded-lg border border-[var(--app-border)] border-collapse text-sm shadow-sm">
				<thead>
					<tr>
						<th className={thCell} style={{ width: 60 }}>No.</th>
						<th className={thCell}>File Name</th>
						<th className={thCell} style={{ width: 140 }}>Actions</th>
					</tr>
				</thead>
				<tbody>
					{block.rows.length === 0 ? (
						<tr><td className={tdCell} colSpan={3}>No files uploaded.</td></tr>
					) : (
						block.rows.map((f, idx) => (
							<tr key={f.id} className={idx % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}>
								<td className={tdCell}>{idx + 1}</td>
								<td className={tdCell}>{f.name}</td>
								<td className={tdCell}>
									<DocActionButton file={f} onPreview={onPreview} />
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

export default function BusinessProfileView({ ctx }: { ctx: CamCtx }) {
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);
	const [detailParams, setDetailParams] = useState<DetailParams | null>(null);

	const { data, isLoading, isError, error } = useQuery({
		queryKey: ['cam-business-profile', ctx.apless, ctx.applno],
		queryFn: async () => {
			const res = await api.get<BusinessProfile>('/CAM/View/business-profile', {
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
		return <LoadingCard message="Loading business profile…" bordered />;
	}
	if (isError || !data) {
		const message = (error as any)?.response?.data?.error || 'Failed to load business profile.';
		return <ErrorCard message={message} bordered />;
	}

	return (
		<div>
			<DocPreviewModal state={preview} onClose={() => setPreview(PREVIEW_CLOSED)} />
			{detailParams && (
				<ViewContractInformation
					apless={ctx.apless}
					period={data.period}
					managementNm={detailParams.management_nm}
					shareStatus={detailParams.share_status}
					onClose={() => setDetailParams(null)}
				/>
			)}

			<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<SectionHeader>Organization Structure — {data.lessee_nm}</SectionHeader>

				{data.blocks.map((block, i) => (
					<div key={i} className={i > 0 ? 'mt-8' : undefined}>
						{block.title && <SubSectionHeader>{block.title}</SubSectionHeader>}
						{block.type === 'table' && <TableBlockView block={block} />}
						{block.type === 'key_value' && <KeyValueBlockView block={block} />}
						{block.type === 'text' && <TextBlockView block={block} />}
						{block.type === 'management_detail' && (
							<ManagementDetailBlockView block={block} onOpenDetail={setDetailParams} />
						)}
						{block.type === 'documents' && (
							<DocumentsBlockView block={block} onPreview={handlePreview} />
						)}
					</div>
				))}
			</div>
		</div>
	);
}
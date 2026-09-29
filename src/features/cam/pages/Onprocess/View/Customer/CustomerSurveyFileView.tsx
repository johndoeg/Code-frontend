import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import DocPreviewModal, { PREVIEW_CLOSED, type PreviewState } from '@/features/cam/components/DocPreviewModal';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';

interface SurveySummary {
	contract_status: string;
	customer_name: string;
	brand: string;
	model: string;
	type: string;
	chassis: string;
	bpkb_name: string;
	bpkb_age_suffix: string;
	engine: string;
	bpkb_address: string;
	year: string;
	condition: string;
	supplier: string;
	color: string;
	police_no: string;
}

interface SurveyFile {
	id: number;
	name: string;
	download_url: string | null;
}

interface SurveySection {
	files: SurveyFile[];
	notes: string;
}

interface SurveyFileData {
	no_data: boolean;
	summary: SurveySummary;
	sections: {
		home: SurveySection;
		office: SurveySection;
		other: SurveySection;
	};
}

const DocActionButton: React.FC<{ file: SurveyFile; onPreview: (file: SurveyFile) => void }> = ({ file, onPreview }) => {
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

function TitleBar({ children, bleed }: { children: React.ReactNode; bleed?: boolean }) {
	return (
		<div className={`border-b border-[var(--app-border)] bg-[#2055DE] px-5 py-2.5 ${bleed ? '-mx-5 mb-4' : ''}`}>
			<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{children}</h2>
		</div>
	);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="mb-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow">
			<TitleBar>{title}</TitleBar>
			<div className="p-5">{children}</div>
		</div>
	);
}

const thCell = "border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]";
const tdCell = "border border-[var(--app-border)] px-4 py-2.5 text-sm text-[var(--app-text)]";
const summaryLabelCell = `${tdCell} w-[160px] bg-[var(--app-surface)] font-medium text-[var(--app-muted)] sm:w-[180px]`;

function SummaryRow({ pairs }: { pairs: [string, React.ReactNode][] }) {
	return (
		<tr>
			{pairs.map(([label, value], i) => (
				<React.Fragment key={i}>
					<td className={summaryLabelCell}>{label}</td>
					<td className={tdCell}>{value || '-'}</td>
				</React.Fragment>
			))}
		</tr>
	);
}

function SurveyFileTable({ files, onPreview }: { files: SurveyFile[]; onPreview: (file: SurveyFile) => void }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[500px] overflow-hidden rounded-lg border border-[var(--app-border)] border-collapse text-sm shadow-sm">
				<thead>
					<tr>
						<th className={thCell} style={{ width: '10%' }}>No.</th>
						<th className={thCell} style={{ width: '70%' }}>File Name</th>
						<th className={thCell} style={{ width: '20%' }}>Actions</th>
					</tr>
				</thead>
				<tbody>
					{files.length === 0 ? (
						<tr><td className={tdCell} colSpan={3}>No file uploaded</td></tr>
					) : (
						files.map((f, idx) => (
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

function SurveyReportSection({
	title,
	section,
	onPreview,
	summary,
}: {
	title: string;
	section: SurveySection;
	onPreview: (file: SurveyFile) => void;
	summary?: React.ReactNode;
}) {
	return (
		<Card title={title}>
			{summary && <div className="mb-4">{summary}</div>}
			<div className="mb-4">
				<SurveyFileTable files={section.files} onPreview={onPreview} />
			</div>
			<TitleBar bleed>Notes</TitleBar>
			<div className="min-h-[120px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-base text-[var(--app-text)] whitespace-pre-wrap">
				{section.notes || <span className="text-sm text-[var(--app-muted)]">No notes.</span>}
			</div>
		</Card>
	);
}

export default function CustomerSurveyFileView({ ctx }: { ctx: CamCtx }) {
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);
	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-customer-survey-file', ctx.apless, ctx.applno],
		queryFn: async () => {
			const res = await api.get<SurveyFileData>('/CAM/View/customer-survey-file', {
				params: { apless: ctx.apless, applno: ctx.applno },
			});
			return res.data;
		},
	});

	const handlePreview = (file: SurveyFile) => {
		if (!file.download_url) return;
		setPreview({ open: true, name: file.name, url: file.download_url });
	};

	if (isLoading) {
		return <LoadingCard message="Loading survey file…" />;
	}
	if (isError || !data) {
		return <ErrorCard message="Failed to load survey file." />;
	}
	if (data.no_data) {
		return <NoDataCard />;
	}

	const s = data.summary;

	const summaryInfo = (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[500px] border-collapse text-sm">
				<tbody>
					<SummaryRow pairs={[
						["Contract Status", s.contract_status],
						["Brand / Model / Type", `${s.brand}/${s.model}/${s.type}`],
					]} />
					<SummaryRow pairs={[
						["Customer Name", s.customer_name],
						["Chassis", s.chassis],
					]} />
					<SummaryRow pairs={[
						["BPKB Name", `${s.bpkb_name}${s.bpkb_age_suffix}`],
						["Engine", s.engine],
					]} />
					<SummaryRow pairs={[
						["BPKB Address", s.bpkb_address],
						["Year / Condition", `${s.year}/${s.condition}`],
					]} />
					<SummaryRow pairs={[
						["Supplier", s.supplier],
						["Color / Police No.", `${s.color}/${s.police_no}`],
					]} />
				</tbody>
			</table>
		</div>
	);

	return (
		<div>
			<DocPreviewModal state={preview} onClose={() => setPreview(PREVIEW_CLOSED)} />

			<SurveyReportSection title="Home Survey Report Form" section={data.sections.home} onPreview={handlePreview} summary={summaryInfo} />
			<SurveyReportSection title="Office Survey Report Form" section={data.sections.office} onPreview={handlePreview} />
			<SurveyReportSection title="Other Survey Report Form" section={data.sections.other} onPreview={handlePreview} />
		</div>
	);
}
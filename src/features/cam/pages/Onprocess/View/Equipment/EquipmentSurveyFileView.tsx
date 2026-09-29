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

interface EquipmentSurveyFileData {
    no_data: boolean;
    summary: SurveySummary;
    notes: string;
    files: {
        vehicle_photo_front: SurveyFile[];
        vehicle_photo: SurveyFile[];
        vehicle_data_bpkb: SurveyFile[];
        vehicle_data: SurveyFile[];
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow">
            <div className="border-b border-[var(--app-border)] bg-[#2055DE] px-5 py-2.5">
                <h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

const cellLabel =
    "border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 align-top text-sm text-[var(--app-muted)] whitespace-nowrap";
const cellValue =
    "border border-[var(--app-border)] px-3 py-2 align-top text-sm text-[var(--app-text)]";

function Row({ left, right }: { left: [string, React.ReactNode]; right: [string, React.ReactNode] }) {
    return (
        <tr>
            <td className={cellLabel}>{left[0]}</td>
            <td className={cellValue}>{left[1] || '-'}</td>
            <td className={cellLabel}>{right[0]}</td>
            <td className={cellValue}>{right[1] || '-'}</td>
        </tr>
    );
}

const thCell = "border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]";
const tdCell = "border border-[var(--app-border)] px-4 py-2.5 text-sm text-[var(--app-text)]";

function SurveyFileTable({ files, onPreview }: { files: SurveyFile[]; onPreview: (file: SurveyFile) => void }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] overflow-hidden rounded-lg border border-[var(--app-border)] border-collapse text-sm shadow-sm">
                <thead>
                    <tr>
                        <th className={thCell} style={{ width: 60 }}>No.</th>
                        <th className={thCell}>File Name</th>
                        <th className={thCell} style={{ width: 120 }}>Actions</th>
                    </tr>
                </thead>
                {files.length > 0 && (
                    <tbody>
                        {files.map((f, idx) => (
                            <tr key={f.id} className={idx % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}>
                                <td className={tdCell}>{idx + 1}</td>
                                <td className={tdCell}>{f.name}</td>
                                <td className={tdCell}>
                                    <DocActionButton file={f} onPreview={onPreview} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                )}
            </table>
        </div>
    );
}

function PhotoBox({ title, files, onPreview }: { title: string; files: SurveyFile[]; onPreview: (file: SurveyFile) => void }) {
    return (
        <div className="rounded-xl border border-[var(--app-border)] p-4">
            <h3 className="mb-2 text-sm font-semibold text-[var(--app-muted)]">{title}</h3>
            <SurveyFileTable files={files} onPreview={onPreview} />
        </div>
    );
}

export default function EquipmentSurveyFileView({ ctx }: { ctx: CamCtx }) {
    const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['cam-equipment-survey-file', ctx.apless, ctx.applno],
        queryFn: async () => {
            const res = await api.get<EquipmentSurveyFileData>('/CAM/View/equipment-survey-file', {
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

    return (
        <div>
            <DocPreviewModal state={preview} onClose={() => setPreview(PREVIEW_CLOSED)} />

            <Card title="Vehicle Survey Report Form">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-sm">
                        <colgroup>
                            <col className="w-[15%]" />
                            <col className="w-[35%]" />
                            <col className="w-[15%]" />
                            <col className="w-[35%]" />
                        </colgroup>
                        <tbody>
                            <Row left={['Contract Status', s.contract_status]} right={['Brand/Model/Type', `${s.brand}/${s.model}/${s.type}`]} />
                            <Row left={['Customer Name', s.customer_name]} right={['Chassis', s.chassis]} />
                            <Row left={['BPKB Name', `${s.bpkb_name}${s.bpkb_age_suffix}`]} right={['Engine', s.engine]} />
                            <Row left={['BPKB Address', s.bpkb_address]} right={['Year/Condition', `${s.year}/${s.condition}`]} />
                            <Row left={['Supplier', s.supplier]} right={['Color/Police No.', `${s.color}/${s.police_no}`]} />
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Vehicle Photo">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PhotoBox title="Front only" files={data.files.vehicle_photo_front} onPreview={handlePreview} />
                    <PhotoBox title="Vehicle Photo" files={data.files.vehicle_photo} onPreview={handlePreview} />
                </div>
            </Card>

            <Card title="Vehicle Data">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PhotoBox
                        title="BPKB, Faktur, Sertifikat NIK (if any) and/or Form A (if any)"
                        files={data.files.vehicle_data_bpkb}
                        onPreview={handlePreview}
                    />
                    <PhotoBox title="STNK" files={data.files.vehicle_data} onPreview={handlePreview} />
                </div>
            </Card>

            <Card title="Notes">
                <div className="min-h-[120px] rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-base text-[var(--app-text)] whitespace-pre-wrap">
                    {data.notes || <span className="text-sm text-[var(--app-muted)]">No notes.</span>}
                </div>
            </Card>
        </div>
    );
}
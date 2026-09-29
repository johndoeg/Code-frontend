import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';

interface PartyDetail {
    name: string;
    type: string;
    occupation_business_type: string;
    apu_ppt_status: string;
    identification_verification: string;
}

interface EddQuestion {
    no: string;
    question: string;
    answer: string;
}

interface ApuPptData {
    no_data: boolean;
    customer: PartyDetail;
    show_edd_customer: boolean;
    edd_customer_questions: EddQuestion[];
    show_beneficial_owner: boolean;
    beneficial_owner: PartyDetail | null;
    show_edd_bo: boolean;
    edd_bo_questions: EddQuestion[];
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
            <div className="border-b border-[var(--app-border)] bg-[#2055DE] px-5 py-2.5">
                <h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function StatusBadge({ value }: { value: string }) {
    const v = (value || '').trim().toLowerCase();
    const isPositive = ['yes', 'ya', 'y', 'approved', 'clear', 'low', 'pass'].includes(v);
    const isNegative = ['no', 'tidak', 'n', 'rejected', 'high', 'fail'].includes(v);
    const tone = isPositive
        ? 'bg-green-50 text-green-700 border-green-300'
        : isNegative
            ? 'bg-red-50 text-red-700 border-red-300'
            : 'bg-[var(--app-surface-alt)] text-[var(--app-text)] border-[var(--app-border)]';
    return (
        <span className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${tone}`}>
            {value || '-'}
        </span>
    );
}

const cellLabel =
    "border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 align-top text-sm text-[var(--app-muted)] whitespace-nowrap";
const cellValue =
    "border border-[var(--app-border)] px-3 py-2 align-top text-sm text-[var(--app-text)]";
const thCell =
    "border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]";
const tdCell =
    "border border-[var(--app-border)] px-4 py-2.5 text-sm text-[var(--app-text)] align-top";

function PartyFields({ p }: { p: PartyDetail }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <colgroup>
                    <col className="w-[32%]" />
                    <col className="w-[68%]" />
                </colgroup>
                <tbody>
                    <tr>
                        <td className={cellLabel}>Customer Name</td>
                        <td className={cellValue}>{p.name || '-'}</td>
                    </tr>
                    <tr>
                        <td className={cellLabel}>Customer Type</td>
                        <td className={cellValue}>{p.type || '-'}</td>
                    </tr>
                    <tr>
                        <td className={cellLabel}>Occupation / Business Type</td>
                        <td className={cellValue}>{p.occupation_business_type || '-'}</td>
                    </tr>
                    <tr>
                        <td className={cellLabel}>APU PPT Status</td>
                        <td className={cellValue}><StatusBadge value={p.apu_ppt_status} /></td>
                    </tr>
                    <tr>
                        <td className={cellLabel}>Identification and Verification Process</td>
                        <td className={cellValue}>{p.identification_verification || '-'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function EddQuestionnaire({ title, questions }: { title: string; questions: EddQuestion[] }) {
    return (
        <Card title={title}>
            <div className="overflow-x-auto">
                <table className="w-full overflow-hidden rounded-lg border border-[var(--app-border)] border-collapse text-sm shadow-sm">
                    <colgroup>
                        <col className="w-14" />
                        <col />
                        <col className="w-32" />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className={`${thCell} text-center`}>No.</th>
                            <th className={thCell}>Question</th>
                            <th className={`${thCell} text-center`}>Answer</th>
                        </tr>
                    </thead>
                    {questions.length > 0 && (
                        <tbody>
                            {questions.map((q, i) => (
                                <tr key={q.no} className={i % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}>
                                    <td className={`${tdCell} text-center text-[var(--app-muted)]`}>{q.no}</td>
                                    <td className={tdCell}>{q.question}</td>
                                    <td className={`${tdCell} text-center`}>
                                        <StatusBadge value={q.answer} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    )}
                </table>
            </div>
        </Card>
    );
}

export default function ApuPptView({ ctx }: { ctx: CamCtx }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['cam-apu-ppt', ctx.applno],
        queryFn: async () => {
            const res = await api.get<ApuPptData>('/CAM/View/apu-ppt', { params: { applno: ctx.applno } });
            return res.data;
        },
    });

    if (isLoading) {
        return <LoadingCard message="Loading APU PPT…" />;
    }

    if (isError || !data) {
        return <ErrorCard message="Failed to load APU PPT data." />;
    }

    if (data.no_data) {
        return <NoDataCard />;
    }

    return (
        <div>
            <Card title="Customer">
                <PartyFields p={data.customer} />
            </Card>

            {data.show_edd_customer && (
                <EddQuestionnaire title="Enhanced Due Diligence (EDD) Customer Questionnaire" questions={data.edd_customer_questions} />
            )}

            {data.show_beneficial_owner && data.beneficial_owner && (
                <Card title="Beneficial Owner">
                    <PartyFields p={data.beneficial_owner} />
                </Card>
            )}

            {data.show_edd_bo && (
                <EddQuestionnaire title="Enhanced Due Diligence (EDD) Beneficial Owner Questionnaire" questions={data.edd_bo_questions} />
            )}
        </div>
    );
}
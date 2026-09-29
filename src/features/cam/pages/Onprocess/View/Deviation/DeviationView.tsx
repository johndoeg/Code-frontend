import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';

interface DeviationRow {
    no: number;
    standard_desc: string;
    deviation_desc: string;
    reason: string;
    is_other: boolean;
}

interface DeviationData {
    no_data: boolean;
    rows: DeviationRow[];
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4 overflow-hidden rounded-2xl bg-[var(--app-card)] shadow">
            <div className="border-b border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-3">
                <h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function NumberedList({ rows, field }: { rows: DeviationRow[]; field: 'standard_desc' | 'deviation_desc' | 'reason' }) {
    return (
        <ol className="space-y-1.5">
            {rows.map((r) => (
                <li key={r.no} className="flex gap-2 text-sm text-[var(--app-text)]">
                    <span className="w-6 shrink-0 text-[var(--app-muted)]">{r.no}.</span>
                    <span className={r.is_other ? 'italic' : ''}>{r[field] || '-'}</span>
                </li>
            ))}
        </ol>
    );
}

export default function DeviationView({ ctx }: { ctx: CamCtx }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['cam-deviation', ctx.applno],
        queryFn: async () => {
            const res = await api.get<DeviationData>('/CAM/View/deviation', {
                params: { applno: ctx.applno },
            });
            return res.data;
        },
    });

    if (isLoading) {
        return <LoadingCard message="Loading deviation data…" />;
    }

    if (isError || !data) {
        return <ErrorCard message="Failed to load deviation data." />;
    }
    
    if (data.no_data) {
        return <NoDataCard />;
    }

    return (
        <Card title="Deviation Form">
            <div className="space-y-6">
                <div>
                    <h3 className="mb-2 text-sm font-semibold text-[var(--app-muted)]">Standard Condition</h3>
                    <NumberedList rows={data.rows} field="standard_desc" />
                </div>
                <div>
                    <h3 className="mb-2 text-sm font-semibold text-[var(--app-muted)]">Deviation</h3>
                    <NumberedList rows={data.rows} field="deviation_desc" />
                </div>
                <div>
                    <h3 className="mb-2 text-sm font-semibold text-[var(--app-muted)]">Reason</h3>
                    <NumberedList rows={data.rows} field="reason" />
                </div>
            </div>
        </Card>
    );
}
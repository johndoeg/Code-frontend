import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';

interface CreditRecommendationData {
    has_data: boolean;
    strength?: string;
    weakness?: string;
    tbo?: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow">
            <div className="border-b border-[var(--app-border)] bg-slate-800 px-5 py-2.5">
                <h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function RichText({ html }: { html: string }) {
    if (!html) return <p className="text-sm italic text-[var(--app-muted)]">—</p>;
    return (
        <div
            className="prose prose-sm max-w-none text-[var(--app-text)]"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}

export default function CreditRecommendationView({ ctx }: { ctx: CamCtx }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['cam-credit-recommendation', ctx.applno],
        queryFn: async () => {
            const res = await api.get<CreditRecommendationData>('/CAM/View/credit-recommendation', {
                params: { applno: ctx.applno },
            });
            return res.data;
        },
    });

    if (isLoading) {
        return <LoadingCard message="Loading credit recommendation…" />;
    }
    if (isError) {
        return <ErrorCard message="Failed to load credit recommendation." />;
    }

    if (!data || !data.has_data) {
        return <NoDataCard />;
    }

    return (
        <div>
            <Section title="Strength">
                <RichText html={data.strength || ''} />
            </Section>
            <Section title="Weakness">
                <RichText html={data.weakness || ''} />
            </Section>
            <Section title="TBO / TC">
                <RichText html={data.tbo || ''} />
            </Section>
        </div>
    );
}

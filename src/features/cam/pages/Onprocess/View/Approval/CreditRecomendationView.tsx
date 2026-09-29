import React, { useEffect, useState } from 'react';
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
    const [data, setData] = useState<CreditRecommendationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);
        api
            .get('/CAM/View/credit-recommendation', { params: { applno: ctx.applno } })
            .then((res) => {
                if (active) setData(res.data);
            })
            .catch(() => {
                if (active) setError('Failed to load credit recommendation.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [ctx.applno]);

    if (loading) {
        return <LoadingCard message="Loading credit recommendation…" />;
    }
    if (error) {
        return <ErrorCard message={error} />;
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
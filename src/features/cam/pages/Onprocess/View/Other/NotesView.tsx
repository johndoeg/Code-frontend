import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import LoadingCard from '@/features/cam/components/LoadingCard';
import ErrorCard from '@/features/cam/components/ErrorCard';
import NoDataCard from '@/features/cam/components/NoDataCard';

interface NotesData {
    no_data: boolean;
    notes: string;
}

function NotesCard({ title, endpoint, ctx }: { title: string; endpoint: string; ctx: CamCtx }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['cam-notes', endpoint, ctx.applno],
        queryFn: async () => {
            const res = await api.get<NotesData>(endpoint, { params: { applno: ctx.applno } });
            return res.data;
        },
    });

    if (isLoading) {
        return <LoadingCard message="Loading notes…" />;
    }

    if (isError || !data) {
        return <ErrorCard message="Failed to load notes." />;
    }
    
    if (data.no_data) {
        return <NoDataCard />;
    }

    return (
        <div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow">
            <div className="border-b border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-3">
                <h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2>
            </div>
            <div className="prose prose-sm max-w-none p-5 text-[var(--app-text)]" dangerouslySetInnerHTML={{ __html: data.notes }} />
        </div>
    );
}

export function CamNotesView({ ctx }: { ctx: CamCtx }) {
    return <NotesCard title="CAM Notes" endpoint="/CAM/View/cam-notes" ctx={ctx} />;
}

export function OtherNotesView({ ctx }: { ctx: CamCtx }) {
    return <NotesCard title="Customer Notes" endpoint="/CAM/View/other-notes" ctx={ctx} />;
}
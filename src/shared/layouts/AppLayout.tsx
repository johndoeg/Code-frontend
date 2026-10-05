import { Suspense, useState } from "react";
import { Outlet } from "react-router-dom";
import { useSessionTimeout } from '@/shared/hooks/useSessionTimeout';
import Sidebar from '@/shared/components/Sidebar';
import TopHeader from '@/shared/components/TopHeader';
import PageLoader from '@/shared/components/PageLoader';
import { useOverlay } from '@/shared/contexts/OverlayContext';
import PrecheckingIndividuPage from '@/features/cam/pages/Prechecking/Create/Individu/PrecheckingIndividuPage';

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarMini, setSidebarMini] = useState(false);
    const remainingMs = useSessionTimeout();
    const { precheckState, hidePrechecking } = useOverlay();

    return (
        <div className="flex h-screen bg-[var(--app-surface)] dark:bg-gray-900">
            <Sidebar open={sidebarOpen} mini={sidebarMini} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 flex flex-col overflow-y-auto">
                <TopHeader remainingMs={remainingMs} />
                <Suspense fallback={<PageLoader />}>
                    {precheckState ? (
                        <PrecheckingIndividuPage
                            incomingState={precheckState}
                            onBack={hidePrechecking}
                        />
                    ) : (
                        <Outlet />
                    )}
                </Suspense>
            </div>
        </div>
    );
}
import { lazy, Suspense, useLayoutEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { PROTECTED_ROUTE_ELEMENTS } from '@/routes/protectedRoutes';
import AppLayout from '@/shared/layouts/AppLayout';
import PageLoader from '@/shared/components/PageLoader';
import Dashboard from '@/features/main/pages/Dashboard';
import LoginPage from '@/features/main/pages/LoginPage';
import NotFound from '@/features/main/pages/NotFound';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import PublicRoute from '@/shared/components/PublicRoute';
import MaintenancePage from '@/shared/components/MaintenancePage';

const CAMFormModal = lazy(() => import("@/features/cam/pages/CAMForm/CAMFormModal"));
const CAMEditTabs = lazy(() => import("@/features/cam/pages/Onprocess/CreateEdit/MainEdit/CAMEditTabs"));

const MAINTENANCE_INFO = {
    error: "maintenance",
    message: "We're currently performing scheduled maintenance.",
    retry_after: 600,
    app_name: "GenieFinance",
} as const;

const KEEP_URL_FOR = new Set(["/login", "/maintenance"]);

export default function AppRoutes() {
    const location = useLocation();
    const background = location.state && location.state.background;

    useLayoutEffect(() => {
        const target = KEEP_URL_FOR.has(location.pathname) ? location.pathname : "/";
        if (window.location.pathname === target) return;
        window.history.replaceState(window.history.state, "", target);
    }, [location.pathname, location.search, location.hash, location.key]);

    return (
        <>
            <Routes location={background || location}>
                <Route path="/maintenance" element={<MaintenancePage info={MAINTENANCE_INFO} />} />
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route path="/" element={<Dashboard />} />
                    {PROTECTED_ROUTE_ELEMENTS}
                    <Route path="*" element={<NotFound />} />
                </Route>
            </Routes>

            {background && (
                <Routes>
                    <Route path="/CAMForm" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><CAMFormModal /></Suspense></ProtectedRoute>} />
                    <Route path="/cam-create" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><CAMEditTabs /></Suspense></ProtectedRoute>} />
                </Routes>
            )}
        </>
    );
}
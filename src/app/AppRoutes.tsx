import { lazy, Suspense, useLayoutEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { PROTECTED_ROUTE_ELEMENTS } from '@/routes/protectedRoutes';
import AppLayout from '@/shared/layouts/AppLayout';
import CAMLayout from '@/shared/layouts/CAMLayout';
import PageLoader from '@/shared/components/PageLoader';
import Dashboard from '@/features/main/pages/Dashboard';
import LoginPage from '@/features/main/pages/LoginPage';
import NotFound from '@/features/main/pages/NotFound';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import PublicRoute from '@/shared/components/PublicRoute';
import MaintenancePage from '@/shared/components/MaintenancePage';

const CAMFormModal = lazy(() => import("@/features/cam/pages/CAMForm/CAMFormModal"));
const CAMEditTabs = lazy(() => import("@/features/cam/pages/Onprocess/CreateEdit/MainEdit/CAMEditTabs"));
const CustomerDetailPage = lazy(() => import("@/features/cam/pages/Onprocess/CreateEdit/Customer/CAMCustomerDetailPage"));

const MAINTENANCE_INFO = {
    error: "maintenance",
    message: "We're currently performing scheduled maintenance.",
    retry_after: 600,
    app_name: "GenieFinance",
};

const KEEP_URL_FOR = new Set(["/login", "/maintenance"]);

export default function AppRoutes() {
    const location = useLocation();
    const background = location.state && location.state.background;

    useLayoutEffect(() => {
        const path = window.location.pathname;
        if (path === "/" || KEEP_URL_FOR.has(path)) return;
        window.history.replaceState(window.history.state, "", "/");
    }, [location.pathname, location.search, location.hash, location.key]);

    return (
        <>
            <Routes location={background || location}>
                <Route path="/maintenance" element={<MaintenancePage info={MAINTENANCE_INFO} />} />
                <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                    <Route path="/" element={<Dashboard />} />
                    {PROTECTED_ROUTE_ELEMENTS}
                    <Route path="/cam" element={<CAMLayout />}>
                        <Route index element={<Navigate to="customer/detail" replace />} />
                        <Route
                            path="customer/detail"
                            element={<Suspense fallback={<PageLoader />}><CustomerDetailPage /></Suspense>}
                        />
                        <Route path="*" element={<Navigate to="customer/detail" replace />} />
                    </Route>
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
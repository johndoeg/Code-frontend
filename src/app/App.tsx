import "react-datepicker/dist/react-datepicker.css";
import { lazy, Suspense } from "react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from '@/shared/contexts/AuthContext';
import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { OverlayProvider, useOverlay } from '@/shared/contexts/OverlayContext';
import MaintenanceGate from '@/shared/components/MaintenanceGate';
import AppRoutes from "./AppRoutes";

const AddCAMModal = lazy(() => import("@/features/cam/pages/AddCAM/AddCAMModal"));
const AddCAMGuarantorModal = lazy(() => import("@/features/cam/pages/AddCAM/AddCAMGuarantorModal"));

function GlobalOverlays() {
    const { addCamOpen, addCamGuarantorOpen } = useOverlay();

    return (
        <>
            {addCamOpen && (
                <Suspense fallback={null}>
                    <AddCAMModal />
                </Suspense>
            )}
            {addCamGuarantorOpen && (
                <Suspense fallback={null}>
                    <AddCAMGuarantorModal />
                </Suspense>
            )}
        </>
    );
}

export default function App() {
    return (
        <MaintenanceGate>
            <ThemeProvider>
                <AuthProvider>
                    <MemoryRouter>
                        <OverlayProvider>
                            <AppRoutes />
                            <GlobalOverlays />
                        </OverlayProvider>
                    </MemoryRouter>
                </AuthProvider>
            </ThemeProvider>
        </MaintenanceGate>
    );
}
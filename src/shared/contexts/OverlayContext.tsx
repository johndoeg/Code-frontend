import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';
import type { IncomingPrecheckState } from '@/features/cam/pages/Prechecking/Create/Individu/PrecheckingIndividuPage';

interface OverlayContextValue {
	precheckState: IncomingPrecheckState | null;
	showPrechecking: (state: IncomingPrecheckState) => void;
	hidePrechecking: () => void;
	addCamOpen: boolean;
	openAddCam: () => void;
	closeAddCam: () => void;
	addCamGuarantorOpen: boolean;
	openAddCamGuarantor: () => void;
	closeAddCamGuarantor: () => void;
}

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
	const [precheckState, setPrecheckState] = useState<IncomingPrecheckState | null>(null);
	const [addCamOpen, setAddCamOpen] = useState(false);
	const [addCamGuarantorOpen, setAddCamGuarantorOpen] = useState(false);

	const openAddCam = useCallback(() => setAddCamOpen(true), []);
	const closeAddCam = useCallback(() => setAddCamOpen(false), []);
	const openAddCamGuarantor = useCallback(() => setAddCamGuarantorOpen(true), []);
	const closeAddCamGuarantor = useCallback(() => setAddCamGuarantorOpen(false), []);
	const hidePrechecking = useCallback(() => setPrecheckState(null), []);

	const value = useMemo<OverlayContextValue>(() => ({
		precheckState,
		showPrechecking: setPrecheckState,
		hidePrechecking,
		addCamOpen,
		openAddCam,
		closeAddCam,
		addCamGuarantorOpen,
		openAddCamGuarantor,
		closeAddCamGuarantor,
	}), [
		precheckState, hidePrechecking,
		addCamOpen, openAddCam, closeAddCam,
		addCamGuarantorOpen, openAddCamGuarantor, closeAddCamGuarantor,
	]);

	return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlay(): OverlayContextValue {
	const ctx = useContext(OverlayContext);
	if (!ctx) throw new Error('useOverlay must be used within an <OverlayProvider>');
	return ctx;
}
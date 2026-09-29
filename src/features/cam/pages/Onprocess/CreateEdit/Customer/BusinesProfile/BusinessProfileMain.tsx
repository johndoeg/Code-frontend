import { forwardRef, useImperativeHandle, useRef } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import BusinessProfilePTPage from "./BusinessProfilePTPage";
import BusinessProfileCVPage from "./BusinessProfileCVPage";
import BusinessProfileKoperasiPage from "./BusinessProfileKoperasiPage";
import BusinessProfileYayasanPage from "./BusinessProfileYayasanPage";

export interface CamTabHandle {
    save: () => void;
}

export interface BusinessProfileMainPageProps {
    apless: string;
    applNo: string;
    onSaved: (result: { apless: string; applno: string }) => void;
}

interface LesseeCategoryResult {
    lesseeCat: string;
    finType: string;
    custName: string;
}

const LESSEE_CAT_LABELS: Record<string, string> = {
    PT: "PT",
    CV: "CV",
    CO: "Koperasi",
    FD: "Yayasan",
};

const BusinessProfileMainPage = forwardRef<CamTabHandle, BusinessProfileMainPageProps>(function BusinessProfileMainPage(
    { apless, applNo, onSaved }, ref
) {
    const innerRef = useRef<CamTabHandle>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['cam-business-profile-lessee-category', apless, applNo],
        queryFn: async (): Promise<LesseeCategoryResult> => {
            const res = await api.get("/CAM/EditIndex/lessee-category", { params: { apless, appl_no: applNo } });
            return {
                lesseeCat: res.data?.lesseeCat || "",
                finType: res.data?.finType || "",
                custName: res.data?.custName || "",
            };
        },
    });

    const lesseeCat = data?.lesseeCat || "";
    const finType = data?.finType || "";
    const custName = data?.custName || "";

    useImperativeHandle(ref, () => ({
        save: () => innerRef.current?.save(),
    }), []);

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
        );
    }

    if (lesseeCat === "PT") {
        return <BusinessProfilePTPage ref={innerRef} apless={apless} applNo={applNo} finType={finType} custName={custName} onSaved={onSaved} />;
    }
    if (lesseeCat === "CV") {
        return <BusinessProfileCVPage ref={innerRef} apless={apless} applNo={applNo} finType={finType} custName={custName} onSaved={onSaved} />;
    }
    if (lesseeCat === "CO") {
        return <BusinessProfileKoperasiPage ref={innerRef} apless={apless} applNo={applNo} finType={finType} custName={custName} onSaved={onSaved} />;
    }
    if (lesseeCat === "FD") {
        return <BusinessProfileYayasanPage ref={innerRef} apless={apless} applNo={applNo} finType={finType} custName={custName} onSaved={onSaved} />;
    }

    const label = LESSEE_CAT_LABELS[lesseeCat] || "This business type";
    return (
        <div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
            <p className="text-base font-medium text-[var(--app-text)]">Business Profile for {label} isn&apos;t recognized</p>
            <p className="mt-1 text-sm text-[var(--app-muted)]">This customer's Lessee_Cat value didn't match any known business type (PT, FD, CV, CO).</p>
        </div>
    );
});

export default BusinessProfileMainPage;
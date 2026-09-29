import { forwardRef, useImperativeHandle, useRef } from "react";
import { useQuery } from '@tanstack/react-query';
import CustIndividualDocumentPage from "./CustIndividualDocumentPage";
import CorpPTDocumentPage from "./CorpPTDocumentPage";
import CorpYayasanDocumentPage from "./CorpYayasanDocumentPage";
import CorpCVDocumentPage from "./CorpCVDocumentPage";
import CorpKoperasiDocumentPage from "./CorpKoperasiDocumentPage";
import api from '@/shared/api/axiosInstance';

export interface CamTabHandle {
	save: () => void;
}

export interface CAMCustomerDocumentPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	indCor: string;
	lesseeCat?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

const CAMCustomerDocumentPage = forwardRef<CamTabHandle, CAMCustomerDocumentPageProps>(function CAMCustomerDocumentPage(
	{ apless, applNo, finType, custName, indCor, lesseeCat: lesseeCatProp, onSaved },
	ref
) {
	const { data: fetchedLesseeCat, isLoading: loadingLesseeCat } = useQuery({
		queryKey: ['cam-customer-document-lessee-category', apless],
		queryFn: async (): Promise<string | undefined> => {
			const res = await api.get("/CAM/EditIndex/customer-document/lessee-category", { params: { apless } });
			return res.data?.data?.lessee_cat ?? undefined;
		},
		enabled: indCor !== "1" && !lesseeCatProp && !!apless,
	});

	const lesseeCat = lesseeCatProp ?? fetchedLesseeCat;

	const childRef = useRef<CamTabHandle>(null);
	useImperativeHandle(ref, () => ({ save: () => childRef.current?.save() }), []);

	if (indCor === "1") {
		return (
			<CustIndividualDocumentPage
				ref={childRef}
				apless={apless}
				applNo={applNo}
				finType={finType}
				custName={custName}
				onSaved={onSaved}
			/>
		);
	}

	if (lesseeCat === "PT") {
	    return (
	        <CorpPTDocumentPage
	            ref={childRef}
	            apless={apless}
	            applNo={applNo}
	            finType={finType}
	            custName={custName}
	            onSaved={onSaved}
	        />
	    );
	}

	if (lesseeCat === "FD") {
		return (
			<CorpYayasanDocumentPage
				ref={childRef}
				apless={apless}
				applNo={applNo}
				finType={finType}
				custName={custName}
				onSaved={onSaved}
			/>
		);
	}

	if (lesseeCat === "CV") {
	    return (
	        <CorpCVDocumentPage
	            ref={childRef}
	            apless={apless}
	            applNo={applNo}
	            finType={finType}
	            custName={custName}
	            onSaved={onSaved}
	        />
	    );
	}

	if (lesseeCat === "CO") {
	    return (
	        <CorpKoperasiDocumentPage
	            ref={childRef}
	            apless={apless}
	            applNo={applNo}
	            finType={finType}
	            custName={custName}
	            onSaved={onSaved}
	        />
	    );
	}

	return (
		<div>
			<h2 className="text-xl font-bold text-[var(--app-text)] mb-1">Customer's Document</h2>
			<div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-8 text-center shadow-sm">
				<p className="text-base font-medium text-[var(--app-text)]">
					{loadingLesseeCat
						? "Loading customer type…"
						: lesseeCat
							? `Unrecognized lessee category "${lesseeCat}"`
							: "Customer type not set yet"}
				</p>
				{!loadingLesseeCat && (
					<p className="mt-1 text-sm text-[var(--app-muted)]">
						Expected one of PT, FD (Yayasan), CV, or CO (Koperasi) from CAFLESS.
					</p>
				)}
			</div>
		</div>
	);
});

export default CAMCustomerDocumentPage;
import { forwardRef } from "react";
import { CV_DOCUMENT_SECTIONS, CV_TRAILING_FIELDS, CV_DYNAMIC_SECTION_TITLE } from "./CorpCVDocumentFields";
import { CorpDocumentTable } from "./CorpDocumentTable";

export interface CamTabHandle {
	save: () => void;
}

export interface CorpCVDocumentPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	mode?: "edit" | "view";
	onSaved: (result: { apless: string; applno: string }) => void;
}

const CorpCVDocumentPage = forwardRef<CamTabHandle, CorpCVDocumentPageProps>(
	function CorpYayasanDocumentPage(props, ref) {
		return (
			<CorpDocumentTable
				ref={ref}
				organizationType="CV"
				customerTypeLabel="CV"
				sections={CV_DOCUMENT_SECTIONS}
				trailingFields={CV_TRAILING_FIELDS}
				dynamicSectionTitle={CV_DYNAMIC_SECTION_TITLE}
				{...props}
			/>
		);
	}
);

export default CorpCVDocumentPage;
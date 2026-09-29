import { forwardRef } from "react";
import { PT_DOCUMENT_SECTIONS, PT_TRAILING_FIELDS, PT_DYNAMIC_SECTION_TITLE } from "./CorpPTDocumentFields";
import { CorpDocumentTable } from "./CorpDocumentTable";

export interface CamTabHandle {
	save: () => void;
}

export interface CorpPTDocumentPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	mode?: "edit" | "view";
	onSaved: (result: { apless: string; applno: string }) => void;
}

const CorpPTDocumentPage = forwardRef<CamTabHandle, CorpPTDocumentPageProps>(
	function CorpPTDocumentPage(props, ref) {
		return (
			<CorpDocumentTable
				ref={ref}
				organizationType="PT"
				customerTypeLabel="PT"
				sections={PT_DOCUMENT_SECTIONS}
				trailingFields={PT_TRAILING_FIELDS}
				dynamicSectionTitle={PT_DYNAMIC_SECTION_TITLE}
				{...props}
			/>
		);
	}
);

export default CorpPTDocumentPage;
import { forwardRef } from "react";
import {
    YAYASAN_DOCUMENT_SECTIONS,
    YAYASAN_TRAILING_FIELDS,
    YAYASAN_DYNAMIC_SECTION_TITLE,
} from "./CorpYayasanDocumentFields";
import { CorpDocumentTable } from "./CorpDocumentTable";

export interface CamTabHandle {
    save: () => void;
}

export interface CorpYayasanDocumentPageProps {
    apless: string;
    applNo: string;
    finType: string;
    custName?: string;
    mode?: "edit" | "view";
    onSaved: (result: { apless: string; applno: string }) => void;
}

const CorpYayasanDocumentPage = forwardRef<CamTabHandle, CorpYayasanDocumentPageProps>(
    function CorpYayasanDocumentPage(props, ref) {
        return (
            <CorpDocumentTable
                ref={ref}
                organizationType="YAYASAN"
                customerTypeLabel="YAYASAN"
                sections={YAYASAN_DOCUMENT_SECTIONS}
                trailingFields={YAYASAN_TRAILING_FIELDS}
                dynamicSectionTitle={YAYASAN_DYNAMIC_SECTION_TITLE}
                {...props}
            />
        );
    }
);

export default CorpYayasanDocumentPage;
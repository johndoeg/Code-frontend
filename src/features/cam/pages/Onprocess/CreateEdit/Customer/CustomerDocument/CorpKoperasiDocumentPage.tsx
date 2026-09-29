import { forwardRef } from "react";
import {
    KOPERASI_DOCUMENT_SECTIONS,
    KOPERASI_TRAILING_FIELDS,
    KOPERASI_DYNAMIC_SECTION_TITLE,
} from "./CorpKoperasiDocumentFields";
import { CorpDocumentTable } from "./CorpDocumentTable";

export interface CamTabHandle {
    save: () => void;
}

export interface CorpKoperasiDocumentPageProps {
    apless: string;
    applNo: string;
    finType: string;
    custName?: string;
    mode?: "edit" | "view";
    onSaved: (result: { apless: string; applno: string }) => void;
}

const CorpKoperasiDocumentPage = forwardRef<CamTabHandle, CorpKoperasiDocumentPageProps>(
    function CorpYayasanDocumentPage(props, ref) {
        return (
            <CorpDocumentTable
                ref={ref}
                organizationType="KOPERASI"
                customerTypeLabel="KOPERASI"
                sections={KOPERASI_DOCUMENT_SECTIONS}
                trailingFields={KOPERASI_TRAILING_FIELDS}
                dynamicSectionTitle={KOPERASI_DYNAMIC_SECTION_TITLE}
                {...props}
            />
        );
    }
);

export default CorpKoperasiDocumentPage;
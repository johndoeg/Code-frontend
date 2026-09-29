import { useCallback, useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { fetchCustomerDocuments, uploadCustomerDocument, deleteCustomerDocument } from "./CustomerDocumentsApi";
import type { CorpDocumentFieldConfig, CustomerDocumentListResponse, DynamicSectionConfig } from "./Types";

export function useCustomerDocuments(organizationType: string, apless: string, applNo: string) {
	const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
	const [busyFields, setBusyFields] = useState<Record<string, boolean>>({});
	const [saveError, setSaveError] = useState("");

	const { data, isLoading: loading, refetch: reload } = useQuery({
		queryKey: ['cam-customer-documents', organizationType, apless, applNo],
		queryFn: async (): Promise<CustomerDocumentListResponse> => {
			return fetchCustomerDocuments(apless, applNo, organizationType);
		},
	});

	const handleStaticFileSelect = useCallback(
		async (field: CorpDocumentFieldConfig, files: FileList | null) => {
			if (!files || files.length === 0 || !data) return;
			setBusyFields((prev) => ({ ...prev, [field.fieldKey]: true }));
			setFieldErrors((prev) => ({ ...prev, [field.fieldKey]: "" }));

			let runningCount = (data.documents[field.documentType] ?? []).length;
			const errors: string[] = [];

			for (let i = 0; i < files.length; i++) {
				runningCount += 1;
				const { error } = await uploadCustomerDocument({
					file: files[i],
					apless,
					applno: applNo,
					organizationType,
					documentType: field.documentType,
					prefix: `${field.prefix}${runningCount}-`,
					subfolder: field.subfolder,
					maxFileSizeMb: field.maxFileSizeMb,
				});

				if (error) errors.push(`(${i + 1}) Error occurred when uploading document: ${error}`);
			}

			if (errors.length) setFieldErrors((prev) => ({ ...prev, [field.fieldKey]: errors.join(" ") }));
			setBusyFields((prev) => ({ ...prev, [field.fieldKey]: false }));
			await reload();
		},
		[apless, applNo, organizationType, data, reload]
	);

	const handleDynamicFileSelect = useCallback(
		async (kind: "director" | "board", index: number, file: File | null, config: DynamicSectionConfig) => {
			if (!file || !data) return;
			const key = `${kind}_${index}`;
			setBusyFields((prev) => ({ ...prev, [key]: true }));
			setFieldErrors((prev) => ({ ...prev, [key]: "" }));

			const { error } = await uploadCustomerDocument({
				file,
				apless,
				applno: applNo,
				organizationType,
				documentType: `${config.documentTypePrefix}${index}`,
				prefix: `${config.filePrefix}${index}`,
				subfolder: config.subfolder,
				maxFileSizeMb: config.maxFileSizeMb,
			});
			if (error) setFieldErrors((prev) => ({ ...prev, [key]: error }));
			setBusyFields((prev) => ({ ...prev, [key]: false }));
			await reload();
		},
		[apless, applNo, organizationType, data, reload]
	);

	const handleDelete = useCallback(
		async (id: number) => {
			if (!window.confirm("Delete this document?")) return;
			const ok = await deleteCustomerDocument(id);
			if (ok) await reload();
		},
		[reload]
	);

	const trySaveAndContinue = useCallback(
		(onSaved: () => void) => {
			if (!data?.has_any_document) {
				setSaveError("Please upload Customer's Document");
				return;
			}
			setSaveError("");
			onSaved();
		},
		[data]
	);

	return {
		data,
		loading,
		fieldErrors,
		busyFields,
		saveError,
		handleStaticFileSelect,
		handleDynamicFileSelect,
		handleDelete,
		trySaveAndContinue,
	};
}
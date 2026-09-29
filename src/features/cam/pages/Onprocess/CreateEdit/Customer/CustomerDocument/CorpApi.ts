import type { CustomerDocumentListResponse } from "./Types";

const API_BASE = "/CAM/EditIndex/customer-document/upload";

export async function fetchCustomerDocuments(
	apless: string,
	applno: string,
	organizationType: string
): Promise<CustomerDocumentListResponse> {
	const params = new URLSearchParams({ apless, applno, organization_type: organizationType });
	const res = await fetch(`${API_BASE}?${params.toString()}`);
	if (!res.ok) throw new Error("Failed to load documents");
	return res.json();
}

export interface UploadCustomerDocumentParams {
	file: File;
	apless: string;
	applno: string;
	organizationType: string;
	documentType: string;
	prefix: string;
	subfolder: string;
	maxFileSizeMb: number;
}

export async function uploadCustomerDocument(
	params: UploadCustomerDocumentParams
): Promise<{ error?: string }> {
	const form = new FormData();
	form.append("file", params.file);
	form.append("apless", params.apless);
	form.append("applno", params.applno);
	form.append("organization_type", params.organizationType);
	form.append("document_type", params.documentType);
	form.append("prefix", params.prefix);
	form.append("subfolder", params.subfolder);
	form.append("max_file_size_mb", String(params.maxFileSizeMb));

	const res = await fetch(API_BASE, { method: "POST", body: form });
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		return { error: (data && data.error) || "Upload failed" };
	}
	return {};
}

export async function deleteCustomerDocument(id: number): Promise<boolean> {
	const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
	return res.ok;
}

export function downloadUrl(id: number): string {
	return `${API_BASE}/${id}/download`;
}
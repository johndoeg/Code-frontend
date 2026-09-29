import type { CustomerDocumentListResponse } from "./Types";
import api from '@/shared/api/axiosInstance';

const API_BASE = "/CAM/EditIndex/customer-document";

interface ApiEnvelope<T> {
	success: boolean;
	data?: T;
	message?: string;
}

async function unwrapAxios<T>(promise: Promise<{ data: ApiEnvelope<T> }>, fallbackMessage: string): Promise<T> {
	try {
		const res = await promise;
		if (!res.data.success) throw new Error(res.data.message || fallbackMessage);
		return res.data.data as T;
	} catch (err: any) {
		const message = err?.response?.data?.message ?? err?.message ?? fallbackMessage;
		throw new Error(message);
	}
}

export async function fetchCustomerDocuments(
	apless: string,
	applno: string,
	organizationType: string
): Promise<CustomerDocumentListResponse> {
	return unwrapAxios<CustomerDocumentListResponse>(
		api.get(`${API_BASE}/list`, { params: { apless, applno, organizationType } }),
		"Failed to load documents"
	);
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
	form.append("organizationType", params.organizationType);
	form.append("documentType", params.documentType);
	form.append("prefix", params.prefix);
	form.append("subfolder", params.subfolder);
	form.append("maxFileSizeMb", String(params.maxFileSizeMb));

	try {
		const res = await api.post<ApiEnvelope<unknown>>(`${API_BASE}/upload`, form, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		if (!res.data.success) return { error: res.data.message || "Upload failed" };
		return {};
	} catch (err: any) {
		return { error: err?.response?.data?.message ?? "Upload failed" };
	}
}

export async function deleteCustomerDocument(id: number): Promise<boolean> {
	try {
		const res = await api.post<ApiEnvelope<unknown>>(`${API_BASE}/delete`, { id });
		return res.data.success === true;
	} catch {
		return false;
	}
}

function absoluteUrl(path: string): string {
	const base = (api.defaults?.baseURL ?? "").replace(/\/$/, "");
	return `${base}${path}`;
}

export function downloadUrl(id: number): string {
	return absoluteUrl(`${API_BASE}/download/${id}`);
}

export function viewUrl(id: number): string {
	return absoluteUrl(`${API_BASE}/view/${id}`);
}
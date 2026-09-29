import api from '@/shared/api/axiosInstance';

export interface SelectOption {
	value: string;
	label: string;
}

export interface CreationContext {
	indCor: "1" | "2";
	purposeOfFinanceOptions: SelectOption[];
	limitCheck: {
		totalMitsuiD: number;
		totalMitsuiM: number;
		limitBisa: number;
		blocksFinTypeD: boolean;
		blocksFinTypeMOrW: boolean;
	};
}

export interface DpRatioInfo {
	ratioResult: string | null;
	asOfDate: string | null;
	periodFrom: string | null;
	periodTo: string | null;
	minDpInvestasiPct: number | null;
	minDpMultigunaPct: number | null;
	npfPct: number | null;
}

export interface CreateNewCamPayload {
	apless: string;
	prechecking_id: string;
	lessee_tp: "PR" | "PT";
	purpoffinc: string;
	fin_type: string;
	guarantor: "1" | "2" | "";
	new_car: "1" | "2" | "";
	repeat?: string;
	public?: "0" | "1" | "";
	boa?: string;
	bot?: string;
}

export interface CreateNewCamResult {
	applno: string;
	apless: string;
	finType: string;
	indCor: string;
	repeat: string;
	guarantor: string;
	newCar: string;
	status: string;
	purpoffinc: string;
	contype: string;
	boa: string;
	bot: string;
	public: string;
	warnings: string[];
	documentMigrationErrors: string[];
}

const API_BASE = "/CAM/EditIndex/cam-create";

interface ApiEnvelope<T> {
	success: boolean;
	data?: T;
	message?: string;
	errors?: string[];
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

export async function fetchCreationContext(lessee_tp: "PR" | "PT"): Promise<CreationContext> {
	return unwrapAxios<CreationContext>(
		api.get(`${API_BASE}/context`, { params: { lesseeTp: lessee_tp } }),
		"Failed to load creation context"
	);
}

export async function fetchFinanceTypeOptions(
	purpoffinc: string,
	lessee_tp: "PR" | "PT"
): Promise<SelectOption[]> {
	return unwrapAxios<SelectOption[]>(
		api.get(`${API_BASE}/finance-types`, { params: { purpoffinc, lesseeTp: lessee_tp } }),
		"Failed to load finance type options"
	);
}

export async function fetchDpRatioInfo(): Promise<DpRatioInfo> {
	return unwrapAxios<DpRatioInfo>(api.get(`${API_BASE}/dp-info`), "Failed to load DP/ratio info");
}

export async function postCreateNewCam(
	payload: CreateNewCamPayload
): Promise<{ result?: CreateNewCamResult; errors?: string[] }> {
	const body = {
		apless: payload.apless,
		precheckingId: payload.prechecking_id,
		lesseeTp: payload.lessee_tp,
		purpoffinc: payload.purpoffinc,
		finType: payload.fin_type,
		guarantor: payload.guarantor,
		newCar: payload.new_car,
		repeat: payload.repeat,
		public: payload.public,
		boa: payload.boa,
		bot: payload.bot,
	};

	try {
		const res = await api.post<ApiEnvelope<CreateNewCamResult>>(`${API_BASE}/save`, body);
		if (!res.data.success) {
			return { errors: res.data.errors ?? (res.data.message ? [res.data.message] : ["Failed to create CAM"]) };
		}
		return { result: res.data.data };
	} catch (err: any) {
		const data = err?.response?.data as ApiEnvelope<CreateNewCamResult> | undefined;
		return { errors: data?.errors ?? (data?.message ? [data.message] : ["Failed to create CAM"]) };
	}
}
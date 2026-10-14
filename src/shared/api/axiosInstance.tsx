import axios, { type InternalAxiosRequestConfig } from "axios";
import type { MaintenanceInfo } from '@/shared/types/maintenance';

const DEFAULT_TIMEOUT = 15_000;
const HEAVY_TIMEOUT = 90_000;

const HEAVY_URL = /\/(list|export|print|report|download|search)(\/|\?|$)/i;

const pickTimeout = (config: InternalAxiosRequestConfig): number => {
	const url = config.url ?? "";
	if (config.responseType === "blob") return HEAVY_TIMEOUT;
	if (HEAVY_URL.test(url)) return HEAVY_TIMEOUT;
	return DEFAULT_TIMEOUT;
};

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
	withCredentials: true,
});

api.interceptors.request.use((config) => {
	if (!config.timeout) {
		config.timeout = pickTimeout(config);
	}
	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		const url: string = error.config?.url ?? "";
		const status: number | undefined = error.response?.status;
		const data = error.response?.data;

		const isAuthEndpoint = url.includes("/auth/");

		if (status === 503 && data?.error === "maintenance") {
			window.dispatchEvent(
				new CustomEvent<MaintenanceInfo>("app:maintenance", { detail: data })
			);
			return Promise.reject(error);
		}

		if (status === 401 && !isAuthEndpoint) {
			window.location.href = "/login";
		}

		return Promise.reject(error);
	}
);

export default api;
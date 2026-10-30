import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

const THIRTY_MINUTES = 1000 * 60 * 30;

export type OptionsParams = Record<string, string | number | boolean | undefined>;

export function useOptions<T>(
    url: string,
    params?: OptionsParams,
    opts?: { enabled?: boolean; staleTime?: number },
) {
    return useQuery<T>({
        queryKey: ['options', url, params ?? null],
        queryFn: async ({ signal }) => {
            const res = await api.get<T>(url, { params, signal });
            return res.data;
        },
        staleTime: opts?.staleTime ?? THIRTY_MINUTES,
        gcTime: THIRTY_MINUTES * 2,
        enabled: opts?.enabled ?? true,
    });
}

export interface BranchOption {
    branchCd: string;
    branchName: string;
    cityName?: string;
}

export function useBranches(params?: OptionsParams) {
    return useOptions<BranchOption[]>('/Common/branches', params);
}
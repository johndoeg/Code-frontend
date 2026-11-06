import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

const THIRTY_MINUTES = 1000 * 60 * 30;

export type OptionsParams = Record<string, string | number | boolean | undefined>;

interface ApiListEnvelope<T> {
    data?: T[];
    success?: boolean;
    total?: number;
}

type Wire<T> = T[] | ApiListEnvelope<T>;

function unwrapList<T>(body: Wire<T> | null | undefined): T[] {
    if (Array.isArray(body)) return body;
    const inner = body?.data;
    return Array.isArray(inner) ? inner : [];
}

export function useListOptions<TWire, TOut = TWire>(
    url: string,
    params?: OptionsParams,
    opts?: {
        enabled?: boolean;
        staleTime?: number;
        map?: (row: TWire) => TOut;
    },
) {
    return useQuery<TOut[]>({
        queryKey: ['options', url, params ?? null],
        queryFn: async ({ signal }) => {
            const res = await api.get<Wire<TWire>>(url, { params, signal });
            const rows = unwrapList<TWire>(res.data);
            return opts?.map ? rows.map(opts.map) : (rows as unknown as TOut[]);
        },
        staleTime: opts?.staleTime ?? THIRTY_MINUTES,
        gcTime: THIRTY_MINUTES * 2,
        enabled: opts?.enabled ?? true,
    });
}

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

interface BranchWire {
    BRANCH_CD?: string | null;
    BRANCH_NAME?: string | null;
    CITY_NAME?: string | null;
}

export const CONSOLIDATE_BRANCH_CD = '000';

export function useBranches(params?: OptionsParams) {
    return useListOptions<BranchWire, BranchOption>('/Common/branches', params, {
        map: (row) => ({
            branchCd: (row.BRANCH_CD ?? '').trim(),
            branchName: (row.BRANCH_NAME ?? '').trim(),
            cityName: row.CITY_NAME?.trim(),
        }),
    });
}
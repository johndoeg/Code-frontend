import { currentYYYYMM, isValidMonth } from '@/features/cam/components/FormControls';
import { type UploadedDoc } from '@/features/cam/components/PrecheckingShared';
import { type CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import api from '@/shared/api/axiosInstance';
import React from 'react';

export function absoluteUrl(path: string): string {
	const base = (api.defaults?.baseURL ?? "").replace(/\/$/, "");
	return `${base}${path}`;
}

export const allowAmountAndDot = (value: string) => /^\d*\.?\d{0,2}$/.test(value);

export const asPhotoSrc = (raw: string) => (raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`);

export const blockNonNumericKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9.]/.test(e.key) && e.key !== "Backspace" && e.key !== "Delete" && e.key !== "Tab" && !e.key.startsWith("Arrow")) {
        e.preventDefault();
    }
};

export const ctxFromEditParams = (p: Record<string, string | number | null>, custName?: string): CamCtx => ({
	finType: String(p.id1 ?? ''),
	indCor: String(p.id2 ?? ''),
	repeat: String(p.id3 ?? ''),
	guarantor: String(p.id4 ?? ''),
	newCar: String(p.id5 ?? ''),
	status: String(p.id6 ?? ''),
	purpoffinc: String(p.id7 ?? ''),
	c2c: String(p.id8 ?? ''),
	contType: String(p.id9 ?? ''),
	apless: String(p.apless ?? ''),
	applno: String(p.applno ?? ''),
	custName,
});

export const ddmmyyyy = (d: Date | null): string => {
	if (!d) return '';
	return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
};

export const docsSignature = (list: UploadedDoc[]): string =>
	list.map((d) => `${d.id}:${d.type}`).sort().join('|');

export const downloadBlob = async (path: string, params: Record<string, string>, mime: string): Promise<Blob> => {
	const res = await api.get(path, { params, responseType: 'blob', timeout: 0 });
	return new Blob([res.data], { type: mime });
};

export const esc = (v: unknown) =>
	String(v ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");

export const fileMessage = async (err: any, fallback: string): Promise<string> => {
	const d = err?.response?.data;
	if (d instanceof Blob) {
		try { return JSON.parse(await d.text()).message || fallback; } catch { return fallback; }
	}
	return d?.message || fallback;
};

export const filenameFromDisposition = (header: string | undefined, fallback: string) => {
	if (!header) return fallback;
	const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
	if (utf8) return decodeURIComponent(utf8[1]);
	const plain = /filename="?([^";]+)"?/i.exec(header);
	return plain ? plain[1] : fallback;
};

export const fmt = (n: number) => (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

export const fmtNum = (v: number) => new Intl.NumberFormat("id-ID").format(v);

export const formatDMY = (value: Date | null): string => {
	if (!value) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(value.getDate())}-${pad(value.getMonth() + 1)}-${value.getFullYear()}`;
};

export const formatDobInput = (raw: string, prev: string): string => {
	const deleting = raw.length < prev.length;
	const digits = raw.replace(/\D/g, '').slice(0, 8);
	let dd = digits.slice(0, 2);
	let mm = digits.slice(2, 4);
	let yyyy = digits.slice(4, 8);

	if (dd.length === 1 && dd > '3') dd = `0${dd}`;
	if (dd.length === 2) {
		const n = Number(dd);
		dd = n < 1 ? '01' : n > 31 ? '31' : dd;
	}
	if (mm.length === 1 && mm > '1') mm = `0${mm}`;
	if (mm.length === 2) {
		const n = Number(mm);
		mm = n < 1 ? '01' : n > 12 ? '12' : mm;
	}
	if (yyyy.length >= 1 && !['1', '2'].includes(yyyy[0])) yyyy = '';
	if (yyyy.length === 4) {
		const n = Number(yyyy);
		const max = new Date().getFullYear();
		yyyy = String(n < 1900 ? 1900 : n > max ? max : n);
	}

	let out = dd;
	if (mm || (dd.length === 2 && !deleting)) out += '-';
	out += mm;
	if (yyyy || (mm.length === 2 && !deleting)) out += '-';
	out += yyyy;
	return out;
};

export const formatMoney = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 0 });

export const formatPct = (n: number | null) => (n === null ? '-' : `${n.toFixed(2)}%`);

export const fromApiDate = (s: string): Date | null => (s ? new Date(`${s}T00:00:00`) : null);

export function getPageNumbers(cur: number, total: number): (number | "…")[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	if (cur <= 4) return [1, 2, 3, 4, 5, "…", total];
	if (cur >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
	return [1, "…", cur - 1, cur, cur + 1, "…", total];
}

export function getTopWindow(): Window {
	try {
		return window.top ?? window;
	} catch {
		return window;
	}
}

export function gradeFromRanges(score: number, ranges: [number, number, string][]): string {
	for (const [min, max, label] of ranges) {
		if (score >= min && score <= max) return label;
	}
	return '';
}

export const isBlank = (value: any) => value === null || value === undefined || String(value).trim() === "";

export const newUid = () => `e${Math.random().toString(36).slice(2, 10)}`;

export const num = (value: any): number => {
	if (value === null || value === undefined) return 0;
	const parsed = parseFloat(String(value).replace(/,/g, ""));
	return Number.isFinite(parsed) ? parsed : 0;
};

export const openPdf = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	if (!window.open(url, '_blank')) saveBlob(blob, filename);
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const parseDMY = (value: string): Date | null => {
	if (!value) return null;
	const [d, m, y] = value.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d);
};

export const parseISO = (s: string): Date | null => {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

export const parseISODate = (value: string): Date | null => {
	if (!value) return null;
	const [y, m, d] = value.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d);
};

export const parseIsoDate = (raw: string | null): Date | null => {
	if (!raw) return null;
	const [y, m, d] = raw.split('-').map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d);
};

export const saveBlob = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export const selectCls = (editable: boolean) =>
	`border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${editable ? "bg-[var(--app-card)]" : "bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed"
	}`;

export function splitIndustryValue(value: string): { code: string; header: string } {
	const idx = value.indexOf("|");
	if (idx === -1) return { code: "", header: value };
	return { code: value.slice(0, idx), header: value.slice(idx + 1) };
}

export const stripNpwp = (v: string) => (v || '').replace(/\D/g, '').slice(0, 16);

export const toApiDate = (d: Date | null): string => {
	if (!d || isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const toISO = (d: Date): string => {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

export const toISODate = (value: Date | null): string => {
	if (!value) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

export const toLocalISO = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const toNumber = (v: string) => {
	const n = parseFloat((v || "0").replace(/,/g, ""));
	return Number.isFinite(n) ? n : 0;
};

export const todayLong = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

export const token = (v: string) => (v || '').replace(/[^A-Za-z0-9]/g, '');

export const uid = () => Math.random().toString(36).slice(2, 10);

export function validateNewPeriodFormat(period: string): string | null {
	if (period.length !== 6 || !/^\d{6}$/.test(period)) return "Period not valid";
	const month = period.slice(4, 6);
	if (!isValidMonth(month)) return "Period not valid";
	if (Number(period.slice(0, 4)) > new Date().getFullYear()) return "Period not valid";
	if (Number(period) > currentYYYYMM()) return "Period not valid";
	return null;
}

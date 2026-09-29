import React, { useCallback, useEffect, useState } from "react";
import api from '@/shared/api/axiosInstance';
import AsOfDatePickerComponent from '@/shared/components/AsOfDatePickerComponent';

interface SummaryRow {
    api: string;
    requesttype: string;
    status_code: string;
    jlh: number;
}

interface DetailRow {
    lease_no: string;
    lessee_nm: string;
    param1: string;
}

const INVOICE_TYPES = ['Invoice', 'InvoiceCallbackIn', 'InvoiceCallbackOut'];

const detailHeader = (apiName: string, requestType: string): string => {
    switch (apiName) {
        case 'DELIMA': return 'Invoice No.';
        case 'SMS': return 'Due Date (Reminder) - Status';
        case 'ESPAY': return 'Status Contract - Invoice Type - Period (Due Date)';
        case 'RAPINDO': return 'Status';
        case 'INSURANCE':
            return INVOICE_TYPES.includes(requestType)
                ? 'Policy No. - Batch No. - Status'
                : 'Attempt - Status (Policy No.)';
        default: return 'Detail';
    }
};

const API_LINKS: { title: string; urls: string[] }[] = [
    {
        title: 'Link API ESPAY',
        urls: [
            'https://ifc.sfintech.id:28888/SendInvoice/@nokontrak',
            'https://ifc.sfintech.id:28888/CheckInvoice/@membercode',
        ],
    },
    {
        title: 'Link API INSURANCE',
        urls: [
            'https://ifc.sfintech.id:38888/Raksa/Register/@lease_no/@attempt/@manual',
            'https://ifc.sfintech.id:38888/Simas/Register/@lease_no/@attempt/@manual',
            'https://ifc.sfintech.id:38888/Simas/SendInvoice',
        ],
    },
    {
        title: 'Link API RAPINDO',
        urls: [
            'https://ifc.sfintech.id:38888/Rapindo/Claim/@lease_no',
            'https://ifc.sfintech.id:38888/Rapindo/Expire/@lease_no',
            'https://ifc.sfintech.id:38888/Rapindo/UpdateAssetDetail/@lease_no',
            'https://ifc.sfintech.id:38888/Rapindo/Update/@lease_no',
        ],
    },
];

const toApiDate = (d: Date | null): string => {
    if (!d || isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const DashboardPage: React.FC = () => {
    const [date, setDate] = useState<Date | null>(new Date());
    const [rows, setRows] = useState<SummaryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailRows, setDetailRows] = useState<DetailRow[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [detailFor, setDetailFor] = useState<{ api: string; requestType: string } | null>(null);

    const fetchSummary = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/SystemAdmin/dashboard', {
                params: { date: toApiDate(date) },
            });
            setRows(res.data.data ?? []);
        } catch {
            setError("Failed to load dashboard data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    const openDetail = async (apiName: string, requestType: string) => {
        setDetailFor({ api: apiName, requestType });
        setDetailOpen(true);
        setDetailRows([]);
        setDetailError(null);
        setDetailLoading(true);
        try {
            const res = await api.get('/SystemAdmin/dashboard/detail', {
                params: { date: toApiDate(date), api: apiName, request_type: requestType },
            });
            setDetailRows(res.data.data ?? []);
        } catch {
            setDetailError("Failed to load detail data.");
        } finally {
            setDetailLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const res = await api.get('/SystemAdmin/dashboard/export', {
                params: { date: toApiDate(date) },
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `Dashboard_${toApiDate(date)}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            alert("Export failed.");
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetailOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const thClass = "py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider";
    const tdClass = "py-3 px-4 text-sm text-[var(--app-text)]";

    return (
        <div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
            <div className="max-w-full mx-auto">
                <div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">Dashboard</h1>
                            <p className="text-[var(--app-muted)] mt-1">API request summary by date</p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium self-start md:self-auto">
                            Total: {rows.length}
                        </span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
                        <div className="md:w-64">
                            <label className="block text-sm font-medium text-[var(--app-text)] mb-1">Date</label>
                            <AsOfDatePickerComponent
                                value={date}
                                onChange={(d: Date | null) => setDate(d)}
                            />
                        </div>

                        <button
                            onClick={fetchSummary}
                            disabled={loading}
                            className={`bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {loading ? "Searching..." : "Search"}
                        </button>

                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className={`bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all ${exporting ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {exporting ? "Preparing..." : "Check Data"}
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                            <button onClick={fetchSummary} className="ml-4 underline text-red-900">Retry</button>
                        </div>
                    )}

                    <div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
                                <tr>
                                    <th className={thClass} style={{ width: '20%' }}>API</th>
                                    <th className={thClass} style={{ width: '30%' }}>Item</th>
                                    <th className={thClass} style={{ width: '15%' }}>Status Code</th>
                                    <th className={thClass} style={{ width: '15%' }}>Jumlah</th>
                                    <th className={`${thClass} text-center`} style={{ width: '20%' }}></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--app-border)]">
                                {rows.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-10 px-6 text-center text-[var(--app-muted)]">
                                            No data found for this date
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {rows.map((r, idx) => (
                                            <tr
                                                key={`${r.api}-${r.requesttype}-${r.status_code}-${idx}`}
                                                className={`hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
                                            >
                                                <td className={`${tdClass} font-medium`}>{r.api}</td>
                                                <td className={tdClass}>{r.requesttype}</td>
                                                <td className={`${tdClass} text-center`}>{r.status_code}</td>
                                                <td className={`${tdClass} text-center`}>{r.jlh}</td>
                                                <td className={`${tdClass} text-center`}>
                                                    <button
                                                        onClick={() => openDetail(r.api, r.requesttype)}
                                                        className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Detail
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {loading && (
                                            <tr>
                                                <td colSpan={5} className="py-4 px-6 text-center">
                                                    <div className="flex justify-center">
                                                        <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
                    {API_LINKS.map((group) => (
                        <div key={group.title} className="mb-4 last:mb-0">
                            <h5 className="font-semibold text-[var(--app-text)] mb-2">{group.title}</h5>
                            <ul className="list-disc list-inside space-y-1">
                                {group.urls.map((u) => (
                                    <li key={u} className="text-sm text-[var(--app-muted)] font-mono break-all">{u}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {detailOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
                    onClick={() => setDetailOpen(false)}
                >
                    <div
                        className="bg-[var(--app-card)] rounded-2xl shadow-xl w-full max-w-6xl mt-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--app-border)]">
                            <h2 className="text-lg font-bold text-[var(--app-text)]">
                                {detailFor?.api} — {detailFor?.requestType}
                            </h2>
                            <button
                                onClick={() => setDetailOpen(false)}
                                aria-label="Close detail"
                                className="text-[var(--app-muted)] hover:text-[var(--app-text)] text-2xl leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {detailError && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                                    {detailError}
                                </div>
                            )}

                            <div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
                                        <tr>
                                            <th className={`${thClass} text-center`} style={{ width: '6%' }}>No.</th>
                                            <th className={thClass} style={{ width: '20%' }}>Contract No.</th>
                                            <th className={thClass} style={{ width: '28%' }}>Customer Name</th>
                                            <th className={thClass}>
                                                {detailHeader(detailFor?.api ?? '', detailFor?.requestType ?? '')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--app-border)]">
                                        {detailLoading ? (
                                            <tr>
                                                <td colSpan={4} className="py-6 px-6 text-center">
                                                    <div className="flex justify-center">
                                                        <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : detailRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 px-6 text-center text-[var(--app-muted)]">
                                                    No detail records found
                                                </td>
                                            </tr>
                                        ) : (
                                            detailRows.map((d, idx) => (
                                                <tr
                                                    key={`${d.lease_no}-${idx}`}
                                                    className={idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}
                                                >
                                                    <td className={`${tdClass} text-center`}>{idx + 1}</td>
                                                    <td className={`${tdClass} font-mono`}>{d.lease_no}</td>
                                                    <td className={tdClass}>{d.lessee_nm}</td>
                                                    <td className={tdClass}>{d.param1}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
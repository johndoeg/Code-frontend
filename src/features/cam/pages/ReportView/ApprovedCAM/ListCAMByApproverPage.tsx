import React, { useEffect, useState } from 'react';
import api from '@/shared/api/axiosInstance';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';

interface BranchOption {
    branch_cd: string;
    branch_name: string;
}

interface DetailRow {
    no: number;
    branch_name: string;
    customer_name: string;
    cam_no: string;
    appl_no: string;
    approved_date: string;
    model: string;
    brand_type: string;
    car_status: string;
    contract_status: string;
    outstanding_old_cam: number;
    net_finance_new_cam: number;
    total_outstanding: number;
    cmo: string;
}

interface Section {
    role_code: string;
    role_label: string;
    rows: DetailRow[];
}

interface ListResponse {
    sections: Section[];
    grand_total: { net_finance: number; units: number };
    disabled: boolean;
    search_branch: string;
}

interface HistoryEntry {
    date: string;
    approved_by: string;
    status: string;
    comment: string;
}

interface CamInfo {
    appl_no_display: string;
    customer_name: string;
    cmo_name: string;
    history: HistoryEntry[];
}

interface CommentsResponse {
    main: CamInfo;
    related: CamInfo[];
}

const toISO = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 0 });

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const CamInfoBlock: React.FC<{ info: CamInfo }> = ({ info }) => (
    <table className="w-full text-sm border-collapse mb-4">
        <tbody>
            <tr>
                <td className="w-1/5 py-1 text-[var(--app-muted)]">CAM No.</td>
                <td className="py-1">{info.appl_no_display}</td>
            </tr>
            <tr>
                <td className="py-1 text-[var(--app-muted)]">Customer Name</td>
                <td className="py-1">{info.customer_name}</td>
            </tr>
            <tr>
                <td className="py-1 text-[var(--app-muted)]">CMO Name</td>
                <td className="py-1">{info.cmo_name}</td>
            </tr>
            <tr>
                <td colSpan={2} className="pt-2">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-[var(--app-surface-alt)]">
                                <th className="border border-[var(--app-border)] px-2 py-1 text-left w-1/4">Date</th>
                                <th className="border border-[var(--app-border)] px-2 py-1 text-left w-2/5">Approval By</th>
                                <th className="border border-[var(--app-border)] px-2 py-1 text-left">CAM Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {info.history.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="border border-[var(--app-border)] px-2 py-2 text-center text-[var(--app-muted)]">
                                        No history found.
                                    </td>
                                </tr>
                            ) : (
                                info.history.map((h, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr className={idx % 2 === 0 ? 'bg-[var(--app-surface)]' : ''}>
                                            <td className="border border-[var(--app-border)] px-2 py-1" rowSpan={2}>{h.date}</td>
                                            <td className="border border-[var(--app-border)] px-2 py-1">{h.approved_by}</td>
                                            <td className="border border-[var(--app-border)] px-2 py-1">{h.status}</td>
                                        </tr>
                                        <tr className={idx % 2 === 0 ? 'bg-[var(--app-surface)]' : ''}>
                                            <td className="border border-[var(--app-border)] px-2 py-1" colSpan={2}>Comment : {h.comment}</td>
                                        </tr>
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
    </table>
);

const ListCAMByApproverPage: React.FC = () => {
    const [branches, setBranches] = useState<BranchOption[]>([]);
    const [branchDisabled, setBranchDisabled] = useState(false);

    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [branchCd, setBranchCd] = useState('');

    const [sections, setSections] = useState<Section[]>([]);
    const [grandTotal, setGrandTotal] = useState<{ net_finance: number; units: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [exporting, setExporting] = useState(false);

    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [comments, setComments] = useState<CommentsResponse | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const [branchRes, ctxRes] = await Promise.all([
                    api.get<BranchOption[]>('/CAM/Approved/cam-by-approver/branches'),
                    api.get('/CAM/Approved/cam-by-approver/context'),
                ]);
                setBranches(branchRes.data);
                setBranchDisabled(ctxRes.data.disabled);
                if (ctxRes.data.disabled) {
                    setBranchCd(ctxRes.data.forced_branch_cd);
                }
            } catch (err) {
                console.error('Context load error:', err);
            }
        })();
    }, []);

    const buildParams = () => ({
        start_date: startDate ? toISO(startDate) : '',
        end_date: endDate ? toISO(endDate) : '',
        branch_cd: branchCd,
    });

    const handlePreview = async () => {
        if (!startDate && !endDate && !branchCd) {
            alert('Please Fill The Field');
            return;
        }
        setLoading(true);
        setError(null);
        setHasSearched(true);
        try {
            const response = await api.get<ListResponse>('/CAM/Approved/cam-by-approver/list', {
                params: buildParams(),
            });
            setSections(response.data.sections);
            setGrandTotal(response.data.grand_total);
        } catch (err) {
            console.error('CAM by Approver list error:', err);
            setError('Failed to load report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        if (!startDate && !endDate && !branchCd) {
            alert('Please Fill The Field');
            return;
        }
        const params = new URLSearchParams(buildParams());
        const baseURL = (api.defaults.baseURL || '').replace(/\/$/, '');
        window.open(`${baseURL}/CAM/Approved/cam-by-approver/print?${params.toString()}`, '_blank');
    };

    const handleExport = async () => {
        if (!startDate && !endDate && !branchCd) {
            alert('Please Fill The Field');
            return;
        }
        setExporting(true);
        try {
            const response = await api.get('/CAM/Approved/cam-by-approver/export', {
                params: buildParams(),
                responseType: 'blob',
            });
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'ListCamByApprover.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
            alert('Failed to export. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    const openComments = async (applNo: string) => {
        setCommentsOpen(true);
        setCommentsLoading(true);
        setComments(null);
        try {
            const res = await api.get<CommentsResponse>('/CAM/Approved/cam-by-approver/comments', {
                params: { appl_no: applNo },
            });
            setComments(res.data);
        } catch (err) {
            console.error('Comments load error:', err);
        } finally {
            setCommentsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
            <div className="max-w-full mx-auto">
                <div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
                    <div className="mb-6">
                        <h1 className="text-xl md:text-2xl font-bold text-[var(--app-text)]">List CAM by Approver</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm items-end">
                        <div>
                            <label className="text-[var(--app-muted)] block mb-1">Start Date</label>
                            <AsOfDatePicker label="" value={startDate} onChange={setStartDate} />
                        </div>
                        <div>
                            <label className="text-[var(--app-muted)] block mb-1">End Date</label>
                            <AsOfDatePicker label="" value={endDate} onChange={setEndDate} />
                        </div>
                        <div>
                            <label className="text-[var(--app-muted)] block mb-1">Branch</label>
                            <select
                                value={branchCd}
                                onChange={(e) => setBranchCd(e.target.value)}
                                disabled={branchDisabled}
                                className="w-full px-3 py-2 rounded-lg border border-[var(--app-border)] text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-[var(--app-surface-alt)]"
                            >
                                <option value="" style={optionStyle}>Select</option>
                                {branches.map((b) => (
                                    <option key={b.branch_cd} value={b.branch_cd} style={optionStyle}>
                                        {b.branch_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mb-6 flex gap-2">
                        <button
                            onClick={handlePreview}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Preview
                        </button>
                        <button
                            onClick={handlePrint}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Print
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            {exporting ? 'Exporting…' : 'Export to Excel'}
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="py-10 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
                        </div>
                    ) : !hasSearched ? (
                        <div className="py-10 text-center text-[var(--app-muted)] text-sm">
                            Choose your filters and click Preview.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-lg border border-[var(--app-border)] mb-6">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--app-surface-alt)] text-[var(--app-text)]">
                                            <th className="border border-[var(--app-border)] px-1 py-2">No.</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Branch</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Customer Name</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">CAM No.</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Approved Date</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Model</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Brand/Type</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Car Status</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Contract Status</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Outstanding</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Net Finance</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Total Outstanding</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">CMO</th>
                                            <th className="border border-[var(--app-border)] px-1 py-2">Credit Committee Comments</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sections.map((section) => (
                                            <React.Fragment key={section.role_code}>
                                                <tr>
                                                    <td colSpan={14} className="border border-[var(--app-border)] px-2 py-1 font-medium bg-[var(--app-surface)]">
                                                        Approved by : {section.role_label}
                                                    </td>
                                                </tr>
                                                {section.rows.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={14} className="border border-[var(--app-border)] px-2 py-2 text-center text-red-600 font-bold bg-[var(--app-surface-alt)]">
                                                            Data Not Found
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    section.rows.map((row) => (
                                                        <tr key={row.appl_no} className="odd:bg-[var(--app-surface)]">
                                                            <td className="border border-[var(--app-border)] px-1 py-1 text-center">{row.no}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1">{row.branch_name}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1">{row.customer_name}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1">{row.cam_no}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1">{row.approved_date}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1">{row.model}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1">{row.brand_type}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1">{row.car_status}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1">{row.contract_status}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1 text-right">{fmt(row.outstanding_old_cam)}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1 text-right">{fmt(row.net_finance_new_cam)}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1 text-right">{fmt(row.total_outstanding)}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1">{row.cmo}</td>
                                                            <td className="border border-[var(--app-border)] px-1 py-1 text-center">
                                                                <button
                                                                    onClick={() => openComments(row.appl_no)}
                                                                    className="bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs"
                                                                >
                                                                    View
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {grandTotal && (
                                <div className="text-sm max-w-md">
                                    <div className="font-semibold underline mb-2">
                                        Grand Total* ({startDate && endDate ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` : ''}):
                                    </div>
                                    <div>Net Finance : {fmt(grandTotal.net_finance)}</div>
                                    <div>Units : {fmt(grandTotal.units)}</div>
                                    <div className="text-xs text-[var(--app-muted)] italic mt-2">
                                        *Grand Total Amount and Unit Exclude CAM Revision
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {commentsOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--app-card)] rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-bold text-[var(--app-text)]">Credit Committee Comments</h3>
                            <button onClick={() => setCommentsOpen(false)} className="text-[var(--app-muted)] hover:text-[var(--app-muted)] text-2xl leading-none">
                                ×
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-grow">
                            {commentsLoading ? (
                                <div className="flex justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                                </div>
                            ) : comments ? (
                                <>
                                    <CamInfoBlock info={comments.main} />
                                    {comments.related.map((info, idx) => (
                                        <div key={idx} className="border border-[var(--app-border)] rounded-lg p-3 mb-3">
                                            <div className="text-xs text-[var(--app-muted)] mb-2">Related CAM</div>
                                            <CamInfoBlock info={info} />
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div className="text-center text-[var(--app-muted)] py-10">No data.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListCAMByApproverPage;
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';
import CamViewTabs from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import CamEditTabs from '@/features/cam/pages/Onprocess/CreateEdit/MainEdit/CAMEditTabs';
import type { CamCtx } from '@/features/cam/pages/Onprocess/View/MainView/CamViewTabs';
import CamSendCmoPage from '@/features/cam/pages/Onprocess/SendData/CAMSendCMOPage';
import CamRejectWatchlistPage from '@/features/cam/pages/Onprocess/SendData/CAMRejectWatchlistPage';
import CamApproval from '@/features/cam/pages/Onprocess/SendData/CAMApprovalPage';
import CamEditPage from '@/features/cam/pages/Onprocess/CreateEdit/MainEdit/CAMEditPage';
import { useAuth } from '@/shared/contexts/AuthContext';

type AccessLevel = "CMO" | "CRH" | string;
type RowColor = "default" | "revise" | "reject";

interface CamRow {
	appl_no: string;
	tgl: string;
	cons_leas: string;
	lessee_nm: string;
	namacmo: string;
	can_manage: boolean;
	reject_person: string;
	reject_comment: string;
	cbgnow: string;
	cmo_now: string;
	brch_code: string;
	color: RowColor;
	str_revisi: string;
	str_multiple: string;
	fin_type: string;
	ind_cor: string;
	guarantor: string;
	new_car: string;
	tenor: string;
	c2c: string;
	purpoffinc: string;
	cont_type: string;
	apless: string;
	r_change: string;
	go_public: string;
	menmen: number;
	tot_outs: number;
	picked_by: string;
	mstr_ca: string;
	cbgnow_co: boolean;
}

interface UserCtx {
	emp_id: string;
	username: string;
	accessLevel: AccessLevel;
}

interface SendCmoState {
	applNos: string[];
	multiple: boolean;
}

interface RejectWatchlistState {
	apless: string;
	applNo: string;
}

const COLOR_MAP: Record<RowColor, string> = {
	default: "text-[var(--app-text)] dark:text-slate-200",
	revise: "text-green-700 dark:text-green-400 font-semibold",
	reject: "text-fuchsia-600 dark:text-fuchsia-400 font-semibold",
};

const LINK_COLOR_MAP: Record<RowColor, string> = {
	default: "text-blue-800 hover:text-blue-400 dark:text-blue-400 dark:hover:text-blue-300",
	revise: "text-green-700 dark:text-green-400 font-semibold hover:text-green-800 dark:hover:text-green-300",
	reject: "text-fuchsia-600 dark:text-fuchsia-400 font-semibold hover:text-fuchsia-700 dark:hover:text-fuchsia-300",
};

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	onOk: () => void;
	onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
	open, title, message, onOk, onCancel,
}) => {
	if (!open) return null;
	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-[var(--app-card)] rounded-2xl shadow-2xl w-full max-w-sm p-6">
				<h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">{title}</h3>
				<p className="text-[var(--app-text)] mb-6 text-sm">{message}</p>
				<div className="flex justify-end gap-3">
					<button
						onClick={onCancel}
						className="px-4 py-2 border border-[var(--app-border)] rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface)] text-sm"
					>
						Cancel
					</button>
					<button
						onClick={onOk}
						className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	);
};

const NamaCmoCell: React.FC<{
	namacmo: string;
	rejectPerson: string;
	rejectComment: string;
	colorCls: string;
}> = ({ namacmo, rejectPerson, rejectComment, colorCls }) => {
	if (rejectPerson) {
		return (
			<td className={`py-3 px-4 text-sm ${colorCls}`}>
				<strong>Reject by:</strong> {rejectPerson}
				<br />
				<strong>Comment:</strong> {rejectComment}
				<br />
				<span className="italic text-xs">Click No. CAM for Detail..</span>
			</td>
		);
	}
	return <td className={`py-3 px-4 text-sm ${colorCls}`}>{namacmo}</td>;
};

const CamOnHandPage: React.FC = () => {
	const { user } = useAuth();
	const userCtx: UserCtx = {
		emp_id: user?.emp_id || "",
		username: user?.username || "",
		accessLevel: user?.accesslevel || "",
	};
	const { emp_id, username, accessLevel } = userCtx;

	const isCmoLike = accessLevel === "CMO" || accessLevel === "HD";
	const [rows, setRows] = useState<CamRow[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [page, setPage] = useState(1);
	const limit = DEFAULT_PAGE_LIMIT;
	const totalPages = Math.ceil(total / limit);

	const [searchBy, setSearchBy] = useState("1");
	const [searchVal, setSearchVal] = useState("");
	const [appliedSearch, setAppliedSearch] = useState({ by: "", val: "" });

	const [checkedAppl, setCheckedAppl] = useState<Set<string>>(new Set());
	const [multipleMode, setMultipleMode] = useState(false);

	const [checkedPickup, setCheckedPickup] = useState<Set<string>>(new Set());

	const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; apless: string; appl_no: string }>({ open: false, apless: "", appl_no: "" });
	const [confirmSend, setConfirmSend] = useState(false);
	const [confirmPickSave, setConfirmPickSave] = useState(false);

	const [activeCam, setActiveCam] = useState<{ ctx: CamCtx; menu: number } | null>(null);

	const [editTarget, setEditTarget] = useState<{ apless: string; applNo: string; indCor: string; c2c: string } | null>(null);

	const [sendCmo, setSendCmo] = useState<SendCmoState | null>(null);
	const [approvalApplNo, setApprovalApplNo] = useState<string | null>(null);

	const [rejectWatchlist, setRejectWatchlist] = useState<RejectWatchlistState | null>(null);

	const hasCrhPickRow = useRef(false);

	const fetchRows = useCallback(async () => {
		setLoading(true);
		setError(null);
		setCheckedAppl(new Set());
		setCheckedPickup(new Set());

		try {
			const res = await api.get('/CAM/onhand', {
				params: {
					page,
					limit,
					search_by: appliedSearch.by,
					search_val: appliedSearch.val,
				},
			});
			setRows(res.data.data ?? []);
			setTotal(res.data.total ?? 0);
		} catch {
			setError("Failed to load data. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [page, limit, appliedSearch]);

	useEffect(() => {
		fetchRows();
	}, [fetchRows]);

	useEffect(() => {
		setPage(1);
	}, [appliedSearch]);

	useEffect(() => {
		if (!activeCam && !sendCmo && !rejectWatchlist && !approvalApplNo && !editTarget) return;
		const original = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => { document.body.style.overflow = original; };
	}, [activeCam, sendCmo, rejectWatchlist, approvalApplNo, editTarget]);

	const handleSearch = () => {
		setAppliedSearch({ by: searchBy, val: searchVal });
	};

	const handleClearSearch = () => {
		setSearchVal("");
		setAppliedSearch({ by: "", val: "" });
	};

	const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") handleSearch();
	};

	const toggleCheck = (appl_no: string) => {
		setCheckedAppl(prev => {
			const next = new Set(prev);
			next.has(appl_no) ? next.delete(appl_no) : next.add(appl_no);
			return next;
		});
	};

	const handleSend = async () => {
		if (checkedAppl.size === 0) {
			alert("Check it first please");
			return;
		}
		setConfirmSend(true);
	};

	const doSend = async () => {
		setConfirmSend(false);
		const appl_nos = Array.from(checkedAppl);
		try {
			const res = await api.post('/CAM/onhand/send', {
				appl_nos,
				multiple: multipleMode,
			});
			if (res.data.success) {
				setSendCmo({ applNos: appl_nos, multiple: multipleMode });
			} else {
				alert(res.data.message);
			}
		} catch (err: any) {
			alert(err.response?.data?.message ?? "Send failed. Please try again.");
		}
	};

	const handleCekValidasi = async (appl_no: string) => {
		try {
			const res = await api.post('/CAM/onhand/validate', { appl_no });
			if (res.data.blocked) {
				alert(res.data.message);
				fetchRows();
			} else {
				setApprovalApplNo(appl_no);
			}
		} catch {
			setApprovalApplNo(appl_no);
		}
	};

	const doDelete = async () => {
		const { apless, appl_no } = confirmDelete;
		setConfirmDelete({ open: false, apless: "", appl_no: "" });
		try {
			const res = await api.delete(`/CAM/onhand/${encodeURIComponent(appl_no)}`, {
				params: { apless },
			});
			if (res.data.success) {
				fetchRows();
			} else {
				alert(res.data.message || "Delete failed. Please try again.");
			}
		} catch {
			alert("Delete failed. Please try again.");
		}
	};

	const togglePickup = (appl_no: string, disabled: boolean) => {
		if (disabled) return;
		setCheckedPickup(prev => {
			const next = new Set(prev);
			next.has(appl_no) ? next.delete(appl_no) : next.add(appl_no);
			return next;
		});
	};

	const doPickSave = async () => {
		setConfirmPickSave(false);
		try {
			await api.post('/CAM/onhand/pick', {
				appl_nos: Array.from(checkedPickup),
			});
			alert("Success");
			fetchRows();
		} catch {
			alert("Save failed.");
		}
	};

	const handleEdit = (row: CamRow) => {
		if (row.appl_no.length > 11) {
			alert("The Cam No is invalid.");
			return;
		}
		if (!window.confirm("Are you sure to update data?")) return;
		setEditTarget({ apless: row.apless, applNo: row.appl_no, indCor: row.ind_cor, c2c: row.c2c });
	};

	const mstrCaDisabledMap = useMemo(() => {
		const map = new Map<string, boolean>();
		let run = 0;
		rows.forEach(row => {
			if (row.mstr_ca) {
				run++;
				map.set(row.appl_no, run !== 1);
			} else {
				run = 0;
				map.set(row.appl_no, false);
			}
		});
		return map;
	}, [rows]);

	hasCrhPickRow.current = rows.some(
		r => accessLevel === "CRH" && r.tot_outs > 300_000_000 && r.tot_outs <= 600_000_000 && !r.picked_by
	);

	const startIndex = (page - 1) * limit + 1;
	const openCam = (row: CamRow, mode: "Edit" | "View", menu: number = 1) => {
		setActiveCam({
			menu,
			ctx: {
				finType: row.fin_type,
				indCor: row.ind_cor,
				repeat: "1",
				guarantor: row.guarantor,
				newCar: row.new_car,
				status: mode,
				purpoffinc: row.purpoffinc,
				c2c: row.c2c,
				contType: row.cont_type,
				apless: row.apless,
				applno: row.appl_no,
				boa: '',
				bot: '',
				akseskhusus: false,
				restructuringChange: row.r_change,
				goPublic: row.go_public,
			},
		});
	};

	const camLabel = (row: CamRow) =>
		`${row.cons_leas} - ${row.appl_no}${row.str_revisi}${row.str_multiple}`;

	const crhCheckboxState = (row: CamRow): { disabled: boolean; checked: boolean } => {
		const inRange = row.tot_outs > 300_000_000 && row.tot_outs <= 600_000_000;
		if (!inRange) return { disabled: true, checked: false };
		if (!row.picked_by) {
			const mstrDisabled = mstrCaDisabledMap.get(row.appl_no) ?? false;
			return { disabled: mstrDisabled, checked: !mstrDisabled && checkedPickup.has(row.appl_no) };
		}
		if (row.picked_by === emp_id) return { disabled: true, checked: true };
		return { disabled: true, checked: false };
	};

	const renderManageButtons = (row: CamRow) => {
		if (!row.can_manage) return null;
		return (
			<>
				<button onClick={() => handleEdit(row)}
					className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium">
					Edit
				</button>
				<button onClick={() => setConfirmDelete({ open: true, apless: row.apless, appl_no: row.appl_no })}
					className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-md text-sm font-medium">
					Delete
				</button>
				<button onClick={() => setRejectWatchlist({ apless: row.apless, applNo: row.appl_no })}
					className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white rounded-md text-sm font-medium">
					Reject to Watchlist
				</button>
			</>
		);
	};

	const renderCmoHeaders = () => (
		<tr className="bg-gradient-to-r from-[var(--app-surface-alt)] to-slate-200 dark:from-slate-700 dark:to-slate-800">
			{["Date", "CAM No.", "Customer Name", "Status", "Branch", "", "Actions", "Send"].map((h, i) => (
				<th key={i} className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-muted)] dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
					{h}
				</th>
			))}
		</tr>
	);

	const renderApproverHeaders = (extra: string) => (
		<tr className="bg-gradient-to-r from-[var(--app-surface-alt)] to-slate-200 dark:from-slate-700 dark:to-slate-800">
			{["Date", "CAM No.", "Customer Name", "Status", "Branch - CMO", "", "Actions", extra].map((h, i) => (
				<th key={i} className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-muted)] dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">
					{h}
				</th>
			))}
		</tr>
	);

	const renderCmoRow = (row: CamRow, idx: number) => {
		if (row.cbgnow_co) return null;

		const colorCls = COLOR_MAP[row.color];
		const linkColorCls = LINK_COLOR_MAP[row.color];

		return (
			<tr key={row.appl_no || `cmo-${idx}`}
				className={`${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"} hover:bg-[var(--app-surface)] dark:hover:bg-slate-700/60 transition-colors`}>
				<td className="py-3 px-4 text-sm whitespace-nowrap text-[var(--app-muted)]">{row.tgl}</td>
				<td className="py-3 px-4 text-sm whitespace-nowrap">
					<button type="button" onClick={() => openCam(row, "View")}
						className={`text-left underline underline-offset-2 ${linkColorCls}`}>
						{camLabel(row)}
					</button>
				</td>
				<td className={`py-3 px-4 text-sm ${colorCls}`}>{row.lessee_nm}</td>
				<NamaCmoCell namacmo={row.namacmo} rejectPerson={row.reject_person} rejectComment={row.reject_comment} colorCls={colorCls} />
				<td className={`py-3 px-4 text-sm ${colorCls}`}>{row.brch_code}</td>
				<td className="py-3 px-4" />
				<td className="py-3 px-4 text-sm">
					<div className="flex flex-wrap gap-1">
						{renderManageButtons(row)}
					</div>
				</td>
				<td className="py-3 px-4 text-center">
					<input type="checkbox" checked={checkedAppl.has(row.appl_no)}
						onChange={() => toggleCheck(row.appl_no)}
						className="w-4 h-4 accent-blue-600" />
				</td>
			</tr>
		);
	};

	const renderApproverRow = (row: CamRow, idx: number) => {
		if (row.cbgnow_co) return null;

		const colorCls = COLOR_MAP[row.color];
		const linkColorCls = LINK_COLOR_MAP[row.color];
		const isCrh = accessLevel === "CRH";
		const inCrhRange = row.tot_outs > 300_000_000 && row.tot_outs <= 600_000_000;
		const { disabled: cbDisabled, checked: cbChecked } = isCrh ? crhCheckboxState(row) : { disabled: true, checked: false };
		const showPickupCol = isCrh && inCrhRange;

		return (
			<tr key={row.appl_no || `appr-${idx}`}
				className={`${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"} hover:bg-[var(--app-surface)] dark:hover:bg-slate-700/60 transition-colors`}>
				<td className="py-3 px-4 text-sm whitespace-nowrap text-[var(--app-muted)]">{row.tgl}</td>
				<td className="py-3 px-4 text-sm whitespace-nowrap">
					<button type="button" onClick={() => openCam(row, "View", row.menmen)}
						className={`text-left underline underline-offset-2 ${linkColorCls}`}>
						{camLabel(row)}
					</button>
				</td>
				<td className={`py-3 px-4 text-sm ${colorCls}`}>{row.lessee_nm}</td>
				<NamaCmoCell namacmo={row.namacmo} rejectPerson={row.reject_person} rejectComment={row.reject_comment} colorCls={colorCls} />
				<td className={`py-3 px-4 text-sm ${colorCls}`}>
					{row.cbgnow}&nbsp;&nbsp;({row.cmo_now})
				</td>
				<td className="py-3 px-4" />
				<td className="py-3 px-4 text-sm">
					<div className="flex flex-wrap gap-1">
						{renderManageButtons(row)}
						<button onClick={() => handleCekValidasi(row.appl_no)}
							className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium">
							Send
						</button>
					</div>
				</td>
				{isCrh ? (
					<td className="py-3 px-4 text-center">
						{showPickupCol && (
							<input type="checkbox"
								checked={cbChecked}
								disabled={cbDisabled}
								onChange={() => togglePickup(row.appl_no, cbDisabled)}
								className="w-4 h-4 accent-blue-600 disabled:opacity-40" />
						)}
					</td>
				) : (
					<td className="py-3 px-4" />
				)}
			</tr>
		);
	};

	return (
		<div className="min-h-screen bg-[var(--app-surface)]">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">
								On Process — On Hand
							</h1>
							<p className="text-[var(--app-muted)] mt-1 text-sm">
								Credit Approval Memo tracking
							</p>
						</div>
						<span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium self-start md:self-auto">
							Total: {total}
						</span>
					</div>

					<div className="flex flex-wrap items-center gap-2 mb-4">
						<select
							value={searchBy}
							onChange={e => setSearchBy(e.target.value)}
							className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-card)] text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-blue-400"
						>
							<option value="1">CAM No.</option>
							<option value="2">Customer Name</option>
						</select>
						<div className="relative">
							<input
								type="text"
								value={searchVal}
								onChange={e => setSearchVal(e.target.value)}
								onKeyDown={handleSearchKeyDown}
								placeholder="Search…"
								className="border border-[var(--app-border)] bg-[var(--app-card)] text-[var(--app-text)] rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
							/>
							{searchVal && (
								<button
									type="button"
									onClick={handleClearSearch}
									aria-label="Clear search"
									className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] text-sm leading-none"
								>
									✕
								</button>
							)}
						</div>
						<button
							onClick={handleSearch}
							className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
						>
							Search
						</button>
					</div>

					{error && (
						<div className="mb-4 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
							{error}
							<button onClick={fetchRows} className="underline ml-4">Retry</button>
						</div>
					)}

					<div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
						<table className="w-full text-sm">
							<thead>
								{isCmoLike
									? renderCmoHeaders()
									: renderApproverHeaders(accessLevel === "CRH" ? "Pick Up CAM" : "")}
							</thead>
							<tbody className="divide-y divide-[var(--app-border)]">
								{loading ? (
									<tr>
										<td colSpan={8} className="py-14 text-center text-[var(--app-muted)]">
											<div className="flex justify-center">
												<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
											</div>
										</td>
									</tr>
								) : rows.length === 0 ? (
									<tr>
										<td colSpan={8} className="py-14 text-center text-[var(--app-muted)]">
											No records found
										</td>
									</tr>
								) : (
									rows.map((row, idx) =>
										isCmoLike
											? renderCmoRow(row, idx)
											: renderApproverRow(row, idx)
									)
								)}
							</tbody>
						</table>
					</div>

					{isCmoLike && !loading && (
						<div className="flex items-center justify-end gap-4 mt-4">
							<label className="flex items-center gap-2 text-sm text-[var(--app-text)] cursor-pointer select-none">
								<input
									type="checkbox"
									checked={multipleMode}
									onChange={e => setMultipleMode(e.target.checked)}
									className="w-4 h-4 accent-blue-600"
								/>
								Multiple
							</label>
							<button
								onClick={handleSend}
								disabled={checkedAppl.size === 0}
								className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-orange-500 hover:bg-orange-600 text-white disabled:bg-[var(--app-surface-alt)] disabled:text-[var(--app-muted)] disabled:border disabled:border-[var(--app-border)] disabled:cursor-not-allowed disabled:hover:bg-[var(--app-surface-alt)]"
							>
								Send{checkedAppl.size > 0 ? ` (${checkedAppl.size})` : ""}
							</button>
						</div>
					)}

					{accessLevel === "CRH" && hasCrhPickRow.current && !loading && (
						<div className="flex justify-end mt-4">
							<button
								onClick={() => setConfirmPickSave(true)}
								disabled={checkedPickup.size === 0}
								className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-orange-500 hover:bg-orange-600 text-white disabled:bg-[var(--app-surface-alt)] disabled:text-[var(--app-muted)] disabled:border disabled:border-[var(--app-border)] disabled:cursor-not-allowed disabled:hover:bg-[var(--app-surface-alt)]"
							>
								Save
							</button>
						</div>
					)}

					{!loading && total > 0 && (
						<Pagination
							page={page}
							totalPages={totalPages}
							onPageChange={setPage}
							totalItems={total}
							itemsPerPage={limit}
							className="mt-6"
						/>
					)}
				</div>

				<div className="flex items-center gap-6 px-2">
					<div className="flex items-center gap-2">
						<span className="inline-block w-4 h-4 rounded border border-[var(--app-border)] bg-green-600" />
						<span className="text-sm text-[var(--app-muted)]">Revise</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="inline-block w-4 h-4 rounded border border-[var(--app-border)] bg-fuchsia-500" />
						<span className="text-sm text-[var(--app-muted)]">Reject</span>
					</div>
				</div>
			</div>

			<ConfirmDialog
				open={confirmDelete.open}
				title="Delete CAM"
				message="Are you sure you want to delete this data?"
				onOk={doDelete}
				onCancel={() => setConfirmDelete({ open: false, apless: "", appl_no: "" })}
			/>

			<ConfirmDialog
				open={confirmSend}
				title="Confirm Send"
				message="Are you sure your selection is correct?"
				onOk={doSend}
				onCancel={() => setConfirmSend(false)}
			/>

			<ConfirmDialog
				open={confirmPickSave}
				title="Save Pick-up"
				message={`Save pick-up for ${checkedPickup.size} item(s)?`}
				onOk={doPickSave}
				onCancel={() => setConfirmPickSave(false)}
			/>

			{activeCam && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div
						role="dialog"
						aria-modal="true"
						aria-label={`CAM ${activeCam.ctx.applno} detail`}
						className="flex max-h-[90vh] w-[95vw] flex-col overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-2xl"
					>
						<div className="min-h-0 flex-1 overflow-y-auto">
							{activeCam.ctx.status === "Edit" ? (
								<CamEditTabs
									ctx={activeCam.ctx}
									initialMenu={activeCam.menu}
									initialSubmenu={1}
									onHome={() => setActiveCam(null)}
								/>
							) : (
								<CamViewTabs
									ctx={activeCam.ctx}
									initialMenu={activeCam.menu}
									initialSubmenu={1}
									onHome={() => setActiveCam(null)}
								/>
							)}
						</div>
					</div>
				</div>
			)}

			{sendCmo && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<CamSendCmoPage
						applNos={sendCmo.applNos}
						multiple={sendCmo.multiple}
						onDone={() => {
							setSendCmo(null);
							setCheckedAppl(new Set());
							setMultipleMode(false);
							fetchRows();
						}}
					/>
				</div>
			)}

			{approvalApplNo && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<CamApproval
						applNo={approvalApplNo}
						onClose={() => {
							setApprovalApplNo(null);
							fetchRows();
						}}
					/>
				</div>
			)}

			{rejectWatchlist && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<CamRejectWatchlistPage
						apless={rejectWatchlist.apless}
						applNo={rejectWatchlist.applNo}
						onDone={() => {
							setRejectWatchlist(null);
							fetchRows();
						}}
					/>
				</div>
			)}

			{editTarget && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<CamEditPage
						apless={editTarget.apless}
						applNo={editTarget.applNo}
						indCor={editTarget.indCor}
						c2c={editTarget.c2c}
						onDone={({ apless, applNo, ctx, purpoffinc, contType, restructuringChange, goPublic }) => {
							setEditTarget(null);
							setActiveCam({
								menu: 1,
								ctx: {
									finType: ctx.finType,
									indCor: ctx.indCor,
									repeat: "1",
									guarantor: ctx.guarantor,
									newCar: ctx.newCar,
									status: ctx.status,
									purpoffinc,
									c2c: ctx.c2c,
									contType,
									apless,
									applno: applNo,
									boa: ctx.boa,
									bot: ctx.bot,
									akseskhusus: ctx.akseskhusus,
									restructuringChange,
									goPublic,
								},
							});
						}}
						onClose={() => setEditTarget(null)}
					/>
				</div>
			)}
		</div>
	);
};

export default CamOnHandPage;
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ReactNode } from "react";
import api from '@/shared/api/axiosInstance';

export interface CamTabHandle {
	save: () => void;
}

export interface CAMFinancingCommissionPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	contType?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

interface LookupOption {
	value: string;
	label: string;
}

interface CommissionRow {
	sdType: string;
	sdTypeLabel: string;
	salesNo: string;
	name: string;
	address: string;
	bank: string;
	accName: string;
	accNo: string;
	amount: number;
	canEditDelete: boolean;
}

interface AccountRow {
	bankDesc: string;
	bankBranch: string;
	accName: string;
	accNo: string;
	isDefault: boolean;
	amount: number | string | null;
	checked: boolean;
	amountDisabled: boolean;
	checkboxDisabled: boolean;
}

interface Dealer {
	name: string;
	no: string;
	address: string;
}

interface CommissionView {
	accountBlocked: boolean;
	blockMessage: string;
	rows: CommissionRow[];
	totalCommission: number;
	totalIncentive: number;
	sisaIncentive: number;
	dealer: Dealer;
	sdTypeOptions: LookupOption[];
	commissionTypeLabel: string;
	comType: string;
}

interface SalesRow {
	salesNo: string;
	name: string;
	address: string;
	status: string;
}

interface EditTarget {
	salesNo: string;
	sdType: string;
	accNo: string;
}

const num = (value: any): number => {
	if (value === null || value === undefined) return 0;
	const parsed = parseFloat(String(value).replace(/,/g, ""));
	return Number.isFinite(parsed) ? parsed : 0;
};

const isBlank = (value: any) => value === null || value === undefined || String(value).trim() === "";

const fmt = (value: any) => Math.round(num(value)).toLocaleString("en-US");

const boxClass =
	"h-7 rounded border border-[var(--app-border)] bg-[var(--app-card)] px-1.5 text-sm text-[var(--app-text)] " +
	"read-only:bg-[var(--app-surface)] read-only:text-[var(--app-muted)] disabled:cursor-not-allowed disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)] disabled:opacity-70";

const selectClass =
	"h-7 rounded border border-[var(--app-border)] bg-white px-1.5 text-sm text-[var(--app-text)] [&>option]:bg-white " +
	"disabled:cursor-not-allowed disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)] disabled:opacity-70 " +
	"disabled:[&>option]:bg-[var(--app-surface)]";

const buttonClass =
	"rounded border border-[#CC5200] bg-[#FF6600] px-4 py-1 text-sm text-white hover:bg-[#E65C00] disabled:opacity-50";

const headCell = "border border-black bg-[#0066FF] px-1 py-1 text-center text-xs font-bold text-white";
const labelCell = "border border-[var(--app-border)] px-1.5 py-1 text-sm text-[var(--app-text)]";
const gridLabel = "py-[3px] pr-2 align-top text-sm text-[var(--app-text)]";
const actionButton = "rounded border border-[#CC5200] bg-[#FF6600] px-2 py-[2px] text-xs text-white hover:bg-[#E65C00] disabled:opacity-50";
const gridValue = "py-[3px] pr-4 align-top";
const wide = "w-[200px]";
const plain = "w-[260px]";

function Box({
	kind = "text",
	value,
	onChange,
	readOnly,
	disabled,
	align = "right",
	className = "",
}: {
	kind?: "money" | "text";
	value: any;
	onChange?: (value: string) => void;
	readOnly?: boolean;
	disabled?: boolean;
	align?: "left" | "right" | "center";
	className?: string;
}) {
	const [draft, setDraft] = useState<string | null>(null);
	const editable = !readOnly && !disabled;
	const raw = value === null || value === undefined ? "" : String(value);
	const shown = kind === "money" ? (draft ?? (isBlank(raw) ? "" : fmt(raw))) : raw;
	const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
	return (
		<input
			type="text"
			inputMode={kind === "money" ? "numeric" : undefined}
			value={shown}
			readOnly={readOnly}
			disabled={disabled}
			onFocus={() => {
				if (!editable) return;
				if (kind === "money") setDraft(isBlank(raw) ? "" : String(Math.round(num(raw))));
			}}
			onChange={(e) => {
				if (!editable) return;
				const next = kind === "money" ? e.target.value.replace(/[^0-9]/g, "") : e.target.value;
				if (kind === "money") setDraft(next);
				onChange?.(next);
			}}
			onBlur={() => {
				if (!editable) return;
				if (kind === "money") setDraft(null);
			}}
			className={`${boxClass} ${alignClass} ${className}`}
		/>
	);
}

function Dropdown({
	value,
	onChange,
	options,
	disabled,
	className = "",
}: {
	value: string;
	onChange: (value: string) => void;
	options: LookupOption[];
	disabled?: boolean;
	className?: string;
}) {
	return (
		<select
			value={value}
			disabled={disabled}
			onChange={(e) => onChange(e.target.value)}
			className={`${selectClass} ${className}`}
		>
			<option value="">Select</option>
			{options.map((o) => (
				<option key={o.value} value={o.value}>{o.label}</option>
			))}
		</select>
	);
}

function Modal({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
			<div className="w-full max-w-3xl rounded-2xl bg-[var(--app-card)] p-4 shadow-lg sm:p-6">
				<div className="judul mb-2 border-b border-[var(--app-border)] pb-1 text-sm font-bold text-[var(--app-text)]">
					{title}
				</div>
				{children}
			</div>
		</div>
	);
}

const SALES_PAGE_SIZE = 10;

function SalesPicker({
	comType,
	onSelect,
	onClose,
}: {
	comType: string;
	onSelect: (row: SalesRow) => void;
	onClose: () => void;
}) {
	const [salesName, setSalesName] = useState("");
	const [allBranches, setAllBranches] = useState(false);
	const [page, setPage] = useState(1);
	const [rows, setRows] = useState<SalesRow[]>([]);
	const [total, setTotal] = useState(0);
	const [busy, setBusy] = useState(false);

	const search = useCallback(async (name: string, branches: boolean, nextPage: number) => {
		setBusy(true);
		try {
			const res = await api.get("/CAM/EditIndex/sales-search", {
				params: {
					name,
					allBranches: branches ? "1" : "0",
					comType,
					page: nextPage,
					pageSize: SALES_PAGE_SIZE,
				},
			});
			setRows(res.data.rows || []);
			setTotal(res.data.total || 0);
		} catch {
			setRows([]);
			setTotal(0);
		} finally {
			setBusy(false);
		}
	}, [comType]);

	const filtersRef = useRef({ salesName, allBranches });
	filtersRef.current = { salesName, allBranches };

	useEffect(() => {
		void search(filtersRef.current.salesName, filtersRef.current.allBranches, page);
	}, [page, search]);

	const runSearch = (branches: boolean) => {
		setAllBranches(branches);
		setPage(1);
		void search(salesName, branches, 1);
	};

	const pages = Math.max(1, Math.ceil(total / SALES_PAGE_SIZE));

	return (
		<Modal title="List Sales">
			<div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-[var(--app-text)]">
				<span>Sales Name</span>
				<input
					type="text"
					value={salesName}
					onChange={(e) => setSalesName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							runSearch(allBranches);
						}
					}}
					className={`${boxClass} ${plain} text-left`}
				/>
				<label className="inline-flex items-center gap-1">
					<input
						type="checkbox"
						checked={allBranches}
						onChange={(e) => runSearch(e.target.checked)}
					/>
					All Branches
				</label>
				<button type="button" onClick={() => runSearch(allBranches)} className={buttonClass}>
					Search
				</button>
				<button type="button" onClick={onClose} className={buttonClass}>
					Close
				</button>
			</div>

			<div className="mb-2 flex items-center gap-2 text-sm text-[var(--app-text)]">
				<button
					type="button"
					disabled={page <= 1}
					onClick={() => setPage((p) => Math.max(1, p - 1))}
					className={buttonClass}
				>
					Prev
				</button>
				<span>Page {page} of {pages}</span>
				<button
					type="button"
					disabled={page >= pages}
					onClick={() => setPage((p) => Math.min(pages, p + 1))}
					className={buttonClass}
				>
					Next
				</button>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full border-collapse border border-[var(--app-border)]">
					<thead>
						<tr>
							<th className={`${headCell} w-[10%]`}>Sales No.</th>
							<th className={`${headCell} w-[30%]`}>Sales Name</th>
							<th className={`${headCell} w-[50%]`}>Address</th>
							<th className={`${headCell} w-[10%]`}>Active/ Inactive</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row, index) => (
							<tr key={`${row.salesNo}-${index}`} style={{ backgroundColor: index % 2 === 0 ? "#E5E5E5" : "#F5F5F5" }}>
								<td className={labelCell}>
									<button
										type="button"
										onClick={() => onSelect(row)}
										className="text-blue-700 underline"
									>
										{row.salesNo}
									</button>
								</td>
								<td className={labelCell}>{row.name}</td>
								<td className={labelCell}>{row.address}</td>
								<td className={labelCell}>{row.status}</td>
							</tr>
						))}
						{!busy && rows.length === 0 && (
							<tr>
								<td className={labelCell} colSpan={4}>&nbsp;</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Modal>
	);
}

function EditCommission({
	applNo,
	target,
	onClose,
	onSaved,
}: {
	applNo: string;
	target: EditTarget;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [loading, setLoading] = useState(true);
	const [sdTypeLabel, setSdTypeLabel] = useState("");
	const [name, setName] = useState("");
	const [address, setAddress] = useState("");
	const [fee, setFee] = useState<string>("");
	const [maxFee, setMaxFee] = useState(0);
	const [messages, setMessages] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let active = true;
		(async () => {
			try {
				const res = await api.get("/CAM/EditIndex/commission/edit", {
					params: {
						applno: applNo,
						salesNo: target.salesNo,
						sdType: target.sdType,
						accNo: target.accNo,
					},
				});
				if (!active) return;
				setSdTypeLabel(res.data.sdTypeLabel || "");
				setName(res.data.name || "");
				setAddress(res.data.address || "");
				setFee(String(res.data.fee ?? ""));
				setMaxFee(res.data.maxFee ?? 0);
			} catch {
				if (active) setMessages(["Failed to load commission. Please try again."]);
			} finally {
				if (active) setLoading(false);
			}
		})();
		return () => { active = false; };
	}, [applNo, target.salesNo, target.sdType, target.accNo]);

	const handleSave = async () => {
		setSaving(true);
		setMessages([]);
		try {
			const res = await api.post("/CAM/EditIndex/commission/edit/save", {
				applno: applNo,
				salesNo: target.salesNo,
				sdType: target.sdType,
				accNo: target.accNo,
				fee,
				maxFee,
			});
			if (res.data.success) {
				onSaved();
				onClose();
			} else {
				setMessages(String(res.data.message || "Failed").split("<br>").filter(Boolean));
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages(String(body?.message || body?.error || "Failed").split("<br>").filter(Boolean));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Modal title="Commission">
			{loading ? (
				<p className="text-sm text-[var(--app-muted)]">Loading…</p>
			) : (
				<table className="w-full border-collapse">
					<tbody>
						<tr>
							<td className={gridLabel}>Commission To</td>
							<td className={gridValue} colSpan={3}>
								<Dropdown
									value={target.sdType}
									onChange={() => undefined}
									options={[{ value: "S", label: "Sales" }, { value: "D", label: "Dealer" }]}
									disabled
									className={wide}
								/>
							</td>
						</tr>
						<tr>
							<td className={`${gridLabel} w-[15%]`}>Sales Name</td>
							<td className={`${gridValue} w-[25%]`}>
								<Box value={name} readOnly align="left" className={plain} />
							</td>
							<td className={`${gridLabel} w-[10%]`}>&nbsp;</td>
							<td className={`${gridValue} w-[50%]`}>&nbsp;</td>
						</tr>
						<tr>
							<td className={gridLabel}>Address</td>
							<td className={gridValue}>
								<textarea
									value={address}
									readOnly
									className={`${plain} h-16 rounded border border-[var(--app-border)] bg-[var(--app-surface)] px-1.5 py-1 text-sm text-[var(--app-muted)]`}
								/>
							</td>
							<td className={gridLabel}>&nbsp;</td>
							<td className={gridValue}>&nbsp;</td>
						</tr>
						<tr>
							<td className={gridLabel}>Fee</td>
							<td className={gridValue}>
								<Box kind="money" value={fee} onChange={setFee} className={wide} />
							</td>
							<td className={gridLabel}>Commission To be Paid</td>
							<td className={gridValue}>
								<Box kind="money" value={maxFee} readOnly className={wide} />
							</td>
						</tr>
						<tr>
							<td colSpan={4} className="pt-4 text-center">
								<button
									type="button"
									onClick={handleSave}
									disabled={saving}
									className={`mr-2 ${buttonClass}`}
								>
									{saving ? "Saving…" : "Save"}
								</button>
								<button type="button" onClick={onClose} className={buttonClass}>
									Cancel
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			)}

			{messages.length > 0 && (
				<div className="message mt-3 space-y-1">
					{messages.map((line, i) => (
						<p key={i} className="text-sm text-red-600">{line}</p>
					))}
				</div>
			)}
		</Modal>
	);
}

const CAMFinancingCommissionPage = forwardRef<CamTabHandle, CAMFinancingCommissionPageProps>(function CAMFinancingCommissionPage({
	apless,
	applNo,
	finType,
	custName,
	contType,
	onSaved,
}, ref) {
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [view, setView] = useState<CommissionView | null>(null);

	const [sdType, setSdType] = useState("");
	const [salesNo, setSalesNo] = useState("");
	const [name, setName] = useState("");
	const [address, setAddress] = useState("");
	const [maxFee, setMaxFee] = useState<number | string>("");
	const [accountRows, setAccountRows] = useState<AccountRow[]>([]);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

	const [messages, setMessages] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);

	const accountRowsRef = useRef<AccountRow[]>([]);
	accountRowsRef.current = accountRows;

	const load = useCallback(async () => {
		setLoading(true);
		setLoadError("");
		try {
			const res = await api.get("/CAM/EditIndex/commission-cam", {
				params: { apless, applno: applNo, contType: contType || "" },
			});
			if (res.data.blocked) {
				setLoadError(res.data.message || "The Application is on approval process or has finished. The Data cannot be changed");
				return;
			}
			setView({
				accountBlocked: !!res.data.accountBlocked,
				blockMessage: res.data.blockMessage || "",
				rows: res.data.rows || [],
				totalCommission: res.data.totalCommission || 0,
				totalIncentive: res.data.totalIncentive || 0,
				sisaIncentive: res.data.sisaIncentive || 0,
				dealer: res.data.dealer || { name: "", no: "", address: "" },
				sdTypeOptions: res.data.sdTypeOptions || [],
				commissionTypeLabel: res.data.commissionTypeLabel || "Incentive",
				comType: res.data.comType || "1",
			});
		} catch {
			setLoadError("Failed to load Commission. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [apless, applNo, contType]);

	useEffect(() => {
		void load();
	}, [load]);

	const loadMaxFee = useCallback(async (nextSdType: string, nextSalesNo: string) => {
		try {
			const res = await api.get("/CAM/EditIndex/commission/max-fee", {
				params: { applno: applNo, salesNo: nextSalesNo, sdType: nextSdType },
			});
			setMaxFee(res.data.maxFee ?? 0);
		} catch {
			setMaxFee(0);
			setMessages(["Failed to calculate Commission To be Paid. Please try again."]);
		}
	}, [applNo]);

	const loadAccounts = useCallback(async (nextSdType: string, nextSalesNo: string) => {
		try {
			const res = await api.get("/CAM/EditIndex/commission/accounts", {
				params: { salesNo: nextSalesNo, applno: applNo, sdType: nextSdType },
			});
			setAccountRows(res.data.rows || []);
		} catch {
			setAccountRows([]);
			setMessages(["Failed to load Payment To accounts. Please try again."]);
		}
	}, [applNo]);

	const loadAccountsAndMaxFee = useCallback(async (nextSdType: string, nextSalesNo: string) => {
		await Promise.all([
			loadMaxFee(nextSdType, nextSalesNo),
			loadAccounts(nextSdType, nextSalesNo),
		]);
	}, [loadMaxFee, loadAccounts]);

	const resetForm = () => {
		setSdType("");
		setSalesNo("");
		setName("");
		setAddress("");
		setMaxFee("");
		setAccountRows([]);
		setMessages([]);
	};

	const handleSdTypeChange = async (value: string) => {
		setSdType(value);
		setMessages([]);
		if (value === "S") {
			setPickerOpen(true);
			return;
		}
		if (value === "") {
			setSalesNo("");
			setName("");
			setAddress("");
			setMaxFee("");
			setAccountRows([]);
			return;
		}
		if (value === "D" && view) {
			setName(view.dealer.name);
			setSalesNo(view.dealer.no);
			setAddress(view.dealer.address);
			await loadAccountsAndMaxFee("D", view.dealer.no);
			try {
				const check = await api.get("/CAM/EditIndex/commission/dealer-check", {
					params: { salesNo: view.dealer.no, sdType: "D" },
				});
				if (!check.data.valid) setMessages([check.data.message]);
			} catch {
				setMessages(["Failed to check dealer NPWP. Please try again."]);
			}
		}
	};

	const handlePickSales = async (row: SalesRow) => {
		setPickerOpen(false);
		setName(row.name);
		setSalesNo(row.salesNo);
		setAddress(row.address);
		await loadAccountsAndMaxFee("S", row.salesNo);
	};

	const updateAccountRow = (accNo: string, patch: Partial<AccountRow>) => {
		setAccountRows((prev) => prev.map((r) => (r.accNo === accNo ? { ...r, ...patch } : r)));
	};

	const handleSave = async () => {
		setSaving(true);
		setMessages([]);
		try {
			const res = await api.post("/CAM/EditIndex/commission-cam/save", {
				apless,
				applno: applNo,
				sdType,
				salesNo,
				maxFee,
				rows: accountRowsRef.current.map((r) => ({
					accNo: r.accNo,
					checked: r.checked,
					amount: r.amount,
				})),
			});
			if (res.data.success) {
				resetForm();
				await load();
			} else {
				setMessages(String(res.data.message || "Failed").split("<br>").filter(Boolean));
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages(String(body?.message || body?.error || "Failed").split("<br>").filter(Boolean));
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (row: CommissionRow) => {
		setMessages([]);
		try {
			const res = await api.post("/CAM/EditIndex/commission/delete", {
				applno: applNo,
				salesNo: row.salesNo,
				accNo: row.accNo,
				feeSales: row.amount,
			});
			if (res.data.success) {
				await load();
			} else {
				setMessages(String(res.data.message || "Failed").split("<br>").filter(Boolean));
			}
		} catch (err: any) {
			const body = err?.response?.data;
			setMessages(String(body?.message || body?.error || "Failed").split("<br>").filter(Boolean));
		}
	};

	const handleNext = useCallback(() => {
		onSaved({ apless, applno: applNo });
	}, [apless, applNo, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

	if (loading) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-[var(--app-muted)]">Loading…</p>
			</div>
		);
	}

	if (loadError) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-red-600">{loadError}</p>
			</div>
		);
	}

	if (!view) return null;

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Commission</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>
			<div className="p-4 sm:p-6">
				<table className="w-full border-collapse">
					<tbody>
						<tr>
							<td className={gridLabel}>Commission Type *</td>
							<td className={gridValue} colSpan={3}>
								<label className="inline-flex items-center gap-1 text-sm text-[var(--app-text)]">
									<input type="radio" name="com_type" checked readOnly />
									{view.commissionTypeLabel}
								</label>
							</td>
						</tr>
						<tr>
							<td className={gridLabel}>Commission To *</td>
							<td className={gridValue} colSpan={3}>
								<Dropdown
									value={sdType}
									onChange={handleSdTypeChange}
									options={view.sdTypeOptions}
									className={wide}
								/>
							</td>
						</tr>
						<tr>
							<td className={`${gridLabel} w-[15%]`}>Commission Receiver Name *</td>
							<td className={`${gridValue} w-[25%]`}>
								<Box value={name} onChange={setName} align="left" className={plain} />
							</td>
							<td className={`${gridLabel} w-[10%]`}>&nbsp;</td>
							<td className={`${gridValue} w-[50%]`}>&nbsp;</td>
						</tr>
						<tr>
							<td className={gridLabel}>Address</td>
							<td className={gridValue}>
								<textarea
									value={address}
									readOnly
									className={`${plain} h-16 rounded border border-[var(--app-border)] bg-[var(--app-surface)] px-1.5 py-1 text-sm text-[var(--app-muted)]`}
								/>
							</td>
							<td className={gridLabel}>Sisa Incentive</td>
							<td className={gridValue}>
								<Box kind="money" value={view.sisaIncentive} readOnly className={wide} />
							</td>
						</tr>
						<tr>
							<td className={gridLabel}>&nbsp;</td>
							<td className={gridValue}>&nbsp;</td>
							<td className={gridLabel}>Commission To be Paid</td>
							<td className={gridValue}>
								<Box kind="money" value={maxFee} readOnly className={wide} />
							</td>
						</tr>

						<tr>
							<td colSpan={4} className="pt-3 text-sm text-[var(--app-text)]">Payment To</td>
						</tr>
						<tr>
							<td colSpan={4}>
								<div className="overflow-x-auto">
									<table className="w-full border-collapse border border-[var(--app-border)]">
										<thead>
											<tr>
												<th className={`${headCell} w-[5%]`}>No</th>
												<th className={`${headCell} w-[15%]`}>Bank Name *</th>
												<th className={`${headCell} w-[20%]`}>Bank Branch *</th>
												<th className={`${headCell} w-[20%]`}>Account Name *</th>
												<th className={`${headCell} w-[15%]`}>Account Number *</th>
												<th className={`${headCell} w-[25%]`}>Gross Commission *</th>
												<th className={`${headCell} w-[5%]`}>Preference *</th>
											</tr>
										</thead>
										<tbody>
											{accountRows.map((row, index) => (
												<tr key={`${row.accNo}-${index}`}>
													<td className={`${labelCell} text-center`}>{index + 1}.</td>
													<td className={`${labelCell} text-center`}>{row.bankDesc}</td>
													<td className={`${labelCell} text-center`}>{row.bankBranch}</td>
													<td className={`${labelCell} text-center`}>{row.accName}</td>
													<td className={`${labelCell} text-center`}>{row.accNo}</td>
													<td className={`${labelCell} text-center`}>
														<Box
															kind="money"
															value={row.amount}
															onChange={(v) => updateAccountRow(row.accNo, { amount: v })}
															disabled={row.amountDisabled || view.accountBlocked}
															className="w-[140px]"
														/>
													</td>
													<td className={`${labelCell} text-center`}>
														<input
															type="checkbox"
															checked={row.checked}
															disabled={row.checkboxDisabled || view.accountBlocked}
															onChange={(e) => updateAccountRow(row.accNo, { checked: e.target.checked })}
														/>
													</td>
												</tr>
											))}
											{accountRows.length === 0 && (
												<tr>
													<td className={labelCell} colSpan={7}>&nbsp;</td>
												</tr>
											)}
										</tbody>
									</table>
								</div>
							</td>
						</tr>

						{!view.accountBlocked && (
							<tr>
								<td colSpan={4} className="pt-4 text-center">
									<button
										type="button"
										onClick={handleSave}
										disabled={saving}
										className={`mr-2 ${buttonClass}`}
									>
										{saving ? "Saving…" : "Save"}
									</button>
									<button type="button" onClick={resetForm} className={buttonClass}>
										Clear
									</button>
								</td>
							</tr>
						)}

						{messages.length > 0 && (
							<tr>
								<td colSpan={4}>
									<div className="message mt-2 space-y-1">
										{messages.map((line, i) => (
											<p key={i} className="text-sm text-red-600">{line}</p>
										))}
									</div>
								</td>
							</tr>
						)}
					</tbody>
				</table>

				<div className="mt-4 overflow-x-auto">
					<table className="w-full border-collapse border border-[var(--app-border)]">
						<thead>
							<tr>
								<th className={`${headCell} w-[10%]`}>Commission To</th>
								<th className={`${headCell} w-[15%]`}>Name</th>
								<th className={`${headCell} w-[30%]`}>Address</th>
								<th className={`${headCell} w-[8%]`}>Bank Name</th>
								<th className={`${headCell} w-[13%]`}>Account Name</th>
								<th className={`${headCell} w-[10%]`}>Account Number</th>
								<th className={`${headCell} w-[10%]`}>Gross Commission</th>
								<th className={`${headCell} w-[5%]`}>&nbsp;</th>
							</tr>
						</thead>
						<tbody>
							{view.rows.map((row, index) => (
								<tr
									key={`${row.salesNo}-${row.accNo}-${index}`}
									style={{ backgroundColor: index % 2 === 0 ? "#E5E5E5" : "#F5F5F5" }}
								>
									<td className={`${labelCell} align-top`}>{row.sdTypeLabel}</td>
									<td className={`${labelCell} align-top`}>{row.name}</td>
									<td className={`${labelCell} align-top`}>{row.address}</td>
									<td className={`${labelCell} align-top`}>{row.bank}</td>
									<td className={`${labelCell} align-top`}>{row.accName}</td>
									<td className={`${labelCell} align-top`}>{row.accNo}</td>
									<td className={`${labelCell} text-right align-top`}>{fmt(row.amount)}</td>
									<td className={`${labelCell} text-center align-top`}>
										{row.canEditDelete && (
											<span className="inline-flex justify-center gap-1">
												<button
													type="button"
													title="Edit"
													onClick={() => setEditTarget({ salesNo: row.salesNo, sdType: row.sdType, accNo: row.accNo })}
													className={actionButton}
												>
													Edit
												</button>
												<button
													type="button"
													title="Delete"
													onClick={() => void handleDelete(row)}
													className={actionButton}
												>
													Delete
												</button>
											</span>
										)}
									</td>
								</tr>
							))}
							<tr>
								<td className={`${labelCell} text-right`} colSpan={6}><strong>Total</strong></td>
								<td className={`${labelCell} text-right`}>{fmt(view.totalCommission)}</td>
								<td className={labelCell}>&nbsp;</td>
							</tr>
							<tr>
								<td className={`${labelCell} text-right`} colSpan={6}><strong>Total Incentive</strong></td>
								<td className={`${labelCell} text-right`}>{fmt(view.totalIncentive)}</td>
								<td className={labelCell}>&nbsp;</td>
							</tr>
							<tr>
								<td className={`${labelCell} text-right`} colSpan={6}><strong>Sisa Incentive</strong></td>
								<td className={`${labelCell} text-right`}>{fmt(view.sisaIncentive)}</td>
								<td className={labelCell}>&nbsp;</td>
							</tr>
						</tbody>
					</table>
				</div>

				{view.blockMessage && (
					<div className="message mt-3">
						<p className="text-sm text-red-600">{view.blockMessage}</p>
					</div>
				)}

				{pickerOpen && (
					<SalesPicker
						comType={view.comType}
						onSelect={handlePickSales}
						onClose={() => setPickerOpen(false)}
					/>
				)}

				{editTarget && (
					<EditCommission
						applNo={applNo}
						target={editTarget}
						onClose={() => setEditTarget(null)}
						onSaved={load}
					/>
				)}
			</div>
		</div>
	);
});

export default CAMFinancingCommissionPage;
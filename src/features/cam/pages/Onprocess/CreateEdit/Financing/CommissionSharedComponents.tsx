import { useCallback, useEffect, useState } from "react";
import api from '@/shared/api/axiosInstance';

export interface SalesPickResult {
	salesNo: string;
	name: string;
	address: string;
}

interface SalesRow {
	salesNo: string;
	name: string;
	address: string;
	status: string;
}

const PAGE_SIZE = 10;

export function SalesDealerPickerModal({
	open,
	comType,
	onClose,
	onSelect,
}: {
	open: boolean;
	comType: string;
	onClose: () => void;
	onSelect: (result: SalesPickResult) => void;
}) {
	const [name, setName] = useState("");
	const [allBranches, setAllBranches] = useState(false);
	const [page, setPage] = useState(1);
	const [rows, setRows] = useState<SalesRow[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);

	const search = useCallback(async () => {
		setLoading(true);
		try {
			const res = await api.get("/CAM/EditIndex/sales-search", {
				params: { name, allBranches: allBranches ? "1" : "0", comType, page, pageSize: PAGE_SIZE },
			});
			setRows(res.data.rows || []);
			setTotal(res.data.total || 0);
		} finally {
			setLoading(false);
		}
	}, [name, allBranches, comType, page]);

	useEffect(() => {
		if (open) search();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, page]);

	if (!open) return null;

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div className="w-full max-w-3xl rounded-2xl bg-[var(--app-card)] p-6 shadow-xl">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-base font-semibold text-[var(--app-text)]">List Sales</h3>
					<button type="button" onClick={onClose} className="text-[var(--app-muted)] hover:text-[var(--app-muted)]">
						✕
					</button>
				</div>

				<div className="mb-4 flex flex-wrap items-center gap-3">
					<label className="text-sm text-[var(--app-muted)]">Sales Name</label>
					<input
						type="text"
						value={name}
						onChange={e => setName(e.target.value)}
						className="rounded-lg border border-[var(--app-border)] p-2 text-sm"
					/>
					<label className="flex items-center gap-1.5 text-sm text-[var(--app-muted)]">
						<input
							type="checkbox"
							checked={allBranches}
							onChange={e => {
								setAllBranches(e.target.checked);
								setPage(1);
							}}
						/>
						All Branches
					</label>
					<button
						type="button"
						onClick={() => {
							setPage(1);
							search();
						}}
						className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
					>
						Search
					</button>
				</div>

				<div className="max-h-96 overflow-y-auto rounded-lg border border-[var(--app-border)]">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-[var(--app-surface)]">
							<tr className="text-left text-[var(--app-muted)]">
								<th className="p-2">Sales No.</th>
								<th className="p-2">Sales Name</th>
								<th className="p-2">Address</th>
								<th className="p-2">Active/Inactive</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td className="p-4 text-center text-[var(--app-muted)]" colSpan={4}>
										Loading…
									</td>
								</tr>
							) : rows.length === 0 ? (
								<tr>
									<td className="p-4 text-center text-[var(--app-muted)]" colSpan={4}>
										No results
									</td>
								</tr>
							) : (
								rows.map(r => (
									<tr
										key={r.salesNo}
										className="cursor-pointer border-t border-[var(--app-border)] hover:bg-[var(--app-surface)]"
										onClick={() => onSelect({ salesNo: r.salesNo, name: r.name, address: r.address })}
									>
										<td className="p-2 font-medium text-blue-600">{r.salesNo}</td>
										<td className="p-2">{r.name}</td>
										<td className="p-2">{r.address}</td>
										<td className="p-2">{r.status}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				<div className="mt-3 flex items-center justify-between text-sm text-[var(--app-muted)]">
					<span>
						Page {page} of {totalPages}
					</span>
					<div className="flex gap-2">
						<button
							type="button"
							disabled={page <= 1}
							onClick={() => setPage(p => Math.max(1, p - 1))}
							className="rounded-lg border border-[var(--app-border)] px-3 py-1 disabled:opacity-40"
						>
							Prev
						</button>
						<button
							type="button"
							disabled={page >= totalPages}
							onClick={() => setPage(p => Math.min(totalPages, p + 1))}
							className="rounded-lg border border-[var(--app-border)] px-3 py-1 disabled:opacity-40"
						>
							Next
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export function EditCommissionModal({
	open,
	applNo,
	salesNo,
	sdType,
	accNo,
	onClose,
	onSaved,
}: {
	open: boolean;
	applNo: string;
	salesNo: string;
	sdType: string;
	accNo: string;
	onClose: () => void;
	onSaved: () => void;
}) {
	const [loading, setLoading] = useState(true);
	const [name, setName] = useState("");
	const [address, setAddress] = useState("");
	const [fee, setFee] = useState(0);
	const [maxFee, setMaxFee] = useState(0);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);

	useEffect(() => {
		if (!open) return;
		setLoading(true);
		setErrors([]);
		api
			.get("/CAM/EditIndex/commission/edit", { params: { applno: applNo, salesNo, sdType, accNo } })
			.then((res: any) => {
				setName(res.data.name || "");
				setAddress(res.data.address || "");
				setFee(res.data.fee || 0);
				setMaxFee(res.data.maxFee || 0);
			})
			.finally(() => setLoading(false));
	}, [open, applNo, salesNo, sdType, accNo]);

	if (!open) return null;

	const handleSave = async () => {
		setSaving(true);
		setErrors([]);
		try {
			const res = await api.post("/CAM/EditIndex/commission/edit", {
				applno: applNo, salesNo, sdType, accNo, fee, maxFee,
			});
			if (res.data.success) {
				onSaved();
				onClose();
			} else {
				setErrors(String(res.data.message || "Please try again.").split("<br>").filter(Boolean));
			}
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
			<div className="w-full max-w-md rounded-2xl bg-[var(--app-card)] p-6 shadow-xl">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-base font-semibold text-[var(--app-text)]">Edit Commission</h3>
					<button type="button" onClick={onClose} className="text-[var(--app-muted)] hover:text-[var(--app-muted)]">
						✕
					</button>
				</div>

				{loading ? (
					<p className="text-sm text-[var(--app-muted)]">Loading…</p>
				) : (
					<div className="space-y-3">
						<div className="space-y-1">
							<label className="block text-sm font-medium text-[var(--app-muted)]">
								{sdType === "D" ? "Dealer Name" : "Sales Name"}
							</label>
							<input type="text" value={name} readOnly className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm" />
						</div>
						<div className="space-y-1">
							<label className="block text-sm font-medium text-[var(--app-muted)]">Address</label>
							<textarea value={address} readOnly className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-sm" />
						</div>
						<div className="flex gap-3">
							<div className="flex-1 space-y-1">
								<label className="block text-sm font-medium text-[var(--app-muted)]">Fee</label>
								<input
									type="text"
									value={fee}
									onChange={e => setFee(Number(e.target.value.replace(/[^\d.]/g, "")) || 0)}
									className="w-full rounded-lg border border-[var(--app-border)] p-2 text-right text-sm"
								/>
							</div>
							<div className="flex-1 space-y-1">
								<label className="block text-sm font-medium text-[var(--app-muted)]">Commission To be Paid</label>
								<input
									type="text"
									value={maxFee}
									readOnly
									className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-right text-sm"
								/>
							</div>
						</div>

						{errors.length > 0 && (
							<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
								{errors.map((e, i) => (
									<p key={i}>{e}</p>
								))}
							</div>
						)}

						<div className="flex justify-end gap-2 pt-2">
							<button
								type="button"
								onClick={onClose}
								className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-[var(--app-text)] hover:bg-slate-300"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleSave}
								disabled={saving}
								className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
							>
								{saving ? "Saving…" : "Save"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
import React, { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

export interface CAMReferencesPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

interface ReferenceRow {
	id: number;
	refName: string;
	refPhone: string;
	remark: string;
}

const EMPTY_FORM = { refName: "", refPhone: "", remark: "" };

const CAMReferencesPage = forwardRef<CamTabHandle, CAMReferencesPageProps>(function CAMReferencesPage({ apless, applNo, finType, custName, onSaved }, ref) {
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState(EMPTY_FORM);
	const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);

	const { data: rows = [], isLoading: loading, isError, refetch } = useQuery({
		queryKey: ['cam-references', apless, applNo],
		queryFn: async (): Promise<ReferenceRow[]> => {
			const res = await api.get("/CAM/EditIndex/references", {
				params: { apless, applno: applNo },
			});
			return res.data.rows || [];
		},
	});

	useEffect(() => {
		if (menuOpenId === null) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpenId(null);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [menuOpenId]);

	const resetForm = () => {
		setForm(EMPTY_FORM);
		setEditingId(null);
	};

	const handleEdit = (row: ReferenceRow) => {
		setEditingId(row.id);
		setForm({ refName: row.refName, refPhone: row.refPhone, remark: row.remark });
		setMenuOpenId(null);
	};

	const handleDelete = async (id: number) => {
		setMenuOpenId(null);
		if (!window.confirm("Delete this reference?")) return;
		setError("");
		try {
			const res = await api.delete("/CAM/EditIndex/references", {
				params: { apless, id },
			});
			if (!res.data.success) {
				setError(res.data.message || "Delete failed.");
				return;
			}
			if (editingId === id) resetForm();
			await refetch();
		} catch {
			setError("Delete failed.");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setError("");
		try {
			const res = await api.post("/CAM/EditIndex/references", {
				apless,
				applno: applNo,
				id: editingId || undefined,
				refName: form.refName,
				refPhone: form.refPhone,
				remark: form.remark,
			});
			if (!res.data.success) {
				setError(res.data.message || "Save failed.");
				return;
			}
			resetForm();
			await refetch();
		} catch {
			setError("Save failed.");
		} finally {
			setSaving(false);
		}
	};

	const handleNext = useCallback(() => {
		onSaved({ apless, applno: applNo });
	}, [apless, applNo, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			{judul && (
				<div className="judul border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-right text-xs font-semibold text-blue-400 sm:px-6">
					{judul}
				</div>
			)}
			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<h2 className="text-xl font-bold text-[var(--app-text)]">References</h2>
				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-6 shadow-sm">
				<form onSubmit={handleSubmit} className="mb-6 space-y-3">
					<div>
						<label className="mb-1 block text-sm text-[var(--app-muted)]">Name *</label>
						<input
							type="text"
							maxLength={100}
							value={form.refName}
							onChange={e => setForm(f => ({ ...f, refName: e.target.value }))}
							className="w-full rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
						/>
					</div>
					<div>
						<label className="mb-1 block text-sm text-[var(--app-muted)]">Telephone Number *</label>
						<input
							type="text"
							maxLength={60}
							value={form.refPhone}
							onChange={e => setForm(f => ({ ...f, refPhone: e.target.value }))}
							className="w-full rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
						/>
					</div>
					<div>
						<label className="mb-1 block text-sm text-[var(--app-muted)]">Remark / Notes *</label>
						<textarea
							maxLength={250}
							rows={3}
							value={form.remark}
							onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
							className="w-full rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
						/>
					</div>

					{(error || isError) && (
						<p className="text-sm text-red-600">{error || "Failed to load references."}</p>
					)}

					<div className="flex gap-2">
						<button
							type="submit"
							disabled={saving}
							className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
						>
							{editingId ? "Update" : "Save"}
						</button>
						{editingId && (
							<button
								type="button"
								onClick={resetForm}
								className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-[var(--app-text)] transition hover:bg-slate-300"
							>
								Cancel
							</button>
						)}
					</div>
				</form>

				<table className="w-full table-fixed text-sm">
					<colgroup>
						<col className="w-10" />
						<col className="w-32" />
						<col className="w-36" />
						<col />
						<col className="w-12" />
					</colgroup>
					<thead>
						<tr className="border-b border-[var(--app-border)] text-[var(--app-muted)]">
							<th className="py-2 pr-2 text-center">No.</th>
							<th className="py-2 pr-2 text-center">Name</th>
							<th className="py-2 pr-2 text-center">Telephone Number</th>
							<th className="py-2 pr-2 text-center">Remark / Notes</th>
							<th className="py-2 text-center"></th>
						</tr>
					</thead>
					<tbody>
						{loading ? (
							<tr>
								<td colSpan={5} className="py-4 text-center text-[var(--app-muted)]">Loading…</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={5} className="py-4 text-center text-[var(--app-muted)]">No references yet.</td>
							</tr>
						) : (
							rows.map((row, idx) => (
								<tr key={row.id} className="border-b border-[var(--app-border)]">
									<td className="py-2 pr-2 text-center align-top">{idx + 1}</td>
									<td className="truncate py-2 pr-2 text-center align-top" title={row.refName}>{row.refName}</td>
									<td className="truncate py-2 pr-2 text-center align-top" title={row.refPhone}>{row.refPhone}</td>
									<td className="whitespace-normal break-words py-2 pr-2 text-left align-top">{row.remark}</td>
									<td className="relative py-2 text-center align-top">
										<div
											className="relative inline-block"
											ref={el => {
												if (row.id === menuOpenId) menuRef.current = el;
											}}
										>
											<button
												type="button"
												onClick={() => setMenuOpenId(menuOpenId === row.id ? null : row.id)}
												className="rounded-lg px-2 py-1 text-lg leading-none text-[var(--app-muted)] hover:bg-[var(--app-surface-alt)]"
												aria-label="Row actions"
											>
												⋮
											</button>
											{menuOpenId === row.id && (
												<div className="absolute right-0 z-10 mt-1 w-28 rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] shadow-lg">
													<button
														type="button"
														onClick={() => handleEdit(row)}
														className="block w-full px-3 py-2 text-left text-xs font-medium text-blue-600 hover:bg-[var(--app-surface)]"
													>
														Edit
													</button>
													<button
														type="button"
														onClick={() => handleDelete(row.id)}
														className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
													>
														Delete
													</button>
												</div>
											)}
										</div>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
				</div>
			</div>
		</div>
	);
});

export default CAMReferencesPage;
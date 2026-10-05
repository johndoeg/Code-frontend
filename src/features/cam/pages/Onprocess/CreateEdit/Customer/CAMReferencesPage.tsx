import React, { useCallback, useState, forwardRef, useImperativeHandle } from "react";
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
	const [message, setMessage] = useState("");

	const { data: rows = [], isLoading: loading, isError, refetch } = useQuery({
		queryKey: ['cam-references', apless, applNo],
		queryFn: async (): Promise<ReferenceRow[]> => {
			const res = await api.get("/CAM/EditIndex/references", {
				params: { apless, applno: applNo },
			});
			return res.data.rows || [];
		},
	});

	const resetForm = () => {
		setForm(EMPTY_FORM);
		setEditingId(null);
	};

	const handleEdit = (row: ReferenceRow) => {
		setEditingId(row.id);
		setForm({ refName: row.refName, refPhone: row.refPhone, remark: row.remark });
		setError("");
		setMessage("");
	};

	const handleDelete = async (id: number) => {
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
			setMessage("Successful");
			await refetch();
		} catch {
			setError("Delete failed.");
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setMessage("");
		const missing: string[] = [];
		if (!form.refName.trim()) missing.push("Name must not empty");
		if (!form.refPhone.trim()) missing.push("Telephone Number must not empty");
		if (!form.remark.trim()) missing.push("Remark/ Notes must not empty");
		if (missing.length) {
			setError(missing.join("\n"));
			return;
		}
		setSaving(true);
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
			setMessage("Successful");
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

	const fieldCls =
		"w-full max-w-md rounded-md border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-1.5 text-[13px] text-[var(--app-text)] transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25";
	const labelCls = "pt-1.5 pr-3 text-[13px] font-medium text-[var(--app-muted)]";
	const th = "border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-center text-[12px] font-semibold text-[var(--app-text)]";
	const td = "px-3 py-2 align-top text-[13px] text-[var(--app-text)]";

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">References</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>

			<div className="px-4 py-5 sm:px-6">
				<form onSubmit={handleSubmit}>
					<div className="grid grid-cols-[15%_minmax(0,1fr)] items-start gap-y-2">
						<label className={labelCls}>Name *</label>
						<div>
							<input
								type="text"
								maxLength={100}
								value={form.refName}
								onChange={e => setForm(f => ({ ...f, refName: e.target.value }))}
								className={fieldCls}
							/>
						</div>

						<label className={labelCls}>Telephone Number *</label>
						<div>
							<input
								type="text"
								maxLength={60}
								value={form.refPhone}
								onChange={e => setForm(f => ({ ...f, refPhone: e.target.value }))}
								className={fieldCls}
							/>
						</div>

						<label className={labelCls}>Remark / Notes *</label>
						<div>
							<textarea
								maxLength={250}
								rows={3}
								value={form.remark}
								onChange={e => setForm(f => ({ ...f, remark: e.target.value }))}
								className={fieldCls}
							/>
						</div>
					</div>

					<div className="mt-3 flex items-center justify-center gap-2">
						<button
							type="submit"
							disabled={saving}
							className="rounded-md bg-orange-500 px-5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
						>
							{editingId ? "Update" : "Save"}
						</button>
						{editingId && (
							<button
								type="button"
								onClick={resetForm}
								className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-1.5 text-[13px] font-medium text-[var(--app-text)] transition hover:bg-[var(--app-surface-alt)]"
							>
								Cancel
							</button>
						)}
					</div>

					<div className="min-h-[1.5rem] py-2 text-[13px]">
						{(error || isError) ? (
							<p className="whitespace-pre-line text-red-600">{error || "Failed to load references."}</p>
						) : message ? (
							<p className="text-green-600">{message}</p>
						) : null}
					</div>
				</form>

				<div className="overflow-x-auto">
					<table className="w-full min-w-[560px] border-collapse">
						<colgroup>
							<col style={{ width: "84px" }} />
							<col style={{ width: "56px" }} />
							<col style={{ width: "22%" }} />
							<col style={{ width: "20%" }} />
							<col />
						</colgroup>
						<thead>
							<tr>
								<th className={th}></th>
								<th className={th}>No.</th>
								<th className={th}>Name</th>
								<th className={th}>Telephone Number</th>
								<th className={th}>Remark / Notes</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr>
									<td colSpan={5} className="py-4 text-center text-[13px] text-[var(--app-muted)]">Loading…</td>
								</tr>
							) : rows.length === 0 ? (
								<tr>
									<td colSpan={5} className="py-4 text-center text-[13px] text-[var(--app-muted)]">No references yet.</td>
								</tr>
							) : (
								rows.map((row, idx) => (
									<tr
										key={row.id}
										className={`${idx % 2 === 0 ? "bg-[var(--app-surface-alt)]" : "bg-[var(--app-surface)]"} ${editingId === row.id ? "outline outline-2 -outline-offset-2 outline-blue-400" : ""}`}
									>
										<td className={`${td} text-center`}>
											<div className="flex items-center justify-center gap-1">
												<button
													type="button"
													title="Edit"
													aria-label="Edit"
													onClick={() => handleEdit(row)}
													className="rounded p-1 text-blue-600 transition hover:bg-blue-500/10"
												>
													<svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M13.6 2.6a2 2 0 012.8 0l1 1a2 2 0 010 2.8L7.5 16.3 3 17l.7-4.5 9.9-9.9z" /></svg>
												</button>
												<button
													type="button"
													title="Delete"
													aria-label="Delete"
													onClick={() => handleDelete(row.id)}
													className="rounded p-1 text-red-600 transition hover:bg-red-500/10"
												>
													<svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 2a1 1 0 00-1 1v1H3.5a.75.75 0 000 1.5h.6l.8 10.2A2 2 0 006.9 17.5h6.2a2 2 0 002-1.8l.8-10.2h.6a.75.75 0 000-1.5H14V3a1 1 0 00-1-1H7zm1.5 2V3.5h3V4h-3zM8 8a.75.75 0 011.5 0v6a.75.75 0 01-1.5 0V8zm3.25-.75A.75.75 0 0112 8v6a.75.75 0 01-1.5 0V8a.75.75 0 01.75-.75z" /></svg>
												</button>
											</div>
										</td>
										<td className={`${td} text-center`}>{idx + 1}</td>
										<td className={`${td} break-words`}>{row.refName}</td>
										<td className={`${td} break-words`}>{row.refPhone}</td>
										<td className={`${td} whitespace-normal break-words`}>{row.remark}</td>
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
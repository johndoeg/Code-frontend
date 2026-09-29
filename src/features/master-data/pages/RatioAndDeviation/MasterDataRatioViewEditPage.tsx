import React, { useEffect, useState, useCallback } from "react";
import api from '@/shared/api/axiosInstance';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface ComboOption { value: string; desc_value: string; }

interface ActualRatioRow {
	id: number;
	ratio: string;
	ratio_desc: string;
	as_of: string;
	remark: string;
	remark_desc: string;
	actual_display: string;
	ojk_display: string;
	actual_from: string;
	actual_to: string;
	ojk_from: string;
	ojk_to: string;
	created_by: string;
	created_date: string;
	update_by: string;
	update_date: string;
}

interface EditForm {
	id: number;
	ratio: string;
	ratio_name: string;
	remark: string;
	as_of: string;
	actual1: string;
	actual2: string;
	ojk1: string;
	ojk2: string;
	created_by: string;
	created_date: string;
}

type FieldType = "select" | "number_x" | "number_pct";

function getFieldConfig(ratio: string): { type: FieldType; suffix: string } {
	if (ratio === "1" || ratio === "5") return { type: "select", suffix: "" };
	if (ratio === "2") return { type: "number_x", suffix: "x" };
	return { type: "number_pct", suffix: "%" };
}

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const Spinner = ({ size = 6 }: { size?: number }) => (
	<svg className={`animate-spin h-${size} w-${size} text-blue-600`} fill="none" viewBox="0 0 24 24">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
	</svg>
);

const ViewEditActualRatioPage: React.FC = () => {

	const [ratioOpts, setRatioOpts] = useState<ComboOption[]>([]);
	const [remarkOpts, setRemarkOpts] = useState<ComboOption[]>([]);
	const [thresOpts, setThresOpts] = useState<ComboOption[]>([]);

	const [ratioFilter, setRatioFilter] = useState("1");
	const [tahunFilter, setTahunFilter] = useState(String(new Date().getFullYear()));
	const [rows, setRows] = useState<ActualRatioRow[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const LIMIT = DEFAULT_PAGE_LIMIT;
	const [listLoading, setListLoading] = useState(false);
	const [listError, setListError] = useState<string | null>(null);

	const [modalOpen, setModalOpen] = useState(false);
	const [editForm, setEditForm] = useState<EditForm | null>(null);
	const [editLoading, setEditLoading] = useState(false);
	const [updateLoading, setUpdateLoading] = useState(false);
	const [updateMsg, setUpdateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const currentYear = new Date().getFullYear();
	const yearOptions = Array.from({ length: 21 }, (_, i) => currentYear + 10 - i);

	useEffect(() => {
		api.get("/MasterData/actual-ratio/options").then(res => {
			setRatioOpts(res.data.ratio || []);
			setRemarkOpts(res.data.remark || []);
			setThresOpts(res.data.threshold || []);
		}).catch(() => { });
	}, []);

	const fetchList = useCallback(async (pg = 1) => {
		if (!ratioFilter || !tahunFilter) return;
		setListLoading(true);
		setListError(null);
		try {
			const res = await api.get("/MasterData/actual-ratio", {
				params: { ratio: ratioFilter, tahun: tahunFilter, page: pg, limit: LIMIT },
			});
			setRows(res.data.data || []);
			setTotal(res.data.total || 0);
			setPage(pg);
		} catch {
			setListError("Failed to load data. Please try again.");
		} finally {
			setListLoading(false);
		}
	}, [ratioFilter, tahunFilter]);

	const openEdit = async (id: number) => {
		setEditLoading(true);
		setUpdateMsg(null);
		setModalOpen(true);
		try {
			const res = await api.get(`/MasterData/actual-ratio/${id}`);
			const d = res.data;
			setEditForm({
				id: d.id,
				ratio: String(d.ratio),
				ratio_name: d.ratio_name || "",
				remark: String(d.remark),
				as_of: d.as_of || "",
				actual1: d.actual_from || "",
				actual2: d.actual_to || "",
				ojk1: d.ojk_from || "",
				ojk2: d.ojk_to || "",
				created_by: d.created_by || "",
				created_date: d.created_date || "",
			});
		} catch {
			setUpdateMsg({ type: "error", text: "Failed to load record." });
		} finally {
			setEditLoading(false);
		}
	};

	const handleUpdate = async () => {
		if (!editForm) return;
		setUpdateMsg(null);
		const { id, ratio, remark, actual1, actual2 } = editForm;
		if (!actual1) {
			setUpdateMsg({ type: "error", text: "Lengkapi data Actual dahulu" });
			return;
		}

		if (remark === "3" && !actual2) {
			setUpdateMsg({ type: "error", text: "Lengkapi data Actual dahulu" });
			return;
		}
		
		setUpdateLoading(true);
		try {
			await api.put(`/MasterData/actual-ratio/${id}`, {
				ratio, remark,
				actual1,
				actual2: remark === "3" ? actual2 : "",
			});
			setUpdateMsg({ type: "success", text: "Data berhasil disimpan" });
			fetchList(page);
		} catch (err: any) {
			setUpdateMsg({ type: "error", text: err.response?.data?.error || "Data gagal disimpan" });
		} finally {
			setUpdateLoading(false);
		}
	};

	const confirmDelete = async () => {
		if (!deleteId) return;
		setDeleteLoading(true);
		try {
			await api.delete(`/MasterData/actual-ratio/${deleteId}`);
			setDeleteId(null);
			fetchList(1);
		} catch {
			alert("Failed to delete record.");
		} finally {
			setDeleteLoading(false);
		}
	};

	const handlePrint = () => {
		window.open(`/MasterData/actual-ratio/print?ratio=${ratioFilter}&tahun=${tahunFilter}`, "_blank");
	};

	const handleExport = () => {
		window.open(`/MasterData/actual-ratio/export?ratio=${ratioFilter}&tahun=${tahunFilter}`, "_blank");
	};

	const renderActualFields = () => {
		if (!editForm) return null;
		const cfg = getFieldConfig(editForm.ratio);
		const showRange = editForm.remark === "3";
		const cls = "border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40";

		const field = (val: string, key: "actual1" | "actual2") =>
			cfg.type === "select" ? (
				<select value={val} onChange={e => setEditForm(f => f ? { ...f, [key]: e.target.value } : f)} className={`${cls} bg-white text-slate-900`}>
					<option value="" style={optionStyle}>Select</option>
					{thresOpts.map(o => <option key={o.value} value={o.value} style={optionStyle}>{o.desc_value}</option>)}
				</select>
			) : (
				<div className="flex items-center gap-1">
					<div className="relative">
						<input type="text" value={val}
							onChange={e => { if (/^[0-9]*\.?[0-9]{0,2}$/.test(e.target.value)) setEditForm(f => f ? { ...f, [key]: e.target.value } : f); }}
							className={`${cls} pr-7`} placeholder="0.00" />
						{val && (
							<button type="button" onClick={() => setEditForm(f => f ? { ...f, [key]: "" } : f)} aria-label="Clear"
								className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] text-base leading-none">
								&times;
							</button>
						)}
					</div>
					<span className="text-sm text-[var(--app-muted)]">{cfg.suffix}</span>
				</div>
			);

		return (
			<div className="flex items-center gap-2 flex-wrap">
				{field(editForm.actual1, "actual1")}
				{showRange && <><span className="text-sm text-[var(--app-muted)] font-medium">s/d</span>{field(editForm.actual2, "actual2")}</>}
			</div>
		);
	};

	const renderOjkFields = () => {
		if (!editForm) return null;
		const cfg = getFieldConfig(editForm.ratio);
		const showRange = editForm.remark === "3";
		const cls = "border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed w-40";

		const field = (val: string) =>
			cfg.type === "select" ? (
				<select value={val} disabled className={cls}>
					<option value="">—</option>
					{thresOpts.map(o => <option key={o.value} value={o.value}>{o.desc_value}</option>)}
				</select>
			) : (
				<div className="flex items-center gap-1">
					<input type="text" value={val} readOnly className={cls} />
					<span className="text-sm text-[var(--app-muted)]">{cfg.suffix}</span>
				</div>
			);

		return (
			<div className="flex items-center gap-2 flex-wrap">
				{field(editForm.ojk1)}
				{showRange && <><span className="text-sm text-[var(--app-muted)] font-medium">s/d</span>{field(editForm.ojk2)}</>}
			</div>
		);
	};

	const totalPages = Math.ceil(total / LIMIT);

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">

					<div className="mb-6">
						<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">View & Edit Actual Ratio</h1>
						<p className="text-[var(--app-muted)] mt-1">Search, edit and export actual ratio records</p>
					</div>

					<div className="bg-[var(--app-surface)] rounded-xl p-4 border border-[var(--app-border)] mb-6">
						<div className="flex flex-wrap items-end gap-4">
							<div className="min-w-[180px]">
								<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Ratio</label>
								<select value={ratioFilter} onChange={e => setRatioFilter(e.target.value)}
									className="w-full px-3 py-2.5 border border-[var(--app-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900">
									{ratioOpts.map(o => <option key={o.value} value={o.value} style={optionStyle}>{o.desc_value}</option>)}
								</select>
							</div>
							<div className="min-w-[120px]">
								<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Period</label>
								<select value={tahunFilter} onChange={e => setTahunFilter(e.target.value)}
									className="w-full px-3 py-2.5 border border-[var(--app-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-900">
									<option value="" style={optionStyle}>Select</option>
									{yearOptions.map(y => <option key={y} value={y} style={optionStyle}>{y}</option>)}
								</select>
							</div>
							<div className="flex gap-3">
								<button onClick={() => fetchList(1)} disabled={listLoading}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
									{listLoading ? <Spinner size={4} /> : (
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
										</svg>
									)}
									Search
								</button>
								<button onClick={handlePrint}
									className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
									</svg>
									Print
								</button>
								<button onClick={handleExport}
									className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
									</svg>
									Export to Excel
								</button>
							</div>
						</div>
					</div>

					{listError && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
							<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>{listError}</span>
						</div>
					)}

					<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
						<table className="w-full text-sm">
							<thead>
								<tr>
									<th className="py-3 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)] w-12" rowSpan={2}>No.</th>
									<th className="py-3 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)]" rowSpan={2}>As Of</th>
									<th className="py-3 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)]" rowSpan={2}>Remark</th>
									<th className="py-3 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)]" colSpan={2}>Amount / Category</th>
									<th className="py-3 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)]" rowSpan={2}>Create By</th>
									<th className="py-3 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)]" rowSpan={2}>Create Date</th>
									<th className="py-3 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)]" rowSpan={2}>Update By</th>
									<th className="py-3 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)]" rowSpan={2}>Update Date</th>
									<th className="py-3 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)]" rowSpan={2}>Action</th>
								</tr>
								<tr>
									<th className="py-2 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)]">Actual</th>
									<th className="py-2 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)]">Threshold Level (OJK)</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--app-border)]">
								{listLoading ? (
									<tr><td colSpan={10} className="py-10 text-center"><div className="flex justify-center"><Spinner size={8} /></div></td></tr>
								) : rows.length === 0 ? (
									<tr>
										<td colSpan={10} className="py-10 text-center text-[var(--app-muted)]">
											<svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
											</svg>
											<p>Select Ratio and Period then click Search</p>
										</td>
									</tr>
								) : (
									rows.map((row, idx) => (
										<tr key={row.id} className={`hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]/50"}`}>
											<td className="py-2.5 px-4 border border-[var(--app-border)] text-center text-[var(--app-muted)]">{(page - 1) * LIMIT + idx + 1}</td>
											<td className="py-2.5 px-4 border border-[var(--app-border)] text-center">{row.as_of}</td>
											<td className="py-2.5 px-4 border border-[var(--app-border)] text-center">{row.remark_desc}</td>
											<td className="py-2.5 px-4 border border-[var(--app-border)] text-center font-mono">{row.actual_display}</td>
											<td className="py-2.5 px-4 border border-[var(--app-border)] text-center font-mono">{row.ojk_display}</td>
											<td className="py-2.5 px-4 border border-[var(--app-border)] text-center">{row.created_by}</td>
											<td className="py-2.5 px-4 border border-[var(--app-border)] text-center">{row.created_date}</td>
											<td className="py-2.5 px-4 border border-[var(--app-border)] text-center">{row.update_by}</td>
											<td className="py-2.5 px-4 border border-[var(--app-border)] text-center">{row.update_date}</td>
											<td className="py-2.5 px-4 border border-[var(--app-border)] text-center">
												<div className="flex items-center justify-center gap-2">
													<button onClick={() => openEdit(row.id)}
														className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-xs font-medium flex items-center gap-1">
														<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
														</svg>
														Edit
													</button>
													<button onClick={() => setDeleteId(row.id)}
														className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-medium flex items-center gap-1">
														<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
														</svg>
														Delete
													</button>
												</div>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between text-sm text-[var(--app-muted)]">
							<span>Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
							<div className="flex gap-2">
								<button onClick={() => fetchList(page - 1)} disabled={page === 1 || listLoading}
									className="px-3 py-1.5 border border-[var(--app-border)] rounded-lg hover:bg-[var(--app-surface)] disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
								<button onClick={() => fetchList(page + 1)} disabled={page >= totalPages || listLoading}
									className="px-3 py-1.5 border border-[var(--app-border)] rounded-lg hover:bg-[var(--app-surface)] disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
							</div>
						</div>
					)}
				</div>
			</div>

			{modalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
					onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
					<div className="bg-[var(--app-card)] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">

						<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--app-border)] bg-[var(--app-surface)]">
							<h2 className="text-lg font-bold text-[var(--app-text)]">
								{editForm ? editForm.ratio_name : "Edit Record"}
							</h2>
							<button onClick={() => setModalOpen(false)} className="text-[var(--app-muted)] hover:text-[var(--app-muted)] text-2xl leading-none">&times;</button>
						</div>

						<div className="px-6 py-5 space-y-4">
							{editLoading ? (
								<div className="flex justify-center py-6"><Spinner size={8} /></div>
							) : editForm ? (
								<>
									<div className="grid grid-cols-2 gap-6">
										<div>
											<label className="block text-sm font-medium text-[var(--app-text)] mb-1">As of</label>
											<input type="text" value={editForm.as_of} readOnly
												className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed" />
										</div>
										<div>
											<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Create By</label>
											<input type="text" value={editForm.created_by} readOnly
												className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed" />
										</div>
									</div>

									<div className="grid grid-cols-2 gap-6">
										<div>
											<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Remark</label>
											<select value={editForm.remark} disabled
												className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed">
												<option value="">—</option>
												{remarkOpts.map(o => <option key={o.value} value={o.value}>{o.desc_value}</option>)}
											</select>
										</div>
										<div>
											<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Create Date</label>
											<input type="text" value={editForm.created_date} readOnly
												className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed" />
										</div>
									</div>

									<div className="border-t border-[var(--app-border)] pt-1">
										<p className="text-xs font-bold text-[var(--app-muted)] uppercase tracking-wider">Amount / Category</p>
									</div>

									<div className="grid grid-cols-[160px_1fr] items-center gap-4">
										<label className="text-sm font-medium text-[var(--app-text)]">Actual</label>
										{renderActualFields()}
									</div>

									<div className="grid grid-cols-[160px_1fr] items-center gap-4">
										<label className="text-sm font-medium text-[var(--app-text)]">
											Threshold Level (OJK)
										</label>
										{renderOjkFields()}
									</div>
								</>
							) : null}

							{updateMsg && (
								<div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${updateMsg.type === "success"
									? "bg-green-50 border border-green-200 text-green-700"
									: "bg-red-50 border border-red-200 text-red-700"
									}`}>
									{updateMsg.type === "success" ? (
										<svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
											<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
										</svg>
									) : (
										<svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
									)}
									{updateMsg.text}
								</div>
							)}
						</div>

						<div className="px-6 py-4 border-t border-[var(--app-border)] bg-[var(--app-surface)] flex justify-end gap-3">
							<button onClick={() => setModalOpen(false)}
								className="px-4 py-2 border border-[var(--app-border)] text-[var(--app-text)] rounded-lg hover:bg-[var(--app-surface-alt)] text-sm font-medium">
								Close
							</button>
							{!editLoading && editForm && (
								<button onClick={handleUpdate} disabled={updateLoading}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50">
									{updateLoading ? <><Spinner size={4} /> Updating…</> : (
										<>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
											</svg>
											Update
										</>
									)}
								</button>
							)}
						</div>
					</div>
				</div>
			)}

			{deleteId !== null && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
						<div className="flex items-center gap-3 mb-4">
							<div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
								<svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
								</svg>
							</div>
							<div>
								<h3 className="font-bold text-[var(--app-text)]">Delete Record</h3>
								<p className="text-sm text-[var(--app-muted)] mt-0.5">Are you sure to delete this record?</p>
							</div>
						</div>
						<div className="flex justify-end gap-3">
							<button onClick={() => setDeleteId(null)}
								className="px-4 py-2 border border-[var(--app-border)] text-[var(--app-text)] rounded-lg hover:bg-[var(--app-surface-alt)] text-sm font-medium">
								Cancel
							</button>
							<button onClick={confirmDelete} disabled={deleteLoading}
								className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50">
								{deleteLoading ? <><Spinner size={4} /> Deleting…</> : "Delete"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default ViewEditActualRatioPage;
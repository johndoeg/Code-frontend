import React, { useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

interface Option {
	value: string;
	label: string;
}

interface BusinessHistoryRow {
	id: number;
	fromMonth: string;
	fromYear: string;
	untilMonth: string;
	untilYear: string;
	company: string;
	companyAddress: string;
	position: string;
	positionLabel: string;
	positionOther: string;
	employeeId: string;
	areaCd: string;
	province: string;
	city: string;
	postcode: string;
	phone: string;
}

interface BusinessHistoryData {
	lesseeCat: string;
	positions: Option[];
	rows: BusinessHistoryRow[];
}

export interface CAMBusinessHistoryPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

const fieldBase =
	"w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2 text-[13px] text-[var(--app-text)] shadow-sm transition-colors placeholder:text-[var(--app-muted)]/50 hover:border-[var(--app-muted)]/50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:bg-[var(--app-surface-alt)] disabled:text-[var(--app-muted)] disabled:shadow-none";
const fieldRO =
	"w-full cursor-default rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-alt)] px-3 py-2 text-[13px] font-medium text-[var(--app-muted)]";

function Field({ label, required, children, className = "" }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
	return (
		<div className={`grid grid-cols-[130px_minmax(0,1fr)] items-start gap-x-3 ${className}`}>
			<label className="pt-2 text-[13px] font-medium text-[var(--app-muted)]">
				{label}
				{required && <span className="ml-0.5 text-red-400">*</span>}
			</label>
			<div>{children}</div>
		</div>
	);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5 sm:px-6">
			<span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
			<h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--app-text)]">{children}</h3>
		</div>
	);
}

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 101 }, (_, i) => String(CURRENT_YEAR - i));

const formatPeriod = (month: string, year: string) => (month === "00" ? "Present" : `${month}-${year}`);

const emptyForm = {
	fromMonth: "", fromYear: "", untilMonth: "", untilYear: "",
	company: "", companyAddress: "", position: "", positionOther: "",
	employeeId: "", areaCd: "", province: "", city: "", postcode: "", phone: "",
};

const CAMBusinessHistoryPage = forwardRef<CamTabHandle, CAMBusinessHistoryPageProps>(function CAMBusinessHistoryPage({ apless, applNo, finType, custName, onSaved }, ref) {
	const [savingRow, setSavingRow] = useState(false);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const [editingId, setEditingId] = useState<number | null>(null);
	const [form, setForm] = useState(emptyForm);

	const setField = (key: keyof typeof emptyForm, value: string) => setForm(prev => ({ ...prev, [key]: value }));

	const { data: loadResult, isLoading, isError, refetch } = useQuery({
		queryKey: ['cam-business-history', apless, applNo],
		queryFn: async (): Promise<{ data: BusinessHistoryData; areas: Option[] }> => {
			const [historyRes, areasRes] = await Promise.all([
				api.get("/CAM/EditIndex/business-history", { params: { apless, applno: applNo } }),
				api.get("/CAM/Combo/provinces-and-cities"),
			]);
			return { data: historyRes.data, areas: areasRes.data };
		},
	});

	const data = loadResult?.data ?? null;
	const areas = loadResult?.areas ?? [];

	const resetForm = () => {
		setEditingId(null);
		setForm(emptyForm);
	};

	const startEdit = (row: BusinessHistoryRow) => {
		setEditingId(row.id);
		setForm({
			fromMonth: row.fromMonth,
			fromYear: row.fromYear,
			untilMonth: row.untilMonth === "00" ? "13" : row.untilMonth,
			untilYear: row.untilYear,
			company: row.company,
			companyAddress: row.companyAddress,
			position: row.position,
			positionOther: row.positionOther,
			employeeId: row.employeeId,
			areaCd: row.areaCd,
			province: row.province,
			city: row.city,
			postcode: row.postcode,
			phone: row.phone,
		});
	};

	const handleAreaChange = (value: string) => {
		setField("areaCd", value);
		const area = areas.find(a => a.value === value);
		if (area) {
			const [prov, city] = area.label.split(" - ");
			setField("province", prov || "");
			setField("city", city || "");
		} else {
			setField("province", "");
			setField("city", "");
		}
	};

	const handleUntilMonthChange = (value: string) => {
		setField("untilMonth", value);
		if (value === "13") setField("untilYear", String(CURRENT_YEAR));
	};

	const handleSaveRow = async () => {
		const errs: string[] = [];
		if (!form.fromMonth) errs.push("Month (From) must not be empty.");
		if (!form.fromYear) errs.push("Year (From) must not be empty.");
		if (!form.untilMonth) errs.push("Month (Until) must not be empty.");
		if (form.untilMonth !== "13" && !form.untilYear) errs.push("Year (Until) must not be empty.");
		if (form.untilMonth !== "13" && form.fromYear > form.untilYear) errs.push("Year (From) must not exceed Year (Until).");
		if (!form.company.trim()) errs.push("Company must not be empty.");
		if (!form.position) errs.push("Position must not be empty.");
		if (!form.positionOther.trim()) errs.push("Position Other must not be empty.");
		if (!form.areaCd) errs.push("Area must not be empty.");
		if (!form.postcode.trim()) errs.push("Post Code must not be empty.");
		if (errs.length > 0) {
			alert(errs.join("\n"));
			return;
		}

		setSavingRow(true);
		try {
			const res = await api.post("/CAM/EditIndex/business-history", {
				apless,
				applno: applNo,
				id: editingId || 0,
				fromMonth: form.fromMonth,
				fromYear: form.fromYear,
				untilMonth: form.untilMonth === "13" ? "00" : form.untilMonth,
				untilYear: form.untilMonth === "13" ? "0000" : form.untilYear,
				company: form.company,
				companyAddress: form.companyAddress,
				position: form.position,
				positionOther: form.positionOther,
				employeeId: form.employeeId,
				areaCd: form.areaCd,
				postcode: form.postcode,
				phone: form.phone,
			});
			if (res.data.success) {
				resetForm();
				await refetch();
			} else {
				alert(res.data.message || "Save failed.");
			}
		} catch {
			alert("Save failed. Please try again.");
		} finally {
			setSavingRow(false);
		}
	};

	const handleDeleteRow = async (id: number) => {
		if (!window.confirm("Are you sure you want to delete this entry?")) return;
		setDeletingId(id);
		try {
			await api.delete("/CAM/EditIndex/business-history", { params: { apless, id } });
			if (editingId === id) resetForm();
			await refetch();
		} catch {
			alert("Delete failed. Please try again.");
		} finally {
			setDeletingId(null);
		}
	};

	const handleNext = useCallback(() => {
		if (!data || data.rows.length === 0) {
			alert("Please fill in Business/ Job History.");
			return;
		}
		onSaved({ apless, applno: applNo });
	}, [data, apless, applNo, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

	if (isLoading || !data) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}
	if (isError) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
				Failed to load business history. Please try again.
				<button onClick={() => refetch()} className="underline ml-4">Retry</button>
			</div>
		);
	}

	const showEmployeeId = data.lesseeCat === "EM";
	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");
	const untilYearDisabled = form.untilMonth === "13";

	const th = "border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-left text-[12px] font-semibold text-[var(--app-text)] whitespace-nowrap";
	const td = "px-3 py-2.5 align-top text-[13px] text-[var(--app-text)]";

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3 sm:px-6">
				<div>
					<h2 className="text-[17px] font-bold text-[var(--app-text)]">Business / Job History</h2>
					<p className="text-xs text-[var(--app-muted)]">Customer No. {apless || "(new)"}</p>
				</div>
				{judul && <span className="text-xs font-bold text-blue-700">{judul}</span>}
			</div>

			<SectionTitle>{editingId ? "Edit Entry" : "Add Entry"}</SectionTitle>
			<div className="grid grid-cols-1 gap-x-10 gap-y-3 px-4 py-5 sm:px-6 lg:grid-cols-2">
				<Field label="Period" required className="lg:col-span-2">
					<div className="flex flex-wrap items-center gap-2">
						<select className={`${fieldBase} !w-24`} value={form.fromMonth} onChange={e => setField("fromMonth", e.target.value)}>
							<option value="">Month</option>
							{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
						</select>
						<select className={`${fieldBase} !w-28`} value={form.fromYear} onChange={e => setField("fromYear", e.target.value)}>
							<option value="">Year</option>
							{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
						</select>
						<span className="px-1 text-[13px] text-[var(--app-muted)]">to</span>
						<select className={`${fieldBase} !w-28`} value={form.untilMonth} onChange={e => handleUntilMonthChange(e.target.value)}>
							<option value="">Month</option>
							<option value="13">Present</option>
							{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
						</select>
						<select
							className={`${fieldBase} !w-28`}
							value={form.untilYear}
							disabled={untilYearDisabled}
							onChange={e => setField("untilYear", e.target.value)}
						>
							<option value="">Year</option>
							{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
						</select>
					</div>
				</Field>

				{showEmployeeId && (
					<Field label="Employee ID No." className="lg:col-span-2">
						<input className={`${fieldBase} max-w-sm`} value={form.employeeId} onChange={e => setField("employeeId", e.target.value)} maxLength={25} />
					</Field>
				)}

				<Field label="Company Name" required>
					<input className={fieldBase} value={form.company} onChange={e => setField("company", e.target.value)} maxLength={100} />
				</Field>
				<Field label="Position" required>
					<div className="flex flex-col gap-2">
						<select className={fieldBase} value={form.position} onChange={e => setField("position", e.target.value)}>
							<option value="">Select</option>
							{data.positions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
						<input
							className={fieldBase}
							placeholder="Position Other *"
							value={form.positionOther}
							onChange={e => setField("positionOther", e.target.value)}
							maxLength={100}
						/>
					</div>
				</Field>

				<Field label="Company Address" className="lg:col-span-2">
					<textarea className={`${fieldBase} resize-y`} rows={2} value={form.companyAddress} onChange={e => setField("companyAddress", e.target.value)} maxLength={500} />
				</Field>

				<Field label="Area" required>
					<select className={fieldBase} value={form.areaCd} onChange={e => handleAreaChange(e.target.value)}>
						<option value="">Select</option>
						{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
					</select>
				</Field>
				<Field label="Province">
					<input className={fieldRO} value={form.province} readOnly />
				</Field>
				<Field label="District / City" required>
					<input className={fieldRO} value={form.city} readOnly />
				</Field>
				<Field label="Post Code" required>
					<input
						className={fieldBase}
						value={form.postcode}
						maxLength={5}
						inputMode="numeric"
						onChange={e => setField("postcode", e.target.value.replace(/\D/g, ""))}
					/>
				</Field>
				<Field label="Phone">
					<input
						className={fieldBase}
						value={form.phone}
						maxLength={20}
						inputMode="numeric"
						onChange={e => setField("phone", e.target.value.replace(/\D/g, ""))}
					/>
				</Field>
			</div>

			<div className="flex justify-end gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface)]/50 px-4 py-3 sm:px-6">
				{editingId && (
					<button
						type="button"
						onClick={resetForm}
						className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-5 py-2 text-[13px] font-medium text-[var(--app-muted)] transition hover:bg-[var(--app-surface)]"
					>
						Cancel
					</button>
				)}
				<button
					type="button"
					onClick={handleSaveRow}
					disabled={savingRow}
					className="rounded-lg bg-blue-600 px-5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
				>
					{savingRow ? "Saving…" : editingId ? "Update Entry" : "Add Entry"}
				</button>
			</div>

			<SectionTitle>Existing Entries</SectionTitle>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[880px] border-collapse">
					<thead>
						<tr>
							<th className={th} style={{ width: "84px" }}></th>
							<th className={th}>No.</th>
							<th className={th}>From</th>
							<th className={th}>Until</th>
							<th className={th}>Company Name</th>
							<th className={th}>District / City</th>
							<th className={th}>Post Code</th>
							{showEmployeeId && <th className={th}>Employee ID No.</th>}
							<th className={th}>Position</th>
							<th className={th}>Phone</th>
						</tr>
					</thead>
					<tbody>
						{data.rows.map((row, idx) => (
							<tr
								key={row.id}
								className={`${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]/60"} ${editingId === row.id ? "outline outline-2 -outline-offset-2 outline-blue-400" : ""}`}
							>
								<td className={td}>
									<div className="flex items-center gap-1">
										<button
											type="button"
											title="Edit"
											aria-label="Edit"
											onClick={() => startEdit(row)}
											className="rounded p-1 text-blue-600 transition hover:bg-blue-500/10"
										>
											<svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M13.6 2.6a2 2 0 012.8 0l1 1a2 2 0 010 2.8L7.5 16.3 3 17l.7-4.5 9.9-9.9z" /></svg>
										</button>
										<button
											type="button"
											title="Delete"
											aria-label="Delete"
											onClick={() => handleDeleteRow(row.id)}
											disabled={deletingId === row.id}
											className="rounded p-1 text-red-600 transition hover:bg-red-500/10 disabled:opacity-40"
										>
											<svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 2a1 1 0 00-1 1v1H3.5a.75.75 0 000 1.5h.6l.8 10.2A2 2 0 006.9 17.5h6.2a2 2 0 002-1.8l.8-10.2h.6a.75.75 0 000-1.5H14V3a1 1 0 00-1-1H7zm1.5 2V3.5h3V4h-3zM8 8a.75.75 0 011.5 0v6a.75.75 0 01-1.5 0V8zm3.25-.75A.75.75 0 0112 8v6a.75.75 0 01-1.5 0V8a.75.75 0 01.75-.75z" /></svg>
										</button>
									</div>
								</td>
								<td className={td}>{idx + 1}</td>
								<td className={`${td} whitespace-nowrap`}>{formatPeriod(row.fromMonth, row.fromYear)}</td>
								<td className={`${td} whitespace-nowrap`}>{formatPeriod(row.untilMonth, row.untilYear)}</td>
								<td className={`${td} break-words`}>{row.company}</td>
								<td className={td}>{row.city}</td>
								<td className={td}>{row.postcode}</td>
								{showEmployeeId && <td className={td}>{row.employeeId}</td>}
								<td className={td}>{row.positionLabel} ({row.positionOther})</td>
								<td className={td}>{row.phone}</td>
							</tr>
						))}
						{data.rows.length === 0 && (
							<tr>
								<td colSpan={showEmployeeId ? 10 : 9} className={`${td} py-6 text-center text-[var(--app-muted)]`}>
									No entries yet.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
});

export default CAMBusinessHistoryPage;
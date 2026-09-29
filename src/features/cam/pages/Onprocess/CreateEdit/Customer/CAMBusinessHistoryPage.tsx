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

const cellLabel =
	"border-b border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 py-2.5 align-top text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] whitespace-nowrap";
const cellValue = "border-b border-[var(--app-border)] px-4 py-2.5 align-top text-sm text-[var(--app-text)]";
const cellEmpty = "border-b border-[var(--app-border)] px-4 py-2.5";

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-t border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-3 first:border-t-0">
			<h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{children}</h2>
		</div>
	);
}

function Row({
	left,
	right,
}: {
	left?: [string, React.ReactNode];
	right?: [string, React.ReactNode];
}) {
	return (
		<tr>
			{left ? (
				<>
					<td className={cellLabel}>{left[0]}</td>
					<td className={cellValue}>{left[1]}</td>
				</>
			) : (
				<>
					<td className={cellEmpty}></td>
					<td className={cellEmpty}></td>
				</>
			)}
			{right ? (
				<>
					<td className={cellLabel}>{right[0]}</td>
					<td className={cellValue}>{right[1]}</td>
				</>
			) : (
				<>
					<td className={cellEmpty}></td>
					<td className={cellEmpty}></td>
				</>
			)}
		</tr>
	);
}

function FullRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<tr>
			<td className={cellLabel}>{label}</td>
			<td colSpan={3} className={cellValue}>{children}</td>
		</tr>
	);
}

const inputCls =
	"border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full bg-[var(--app-card)] focus:outline-none focus:ring-2 focus:ring-blue-400";
const inputClsDisabled =
	"border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed";
const fieldCls = (disabled?: boolean) => (disabled ? inputClsDisabled : inputCls);

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

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			{judul && (
				<div className="judul border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-right text-xs font-semibold text-blue-400 sm:px-6">
					{judul}
				</div>
			)}
			<div>
				<h2 className="text-xl font-bold text-[var(--app-text)] mb-1">Business / Job History</h2>
				<p className="text-sm text-[var(--app-muted)] mb-4">Customer No. {apless || "(new)"}</p>

				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					<SectionHeader>{editingId ? "Edit Entry" : "Add Entry"}</SectionHeader>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[820px] border-collapse text-sm">
							<tbody>
								<FullRow label="Period (From - Until) *">
									<div className="flex flex-wrap items-center gap-2">
										<select className={inputCls} style={{ width: "80px" }} value={form.fromMonth} onChange={e => setField("fromMonth", e.target.value)}>
											<option value="">Month</option>
											{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
										</select>
										<select className={inputCls} style={{ width: "90px" }} value={form.fromYear} onChange={e => setField("fromYear", e.target.value)}>
											<option value="">Year</option>
											{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
										</select>
										<span className="text-sm text-[var(--app-muted)]">to</span>
										<select className={inputCls} style={{ width: "110px" }} value={form.untilMonth} onChange={e => handleUntilMonthChange(e.target.value)}>
											<option value="">Month</option>
											<option value="13">Present</option>
											{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
										</select>
										<select
											className={fieldCls(untilYearDisabled)}
											style={{ width: "90px" }}
											value={form.untilYear}
											disabled={untilYearDisabled}
											onChange={e => setField("untilYear", e.target.value)}
										>
											<option value="">Year</option>
											{YEARS.map(y => <option key={y} value={y}>{y}</option>)}
										</select>
									</div>
								</FullRow>

								{showEmployeeId && (
									<Row left={["Employee ID No.", (
										<input className={inputCls} value={form.employeeId} onChange={e => setField("employeeId", e.target.value)} maxLength={25} />
									)]} />
								)}

								<Row
									left={["Position *", (
										<div className="flex flex-col gap-2">
											<select className={inputCls} value={form.position} onChange={e => setField("position", e.target.value)}>
												<option value="">Select</option>
												{data.positions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											<input
												className={inputCls}
												placeholder="Position Other"
												value={form.positionOther}
												onChange={e => setField("positionOther", e.target.value)}
												maxLength={100}
											/>
										</div>
									)]}
									right={["Company Name *", (
										<input className={inputCls} value={form.company} onChange={e => setField("company", e.target.value)} maxLength={100} />
									)]}
								/>

								<FullRow label="Company Address">
									<textarea className={inputCls} value={form.companyAddress} onChange={e => setField("companyAddress", e.target.value)} maxLength={500} />
								</FullRow>

								<Row
									left={["Area *", (
										<select className={inputCls} value={form.areaCd} onChange={e => handleAreaChange(e.target.value)}>
											<option value="">Select</option>
											{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Province", (
										<input className={fieldCls(true)} value={form.province} readOnly />
									)]}
								/>
								<Row
									left={["District / City *", (
										<input className={fieldCls(true)} value={form.city} readOnly />
									)]}
									right={["Post Code *", (
										<input
											className={inputCls}
											value={form.postcode}
											maxLength={5}
											inputMode="numeric"
											onChange={e => setField("postcode", e.target.value.replace(/\D/g, ""))}
										/>
									)]}
								/>
								<Row left={["Phone", (
									<input
										className={inputCls}
										value={form.phone}
										maxLength={20}
										inputMode="numeric"
										onChange={e => setField("phone", e.target.value.replace(/\D/g, ""))}
									/>
								)]} />
							</tbody>
						</table>
					</div>

					<div className="flex justify-end gap-3 px-6 py-4">
						{editingId && (
							<button
								onClick={resetForm}
								className="px-6 py-2 border border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-surface)] rounded-lg text-sm font-medium"
							>
								Cancel
							</button>
						)}
						<button
							onClick={handleSaveRow}
							disabled={savingRow}
							className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium"
						>
							{savingRow ? "Saving…" : editingId ? "Update Entry" : "Add Entry"}
						</button>
					</div>

					<SectionHeader>Existing Entries</SectionHeader>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[960px] border-collapse text-sm">
							<tbody>
								<tr>
									<td className={cellLabel}>No.</td>
									<td className={cellLabel}>From</td>
									<td className={cellLabel}>Until</td>
									<td className={cellLabel}>Company Name</td>
									<td className={cellLabel}>District / City</td>
									<td className={cellLabel}>Post Code</td>
									{showEmployeeId && <td className={cellLabel}>Employee ID No.</td>}
									<td className={cellLabel}>Position</td>
									<td className={cellLabel}>Phone</td>
									<td className={cellLabel}>Actions</td>
								</tr>
								{data.rows.map((row, idx) => (
									<tr key={row.id}>
										<td className={cellValue}>{idx + 1}</td>
										<td className={cellValue}>{formatPeriod(row.fromMonth, row.fromYear)}</td>
										<td className={cellValue}>{formatPeriod(row.untilMonth, row.untilYear)}</td>
										<td className={cellValue}>{row.company}</td>
										<td className={cellValue}>{row.city}</td>
										<td className={cellValue}>{row.postcode}</td>
										{showEmployeeId && <td className={cellValue}>{row.employeeId}</td>}
										<td className={cellValue}>{row.positionLabel} ({row.positionOther})</td>
										<td className={cellValue}>{row.phone}</td>
										<td className={cellValue}>
											<div className="flex gap-3">
												<button onClick={() => startEdit(row)} className="text-xs font-medium text-blue-600 hover:underline">
													Edit
												</button>
												<button
													onClick={() => handleDeleteRow(row.id)}
													disabled={deletingId === row.id}
													className="text-xs font-medium text-red-600 hover:underline disabled:text-[var(--app-muted)]"
												>
													{deletingId === row.id ? "Deleting…" : "Delete"}
												</button>
											</div>
										</td>
									</tr>
								))}
								{data.rows.length === 0 && (
									<tr>
										<td colSpan={showEmployeeId ? 10 : 9} className={cellValue + " text-center text-[var(--app-muted)]"}>
											No entries yet.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
});

export default CAMBusinessHistoryPage;
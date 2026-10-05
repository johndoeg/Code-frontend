import { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

export interface CAMEquipmentCrossCollateralPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

interface CrossCollateralRow {
	leaseNo: string;
	customerName: string;
	brand: string;
	type: string;
	installmentPaid: number | null;
	installmentTenor: number | null;
	crossCollateral: boolean;
	remark: string;
}

const headCell = "px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-[var(--app-muted)]";
const bodyCell = "px-3 py-2 text-center align-top text-sm text-[var(--app-text)]";

export default forwardRef<CamTabHandle, CAMEquipmentCrossCollateralPageProps>(
	function CAMEquipmentCrossCollateralPage({ apless, applNo, finType, custName, onSaved }, ref) {
		const [rows, setRows] = useState<CrossCollateralRow[]>([]);
		const [saving, setSaving] = useState(false);
		const [saveError, setSaveError] = useState("");
		const [message, setMessage] = useState("");

		const { data, isLoading: loading, isError } = useQuery({
			queryKey: ['cam-cross-collateral', apless, applNo],
			queryFn: async () => {
				const res = await api.get("/CAM/EditIndex/cross-collateral", { params: { apless, applno: applNo } });
				return (res.data.rows || []) as CrossCollateralRow[];
			},
		});

		useEffect(() => {
			if (data) setRows(data);
		}, [data]);

		const toggleRow = (leaseNo: string) =>
			setRows(prev => prev.map(r => (r.leaseNo === leaseNo ? { ...r, crossCollateral: !r.crossCollateral } : r)));

		const handleNext = useCallback(async () => {
			setSaving(true);
			setSaveError("");
			setMessage("");
			try {
				const res = await api.post("/CAM/EditIndex/cross-collateral/next", {
					apless,
					applno: applNo,
					rows: rows.map(r => ({ leaseNo: r.leaseNo, crossCollateral: r.crossCollateral })),
				});
				if (res.data.success) {
					setMessage("Successful");
					onSaved({ apless, applno: applNo });
				} else {
					setSaveError(res.data.message || "Save failed.");
				}
			} catch (err: any) {
				setSaveError(err?.response?.data?.message || "Save failed. Please try again.");
			} finally {
				setSaving(false);
			}
		}, [apless, applNo, rows, onSaved]);

		useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

		if (loading) {
			return (
				<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
					<p className="text-sm text-[var(--app-muted)]">Loading…</p>
				</div>
			);
		}

		const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

		return (
			<div className="space-y-4 overflow-hidden rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl">
				<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
					<div className="flex items-center gap-2.5">
						<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
							<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
								<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
							</svg>
						</span>
						<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Cross Collateral</h2>
					</div>
					{judul && (
						<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
					)}
				</div>

				<div className="space-y-4 px-4 pb-4 sm:px-6">
					{isError && (
						<p className="message mb-2 text-sm text-red-600">
							Failed to load cross collateral data. Please try again.
						</p>
					)}

					<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
						<table className="w-full min-w-[820px] border-collapse text-sm">
							<colgroup>
								<col style={{ width: "6%" }} />
								<col style={{ width: "21%" }} />
								<col style={{ width: "15%" }} />
								<col style={{ width: "18%" }} />
								<col style={{ width: "17%" }} />
								<col style={{ width: "12%" }} />
								<col style={{ width: "11%" }} />
							</colgroup>
							<thead>
								<tr className="table_head bg-[var(--app-surface-alt)]">
									<th className={headCell}>No.</th>
									<th className={headCell}>Customer name</th>
									<th className={headCell}>Contract Number</th>
									<th className={headCell}>Brand / Type</th>
									<th className={headCell}>Installment</th>
									<th className={`${headCell} whitespace-nowrap`}>Cross Collateral</th>
									<th className={headCell}>Remarks</th>
								</tr>
							</thead>
							<tbody>
								{rows.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-3 py-6 text-center text-sm text-[var(--app-muted)]">
											No other contracts found for this customer.
										</td>
									</tr>
								) : (
									rows.map((row, idx) => (
										<tr
											key={row.leaseNo}
											className={idx % 2 === 0 ? "bg-[var(--app-surface)]" : "bg-[var(--app-card)]"}
										>
											<td className={bodyCell}>{idx + 1}</td>
											<td className={bodyCell}>{row.customerName}</td>
											<td className={bodyCell}>{row.leaseNo}</td>
											<td className={bodyCell}>
												{row.brand} / {row.type}
											</td>
											<td className={bodyCell}>
												{row.installmentPaid ?? ""} / {row.installmentTenor ?? ""}
											</td>
											<td className={bodyCell}>
												<input
													type="checkbox"
													checked={row.crossCollateral}
													onChange={() => toggleRow(row.leaseNo)}
												/>
											</td>
											<td className={bodyCell}>{row.remark || ""}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{saveError && <p className="message mt-3 text-sm text-red-600">{saveError}</p>}
					{saving && <p className="mt-3 text-sm text-[var(--app-muted)]">Saving…</p>}
					{message && !saveError && <div className="message mt-3 text-sm text-[var(--app-muted)]">{message}</div>}
				</div>
			</div>
		);
	}
);
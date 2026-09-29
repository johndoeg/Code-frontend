import { useState, useRef, useEffect, useCallback } from "react";
import api from '@/shared/api/axiosInstance';

interface Customer {
	apless: string;
	lessee_nm: string;
}

interface ContractRow {
	lease_no: string;
	outs_princ: number;
	period: number;
	tenor: number;
	late: number;
	ntf: number;
	tenor_app: string;
}

interface ReportData {
	rows: ContractRow[];
	tot_out: number;
	tot_ntf: number;
	grand_total: number;
}

const fmtNum = (v: number) =>
	new Intl.NumberFormat("id-ID").format(Math.round(v));

interface AutocompleteProps {
	onSelect: (apless: string, name: string) => void;
}

function CustomerAutocomplete({ onSelect }: AutocompleteProps) {
	const [term, setTerm] = useState<string>("");
	const [suggestions, setSuggestions] = useState<Customer[]>([]);
	const [open, setOpen] = useState<boolean>(false);
	const [fetching, setFetching] = useState<boolean>(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const wrapRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const handleChange = (val: string) => {
		setTerm(val);
		setSuggestions([]);

		if (timerRef.current) clearTimeout(timerRef.current);

		if (val.length < 2) { setOpen(false); return; }

		timerRef.current = setTimeout(async () => {
			setFetching(true);
			try {
				const res = await api.get<Customer[]>("/CAM/Others/CustomerOutstanding/autocomplete", {
					params: { term: val },
				});
				setSuggestions(res.data);
				setOpen(res.data.length > 0);
			} catch {
				setSuggestions([]);
			} finally {
				setFetching(false);
			}
		}, 300);
	};

	const handleSelect = (c: Customer) => {
		setTerm(`${c.apless} - ${c.lessee_nm}`);
		setSuggestions([]);
		setOpen(false);
		onSelect(c.apless, c.lessee_nm);
	};

	return (
		<div ref={wrapRef} className="relative w-full max-w-md">
			<div className="relative">
				<input
					type="text"
					value={term}
					onChange={(e) => handleChange(e.target.value)}
					placeholder="Type customer name or APLESS… (min. 2 chars)"
					className="w-full px-3 py-2 border border-[var(--app-border)] rounded-lg text-sm
						focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
						bg-[var(--app-card)] text-[var(--app-text)]"
				/>
				{fetching && (
					<svg className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-[var(--app-muted)]"
						fill="none" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10"
							stroke="currentColor" strokeWidth="4" />
						<path className="opacity-75" fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
				)}
			</div>

			{open && suggestions.length > 0 && (
				<ul className="absolute z-50 w-full mt-1 bg-[var(--app-card)] border border-[var(--app-border)]
					rounded-lg shadow-xl max-h-60 overflow-y-auto">
					{suggestions.map((c) => (
						<li
							key={c.apless}
							onMouseDown={() => handleSelect(c)}
							className="px-4 py-2 text-sm cursor-pointer hover:bg-[var(--app-surface)] flex gap-2"
						>
							<span className="font-medium text-blue-700 whitespace-nowrap">{c.apless}</span>
							<span className="text-[var(--app-muted)] truncate">— {c.lessee_nm}</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

const CustomerOutstandingReport: React.FC = () => {
	const [selectedLabel, setSelectedLabel] = useState<string>("");
	const [data, setData] = useState<ReportData | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const handleSelect = useCallback(async (apless: string, name: string) => {
		setSelectedLabel(`${apless} — ${name}`);
		setData(null);
		setError(null);
		setLoading(true);
		try {
			const res = await api.get<ReportData>("/CAM/Others/CustomerOutstanding/data", {
				params: { apless },
			});
			setData(res.data);
		} catch {
			setError("Gagal memuat data. Silakan coba lagi.");
		} finally {
			setLoading(false);
		}
	}, []);

	const TH = "px-3 py-2 text-xs font-semibold text-[var(--app-muted)] bg-[var(--app-surface)] border border-[var(--app-border)] text-center";
	const TD = "px-3 py-1.5 text-sm border border-[var(--app-border)]";
	const TDR = `${TD} text-right tabular-nums`;

	return (
		<div className="min-h-screen bg-[var(--app-surface)] p-4 md:p-6">
			<div className="max-w-full mx-auto">

				<div className="mb-6">
					<h1 className="text-2xl font-semibold text-[var(--app-text)]">Customer Outstanding Report</h1>
					<p className="text-sm text-[var(--app-muted)] mt-1">
						Search by customer name or APLESS code
					</p>
				</div>

				<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] p-4 mb-6">
					<label className="block text-xs font-medium text-[var(--app-muted)] mb-2">
						Customer Name / APLESS
					</label>
					<CustomerAutocomplete onSelect={handleSelect} />

					{selectedLabel && (
						<p className="mt-2 text-xs text-[var(--app-muted)]">
							Selected: <span className="font-medium text-[var(--app-text)]">{selectedLabel}</span>
						</p>
					)}
				</div>

				{error && (
					<div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
						{error}
					</div>
				)}

				{loading && (
					<div className="py-12 text-center text-sm text-[var(--app-muted)]">Memuat data…</div>
				)}

				{!loading && !data && !error && (
					<div className="py-16 text-center text-sm text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-xl">
						Ketik nama customer atau APLESS untuk memulai
					</div>
				)}

				{!loading && data && data.rows.length === 0 && (
					<div className="py-16 text-center text-sm text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-xl">
						Tidak ada data outstanding untuk customer ini
					</div>
				)}

				{!loading && data && data.rows.length > 0 && (
					<>
						<div className="grid grid-cols-3 gap-3 mb-4">
							{[
								{ label: "Total Disbursement Outstanding", value: fmtNum(data.tot_out) },
								{ label: "Total Approved Outstanding", value: fmtNum(data.tot_ntf) },
								{ label: "Grand Total", value: fmtNum(data.grand_total) },
							].map((m) => (
								<div key={m.label} className="bg-[var(--app-card)] rounded-lg border border-[var(--app-border)] p-3">
									<div className="text-xs text-[var(--app-muted)] mb-1">{m.label}</div>
									<div className="text-base font-semibold tabular-nums text-[var(--app-text)]">{m.value}</div>
								</div>
							))}
						</div>

						<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full border-collapse text-sm">
									<thead>
										<tr>
											<th rowSpan={2} className={TH} style={{ width: "12%" }}>
												Contract No.
											</th>
											<th colSpan={2} className={`${TH} border-l border-[var(--app-border)]`}>
												Disbursement
											</th>
											<th className={TH}>Quality</th>
											<th colSpan={2} className={TH}>Approved</th>
										</tr>
										<tr>
											<th className={`${TH} border-l border-[var(--app-border)]`} style={{ width: "16%" }}>
												Outstanding Principal
											</th>
											<th className={TH} style={{ width: "14%" }}>
												Payment of Tenor
											</th>
											<th className={TH} style={{ width: "14%" }}>
												Maks. Late Day
											</th>
											<th className={TH} style={{ width: "14%" }}>
												Outstanding Principal
											</th>
											<th className={TH} style={{ width: "12%" }}>
												Tenor
											</th>
										</tr>
									</thead>
									<tbody>
										{data.rows.map((row, i) => (
											<tr key={row.lease_no + i}
												className={i % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}>
												<td className={TD + " font-medium text-[var(--app-text)] whitespace-nowrap"}>
													{row.lease_no}
												</td>
												<td className={TDR}>{fmtNum(row.outs_princ)}</td>
												<td className={TDR}>{row.period} of {row.tenor}</td>
												<td className={TDR}>{row.late}</td>
												<td className={TDR}>{fmtNum(row.ntf)}</td>
												<td className={TDR}>{row.tenor_app}</td>
											</tr>
										))}

										<tr className="bg-[var(--app-surface)] font-semibold">
											<td className={TD + " text-right"}>TOTAL</td>
											<td className={TDR}>{fmtNum(data.tot_out)}</td>
											<td className={TD} />
											<td className={TD + " text-right"}>TOTAL</td>
											<td className={TDR}>{fmtNum(data.tot_ntf)}</td>
											<td className={TD} />
										</tr>

										<tr className="bg-blue-100 font-bold">
											<td className={TD + " text-right"}>GRAND TOTAL</td>
											<td className={TDR}>{fmtNum(data.grand_total)}</td>
											<td className={TD} />
											<td className={TD} />
											<td className={TD} />
											<td className={TD} />
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default CustomerOutstandingReport;
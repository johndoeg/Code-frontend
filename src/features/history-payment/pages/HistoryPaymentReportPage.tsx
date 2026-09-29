import React, { useState, useCallback } from "react";
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface PaymentRecord {
	LESSEE_NM: string;
	LESSEE_NO: string;
	LEASE_NO: string;
	POLICENO?: string;
	CHASIS?: string;
	ENGINE?: string;
	MSTR_CL?: string;
	ADDRESS: string;
	PHONE1: string;
	EXECUTION?: string;
	UPD_STAT?: string;
}

interface SearchParams {
	printBy: string;
	policeNo?: string;
	leaseNo?: string;
	lesseeNo?: string;
	lesseeNm?: string;
	masterNo?: string;
	typeCust?: "1" | "2";
	page: number;
	limit: number;
}

interface ContractInfo {
	COMPANY_NAME?: string;
	LESSEE_NO: string; trans_code: string; LESSEE_NM: string;
	ADDRESS: string; PHONE1: string; PHONE2: string; PHONE3: string;
	BPKB_AN: string; POLICENO: string; CHASIS: string; ENGINE: string;
	TAHUN: string; COLOUR: string; suppname: string; TYPE_NM: string;
	MODEL_NM: string; BRANCH_NAME: string; DATEBLOKIR: string;
	NOPOLBLOKIR: string; status_kontrak: string; JFG: string;
}

interface PaymentRow {
	girono: string; girodt: string; payment: string; bank: string;
	nominal: number; period: string; penalty: number; Shortage: number;
	inkaso: number; status: string | null; reject_description: string;
	penalty_payment: number; ShortagePay: number; InkasoPay: number;
}

interface PrintRow {
	no: string;
	girono: string;
	girodt: string;
	bank: string;
	nominal: number;
	odDays: string;
	status: string | null;
	payment: string;
	penalty: number;
	remark: string;
}

interface LeaseReport {
	leaseNo: string;
	contractInfo: ContractInfo;
	rows: PrintRow[];
	totAmount: number; totPenalty: number; totShortage: number; totInkaso: number;
	penaltyPayment: number; shortagePay: number; inkasoPay: number;
}

interface RawLeaseReport {
	leaseNo: string;
	contractInfo: ContractInfo;
	payments: PaymentRow[];
}

const fmt = (n: number) => (n ? n.toLocaleString("id-ID") : "0");
const todayLong = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const todayShort = () => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });

const parseDmy = (value: string): Date | null => {
	const parts = String(value || "").split("-");
	if (parts.length !== 3) return null;
	const [d, m, y] = parts.map(Number);
	if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
	return new Date(y, m - 1, d);
};

const overdueDays = (payment: string, girodt: string): string => {
	const paid = parseDmy(payment);
	const due = parseDmy(girodt);
	if (!paid || !due) return "";
	const diff = Math.floor((paid.getTime() - due.getTime()) / 86400000);
	return String(diff > 0 ? diff : 0);
};

const buildReports = (raw: RawLeaseReport[]): LeaseReport[] => {
	let girono = "";

	return raw.map(({ leaseNo, contractInfo, payments }) => {
		let i = 0;
		let j = 0;
		let totAmount = 0;
		let totPenalty = 0;
		let totShortage = 0;
		let totInkaso = 0;
		let penaltyPayment = 0;
		let shortagePay = 0;
		let inkasoPay = 0;

		const rows: PrintRow[] = payments.map((row) => {
			if (i === 1) {
				penaltyPayment = row.penalty_payment ?? 0;
				shortagePay = row.ShortagePay ?? 0;
				inkasoPay = row.InkasoPay ?? 0;
			}

			if ((row.girono ?? "") === girono) {
				girono = "";
			} else {
				i++;
				girono = row.girono ?? "";
			}

			if (!String(row.period ?? "").includes("*")) {
				j++;
				totAmount += row.nominal ?? 0;
			}

			totPenalty += row.penalty ?? 0;
			totShortage += row.Shortage ?? 0;
			totInkaso += (row.inkaso ?? 0) * 25000;

			return {
				no: String(j),
				girono,
				girodt: row.girodt ?? "",
				bank: row.bank ?? "",
				nominal: row.nominal ?? 0,
				odDays: row.status != null ? overdueDays(row.payment ?? "", row.girodt ?? "") : "",
				status: row.status,
				payment: row.payment ?? "",
				penalty: row.penalty ?? 0,
				remark: row.reject_description ?? "",
			};
		});

		return {
			leaseNo, contractInfo, rows,
			totAmount, totPenalty, totShortage, totInkaso,
			penaltyPayment, shortagePay, inkasoPay,
		};
	});
};

const PrintPreview: React.FC<{ reports: LeaseReport[]; onBack: () => void }> = ({ reports, onBack }) => (
	<>
		<style>{`
			.page {
				position: relative;
				isolation: isolate;
			}

			.page::before {
				content: "";
				position: absolute;
				inset: 0;
				background: url('/images/new_logo_genie.svg') center center repeat;
				background-size: 220px;
				opacity: 0.035;
				filter: grayscale(100%);
				pointer-events: none;
				z-index: -1;
			}

			@media print {
				@page { margin: 10mm; }

				html, body {
					margin: 0 !important;
					padding: 0 !important;
					height: auto !important;
					min-height: 0 !important;
					overflow: visible !important;
					background: #fff !important;
				}

				body *:not(:has(.print-area)):not(.print-area):not(.print-area *) {
					display: none !important;
				}

				body :has(.print-area) {
					display: block !important;
					position: static !important;
					margin: 0 !important;
					padding: 0 !important;
					border: 0 !important;
					width: auto !important;
					max-width: none !important;
					height: auto !important;
					min-height: 0 !important;
					overflow: visible !important;
					background: #fff !important;
					box-shadow: none !important;
				}

				.no-print { display: none !important; }

				.print-area {
					display: block !important;
					margin: 0 !important;
					padding: 0 !important;
					background: #fff !important;
					min-height: 0 !important;
					font-family: Tahoma, sans-serif;
					font-size: 10px;
					color: #000;
				}

				.page {
					box-shadow: none !important;
					margin: 0 !important;
					padding: 0 !important;
					max-width: 100% !important;
					background: #fff !important;
					page-break-after: always;
					break-after: page;
				}

				.page:last-child {
					page-break-after: auto;
					break-after: auto;
				}

				.page::before {
					opacity: 0.03;
					-webkit-print-color-adjust: exact;
					print-color-adjust: exact;
				}

				.page table { font-family: Tahoma, sans-serif; font-size: 10px; }
			}
		`}</style>

		<div className="no-print sticky top-0 z-10 bg-[var(--app-card)] border-b border-[var(--app-border)] px-6 py-3 flex items-center justify-between shadow-sm">
			<button
				onClick={onBack}
				className="flex items-center gap-2 px-4 py-2 text-[var(--app-text)] bg-[var(--app-surface-alt)] hover:bg-gray-200 rounded-lg transition font-medium"
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
				</svg>
				Back to Search
			</button>

			<span className="text-sm text-[var(--app-muted)] font-medium">
				{reports.length} contract{reports.length !== 1 ? "s" : ""} — Customer History Payment Report
			</span>

			<button
				onClick={() => window.print()}
				className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium shadow"
			>
				<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
						d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
				</svg>
				Print
			</button>
		</div>

		<div className="print-area bg-[var(--app-surface-alt)] min-h-screen py-6 px-4">
			{reports.map((rpt, idx) => {
				const ci = rpt.contractInfo;
				const td: React.CSSProperties = { border: "1px solid #000", padding: "2px 4px" };

				return (
					<div key={rpt.leaseNo} className="page bg-[var(--app-card)] mx-auto mb-6 p-6 shadow-md"
						style={{ maxWidth: 1050, fontFamily: "Tahoma, sans-serif", fontSize: 12 }}>

						<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
							<tbody>
								<tr>
									<td style={{ width: "76%" }}>{[ci.COMPANY_NAME, ci.BRANCH_NAME].filter(Boolean).join(" - ")} Branch</td>
									<td>Date: {todayShort()}</td>
								</tr>
								<tr>
									<td />
									<td>Page: {idx + 1}</td>
								</tr>
							</tbody>
						</table>

						<div style={{ textAlign: "center", marginBottom: 8 }}>
							<strong><u>CUSTOMER HISTORY PAYMENT REPORT</u><br />As of {todayLong()}</strong>
						</div>

						<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8 }}>
							<tbody>
								<tr>
									<td style={{ width: "15%" }}>Transaction Code</td>
									<td style={{ width: "33%" }}>: {ci.trans_code}</td>
									<td style={{ width: "10%" }} rowSpan={2}>Address</td>
									<td style={{ width: "42%" }} rowSpan={2}>: {ci.ADDRESS}</td>
								</tr>
								<tr>
									<td>Customer No.</td>
									<td>: {ci.LESSEE_NO}</td>
								</tr>
								<tr>
									<td>Contract No.</td>
									<td>: {rpt.leaseNo} \ {ci.LESSEE_NM}</td>
									<td>Telp</td>
									<td>: {[ci.PHONE1, ci.PHONE2, ci.PHONE3].filter(Boolean).join(", ")}</td>
								</tr>
							</tbody>
						</table>

						<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
							<thead>
								<tr style={{ backgroundColor: "#f0f0f0", textAlign: "center" }}>
									{["No.", "Giro No.", "Date Due", "Bank", "Amount", "OD Days", "Sts", "Payment Date", "Penalty Charge", "Remark"].map(h => (
										<th key={h} style={td}>{h}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{rpt.rows.map((row, ri) => (
									<tr key={ri}>
										<td style={{ ...td, textAlign: "center" }}>{row.no}</td>
										<td style={{ ...td, textAlign: "center" }}>{row.girono}</td>
										<td style={{ ...td, textAlign: "center" }}>{row.girodt}</td>
										<td style={{ ...td, textAlign: "center" }}>{row.bank}</td>
										<td style={{ ...td, textAlign: "right" }}>{fmt(row.nominal)}</td>
										<td style={{ ...td, textAlign: "center" }}>{row.odDays}</td>
										<td style={{ ...td, textAlign: "center" }}>{row.status}</td>
										<td style={{ ...td, textAlign: "center" }}>{row.payment}</td>
										<td style={{ ...td, textAlign: "right" }}>{fmt(row.penalty)}</td>
										<td style={td}>{row.remark}</td>
									</tr>
								))}

								<tr>
									<td colSpan={4} style={{ ...td, textAlign: "right" }}><strong>TOTAL</strong></td>
									<td style={{ ...td, textAlign: "right" }}><strong>{fmt(rpt.totAmount)}</strong></td>
									<td colSpan={3} style={td} />
									<td style={{ ...td, textAlign: "right" }}><strong>{fmt(rpt.totPenalty)}</strong></td>
									<td style={{ ...td, textAlign: "right" }}><strong>{fmt(rpt.totShortage)}</strong></td>
									<td style={{ ...td, textAlign: "right" }}><strong>{fmt(rpt.totInkaso)}</strong></td>
									<td style={td} />
								</tr>
								<tr>
									<td colSpan={8} style={{ ...td, textAlign: "right" }}><strong>TOTAL PAYMENT</strong></td>
									<td style={{ ...td, textAlign: "right" }}><strong>{fmt(rpt.penaltyPayment)}</strong></td>
									<td style={{ ...td, textAlign: "right" }}><strong>{fmt(rpt.shortagePay)}</strong></td>
									<td style={{ ...td, textAlign: "right" }}><strong>{fmt(rpt.inkasoPay)}</strong></td>
									<td style={td} />
								</tr>
							</tbody>
						</table>

						<table style={{ width: "100%", borderCollapse: "collapse" }}>
							<tbody>
								<tr>
									<td style={{ width: "11%" }}>Supplier</td>
									<td style={{ width: "35%" }}>: {ci.suppname}</td>
									<td style={{ width: "7%" }}>Chasis</td>
									<td style={{ width: "18%" }}>: {ci.CHASIS}</td>
									<td style={{ width: "10%" }}>Blocking Date</td>
									<td style={{ width: "19%" }}>: {ci.DATEBLOKIR}</td>
								</tr>
								<tr>
									<td>BPKB A/N</td>
									<td>: {ci.BPKB_AN}</td>
									<td>Engine</td>
									<td>: {ci.ENGINE}</td>
									<td>No. Blocking</td>
									<td>: {ci.NOPOLBLOKIR}</td>
								</tr>
								<tr>
									<td>Police No.</td>
									<td>: {ci.POLICENO}</td>
									<td>Year</td>
									<td>: {ci.TAHUN}</td>
									<td>Contract Status</td>
									<td>: {ci.status_kontrak} {ci.JFG}</td>
								</tr>
								<tr>
									<td>Type</td>
									<td>: {ci.TYPE_NM}</td>
									<td>Colour</td>
									<td colSpan={3}>: {ci.COLOUR}</td>
								</tr>
								<tr>
									<td>Model</td>
									<td>: {ci.MODEL_NM}</td>
									<td />
									<td colSpan={3} />
								</tr>
							</tbody>
						</table>
					</div>
				);
			})}
		</div>
	</>
);

const HistoryPaymentReportPage: React.FC = () => {
	const [printBy, setPrintBy] = useState<string>("");
	const [searchParams, setSearchParams] = useState<SearchParams>({
		printBy: "",
		page: 1,
		limit: DEFAULT_PAGE_LIMIT,
	});

	const [records, setRecords] = useState<PaymentRecord[]>([]);
	const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [searchTerm, setSearchTerm] = useState("");
	const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
	const [contractType, setContractType] = useState<"1" | "2">("1");

	const [previewMode, setPreviewMode] = useState(false);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewReports, setPreviewReports] = useState<LeaseReport[]>([]);

	const printByOptions = [
		{ value: "1", label: "Police No." },
		{ value: "2", label: "Contract No." },
		{ value: "3", label: "Customer No." },
		{ value: "4", label: "Customer Name" },
		{ value: "5", label: "Master Agreement No." },
		{ value: "6", label: "No. Rangka" },
		{ value: "7", label: "No. Mesin" },
	];

	const getSearchFieldLabel = () => {
		switch (printBy) {
			case "1": return "Police No.";
			case "2": return "Contract No.";
			case "3": return "Customer No.";
			case "4": return "Customer Name";
			case "5": return "Master No.";
			case "6": return "No. Rangka";
			case "7": return "No. Mesin";
			default: return "";
		}
	};

	const getSearchFieldPlaceholder = () => {
		switch (printBy) {
			case "1": case "6": case "7": return "Enter alphanumeric value";
			case "2": case "3": case "5": return "Enter numeric value";
			case "4": return "Enter customer name";
			default: return "";
		}
	};

	const fetchRecords = useCallback(async (page = 1) => {
		if (!printBy || !searchTerm.trim()) return;

		setLoading(true);
		setError(null);

		try {
			const params: Record<string, string> = {
				print_by: printBy,
				page: page.toString(),
				limit: searchParams.limit.toString(),
			};

			switch (printBy) {
				case "1": case "6": case "7": params.police_no = searchTerm; break;
				case "2": params.lease_no = searchTerm; break;
				case "3": params.lessee_no = searchTerm; params.type_cust = contractType; break;
				case "4": params.lessee_nm = searchTerm; break;
				case "5": params.master_no = searchTerm; break;
			}

			const response = await api.get<{ data: PaymentRecord[]; total: number }>(
				'HistoryPayment/history-payment',
				{ params }
			);

			setRecords(response.data.data);
			setTotal(response.data.total);
			setSelectedRecords(new Set());
		} catch (err: any) {
			console.error("Failed to fetch payment history:", err);
			setError(err.response?.data?.message || "Failed to load payment history. Please try again.");
			setRecords([]);
		} finally {
			setLoading(false);
		}
	}, [printBy, searchTerm, contractType, searchParams.limit]);

	const handleKeyPress = (e: React.KeyboardEvent, type: "numeric" | "alphanumeric") => {
		const key = e.key;
		if (type === "numeric" && !/^\d$/.test(key) && key !== "Backspace" && key !== "Tab") {
			e.preventDefault();
		}
		if (type === "alphanumeric" && printBy !== "4") {
			if (!/^[a-zA-Z0-9]$/.test(key) && key !== "Backspace" && key !== "Tab") e.preventDefault();
		}
		if (type === "alphanumeric" && printBy === "4") {
			if (!/^[a-zA-Z0-9\s]$/.test(key) && key !== "Backspace" && key !== "Tab") e.preventDefault();
		}
	};

	const handleSearch = () => {
		if (!searchTerm.trim()) {
			alert(`Please enter ${getSearchFieldLabel().toLowerCase()}`);
			return;
		}
		setAppliedSearchTerm(searchTerm);
		setSearchParams(prev => ({ ...prev, page: 1 }));
		fetchRecords(1);
	};

	const handlePageChange = (page: number) => {
		setSearchParams(prev => ({ ...prev, page }));
		fetchRecords(page);
	};

	const handlePrintByChange = (value: string) => {
		setPrintBy(value);
		setSearchTerm("");
		setAppliedSearchTerm("");
		setRecords([]);
		setSelectedRecords(new Set());
		setError(null);
	};

	const handleSelectAll = (checked: boolean) => {
		setSelectedRecords(checked ? new Set(records.map(r => r.LEASE_NO)) : new Set());
	};

	const handleSelectRecord = (leaseNo: string, checked: boolean) => {
		setSelectedRecords(prev => {
			const newSet = new Set(prev);
			checked ? newSet.add(leaseNo) : newSet.delete(leaseNo);
			return newSet;
		});
	};

	const getMiddleColumn = () => {
		switch (printBy) {
			case "1": return { header: "No. Police", value: (r: PaymentRecord) => r.POLICENO ?? "-" };
			case "6": return { header: "No. Rangka", value: (r: PaymentRecord) => r.CHASIS ?? "-" };
			case "7": return { header: "No. Mesin", value: (r: PaymentRecord) => r.ENGINE ?? "-" };
			case "5": return { header: "No. Master", value: (r: PaymentRecord) => r.MSTR_CL ?? "-" };
			default: return { header: "No. Contract", value: (r: PaymentRecord) => r.LEASE_NO };
		}
	};

	const middleCol = getMiddleColumn();
	const totalPages = Math.ceil(total / searchParams.limit);

	const handlePreview = async () => {
		if (selectedRecords.size === 0) {
			alert("Please select at least one record to preview");
			return;
		}

		setPreviewLoading(true);
		try {
			const leaseNos = Array.from(selectedRecords);
			const raw = await Promise.all(
				leaseNos.map(lease_no =>
					api.get<{ contractInfo: ContractInfo; payments: PaymentRow[] }>(
						'/HistoryPayment/history-payment/print',
						{ params: { lease_no } }
					).then(({ data }) => ({
						leaseNo: lease_no,
						contractInfo: data.contractInfo,
						payments: data.payments ?? [],
					} satisfies RawLeaseReport))
				)
			);

			setPreviewReports(buildReports(raw));
			setPreviewMode(true);
			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (err: any) {
			alert(err.response?.data?.message ?? "Could not load preview. Please try again.");
		} finally {
			setPreviewLoading(false);
		}
	};

	if (previewMode) {
		return <PrintPreview reports={previewReports} onBack={() => setPreviewMode(false)} />;
	}

	const hasSearched = appliedSearchTerm.trim() !== "";

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-[1920px] mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">

					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">History Payment</h1>
							<p className="text-[var(--app-muted)] mt-1">Search and print payment history records</p>
						</div>
						{selectedRecords.size > 0 && (
							<div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
								{selectedRecords.size} record{selectedRecords.size !== 1 ? "s" : ""} selected
							</div>
						)}
					</div>

					<div className="bg-[var(--app-surface)] rounded-xl p-4 border border-[var(--app-border)] mb-6">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Print By</label>
								<select
									value={printBy}
									onChange={(e) => handlePrintByChange(e.target.value)}
									className="w-full px-3 py-3 rounded-lg border border-[var(--app-border)] bg-white text-[var(--app-text)] text-sm
								           focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="" className="bg-white text-[var(--app-text)]">Select</option>
									{printByOptions.map(opt => (
										<option key={opt.value} value={opt.value} className="bg-white text-[var(--app-text)]">{opt.label}</option>
									))}
								</select>
							</div>

							{printBy === "3" && (
								<div>
									<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Contract Type</label>
									<select
										value={contractType}
										onChange={(e) => setContractType(e.target.value as "1" | "2")}
										className="w-full px-3 py-3 rounded-lg border border-[var(--app-border)] bg-white text-[var(--app-text)] text-sm
								           focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="1" className="bg-white text-[var(--app-text)]">All Contract</option>
										<option value="2" className="bg-white text-[var(--app-text)]">Outstanding Contract</option>
									</select>
								</div>
							)}

							{printBy && (
								<div className="lg:col-span-2">
									<label className="block text-sm font-medium text-[var(--app-text)] mb-1">
										{getSearchFieldLabel()}
									</label>
									<div className="flex gap-2">
										<div className="relative flex-1">
											<input
												type="text"
												value={searchTerm}
												onChange={(e) => setSearchTerm(e.target.value)}
												onKeyPress={(e) => handleKeyPress(e, ["2", "3", "5"].includes(printBy) ? "numeric" : "alphanumeric")}
												onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
												placeholder={getSearchFieldPlaceholder()}
												className="w-full pl-3 pr-10 py-2.5 border border-[var(--app-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
											/>
											{searchTerm && (
												<button
													type="button"
													onClick={() => setSearchTerm("")}
													aria-label="Clear search"
													className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5
													           text-[var(--app-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
												>
													<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
														<path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
													</svg>
												</button>
											)}
										</div>
										<button
											onClick={handleSearch}
											disabled={loading || !searchTerm.trim()}
											className={`px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed ${loading ? "animate-pulse" : ""}`}
										>
											{loading ? (
												<>
													<svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
														<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
														<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
													</svg>
													Searching...
												</>
											) : (
												<>
													<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
													</svg>
													Search
												</>
											)}
										</button>
									</div>
								</div>
							)}
						</div>
					</div>

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
							<svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<span>{error}</span>
							<button onClick={() => fetchRecords(searchParams.page)} className="ml-4 text-red-900 underline hover:text-red-700">
								Retry
							</button>
						</div>
					)}

					{printBy && hasSearched && records.length > 0 && (
						<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
							<table className="w-full">
								<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
									<tr>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Customer Name</th>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Customer No.</th>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">{middleCol.header}</th>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Address</th>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Phone</th>
										<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">
											<div className="flex items-center gap-2">
												<input
													type="checkbox"
													checked={records.length > 0 && selectedRecords.size === records.length}
													onChange={(e) => handleSelectAll(e.target.checked)}
													className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
												/>
												Select All
											</div>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--app-border)]">
									{records.map((record, idx) => (
										<tr
											key={record.LEASE_NO}
											className={`hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
										>
											<td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-[var(--app-text)]">{record.LESSEE_NM}</td>
											<td className="py-4 px-6 whitespace-nowrap text-sm text-[var(--app-text)]">{record.LESSEE_NO}</td>
											<td className="py-4 px-6 whitespace-nowrap text-sm text-[var(--app-muted)]">{middleCol.value(record)}</td>
											<td className="py-4 px-6 text-sm text-[var(--app-muted)] max-w-xs truncate" title={record.ADDRESS}>{record.ADDRESS}</td>
											<td className="py-4 px-6 whitespace-nowrap text-sm text-[var(--app-muted)]">{record.PHONE1}</td>
											<td className="py-4 px-6 whitespace-nowrap">
												<input
													type="checkbox"
													checked={selectedRecords.has(record.LEASE_NO)}
													onChange={(e) => handleSelectRecord(record.LEASE_NO, e.target.checked)}
													className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
												/>
											</td>
										</tr>
									))}
									{loading && (
										<tr>
											<td colSpan={6} className="py-4 px-6 text-center">
												<div className="flex justify-center">
													<svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
														<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
														<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
													</svg>
												</div>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					)}

					{printBy && hasSearched && records.length === 0 && !loading && (
						<div className="py-10 px-6 text-center text-[var(--app-muted)] border border-[var(--app-border)] rounded-lg">
							<div className="flex flex-col items-center justify-center">
								<svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<p className="text-lg">No records found</p>
								<p className="text-sm mt-1">Try adjusting your search criteria</p>
							</div>
						</div>
					)}

					{!loading && hasSearched && records.length > 0 && (
						<Pagination
							page={searchParams.page}
							totalPages={totalPages}
							onPageChange={handlePageChange}
							totalItems={total}
							itemsPerPage={searchParams.limit}
							className="mt-6"
						/>
					)}

					{records.length > 0 && selectedRecords.size > 0 && (
						<div className="mt-6 flex justify-end">
							<button
								onClick={handlePreview}
								disabled={loading || previewLoading}
								className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
							>
								{previewLoading ? (
									<>
										<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
										</svg>
										Preparing preview…
									</>
								) : (
									<>
										<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
										</svg>
										Preview Selected ({selectedRecords.size})
									</>
								)}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default HistoryPaymentReportPage;
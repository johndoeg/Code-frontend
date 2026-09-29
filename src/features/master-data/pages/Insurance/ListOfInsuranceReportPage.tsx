import React, { useEffect, useState, useCallback } from "react";
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

type ReportType = "premi" | "tpl" | "";

interface Company {
	ins_cd: string;
	ins_co: string;
}

interface Model {
	model: string;
	model_nm: string;
}

interface PremiRow {
	id: number | string;
	ins_co: string;
	model_nm: string;
	coverage: string;
	premi: string;
	insurance_area: string;
}

interface TplRow {
	ins_co: string;
	model_nm: string;
	tpl_amt: string;
	tpl_fee: string;
	tpl_fee2: string;
}

const ALL = "00";

const Th: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children, className = "",
}) => (
	<th className={`py-3 px-4 text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] bg-[var(--app-surface-alt)] ${className}`}>
		{children}
	</th>
);

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({
	children, className = "",
}) => (
	<td className={`py-2 px-4 text-sm border-b border-[var(--app-border)] ${className}`}>
		{children}
	</td>
);

const ClearButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
	<button
		type="button"
		onClick={onClick}
		aria-label={label}
		className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-0.5
               text-[var(--app-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
	>
		<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
			<path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
		</svg>
	</button>
);

const ListOfInsuranceReportPage: React.FC = () => {
	const [companies, setCompanies] = useState<Company[]>([]);
	const [models, setModels] = useState<Model[]>([]);
	const [selIns, setSelIns] = useState(ALL);
	const [selModel, setSelModel] = useState(ALL);
	const [reportType, setReportType] = useState<ReportType>("");

	const [premiRows, setPremiRows] = useState<PremiRow[]>([]);
	const [tplRows, setTplRows] = useState<TplRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);

	const [page, setPage] = useState(1);
	const limit = DEFAULT_PAGE_LIMIT;

	useEffect(() => {
		api.get('/MasterData/companies')
			.then(r => setCompanies(r.data))
			.catch(() => setError("Failed to load insurance companies."));

		api.get('/MasterData/models')
			.then(r => setModels(r.data))
			.catch(() => setError("Failed to load models."));
	}, []);

	const handlePreview = useCallback(async () => {
		if (!reportType) {
			alert("Please select a report type (Premi or TPL).");
			return;
		}

		setLoading(true);
		setError(null);
		setSubmitted(false);
		setPage(1);
		setPremiRows([]);
		setTplRows([]);

		const params = { ins_cd: selIns, model: selModel };

		try {
			if (reportType === "premi") {
				const res = await api.get('/MasterData/premi', { params });
				setPremiRows(res.data);
			} else {
				const res = await api.get('/MasterData/tpl', { params });
				setTplRows(res.data);
			}
			setSubmitted(true);
		} catch {
			setError("Failed to load data. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [reportType, selIns, selModel]);

	const hasResults = submitted && (premiRows.length > 0 || tplRows.length > 0);
	const noResults = submitted && premiRows.length === 0 && tplRows.length === 0;

	const totalRows = reportType === "premi" ? premiRows.length : tplRows.length;
	const totalPages = Math.ceil(totalRows / limit);
	const pageStart = (page - 1) * limit;
	const pageRowCls = (idx: number) =>
		idx >= pageStart && idx < pageStart + limit ? "" : "hidden print:table-row";
	const zebra = (idx: number) =>
		idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]";

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">

				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 print:hidden">
					<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)] mb-6">
						List of Insurance Premi
					</h1>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

						<div>
							<label className="block text-sm font-medium text-[var(--app-text)] mb-1">
								Insurance Company
							</label>
							<div className="relative">
								<select
									value={selIns}
									onChange={e => setSelIns(e.target.value)}
									className="w-full border border-[var(--app-border)] bg-white text-[var(--app-text)] rounded-lg pl-3 pr-14 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
								>
									<option value={ALL} className="bg-white text-[var(--app-text)]">Select</option>
									{companies.map(c => (
										<option key={c.ins_cd} value={c.ins_cd} className="bg-white text-[var(--app-text)]">{c.ins_co}</option>
									))}
								</select>
								{selIns !== ALL && (
									<ClearButton onClick={() => setSelIns(ALL)} label="Clear insurance company" />
								)}
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-[var(--app-text)] mb-1">
								Model Name
							</label>
							<div className="relative">
								<select
									value={selModel}
									onChange={e => setSelModel(e.target.value)}
									className="w-full border border-[var(--app-border)] bg-white text-[var(--app-text)] rounded-lg pl-3 pr-14 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
								>
									<option value={ALL} className="bg-white text-[var(--app-text)]">Select</option>
									{models.map(m => (
										<option key={m.model} value={m.model} className="bg-white text-[var(--app-text)]">{m.model_nm}</option>
									))}
								</select>
								{selModel !== ALL && (
									<ClearButton onClick={() => setSelModel(ALL)} label="Clear model" />
								)}
							</div>
						</div>
					</div>

					<div className="mb-6">
						<p className="block text-sm font-medium text-[var(--app-text)] mb-2">Report</p>
						<div className="flex items-center gap-6">
							<label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--app-text)]">
								<input
									type="radio"
									name="report_type"
									value="premi"
									checked={reportType === "premi"}
									onChange={() => setReportType("premi")}
									className="accent-blue-600 w-4 h-4"
								/>
								Premi
							</label>
							<label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--app-text)]">
								<input
									type="radio"
									name="report_type"
									value="tpl"
									checked={reportType === "tpl"}
									onChange={() => setReportType("tpl")}
									className="accent-blue-600 w-4 h-4"
								/>
								TPL
							</label>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<button
							onClick={handlePreview}
							disabled={loading}
							className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
						>
							{loading ? (
								<span className="flex items-center gap-2">
									<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
									</svg>
									Loading…
								</span>
							) : "Preview"}
						</button>

						{hasResults && (
							<button
								onClick={() => window.print()}
								className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
							>
								🖨 Print
							</button>
						)}
					</div>

					{error && (
						<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
							{error}
						</div>
					)}
				</div>

				{submitted && (
					<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mt-6 print:mt-0">

						<div className="relative mb-6">
							<h2 className="text-xl font-bold text-[var(--app-text)] text-center tracking-widest uppercase">
								List of Insurance
							</h2>
							{totalRows > 0 && (
								<span className="absolute right-0 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium print:hidden">
									Total: {totalRows}
								</span>
							)}
						</div>

						{noResults && (
							<div className="flex flex-col items-center justify-center py-14 text-[var(--app-muted)]">
								<svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
										d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<p className="text-lg">No records found</p>
							</div>
						)}

						{reportType === "premi" && premiRows.length > 0 && (
							<div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
								<table className="w-full text-sm">
									<thead>
										<tr>
											<Th className="text-center w-12">No</Th>
											<Th>Insurance Company</Th>
											<Th>Model</Th>
											<Th>Coverage</Th>
											<Th className="text-right">Premi</Th>
											<Th>Insurance Area</Th>
										</tr>
									</thead>
									<tbody>
										{premiRows.map((row, idx) => (
											<tr
												key={row.id ?? idx}
												className={`${zebra(idx)} ${pageRowCls(idx)}`}
											>
												<Td className="text-center">{idx + 1}</Td>
												<Td>{row.ins_co}</Td>
												<Td>{row.model_nm}</Td>
												<Td>{row.coverage}</Td>
												<Td className="text-right">{row.premi}</Td>
												<Td>{row.insurance_area}</Td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{reportType === "tpl" && tplRows.length > 0 && (
							<div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
								<table className="w-full text-sm">
									<thead>
										<tr>
											<Th className="text-center w-12">No</Th>
											<Th>Insurance Company</Th>
											<Th>Model</Th>
											<Th className="text-right">TPL AMT</Th>
											<Th className="text-right">TPL FEE</Th>
											<Th className="text-right">TPL FEE2</Th>
										</tr>
									</thead>
									<tbody>
										{tplRows.map((row, idx) => (
											<tr
												key={`${row.ins_co}-${row.model_nm}-${idx}`}
												className={`${zebra(idx)} ${pageRowCls(idx)}`}
											>
												<Td className="text-center">{idx + 1}</Td>
												<Td>{row.ins_co}</Td>
												<Td>{row.model_nm}</Td>
												<Td className="text-right font-mono">{row.tpl_amt}</Td>
												<Td className="text-right font-mono">{row.tpl_fee}</Td>
												<Td className="text-right font-mono">{row.tpl_fee2}</Td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}

						{totalRows > 0 && (
							<div className="print:hidden">
								<Pagination
									page={page}
									totalPages={totalPages}
									onPageChange={setPage}
									totalItems={totalRows}
									itemsPerPage={limit}
									className="mt-5"
								/>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default ListOfInsuranceReportPage;
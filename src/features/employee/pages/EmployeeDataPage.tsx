import React, { useEffect, useState, useCallback } from "react";
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface SearchOption {
	value: string;
	label: string;
}

interface Branch {
	branch_cd: string;
	branch_name: string;
}

interface Division {
	div_id: string;
	div_desc: string;
}

interface Position {
	position_id: string;
	position_desc: string;
}

interface EmployeeRow {
	EmployeeID: string;
	Employee_Fullname: string;
	Branch_Name: string;
	Div_Desc: string;
	Position_Desc: string;
}

const PAGE_SIZE = DEFAULT_PAGE_LIMIT;

const TEXT_SEARCH_VALUES = new Set(["1", "2"]);

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const EmployeeDataPage: React.FC = () => {
	const [searchOptions, setSearchOptions] = useState<SearchOption[]>([]);
	const [branches, setBranches] = useState<Branch[]>([]);
	const [divisions, setDivisions] = useState<Division[]>([]);
	const [positions, setPositions] = useState<Position[]>([]);

	const [searchBy, setSearchBy] = useState("All");
	const [textVal, setTextVal] = useState("");
	const [branchVal, setBranchVal] = useState("");
	const [divVal, setDivVal] = useState("");
	const [positionVal, setPositionVal] = useState("");

	const [rows, setRows] = useState<EmployeeRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [searched, setSearched] = useState(false);

	const [page, setPage] = useState(1);
	const totalPages = Math.ceil(rows.length / PAGE_SIZE);
	const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const startIndex = (page - 1) * PAGE_SIZE + 1;

	useEffect(() => {
		const load = async () => {
			try {
				const [opts, brs, divs, pos] = await Promise.all([
					api.get('/Employee/search-options'),
					api.get('/Employee/branches'),
					api.get('/Employee/divisions'),
					api.get('/Employee/positions'),
				]);
				setSearchOptions(opts.data);
				setBranches(brs.data);
				setDivisions(divs.data);
				setPositions(pos.data);
			} catch {
				setError("Failed to load filter options.");
			}
		};
		load();
	}, []);

	const resolveSearchVal = (): string => {
		if (TEXT_SEARCH_VALUES.has(searchBy)) return textVal;
		if (searchBy === "3") return branchVal;
		if (searchBy === "4") return divVal;
		if (searchBy === "5") return positionVal;
		return "All";
	};

	const handleSearch = useCallback(async () => {
		setLoading(true);
		setError(null);
		setPage(1);

		try {
			const res = await api.get('/Employee/search', {
				params: { search_by: searchBy, search_val: resolveSearchVal() },
			});

			if (!res.data || res.data.length === 0) {
				setRows([]);
				setSearched(true);
				alert("Data Not Found!");
				return;
			}

			setRows(res.data);
			setSearched(true);
		} catch {
			setError("Search failed. Please try again.");
		} finally {
			setLoading(false);
		}
	}, [searchBy, textVal, branchVal, divVal, positionVal]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") handleSearch();
	};

	const showText = TEXT_SEARCH_VALUES.has(searchBy);
	const showBranch = searchBy === "3";
	const showDiv = searchBy === "4";
	const showPosition = searchBy === "5";

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">

				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
					<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)] mb-6">
						Employee Data
					</h1>

					{error && (
						<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
							{error}
						</div>
					)}

					<div className="flex flex-wrap items-center gap-3">
						<div className="flex items-center gap-2">
							<label htmlFor="search_by" className="text-sm font-medium text-[var(--app-text)] whitespace-nowrap">
								Search By:
							</label>
							<select
								id="search_by"
								value={searchBy}
								onChange={e => {
									setSearchBy(e.target.value);
									setTextVal("");
									setBranchVal("");
									setDivVal("");
									setPositionVal("");
								}}
								className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
							>
								<option value="All" style={optionStyle}>Select</option>
								{searchOptions.map(o => (
									<option key={o.value} value={o.value} style={optionStyle}>{o.label}</option>
								))}
							</select>
						</div>

						{showText && (
							<div className="relative">
								<input
									type="text"
									value={textVal}
									onChange={e => setTextVal(e.target.value)}
									onKeyDown={handleKeyDown}
									placeholder="Type to search…"
									className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-52 pr-8"
								/>
								{textVal && (
									<button type="button" onClick={() => setTextVal("")} aria-label="Clear search"
										className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] text-base leading-none">
										&times;
									</button>
								)}
							</div>
						)}

						{showBranch && (
							<select
								value={branchVal}
								onChange={e => setBranchVal(e.target.value)}
								className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
							>
								<option value="" style={optionStyle}>Select Branch</option>
								{branches.map(b => (
									<option key={b.branch_cd} value={b.branch_cd} style={optionStyle}>{b.branch_name}</option>
								))}
							</select>
						)}

						{showDiv && (
							<select
								value={divVal}
								onChange={e => setDivVal(e.target.value)}
								className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
							>
								<option value="" style={optionStyle}>Select Division</option>
								{divisions.map(d => (
									<option key={d.div_id} value={d.div_id} style={optionStyle}>{d.div_desc}</option>
								))}
							</select>
						)}

						{showPosition && (
							<select
								value={positionVal}
								onChange={e => setPositionVal(e.target.value)}
								className="border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
							>
								<option value="" style={optionStyle}>Select Position</option>
								{positions.map(p => (
									<option key={p.position_id} value={p.position_id} style={optionStyle}>{p.position_desc}</option>
								))}
							</select>
						)}

						<button
							onClick={handleSearch}
							disabled={loading}
							className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
						>
							{loading ? (
								<span className="flex items-center gap-2">
									<svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg"
										fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10"
											stroke="currentColor" strokeWidth="4" />
										<path className="opacity-75" fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
									</svg>
									Searching…
								</span>
							) : "Search"}
						</button>

						{searched && (
							<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
								{rows.length} record{rows.length !== 1 ? "s" : ""} found
							</span>
						)}
					</div>
				</div>

				{searched && (
					<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">

						<div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
							<table className="w-full text-sm">
								<thead className="bg-gradient-to-r from-[var(--app-surface-alt)] to-slate-200">
									<tr>
										{["No.", "Employee ID", "Employee Fullname", "Branch", "Division", "Position"].map((h, i) => (
											<th key={i}
												className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)] whitespace-nowrap">
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--app-border)]">
									{loading ? (
										<tr>
											<td colSpan={6} className="py-14 text-center text-[var(--app-muted)]">
												<div className="flex justify-center">
													<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
												</div>
											</td>
										</tr>
									) : pageRows.length === 0 ? (
										<tr>
											<td colSpan={6} className="py-14 text-center text-[var(--app-muted)]">
												No records found
											</td>
										</tr>
									) : (
										pageRows.map((row, idx) => (
											<tr
												key={`${row.EmployeeID}-${idx}`}
												className={idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}
											>
												<td className="py-2 px-4 text-center text-[var(--app-muted)] border-b border-[var(--app-border)]">
													{startIndex + idx}
												</td>
												<td className="py-2 px-4 border-b border-[var(--app-border)]">{row.EmployeeID}</td>
												<td className="py-2 px-4 border-b border-[var(--app-border)]">{row.Employee_Fullname}</td>
												<td className="py-2 px-4 border-b border-[var(--app-border)]">{row.Branch_Name}</td>
												<td className="py-2 px-4 border-b border-[var(--app-border)]">{row.Div_Desc}</td>
												<td className="py-2 px-4 border-b border-[var(--app-border)]">{row.Position_Desc}</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						{!loading && rows.length > PAGE_SIZE && (
							<Pagination
								page={page}
								totalPages={totalPages}
								onPageChange={setPage}
								totalItems={rows.length}
								itemsPerPage={PAGE_SIZE}
								className="mt-6"
							/>
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default EmployeeDataPage;
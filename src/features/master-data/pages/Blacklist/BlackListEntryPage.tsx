import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

type CustomerType = "PR" | "PT";

interface BlacklistRow {
	no: number;
	id_card_npwp: string;
	name: string;
	address: string;
	apless: string;
	customer_type: CustomerType;
}

const DEFAULT_SEARCH_BY = "1";

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };
const selectStyle: React.CSSProperties = { colorScheme: 'light' };

const Badge = ({ type }: { type: CustomerType }) => (
	<span
		style={{
			fontSize: 11,
			fontWeight: 600,
			padding: "2px 8px",
			borderRadius: 20,
			background: type === "PR" ? "#dbeafe" : "#fef3c7",
			color: type === "PR" ? "#1e40af" : "#92400e",
		}}
	>
		{type === "PR" ? "Individual" : "Corporate"}
	</span>
);

const ErrorBanner = ({
	errors,
	onClose,
}: {
	errors: string[];
	onClose: () => void;
}) => (
	<div
		style={{
			background: "#fef2f2",
			border: "1px solid #fecaca",
			borderRadius: 8,
			padding: "12px 16px",
			marginBottom: 16,
			display: "flex",
			justifyContent: "space-between",
			alignItems: "flex-start",
			gap: 12,
		}}
	>
		<ul style={{ margin: 0, paddingLeft: 18 }}>
			{errors.map((e, i) => (
				<li key={i} style={{ fontSize: 13, color: "#dc2626" }}>
					{e}
				</li>
			))}
		</ul>
		<button
			onClick={onClose}
			style={{
				background: "none",
				border: "none",
				cursor: "pointer",
				color: "#dc2626",
				fontSize: 18,
				lineHeight: 1,
			}}
		>
			×
		</button>
	</div>
);

const BlackListEntryPage: React.FC = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const menuId = searchParams.get("menu_id") ?? "";

	const [rows, setRows] = useState<BlacklistRow[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [listErrors, setListErrors] = useState<string[]>([]);

	const [searchBy, setSearchBy] = useState(DEFAULT_SEARCH_BY);
	const [searchVal, setSearchVal] = useState("");
	const [appliedSearch, setAppliedSearch] = useState({ by: DEFAULT_SEARCH_BY, val: "" });

	const limit = DEFAULT_PAGE_LIMIT;
	const totalPages = Math.ceil(total / limit);

	const fetchList = useCallback(async () => {
		setLoading(true);
		setListErrors([]);
		try {
			const { data } = await api.get("/MasterData/blacklist/list", {
				params: {
					page,
					limit,
					search_by: appliedSearch.by,
					search_val: appliedSearch.val,
				},
			});
			setRows(data.rows || []);
			setTotal(data.total || 0);
		} catch {
			setListErrors(["Failed to load blacklist data. Please try again."]);
		} finally {
			setLoading(false);
		}
	}, [page, limit, appliedSearch]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

	const handleSearch = () => {
		setPage(1);
		setAppliedSearch({ by: searchBy, val: searchVal.trim() });
	};

	const handleClearSearch = () => {
		setSearchVal("");
		if (appliedSearch.val) {
			setAppliedSearch({ by: searchBy, val: "" });
			setPage(1);
		}
	};

	const handleSearchKey = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleSearch();
	};

	const menuQuery = menuId ? `menu_id=${encodeURIComponent(menuId)}` : "";

	const goToAddNew = () => {
		navigate(`/blacklist/new${menuQuery ? `?${menuQuery}` : ""}`);
	};

	const goToDetail = (row: BlacklistRow) => {
		const mode = row.apless ? "view" : "edit";
		navigate(`/blacklist/${row.no}?mode=${mode}${menuQuery ? `&${menuQuery}` : ""}`);
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">

				<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6 mb-6">

					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">
								Blacklist
							</h1>
							<p className="text-[var(--app-text)] mt-1 text-sm">
								Manage blacklisted customers (Individual &amp; Corporate)
							</p>
						</div>
						<div className="flex items-center gap-3">
							<span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
								Total: {total}
							</span>
							<button
								onClick={goToAddNew}
								className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								Add Blacklist
							</button>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-3 mb-6">
						<select
							value={searchBy}
							onChange={(e) => setSearchBy(e.target.value)}
							style={selectStyle}
							className="border border-[var(--app-border)] bg-white text-slate-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
						>
							<option value="1" style={optionStyle}>ID Card</option>
							<option value="2" style={optionStyle}>Name</option>
							<option value="3" style={optionStyle}>NPWP</option>
						</select>
						<div className="relative flex-1">
							<input
								type="text"
								value={searchVal}
								onChange={(e) => setSearchVal(e.target.value)}
								onKeyDown={handleSearchKey}
								placeholder="Search…"
								className="w-full border border-[var(--app-border)] rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
							/>
							{searchVal && (
								<button
									type="button"
									onClick={handleClearSearch}
									aria-label="Clear search"
									className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5
                             text-slate-500 hover:bg-slate-100 hover:text-slate-900"
								>
									<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
									</svg>
								</button>
							)}
						</div>
						<button
							onClick={handleSearch}
							className="bg-blue-700 hover:bg-blue-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
						>
							Search
						</button>
					</div>

					{listErrors.length > 0 && (
						<ErrorBanner errors={listErrors} onClose={() => setListErrors([])} />
					)}

					<div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
						<table className="w-full">
							<colgroup>
								<col style={{ width: "18%" }} />
								<col style={{ width: "20%" }} />
								<col style={{ width: "40%" }} />
								<col style={{ width: "10%" }} />
								<col style={{ width: "12%" }} />
							</colgroup>
							<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
								<tr>
									{["ID Card / NPWP", "Name", "Address", "Type", "Action"].map((h) => (
										<th
											key={h}
											className="py-3 px-4 text-left text-xs font-semibold text-[var(--app-text)] uppercase tracking-wider"
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--app-border)]">
								{loading ? (
									<tr>
										<td colSpan={5} className="py-16 text-center">
											<div className="flex justify-center">
												<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
											</div>
										</td>
									</tr>
								) : rows.length === 0 ? (
									<tr>
										<td colSpan={5} className="py-16 text-center text-[var(--app-text)] text-sm">
											No records found
										</td>
									</tr>
								) : (
									rows.map((row, i) => (
										<tr
											key={row.no}
											className={`hover:bg-red-50/30 transition-colors ${i % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]/50"}`}
										>
											<td className="py-3 px-4 text-sm font-mono text-[var(--app-text)]">
												{row.id_card_npwp}
											</td>
											<td className="py-3 px-4 text-sm font-medium text-[var(--app-text)]">
												{row.name}
											</td>
											<td className="py-3 px-4 text-sm text-[var(--app-text)]">
												{row.address}
											</td>
											<td className="py-3 px-4">
												<Badge type={row.customer_type} />
											</td>
											<td className="py-3 px-4">
												<button
													onClick={() => goToDetail(row)}
													className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
												>
													{row.apless ? "View Detail" : "Edit"}
												</button>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{!loading && total > 0 && (
						<Pagination
							page={page}
							totalPages={totalPages}
							onPageChange={setPage}
							totalItems={total}
							itemsPerPage={limit}
							className="mt-6"
						/>
					)}
				</div>
			</div>
		</div>
	);
};

export default BlackListEntryPage;
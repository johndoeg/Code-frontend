import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface UserRow {
	EMPLOYEE_ID: string;
	USERNAME: string;
	FULLNAME: string;
	ACCESSCAM: string;
	SUPERIOR: string;
	BRANCH_NAME: string;
	STATUS: string;
}

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const Users: React.FC = () => {
	const navigate = useNavigate();

	const [search, setSearch] = useState("");
	const [searchBy, setSearchBy] = useState("1");
	const [appliedSearch, setAppliedSearch] = useState("");
	const [appliedSearchBy, setAppliedSearchBy] = useState("1");

	const [page, setPage] = useState(1);
	const limit = DEFAULT_PAGE_LIMIT;

	const {
		data,
		isFetching: loading,
		isError,
		refetch,
	} = useQuery({
		queryKey: ['sysadmin-users', appliedSearchBy, appliedSearch, page],
		queryFn: async () => {
			const response = await api.get('/SystemAdmin/users', {
				params: { search_by: appliedSearchBy, search_val: appliedSearch, page, limit },
			});
			return response.data as { data: UserRow[]; total: number; akses: string };
		},
		placeholderData: keepPreviousData,
	});

	const user = data?.data ?? [];
	const total = data?.total ?? 0;
	const akses = data?.akses ?? "";
	const error = isError ? 'Failed to load user data. Please try again.' : null;
	const canManage = String(akses).trim().toUpperCase() === "ADMIN";

	const totalPages = Math.ceil(total / limit);

	const handleSearch = () => {
		setPage(1);
		setAppliedSearchBy(searchBy);
		setAppliedSearch(search.trim());
	};

	const handleClearSearch = () => {
		setSearch("");
		setPage(1);
		setAppliedSearch("");
	};

	const handleDelete = async (employee_id: string, fullname: string) => {
		if (!window.confirm(`Delete user "${fullname}" (${employee_id})?`)) return;
		try {
			await api.delete(`/SystemAdmin/users/${encodeURIComponent(employee_id)}`);
			if (user.length === 1 && page > 1) {
				setPage(p => p - 1);
			} else {
				refetch();
			}
		} catch (err: any) {
			alert(err?.response?.data?.message || "Delete failed.");
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">User</h1>
							<p className="text-[var(--app-muted)] mt-1">View and manage your user records</p>
						</div>
						<div className="flex items-center gap-3">
							<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
								Total: {total}
							</span>
						</div>
					</div>

					<div className="flex flex-col md:flex-row gap-4 mb-6">
						<select
							value={searchBy}
							onChange={(e) => setSearchBy(e.target.value)}
							className="border border-[var(--app-border)] rounded-lg px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:w-48"
						>
							<option value="1" style={optionStyle}>All</option>
							<option value="2" style={optionStyle}>Username</option>
							<option value="3" style={optionStyle}>Employee ID</option>
							<option value="4" style={optionStyle}>Group Access</option>
						</select>

						<div className="relative flex-1">
							<input
								type="text"
								placeholder="Search user by username, fullname or employee id ..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
								className="w-full pl-10 pr-8 py-3 border border-[var(--app-border)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
							/>
							<svg
								className="w-5 h-5 text-[var(--app-muted)] absolute left-3 top-1/2 transform -translate-y-1/2"
								focusable="false"
								aria-hidden="true"
								viewBox="0 0 24 24"
								fill="none"
							>
								<path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"></path>
							</svg>
							{search && (
								<button
									type="button"
									onClick={handleClearSearch}
									aria-label="Clear search"
									className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] text-lg leading-none"
								>
									&times;
								</button>
							)}
						</div>
						<button
							onClick={handleSearch}
							disabled={loading}
							className={`bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-75 cursor-not-allowed' : ''
								}`}
						>
							{loading ? (
								<>
									<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Searching...
								</>
							) : (
								<>
									<svg className="w-5 h-5" focusable="false" aria-hidden="true" viewBox="0 0 24 24" fill="none">
										<path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"></path>
									</svg>
									Search
								</>
							)}
						</button>

						{canManage && (
							<button
								onClick={() => navigate('/user-entry?id=Add')}
								className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-md hover:shadow-lg transition-all whitespace-nowrap"
							>
								+ Add User
							</button>
						)}
					</div>

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
							{error}
							<button
								onClick={() => refetch()}
								className="ml-4 text-red-900 underline"
							>
								Retry
							</button>
						</div>
					)}

					<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
						<table className="w-full">
							<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
								<tr>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Employee ID</th>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Username</th>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Fullname</th>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Branch</th>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Access Group</th>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Superior</th>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Status</th>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--app-border)]">
								{user.length === 0 && !loading ? (
									<tr>
										<td colSpan={8} className="py-10 px-6 text-center text-[var(--app-muted)]">
											<div className="flex flex-col items-center justify-center">
												<svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
												</svg>
												<p className="text-lg">No user records found</p>
												<p className="text-sm mt-1">Try adjusting your search query</p>
											</div>
										</td>
									</tr>
								) : (
									<>
										{user.map((s, idx) => (
											<tr
												key={s.EMPLOYEE_ID}
												className={`hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
											>
												<td className="py-4 px-6 whitespace-nowrap text-sm font-medium text-[var(--app-text)]">{s.EMPLOYEE_ID}</td>
												<td className="py-4 px-6 whitespace-nowrap text-sm text-[var(--app-text)] font-medium">{s.USERNAME}</td>
												<td className="py-4 px-6 whitespace-nowrap text-sm text-[var(--app-text)] font-medium">{s.FULLNAME}</td>
												<td className="py-4 px-6 whitespace-nowrap text-sm text-[var(--app-text)] font-medium">{s.BRANCH_NAME}</td>
												<td className="py-4 px-6 whitespace-nowrap text-sm text-[var(--app-text)] font-medium">{s.ACCESSCAM}</td>
												<td className="py-4 px-6 whitespace-nowrap text-sm text-[var(--app-text)] font-medium">{s.SUPERIOR}</td>
												<td className="py-4 px-6 whitespace-nowrap text-sm text-[var(--app-text)] font-medium">{s.STATUS}</td>
												<td className="py-4 px-6 whitespace-nowrap text-sm">
													<div className="flex items-center gap-2">
														<button
															onClick={() => navigate(`/user-entry?id=View&employee_id=${encodeURIComponent(s.EMPLOYEE_ID)}`)}
															title="View"
															aria-label={`View ${s.FULLNAME}`}
															className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--app-surface)] text-blue-600 hover:bg-blue-100 hover:text-blue-800 transition-colors"
														>
															<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
																<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
															</svg>
														</button>
														{canManage && (
															<>
																<button
																	onClick={() => navigate(`/user-entry?id=Edit&employee_id=${encodeURIComponent(s.EMPLOYEE_ID)}`)}
																	title="Edit"
																	aria-label={`Edit ${s.FULLNAME}`}
																	className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors"
																>
																	<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
																	</svg>
																</button>
																<button
																	onClick={() => handleDelete(s.EMPLOYEE_ID, s.FULLNAME)}
																	title="Delete"
																	aria-label={`Delete ${s.FULLNAME}`}
																	className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors"
																>
																	<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
																	</svg>
																</button>
															</>
														)}
													</div>
												</td>
											</tr>
										))}
										{loading && (
											<tr>
												<td colSpan={8} className="py-4 px-6 text-center">
													<div className="flex justify-center">
														<svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
															<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
															<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
														</svg>
													</div>
												</td>
											</tr>
										)}
									</>
								)}
							</tbody>
						</table>
					</div>

					{!loading && (
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

export default Users;
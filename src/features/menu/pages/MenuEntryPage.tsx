import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface MenuItem {
	menu_id: string;
	menu_desc: string;
	menu_parent: string;
	parent_label: string;
	url: string;
}

interface ParentOption {
	menu_id: string;
	menu_desc: string;
}

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const MenuEntryPage: React.FC = () => {
	const [page, setPage] = useState(1);
	const limit = DEFAULT_PAGE_LIMIT;

	const [formParent, setFormParent] = useState("");
	const [formDesc, setFormDesc] = useState("");
	const [formUrl, setFormUrl] = useState("");
	const [formLoading, setFormLoading] = useState(false);
	const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const navigate = useNavigate();

	const {
		data: menusData,
		isFetching: loading,
		isError,
		refetch: refetchMenus,
	} = useQuery({
		queryKey: ['sysadmin-menu', page],
		queryFn: async () => {
			const res = await api.get('/SystemAdmin/menu', { params: { page, limit } });
			return res.data as { data: MenuItem[]; total: number; akses: string };
		},
		placeholderData: keepPreviousData,
	});

	const menus = menusData?.data ?? [];
	const total = menusData?.total ?? 0;
	const akses = menusData?.akses ?? "";
	const error = isError ? "Failed to load menu data. Please try again." : null;
	const canEdit = String(akses).trim().toUpperCase() === "ADMIN";

	const { data: parentOptionsData, refetch: refetchParentOptions } = useQuery({
		queryKey: ['sysadmin-menu-parent-options'],
		queryFn: async () => {
			const res = await api.get('/SystemAdmin/menu/parent-options');
			return res.data.data as ParentOption[];
		},
		enabled: canEdit,
	});
	const parentOptions = parentOptionsData ?? [];

	const handleSave = async () => {
		setFormLoading(true);
		setFormMessage(null);
		try {
			await api.post('/SystemAdmin/menu', {
				menu_parent: formParent,
				menu_desc: formDesc,
				url: formUrl,
			});
			setFormMessage({ type: "success", text: "Successful" });
			setFormParent("");
			setFormDesc("");
			setFormUrl("");

			refetchMenus();
			refetchParentOptions();
		} catch (err: any) {
			const msgs = err.response?.data?.message;
			setFormMessage({
				type: "error",
				text: Array.isArray(msgs) ? msgs.join(", ") : "Failed",
			});
		} finally {
			setFormLoading(false);
		}
	};

	const handleDelete = async (menu_id: string, menu_desc: string) => {
		if (!window.confirm(`Delete menu "${menu_desc}" (${menu_id})?\nAll child menus will also be deleted.`)) return;
		try {
			await api.delete(`/SystemAdmin/menu/${encodeURIComponent(menu_id)}`);
			refetchMenus();
			refetchParentOptions();
		} catch {
			alert("Delete failed.");
		}
	};

	const totalPages = Math.ceil(total / limit);

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">

				{canEdit && (
					<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
						<h2 className="text-xl font-bold text-[var(--app-text)] mb-4">Add Menu</h2>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Menu Parent</label>
								<select
									value={formParent}
									onChange={(e) => setFormParent(e.target.value)}
									className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									<option value="" style={optionStyle}>Select</option>
									<option value="0" style={optionStyle}>Parent (top-level)</option>
									{parentOptions.map((p) => (
										<option key={p.menu_id} value={p.menu_id} style={optionStyle}>
											{p.menu_id} — {p.menu_desc}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Menu Description</label>
								<div className="relative">
									<input
										type="text"
										value={formDesc}
										onChange={(e) => setFormDesc(e.target.value)}
										placeholder="Enter menu description"
										className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
									/>
									{formDesc && (
										<button type="button" onClick={() => setFormDesc("")} aria-label="Clear menu description"
											className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] text-base leading-none">
											&times;
										</button>
									)}
								</div>
							</div>

							<div>
								<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Menu URL</label>
								<div className="relative">
									<input
										type="text"
										value={formUrl}
										onChange={(e) => setFormUrl(e.target.value)}
										placeholder="/path/to/page"
										className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
									/>
									{formUrl && (
										<button type="button" onClick={() => setFormUrl("")} aria-label="Clear menu URL"
											className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] text-base leading-none">
											&times;
										</button>
									)}
								</div>
							</div>
						</div>

						<div className="mt-4 flex items-center gap-4">
							<button
								onClick={handleSave}
								disabled={formLoading}
								className={`bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all ${formLoading ? "opacity-75 cursor-not-allowed" : ""}`}
							>
								{formLoading ? "Saving..." : "Save"}
							</button>

							{formMessage && (
								<span className={`text-sm font-medium ${formMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
									{formMessage.text}
								</span>
							)}
						</div>
					</div>
				)}

				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">Menu</h1>
							<p className="text-[var(--app-muted)] mt-1">View and manage application menu entries</p>
						</div>
						<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium self-start md:self-auto">
							Total: {total}
						</span>
					</div>

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
							{error}
							<button onClick={() => refetchMenus()} className="ml-4 underline text-red-900">Retry</button>
						</div>
					)}

					<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
						<table className="w-full">
							<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
								<tr>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Menu ID</th>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Description</th>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Parent</th>
									<th className="py-4 px-6 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">URL</th>
									{canEdit && (
										<th className="py-4 px-6 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Action</th>
									)}
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--app-border)]">
								{menus.length === 0 && !loading ? (
									<tr>
										<td colSpan={5} className="py-10 px-6 text-center text-[var(--app-muted)]">
											<div className="flex flex-col items-center justify-center">
												<svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												<p className="text-lg">No menu records found</p>
											</div>
										</td>
									</tr>
								) : (
									<>
										{menus.map((row, idx) => (
											<tr
												key={row.menu_id}
												className={`hover:bg-[var(--app-surface)] transition-colors ${idx % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
											>
												<td className="py-4 px-6 text-sm font-mono font-medium text-[var(--app-text)]">
													<span style={{ paddingLeft: `${(row.menu_id.split('.').length - 1) * 16}px` }}>
														{row.menu_id}
													</span>
												</td>
												<td className="py-4 px-6 text-sm text-[var(--app-text)]">{row.menu_desc}</td>
												<td className="py-4 px-6 text-sm text-[var(--app-muted)]">{row.parent_label}</td>
												<td className="py-4 px-6 text-sm text-[var(--app-muted)] font-mono">{row.url}</td>
												{canEdit && (
													<td className="py-4 px-6 text-center">
														<div className="flex justify-center gap-2">
															<button
																onClick={() => navigate(`/menu-edit?menu_id=${encodeURIComponent(row.menu_id)}`)}
																className="bg-yellow-400 hover:bg-yellow-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
															>
																Edit
															</button>
															<button
																onClick={() => handleDelete(row.menu_id, row.menu_desc)}
																className="bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
															>
																Delete
															</button>
														</div>
													</td>
												)}
											</tr>
										))}
										{loading && (
											<tr>
												<td colSpan={5} className="py-4 px-6 text-center">
													<div className="flex justify-center">
														<svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
															<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
															<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

export default MenuEntryPage;
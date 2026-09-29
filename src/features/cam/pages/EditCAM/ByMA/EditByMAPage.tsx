import React, { useState, useCallback, useEffect } from 'react';
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface EditByMARows {
	appl_no: string;
	cam_no: string;
	create_date: string;
	customer_name: string;
	status: string;
	branch_cmo: string;
	editable: boolean;
}

interface EditByMAPageProps {
	onEdit: (applno: string) => void;
}

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const EditByMAPage: React.FC<EditByMAPageProps> = ({ onEdit }) => {
	const [searchBy, setSearchBy] = useState('');
	const [searchVal, setSearchVal] = useState('');
	const [rows, setRows] = useState<EditByMARows[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasSearched, setHasSearched] = useState(false);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const limit = DEFAULT_PAGE_LIMIT;

	const runSearch = useCallback(async (pageToLoad: number) => {
		setLoading(true);
		setHasSearched(true);
		try {
			const res = await api.get('/CAM/Edit/cam-on-hand/list', {
				params: { search_by: searchBy, search_val: searchVal, page: pageToLoad, limit },
			});
			if (res.data?.data) {
				setRows(res.data.data);
				setTotal(res.data.total ?? res.data.data.length);
			} else {
				setRows(res.data ?? []);
				setTotal(0);
			}
		} catch (err) {
			console.error('Edit CAM search error:', err);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchBy, searchVal, limit]);

	useEffect(() => {
		runSearch(page);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page]);

	const handleSearchClick = () => {
		if (page === 1) {
			runSearch(1);
		} else {
			setPage(1);
		}
	};

	const handleEditClick = (row: EditByMARows) => {
		if (!row.editable) {
			alert('The Cam No is invalid.');
			return;
		}
		if (window.confirm('Are you sure to update data?')) {
			onEdit(row.appl_no);
		}
	};

	const totalPages = Math.ceil(total / limit);

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
					<h1 className="text-xl md:text-2xl font-bold text-[var(--app-text)] mb-6">Edit CAM</h1>

					<div className="flex flex-wrap gap-2 items-center mb-6">
						<select
							value={searchBy}
							onChange={(e) => setSearchBy(e.target.value)}
							className="px-3 py-2 rounded-lg border border-[var(--app-border)] text-sm bg-white text-slate-900"
						>
							<option value="1" style={optionStyle}>CAM No</option>
							<option value="2" style={optionStyle}>Customer Name</option>
						</select>
						<div className="relative flex-1 min-w-[200px]">
							<input
								type="text"
								value={searchVal}
								onChange={(e) => setSearchVal(e.target.value)}
								placeholder="Search value"
								className="px-3 py-2 rounded-lg border border-[var(--app-border)] text-sm w-full pr-8"
							/>
							{searchVal && (
								<button
									type="button"
									onClick={() => setSearchVal('')}
									aria-label="Clear search value"
									className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] text-base leading-none"
								>
									&times;
								</button>
							)}
						</div>
						<button
							onClick={handleSearchClick}
							className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
						>
							Search
						</button>
					</div>

					{loading ? (
						<div className="py-10 text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
						</div>
					) : (
						<>
							<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
								<table className="w-full text-sm border-collapse">
									<thead>
										<tr className="bg-[var(--app-surface-alt)] text-[var(--app-text)]">
											<th className="border border-[var(--app-border)] px-2 py-2 text-left">CAM Date</th>
											<th className="border border-[var(--app-border)] px-2 py-2 text-left">CAM No.</th>
											<th className="border border-[var(--app-border)] px-2 py-2 text-left">Customer Name</th>
											<th className="border border-[var(--app-border)] px-2 py-2 text-left">Status</th>
											<th className="border border-[var(--app-border)] px-2 py-2 text-left">Branch - CMO</th>
											<th className="border border-[var(--app-border)] px-2 py-2"></th>
										</tr>
									</thead>
									<tbody>
										{rows.length === 0 && hasSearched ? (
											<tr>
												<td colSpan={6} className="border border-[var(--app-border)] px-2 py-3 text-center text-[var(--app-muted)]">
													No records found.
												</td>
											</tr>
										) : (
											rows.map((row) => (
												<tr key={row.appl_no} className="odd:bg-[var(--app-surface)]">
													<td className="border border-[var(--app-border)] px-2 py-1 whitespace-nowrap">{row.create_date}</td>
													<td className="border border-[var(--app-border)] px-2 py-1 whitespace-nowrap">{row.cam_no}</td>
													<td className="border border-[var(--app-border)] px-2 py-1">{row.customer_name}</td>
													<td className="border border-[var(--app-border)] px-2 py-1">{row.status}</td>
													<td className="border border-[var(--app-border)] px-2 py-1">{row.branch_cmo}</td>
													<td className="border border-[var(--app-border)] px-2 py-1 text-center">
														<button
															onClick={() => handleEditClick(row)}
															className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-xs"
														>
															Edit
														</button>
													</td>
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>

							{total > 0 && (
								<Pagination
									page={page}
									totalPages={totalPages}
									onPageChange={setPage}
									totalItems={total}
									itemsPerPage={limit}
									className="mt-6"
								/>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default EditByMAPage;
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '@/shared/api/axiosInstance';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

interface Branch {
	branch_cd: string;
	branch_name: string;
}

interface SummaryRow {
	no: number;
	employee_id: string;
	cmo_name: string;
	total_created: number;
	total_reject: number;
	total_defect1: number;
	total_defect2: number;
	total_defect3: number;
	sub_total: number;
}

interface SummaryTotals {
	total_created: number;
	total_reject: number;
	total_defect1: number;
	total_defect2: number;
	total_defect3: number;
	sub_total: number;
}

const PAGE_SIZE = DEFAULT_PAGE_LIMIT;

const toISO = (d: Date): string => {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const dateFieldClass = '[&_input]:!bg-white [&_input]:!text-slate-900 [&_input]:![color-scheme:light]';

const DETAIL_ROUTE = '/report-cmo-daily-productivity';

const parseIsoDate = (raw: string | null): Date | null => {
	if (!raw) return null;
	const [y, m, d] = raw.split('-').map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d);
};

const sameBranch = (a: string, b: string) =>
	String(a).trim().replace(/^0+/, '') === String(b).trim().replace(/^0+/, '');

const CmoDailyProductivityByCmoPage: React.FC = () => {
	const [branches, setBranches] = useState<Branch[]>([]);
	const [branch, setBranch] = useState('');
	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);

	const [rows, setRows] = useState<SummaryRow[]>([]);
	const [totals, setTotals] = useState<SummaryTotals | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasSearched, setHasSearched] = useState(false);
	const [branchNotAllowed, setBranchNotAllowed] = useState<string | null>(null);
	const [searchedRange, setSearchedRange] = useState<{ start: string; end: string; branch: string } | null>(null);

	const [searchParams] = useSearchParams();
	const qs = searchParams.toString();

	const [page, setPage] = useState(1);
	const totalPages = Math.ceil(rows.length / PAGE_SIZE);
	const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	useEffect(() => {
		(async () => {
			try {
				const response = await api.get<Branch[]>(
					'/CAM/CMO/daily-productivity-by-cmo/branches'
				);
				const list = response.data ?? [];
				setBranches(list);

				const lemparBranch = searchParams.get('lempar_branch');
				const initialStart = parseIsoDate(searchParams.get('lempar_start_dt'));
				const initialEnd = parseIsoDate(searchParams.get('lempar_end_dt'));

				console.log('[by-cmo] query=', qs, 'branch=', lemparBranch,
					'start=', initialStart, 'end=', initialEnd,
					'branchCodes=', list.map((b) => b.branch_cd));

				const matched = lemparBranch ? list.find((b) => sameBranch(b.branch_cd, lemparBranch)) : undefined;
				const initialBranch = lemparBranch
					? matched?.branch_cd ?? ''
					: list.length === 1
						? list[0].branch_cd
						: '';

				setBranch(initialBranch);
				setStartDate(initialStart);
				setEndDate(initialEnd);
				if (list.length === 0) {
					setBranchNotAllowed('__empty__');
				} else {
					setBranchNotAllowed(lemparBranch && !matched ? lemparBranch : null);
				}

				if (initialBranch && initialStart && initialEnd) {
					await runSearch(initialBranch, initialStart, initialEnd);
				}
			} catch (err) {
				console.error('Branch list error:', err);
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [qs]);

	const runSearch = async (branchCd: string, start: Date, end: Date) => {
		if (!branchCd || !start || !end) return;
		setLoading(true);
		setError(null);
		setHasSearched(true);
		setPage(1);
		try {
			const response = await api.get<{ data: SummaryRow[]; totals: SummaryTotals }>(
				'/CAM/CMO/daily-productivity-by-cmo/summary',
				{
					params: {
						start_date: toISO(start),
						end_date: toISO(end),
						branch: branchCd,
					},
				}
			);
			setRows(response.data.data);
			setTotals(response.data.totals);
			setSearchedRange({ start: toISO(start), end: toISO(end), branch: branchCd });
		} catch (err) {
			console.error('CMO daily productivity summary error:', err);
			setError('Failed to load report. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handleSearch = () => {
		if (!startDate || !endDate || !branch) return;
		runSearch(branch, startDate, endDate);
	};

	const buildDrillDownPath = (employeeId: string) => {
		const params = new URLSearchParams({
			lempar_start_dt: searchedRange?.start ?? '',
			lempar_end_dt: searchedRange?.end ?? '',
			lempar_branch: searchedRange?.branch ?? '',
			lempar_cmo: employeeId,
		});
		return `${DETAIL_ROUTE}?${params.toString()}`;
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] text-[var(--app-text)] rounded-2xl shadow-lg p-6 mb-6">
					<div className="mb-6">
						<h1 className="text-xl md:text-2xl font-bold text-[var(--app-text)]">
							Credit Marketing Officer Daily Productivity Global Report — By CMO
						</h1>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-sm items-end">
						<div>
							<label className="text-[var(--app-text)] block mb-1">Start Date</label>
							<div className={dateFieldClass}>
								<AsOfDatePicker label="" value={startDate} onChange={setStartDate} required />
							</div>
						</div>
						<div>
							<label className="text-[var(--app-text)] block mb-1">End Date</label>
							<div className={dateFieldClass}>
								<AsOfDatePicker label="" value={endDate} onChange={setEndDate} required />
							</div>
						</div>
						<div>
							<label className="text-[var(--app-text)] block mb-1">Branch</label>
							<select
								value={branch}
								onChange={(e) => setBranch(e.target.value)}
								className="w-full px-3 py-2 rounded-lg border border-[var(--app-border)] text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							>
								<option value="" style={optionStyle}>Select branch</option>
								{branches.map((b) => (
									<option key={b.branch_cd} value={b.branch_cd} style={optionStyle}>
										{b.branch_name}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="mb-6">
						<button
							onClick={handleSearch}
							disabled={!startDate || !endDate || !branch}
							className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
						>
							Search
						</button>
					</div>

					{branchNotAllowed && (
						<div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
							{branchNotAllowed === '__empty__'
								? 'Your account has no branches available, so this report cannot run.'
								: `Branch ${branchNotAllowed} is not in your branch list, so no data can be shown for it.`}
						</div>
					)}

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
							{error}
						</div>
					)}

					<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
						<table className="w-full text-sm border-collapse">
							<thead>
								<tr className="bg-[var(--app-surface-alt)] text-[var(--app-text)]">
									<th className="border border-[var(--app-border)] px-2 py-2">No.</th>
									<th className="border border-[var(--app-border)] px-2 py-2">CMO</th>
									<th className="border border-[var(--app-border)] px-2 py-2">CAM Created</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Reject to Watchlist</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Customer is not Feasible to be Financed</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Customer is Financed Another Leasing Company</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Customer Cancel Their Application</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Total Application</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan={8} className="py-10 text-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
										</td>
									</tr>
								) : !hasSearched ? (
									<tr>
										<td colSpan={8} className="border border-[var(--app-border)] px-2 py-8 text-center text-[var(--app-text)] opacity-70"></td>
									</tr>
								) : (
									<>
										{pageRows.length === 0 ? (
											<tr>
												<td colSpan={8} className="border border-[var(--app-border)] px-2 py-4 text-center text-[var(--app-text)] opacity-70">
													No CMO activity found for this period.
												</td>
											</tr>
										) : (
											pageRows.map((row) => (
												<tr key={row.employee_id} className="odd:bg-[var(--app-surface)]">
													<td className="border border-[var(--app-border)] px-2 py-1 text-center">{row.no}</td>
													<td className="border border-[var(--app-border)] px-2 py-1 text-center">
														<Link
															to={buildDrillDownPath(row.employee_id)}
															className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
														>
															{row.cmo_name}
														</Link>
													</td>
													<td className="border border-[var(--app-border)] px-2 py-1 text-center">{row.total_created}</td>
													<td className="border border-[var(--app-border)] px-2 py-1 text-center">{row.total_reject}</td>
													<td className="border border-[var(--app-border)] px-2 py-1 text-center">{row.total_defect1}</td>
													<td className="border border-[var(--app-border)] px-2 py-1 text-center">{row.total_defect2}</td>
													<td className="border border-[var(--app-border)] px-2 py-1 text-center">{row.total_defect3}</td>
													<td className="border border-[var(--app-border)] px-2 py-1 text-center">{row.sub_total}</td>
												</tr>
											))
										)}
										{totals && (
											<tr className="bg-[var(--app-surface-alt)] font-semibold">
												<td colSpan={2} className="border border-[var(--app-border)] px-2 py-1 text-center">Total</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-center">{totals.total_created}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-center">{totals.total_reject}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-center">{totals.total_defect1}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-center">{totals.total_defect2}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-center">{totals.total_defect3}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-center">{totals.sub_total}</td>
											</tr>
										)}
									</>
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
			</div>
		</div>
	);
};

export default CmoDailyProductivityByCmoPage;
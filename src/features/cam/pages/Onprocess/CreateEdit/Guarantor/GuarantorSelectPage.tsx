import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

interface Candidate {
	grnId: string;
	name: string;
	type: string;
	idCard: string;
	status: 'active' | 'inactive';
	cmo: string;
	lastActionDate: string | null;
	finalApless: string;
	precheckingId: string;
}

interface SelectResult {
	success: boolean;
	message?: string;
	applno: string;
	apless: string;
	candidate: Candidate;
}

export interface GuarantorSelectPageProps {
	apless: string;
	applNo: string;
	onBack: () => void;
	onSelected?: (result: SelectResult) => void;
}

const PAGE_SIZE = 20;
const TYPE_LABELS: Record<string, string> = { PR: 'Individual', PT: 'Corporate' };

const cellHead =
	'border-b-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)] whitespace-nowrap';
const cellBody = 'border border-[var(--app-border)] px-3 py-2 align-top text-sm text-[var(--app-text)]';

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-[var(--app-border)] bg-[#2055DE] px-6 py-2.5">
			<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{children}</h2>
		</div>
	);
}

const errorMessage = (e: unknown, fallback: string): string =>
	(e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const GuarantorSelectPage: React.FC<GuarantorSelectPageProps> = ({ applNo, onBack, onSelected }) => {
	const [searchBy, setSearchBy] = useState<'1' | '2'>('2');
	const [searchVal, setSearchVal] = useState('');
	const [applied, setApplied] = useState<{ by: string; val: string }>({ by: '', val: '' });
	const [page, setPage] = useState(1);
	const [selectingId, setSelectingId] = useState<string | null>(null);

	const { data: rows = [], isLoading, isError, refetch } = useQuery({
		queryKey: ['cam-guarantor-candidates', applied.by, applied.val],
		queryFn: async (): Promise<Candidate[]> => {
			const res = await api.get('/CAM/EditIndex/guarantor/candidates', {
				params: { search_by: applied.by, search_val: applied.val },
			});
			return res.data.guarantors || [];
		},
	});

	const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
	const current = Math.min(page, pageCount);
	const pageRows = useMemo(() => rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE), [rows, current]);

	const runSearch = () => {
		if (!searchVal.trim()) {
			alert('Please fill the field');
			return;
		}
		setPage(1);
		setApplied({ by: searchBy, val: searchVal.trim() });
	};

	const resetSearch = () => {
		setSearchVal('');
		setPage(1);
		setApplied({ by: '', val: '' });
	};

	const handleSelect = async (row: Candidate) => {
		if (!window.confirm(`Add guarantor "${row.name}" to this CAM?`)) return;
		setSelectingId(row.precheckingId);
		try {
			const res = await api.post<SelectResult>('/CAM/EditIndex/guarantor/select', {
				applno: applNo,
				prechecking_id: row.precheckingId,
			});
			if (!res.data?.success) {
				alert(res.data?.message || 'Failed to add the guarantor.');
				return;
			}
			onSelected?.(res.data);
			onBack();
		} catch (e) {
			alert(errorMessage(e, 'Failed to add the guarantor. Please try again.'));
		} finally {
			setSelectingId(null);
		}
	};

	return (
		<div>
			<button type="button" onClick={onBack}
				className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--app-muted)] hover:text-[var(--app-text)]">
				← Back to guarantor list
			</button>

			<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<SectionHeader>List of Guarantor</SectionHeader>

				<div className="p-5">
					<div className="mb-4 flex flex-wrap items-center gap-2">
						<select value={searchBy} onChange={(e) => setSearchBy(e.target.value as '1' | '2')}
							className="rounded border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-1.5 text-sm">
							<option value="1">Guarantor ID</option>
							<option value="2">Guarantor Name</option>
						</select>
						<input value={searchVal} onChange={(e) => setSearchVal(e.target.value)}
							onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
							className="min-w-[220px] rounded border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-1.5 text-sm" />
						<button type="button" onClick={runSearch}
							className="rounded bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600">Search</button>
						{applied.val && (
							<button type="button" onClick={resetSearch}
								className="rounded bg-slate-200 px-3 py-1.5 text-xs font-medium text-[var(--app-text)] hover:bg-slate-300">Show all</button>
						)}
					</div>

					{isLoading ? (
						<div className="flex justify-center py-12">
							<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
						</div>
					) : isError ? (
						<div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
							Failed to load guarantors. Please try again.
							<button onClick={() => refetch()} className="ml-4 underline">Retry</button>
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[820px] border-collapse text-sm">
									<thead>
										<tr>
											<th className={cellHead}>Guarantor ID</th>
											<th className={cellHead}>Guarantor Name</th>
											<th className={cellHead}>Type</th>
											<th className={cellHead}>ID Card / NPWP</th>
											<th className={cellHead}>Status</th>
											<th className={cellHead}>CMO</th>
											<th className={cellHead}>Action</th>
										</tr>
									</thead>
									<tbody>
										{pageRows.map((r, i) => (
											<tr key={r.precheckingId} className={i % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]'}>
												<td className={cellBody}>{r.grnId}</td>
												<td className={cellBody}>{r.name || '-'}</td>
												<td className={cellBody}>{TYPE_LABELS[r.type] || r.type || '-'}</td>
												<td className={cellBody}>{r.idCard || '-'}</td>
												<td className={cellBody}>{r.status === 'active' ? 'Active' : 'Inactive'}</td>
												<td className={cellBody}>{r.cmo || '-'}</td>
												<td className={cellBody}>
													{r.status === 'active' ? (
														<button type="button" onClick={() => handleSelect(r)} disabled={selectingId !== null}
															className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:bg-slate-300">
															{selectingId === r.precheckingId ? 'Adding…' : 'Select'}
														</button>
													) : (
														<button type="button"
															onClick={() => alert("Repeat Order isn't available yet — this needs a page that hasn't been converted.")}
															className="rounded bg-slate-200 px-3 py-1 text-xs font-medium text-[var(--app-text)] hover:bg-slate-300">
															Repeat Order
														</button>
													)}
												</td>
											</tr>
										))}
										{rows.length === 0 && (
											<tr><td colSpan={7} className={cellBody + ' text-center text-[var(--app-muted)]'}>No guarantors found.</td></tr>
										)}
									</tbody>
								</table>
							</div>

							{rows.length > PAGE_SIZE && (
								<div className="mt-3 flex items-center justify-between text-sm text-[var(--app-muted)]">
									<span>{rows.length} guarantors · page {current} of {pageCount}</span>
									<div className="flex gap-2">
										<button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)}
											className="rounded bg-slate-200 px-3 py-1 text-xs font-medium text-[var(--app-text)] disabled:opacity-50">Prev</button>
										<button type="button" disabled={current >= pageCount} onClick={() => setPage(current + 1)}
											className="rounded bg-slate-200 px-3 py-1 text-xs font-medium text-[var(--app-text)] disabled:opacity-50">Next</button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default GuarantorSelectPage;
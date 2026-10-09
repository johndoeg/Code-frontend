import React, { useState, useEffect, useRef } from 'react';
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';
import { useAuth } from '@/shared/contexts/AuthContext';

type LesseeType = 'PR' | 'PT';
type SearchBy = '' | '1' | '2' | '3';
type FormMode = 'create' | 'edit' | 'view';

interface EntrySummary {
	no: number;
	identitas: string;
	name: string;
	address: string;
	lessee_type: string;
	reason_category: string;
}

interface EntryDetail {
	no?: number;
	apless?: string | null;
	lessee_type: LesseeType;
	name: string;
	alias_name: string;
	address: string;
	phone: string;
	id_card: string;
	npwp: string;
	date_of_birth: string | null;
	spouse_name: string;
	mothers_maiden_name: string;
	contact_person: string;
	contact_address: string;
	contact_group_code: string;
	remark: string;
	reason_other: string;
	create_user?: string;
	create_date?: string | null;
	last_user?: string;
	last_update?: string | null;
}

interface CustomerLookupRow {
	apless: string;
	name: string;
	lessee_type: string;
	address: string;
	id_card: string | null;
	npwp: string | null;
	phone: string;
}

const PAGE_SIZE = DEFAULT_PAGE_LIMIT;

function parseDDMMYYYY(value: string | null): Date | null {
	if (!value) return null;
	const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim());
	if (!match) return null;
	const [, dd, mm, yyyy] = match;
	const day = Number(dd);
	const month = Number(mm);
	const year = Number(yyyy);
	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
		return null;
	}
	return date;
}

function formatDDMMYYYY(date: Date | null): string | null {
	if (!date) return null;
	const dd = String(date.getDate()).padStart(2, '0');
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	return `${dd}-${mm}-${date.getFullYear()}`;
}

const emptyEntry = (): EntryDetail => ({
	lessee_type: 'PR',
	name: '',
	alias_name: '',
	address: '',
	phone: '',
	id_card: '',
	npwp: '',
	date_of_birth: null,
	spouse_name: '',
	mothers_maiden_name: '',
	contact_person: '',
	contact_address: '',
	contact_group_code: '',
	remark: '',
	reason_other: '',
});

const attachmentUrl = (filename: string) =>
	`/MasterData/files/ppatk/${encodeURIComponent(filename)}`;

const CORSEC_REASON = '8';
const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };
const selectStyle: React.CSSProperties = { colorScheme: 'light' };
const inputCls =
	'w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none transition-shadow disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)]';
const selectCls = `${inputCls} bg-white text-[var(--app-text)]`;

interface Group { code: string; name: string; }

const NPWP_SEGMENTS = [2, 3, 3, 1, 3, 4];
const NPWP_SEPS = ['.', '.', '.', '-', '.'];

function npwpSegments(npwp: string): string[] {
	const digits = (npwp || '').replace(/\D/g, '');
	const out: string[] = [];
	let pos = 0;
	for (const len of NPWP_SEGMENTS) {
		out.push(digits.substr(pos, len));
		pos += len;
	}
	return out;
}

const FormField = ({ label, required, children }: { label: React.ReactNode; required?: boolean; children: React.ReactNode }) => (
	<div className="flex items-start gap-2">
		<label className="w-44 flex-shrink-0 pt-2 text-sm font-medium text-[var(--app-text)]">
			{label}{required && <span className="text-red-500 ml-0.5">*</span>}
		</label>
		<span className="pt-2 text-sm text-[var(--app-muted)]">:</span>
		<div className="flex-1 min-w-0">{children}</div>
	</div>
);

function NpwpInput({ value, disabled, onChange }: { value: string; disabled?: boolean; onChange: (v: string) => void }) {
	const [segs, setSegs] = useState<string[]>(() => npwpSegments(value));
	const refs = useRef<Array<HTMLInputElement | null>>([]);

	useEffect(() => {
		if (value !== segs.join('')) setSegs(npwpSegments(value));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	const setSeg = (i: number, v: string) => {
		const digits = v.replace(/\D/g, '').slice(0, NPWP_SEGMENTS[i]);
		const next = [...segs];
		next[i] = digits;
		setSegs(next);
		onChange(next.join(''));
		if (digits.length === NPWP_SEGMENTS[i] && i < NPWP_SEGMENTS.length - 1) refs.current[i + 1]?.focus();
	};

	const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Backspace' && segs[i] === '' && i > 0) {
			e.preventDefault();
			refs.current[i - 1]?.focus();
		}
	};

	return (
		<div className="flex items-center gap-1 flex-nowrap w-full">
			{segs.map((sg, i) => (
				<React.Fragment key={i}>
					<input
						ref={(el) => { refs.current[i] = el; }}
						type="text"
						inputMode="numeric"
						value={sg}
						disabled={disabled}
						maxLength={NPWP_SEGMENTS[i]}
						onChange={(e) => setSeg(i, e.target.value)}
						onKeyDown={(e) => onKeyDown(i, e)}
						className={`${inputCls} text-center px-2`}
						style={{ flex: `${NPWP_SEGMENTS[i]} 1 ${NPWP_SEGMENTS[i] * 18 + 28}px`, minWidth: 0 }}
					/>
					{i < NPWP_SEPS.length && <span className="px-0.5 text-sm font-bold text-[var(--app-text)]">{NPWP_SEPS[i]}</span>}
				</React.Fragment>
			))}
		</div>
	);
}

const TypeBadge = ({ type }: { type: string }) => {
	const isPR = type === 'PR';
	return (
		<span
			style={{
				fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
				background: isPR ? '#dbeafe' : '#fef3c7', color: isPR ? '#1e40af' : '#92400e',
			}}
		>
			{isPR ? 'Individual' : 'Corporate'}
		</span>
	);
};

const SpinnerIcon: React.FC = () => (
	<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
	</svg>
);

const WatchListEntryByCorsec: React.FC = () => {
	const { user } = useAuth();
	const currentUser = user?.username ?? '';
	const nowD = new Date();
	const todayDisplay = `${String(nowD.getDate()).padStart(2, '0')}-${String(nowD.getMonth() + 1).padStart(2, '0')}-${nowD.getFullYear()}`;
	const [groups, setGroups] = useState<Group[]>([]);
	const [reasonLabel, setReasonLabel] = useState('');
	const [searchBy, setSearchBy] = useState<SearchBy>('');
	const [searchVal, setSearchVal] = useState('');
	const [results, setResults] = useState<EntrySummary[]>([]);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [listError, setListError] = useState<string | null>(null);

	const [formOpen, setFormOpen] = useState(false);
	const [formMode, setFormMode] = useState<FormMode>('create');
	const [formData, setFormData] = useState<EntryDetail>(emptyEntry());
	const [lockedFromPicker, setLockedFromPicker] = useState(false);
	const [formSaving, setFormSaving] = useState(false);
	const [formLoading, setFormLoading] = useState(false);
	const [formError, setFormError] = useState<string[] | string | null>(null);
	const [attachments, setAttachments] = useState<string[]>([]);
	const [uploading, setUploading] = useState(false);

	const MAX_FILES = 3;
	const [slots, setSlots] = useState<(File | null)[]>([null]);

	const [pickerOpen, setPickerOpen] = useState(false);
	const [pickerQuery, setPickerQuery] = useState('');
	const [pickerResults, setPickerResults] = useState<CustomerLookupRow[]>([]);
	const [pickerLoading, setPickerLoading] = useState(false);

	const [deleteNo, setDeleteNo] = useState<number | null>(null);
	const [deleteReason, setDeleteReason] = useState('');
	const [deleting, setDeleting] = useState(false);

	const fetchList = async (targetPage: number = 1) => {
		setLoading(true);
		setListError(null);
		try {
			const response = await api.get('/MasterData/watchlist-corsec/list', {
				params: { search_by: searchBy, search_val: searchVal, page: targetPage, page_size: PAGE_SIZE },
			});
			setResults(response.data.data);
			setPage(response.data.page);
			setTotalPages(response.data.total_pages);
			setTotal(response.data.total);
		} catch (err) {
			console.error('Watchlist entry list error:', err);
			setListError('Failed to load data. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchList(1); }, []);

	useEffect(() => {
		(async () => {
			try {
				const [g, r] = await Promise.all([
					api.get('/MasterData/watchlist/groups'),
					api.get('/MasterData/watchlist/reasons'),
				]);
				setGroups(g.data || []);
				const m = (r.data || []).find((x: { value: string; label: string }) => x.value === CORSEC_REASON);
				setReasonLabel(m?.label || '');
			} catch {}
		})();
	}, []);

	const handleSearch = () => fetchList(1);

	const handleClearSearch = () => {
		setSearchVal('');
		fetchList(1);
	};

	const openCreate = () => {
		setFormMode('create');
		setFormData(emptyEntry());
		setLockedFromPicker(false);
		setAttachments([]);
		setSlots([null]);
		setFormError(null);
		setFormOpen(true);
	};

	const loadEntry = async (no: number, mode: FormMode) => {
		setFormMode(mode);
		setFormOpen(true);
		setFormLoading(true);
		setFormError(null);
		setLockedFromPicker(true);
		try {
			const [detailRes, attachRes] = await Promise.all([
				api.get<EntryDetail>(`/MasterData/watchlist-corsec/${no}`),
				api.get<string[]>(`/MasterData/watchlist-corsec/${no}/attachments`),
			]);
			setFormData({ ...detailRes.data, no });
			setAttachments(attachRes.data);
			setSlots(attachRes.data.length ? [] : [null]);
		} catch (err) {
			console.error('Load entry error:', err);
			setFormError('Failed to load this entry. Please try again.');
		} finally {
			setFormLoading(false);
		}
	};

	const closeForm = () => setFormOpen(false);

	const updateField = <K extends keyof EntryDetail>(key: K, value: EntryDetail[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
	};

	const handleSave = async () => {
		if (attachments.length + slots.filter(Boolean).length < 1) {
			setFormError('Attach at least 1 file (max 3, 2 MB each).');
			return;
		}
		setFormSaving(true);
		setFormError(null);
		try {
			if (formMode === 'create') {
				const response = await api.post('/MasterData/watchlist-corsec', formData);
				const newNo = response.data?.no ?? response.data?.id;
				const staged = slots.filter((f): f is File => !!f);
				if (newNo && staged.length) {
					const body = new FormData();
					staged.forEach((f) => body.append('files', f));
					await api.post(`/MasterData/watchlist-corsec/${newNo}/attachments`, body, {
						headers: { 'Content-Type': 'multipart/form-data' },
					});
				}
				setFormOpen(false);
				fetchList(page);
				return response.data;
			} else if (formMode === 'edit' && formData.no) {
				await api.put(`/MasterData/watchlist-corsec/${formData.no}`, formData);
				setFormOpen(false);
				fetchList(page);
			}
		} catch (err: any) {
			console.error('Save entry error:', err);
			const body = err?.response?.data;
			setFormError(body?.errors ?? body?.error ?? 'Failed to save. Please try again.');
		} finally {
			setFormSaving(false);
		}
	};

	const handleUploadFiles = async (fileList: FileList | null) => {
		if (!fileList || fileList.length === 0 || !formData.no) return;
		setUploading(true);
		try {
			const body = new FormData();
			Array.from(fileList).forEach((f) => body.append('files', f));
			const response = await api.post(`/MasterData/watchlist-corsec/${formData.no}/attachments`, body, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			setAttachments((prev) => [...prev, ...response.data.saved]);
		} catch (err: any) {
			console.error('Upload error:', err);
			alert(err?.response?.data?.error ?? 'Failed to upload file.');
		} finally {
			setUploading(false);
		}
	};

	const handleRemoveAttachment = async (filename: string) => {
		if (!formData.no) return;
		try {
			await api.delete(`/MasterData/watchlist-corsec/${formData.no}/attachments/${encodeURIComponent(filename)}`);
			const remaining = attachments.filter((f) => f !== filename);
			setAttachments(remaining);
			if (remaining.length + slots.length === 0) setSlots([null]);
		} catch (err) {
			console.error('Remove attachment error:', err);
			alert('Failed to remove attachment.');
		}
	};

	const openPicker = () => {
		setPickerQuery('');
		setPickerResults([]);
		setPickerOpen(true);
		runPickerSearch('');
	};

	const runPickerSearch = async (query: string = pickerQuery) => {
		setPickerLoading(true);
		try {
			const response = await api.get<{ data: CustomerLookupRow[] }>('/MasterData/customers', {
				params: { name: query, lessee_type: formData.lessee_type },
			});
			setPickerResults(response.data.data);
		} catch (err) {
			console.error('Customer picker search error:', err);
		} finally {
			setPickerLoading(false);
		}
	};

	const selectCustomer = (row: CustomerLookupRow) => {
		setFormData((prev) => ({
			...prev,
			name: row.name,
			address: row.address,
			phone: row.phone,
			id_card: row.id_card ?? prev.id_card,
			npwp: row.npwp ?? prev.npwp,
		}));
		setLockedFromPicker(true);
		setPickerOpen(false);
	};

	const openDeleteModal = (no: number) => {
		setDeleteNo(no);
		setDeleteReason('');
	};

	const confirmDelete = async () => {
		if (!deleteNo || !deleteReason.trim()) {
			alert('Please fill the reason for delete.');
			return;
		}
		setDeleting(true);
		try {
			await api.post(`/MasterData/watchlist-corsec/${deleteNo}/delete`, { reason: deleteReason });
			setDeleteNo(null);
			fetchList(page);
		} catch (err: any) {
			console.error('Delete error:', err);
			alert(err?.response?.data?.error ?? 'Failed to delete. Please try again.');
		} finally {
			setDeleting(false);
		}
	};

	const readOnly = formMode === 'view';
	const awaitingPick = formMode === 'create' && !lockedFromPicker;
	const off = readOnly || awaitingPick;
	const pickLabel = (text: string) =>
		formMode === 'create' ? (
			<button type="button" onClick={openPicker} className="text-blue-600 underline hover:text-blue-800 text-left">{text}</button>
		) : text;

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">

					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">Watchlist Entry</h1>
							<p className="text-[var(--app-muted)] mt-1 text-sm">
								Manage watchlisted customers (Individual &amp; Corporate)
							</p>
						</div>
						<div className="flex items-center gap-3">
							<span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
								Total: {total}
							</span>
							<button
								onClick={openCreate}
								className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
								</svg>
								Add Watchlist Entry
							</button>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-3 mb-6">
						<select
							value={searchBy}
							onChange={(e) => { setSearchBy(e.target.value as SearchBy); setSearchVal(''); }}
							style={selectStyle}
							className="border border-[var(--app-border)] bg-white text-[var(--app-text)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
						>
							<option value="" style={optionStyle}>All</option>
							<option value="1" style={optionStyle}>ID Card</option>
							<option value="2" style={optionStyle}>Name</option>
							<option value="3" style={optionStyle}>NPWP</option>
						</select>
						<div className="relative flex-1">
							<input
								type="text"
								value={searchVal}
								onChange={(e) => setSearchVal(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
								disabled={searchBy === ''}
								placeholder={searchBy === '' ? 'Showing all active entries' : 'Search…'}
								className="w-full border border-[var(--app-border)] rounded-lg pl-3 pr-10 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)]"
							/>
							{searchVal && (
								<button
									type="button"
									onClick={handleClearSearch}
									aria-label="Clear search"
									className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--app-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
								>
									<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
									</svg>
								</button>
							)}
						</div>
						<button
							onClick={handleSearch}
							disabled={loading}
							className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-75 shadow-sm transition-all"
						>
							{loading ? 'Searching…' : 'Search'}
						</button>
					</div>

					{listError && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
							{listError}
						</div>
					)}

					<div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
						<table className="w-full">
							<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
								<tr>
									{['No.', 'ID Card / NPWP', 'Name', 'Address', 'Type', 'Action'].map((h) => (
										<th
											key={h}
											className={`py-3 px-4 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider ${h === 'Action' ? 'whitespace-nowrap w-px' : ''}`}
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--app-border)]">
								{loading ? (
									<tr><td colSpan={6} className="py-16 text-center">
										<div className="flex justify-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
										</div>
									</td></tr>
								) : results.length === 0 ? (
									<tr><td colSpan={6} className="py-16 text-center text-[var(--app-muted)] text-sm">No records found</td></tr>
								) : (
									results.map((row, i) => (
										<tr
											key={row.no}
											className={`hover:bg-amber-50/30 transition-colors ${i % 2 === 0 ? 'bg-[var(--app-card)]' : 'bg-[var(--app-surface)]/50'}`}
										>
											<td className="py-3 px-4 text-sm text-[var(--app-muted)] text-center">
												{(page - 1) * PAGE_SIZE + i + 1}
											</td>
											<td className="py-3 px-4 text-sm font-mono text-[var(--app-text)]">{row.identitas}</td>
											<td className="py-3 px-4 text-sm font-medium text-[var(--app-text)]">{row.name}</td>
											<td className="py-3 px-4 text-sm text-[var(--app-muted)] max-w-xs truncate">{row.address}</td>
											<td className="py-3 px-4">
												<TypeBadge type={row.lessee_type} />
											</td>
											<td className="py-3 px-4 whitespace-nowrap">
												<div className="flex flex-nowrap items-center gap-2">
													<button
														onClick={() => loadEntry(row.no, 'edit')}
														className="shrink-0 whitespace-nowrap bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
													>
														Edit
													</button>
													<button
														onClick={() => loadEntry(row.no, 'view')}
														className="shrink-0 whitespace-nowrap bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
													>
														View
													</button>
													<button
														onClick={() => openDeleteModal(row.no)}
														className="shrink-0 whitespace-nowrap bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs font-medium transition-colors"
													>
														Delete
													</button>
												</div>
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
							onPageChange={(newPage) => fetchList(newPage)}
							totalItems={total}
							itemsPerPage={PAGE_SIZE}
							className="mt-6"
						/>
					)}
				</div>
			</div>

			{formOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-2xl w-full max-w-8xl my-8">

						<div className="flex justify-between items-center px-6 py-5 border-b">
							<div>
								<h2 className="text-xl font-bold text-[var(--app-text)]">
									{formMode === 'create' ? 'Add Watchlist Entry' : formMode === 'edit' ? 'Edit Watchlist Entry' : 'View Watchlist Entry'}
								</h2>
								<p className="text-sm text-[var(--app-muted)] mt-0.5">
									{formMode === 'create' ? 'Fill in all required fields' : (formData.name || ' ')}
								</p>
							</div>
							<button onClick={closeForm} className="text-[var(--app-muted)] hover:text-[var(--app-text)] text-2xl leading-none">×</button>
						</div>

						<div className="p-6">
							{formLoading ? (
								<div className="flex justify-center py-16">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
								</div>
							) : (
								<>
									{formError && (
										<div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 text-sm text-red-600">
											{Array.isArray(formError) ? (
												<ul className="list-disc pl-4 m-0">
													{formError.map((e) => <li key={e}>{e}</li>)}
												</ul>
											) : formError}
										</div>
									)}

									<h3 className="text-sm font-bold text-[var(--app-text)] mb-4">WATCHLIST</h3>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">

										<div className="space-y-3">
											<FormField label="Customer Type" required>
												<div className="flex gap-4 pt-1">
													{(['PR', 'PT'] as LesseeType[]).map((t) => (
														<label key={t} className="flex items-center gap-2 text-sm text-[var(--app-text)] cursor-pointer">
															<input
																type="radio"
																name="corsec_customer_type"
																checked={formData.lessee_type === t}
																disabled={readOnly || formMode === 'edit'}
																onChange={() => updateField('lessee_type', t)}
																className="accent-amber-600"
															/>
															{t === 'PR' ? 'Individual' : 'Corporate'}
														</label>
													))}
												</div>
											</FormField>

											<FormField label={pickLabel(formData.lessee_type === 'PR' ? 'Name in ID Card' : 'Name in Akta')} required>
												<input type="text" value={formData.name} disabled={off || lockedFromPicker}
													onChange={(e) => updateField('name', e.target.value)} className={inputCls} placeholder="Full name" />
											</FormField>

											{formData.lessee_type === 'PR' && (
												<FormField label="Alias Name">
													<input type="text" value={formData.alias_name} disabled={off}
														onChange={(e) => updateField('alias_name', e.target.value)} className={inputCls} placeholder="Alias / other name" />
												</FormField>
											)}

											<FormField label="Address" required>
												<textarea value={formData.address} disabled={off || lockedFromPicker} rows={3}
													onChange={(e) => updateField('address', e.target.value)} className={`${inputCls} resize-none`} placeholder="Full address" />
											</FormField>

											<FormField label="Phone">
												<input type="text" value={formData.phone} disabled={off || lockedFromPicker}
													onChange={(e) => updateField('phone', e.target.value)} className={inputCls} placeholder="08xx-xxxx-xxxx" />
											</FormField>

											{formData.lessee_type === 'PR' ? (
												<>
													<FormField label="ID Card No." required>
														<input type="text" value={formData.id_card} maxLength={16} disabled={off || lockedFromPicker}
															onChange={(e) => updateField('id_card', e.target.value.replace(/\D/g, ''))} className={inputCls} placeholder="16-digit KTP" />
													</FormField>
													<FormField label="Date of Birth">
														<AsOfDatePicker
															label=""
															format="DD-MM-YYYY"
															placeholder="dd-mm-yyyy"
															disabled={off}
															maxDate={new Date()}
															value={parseDDMMYYYY(formData.date_of_birth)}
															onChange={(d) => updateField('date_of_birth', formatDDMMYYYY(d))}
														/>
													</FormField>
													<FormField label="NPWP">
														<NpwpInput value={formData.npwp} disabled={off} onChange={(v) => updateField('npwp', v)} />
													</FormField>
													<FormField label="Spouse Name">
														<input type="text" value={formData.spouse_name} disabled={off}
															onChange={(e) => updateField('spouse_name', e.target.value)} className={inputCls} />
													</FormField>
													<FormField label="Mother's Maiden Name">
														<input type="text" value={formData.mothers_maiden_name} disabled={off}
															onChange={(e) => updateField('mothers_maiden_name', e.target.value)} className={inputCls} />
													</FormField>
												</>
											) : (
												<>
													<FormField label="NPWP" required>
														<NpwpInput value={formData.npwp} disabled={off || lockedFromPicker} onChange={(v) => updateField('npwp', v)} />
													</FormField>
													<FormField label="Establishment Date">
														<AsOfDatePicker
															label=""
															format="DD-MM-YYYY"
															placeholder="dd-mm-yyyy"
															disabled={off}
															maxDate={new Date()}
															value={parseDDMMYYYY(formData.date_of_birth)}
															onChange={(d) => updateField('date_of_birth', formatDDMMYYYY(d))}
														/>
													</FormField>

													<div className="pt-2 pb-1">
														<span className="text-sm font-bold text-[var(--app-text)] underline">Contact person</span>
													</div>

													<FormField label="Name">
														<input type="text" value={formData.contact_person} disabled={off}
															onChange={(e) => updateField('contact_person', e.target.value)} className={inputCls} />
													</FormField>
													<FormField label="Address">
														<textarea value={formData.contact_address} disabled={off} rows={3}
															onChange={(e) => updateField('contact_address', e.target.value)} className={`${inputCls} resize-none`} />
													</FormField>
													<FormField label="Group">
														<select value={formData.contact_group_code} disabled={off}
															onChange={(e) => updateField('contact_group_code', e.target.value)} style={selectStyle} className={selectCls}>
															<option value="" style={optionStyle}>— Select —</option>
															{groups.map((g) => <option key={g.code} value={g.code} style={optionStyle}>{g.name}</option>)}
														</select>
													</FormField>
												</>
											)}
										</div>

										<div className="space-y-3">
											<FormField label="Reason" required>
												<select value={CORSEC_REASON} disabled style={selectStyle} className={selectCls}>
													<option value={CORSEC_REASON} style={optionStyle}>{reasonLabel || CORSEC_REASON}</option>
												</select>
											</FormField>

											<FormField label="Remark">
												<textarea value={formData.remark} disabled={readOnly} rows={3} maxLength={1000}
													onChange={(e) => updateField('remark', e.target.value)} className={`${inputCls} resize-none`} />
											</FormField>

											<FormField label="Create By">
												<input type="text" readOnly value={formMode === 'create' ? currentUser : (formData.create_user ?? '')}
													className={`${inputCls} bg-[var(--app-surface)]`} />
											</FormField>
											<FormField label="Create Date">
												<input type="text" readOnly value={formMode === 'create' ? todayDisplay : (formData.create_date ?? '')}
													className={`${inputCls} bg-[var(--app-surface)]`} />
											</FormField>
											{formData.last_user && (
												<>
													<FormField label="Update by">
														<input type="text" readOnly value={formData.last_user} className={`${inputCls} bg-[var(--app-surface)]`} />
													</FormField>
													<FormField label="Last Update">
														<input type="text" readOnly value={formData.last_update ?? ''} className={`${inputCls} bg-[var(--app-surface)]`} />
													</FormField>
												</>
											)}

											<FormField label="Attachment">
												<div className="space-y-2">
													{attachments.map((f) => (
														<div key={f} className="flex items-center justify-between text-sm bg-[var(--app-surface)] rounded px-3 py-2">
															<a href={attachmentUrl(f)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">{f}</a>
															{!readOnly && (
																<button type="button" onClick={() => handleRemoveAttachment(f)} className="text-red-600 hover:text-red-800 text-xs ml-2">Remove</button>
															)}
														</div>
													))}
													{!readOnly && slots.map((f, idx) => (
															<div key={idx} className="flex items-center gap-2 bg-[var(--app-surface)] rounded px-2 py-2">
																<input
																	type="file"
																	disabled={uploading}
																	className="text-sm flex-1 min-w-0"
																	onChange={async (e) => {
																		const file = e.target.files?.[0] ?? null;
																		if (file && file.size > 2_000_000) {
																			setFormError('File size exceeds 2 MB.');
																			e.target.value = '';
																			return;
																		}
																		setFormError(null);
																		if (formData.no && file) {
																			await handleUploadFiles(e.target.files);
																			setSlots((prev) => prev.filter((_, j) => j !== idx));
																		} else {
																			setSlots((prev) => prev.map((x, j) => (j === idx ? file : x)));
																		}
																	}}
																/>
																{attachments.length + slots.length > 1 && (
																	<button
																		type="button"
																		title="Remove"
																		aria-label="Remove file slot"
																		onClick={() => setSlots((prev) => prev.filter((_, j) => j !== idx))}
																		className="shrink-0 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white text-lg leading-none flex items-center justify-center"
																	>
																		−
																	</button>
																)}
															</div>
														))}
														{!readOnly && attachments.length + slots.length < MAX_FILES && (
															<button
																type="button"
																onClick={() => setSlots((prev) => [...prev, null])}
																className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
															>
																+ Add file
															</button>
														)}
														<p className="text-xs text-[var(--app-muted)]">Min 1, max 3 files. Document file max. 2 MB</p>
												</div>
											</FormField>
										</div>
									</div>
								</>
							)}
						</div>

						<div className="flex justify-end gap-3 px-6 py-4 border-t bg-[var(--app-surface)] rounded-b-2xl">
							<button
								onClick={closeForm}
								className="px-5 py-2 border border-[var(--app-border)] rounded-lg text-sm text-[var(--app-text)] hover:bg-[var(--app-surface-alt)] transition-colors"
							>
								{readOnly ? 'Close' : 'Cancel'}
							</button>
							{!readOnly && (
								<button
									onClick={handleSave}
									disabled={formSaving || formLoading}
									className={`px-6 py-2 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2 ${formSaving ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'}`}
								>
									{formSaving && <SpinnerIcon />}
									{formSaving ? 'Saving…' : 'Save Entry'}
								</button>
							)}
						</div>
					</div>
				</div>
			)}

			{pickerOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
						<div className="flex justify-between items-center p-4 border-b">
							<h3 className="font-bold text-[var(--app-text)]">Select Customer</h3>
							<button onClick={() => setPickerOpen(false)} className="text-[var(--app-muted)] hover:text-[var(--app-muted)] text-2xl leading-none transition-colors">
								×
							</button>
						</div>
						<div className="p-4 border-b flex gap-2">
							<div className="relative flex-1">
								<input
									type="text"
									value={pickerQuery}
									onChange={(e) => setPickerQuery(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && runPickerSearch(pickerQuery)}
									placeholder="Search by name (optional)"
									className="w-full pl-3 pr-10 py-2 rounded-lg border border-[var(--app-border)] text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
								/>
								{pickerQuery && (
									<button
										type="button"
										onClick={() => { setPickerQuery(''); runPickerSearch(''); }}
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
								onClick={() => runPickerSearch(pickerQuery)}
								className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
							>
								Search
							</button>
						</div>
						<div className="overflow-y-auto flex-grow">
							{pickerLoading ? (
								<div className="flex justify-center py-10">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
								</div>
							) : (
								<table className="w-full text-sm">
									<tbody className="divide-y divide-[var(--app-border)]">
										{pickerResults.map((row) => (
											<tr key={row.apless} className="hover:bg-[var(--app-surface)] cursor-pointer transition-colors" onClick={() => selectCustomer(row)}>
												<td className="py-2 px-4">
													<div className="font-medium text-[var(--app-text)]">{row.name}</div>
													<div className="text-xs text-[var(--app-muted)]">{row.address}</div>
												</td>
												<td className="py-2 px-4 text-right text-xs text-[var(--app-muted)]">{row.apless}</td>
											</tr>
										))}
										{pickerResults.length === 0 && (
											<tr><td className="py-8 text-center text-[var(--app-muted)] text-sm">No customers found.</td></tr>
										)}
									</tbody>
								</table>
							)}
						</div>
					</div>
				</div>
			)}

			{deleteNo !== null && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-xl w-full max-w-md p-6">
						<h3 className="font-bold text-[var(--app-text)] mb-4">Delete Watchlist Entry</h3>
						<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Reason for delete</label>
						<textarea
							value={deleteReason}
							onChange={(e) => setDeleteReason(e.target.value)}
							className="w-full px-3 py-2 rounded-lg border border-[var(--app-border)] text-sm mb-4"
							rows={3}
						/>
						<div className="flex justify-end gap-3">
							<button
								onClick={() => setDeleteNo(null)}
								className="px-5 py-2 border border-[var(--app-border)] rounded-lg text-sm text-[var(--app-text)] hover:bg-[var(--app-surface-alt)] transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={confirmDelete}
								disabled={deleting}
								className={`px-5 py-2 rounded-lg text-sm text-white font-medium transition-colors flex items-center gap-2 ${deleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'
									}`}
							>
								{deleting && <SpinnerIcon />}
								{deleting ? 'Deleting…' : 'Delete'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default WatchListEntryByCorsec;
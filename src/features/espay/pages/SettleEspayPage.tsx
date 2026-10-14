import React, { useState, useCallback } from "react";
import api from '@/shared/api/axiosInstance';
import Formatter from '@/helpers/Formatter';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';

interface HistoryRow {
	cd_history_bgiro: string;
	lease_no: string;
	period: string;
	giro_dt: string;
	nominal: string;
	payment_dt: string;
	voucher: string;
	trcode: string;
	status: string;
	payment: string;
	trans_type: string;
	payment_ref: string;
	payment_date: string;
}

type Notice = { type: 'success' | 'error'; text: string } | null;

const toLocalISO = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const thCls = "py-2 px-3 text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider border border-[var(--app-border)]";
const tdCls = "py-2 px-3 whitespace-nowrap text-sm border border-[var(--app-border)]";
const errMsg = (e: any, fallback: string) => e?.response?.data?.error || e?.message || fallback;

const SettleEspayPage: React.FC = () => {
	const [idInput, setIdInput] = useState('');
	const [appliedId, setAppliedId] = useState('');
	const [rows, setRows] = useState<HistoryRow[]>([]);
	const [searched, setSearched] = useState(false);
	const [loading, setLoading] = useState(false);
	const [notice, setNotice] = useState<Notice>(null);

	const [confirmDelete, setConfirmDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);

	const [updateOpen, setUpdateOpen] = useState(false);
	const [payDate, setPayDate] = useState<Date>(new Date());
	const [debitFrom, setDebitFrom] = useState('');
	const [updating, setUpdating] = useState(false);
	const [updateError, setUpdateError] = useState('');

	const load = useCallback(async (id: string) => {
		setLoading(true);
		try {
			const res = await api.get('/SettleEspay/list', { params: { id_trans: id } });
			setRows(res.data?.data ?? []);
			setAppliedId(id);
			setSearched(true);
			return true;
		} catch (e: any) {
			setRows([]);
			setSearched(false);
			setNotice({ type: 'error', text: errMsg(e, 'Failed to load data') });
			return false;
		} finally {
			setLoading(false);
		}
	}, []);

	const handleSearch = async () => {
		const id = idInput.trim();
		if (!id) {
			setNotice({ type: 'error', text: 'Please enter ID Transaksi ESPAY' });
			return;
		}
		setNotice(null);
		await load(id);
	};

	const handleDelete = async () => {
		setDeleting(true);
		try {
			const res = await api.post('/SettleEspay/delete', { id_trans: appliedId });
			setConfirmDelete(false);
			await load(appliedId);
			setNotice({ type: 'success', text: `${res.data?.message ?? 'DELETE SUCCESSFUL'} (${res.data?.deleted ?? 0} row(s) removed)` });
		} catch (e: any) {
			setConfirmDelete(false);
			setNotice({ type: 'error', text: errMsg(e, 'Delete failed') });
		} finally {
			setDeleting(false);
		}
	};

	const openUpdate = () => {
		setPayDate(new Date());
		setDebitFrom('');
		setUpdateError('');
		setUpdateOpen(true);
	};

	const handleUpdate = async () => {
		if (!debitFrom.trim()) {
			setUpdateError('Debit From is required');
			return;
		}
		setUpdating(true);
		setUpdateError('');
		try {
			const res = await api.post('/SettleEspay/update', {
				id_trans: appliedId,
				payment_date: toLocalISO(payDate),
				debit_from: debitFrom.trim(),
			});
			setUpdateOpen(false);
			await load(appliedId);
			const n = res.data?.updated ?? 0;
			setNotice(n > 0
				? { type: 'success', text: `${res.data?.message ?? 'UPDATE SUCCESSFUL'} (${n} invoice(s) updated)` }
				: { type: 'error', text: 'No invoice updated: none match, or they already have a Payment Ref.' });
		} catch (e: any) {
			setUpdateError(errMsg(e, 'Update failed'));
		} finally {
			setUpdating(false);
		}
	};

	const hasRows = rows.length > 0;
	const actionsDisabled = loading || !searched || !hasRows;

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">Settle ESPAY</h1>
							<p className="text-[var(--app-muted)] mt-1">Search an ESPAY transaction, then reset or settle it</p>
						</div>
						{searched && (
							<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium self-start md:self-auto">
								Total: {rows.length}
							</span>
						)}
					</div>

					{notice && (
						<div className={`mb-4 p-4 rounded-lg border ${notice.type === 'success'
							? 'bg-green-50 border-green-200 text-green-700'
							: 'bg-red-50 border-red-200 text-red-700'}`}>
							{notice.text}
						</div>
					)}

					<div className="flex flex-col md:flex-row md:items-end gap-3 mb-6">
						<div className="flex-1 max-w-md">
							<label className="block text-sm font-medium text-[var(--app-text)] mb-1">ID Transaksi ESPAY</label>
							<input
								type="text"
								value={idInput}
								onChange={e => setIdInput(e.target.value)}
								onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
								className="w-full px-3 py-2 border border-[var(--app-border)] rounded-md bg-[var(--app-card)] text-[var(--app-text)]
								           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
							/>
						</div>
						<div className="flex gap-2">
							<button
								onClick={handleSearch}
								disabled={loading || !idInput.trim()}
								className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed
								           text-white px-5 py-2 rounded-md text-sm font-semibold transition-colors"
							>
								Search
							</button>
							<button
								onClick={() => setConfirmDelete(true)}
								disabled={actionsDisabled}
								className="bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed
								           text-white px-5 py-2 rounded-md text-sm font-semibold transition-colors"
							>
								Delete
							</button>
							<button
								onClick={openUpdate}
								disabled={actionsDisabled}
								className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed
								           text-white px-5 py-2 rounded-md text-sm font-semibold transition-colors"
							>
								Update
							</button>
						</div>
					</div>

					<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
						<table className="w-full border-collapse">
							<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
								<tr>
									<th colSpan={8} className={`${thCls} text-center`}>BGHISTORY</th>
									<th colSpan={2} className={`${thCls} text-center`}>BGIRO</th>
									<th colSpan={3} className={`${thCls} text-center`}>ESPAY_INVOICE</th>
								</tr>
								<tr>
									{['CD_HISTORY_BGIRO', 'LEASE_NO', 'PERIOD', 'GIRO_DT', 'NOMINAL', 'PAYMENT_DT', 'VOUCHER', 'TRCODE',
										'STATUS', 'PAYMENT', 'TRANS_TYPE', 'PAYMENT_REF', 'PAYMENT_DATE'].map(h => (
											<th key={h} className={`${thCls} text-center`}>{h}</th>
										))}
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan={13} className="py-10 text-center">
											<div className="flex justify-center">
												<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
											</div>
										</td>
									</tr>
								) : !hasRows ? (
									<tr>
										<td colSpan={13} className="py-10 text-center text-[var(--app-muted)]">
											{searched ? 'Data not found' : 'Enter an ID Transaksi ESPAY and press Search'}
										</td>
									</tr>
								) : (
									rows.map((r, i) => (
										<tr key={`${r.cd_history_bgiro}-${r.lease_no}-${r.period}-${i}`}
											className="bg-[var(--app-card)] text-[var(--app-text)] hover:opacity-90 transition-opacity">
											<td className={tdCls}>{r.cd_history_bgiro}</td>
											<td className={tdCls}>{r.lease_no}</td>
											<td className={`${tdCls} text-center`}>{r.period}</td>
											<td className={`${tdCls} text-center`}>{r.giro_dt}</td>
											<td className={`${tdCls} text-right`}>{r.nominal ? Formatter.formatThousands(r.nominal) : ''}</td>
											<td className={`${tdCls} text-center`}>{r.payment_dt}</td>
											<td className={`${tdCls} text-center`}>{r.voucher}</td>
											<td className={`${tdCls} text-center`}>{r.trcode}</td>
											<td className={`${tdCls} text-center`}>{r.status}</td>
											<td className={`${tdCls} text-center`}>{r.payment}</td>
											<td className={`${tdCls} text-center`}>{r.trans_type}</td>
											<td className={`${tdCls} text-center`}>{r.payment_ref}</td>
											<td className={`${tdCls} text-center`}>{r.payment_date}</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{confirmDelete && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
						<div className="p-6">
							<h2 className="text-xl font-bold text-[var(--app-text)] mb-3">Delete history?</h2>
							<p className="text-sm text-[var(--app-text)]">
								This deletes {rows.length} BGHISTORY row(s) for <span className="font-semibold">{appliedId}</span> and
								resets their BGIRO Status and Payment. It cannot be undone.
							</p>
						</div>
						<div className="p-4 border-t flex justify-end gap-3">
							<button
								onClick={() => setConfirmDelete(false)}
								disabled={deleting}
								className="px-4 py-2 border border-[var(--app-border)] rounded-md text-sm text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors"
							>
								Cancel
							</button>
							<button
								onClick={handleDelete}
								disabled={deleting}
								className="bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
							>
								{deleting ? 'Deleting…' : 'Delete'}
							</button>
						</div>
					</div>
				</div>
			)}

			{updateOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
						<div className="flex justify-between items-center p-6 border-b">
							<h2 className="text-xl font-bold text-[var(--app-text)]">Update Payment</h2>
							<button onClick={() => !updating && setUpdateOpen(false)} className="text-[var(--app-muted)] hover:text-[var(--app-text)]">
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						</div>
						<div className="p-6 space-y-4">
							<div>
								<label className="block text-sm font-medium text-[var(--app-text)] mb-1">ID Transaksi ESPAY</label>
								<input
									type="text"
									value={appliedId}
									readOnly
									className="w-full px-3 py-2 border border-[var(--app-border)] rounded-md bg-[var(--app-surface)] text-[var(--app-text)]"
								/>
							</div>
							<AsOfDatePicker
								label="Payment Date"
								value={payDate}
								onChange={(d) => { if (d) setPayDate(d); }}
								required
							/>
							<div>
								<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Debit From</label>
								<input
									type="text"
									value={debitFrom}
									onChange={e => setDebitFrom(e.target.value)}
									disabled={updating}
									placeholder="VA number"
									className="w-full px-3 py-2 border border-[var(--app-border)] rounded-md bg-[var(--app-card)] text-[var(--app-text)]
									           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
								/>
							</div>
							{updateError && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{updateError}</div>
							)}
						</div>
						<div className="p-4 border-t flex justify-end gap-3">
							<button
								onClick={() => setUpdateOpen(false)}
								disabled={updating}
								className="px-4 py-2 border border-[var(--app-border)] rounded-md text-sm text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors"
							>
								Close
							</button>
							<button
								onClick={handleUpdate}
								disabled={updating}
								className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
							>
								{updating ? 'Submitting…' : 'Submit'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default SettleEspayPage;
import React, { useCallback, useEffect, useMemo, useState } from "react";
import api from '@/shared/api/axiosInstance';
import Pagination from '@/helpers/Pagination';
import Formatter from '@/helpers/Formatter';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';
import { DEFAULT_PAGE_LIMIT } from '@/shared/constants/DefaultValue';

const ROWS_PER_PAGE = DEFAULT_PAGE_LIMIT;

interface ComboOption {
	value: string;
	label: string;
}

interface InvoiceRow {
	id_data: number;
	invoice_date: string;
	contract_no: string;
	customer_name: string;
	tot_amt: string;
	expired_date: string;
	payment_type: string;
	period: string;
	invoice_status: string;
	payment_date: string;
}

interface ContractData {
	customer_name: string;
	due_dt: string;
	nominal: string;
	overdue: string;
	period: string;
	et_paid: string;
	error?: string;
}

interface MultiContractRow {
	lease_no: string;
	customer_name: string;
	due_dt: string;
	amount: number;
	period: string;
}

type FieldConfig = {
	showContract: boolean;
	showTotInv: boolean;
	showDueDate: boolean;
	showOdPeriod: boolean;
	showEt: boolean;
	showMulti: boolean;
	dueDateReadOnly?: boolean;
	etReadOnly?: boolean;
	totInvReadOnly?: boolean;
};

function getFieldConfig(paymentFor: string): FieldConfig {
	switch (paymentFor) {
		case 'INSTALLMENT':
			return { showContract: true, showTotInv: true, showDueDate: true, showOdPeriod: false, showEt: false, showMulti: false, dueDateReadOnly: true, totInvReadOnly: true };
		case 'ET':
			return { showContract: true, showTotInv: true, showDueDate: false, showOdPeriod: false, showEt: true, showMulti: false, etReadOnly: true, totInvReadOnly: false };
		case 'PENALTY':
			return { showContract: true, showTotInv: true, showDueDate: false, showOdPeriod: false, showEt: false, showMulti: false, totInvReadOnly: false };
		case 'OVERDUE':
			return { showContract: true, showTotInv: true, showDueDate: true, showOdPeriod: true, showEt: false, showMulti: false, dueDateReadOnly: true, totInvReadOnly: true };
		case 'OTHERS':
			return { showContract: true, showTotInv: true, showDueDate: false, showOdPeriod: false, showEt: false, showMulti: false, totInvReadOnly: false };
		case 'MULTIPLE':
			return { showContract: false, showTotInv: false, showDueDate: false, showOdPeriod: false, showEt: false, showMulti: true };
		default:
			return { showContract: true, showTotInv: true, showDueDate: false, showOdPeriod: false, showEt: false, showMulti: false };
	}
}

const digitsOnly = (val: string) => val.replace(/[^0-9]/g, '');

const toApiDate = (date: Date | null): string => {
	if (!date) return '';
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${mm}-${dd}`;
};

const toDisplayDate = (date: Date | null): string => {
	if (!date) return '';
	const mm = String(date.getMonth() + 1).padStart(2, '0');
	const dd = String(date.getDate()).padStart(2, '0');
	return `${dd}-${mm}-${date.getFullYear()}`;
};

const addMonths = (date: Date, months: number): Date => {
	const next = new Date(date);
	next.setMonth(next.getMonth() + months);
	return next;
};

const esc = (v: unknown) =>
	String(v ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

const EspayInvoicePage: React.FC = () => {
	const [searchByOptions, setSearchByOptions] = useState<ComboOption[]>([]);
	const [paymentForOptions, setPaymentForOptions] = useState<ComboOption[]>([]);
	const [invoiceStatusOptions, setInvoiceStatusOptions] = useState<ComboOption[]>([]);

	const [searchBy, setSearchBy] = useState('All');
	const [searchText, setSearchText] = useState('');
	const [searchDateFrom, setSearchDateFrom] = useState<Date | null>(null);
	const [searchDateTo, setSearchDateTo] = useState<Date | null>(null);
	const [searchPaymentFor, setSearchPaymentFor] = useState('');
	const [searchInvoiceStatus, setSearchInvoiceStatus] = useState('');

	const [rows, setRows] = useState<InvoiceRow[]>([]);
	const [hasSearched, setHasSearched] = useState(false);
	const [loading, setLoading] = useState(false);
	const [pageError, setPageError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [exporting, setExporting] = useState(false);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const [modalOpen, setModalOpen] = useState(false);
	const [modalError, setModalError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [leaseNo, setLeaseNo] = useState('');
	const [lesseeName, setLesseeName] = useState('');
	const [paymentFor, setPaymentFor] = useState('');
	const [dueDate, setDueDate] = useState('');
	const [odPeriod, setOdPeriod] = useState('');
	const [etDate, setEtDate] = useState('');
	const [etAmt, setEtAmt] = useState('');
	const [etPaid, setEtPaid] = useState('');
	const [totInv, setTotInv] = useState('');
	const [period, setPeriod] = useState('');
	const [etLeft, setEtLeft] = useState('');

	const [multiEntry, setMultiEntry] = useState('');
	const [multiRows, setMultiRows] = useState<MultiContractRow[]>([]);
	const [multiLoading, setMultiLoading] = useState(false);

	const fieldConfig = useMemo(() => getFieldConfig(paymentFor), [paymentFor]);

	useEffect(() => {
		(async () => {
			try {
				const response = await api.get('/Espay/search-options');
				setSearchByOptions(response.data?.search_by ?? []);
				setPaymentForOptions(response.data?.payment_for ?? []);
				setInvoiceStatusOptions(response.data?.invoice_status ?? []);
			} catch (err) {
				console.error('Failed to load search options:', err);
			}
		})();
	}, []);

	const validateDateRange = (): string | null => {
		if (!searchDateFrom || !searchDateTo) {
			return 'Please select both start and end dates.';
		}
		if (searchDateTo < searchDateFrom) {
			return 'End date cannot be earlier than the start date.';
		}
		if (searchDateTo > addMonths(searchDateFrom, 1)) {
			return 'The selected date range cannot exceed one calendar month.';
		}
		return null;
	};

	const buildSearchParams = useCallback(() => {
		let searchVal: string = 'All';
		let searchValTo: string | null = null;

		if (searchBy === '1' || searchBy === '2') searchVal = searchText;
		else if (searchBy === '3') { searchVal = toApiDate(searchDateFrom); searchValTo = toApiDate(searchDateTo); }
		else if (searchBy === '4') searchVal = searchPaymentFor;
		else if (searchBy === '5') searchVal = searchInvoiceStatus;
		else if (searchBy === '6') searchVal = toApiDate(searchDateFrom);

		return { search_by: searchBy, search_val: searchVal, search_val_to: searchValTo };
	}, [searchBy, searchText, searchDateFrom, searchDateTo, searchPaymentFor, searchInvoiceStatus]);

	const handleSearch = useCallback(async () => {
		if (searchBy === '3') {
			const rangeError = validateDateRange();
			if (rangeError) {
				setPageError(rangeError);
				return;
			}
		}
		if (searchBy === '6' && !searchDateFrom) {
			setPageError('Please select a date.');
			return;
		}

		setLoading(true);
		setPageError(null);
		try {
			const response = await api.get('/Espay/invoice', { params: buildSearchParams() });
			const data: InvoiceRow[] = response.data?.data ?? [];
			setRows(data);
			setHasSearched(true);
			setPage(1);
			if (data.length === 0) {
				setPageError('No invoice records found for this search.');
			}
		} catch (err) {
			console.error('Search error:', err);
			setPageError('Failed to load invoice data. Please try again.');
			setRows([]);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [buildSearchParams, searchBy, searchDateFrom, searchDateTo]);

	const handleSearchByChange = (value: string) => {
		setSearchBy(value);
		setSearchText('');
		setSearchDateFrom(null);
		setSearchDateTo(null);
		setSearchPaymentFor('');
		setSearchInvoiceStatus('');
	};

	const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
	const paginatedRows = useMemo(() => {
		const start = (page - 1) * ROWS_PER_PAGE;
		return rows.slice(start, start + ROWS_PER_PAGE);
	}, [rows, page]);

	const clearContractFields = () => {
		setLesseeName('');
		setDueDate('');
		setOdPeriod('');
		setEtDate('');
		setEtAmt('');
		setEtPaid('');
		setTotInv('');
		setPeriod('');
		setEtLeft('');
	};

	const resetModal = () => {
		setLeaseNo('');
		setPaymentFor('');
		clearContractFields();
		setMultiEntry('');
		setMultiRows([]);
		setModalError(null);
	};

	const openAddModal = () => {
		resetModal();
		setModalOpen(true);
	};

	const closeModal = () => {
		setModalOpen(false);
		setModalError(null);
	};

	const fetchContractData = useCallback(async (lease: string, pmt: string) => {
		if (!lease || !pmt) return;
		try {
			const response = await api.get<ContractData>('/Espay/invoice/contract', {
				params: { lease_no: lease, payment_for: pmt }
			});
			const data = response.data;
			setLesseeName(data.customer_name);
			setDueDate(data.due_dt);
			setTotInv(data.nominal);
			setOdPeriod(data.overdue);
			setPeriod(data.period);
			setEtDate(data.due_dt);
			setEtAmt(data.overdue);
			setEtPaid(data.et_paid);
			setEtLeft(data.nominal);
			setModalError(null);
		} catch (err) {
			clearContractFields();
			setModalError('Data not found for this contract.');
		}
	}, []);

	const handleLeaseNoBlur = () => {
		if (paymentFor && paymentFor !== 'MULTIPLE') {
			fetchContractData(leaseNo, paymentFor);
		}
	};

	const fetchMultiContractRow = async (leaseValue: string, currentRows: MultiContractRow[]) => {
		const lease = leaseValue.trim();
		if (!lease) return;

		if (currentRows.some(r => r.lease_no === lease)) {
			setModalError('This contract no. has already been added.');
			return;
		}

		const refLeaseNo = currentRows.length > 0 ? currentRows[0].lease_no : '';

		setMultiLoading(true);
		try {
			const response = await api.get<ContractData>('/Espay/invoice/contract', {
				params: { lease_no: lease, payment_for: 'MULTIPLE', ref_lease_no: refLeaseNo }
			});
			const data = response.data;

			if (data?.error === 'different_customer') {
				setModalError('Not same customer.');
				setMultiEntry('');
				return;
			}
			if (data?.error) {
				setModalError('Data not found.');
				setMultiEntry('');
				return;
			}

			const amount = parseFloat(data.nominal) || 0;
			setMultiRows(prev => [...prev, {
				lease_no: lease,
				customer_name: data.customer_name || '',
				due_dt: data.due_dt || '',
				amount,
				period: data.period || '',
			}]);
			setMultiEntry('');
			setModalError(null);
		} catch (err) {
			setModalError('Data not found.');
			setMultiEntry('');
		} finally {
			setMultiLoading(false);
		}
	};

	const handlePaymentForChange = async (value: string) => {
		setPaymentFor(value);
		setModalError(null);

		if (value === 'MULTIPLE') {
			clearContractFields();
			setMultiRows([]);
			const existingLease = leaseNo.trim();
			if (existingLease) {
				setMultiEntry(existingLease);
				await fetchMultiContractRow(existingLease, []);
			}
			return;
		}

		setMultiRows([]);
		setMultiEntry('');
		if (leaseNo) {
			fetchContractData(leaseNo, value);
		}
	};

	const handleOdPeriodChange = async (value: string) => {
		setOdPeriod(value);
		if (!value || !leaseNo) return;
		try {
			const response = await api.post('/Espay/invoice/overdue', {
				od_period: value, lease_no: leaseNo, period
			});
			setTotInv(response.data?.nominal ?? '');
			setModalError(null);
		} catch (err) {
			setTotInv('');
			setModalError('Data not found for that overdue period.');
		}
	};

	const removeMultiRow = (lease: string) => {
		setMultiRows(prev => prev.filter(r => r.lease_no !== lease));
	};

	const multiTotal = useMemo(
		() => multiRows.reduce((sum, r) => sum + r.amount, 0),
		[multiRows]
	);

	const handleSubmitSingle = async () => {
		if (!leaseNo || !paymentFor) {
			setModalError('Please fill in Contract No. and Payment For.');
			return;
		}
		if (paymentFor === 'ET' && (Number(totInv) > Number(etLeft) || Number(totInv) === 0)) {
			setModalError('Invalid Total Amount.');
			return;
		}

		setSubmitting(true);
		setModalError(null);
		try {
			const response = await api.post('/Espay/invoice', {
				lease_no: leaseNo,
				payment_for: paymentFor,
				period,
				od_period: odPeriod,
				et_date: etDate,
				tot_inv: totInv,
				et_amt: etAmt,
			});
			closeModal();
			setPageError(null);
			await handleSearch();
			window.alert(response.data?.message ?? 'Invoice saved.');
		} catch (err: any) {
			setModalError(err?.response?.data?.message ?? 'Failed to save invoice. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleSubmitMultiple = async () => {
		if (multiRows.length === 0) {
			setModalError('Please type at least one contract no. and press Enter to fetch its data first.');
			return;
		}

		setSubmitting(true);
		setModalError(null);
		try {
			const response = await api.post('/Espay/invoice/multiple', {
				rows: multiRows.map(r => ({
					lease_no: r.lease_no,
					due_dt: r.due_dt,
					total: r.amount,
					period: r.period,
				})),
			});
			closeModal();
			setPageError(null);
			await handleSearch();
			window.alert(response.data?.message ?? 'Invoices saved.');
		} catch (err: any) {
			setModalError(err?.response?.data?.message ?? 'Failed to save invoices. Please try again.');
		} finally {
			setSubmitting(false);
		}
	};

	const handleSubmit = () => {
		if (paymentFor === 'MULTIPLE') {
			handleSubmitMultiple();
		} else {
			handleSubmitSingle();
		}
	};

	const handleDelete = async (idData: number) => {
		if (!window.confirm('Delete this invoice?')) return;
		setDeletingId(idData);
		try {
			const response = await api.delete(`/Espay/invoice/${idData}`);
			window.alert(response.data?.message ?? 'Invoice deleted.');
			await handleSearch();
		} catch (err: any) {
			setPageError(err?.response?.data?.message ?? 'Failed to delete invoice. Please try again.');
		} finally {
			setDeletingId(null);
		}
	};

	const handleExport = async () => {
		setExporting(true);
		try {
			const response = await api.get('/Espay/invoice/export', {
				params: buildSearchParams(),
				responseType: 'blob',
			});
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement('a');
			link.href = url;
			link.setAttribute('download', 'espay_invoice.xlsx');
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.URL.revokeObjectURL(url);
		} catch (err) {
			setPageError('Failed to export invoices. Please try again.');
		} finally {
			setExporting(false);
		}
	};

	const handlePrint = () => {
		if (rows.length === 0) return;

		const printWindow = window.open('', '_blank');
		if (!printWindow) {
			setPageError('Popup blocked. Please allow popups for this site.');
			return;
		}

		const body = rows.map((r, i) => `
			<tr>
				<td class="c">${i + 1}</td>
				<td>${esc(r.invoice_date)}</td>
				<td>${esc(r.contract_no)}</td>
				<td>${esc(r.customer_name)}</td>
				<td class="r">${esc(Formatter.formatThousands(r.tot_amt))}</td>
				<td>${esc(r.expired_date)}</td>
				<td>${esc(r.payment_type)}</td>
				<td>${esc(r.period)}</td>
				<td>${esc(r.invoice_status)}</td>
				<td>${esc(r.payment_date)}</td>
			</tr>`).join('');

		printWindow.document.write(`<!DOCTYPE html>
			<html>
			<head>
				<meta charset="utf-8">
				<title>ESPAY Invoice</title>
				<style>
					body { font-family: Arial, sans-serif; font-size: 12px; margin: 16px; }
					h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
					.meta { text-align: center; margin-bottom: 12px; color: #444; }
					table { width: 100%; border-collapse: collapse; }
					th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: top; }
					th { background: #f0f0f0; }
					thead { display: table-header-group; }
					tr { page-break-inside: avoid; }
					.c { text-align: center; }
					.r { text-align: right; }
					@page { size: landscape; margin: 10mm; }
				</style>
			</head>
			<body onload="window.print()" onafterprint="window.close()">
				<h1>ESPAY Invoice</h1>
				<div class="meta">Total records: ${rows.length}</div>
				<table>
					<thead>
						<tr>
							<th class="c">No.</th>
							<th>Invoice / Due / ET Date</th>
							<th>Contract No.</th>
							<th>Customer Name</th>
							<th class="r">Amount</th>
							<th>Expired Date</th>
							<th>Payment Type</th>
							<th>Period</th>
							<th>Status</th>
							<th>Payment Date</th>
						</tr>
					</thead>
					<tbody>${body}</tbody>
				</table>
			</body>
			</html>`);
					printWindow.document.close();
				};

	const canPrintOrExport = hasSearched && rows.length > 0;
	const inputCls = "w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-card)] text-[var(--app-text)]";

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6 mb-6">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">ESPAY Invoice</h1>
							<p className="text-[var(--app-muted)] mt-1">Search, review, and manage ESPAY invoice records</p>
						</div>
						<button
							onClick={openAddModal}
							className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
						>
							+ Add Invoice
						</button>
					</div>

					<div className="bg-[var(--app-surface)] rounded-xl p-4 border border-[var(--app-border)] mb-6">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Search By</label>
								<select
									value={searchBy}
									onChange={(e) => handleSearchByChange(e.target.value)}
									className={inputCls}
								>
									<option value="All">TOP 100</option>
									{searchByOptions.map(opt => (
										<option key={opt.value} value={opt.value}>{opt.label}</option>
									))}
								</select>
							</div>

							{(searchBy === '1' || searchBy === '2') && (
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Value</label>
									<input
										type="text"
										value={searchText}
										onChange={(e) => setSearchText(e.target.value)}
										onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
										className={inputCls}
									/>
								</div>
							)}

							{searchBy === '3' && (
								<>
									<div>
										<AsOfDatePicker
											label="From"
											format="DD-MM-YYYY"
											placeholder="dd-mm-yyyy"
											value={searchDateFrom}
											onChange={(d) => { setSearchDateFrom(d); setSearchDateTo(null); }}
											required
										/>
									</div>
									<div>
										<AsOfDatePicker
											label="To"
											format="DD-MM-YYYY"
											placeholder="dd-mm-yyyy"
											value={searchDateTo}
											onChange={setSearchDateTo}
											minDate={searchDateFrom ?? undefined}
											maxDate={searchDateFrom ? addMonths(searchDateFrom, 1) : undefined}
											required
										/>
										<p className="text-xs text-[var(--app-muted)] mt-1">Range can't exceed one month.</p>
									</div>
								</>
							)}

							{searchBy === '4' && (
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Payment For</label>
									<select
										value={searchPaymentFor}
										onChange={(e) => setSearchPaymentFor(e.target.value)}
										className={inputCls}
									>
										<option value="">Select</option>
										{paymentForOptions.map(opt => (
											<option key={opt.value} value={opt.value}>{opt.label}</option>
										))}
									</select>
								</div>
							)}

							{searchBy === '5' && (
								<div className="md:col-span-2">
									<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Status</label>
									<select
										value={searchInvoiceStatus}
										onChange={(e) => setSearchInvoiceStatus(e.target.value)}
										className={inputCls}
									>
										<option value="">Select</option>
										{invoiceStatusOptions.map(opt => (
											<option key={opt.value} value={opt.value}>{opt.label}</option>
										))}
									</select>
								</div>
							)}

							{searchBy === '6' && (
								<div>
									<AsOfDatePicker
										label="Date"
										format="DD-MM-YYYY"
										placeholder="dd-mm-yyyy"
										value={searchDateFrom}
										onChange={setSearchDateFrom}
										required
									/>
								</div>
							)}
						</div>

						<div className="flex flex-wrap gap-3 mt-5">
							<button
								onClick={handleSearch}
								disabled={loading}
								className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all disabled:opacity-50"
							>
								{loading ? 'Searching…' : 'Search'}
							</button>

							{canPrintOrExport && (
								<>
									<button
										onClick={handlePrint}
										className="bg-[#25439B] hover:opacity-90 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
									>
										Print
									</button>
									<button
										onClick={handleExport}
										disabled={exporting}
										className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
									>
										{exporting ? 'Exporting…' : 'Export to Excel'}
									</button>
								</>
							)}
						</div>
					</div>

					{pageError && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
							{pageError}
						</div>
					)}

					<div className="overflow-x-auto rounded-lg border border-[var(--app-border)]">
						<table className="w-full">
							<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
								<tr>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">No.</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Invoice / Due / ET Date</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Contract No.</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Customer Name</th>
									<th className="py-3 px-4 text-right text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Amount</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Expired Date</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Payment Type</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Period</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Status</th>
									<th className="py-3 px-4 text-left text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider">Payment Date</th>
									<th className="py-3 px-4 text-center text-xs font-medium text-[var(--app-muted)] uppercase tracking-wider"></th>
								</tr>
							</thead>
							<tbody className="divide-y divide-[var(--app-border)]">
								{loading ? (
									<tr>
										<td colSpan={11} className="py-10 px-6 text-center text-[var(--app-muted)]">
											<div className="flex justify-center">
												<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
											</div>
										</td>
									</tr>
								) : !hasSearched ? (
									<tr>
										<td colSpan={11} className="py-10 px-6 text-center text-[var(--app-muted)]">
											Run a search to see invoice records.
										</td>
									</tr>
								) : paginatedRows.length === 0 ? (
									<tr>
										<td colSpan={11} className="py-10 px-6 text-center text-[var(--app-muted)]">
											No invoice records found
										</td>
									</tr>
								) : (
									paginatedRows.map((row, index) => (
										<tr
											key={row.id_data}
											className={`hover:bg-[var(--app-surface)] transition-colors ${index % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}`}
										>
											<td className="py-3 px-4 text-sm text-center text-[var(--app-text)]">
												{(page - 1) * ROWS_PER_PAGE + index + 1}
											</td>
											<td className="py-3 px-4 text-sm text-[var(--app-text)]">{row.invoice_date}</td>
											<td className="py-3 px-4 text-sm text-[var(--app-text)] font-medium">{row.contract_no}</td>
											<td className="py-3 px-4 text-sm text-[var(--app-text)]">{row.customer_name}</td>
											<td className="py-3 px-4 text-sm text-[var(--app-text)] text-right">{Formatter.formatThousands(row.tot_amt)}</td>
											<td className="py-3 px-4 text-sm text-[var(--app-text)]">{row.expired_date}</td>
											<td className="py-3 px-4 text-sm text-[var(--app-text)]">{row.payment_type}</td>
											<td className="py-3 px-4 text-sm text-[var(--app-text)]">{row.period}</td>
											<td className="py-3 px-4 text-sm text-[var(--app-text)]">{row.invoice_status}</td>
											<td className="py-3 px-4 text-sm text-[var(--app-text)]">{row.payment_date}</td>
											<td className="py-3 px-4 text-sm text-center">
												{row.invoice_status === 'Open' && (
													<button
														onClick={() => handleDelete(row.id_data)}
														disabled={deletingId === row.id_data}
														className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
													>
														{deletingId === row.id_data ? 'Deleting…' : 'Delete'}
													</button>
												)}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{hasSearched && rows.length > 0 && (
						<Pagination
							page={page}
							totalPages={totalPages}
							onPageChange={setPage}
							totalItems={rows.length}
							itemsPerPage={ROWS_PER_PAGE}
							className="mt-6"
						/>
					)}
				</div>
			</div>

			{modalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
						<div className="flex justify-between items-center p-6 border-b border-[var(--app-border)]">
							<h2 className="text-xl font-bold text-[var(--app-text)]">Add Invoice</h2>
							<button onClick={closeModal} className="text-[var(--app-muted)] hover:text-[var(--app-text)]">
								<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						</div>

						<div className="overflow-y-auto p-6 space-y-4">
							{modalError && (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
									{modalError}
								</div>
							)}

							{fieldConfig.showContract && (
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Contract No.</label>
										<input
											type="text"
											maxLength={15}
											value={leaseNo}
											onChange={(e) => setLeaseNo(digitsOnly(e.target.value))}
											onBlur={handleLeaseNoBlur}
											placeholder="Enter contract no."
											className={inputCls}
										/>
									</div>
									<div>
										<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Customer Name</label>
										<input
											type="text"
											readOnly
											value={lesseeName}
											placeholder="Customer name"
											className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-surface)] text-[var(--app-muted)]"
										/>
									</div>
								</div>
							)}

							<div>
								<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Payment For</label>
								<select
									value={paymentFor}
									onChange={(e) => handlePaymentForChange(e.target.value)}
									className={inputCls}
								>
									<option value="">Select</option>
									{paymentForOptions.map(opt => (
										<option key={opt.value} value={opt.value}>{opt.label}</option>
									))}
								</select>
							</div>

							{fieldConfig.showDueDate && (
								<div>
									<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Due Date</label>
									<input
										type="text"
										readOnly={fieldConfig.dueDateReadOnly}
										value={dueDate}
										onChange={(e) => setDueDate(e.target.value)}
										className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-surface)] text-[var(--app-text)]"
									/>
								</div>
							)}

							{fieldConfig.showOdPeriod && (
								<div>
									<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Overdue Period</label>
									<input
										type="text"
										value={odPeriod}
										onChange={(e) => setOdPeriod(digitsOnly(e.target.value))}
										onBlur={(e) => handleOdPeriodChange(digitsOnly(e.target.value))}
										className={inputCls}
									/>
								</div>
							)}

							{fieldConfig.showEt && (
								<div className="grid grid-cols-3 gap-3">
									<div>
										<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">ET Date</label>
										<input
											type="text"
											readOnly={fieldConfig.etReadOnly}
											value={etDate}
											className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-surface)] text-[var(--app-text)]"
										/>
									</div>
									<div>
										<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">ET Pay</label>
										<input
											type="text"
											readOnly={fieldConfig.etReadOnly}
											value={etAmt}
											className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-surface)] text-[var(--app-text)]"
										/>
									</div>
									<div>
										<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">ET Pay Received</label>
										<input
											type="text"
											readOnly={fieldConfig.etReadOnly}
											value={etPaid}
											className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm bg-[var(--app-surface)] text-[var(--app-text)]"
										/>
									</div>
								</div>
							)}

							{fieldConfig.showMulti && (
								<div>
									<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Contracts</label>
									<table className="w-full border border-[var(--app-border)] rounded-lg overflow-hidden text-sm">
										<thead className="bg-[var(--app-surface)]">
											<tr>
												<th className="px-2 py-2 text-left">Contract No.</th>
												<th className="px-2 py-2 text-left">Customer Name</th>
												<th className="px-2 py-2 text-left">Due Date</th>
												<th className="px-2 py-2 text-right">Amount</th>
												<th className="px-2 py-2"></th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--app-border)]">
											<tr>
												<td className="px-2 py-2">
													<input
														type="text"
														maxLength={15}
														value={multiEntry}
														placeholder="Enter contract no."
														onChange={(e) => setMultiEntry(digitsOnly(e.target.value))}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																fetchMultiContractRow(multiEntry, multiRows);
															}
														}}
														className="w-full border border-[var(--app-border)] rounded px-2 py-1 bg-[var(--app-card)] text-[var(--app-text)]"
													/>
												</td>
												<td className="px-2 py-2 text-[var(--app-muted)]" colSpan={3}>
													{multiLoading ? 'Loading…' : 'Press Enter to fetch'}
												</td>
												<td></td>
											</tr>
											{multiRows.map((r) => (
												<tr key={r.lease_no}>
													<td className="px-2 py-2 text-[var(--app-text)]">{r.lease_no}</td>
													<td className="px-2 py-2 text-[var(--app-text)]">{r.customer_name}</td>
													<td className="px-2 py-2 text-[var(--app-text)]">{r.due_dt}</td>
													<td className="px-2 py-2 text-right text-[var(--app-text)]">{Formatter.formatThousands(String(r.amount))}</td>
													<td className="px-2 py-2 text-center">
														<button onClick={() => removeMultiRow(r.lease_no)} className="text-red-600 hover:underline text-xs">
															Remove
														</button>
													</td>
												</tr>
											))}
										</tbody>
										<tfoot className="bg-[var(--app-surface)]">
											<tr>
												<td colSpan={3} className="px-2 py-2 text-right font-semibold text-[var(--app-text)]">Total</td>
												<td className="px-2 py-2 text-right font-semibold text-[var(--app-text)]">{Formatter.formatThousands(String(multiTotal))}</td>
												<td></td>
											</tr>
										</tfoot>
									</table>
								</div>
							)}

							{fieldConfig.showTotInv && (
								<div>
									<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Total Amount</label>
									<input
										type="text"
										readOnly={fieldConfig.totInvReadOnly}
										value={totInv}
										onChange={(e) => setTotInv(digitsOnly(e.target.value))}
										className={`w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm text-[var(--app-text)] ${fieldConfig.totInvReadOnly ? 'bg-[var(--app-surface)]' : 'bg-[var(--app-card)]'}`}
									/>
								</div>
							)}
						</div>

						<div className="flex justify-end gap-2 p-4 border-t border-[var(--app-border)] bg-[var(--app-surface)]">
							<button
								onClick={closeModal}
								className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
							>
								Close
							</button>
							<button
								onClick={handleSubmit}
								disabled={submitting}
								className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
							>
								{submitting ? 'Saving…' : 'Submit'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default EspayInvoicePage;
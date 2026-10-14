import React, { useEffect, useState } from 'react';
import api from '@/shared/api/axiosInstance';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';
import ReportPrintModal, { PRINT_CELL, PRINT_HEAD } from '@/features/cam/components/ReportPrintModal';

interface BranchOption {
	branch_cd: string;
	branch_name: string;
}

interface DetailRow {
	approval_date: string;
	new_nontruck_unit: number;
	new_nontruck_amt: number;
	new_truck_unit: number;
	new_truck_amt: number;
	used_nontruck_unit: number;
	used_nontruck_amt: number;
	used_truck_unit: number;
	used_truck_amt: number;
}

interface Bucket {
	units: number;
	pct_units: number;
	net_finance: number;
	pct_net_finance: number;
}

interface Summary {
	by_condition: { new: Bucket; used: Bucket; total: Bucket };
	by_type: { non_truck: Bucket; truck: Bucket; total: Bucket };
	totals_row: {
		new_nontruck_unit: number; new_nontruck_amt: number;
		new_truck_unit: number; new_truck_amt: number;
		used_nontruck_unit: number; used_nontruck_amt: number;
		used_truck_unit: number; used_truck_amt: number;
	};
}

interface ListResponse {
	data: DetailRow[];
	summary: Summary;
	has_data: boolean;
	disabled: boolean;
	search_branch: string;
}

const toISO = (d: Date): string => {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 0 });

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const ListCAMByCarConditionPage: React.FC = () => {
	const [branches, setBranches] = useState<BranchOption[]>([]);
	const [branchDisabled, setBranchDisabled] = useState(false);

	const [startDate, setStartDate] = useState<Date | null>(null);
	const [endDate, setEndDate] = useState<Date | null>(null);
	const [branchCd, setBranchCd] = useState('');

	const [rows, setRows] = useState<DetailRow[]>([]);
	const [summary, setSummary] = useState<Summary | null>(null);
	const [hasData, setHasData] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasSearched, setHasSearched] = useState(false);
	const [exporting, setExporting] = useState(false);

	const [printing, setPrinting] = useState(false);
	const [printData, setPrintData] = useState<{
		rows: DetailRow[];
		summary: Summary;
		hasData: boolean;
		periodLabel: string;
		branchLabel: string;
	} | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const [branchRes, ctxRes] = await Promise.all([
					api.get<BranchOption[]>('/CAM/Approved/cam-by-car-condition/branches'),
					api.get('/CAM/Approved/cam-by-car-condition/context'),
				]);
				setBranches(branchRes.data);
				setBranchDisabled(ctxRes.data.disabled);
				if (ctxRes.data.disabled) {
					setBranchCd(ctxRes.data.forced_branch_cd);
				}
			} catch (err) {
				console.error('Context load error:', err);
			}
		})();
	}, []);

	const buildParams = () => ({
		start_date: startDate ? toISO(startDate) : '',
		end_date: endDate ? toISO(endDate) : '',
		branch_cd_search: branchCd,
	});

	const handlePreview = async () => {
		if (!startDate || !endDate || !branchCd) {
			alert('Please fill in all required fields');
			return;
		}
		setLoading(true);
		setError(null);
		setHasSearched(true);
		try {
			const response = await api.get<ListResponse>('/CAM/Approved/cam-by-car-condition/list', {
				params: buildParams(),
			});
			setRows(response.data.data);
			setSummary(response.data.summary);
			setHasData(response.data.has_data);
		} catch (err) {
			console.error('CAM by Car Condition list error:', err);
			setError('Failed to load report. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const handlePrint = async () => {
		if (!startDate || !endDate || !branchCd) {
			alert('Please fill in all required fields');
			return;
		}
		setPrinting(true);
		setError(null);
		try {
			const res = await api.get<ListResponse>('/CAM/Approved/cam-by-car-condition/list', { params: buildParams() });
			setPrintData({
				rows: res.data.data,
				summary: res.data.summary,
				hasData: res.data.has_data,
				periodLabel: `Period : ${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`,
				branchLabel: branches.find((b) => b.branch_cd === branchCd)?.branch_name ?? '',
			});
		} catch (err) {
			console.error('Print error:', err);
			setError('Failed to prepare print. Please try again.');
		} finally {
			setPrinting(false);
		}
	};

	const handleExport = async () => {
		if (!startDate || !endDate || !branchCd) {
			alert('Please fill in all required fields');
			return;
		}
		setExporting(true);
		try {
			const response = await api.get('/CAM/Approved/cam-by-car-condition/export', {
				params: buildParams(),
				responseType: 'blob',
			});
			const blob = new Blob([response.data], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			});
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = 'ApprovedCamByCarCond.xlsx';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Export error:', err);
			alert('Failed to export. Please try again.');
		} finally {
			setExporting(false);
		}
	};

	const renderBreakdownTable = (title: string, rowsSpec: [string, Bucket][]) => (
		<div className="max-w-md">
			<table className="w-full text-sm border-collapse">
				<thead>
					<tr className="bg-[var(--app-surface-alt)] text-[var(--app-text)]">
						<th className="border border-[var(--app-border)] px-2 py-1"></th>
						<th className="border border-[var(--app-border)] px-2 py-1">Unit</th>
						<th className="border border-[var(--app-border)] px-2 py-1">%</th>
						<th className="border border-[var(--app-border)] px-2 py-1">Net Finance</th>
						<th className="border border-[var(--app-border)] px-2 py-1">%</th>
					</tr>
				</thead>
				<tbody>
					{rowsSpec.map(([label, bucket], idx) => (
						<tr key={idx} className={label === 'Total' ? 'font-semibold bg-[var(--app-surface)]' : ''}>
							<td className="border border-[var(--app-border)] px-2 py-1">{label}</td>
							<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(bucket.units)}</td>
							<td className="border border-[var(--app-border)] px-2 py-1 text-right">{bucket.pct_units}%</td>
							<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(bucket.net_finance)}</td>
							<td className="border border-[var(--app-border)] px-2 py-1 text-right">{bucket.pct_net_finance}%</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
					<div className="mb-6">
						<h1 className="text-xl md:text-2xl font-bold text-[var(--app-text)]">List Approved CAM by Car's Condition</h1>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm items-end">
						<div>
							<label className="text-[var(--app-muted)] block mb-1">Start Approved Date</label>
							<AsOfDatePicker label="" value={startDate} onChange={setStartDate} required />
						</div>
						<div>
							<label className="text-[var(--app-muted)] block mb-1">End Approved Date</label>
							<AsOfDatePicker label="" value={endDate} onChange={setEndDate} required />
						</div>
						<div>
							<label className="text-[var(--app-muted)] block mb-1">Branch</label>
							<select
								value={branchCd}
								onChange={(e) => setBranchCd(e.target.value)}
								disabled={branchDisabled}
								className="w-full px-3 py-2 rounded-lg border border-[var(--app-border)] text-sm bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-[var(--app-surface-alt)]"
							>
								<option value="" style={optionStyle}>Select</option>
								{branches.map((b) => (
									<option key={b.branch_cd} value={b.branch_cd} style={optionStyle}>
										{b.branch_name}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="mb-6 flex gap-2">
						<button
							onClick={handlePreview}
							className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
						>
							Preview
						</button>
						<button
							onClick={handlePrint}
							disabled={printing}
							className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
						>
							{printing ? 'Preparing…' : 'Print'}
						</button>
						<button
							onClick={handleExport}
							disabled={exporting}
							className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
						>
							{exporting ? 'Exporting…' : 'Export to Excel'}
						</button>
					</div>

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
							{error}
						</div>
					)}

					<div className="overflow-x-auto rounded-lg border border-[var(--app-border)] mb-6">
						<table className="w-full text-sm border-collapse">
							<thead>
								<tr className="bg-[var(--app-surface-alt)] text-[var(--app-text)]">
									<th className="border border-[var(--app-border)] px-2 py-2" rowSpan={3}>Approval Date</th>
									<th className="border border-[var(--app-border)] px-2 py-2" colSpan={4}>NEW</th>
									<th className="border border-[var(--app-border)] px-2 py-2" colSpan={4}>USED</th>
								</tr>
								<tr className="bg-[var(--app-surface-alt)] text-[var(--app-text)]">
									<th className="border border-[var(--app-border)] px-2 py-2" colSpan={2}>Non Truck</th>
									<th className="border border-[var(--app-border)] px-2 py-2" colSpan={2}>Truck</th>
									<th className="border border-[var(--app-border)] px-2 py-2" colSpan={2}>Non Truck</th>
									<th className="border border-[var(--app-border)] px-2 py-2" colSpan={2}>Truck</th>
								</tr>
								<tr className="bg-[var(--app-surface-alt)] text-[var(--app-text)]">
									<th className="border border-[var(--app-border)] px-2 py-2">Unit</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Net Finance</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Unit</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Net Finance</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Unit</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Net Finance</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Unit</th>
									<th className="border border-[var(--app-border)] px-2 py-2">Net Finance</th>
								</tr>
							</thead>
							<tbody>
								{loading ? (
									<tr>
										<td colSpan={9} className="py-10 text-center">
											<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
										</td>
									</tr>
								) : !hasSearched ? (
									<tr>
										<td colSpan={9} className="border border-[var(--app-border)] px-2 py-8 text-center text-[var(--app-muted)]">
											Choose a period and branch, then click Preview.
										</td>
									</tr>
								) : !hasData ? (
									<tr>
										<td colSpan={9} className="border border-[var(--app-border)] px-2 py-4 text-center text-red-600 font-bold">
											Data Not Found
										</td>
									</tr>
								) : (
									<>
										{rows.map((row, idx) => (
											<tr key={idx} className="odd:bg-[var(--app-surface)]">
												<td className="border border-[var(--app-border)] px-2 py-1">{row.approval_date}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(row.new_nontruck_unit)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(row.new_nontruck_amt)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(row.new_truck_unit)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(row.new_truck_amt)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(row.used_nontruck_unit)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(row.used_nontruck_amt)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(row.used_truck_unit)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(row.used_truck_amt)}</td>
											</tr>
										))}
										{summary && (
											<tr className="bg-[var(--app-surface-alt)] font-semibold">
												<td className="border border-[var(--app-border)] px-2 py-1"></td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(summary.totals_row.new_nontruck_unit)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(summary.totals_row.new_nontruck_amt)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(summary.totals_row.new_truck_unit)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(summary.totals_row.new_truck_amt)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(summary.totals_row.used_nontruck_unit)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(summary.totals_row.used_nontruck_amt)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(summary.totals_row.used_truck_unit)}</td>
												<td className="border border-[var(--app-border)] px-2 py-1 text-right">{fmt(summary.totals_row.used_truck_amt)}</td>
											</tr>
										)}
									</>
								)}
							</tbody>
						</table>
					</div>

					{summary && hasSearched && hasData && (
						<div className="flex flex-col md:flex-row gap-8">
							{renderBreakdownTable('By Condition', [
								['New', summary.by_condition.new],
								['Used', summary.by_condition.used],
								['Total', summary.by_condition.total],
							])}
							{renderBreakdownTable('By Type', [
								['Non Truck', summary.by_type.non_truck],
								['Truck', summary.by_type.truck],
								['Total', summary.by_type.total],
							])}
						</div>
					)}
				</div>
			</div>
			{printData && (
				<ReportPrintModal
					title="LIST APPROVED CAM BY CAR'S CONDITION"
					leftHeader={printData.branchLabel ? `${printData.branchLabel} Branch` : ''}
					periodLabel={printData.periodLabel}
					summaryText={printData.hasData ? `${printData.rows.length} row${printData.rows.length !== 1 ? 's' : ''}` : 'No data'}
					onClose={() => setPrintData(null)}
				>
					<table className="rpt-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
						<thead>
							<tr>
								<th style={PRINT_HEAD} rowSpan={3}>Approval Date</th>
								<th style={PRINT_HEAD} colSpan={4}>NEW</th>
								<th style={PRINT_HEAD} colSpan={4}>USED</th>
							</tr>
							<tr>
								{['Non Truck', 'Truck', 'Non Truck', 'Truck'].map((h, i) => (
									<th key={i} style={PRINT_HEAD} colSpan={2}>{h}</th>
								))}
							</tr>
							<tr>
								{[0, 1, 2, 3].flatMap((g) => ['Unit', 'Net Finance'].map((h) => (
									<th key={`${g}-${h}`} style={PRINT_HEAD}>{h}</th>
								)))}
							</tr>
						</thead>
						<tbody>
							{!printData.hasData ? (
								<tr>
									<td colSpan={9} style={{ ...PRINT_CELL, textAlign: 'center', fontWeight: 'bold', color: '#dc2626' }}>Data Not Found</td>
								</tr>
							) : (
								<>
									{printData.rows.map((row, idx) => (
										<tr key={idx}>
											<td style={PRINT_CELL}>{row.approval_date}</td>
											<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(row.new_nontruck_unit)}</td>
											<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(row.new_nontruck_amt)}</td>
											<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(row.new_truck_unit)}</td>
											<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(row.new_truck_amt)}</td>
											<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(row.used_nontruck_unit)}</td>
											<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(row.used_nontruck_amt)}</td>
											<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(row.used_truck_unit)}</td>
											<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(row.used_truck_amt)}</td>
										</tr>
									))}
									<tr style={{ fontWeight: 'bold', backgroundColor: '#e5e7eb' }}>
										<td style={PRINT_CELL}></td>
										<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(printData.summary.totals_row.new_nontruck_unit)}</td>
										<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(printData.summary.totals_row.new_nontruck_amt)}</td>
										<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(printData.summary.totals_row.new_truck_unit)}</td>
										<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(printData.summary.totals_row.new_truck_amt)}</td>
										<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(printData.summary.totals_row.used_nontruck_unit)}</td>
										<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(printData.summary.totals_row.used_nontruck_amt)}</td>
										<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(printData.summary.totals_row.used_truck_unit)}</td>
										<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(printData.summary.totals_row.used_truck_amt)}</td>
									</tr>
								</>
							)}
						</tbody>
					</table>

					{printData.hasData && (
						<div className="rpt-keep" style={{ display: 'flex', gap: 32 }}>
							{([
								['By Condition', [['New', printData.summary.by_condition.new], ['Used', printData.summary.by_condition.used], ['Total', printData.summary.by_condition.total]]],
								['By Type', [['Non Truck', printData.summary.by_type.non_truck], ['Truck', printData.summary.by_type.truck], ['Total', printData.summary.by_type.total]]],
							] as [string, [string, Bucket][]][]).map(([title, spec]) => (
								<table key={title} className="rpt-table" style={{ borderCollapse: 'collapse', width: '35%' }}>
									<thead>
										<tr>
											<th style={PRINT_HEAD}>{title}</th>
											{['Unit', '%', 'Net Finance', '%'].map((h, i) => <th key={i} style={PRINT_HEAD}>{h}</th>)}
										</tr>
									</thead>
									<tbody>
										{spec.map(([label, b]) => (
											<tr key={label} style={label === 'Total' ? { fontWeight: 'bold', backgroundColor: '#f3f4f6' } : undefined}>
												<td style={PRINT_CELL}>{label}</td>
												<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(b.units)}</td>
												<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{b.pct_units}%</td>
												<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{fmt(b.net_finance)}</td>
												<td style={{ ...PRINT_CELL, textAlign: 'right' }}>{b.pct_net_finance}%</td>
											</tr>
										))}
									</tbody>
								</table>
							))}
						</div>
					)}
				</ReportPrintModal>
			)}
		</div>
	);
};

export default ListCAMByCarConditionPage;
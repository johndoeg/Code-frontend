import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/shared/api/axiosInstance';

interface LookupOption {
	value: string;
	label: string;
	selected?: boolean;
}

interface DpConfirmation {
	asOfDate: string;
	periodFrom: string;
	periodTo: string;
	npfRatio: number;
	minDpInvestasi: number;
	minDpMultiguna: number;
}

const toOptions = (rows: unknown): LookupOption[] =>
	Array.isArray(rows)
		? rows.map((r: Record<string, unknown>) => ({
			value: String(r.value ?? r.code ?? ''),
			label: String(r.label ?? r.desc ?? r.name ?? ''),
			selected: Boolean(r.selected),
		}))
		: [];

const USED_ONLY_FIN_TYPES = ['S', 'D', 'M', 'W'];
const DP_DIALOG_FIN_TYPES = ['I', 'W'];

const isVehicleLocked = (purposeLabel: string, finType: string): boolean => {
	const p = purposeLabel.trim().toLowerCase();
	return (p === 'multiguna' && finType === 'D')
		|| (p === 'modal kerja' && (finType === 'M' || finType === 'W'));
};

const Spinner: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
	<svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
		<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
		<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
	</svg>
);

const labelCls = 'block text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider mb-2';

const selectCls = (enabled: boolean) =>
	`w-full px-3 py-2.5 border border-[var(--app-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 ${enabled
		? 'bg-[var(--app-card)]'
		: 'bg-[var(--app-surface)] text-[var(--app-muted)] cursor-not-allowed'
	}`;

const FieldError: React.FC<{ msg?: string }> = ({ msg }) =>
	msg ? <p className="text-red-600 text-xs mt-1">{msg}</p> : null;

export default function CamForm() {
	const navigate = useNavigate();
	const location = useLocation();

	const state = location.state as {
		apless: string;
		precheckingId: string;
		lesseeTp: 'PR' | 'PT';
		customerName?: string;
	} | null;

	const apless = state?.apless || '';
	const precheckingId = state?.precheckingId || '';
	const lesseeTp = state?.lesseeTp || 'PR';
	const customerName = state?.customerName || '';

	const indCor = lesseeTp === 'PT' ? '2' : '1';

	const [purposes, setPurposes] = useState<LookupOption[]>([]);
	const [financeTypeOptions, setFinanceTypeOptions] = useState<LookupOption[]>([]);
	const [contractTypeOptions, setContractTypeOptions] = useState<LookupOption[]>([]);

	const [loadingOptions, setLoadingOptions] = useState(true);
	const [finTypeLoading, setFinTypeLoading] = useState(false);
	const [contTypeLoading, setContTypeLoading] = useState(false);

	const [purpoffinc, setPurpoffinc] = useState('');
	const [finType, setFinType] = useState('');
	const [contType, setContType] = useState('');
	const [guarantor, setGuarantor] = useState('');
	const [newCar, setNewCar] = useState('');
	const [publicStatus, setPublicStatus] = useState('');
	const [boa, setBoa] = useState('');
	const [bot, setBot] = useState('');

	const [errors, setErrors] = useState<Record<string, string>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [dpConfirm, setDpConfirm] = useState<DpConfirmation | null>(null);
	const [dpLoading, setDpLoading] = useState(false);

	const purposeLabel = purposes.find(p => p.value === purpoffinc)?.label ?? '';
	const vehicleLocked = isVehicleLocked(purposeLabel, finType);
	const newDisabled = vehicleLocked || USED_ONLY_FIN_TYPES.includes(finType);

	const showPublic = lesseeTp === 'PT' && finType !== 'D';
	const boaLocked = showPublic && publicStatus === '1';
	const showBot = boa === '2';

	useEffect(() => {
		if (!apless) {
			alert('Customer data not found. Please start from Add CAM.');
			navigate('/index');
		}
	}, [apless, navigate]);

	useEffect(() => {
		const loadOptions = async () => {
			setLoadingOptions(true);
			try {
				const res = await api.get('/CAM/init');
				setPurposes(toOptions(res.data?.purposes));
			} catch {
				setFormError('Failed to load form options.');
			} finally {
				setLoadingOptions(false);
			}
		};
		loadOptions();
	}, []);

	const handlePurposeChange = async (value: string) => {
		setPurpoffinc(value);
		setFinType('');
		setContType('');
		setFinanceTypeOptions([]);
		setContractTypeOptions([]);
		if (!value) return;

		setFinTypeLoading(true);
		try {
			const res = await api.get('/CAM/finance-types', {
				params: { purpoffinc: value, lesseeTp },
			});
			setFinanceTypeOptions(toOptions(res.data));
		} catch {
			setFinanceTypeOptions([]);
		} finally {
			setFinTypeLoading(false);
		}
	};

	const handleFinTypeChange = async (value: string) => {
		setFinType(value);
		setContType('');
		setContractTypeOptions([]);

		if (USED_ONLY_FIN_TYPES.includes(value)) setNewCar('1');
		if (value === 'D') {
			setPublicStatus('');
			setBoa('');
			setBot('');
		}
		if (!value) return;

		setContTypeLoading(true);
		try {
			const res = await api.get('/CAM/contract-types', { params: { finType: value } });
			const options = toOptions(res.data);
			setContractTypeOptions(options);
			const preset = options.find(o => o.selected) ?? (options.length === 1 ? options[0] : undefined);
			if (preset) setContType(preset.value);
		} catch {
			setContractTypeOptions([]);
		} finally {
			setContTypeLoading(false);
		}
	};

	const handlePublicChange = (value: string) => {
		setPublicStatus(value);
		if (value === '1') {
			setBoa('1');
			setBot('');
		} else {
			setBoa('');
			setBot('');
		}
	};

	const handleBoaChange = (value: string) => {
		setBoa(value);
		if (value !== '2') setBot('');
	};

	const validate = (): boolean => {
		const next: Record<string, string> = {};
		if (!purpoffinc) next.purpoffinc = 'Purpose of Finance must not be empty';
		if (!finType) next.finType = 'Finance Type must not be empty';
		if (!contType) next.contType = 'Contract Type must not be empty';
		if (!guarantor) next.guarantor = 'Guarantor availability must not be empty';
		if (!newCar) next.newCar = 'Vehicle condition must not be empty';
		if (showPublic && !publicStatus) next.publicStatus = 'Go Public must not be empty';
		if (!boa) next.boa = 'Beneficial Owner Availability must not be empty';
		if (showBot && !bot) next.bot = 'Beneficial Owner Type must not be empty';
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const handleSubmitClick = async () => {
		setFormError(null);
		if (!validate()) return;

		if (!DP_DIALOG_FIN_TYPES.includes(finType)) {
			await doSubmit();
			return;
		}

		setDpLoading(true);
		try {
			const res = await api.get('/CAM/dp-confirmation', {
				params: { finType, purpoffinc },
			});
			setDpConfirm(res.data);
		} catch {
			setFormError('Could not load the minimum DP figures. Please try again.');
		} finally {
			setDpLoading(false);
		}
	};

	const doSubmit = async () => {
		setIsSubmitting(true);
		setFormError(null);

		try {
			const res = await api.post('/CAM/submit', {
				apless,
				precheckingId,
				lesseeTp,
				indCor,
				purpoffinc,
				finType,
				contType,
				guarantor,
				newCar,
				publicStatus,
				boa,
				bot,
			});

			const data = res.data ?? {};
			if (data.errors) {
				setErrors(data.errors);
				return;
			}

			const params = new URLSearchParams({
				apless: data.apless ?? apless,
				applno: data.applno ?? '',
				finType: data.id1 ?? finType,
				indCor: data.id2 ?? indCor,
				guarantor: data.id4 ?? guarantor,
				newCar: data.id5 ?? newCar,
				status: data.id6 ?? 'New',
				purpoffinc: data.id7 ?? purpoffinc,
				contType: data.id9 ?? 'NEW',
				boa: data.id11 ?? boa,
				bot: data.id12 ?? bot,
				goPublic: data.id13 ?? publicStatus,
				c2c: '',
				prechecking_id: precheckingId,
			});

			navigate(`/cam-create?${params.toString()}`);
		} catch (err) {
			const payload = (err as { response?: { data?: { errors?: Record<string, string>; message?: string } } })
				.response?.data;
			if (payload?.errors) setErrors(payload.errors);
			else setFormError(payload?.message ?? 'Submission failed. Please try again.');
		} finally {
			setIsSubmitting(false);
			setDpConfirm(null);
		}
	};

	const submitBusy = isSubmitting || dpLoading || finTypeLoading || contTypeLoading;

	return (
		<div className="bg-[var(--app-card)] rounded-2xl shadow-md border border-[var(--app-border)] overflow-hidden">
			<div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-5">
				<div className="flex items-center gap-3">
					<div className="bg-[var(--app-card)]/20 backdrop-blur-sm rounded-xl p-2.5 shrink-0">
						<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<div>
						<h1 className="text-lg font-bold text-white tracking-tight">Credit Approval Memorandum</h1>
						{customerName && (
							<p className="text-xs text-blue-100 mt-0.5">{customerName} · {apless}</p>
						)}
					</div>
				</div>
			</div>

			<div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
				{formError && (
					<div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm">
						{formError}
					</div>
				)}

				{loadingOptions ? (
					<div className="flex items-center justify-center py-12 text-[var(--app-muted)]">
						<Spinner className="w-6 h-6 mr-2" /> Loading form options…
					</div>
				) : (
					<div className="space-y-5">
						<div>
							<label className={labelCls}>Purpose of Finance</label>
							<select
								className={selectCls(true)}
								value={purpoffinc}
								onChange={e => handlePurposeChange(e.target.value)}
							>
								<option value="">Select</option>
								{purposes.map(p => (
									<option key={p.value} value={p.value}>{p.label}</option>
								))}
							</select>
							<FieldError msg={errors.purpoffinc} />
						</div>

						<div>
							<label className={labelCls}>Finance Type</label>
							<select
								className={selectCls(!!purpoffinc && !finTypeLoading)}
								value={finType}
								disabled={!purpoffinc || finTypeLoading}
								onChange={e => handleFinTypeChange(e.target.value)}
							>
								<option value="">{finTypeLoading ? 'Loading…' : 'Select'}</option>
								{financeTypeOptions.map(f => (
									<option key={f.value} value={f.value}>{f.label}</option>
								))}
							</select>
							<FieldError msg={errors.finType} />
						</div>

						<div>
							<label className={labelCls}>Contract Type</label>
							<select
								className={selectCls(!!finType && !contTypeLoading && contractTypeOptions.length > 1)}
								value={contType}
								disabled={!finType || contTypeLoading || contractTypeOptions.length <= 1}
								onChange={e => setContType(e.target.value)}
							>
								<option value="">{contTypeLoading ? 'Loading…' : 'Select'}</option>
								{contractTypeOptions.map(c => (
									<option key={c.value} value={c.value}>{c.label}</option>
								))}
							</select>
							<FieldError msg={errors.contType} />
						</div>

						<div>
							<label className={labelCls}>Customer Type</label>
							<div className="flex items-center gap-6">
								<label className="inline-flex items-center text-sm text-[var(--app-text)]">
									<input type="radio" name="ind_cor" value="1" checked={indCor === '1'} readOnly disabled className="mr-2" />
									Individu
								</label>
								<label className="inline-flex items-center text-sm text-[var(--app-text)]">
									<input type="radio" name="ind_cor" value="2" checked={indCor === '2'} readOnly disabled className="mr-2" />
									Corporate
								</label>
							</div>
						</div>

						<div>
							<label className={labelCls}>Vehicle Condition</label>
							<div className="flex gap-6">
								<label className={`inline-flex items-center text-sm ${vehicleLocked ? 'text-[var(--app-muted)]' : 'text-[var(--app-text)]'}`}>
									<input
										type="radio"
										name="new_car"
										value="1"
										checked={newCar === '1'}
										onChange={() => setNewCar('1')}
										disabled={vehicleLocked}
										className="mr-2"
									/>
									Used
								</label>
								<label className={`inline-flex items-center text-sm ${newDisabled ? 'text-[var(--app-muted)]' : 'text-[var(--app-text)]'}`}>
									<input
										type="radio"
										name="new_car"
										value="2"
										checked={newCar === '2'}
										onChange={() => setNewCar('2')}
										disabled={newDisabled}
										className="mr-2"
									/>
									New
								</label>
							</div>
							{newDisabled && (
								<p className="text-amber-600 text-xs mt-1">
									This purpose and financing type combination only applies to used vehicles.
								</p>
							)}
							<FieldError msg={errors.newCar} />
						</div>

						<div>
							<label className={labelCls}>Guarantor Availability</label>
							<div className="flex gap-6">
								<label className="inline-flex items-center text-sm text-[var(--app-text)]">
									<input type="radio" name="guarantor" value="1" checked={guarantor === '1'} onChange={() => setGuarantor('1')} className="mr-2" />
									No
								</label>
								<label className="inline-flex items-center text-sm text-[var(--app-text)]">
									<input type="radio" name="guarantor" value="2" checked={guarantor === '2'} onChange={() => setGuarantor('2')} className="mr-2" />
									Yes
								</label>
							</div>
							<FieldError msg={errors.guarantor} />
						</div>

						{showPublic && (
							<div>
								<label className={labelCls}>Go Public</label>
								<div className="flex gap-6">
									<label className="inline-flex items-center text-sm text-[var(--app-text)]">
										<input type="radio" name="public" value="0" checked={publicStatus === '0'} onChange={() => handlePublicChange('0')} className="mr-2" />
										No
									</label>
									<label className="inline-flex items-center text-sm text-[var(--app-text)]">
										<input type="radio" name="public" value="1" checked={publicStatus === '1'} onChange={() => handlePublicChange('1')} className="mr-2" />
										Yes
									</label>
								</div>
								<FieldError msg={errors.publicStatus} />
							</div>
						)}

						<div>
							<label className={labelCls}>Beneficial Owner Availability</label>
							<div className="flex gap-6">
								<label className={`inline-flex items-center text-sm ${boaLocked ? 'text-[var(--app-muted)]' : 'text-[var(--app-text)]'}`}>
									<input
										type="radio"
										name="boa"
										value="1"
										checked={boa === '1'}
										onChange={() => handleBoaChange('1')}
										disabled={boaLocked}
										className="mr-2"
									/>
									No
								</label>
								<label className={`inline-flex items-center text-sm ${boaLocked ? 'text-[var(--app-muted)]' : 'text-[var(--app-text)]'}`}>
									<input
										type="radio"
										name="boa"
										value="2"
										checked={boa === '2'}
										onChange={() => handleBoaChange('2')}
										disabled={boaLocked}
										className="mr-2"
									/>
									Yes
								</label>
							</div>
							{boaLocked && (
								<p className="text-amber-600 text-xs mt-1">
									Not applicable for a public company.
								</p>
							)}
							<FieldError msg={errors.boa} />

							{showBot && (
								<div className="mt-3">
									<label className={labelCls}>Beneficial Owner Type</label>
									<div className="flex gap-6">
										<label className="inline-flex items-center text-sm text-[var(--app-text)]">
											<input type="radio" name="bot" value="1" checked={bot === '1'} onChange={() => setBot('1')} className="mr-2" />
											Individu
										</label>
										<label className="inline-flex items-center text-sm text-[var(--app-text)]">
											<input type="radio" name="bot" value="2" checked={bot === '2'} onChange={() => setBot('2')} className="mr-2" />
											Corporate
										</label>
									</div>
									<FieldError msg={errors.bot} />
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{!loadingOptions && (
				<>
					<div className="mx-6 border-t border-[var(--app-border)]" />
					<div className="px-6 py-4 flex justify-end">
						<button
							type="button"
							onClick={handleSubmitClick}
							disabled={submitBusy}
							className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 ${submitBusy
								? 'bg-blue-300 cursor-not-allowed'
								: 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:shadow-blue-200 active:scale-[0.98]'
								}`}
						>
							{isSubmitting ? (<><Spinner /> Submitting…</>) : dpLoading ? (<><Spinner /> Checking…</>) : 'Submit'}
						</button>
					</div>
				</>
			)}

			{dpConfirm && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
					<div className="bg-[var(--app-card)] rounded-2xl shadow-2xl w-full max-w-md p-6">
						<h3 className="text-lg font-bold text-[var(--app-text)] mb-4">
							Minimum DP for Installment Financing Contract
						</h3>
						<table className="w-full text-sm mb-4">
							<tbody>
								<tr className="border-b border-[var(--app-border)]">
									<td className="py-2 font-semibold">As Of</td>
									<td className="py-2 text-right">{dpConfirm.asOfDate}</td>
								</tr>
								<tr className="border-b border-[var(--app-border)]">
									<td className="py-2 font-semibold">NPF Ratio</td>
									<td className="py-2 text-right">{dpConfirm.npfRatio}%</td>
								</tr>
								<tr className="border-b border-[var(--app-border)]">
									<td className="py-2 font-semibold">Period</td>
									<td className="py-2 text-right">{dpConfirm.periodFrom} – {dpConfirm.periodTo}</td>
								</tr>
								<tr className="border-b border-[var(--app-border)]">
									<td className="py-2 font-semibold">Min. DP — Investasi</td>
									<td className="py-2 text-right">{dpConfirm.minDpInvestasi}%</td>
								</tr>
								<tr>
									<td className="py-2 font-semibold">Min. DP — Multiguna</td>
									<td className="py-2 text-right">{dpConfirm.minDpMultiguna}%</td>
								</tr>
							</tbody>
						</table>
						<div className="flex justify-end gap-3">
							<button
								onClick={() => setDpConfirm(null)}
								className="px-4 py-2 border border-[var(--app-border)] rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface)] text-sm"
							>
								Cancel
							</button>
							<button
								onClick={doSubmit}
								disabled={isSubmitting}
								className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium"
							>
								{isSubmitting ? 'Saving…' : 'Yes'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
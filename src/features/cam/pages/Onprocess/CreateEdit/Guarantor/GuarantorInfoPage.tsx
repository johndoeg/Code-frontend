import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/shared/api/axiosInstance';
import { GuarantorSectionHeader, GuarantorNavButtons, type GuarantorSubPageProps } from './GuarantorShared';

interface Option { value: string; label: string }
interface Signer { name: string; idCard: string; citizen: string }
interface Options {
	categories: Option[]; maritals: Option[]; genders: Option[]; biTypes: Option[]; countries: Option[]; signers: Signer[];
}
type Form = Record<string, string>;

const input =
	'w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2 text-sm text-[var(--app-text)] focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:bg-slate-100 disabled:text-slate-400 read-only:bg-slate-50';
const labelCls = 'text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)]';

const errorMessage = (e: unknown, fallback: string): string => {
	const d = (e as { response?: { data?: { message?: string; detail?: string } } })?.response?.data;
	return d?.message || fallback;
};

const digits = (v: string) => v.replace(/\D/g, '');
const phoneDigits = (v: string) => {
	let s = v.replace(/[^0-9xX]/g, '');
	if (s.startsWith('62')) s = s.slice(2);
	if (s.startsWith('0')) s = s.slice(1);
	return s;
};
const money = (v: string) => {
	const d = digits(v);
	return d ? Number(d).toLocaleString('en-US') : '';
};

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-1 gap-1 sm:grid-cols-[180px_1fr] sm:items-start sm:gap-3">
			<label className={labelCls + ' sm:pt-2.5'} title={hint}>
				{label}{required && ' *'}{hint && <span className="ml-1 cursor-help normal-case text-blue-500">(i)</span>}
			</label>
			<div>{children}</div>
		</div>
	);
}

function PhoneInput({ value, onChange, disabled, required }: { value: string; onChange: (v: string) => void; disabled?: boolean; required?: boolean }) {
	return (
		<div className="relative max-w-[260px]">
			<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">62</span>
			<input
				className={input + ' pl-9'} value={value} maxLength={60} disabled={disabled} required={required}
				inputMode="numeric" onChange={e => onChange(phoneDigits(e.target.value))}
			/>
		</div>
	);
}

function NpwpInput({ value, onChange, readOnly }: { value: string; onChange: (v: string) => void; readOnly?: boolean }) {
	const d = digits(value).padEnd(16, ' ');
	const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 9), d.slice(9, 12), d.slice(12, 16)].map(p => p.trim());
	const sizes = [2, 3, 3, 1, 3, 4];
	const seps = ['.', '.', '.', '-', '.', ''];
	const setPart = (i: number, v: string) => {
		const next = [...parts];
		next[i] = digits(v).slice(0, sizes[i]);
		onChange(next.join(''));
	};
	return (
		<div className="flex flex-wrap items-center gap-1">
			{parts.map((p, i) => (
				<React.Fragment key={i}>
					<input
						className={input + ' !px-2 text-center'} style={{ width: 28 + sizes[i] * 12 }}
						value={p} readOnly={readOnly} maxLength={sizes[i]} inputMode="numeric"
						onChange={e => setPart(i, e.target.value)}
					/>
					{seps[i] && <span className="text-slate-500">{seps[i]}</span>}
				</React.Fragment>
			))}
		</div>
	);
}

const GuarantorInfoPage: React.FC<GuarantorSubPageProps> = ({ applNo, grnId, onNavigate, onBack }) => {
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [form, setForm] = useState<Form>({});
	const [opts, setOpts] = useState<Options | null>(null);
	const [blocked, setBlocked] = useState('');
	const [saving, setSaving] = useState(false);
	const [messages, setMessages] = useState<string[]>([]);
	const [success, setSuccess] = useState(false);
	const [validity, setValidity] = useState<'' | '0' | '1'>('1');
	const [addrMode, setAddrMode] = useState<'' | 'same' | 'diff'>('');

	const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setSuccess(false); };
	const setMany = (patch: Form) => { setForm(f => ({ ...f, ...patch })); setSuccess(false); };

	const load = useCallback(async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const res = await api.get('/CAM/EditIndex/guarantor/info', { params: { applno: applNo, grnId } });
			const g = res.data.guarantor as Record<string, string | number>;
			const f: Form = {};
			Object.entries(g).forEach(([k, v]) => { f[k] = v === null || v === undefined ? '' : String(v); });
			f.grnTtl = money(String(Math.round(Number(g.grnTtl) || 0)));
			setForm(f);
			setOpts(res.data.options);
			setBlocked(res.data.blocked ? (res.data.blockedMessage || 'This application can no longer be changed.') : '');
			setValidity(f.grnIdVal ? '0' : '1');
			setAddrMode(f.grnAdd && f.grnAdd === f.grnSpouseAdd ? 'same' : f.grnAdd ? 'diff' : '');
		} catch (e) {
			setLoadError(errorMessage(e, 'Failed to load guarantor information.'));
		} finally {
			setLoading(false);
		}
	}, [applNo, grnId]);

	useEffect(() => { load(); }, [load]);

	const isPR = form.grnTp === 'PR';
	const isPT = form.grnTp === 'PT';

	const spouse = useMemo(() => {
		const m = form.marital;
		if (m === 'S' || m === 'D') return { person: false, contact: false, contactRequired: false, address: false };
		if (m === 'M') return { person: true, contact: true, contactRequired: true, address: true };
		if (m === 'O' || m === 'P') return { person: true, contact: false, contactRequired: false, address: true };
		return { person: true, contact: true, contactRequired: false, address: true };
	}, [form.marital]);

	const onMarital = (m: string) => {
		const sts = m === 'M' ? (form.gender === 'M' ? 'Wife' : form.gender === 'F' ? 'Husband' : '') : '';
		setMany({
			marital: m, spouseSts: sts, grnSpouse: '', idCardSpouse: '', grnSpouseAdd: '', grnSpouseCity: '', grnSpouseCode: '',
			spouseMobilePhone: '', spouseEmail: '', spouseCitizenship: '', spouseNationality: '',
		});
		setAddrMode('');
	};
	const onGender = (g: string) => {
		setMany({ gender: g, spouseSts: form.marital === 'M' ? (g === 'M' ? 'Wife' : g === 'F' ? 'Husband' : '') : '' });
	};
	const onAddrMode = (mode: 'same' | 'diff') => {
		setAddrMode(mode);
		if (mode === 'same') setMany({ grnSpouseAdd: form.grnAdd, grnSpouseCity: form.grnCity, grnSpouseCode: form.grnZipcode });
		else setMany({ grnSpouseAdd: '', grnSpouseCity: '', grnSpouseCode: '' });
	};
	const onCitizen = (c: string) => {
		setMany({ citizen: c, nationality: c === 'WNI' ? 'ID' : '', passportNo: c === 'WNI' ? '' : form.passportNo });
	};
	const onSpouseCitizen = (c: string) => {
		setMany({ spouseCitizenship: c, spouseNationality: c === 'WNI' ? 'ID' : '' });
	};
	const onSigner = (name: string) => {
		const s = opts?.signers.find(x => x.name === name);
		setMany({
			grnContact: name,
			grnIdCard: s ? digits(s.idCard) : '',
			citizen: s?.citizen || '',
			nationality: s?.citizen === 'WNI' ? 'ID' : '',
		});
	};

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (blocked) return;
		setSaving(true);
		setMessages([]);
		setSuccess(false);
		try {
			await api.put('/CAM/EditIndex/guarantor/info', {
				...form,
				applno: applNo,
				grnId,
				grnTtl: digits(form.grnTtl || '0') || '0',
				validity: isPR ? validity : '',
				grnIdVal: isPR && validity === '0' ? form.grnIdVal : '',
			});
			setSuccess(true);
		} catch (err) {
			const msg = errorMessage(err, 'Failed to save guarantor information.');
			setMessages(msg.split('<br>').filter(Boolean));
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;
	}
	if (loadError || !opts) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
				{loadError || 'Failed to load guarantor information.'}
				<span className="flex gap-4">
					<button onClick={load} className="underline">Retry</button>
					<button onClick={onBack} className="underline">Back</button>
				</span>
			</div>
		);
	}

	const select = (k: string, options: Option[], opt?: { required?: boolean; disabled?: boolean; onChange?: (v: string) => void }) => (
		<select
			className={input} value={form[k] || ''} required={opt?.required} disabled={opt?.disabled}
			onChange={e => (opt?.onChange ? opt.onChange(e.target.value) : set(k, e.target.value))}
		>
			<option value="">Select</option>
			{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
		</select>
	);
	const text = (k: string, o?: { required?: boolean; max?: number; readOnly?: boolean; type?: string; disabled?: boolean }) => (
		<input
			className={input} type={o?.type || 'text'} value={form[k] || ''} required={o?.required} maxLength={o?.max}
			readOnly={o?.readOnly} disabled={o?.disabled} onChange={e => set(k, e.target.value)}
		/>
	);
	const area = (k: string, o?: { required?: boolean; readOnly?: boolean }) => (
		<textarea
			className={input + ' min-h-[72px]'} value={form[k] || ''} required={o?.required} readOnly={o?.readOnly}
			maxLength={250} onChange={e => set(k, e.target.value)}
		/>
	);
	const nationalitySelect = (k: string, disabled: boolean, required: boolean) => (
		<select className={input} value={form[k] || ''} disabled={disabled} required={required} onChange={e => set(k, e.target.value)}>
			<option value="">Nationality</option>
			{opts.countries.map(c => <option key={c.value} value={c.value} disabled={c.value === 'ID'}>{c.label}</option>)}
		</select>
	);
	const citizenship = (k: string, nk: string, onC: (v: string) => void, o: { disabled?: boolean; required?: boolean }) => (
		<div className="flex gap-2">
			<select className={input + ' !w-28 shrink-0'} value={form[k] || ''} disabled={o.disabled} required={o.required} onChange={e => onC(e.target.value)}>
				<option value="">Select</option>
				<option value="WNI">WNI</option>
				<option value="WNA">WNA</option>
			</select>
			{nationalitySelect(nk, o.disabled || form[k] !== 'WNA', form[k] === 'WNA')}
		</div>
	);

	const wni = form.citizen === 'WNI';

	return (
		<form onSubmit={submit} className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<GuarantorSectionHeader>Guarantor Information</GuarantorSectionHeader>

			{blocked && <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{blocked}</div>}

			<fieldset disabled={!!blocked || saving} className="grid grid-cols-1 gap-x-10 gap-y-3 p-6 lg:grid-cols-2">
				<div className="space-y-3">
					<Field label="Guarantor Type" required>
						<input className={input} value={isPR ? 'Individual' : isPT ? 'Corporate' : form.grnTp} disabled />
					</Field>
					<Field label="Guarantor Category" required>{select('grnCat', opts.categories, { required: true })}</Field>

					{isPT && (
						<Field label="Name in Akta" required hint="Merupakan nama guarantor sesuai Akta; Akan digunakan di kontrak">
							{text('grnName', { required: true, max: 100 })}
						</Field>
					)}
					{isPT && (
						<Field label="Name in NPWP" required hint="Merupakan nama guarantor sesuai NPWP; Akan digunakan di Sistem Data SLIK">
							{text('grnNameNpwp', { required: true, max: 100 })}
						</Field>
					)}
					{isPR && (
						<Field label="Name in ID Card" required hint="Merupakan nama guarantor sesuai KTP; Akan digunakan di kontrak">
							{text('grnName', { required: true, max: 100 })}
						</Field>
					)}
					<Field
						label={isPT ? 'Guarantor Name' : 'Name Without Title'} required
						hint={isPT ? 'Merupakan nama guarantor di NPWP tanpa PT, CV, dsb' : 'Merupakan nama lengkap guarantor tanpa gelar akademik, keagamaan, adat, dsb'}
					>
						{text('grnNameId', { required: true, max: 100 })}
					</Field>

					{isPR && <Field label="Gender" required>{select('gender', opts.genders, { required: true, onChange: onGender })}</Field>}

					<Field label={isPT ? 'Establishment Date' : 'Date of Birth'} required>
						{text('grnDob', { required: true, type: 'date' })}
					</Field>

					<Field label={isPT ? 'Address in SK. Domisili' : 'Address in ID Card'} required>{area('grnAdd', { required: true })}</Field>
					<Field label="City" required>{text('grnCity', { required: true, max: 30 })}</Field>
					<Field label="Post Code">
						<input className={input + ' max-w-[140px]'} value={form.grnZipcode || ''} maxLength={5} inputMode="numeric"
							onChange={e => set('grnZipcode', digits(e.target.value))} />
					</Field>
					<Field label="Fax">
						<input className={input + ' max-w-[200px]'} value={form.grnFax || ''} maxLength={20} inputMode="numeric"
							onChange={e => set('grnFax', digits(e.target.value))} />
					</Field>
					<Field label={isPT ? 'PIC Mobile Phone No.' : 'Mobile Phone No.'} required>
						<PhoneInput value={form.grnPhone || ''} onChange={v => set('grnPhone', v)} required />
					</Field>
					{isPR && <Field label="Email" required>{text('grnEmail', { required: true, type: 'email', max: 100 })}</Field>}

					{isPT && (
						<>
							<Field label="BI Customer Type" required>{select('custType', opts.biTypes, { required: true })}</Field>
							<Field label="NPWP" required><NpwpInput value={form.npwp || ''} onChange={v => set('npwp', v)} /></Field>
							<Field label="Address in NPWP" required>{area('addrNpwp', { required: true })}</Field>
							<Field label="City (NPWP)">{text('cityNpwp', { max: 50 })}</Field>
							<Field label="Post Code (NPWP)">
								<input className={input + ' max-w-[140px]'} value={form.postNpwp || ''} maxLength={5} inputMode="numeric"
									onChange={e => set('postNpwp', digits(e.target.value))} />
							</Field>
							<Field label="Line of Business">{text('grnLob', { max: 100 })}</Field>
						</>
					)}

					<Field label="Relationship with Customer">{text('grnRelation', { max: 100 })}</Field>

					{isPR && (
						<>
							<Field label="BI Customer Type" required>{select('custType', opts.biTypes, { required: true })}</Field>
							<Field label="Occupation">{text('grnOccupation', { max: 100 })}</Field>
						</>
					)}

					<Field label="Total Exposure">
						<input
							className={input + ' max-w-[200px] text-right'} value={form.grnTtl || ''} maxLength={17} inputMode="numeric"
							onChange={e => set('grnTtl', money(e.target.value))}
						/>
					</Field>
				</div>

				<div className="space-y-3">
					{isPR && (
						<>
							<Field label="Marital Status" required>{select('marital', opts.maritals, { required: true, onChange: onMarital })}</Field>
							<Field label="Spouse Name in ID Card" required={spouse.person}>
								<input className={input} value={form.grnSpouse || ''} maxLength={50} required={spouse.person} disabled={!spouse.person}
									onChange={e => set('grnSpouse', e.target.value)} />
							</Field>
							<Field label="Spouse Status" required>
								<input className={input} value={form.spouseSts || ''} maxLength={100} required readOnly={['M', 'S', 'D', 'O', 'P'].includes(form.marital)}
									onChange={e => set('spouseSts', e.target.value)} />
							</Field>
							<Field label="Spouse ID Card No." required={spouse.person}>
								<input className={input} value={form.idCardSpouse || ''} maxLength={100} required={spouse.person} disabled={!spouse.person}
									onChange={e => set('idCardSpouse', e.target.value)} />
							</Field>
							<Field label="Spouse Address in ID Card">
								<div className="mb-2 space-y-1 text-sm text-[var(--app-text)]">
									<label className="flex items-center gap-2">
										<input type="radio" name="addrMode" checked={addrMode === 'same'} disabled={!spouse.address}
											onChange={() => onAddrMode('same')} />
										Same with Guarantor's Address in ID Card
									</label>
									<label className="flex items-center gap-2">
										<input type="radio" name="addrMode" checked={addrMode === 'diff'} disabled={!spouse.address}
											onChange={() => onAddrMode('diff')} />
										Different with Guarantor's Address in ID Card
									</label>
								</div>
								<textarea className={input + ' min-h-[72px]'} value={form.grnSpouseAdd || ''} maxLength={250}
									readOnly={addrMode !== 'diff'} disabled={!spouse.address} onChange={e => set('grnSpouseAdd', e.target.value)} />
							</Field>
							<Field label="Spouse City">
								<input className={input} value={form.grnSpouseCity || ''} maxLength={50} disabled={!spouse.address}
									readOnly={addrMode === 'same'} onChange={e => set('grnSpouseCity', e.target.value)} />
							</Field>
							<Field label="Spouse Post Code">
								<input className={input + ' max-w-[140px]'} value={form.grnSpouseCode || ''} maxLength={5} inputMode="numeric"
									disabled={!spouse.address} readOnly={addrMode === 'same'} onChange={e => set('grnSpouseCode', digits(e.target.value))} />
							</Field>
							<Field label="Spouse Citizenship" required={spouse.contactRequired}>
								{citizenship('spouseCitizenship', 'spouseNationality', onSpouseCitizen, { disabled: !spouse.contact, required: spouse.contactRequired })}
							</Field>
							<Field label="Spouse Mobile Phone No." required={spouse.contactRequired}>
								<PhoneInput value={form.spouseMobilePhone || ''} onChange={v => set('spouseMobilePhone', v)}
									disabled={!spouse.contact} required={spouse.contactRequired} />
							</Field>
							<Field label="Spouse Email" required={spouse.contactRequired}>
								<input className={input} type="email" value={form.spouseEmail || ''} disabled={!spouse.contact}
									required={spouse.contactRequired} onChange={e => set('spouseEmail', e.target.value)} />
							</Field>

							<Field label="NPWP"><NpwpInput value={form.npwp || ''} onChange={() => undefined} readOnly /></Field>
							<Field label="Citizenship" required>
								<div className="flex gap-2">
									<select className={input + ' !w-28 shrink-0'} value={form.citizen || ''} required onChange={e => onCitizen(e.target.value)}>
										<option value="">Select</option>
										<option value="WNI">WNI</option>
										<option value="WNA">WNA</option>
									</select>
									{nationalitySelect('nationality', form.citizen !== 'WNA', form.citizen === 'WNA')}
								</div>
							</Field>
							<Field label="ID Card No." required>{text('grnIdCard', { required: true, max: 30 })}</Field>
							<Field label="Validity ID Card">
								<div className="flex gap-2">
									<select className={input + ' !w-44 shrink-0'} value={validity}
										onChange={e => { setValidity(e.target.value as '' | '0' | '1'); if (e.target.value !== '0') set('grnIdVal', ''); }}>
										<option value="">Select</option>
										<option value="1">No Expire Date</option>
										<option value="0">Certain Period</option>
									</select>
									{validity === '0' && (
										<input className={input + ' max-w-[180px]'} type="date" value={form.grnIdVal || ''} required
											onChange={e => set('grnIdVal', e.target.value)} />
									)}
								</div>
							</Field>
							<Field label="Passport No." required={form.citizen === 'WNA'}>
								<input className={input} value={form.passportNo || ''} maxLength={30} required={form.citizen === 'WNA'} disabled={wni}
									onChange={e => set('passportNo', e.target.value)} />
							</Field>
						</>
					)}

					{isPT && (
						<>
							<Field label="Contract Signer" required>
								<select className={input} value={form.grnContact || ''} required onChange={e => onSigner(e.target.value)}>
									<option value="">Select</option>
									{opts.signers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
									{form.grnContact && !opts.signers.some(s => s.name === form.grnContact) && (
										<option value={form.grnContact}>{form.grnContact}</option>
									)}
								</select>
							</Field>
							<Field label="Signer Position">{text('conSignPos', { max: 100 })}</Field>
							<Field label="Signer ID Card No." required>
								<input className={input} value={form.grnIdCard || ''} maxLength={30} required
									onChange={e => set('grnIdCard', digits(e.target.value))} />
							</Field>
							<Field label="Signer Mobile Phone No." required>
								<PhoneInput value={form.conSignerMobilePhone || ''} onChange={v => set('conSignerMobilePhone', v)} required />
							</Field>
							<Field label="Signer Email" required>{text('conSignerEmail', { required: true, type: 'email', max: 100 })}</Field>
							<Field label="Signer Citizenship" required>
								<div className="flex gap-2">
									<select className={input + ' !w-28 shrink-0'} value={form.citizen || ''} required onChange={e => onCitizen(e.target.value)}>
										<option value="">Select</option>
										<option value="WNI">WNI</option>
										<option value="WNA">WNA</option>
									</select>
									{nationalitySelect('nationality', form.citizen !== 'WNA', form.citizen === 'WNA')}
								</div>
							</Field>
						</>
					)}
				</div>
			</fieldset>

			{messages.length > 0 && (
				<div className="mx-6 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
					{messages.map(m => <div key={m}>{m}</div>)}
				</div>
			)}
			{success && <div className="mx-6 mb-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">Successful</div>}

			<GuarantorNavButtons
				current="info" onNavigate={onNavigate} onBack={onBack}
				primary={
					<button type="submit" disabled={!!blocked || saving}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300">
						{saving ? 'Saving…' : 'Update'}
					</button>
				}
			/>
		</form>
	);
};

export default GuarantorInfoPage;
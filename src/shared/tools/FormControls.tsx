import React from "react";
import AsOfDatePickerComponent from '@/shared/components/AsOfDatePickerComponent';

export interface Option {
	value: string;
	label: string;
}

export const inputClsBase =
	"border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400";

export function fieldClsFor(editable: boolean): string {
	return `${inputClsBase} ${editable ? "bg-white" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`;
}

export function filterDigits(value: string): string {
	return value.replace(/\D/g, "");
}

export function filterPhoneDigits(value: string): string {
	return value.replace(/[^0-9xX]/g, "");
}

export function numericKeyDown(allowNegative = false) {
	return (e: React.KeyboardEvent<HTMLInputElement>) => {
		const allowed = allowNegative ? /^[\d-]$/ : /^\d$/;
		if (!allowed.test(e.key) && !["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight"].includes(e.key)) {
			e.preventDefault();
		}
	};
}

export function isValidMonth(mm: string): boolean {
	if (mm.length !== 2) return false;
	const n = Number(mm);
	return n >= 1 && n <= 12;
}

export function toPeriod(year: string, month: string): string {
	return `${year}${month}`;
}

export function currentYYYYMM(): number {
	const now = new Date();
	return Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`);
}

export function parseDDMMYYYY(value: string): Date | null {
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

export function formatDDMMYYYY(date: Date | null): string {
	if (!date) return "";
	const dd = String(date.getDate()).padStart(2, "0");
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const yyyy = date.getFullYear();
	return `${dd}-${mm}-${yyyy}`;
}

export interface PhoneFieldProps {
	value: string;
	onChange: (v: string) => void;
	disabled?: boolean;
}

export function PhoneField({ value, onChange, disabled }: PhoneFieldProps) {
	return (
		<div className="relative">
			<span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">62</span>
			<input
				type="tel"
				inputMode="numeric"
				className={`${fieldClsFor(!disabled)} pl-7`}
				value={value}
				disabled={disabled}
				onChange={e => onChange(filterPhoneDigits(e.target.value))}
			/>
		</div>
	);
}

export interface NumericFieldProps {
	value: string;
	onChange: (v: string) => void;
	onBlur?: () => void;
	editable?: boolean;
	maxLength?: number;
	placeholder?: string;
	className?: string;
}

export function NumericField({ value, onChange, onBlur, editable = true, maxLength, placeholder, className }: NumericFieldProps) {
	return (
		<input
			type="text"
			inputMode="numeric"
			className={className ?? fieldClsFor(editable)}
			value={value}
			disabled={!editable}
			maxLength={maxLength}
			placeholder={placeholder}
			onChange={e => onChange(filterDigits(e.target.value))}
			onBlur={onBlur}
		/>
	);
}

export interface FieldCountControlProps {
	count: number;
	onCountChange: (n: number) => void;
	onGo: () => void;
	editable: boolean;
}

export function FieldCountControl({ count, onCountChange, onGo, editable }: FieldCountControlProps) {
	return (
		<span className="inline-flex items-center gap-2 ml-3">
			<span className="w-32 whitespace-nowrap">Number of field</span>
			<NumericField
				value={String(count)}
				onChange={v => onCountChange(v === "" ? 0 : Number(v))}
				editable={editable}
				maxLength={2}
				className={`${fieldClsFor(editable)} w-16 text-center`}
			/>
			<button
				type="button"
				onClick={onGo}
				disabled={!editable}
				className="px-3 py-1 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white rounded text-xs font-medium"
			>
				Go
			</button>
		</span>
	);
}

export interface ManagementDetailValue {
	nameWithoutTitle: string;
	gender: string;
	placeOfBirth: string;
	dateOfBirth: string;
	address: string;
	areaCd: string;
	province: string;
	city: string;
	kecamatan: string;
	kelurahan: string;
	postCode: string;
	citizen: string;
	nationality: string;
	idCard: string;
	passportNo: string;
	idType: string;
	noExpireDate: string;
	certainPeriod: string;
	mobilePhone: string;
	email: string;
	nameInNpwp: string;
	establishPlace: string;
	establishDate: string;
	addressNpwp: string;
	areaCdNpwp: string;
	provinceNpwp: string;
	cityNpwp: string;
	kecamatanNpwp: string;
	kelurahanNpwp: string;
	npwp: string;
	postCodeNpwp: string;
}

export const emptyManagementDetail: ManagementDetailValue = {
	nameWithoutTitle: "", gender: "", placeOfBirth: "", dateOfBirth: "", address: "", areaCd: "",
	province: "", city: "", kecamatan: "", kelurahan: "", postCode: "", citizen: "", nationality: "",
	idCard: "", passportNo: "", idType: "", noExpireDate: "", certainPeriod: "", mobilePhone: "", email: "",
	nameInNpwp: "", establishPlace: "", establishDate: "", addressNpwp: "", areaCdNpwp: "",
	provinceNpwp: "", cityNpwp: "", kecamatanNpwp: "", kelurahanNpwp: "", npwp: "", postCodeNpwp: "",
};

export interface ManagementDetailModalProps {
	open: boolean;
	onClose: () => void;
	name: string;
	shareStatus: string;
	value: ManagementDetailValue;
	onSave: (value: ManagementDetailValue) => void;
	editable: boolean;
	areaOptions: Option[];
	nationalityOptions: Option[];
	fetchProvinceCity: (areaCd: string) => Promise<{ province: string; city: string }>;
	fetchKecamatan: (areaCd: string) => Promise<Option[]>;
	fetchKelurahan: (kecamatanCd: string) => Promise<Option[]>;
	isSigner: boolean;
}

const OUTSIDE_INDONESIA_AREA = "9999";
const OUTSIDE_INDONESIA_LABEL = "Di Luar Wilayah Indonesia";

export function ManagementDetailModal({
	open, onClose, name, shareStatus, value, onSave, editable,
	areaOptions, nationalityOptions, fetchProvinceCity, fetchKecamatan, fetchKelurahan, isSigner,
}: ManagementDetailModalProps) {
	const [draft, setDraft] = React.useState<ManagementDetailValue>(value);
	const [kecamatanOptions, setKecamatanOptions] = React.useState<Option[]>([]);
	const [kelurahanOptions, setKelurahanOptions] = React.useState<Option[]>([]);
	const [kecamatanNpwpOptions, setKecamatanNpwpOptions] = React.useState<Option[]>([]);
	const [kelurahanNpwpOptions, setKelurahanNpwpOptions] = React.useState<Option[]>([]);

	React.useEffect(() => {
		if (!open) return;
		setDraft(value);
		(async () => {
			if (value.areaCd && value.areaCd !== OUTSIDE_INDONESIA_AREA) {
				setKecamatanOptions(await fetchKecamatan(value.areaCd));
			}
			if (value.kecamatan) {
				setKelurahanOptions(await fetchKelurahan(value.kecamatan));
			}
			if (value.areaCdNpwp && value.areaCdNpwp !== OUTSIDE_INDONESIA_AREA) {
				setKecamatanNpwpOptions(await fetchKecamatan(value.areaCdNpwp));
			}
			if (value.kecamatanNpwp) {
				setKelurahanNpwpOptions(await fetchKelurahan(value.kecamatanNpwp));
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, value]);

	if (!open) return null;
	const set = (patch: Partial<ManagementDetailValue>) => setDraft(prev => ({ ...prev, ...patch }));
	const isCorporate = shareStatus === "1";

	const handleAreaChange = async (v: string) => {
		set({ areaCd: v, kecamatan: "", kelurahan: "" });
		setKelurahanOptions([]);
		if (v === OUTSIDE_INDONESIA_AREA) {
			set({ province: OUTSIDE_INDONESIA_LABEL, city: OUTSIDE_INDONESIA_LABEL });
			setKecamatanOptions([]);
			return;
		}
		const { province, city } = await fetchProvinceCity(v);
		set({ province, city });
		setKecamatanOptions(await fetchKecamatan(v));
	};

	const handleKecamatanChange = async (v: string) => {
		set({ kecamatan: v, kelurahan: "" });
		setKelurahanOptions(await fetchKelurahan(v));
	};

	const handleAreaNpwpChange = async (v: string) => {
		set({ areaCdNpwp: v, kecamatanNpwp: "", kelurahanNpwp: "" });
		setKelurahanNpwpOptions([]);
		if (v === OUTSIDE_INDONESIA_AREA) {
			set({ provinceNpwp: OUTSIDE_INDONESIA_LABEL, cityNpwp: OUTSIDE_INDONESIA_LABEL });
			setKecamatanNpwpOptions([]);
			return;
		}
		const { province, city } = await fetchProvinceCity(v);
		set({ provinceNpwp: province, cityNpwp: city });
		setKecamatanNpwpOptions(await fetchKecamatan(v));
	};

	const handleKecamatanNpwpChange = async (v: string) => {
		set({ kecamatanNpwp: v, kelurahanNpwp: "" });
		setKelurahanNpwpOptions(await fetchKelurahan(v));
	};

	const validate = (): string | null => {
		if (!isCorporate) {
			if (!draft.nameWithoutTitle) return "BOD/BOC name harus diisi";
			if (!draft.gender) return "Gender harus dipilih";
			if (!draft.address) return "Alamat harus diisi";
			if (!draft.areaCd) return "Area harus dipilih";
			if (draft.areaCd !== OUTSIDE_INDONESIA_AREA) {
				if (!draft.kecamatan) return "Kecamatan harus diisi";
				if (!draft.kelurahan) return "Kelurahan harus diisi";
			}
			if (!draft.citizen) return "Citizenship harus dipilih";
			if (!draft.nationality) return "Nationality harus dipilih";
			if (draft.citizen === "WNI" && !draft.idCard) return "Nomor ID Card harus diisi";
			if (draft.citizen === "WNA" && !draft.passportNo) return "Nomor Passport harus diisi";
			if (!draft.postCode || draft.postCode.length < 5) return "Kode Pos tidak boleh kosong/kurang dari 5 digit";
			if (!draft.placeOfBirth) return "Tempat Lahir harus diisi";
			if (!draft.dateOfBirth) return "Tanggal Lahir harus diisi";
			if (!draft.noExpireDate) return "Validity ID Card harus dipilih";
			if (draft.noExpireDate === "0" && !draft.certainPeriod) return "Certain Period harus diisi";
			if (isSigner) {
				if (!draft.mobilePhone) return "Mobile Phone No. harus diisi";
				if (!draft.email) return "Email harus diisi";
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) return "Format email tidak valid";
			}
		} else {
			if (!draft.nameInNpwp) return "Name in NPWP harus diisi";
			if (!draft.address) return "Alamat harus diisi";
			if (!draft.addressNpwp) return "Alamat NPWP harus diisi";
			if (!draft.areaCd) return "Area harus dipilih";
			if (!draft.areaCdNpwp) return "Area NPWP harus dipilih";
			if (draft.areaCd !== OUTSIDE_INDONESIA_AREA) {
				if (!draft.kecamatan) return "Kecamatan harus diisi";
				if (!draft.kelurahan) return "Kelurahan harus diisi";
			}
			if (draft.areaCdNpwp !== OUTSIDE_INDONESIA_AREA) {
				if (!draft.kecamatanNpwp) return "Kecamatan NPWP harus diisi";
				if (!draft.kelurahanNpwp) return "Kelurahan NPWP harus diisi";
			}
			if (!draft.npwp) return "NPWP harus diisi";
			if (draft.npwp.length < 4) return "NPWP minimal 4 digit";
			if (!draft.postCodeNpwp || draft.postCodeNpwp.length < 5) return "Kode Pos NPWP tidak boleh kosong/kurang dari 5 digit";
			if (!draft.nameWithoutTitle) return "Name in Akta Without Title harus diisi";
			if (!draft.establishPlace) return "Establish Place harus diisi";
			if (!draft.establishDate) return "Establish Date harus diisi";
			if (!draft.postCodeNpwp) return "Kode Pos NPWP harus diisi";
			if (!draft.noExpireDate) return "Validity ID Card harus dipilih";
			if (draft.noExpireDate === "0" && !draft.certainPeriod) return "Certain Period harus diisi";
			if (isSigner) {
				if (!draft.mobilePhone) return "Mobile Phone No. harus diisi";
				if (!draft.email) return "Email harus diisi";
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) return "Format email tidak valid";
			}
		}
		return null;
	};

	const handleSave = () => {
		const err = validate();
		if (err) { alert(err); return; }
		onSave(draft);
		onClose();
	};

	const noExpireDateOptions: Option[] = [
		{ value: "0", label: "Certain Period" },
		{ value: "1", label: "No Expire Date" },
	];

	return (
		<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
				<div className="px-6 py-4 border-b border-[var(--app-border)] flex items-center justify-between">
					<h3 className="font-bold text-slate-800">Management Detail Information</h3>
					<button onClick={onClose} className="text-slate-400 hover:text-slate-600">✖</button>
				</div>
				<div className="px-6 py-4 space-y-3 text-sm">
					{!isCorporate ? (
						<>
							<FieldRow label="BOD / BOC Name in ID Card"><input className={fieldClsFor(false)} value={name} readOnly /></FieldRow>
							<FieldRow label="BOD / BOC Name Without Title">
								<input className={fieldClsFor(editable)} disabled={!editable} maxLength={50}
									value={draft.nameWithoutTitle} onChange={e => set({ nameWithoutTitle: e.target.value })} />
							</FieldRow>
							<FieldRow label="Gender">
								<select className={fieldClsFor(editable)} disabled={!editable} value={draft.gender} onChange={e => set({ gender: e.target.value })}>
									<option value="">Select</option>
									<option value="M">Male</option>
									<option value="F">Female</option>
								</select>
							</FieldRow>
							<FieldRow label="Place / Date of Birth">
								<div className="flex gap-2">
									<input className={fieldClsFor(editable)} disabled={!editable} maxLength={100}
										value={draft.placeOfBirth} onChange={e => set({ placeOfBirth: e.target.value })} />
									<AsOfDatePickerComponent
										label=""
										format="DD-MM-YYYY"
										placeholder="dd-mm-yyyy"
										disabled={!editable}
										maxDate={new Date()}
										value={parseDDMMYYYY(draft.dateOfBirth)}
										onChange={date => set({ dateOfBirth: formatDDMMYYYY(date) })}
										className="flex-1"
									/>
								</div>
							</FieldRow>
							<FieldRow label="ID Address">
								<textarea className={fieldClsFor(editable)} disabled={!editable}
									value={draft.address} onChange={e => set({ address: e.target.value })} />
							</FieldRow>
							<FieldRow label="Area">
								<select className={fieldClsFor(editable)} disabled={!editable} value={draft.areaCd}
									onChange={e => handleAreaChange(e.target.value)}>
									<option value="">Select</option>
									{areaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
									<option value={OUTSIDE_INDONESIA_AREA}>{OUTSIDE_INDONESIA_LABEL}</option>
								</select>
							</FieldRow>
							<FieldRow label="Province"><input className={fieldClsFor(false)} value={draft.province} readOnly /></FieldRow>
							<FieldRow label="District / City"><input className={fieldClsFor(false)} value={draft.city} readOnly /></FieldRow>
							<FieldRow label="Kecamatan">
								<select className={fieldClsFor(editable && draft.areaCd !== OUTSIDE_INDONESIA_AREA)}
									disabled={!editable || draft.areaCd === OUTSIDE_INDONESIA_AREA} value={draft.kecamatan}
									onChange={e => handleKecamatanChange(e.target.value)}>
									<option value="">Select</option>
									{kecamatanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</FieldRow>
							<FieldRow label="Kelurahan">
								<select className={fieldClsFor(editable && draft.areaCd !== OUTSIDE_INDONESIA_AREA)}
									disabled={!editable || draft.areaCd === OUTSIDE_INDONESIA_AREA} value={draft.kelurahan}
									onChange={e => set({ kelurahan: e.target.value })}>
									<option value="">Select</option>
									{kelurahanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</FieldRow>
							<FieldRow label="Post Code">
								<NumericField value={draft.postCode} editable={editable} maxLength={5} onChange={v => set({ postCode: v })} />
							</FieldRow>
							<FieldRow label="Mobile Phone No."><PhoneField value={draft.mobilePhone} disabled={!editable} onChange={v => set({ mobilePhone: v })} /></FieldRow>
							<FieldRow label="Email"><input type="email" className={fieldClsFor(editable)} disabled={!editable} value={draft.email} onChange={e => set({ email: e.target.value })} /></FieldRow>
							<FieldRow label="Citizenship">
								<div className="flex gap-2">
									<select className={fieldClsFor(editable)} disabled={!editable} value={draft.citizen}
										onChange={e => {
											const citizen = e.target.value;
											set({
												citizen,
												nationality: citizen === "WNI" ? "ID" : "",
												idType: citizen === "WNI" ? "KTP" : citizen === "WNA" ? "Paspor" : "",
												idCard: "", passportNo: "",
											});
										}}>
										<option value="">Select</option>
										<option value="WNI">WNI</option>
										<option value="WNA">WNA</option>
									</select>
									<select className={fieldClsFor(editable && draft.citizen === "WNA")} disabled={!editable || draft.citizen !== "WNA"}
										value={draft.nationality} onChange={e => set({ nationality: e.target.value })}>
										<option value="">Nationality</option>
										{nationalityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
									</select>
								</div>
							</FieldRow>
							<FieldRow label="ID Type"><input className={fieldClsFor(false)} value={draft.idType} readOnly /></FieldRow>
							{draft.citizen !== "WNA" && (
								<FieldRow label="ID Card No.">
									<input className={fieldClsFor(editable)} disabled={!editable} maxLength={40}
										value={draft.idCard} onChange={e => set({ idCard: e.target.value })} />
								</FieldRow>
							)}
							<FieldRow label="Validity ID Card">
								<div className="flex gap-2">
									<select className={fieldClsFor(editable)} disabled={!editable} value={draft.noExpireDate}
										onChange={e => set({ noExpireDate: e.target.value, certainPeriod: e.target.value === "1" ? "" : draft.certainPeriod })}>
										<option value="">Select</option>
										{noExpireDateOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
									</select>
									{draft.noExpireDate === "0" && (
										<AsOfDatePickerComponent
											label="" format="DD-MM-YYYY" placeholder="dd-mm-yyyy"
											disabled={!editable} minDate={new Date()}
											value={parseDDMMYYYY(draft.certainPeriod)}
											onChange={date => set({ certainPeriod: formatDDMMYYYY(date) })}
										/>
									)}
								</div>
							</FieldRow>
							{draft.citizen === "WNA" && (
								<FieldRow label="Passport No.">
									<input className={fieldClsFor(editable)} disabled={!editable} maxLength={30}
										value={draft.passportNo} onChange={e => set({ passportNo: e.target.value })} />
								</FieldRow>
							)}
						</>
					) : (
						<>
							<FieldRow label="Name in Akta"><input className={fieldClsFor(false)} value={name} readOnly /></FieldRow>
							<FieldRow label="Name in NPWP">
								<input className={fieldClsFor(editable)} disabled={!editable} value={draft.nameInNpwp} onChange={e => set({ nameInNpwp: e.target.value })} />
							</FieldRow>
							<FieldRow label="Name in Akta Without Title">
								<input className={fieldClsFor(editable)} disabled={!editable} value={draft.nameWithoutTitle} onChange={e => set({ nameWithoutTitle: e.target.value })} />
							</FieldRow>
							<FieldRow label="Establishment Place / Date">
								<div className="flex gap-2">
									<input className={fieldClsFor(editable)} disabled={!editable} maxLength={100}
										value={draft.establishPlace} onChange={e => set({ establishPlace: e.target.value })} />
									<AsOfDatePickerComponent
										label=""
										format="DD-MM-YYYY"
										placeholder="dd-mm-yyyy"
										disabled={!editable}
										maxDate={new Date()}
										value={parseDDMMYYYY(draft.establishDate)}
										onChange={date => set({ establishDate: formatDDMMYYYY(date) })}
										className="flex-1"
									/>
								</div>
							</FieldRow>
							<FieldRow label="Address in SK. Domisili">
								<textarea className={fieldClsFor(editable)} disabled={!editable} value={draft.address} onChange={e => set({ address: e.target.value })} />
							</FieldRow>
							<FieldRow label="Area">
								<select className={fieldClsFor(editable)} disabled={!editable} value={draft.areaCd}
									onChange={e => handleAreaChange(e.target.value)}>
									<option value="">Select</option>
									{areaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
									<option value={OUTSIDE_INDONESIA_AREA}>{OUTSIDE_INDONESIA_LABEL}</option>
								</select>
							</FieldRow>
							<FieldRow label="Province"><input className={fieldClsFor(false)} value={draft.province} readOnly /></FieldRow>
							<FieldRow label="District / City"><input className={fieldClsFor(false)} value={draft.city} readOnly /></FieldRow>
							<FieldRow label="Kecamatan">
								<select className={fieldClsFor(editable && draft.areaCd !== OUTSIDE_INDONESIA_AREA)}
									disabled={!editable || draft.areaCd === OUTSIDE_INDONESIA_AREA} value={draft.kecamatan}
									onChange={e => handleKecamatanChange(e.target.value)}>
									<option value="">Select</option>
									{kecamatanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</FieldRow>
							<FieldRow label="Kelurahan">
								<select className={fieldClsFor(editable && draft.areaCd !== OUTSIDE_INDONESIA_AREA)}
									disabled={!editable || draft.areaCd === OUTSIDE_INDONESIA_AREA} value={draft.kelurahan}
									onChange={e => set({ kelurahan: e.target.value })}>
									<option value="">Select</option>
									{kelurahanOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</FieldRow>
							<FieldRow label="ID Type"><input className={fieldClsFor(false)} value={draft.idType} readOnly /></FieldRow>
							<FieldRow label="NPWP No.">
								<NpwpInput value={draft.npwp} editable={editable} onChange={v => set({ npwp: v })} />
							</FieldRow>
							<FieldRow label="Validity ID Card">
								<div className="flex gap-2">
									<select className={fieldClsFor(false)} disabled value={draft.noExpireDate}
										onChange={e => set({ noExpireDate: e.target.value })}>
										<option value="">Select</option>
										{noExpireDateOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
									</select>
									{draft.noExpireDate === "0" && (
										<AsOfDatePickerComponent
											label="" format="DD-MM-YYYY" placeholder="dd-mm-yyyy"
											disabled={!editable} minDate={new Date()}
											value={parseDDMMYYYY(draft.certainPeriod)}
											onChange={date => set({ certainPeriod: formatDDMMYYYY(date) })}
										/>
									)}
								</div>
							</FieldRow>
							<FieldRow label="Address in NPWP">
								<textarea className={fieldClsFor(editable)} disabled={!editable} value={draft.addressNpwp} onChange={e => set({ addressNpwp: e.target.value })} />
							</FieldRow>
							<FieldRow label="Area (NPWP)">
								<select className={fieldClsFor(editable)} disabled={!editable} value={draft.areaCdNpwp}
									onChange={e => handleAreaNpwpChange(e.target.value)}>
									<option value="">Select</option>
									{areaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
									<option value={OUTSIDE_INDONESIA_AREA}>{OUTSIDE_INDONESIA_LABEL}</option>
								</select>
							</FieldRow>
							<FieldRow label="Province (NPWP)"><input className={fieldClsFor(false)} value={draft.provinceNpwp} readOnly /></FieldRow>
							<FieldRow label="District / City (NPWP)"><input className={fieldClsFor(false)} value={draft.cityNpwp} readOnly /></FieldRow>
							<FieldRow label="Kecamatan (NPWP)">
								<select className={fieldClsFor(editable && draft.areaCdNpwp !== OUTSIDE_INDONESIA_AREA)}
									disabled={!editable || draft.areaCdNpwp === OUTSIDE_INDONESIA_AREA} value={draft.kecamatanNpwp}
									onChange={e => handleKecamatanNpwpChange(e.target.value)}>
									<option value="">Select</option>
									{kecamatanNpwpOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</FieldRow>
							<FieldRow label="Kelurahan (NPWP)">
								<select className={fieldClsFor(editable && draft.areaCdNpwp !== OUTSIDE_INDONESIA_AREA)}
									disabled={!editable || draft.areaCdNpwp === OUTSIDE_INDONESIA_AREA} value={draft.kelurahanNpwp}
									onChange={e => set({ kelurahanNpwp: e.target.value })}>
									<option value="">Select</option>
									{kelurahanNpwpOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</FieldRow>
							<FieldRow label="Post Code in NPWP">
								<NumericField value={draft.postCodeNpwp} editable={editable} maxLength={5} onChange={v => set({ postCodeNpwp: v })} />
							</FieldRow>
							<FieldRow label="Mobile Phone No."><PhoneField value={draft.mobilePhone} disabled={!editable} onChange={v => set({ mobilePhone: v })} /></FieldRow>
							<FieldRow label="Email"><input type="email" className={fieldClsFor(editable)} disabled={!editable} value={draft.email} onChange={e => set({ email: e.target.value })} /></FieldRow>
						</>
					)}
				</div>
				<div className="px-6 py-4 border-t border-[var(--app-border)] flex justify-end gap-2">
					<button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-medium text-slate-700">Cancel</button>
					{editable && (
						<button onClick={handleSave} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-medium text-white">Save</button>
					)}
				</div>
			</div>
		</div>
	);
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-3 gap-3 items-start">
			<label className="text-xs text-slate-500 pt-2">{label}</label>
			<div className="col-span-2">{children}</div>
		</div>
	);
}

function NpwpInput({ value, editable, onChange }: { value: string; editable: boolean; onChange: (v: string) => void }) {
	const padded = value.padEnd(16, " ");
	const parts = [
		padded.slice(0, 2).trim(), padded.slice(2, 5).trim(), padded.slice(5, 8).trim(),
		padded.slice(8, 9).trim(), padded.slice(9, 12).trim(), padded.slice(12, 16).trim(),
	];
	const lens = [2, 3, 3, 1, 3, 4];
	const setPart = (i: number, v: string) => {
		const next = [...parts];
		next[i] = filterDigits(v);
		onChange(next.join(""));
	};
	return (
		<div className="flex gap-1 items-center">
			{lens.map((len, i) => (
				<input key={i} className={fieldClsFor(editable)} disabled={!editable} maxLength={len}
					style={{ width: `${len * 14 + 16}px` }} value={parts[i]} onChange={e => setPart(i, e.target.value)} />
			))}
		</div>
	);
}

export function ClearButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
	if (!visible) return null;
	return (
		<button
			type="button"
			onClick={onClick}
			title="Clear"
			className="text-red-500 hover:text-red-700 text-sm font-bold px-1"
		>
			✖
		</button>
	);
}
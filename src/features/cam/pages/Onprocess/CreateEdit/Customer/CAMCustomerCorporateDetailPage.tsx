import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import AsOfDatePickerComponent from '@/shared/components/AsOfDatePickerComponent';

interface Option {
	value: string;
	label: string;
}

interface CorporateDetailData {
	[key: string]: string;
}

interface Lookups {
	customerProfiles: Option[];
	officeStatuses: Option[];
	groups: Option[];
	relationshipWithCompany: Option[];
	businessEntities: Option[];
	biCustomerTypes?: Option[];
}

export interface CAMCustomerCorporateDetailPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	guarantor: string;
	newCar: string;
	purpoffinc: string;
	contType: string;
	restructuringChange: string;
	goPublic: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}


function InfoTooltip({ text }: { text: string }) {
	return (
		<label title={text} className="text-blue-600 ml-1 cursor-help align-middle">
			<i>(i)</i>
		</label>
	);
}

function splitIndustryValue(value: string): { code: string; header: string } {
	const idx = value.indexOf("|");
	if (idx === -1) return { code: "", header: value };
	return { code: value.slice(0, idx), header: value.slice(idx + 1) };
}

function filterDigits(value: string): string {
	return value.replace(/\D/g, "");
}

function filterPhoneDigits(value: string): string {
	return value.replace(/[^0-9xX]/g, "");
}

const fFieldBase =
	"w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-1.5 text-[13px] text-[var(--app-text)] shadow-sm transition-colors duration-150 placeholder:text-[var(--app-muted)]/60 hover:border-[var(--app-border-strong,var(--app-border))] focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 disabled:cursor-not-allowed disabled:bg-[var(--app-surface-alt)] disabled:text-[var(--app-muted)] disabled:shadow-none disabled:hover:border-[var(--app-border)]";
const fInput = fFieldBase;
const fRO =
	"w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-alt)] px-3 py-1.5 text-[13px] font-medium text-[var(--app-muted)] shadow-none cursor-default select-text";
const fLabel = "text-[12.5px] font-medium text-[var(--app-muted)] pt-2 pr-3 leading-snug";
const fErr = "text-red-500 text-[11px] mt-1 flex items-center gap-1";

function styleLabel(label?: React.ReactNode): React.ReactNode {
	if (typeof label !== "string") return label;
	if (!label.includes("*")) return label;
	const idx = label.indexOf("*");
	return (
		<>
			{label.slice(0, idx)}
			<span className="text-red-400">{label.slice(idx)}</span>
		</>
	);
}

function F({ label, children, error }: { label?: React.ReactNode; children: React.ReactNode; error?: string }) {
	return (
		<div className="grid grid-cols-[170px_minmax(0,1fr)] gap-x-3 items-start rounded-md px-1 py-0.5 transition-colors hover:bg-[var(--app-surface)]/40">
			<div className={fLabel}>{styleLabel(label)}</div>
			<div className="py-0.5">
				{children}
				{error && (
					<p className={fErr}>
						<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5a.9.9 0 01.9.9v3a.9.9 0 11-1.8 0v-3A.9.9 0 018 4.5zM8 10a1 1 0 110 2 1 1 0 010-2z" /></svg>
						{error}
					</p>
				)}
			</div>
		</div>
	);
}

function SectionBar({ title }: { title: string }) {
	return (
		<div className="mt-5 mb-2 flex items-center gap-2">
			<span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
			<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--app-text)]">{title}</span>
			<span className="h-px flex-1 bg-[var(--app-border)]" />
		</div>
	);
}


function PhoneInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
	return (
		<div className="flex items-center gap-2">
			<div className="group flex flex-1 items-stretch rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm transition-colors duration-150 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/25">
				<span className="inline-flex select-none items-center rounded-l-lg border-r border-[var(--app-border)] bg-[var(--app-surface-alt)] px-2.5 text-[12px] font-medium text-[var(--app-muted)]">+62</span>
				<input
					type="tel"
					inputMode="numeric"
					className="w-full rounded-r-lg bg-transparent px-3 py-1.5 text-[13px] text-[var(--app-text)] focus:outline-none disabled:cursor-not-allowed disabled:text-[var(--app-muted)]"
					value={value}
					disabled={disabled}
					onChange={e => onChange(filterPhoneDigits(e.target.value))}
				/>
			</div>
		</div>
	);
}

const parseDMY = (value: string): Date | null => {
	if (!value) return null;
	const [d, m, y] = value.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d);
};

const formatDMY = (value: Date | null): string => {
	if (!value) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(value.getDate())}-${pad(value.getMonth() + 1)}-${value.getFullYear()}`;
};


type IndCodeSel = { l0: string; l1: string; l2: string; l3: string; l4: string; l5: string };

interface CorporateDetailLoadResult {
	data: CorporateDetailData;
	lookups: Lookups;
	areas: Option[];
	npwpParts: string[];
	kecamatan1Options: Option[];
	kelurahan1Options: Option[];
	kecamatanNpwpOptions: Option[];
	kelurahanNpwpOptions: Option[];
	businessTypeOptions: Option[];
	indCodeOptions: Option[];
	indCode1Options: Option[];
	indCode2Options: Option[];
	indCode3Options: Option[];
	indCode4Options: Option[];
	indCode5Options: Option[];
	indCodeSel: IndCodeSel;
}

const CAMCustomerCorporateDetailPage = forwardRef<CamTabHandle, CAMCustomerCorporateDetailPageProps>(function CAMCustomerCorporateDetailPage({
	apless: initialApless, applNo, finType, custName, guarantor, newCar, purpoffinc, contType, restructuringChange,
	goPublic, onSaved,
}, ref) {
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [formMessage, setFormMessage] = useState<string | null>(null);
	const [lookups, setLookups] = useState<Lookups | null>(null);
	const [d, setD] = useState<CorporateDetailData>({});

	const [npwpParts, setNpwpParts] = useState(["", "", "", "", "", ""]);

	const [areas, setAreas] = useState<Option[]>([]);
	const [kecamatan1Options, setKecamatan1Options] = useState<Option[]>([]);
	const [kelurahan1Options, setKelurahan1Options] = useState<Option[]>([]);
	const [kecamatanNpwpOptions, setKecamatanNpwpOptions] = useState<Option[]>([]);
	const [kelurahanNpwpOptions, setKelurahanNpwpOptions] = useState<Option[]>([]);
	const [businessTypeOptions, setBusinessTypeOptions] = useState<Option[]>([]);

	const [indCodeOptions, setIndCodeOptions] = useState<Option[]>([]);
	const [indCode1Options, setIndCode1Options] = useState<Option[]>([]);
	const [indCode2Options, setIndCode2Options] = useState<Option[]>([]);
	const [indCode3Options, setIndCode3Options] = useState<Option[]>([]);
	const [indCode4Options, setIndCode4Options] = useState<Option[]>([]);
	const [indCode5Options, setIndCode5Options] = useState<Option[]>([]);
	const [indCodeSel, setIndCodeSel] = useState<IndCodeSel>({ l0: "", l1: "", l2: "", l3: "", l4: "", l5: "" });

	const set = (key: string, value: string) => setD(prev => ({ ...prev, [key]: value }));

	const loadIndustryTop = useCallback(async (): Promise<Option[]> => {
		const r = await api.get("/CAM/Combo/industry-codes", { params: { level: 1 } });
		return r.data;
	}, []);

	const loadIndustryChildren = useCallback(async (codeCandidate: string, headerCandidate: string): Promise<Option[]> => {
		if (codeCandidate) {
			const r = await api.get("/CAM/Combo/industry-codes", { params: { level: 2, parent: codeCandidate } });
			if (r.data.length > 0) return r.data;
		}
		if (headerCandidate) {
			const r = await api.get("/CAM/Combo/industry-codes", { params: { level: 2, parent: headerCandidate } });
			return r.data;
		}
		return [];
	}, []);

	const { data: loadResult, isLoading } = useQuery({
		queryKey: ['cam-customer-corporate-detail', initialApless],
		queryFn: async (): Promise<CorporateDetailLoadResult> => {
			const [detailRes, areasRes] = await Promise.all([
				api.get("/CAM/Customer/corporate-detail", { params: { apless: initialApless } }),
				api.get("/CAM/Combo/provinces-and-cities"),
			]);

			const data: CorporateDetailData = detailRes.data.data;
			const lookupsResult: Lookups = detailRes.data.lookups;
			const areasResult: Option[] = areasRes.data;

			const npwp = (data.npwp || "").padEnd(16, " ");
			const npwpParts6 = [
				npwp.slice(0, 2).trim(), npwp.slice(2, 5).trim(), npwp.slice(5, 8).trim(),
				npwp.slice(8, 9).trim(), npwp.slice(9, 12).trim(), npwp.slice(12, 16).trim(),
			];

			let kecamatan1OptionsResult: Option[] = [];
			if (data.areaCd) {
				const r = await api.get("/CAM/Combo/kecamatan", { params: { areaCd: data.areaCd } });
				kecamatan1OptionsResult = r.data;
			}
			let kelurahan1OptionsResult: Option[] = [];
			if (data.kecamatan1) {
				const r = await api.get("/CAM/Combo/kelurahan", { params: { kecamatanCd: data.kecamatan1 } });
				kelurahan1OptionsResult = r.data;
			}
			let kecamatanNpwpOptionsResult: Option[] = [];
			if (data.areaCdNpwp) {
				const r = await api.get("/CAM/Combo/kecamatan", { params: { areaCd: data.areaCdNpwp } });
				kecamatanNpwpOptionsResult = r.data;
			}
			let kelurahanNpwpOptionsResult: Option[] = [];
			if (data.kecamatanNpwp) {
				const r = await api.get("/CAM/Combo/kelurahan", { params: { kecamatanCd: data.kecamatanNpwp } });
				kelurahanNpwpOptionsResult = r.data;
			}
			let businessTypeOptionsResult: Option[] = [];
			if (data.lesseeCat) {
				const r = await api.get("/CAM/Combo/business-type-detail", { params: { custType: data.lesseeCat } });
				businessTypeOptionsResult = r.data;
			}

			const indCodeOptionsResult = await loadIndustryTop();
			let indCode1OptionsResult: Option[] = [];
			let indCode2OptionsResult: Option[] = [];
			let indCode3OptionsResult: Option[] = [];
			let indCode4OptionsResult: Option[] = [];
			let indCode5OptionsResult: Option[] = [];
			let indCodeSelResult: IndCodeSel = { l0: "", l1: "", l2: "", l3: "", l4: "", l5: "" };

			if (data.indusCode) {
				try {
					const pathRes = await api.get("/CAM/Combo/industry-code-path", { params: { code: data.indusCode } });
					const path: Option[] = pathRes.data || [];
					const levelKeys = ["l0", "l1", "l2", "l3", "l4", "l5"] as const;
					const sel: IndCodeSel = { l0: "", l1: "", l2: "", l3: "", l4: "", l5: "" };
					path.forEach((node, i) => { if (levelKeys[i]) sel[levelKeys[i]] = node.value; });
					indCodeSelResult = sel;
					if (sel.l0) indCode1OptionsResult = await loadIndustryChildren("", sel.l0);
					if (sel.l1) { const s = splitIndustryValue(sel.l1); indCode2OptionsResult = await loadIndustryChildren(s.code, s.header); }
					if (sel.l2) { const s = splitIndustryValue(sel.l2); indCode3OptionsResult = await loadIndustryChildren(s.code, s.header); }
					if (sel.l3) { const s = splitIndustryValue(sel.l3); indCode4OptionsResult = await loadIndustryChildren(s.code, s.header); }
					if (sel.l4) { const s = splitIndustryValue(sel.l4); indCode5OptionsResult = await loadIndustryChildren(s.code, s.header); }
				} catch { }
			}

			return {
				data,
				lookups: lookupsResult,
				areas: areasResult,
				npwpParts: npwpParts6,
				kecamatan1Options: kecamatan1OptionsResult,
				kelurahan1Options: kelurahan1OptionsResult,
				kecamatanNpwpOptions: kecamatanNpwpOptionsResult,
				kelurahanNpwpOptions: kelurahanNpwpOptionsResult,
				businessTypeOptions: businessTypeOptionsResult,
				indCodeOptions: indCodeOptionsResult,
				indCode1Options: indCode1OptionsResult,
				indCode2Options: indCode2OptionsResult,
				indCode3Options: indCode3OptionsResult,
				indCode4Options: indCode4OptionsResult,
				indCode5Options: indCode5OptionsResult,
				indCodeSel: indCodeSelResult,
			};
		},
	});

	useEffect(() => {
		if (!loadResult) return;
		setD(loadResult.data);
		setLookups(loadResult.lookups);
		setAreas(loadResult.areas);
		setNpwpParts(loadResult.npwpParts);
		setKecamatan1Options(loadResult.kecamatan1Options);
		setKelurahan1Options(loadResult.kelurahan1Options);
		setKecamatanNpwpOptions(loadResult.kecamatanNpwpOptions);
		setKelurahanNpwpOptions(loadResult.kelurahanNpwpOptions);
		setBusinessTypeOptions(loadResult.businessTypeOptions);
		setIndCodeOptions(loadResult.indCodeOptions);
		setIndCode1Options(loadResult.indCode1Options);
		setIndCode2Options(loadResult.indCode2Options);
		setIndCode3Options(loadResult.indCode3Options);
		setIndCode4Options(loadResult.indCode4Options);
		setIndCode5Options(loadResult.indCode5Options);
		setIndCodeSel(loadResult.indCodeSel);
	}, [loadResult]);

	const handleAreaChange = async (value: string) => {
		set("areaCd", value);
		if (value) {
			const pc = await api.get("/CAM/Combo/province-city", { params: { areaCd: value } });
			set("province2", pc.data.province || "");
			set("city2", pc.data.city || "");
		} else {
			set("province2", "");
			set("city2", "");
		}
		const r = await api.get("/CAM/Combo/kecamatan", { params: { areaCd: value } });
		setKecamatan1Options(r.data);
		setKelurahan1Options([]);
		set("kecamatan1", "");
		set("kelurahan1", "");
	};

	const handleKecamatan1Change = async (value: string) => {
		set("kecamatan1", value);
		const r = await api.get("/CAM/Combo/kelurahan", { params: { kecamatanCd: value } });
		setKelurahan1Options(r.data);
		set("kelurahan1", "");
	};

	const handleAreaNpwpChange = async (value: string) => {
		set("areaCdNpwp", value);
		if (value) {
			const pc = await api.get("/CAM/Combo/province-city", { params: { areaCd: value } });
			set("provinceNpwp", pc.data.province || "");
			set("cityNpwp", pc.data.city || "");
		} else {
			set("provinceNpwp", "");
			set("cityNpwp", "");
		}
		const r = await api.get("/CAM/Combo/kecamatan", { params: { areaCd: value } });
		setKecamatanNpwpOptions(r.data);
		setKelurahanNpwpOptions([]);
		set("kecamatanNpwp", "");
		set("kelurahanNpwp", "");
	};

	const handleKecamatanNpwpChange = async (value: string) => {
		set("kecamatanNpwp", value);
		const r = await api.get("/CAM/Combo/kelurahan", { params: { kecamatanCd: value } });
		setKelurahanNpwpOptions(r.data);
		set("kelurahanNpwp", "");
	};

	const handleLesseeCatChange = async (value: string) => {
		set("lesseeCat", value);
		const r = await api.get("/CAM/Combo/business-type-detail", { params: { custType: value } });
		setBusinessTypeOptions(r.data);
		set("ocuType", "");
	};

	const handleIndCodeL0Change = async (value: string) => {
		setIndCodeSel({ l0: value, l1: "", l2: "", l3: "", l4: "", l5: "" });
		setIndCode2Options([]); setIndCode3Options([]); setIndCode4Options([]); setIndCode5Options([]);
		set("indusCode", "");
		setIndCode1Options(await loadIndustryChildren("", value));
	};

	const handleIndCodeL1Change = async (value: string) => {
		setIndCodeSel(prev => ({ ...prev, l1: value, l2: "", l3: "", l4: "", l5: "" }));
		setIndCode3Options([]); setIndCode4Options([]); setIndCode5Options([]);
		set("indusCode", "");
		const s = splitIndustryValue(value);
		setIndCode2Options(await loadIndustryChildren(s.code, s.header));
	};

	const handleIndCodeL2Change = async (value: string) => {
		setIndCodeSel(prev => ({ ...prev, l2: value, l3: "", l4: "", l5: "" }));
		setIndCode4Options([]); setIndCode5Options([]);
		set("indusCode", "");
		const s = splitIndustryValue(value);
		setIndCode3Options(await loadIndustryChildren(s.code, s.header));
	};

	const handleIndCodeL3Change = async (value: string) => {
		setIndCodeSel(prev => ({ ...prev, l3: value, l4: "", l5: "" }));
		setIndCode5Options([]);
		set("indusCode", "");
		const s = splitIndustryValue(value);
		setIndCode4Options(await loadIndustryChildren(s.code, s.header));
	};

	const handleIndCodeL4Change = async (value: string) => {
		setIndCodeSel(prev => ({ ...prev, l4: value, l5: "" }));
		set("indusCode", "");
		const s = splitIndustryValue(value);
		setIndCode5Options(await loadIndustryChildren(s.code, s.header));
	};

	const handleIndCodeL5Change = (value: string) => {
		setIndCodeSel(prev => ({ ...prev, l5: value }));
		set("indusCode", splitIndustryValue(value).code);
	};

	const handleSubmit = useCallback(async () => {
		setSaving(true);
		setErrors({});
		setFormMessage(null);
		try {
			const npwp = npwpParts.join("");
			const { sendSms: _sendSms, ...payload } = d;
			const res = await api.post("/CAM/Customer/corporate-detail", {
				...payload,
				npwp,
				apless: initialApless,
				applno: applNo,
				finType, guarantor, newCar, purpoffinc, contType,
				restructuringChange, goPublic,
				editable: 1,
			});
			if (res.data.success) {
				if (res.data.watchlistWarning) alert(res.data.watchlistWarning);
				onSaved({ apless: res.data.apless, applno: res.data.applno });
			} else if (res.data.blocked) {
				alert(res.data.message);
			} else if (res.data.errors) {
				setErrors(res.data.errors);
			} else {
				setFormMessage(res.data.message || "Failed");
			}
		} catch (err: any) {
			const respData = err?.response?.data;
			if (respData?.errors) {
				setErrors(respData.errors);
			} else if (respData?.message) {
				setFormMessage(respData.message);
			} else {
				setFormMessage("Save failed. Please try again.");
			}
		} finally {
			setSaving(false);
		}
	}, [d, npwpParts, initialApless, applNo, finType, guarantor, newCar, purpoffinc, contType, restructuringChange, goPublic, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleSubmit }), [handleSubmit]);

	if (isLoading || !lookups) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");
	const today = new Date();

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm0 1.5c-3.3 0-6 1.8-6 4v.5a1 1 0 001 1h10a1 1 0 001-1V15.5c0-2.2-2.7-4-6-4z" /></svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Corporate Detail</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>

			<div className="relative grid grid-cols-1 gap-x-10 gap-y-0.5 px-4 py-5 sm:px-6 lg:grid-cols-2 lg:[&>div:first-child]:pr-8 lg:[&>div:last-child]:border-l lg:[&>div:last-child]:border-[var(--app-border)] lg:[&>div:last-child]:pl-8">
				<div className="space-y-0.5">
					<F label={<>Name in Akta * <InfoTooltip text="Merupakan nama debitur sesuai Akta, Akan digunakan di kontrak" /></>} error={errors.lesseeNm}>
						<input className={fRO} value={d.lesseeNm || ""} readOnly />
					</F>
					<F label={<>Customer Name * <InfoTooltip text="Merupakan nama debitur tanpa PT, CV, dsb" /></>} error={errors.idCardName}>
						<input className={fInput} value={d.idCardName || ""} onChange={e => set("idCardName", e.target.value)} />
					</F>
					<F label="Customer Profile *" error={errors.lesseeCat}>
						<select className={fInput} value={d.lesseeCat || ""} onChange={e => handleLesseeCatChange(e.target.value)}>
							<option value="">Select</option>
							{lookups.customerProfiles.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Occupation / Business Type">
						<select className={fInput} value={d.ocuType || ""} disabled={d.lesseeCat === "FD"} onChange={e => set("ocuType", e.target.value)}>
							<option value="">Select</option>
							{businessTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Address in SK. Domisili *" error={errors.address2}>
						<textarea className={fInput} rows={2} value={d.address2 || ""} onChange={e => set("address2", e.target.value)} maxLength={250} />
					</F>
					<F label="Area *" error={errors.areaCd}>
						<select className={fInput} value={d.areaCd || ""} onChange={e => handleAreaChange(e.target.value)}>
							<option value="">Select</option>
							{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Province *">
						<input className={fRO} value={d.province2 || ""} readOnly />
					</F>
					<F label="District / City *" error={errors.city2}>
						<input className={fRO} value={d.city2 || ""} readOnly />
					</F>
					<F label="Kecamatan *">
						<select className={fInput} value={d.kecamatan1 || ""} onChange={e => handleKecamatan1Change(e.target.value)}>
							<option value="">Select</option>
							{kecamatan1Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Kelurahan *">
						<select className={fInput} value={d.kelurahan1 || ""} onChange={e => set("kelurahan1", e.target.value)}>
							<option value="">Select</option>
							{kelurahan1Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="RT / RW">
						<div className="flex items-center gap-2">
							<span className="text-[12.5px] font-medium text-[var(--app-muted)]">RT</span>
							<input className={fInput} style={{ width: "80px" }} inputMode="numeric" maxLength={3} value={d.rt1 || ""} onChange={e => set("rt1", filterDigits(e.target.value).slice(0, 3))} />
							<span className="text-[12.5px] font-medium text-[var(--app-muted)]">RW</span>
							<input className={fInput} style={{ width: "80px" }} inputMode="numeric" maxLength={3} value={d.rw1 || ""} onChange={e => set("rw1", filterDigits(e.target.value).slice(0, 3))} />
						</div>
					</F>
					<F label="Post Code *" error={errors.zipcode2}>
						<input className={fInput} style={{ width: "140px" }} value={d.zipcode2 || ""} inputMode="numeric" onChange={e => set("zipcode2", filterDigits(e.target.value))} maxLength={5} />
					</F>
					<F label="Office Status *" error={errors.addressStatus}>
						<select className={fInput} value={d.addressStatus || ""} onChange={e => set("addressStatus", e.target.value)}>
							<option value="">Select</option>
							{lookups.officeStatuses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Fax">
						<div className="flex items-center gap-2">
							<input className={fInput} style={{ width: "56px" }} placeholder="Code" value={d.faxH || ""} maxLength={3} onChange={e => set("faxH", e.target.value)} />
							<input className={fInput} style={{ width: "56px" }} placeholder="Area" value={d.faxA || ""} maxLength={4} onChange={e => set("faxA", e.target.value)} />
							<input className={fInput} placeholder="Number" value={d.fax1 || ""} maxLength={11} onChange={e => set("fax1", e.target.value)} />
						</div>
					</F>
					<F label="Phone *" error={errors.phone1}>
						<PhoneInput value={d.phone1 || ""} onChange={v => set("phone1", v)} />
					</F>
					<F label="Whatsapp No. *" error={errors.mobilePhone1}>
						<PhoneInput value={d.mobilePhone1 || ""} onChange={v => set("mobilePhone1", v)} />
					</F>
					<F label="Mobile 2">
						<PhoneInput value={d.mobilePhone2 || ""} onChange={v => set("mobilePhone2", v)} />
					</F>
					<F label="Mobile 3">
						<PhoneInput value={d.mobilePhone3 || ""} onChange={v => set("mobilePhone3", v)} />
					</F>
					<F label="Other Phone 1">
						<PhoneInput value={d.otherPhone1 || ""} onChange={v => set("otherPhone1", v)} />
					</F>
					<F label="Other Phone Notes 1">
						<input className={fInput} value={d.otherPhoneNotes1 || ""} onChange={e => set("otherPhoneNotes1", e.target.value)} maxLength={50} />
					</F>
					<F label="Other Phone 2">
						<PhoneInput value={d.otherPhone2 || ""} onChange={v => set("otherPhone2", v)} />
					</F>
					<F label="Other Phone Notes 2">
						<input className={fInput} value={d.otherPhoneNotes2 || ""} onChange={e => set("otherPhoneNotes2", e.target.value)} maxLength={50} />
					</F>
					<F label="Office Email for Correspondence *">
						<input type="email" className={fInput} value={d.email1 || ""} onChange={e => set("email1", e.target.value)} />
					</F>
					<F label="Establishment Place / Date *" error={errors.tglbirth}>
						<div className="flex items-center gap-2">
							<input className={`${fInput} flex-1 min-w-0`} value={d.placebirth || ""} onChange={e => set("placebirth", e.target.value)} placeholder="Place" />
							<span className="text-[13px] text-[var(--app-muted)]">/</span>
							<div className="w-[170px] shrink-0">
								<AsOfDatePickerComponent
									label=""
									format="dd-MM-yyyy"
									placeholder="dd-mm-yyyy"
									maxDate={today}
									value={parseDMY((d.tglbirth || "").trim())}
									onChange={date => setD(f => ({ ...f, tglbirth: formatDMY(date) }))}
								/>
							</div>
						</div>
					</F>
					<F label="Group *">
						<select className={fInput} value={d.grpcode || ""} onChange={e => set("grpcode", e.target.value)}>
							<option value="">Select</option>
							{lookups.groups.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="BI Customer Type">
						<select className={fInput} value={d.custType || ""} onChange={e => set("custType", e.target.value)}>
							<option value="">Select</option>
							{d.custType && !(lookups.biCustomerTypes ?? []).some(o => o.value === d.custType) && (
								<option value={d.custType}>{d.custType}</option>
							)}
							{(lookups.biCustomerTypes ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Industrial Code *">
						<select className={fInput} value={indCodeSel.l0} onChange={e => handleIndCodeL0Change(e.target.value)}>
							<option value="">Select</option>
							{indCodeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="">
						<select className={fInput} value={indCodeSel.l1} disabled={!indCodeSel.l0} onChange={e => handleIndCodeL1Change(e.target.value)}>
							<option value="">Select</option>
							{indCode1Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="">
						<select className={fInput} value={indCodeSel.l2} disabled={!indCodeSel.l1} onChange={e => handleIndCodeL2Change(e.target.value)}>
							<option value="">Select</option>
							{indCode2Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="">
						<select className={fInput} value={indCodeSel.l3} disabled={!indCodeSel.l2} onChange={e => handleIndCodeL3Change(e.target.value)}>
							<option value="">Select</option>
							{indCode3Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="">
						<select className={fInput} value={indCodeSel.l4} disabled={!indCodeSel.l3} onChange={e => handleIndCodeL4Change(e.target.value)}>
							<option value="">Select</option>
							{indCode4Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="" error={errors.indusCode}>
						<select className={fInput} value={indCodeSel.l5} disabled={!indCodeSel.l4} onChange={e => handleIndCodeL5Change(e.target.value)}>
							<option value="">Select</option>
							{indCode5Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
				</div>

				<div className="space-y-0.5">
					<F label="Customer No. *">
						<input className={fRO} value={initialApless} readOnly />
					</F>
					<F label="NPWP *" error={errors.npwp}>
						<div className="flex items-center gap-1.5">
							{[2, 3, 3, 1, 3, 4].map((len, i) => (
								<React.Fragment key={i}>
									<input
										className={`${fInput} px-1.5`}
										style={{ width: `${len * 16 + 24}px`, textAlign: "center" }}
										inputMode="numeric"
										maxLength={len}
										value={npwpParts[i]}
										onChange={e => {
											const next = [...npwpParts];
											next[i] = filterDigits(e.target.value);
											setNpwpParts(next);
										}}
									/>
									{i < 5 && <span className="text-[13px] text-[var(--app-muted)]">{i === 3 ? "-" : "."}</span>}
								</React.Fragment>
							))}
						</div>
					</F>
					<F label="Address in NPWP *">
						<textarea className={fInput} rows={2} value={d.addrNpwp || ""} onChange={e => set("addrNpwp", e.target.value)} maxLength={250} />
					</F>
					<F label="Area *">
						<select className={fInput} value={d.areaCdNpwp || ""} onChange={e => handleAreaNpwpChange(e.target.value)}>
							<option value="">Select</option>
							{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Province *">
						<input className={fRO} value={d.provinceNpwp || ""} readOnly />
					</F>
					<F label="District / City *">
						<input className={fRO} value={d.cityNpwp || ""} readOnly />
					</F>
					<F label="Kecamatan *">
						<select className={fInput} value={d.kecamatanNpwp || ""} onChange={e => handleKecamatanNpwpChange(e.target.value)}>
							<option value="">Select</option>
							{kecamatanNpwpOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Kelurahan *">
						<select className={fInput} value={d.kelurahanNpwp || ""} onChange={e => set("kelurahanNpwp", e.target.value)}>
							<option value="">Select</option>
							{kelurahanNpwpOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Post Code *">
						<input className={fInput} style={{ width: "140px" }} value={d.zipcode2Npwp || ""} inputMode="numeric" onChange={e => set("zipcode2Npwp", filterDigits(e.target.value))} maxLength={5} />
					</F>
					<F label="Form of Business Entity *" error={errors.businessEntity}>
						<select className={fInput} value={d.businessEntity || ""} onChange={e => set("businessEntity", e.target.value)}>
							<option value="">Select</option>
							{lookups.businessEntities.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Line of Business">
						<textarea className={fInput} rows={2} value={d.lob || ""} onChange={e => set("lob", e.target.value)} maxLength={250} />
					</F>
					<F label="SIUP No.">
						<input className={fInput} value={d.siup || ""} onChange={e => set("siup", e.target.value)} />
					</F>
					<F label="Domicile No.">
						<input className={fInput} value={d.domicile || ""} onChange={e => set("domicile", e.target.value)} />
					</F>
					<F label="Number of Employee *">
						<div className="flex items-center gap-2">
							<input className={fInput} style={{ width: "120px" }} value={d.employeeNumber || ""} inputMode="numeric" onChange={e => set("employeeNumber", filterDigits(e.target.value))} maxLength={7} />
							<span className="text-[12.5px] text-[var(--app-muted)]">people (s)</span>
						</div>
					</F>
					<F label="Relationship with Genie *">
						<select className={fInput} value={d.relMlci || "e3"} onChange={e => set("relMlci", e.target.value)}>
							{lookups.relationshipWithCompany.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>

					<SectionBar title="Contact Person" />
					<F label="Name *" error={errors.contact}>
						<input className={fInput} value={d.contact || ""} onChange={e => set("contact", e.target.value)} />
					</F>
					<F label="Position *" error={errors.occupation}>
						<input className={fInput} value={d.occupation || ""} onChange={e => set("occupation", e.target.value)} />
					</F>
					<F label="Address *">
						<textarea className={fInput} rows={2} value={d.address1 || ""} onChange={e => set("address1", e.target.value)} maxLength={250} />
					</F>

					<SectionBar title="Emergency Contact" />
					<F label="Emergency Name *">
						<input className={fInput} value={d.emergencyName || ""} onChange={e => set("emergencyName", e.target.value)} />
					</F>
					<F label="Emergency Address *">
						<textarea className={fInput} rows={2} value={d.emergencyAddress || ""} onChange={e => set("emergencyAddress", e.target.value)} />
					</F>
					<F label="Emergency Phone *">
						<PhoneInput value={d.emergencyPhone || ""} onChange={v => set("emergencyPhone", v)} />
					</F>
					<F label="Emergency Relation *">
						<input className={fInput} value={d.emergencyRelation || ""} onChange={e => set("emergencyRelation", e.target.value)} />
					</F>
				</div>
			</div>

			<p className="px-5 pb-3 text-xs text-red-600 sm:px-6">*) wajib diisi</p>

			{saving && (
				<div className="flex items-center gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-3 text-[13px] font-medium text-[var(--app-muted)] sm:px-6">
					<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />
					Saving…
				</div>
			)}

			{(formMessage || Object.keys(errors).length > 0) && (
				<div className="mx-5 mb-5 rounded-lg border border-red-200 bg-red-50 p-4 sm:mx-6">
					<ul className="list-disc list-inside text-sm text-red-700 space-y-1">
						{formMessage && <li>{formMessage}</li>}
						{Object.entries(errors).map(([key, msg]) => (
							<li key={key}>{msg}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
});

export default CAMCustomerCorporateDetailPage;
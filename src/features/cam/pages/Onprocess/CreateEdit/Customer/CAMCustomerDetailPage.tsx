import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import AsOfDatePickerComponent from '@/shared/components/AsOfDatePickerComponent';

interface Option {
	value: string;
	label: string;
}

interface CustomerDetailData {
	[key: string]: string;
}

interface Lookups {
	customerProfiles: Option[];
	religions: Option[];
	maritalStatuses: Option[];
	countries: Option[];
	groups: Option[];
	biCustomerTypes: Option[];
	relationshipWithCompany: Option[];
	lastEducation: Option[];
	careerField: Option[];
	dependent: Option[];
	marriageAgreement: Option[];
}

export interface CAMCustomerDetailPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	guarantor: string;
	newCar: string;
	purpoffinc: string;
	contType: string;
	restructuringChange: string;
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

function PhoneInput({
	value, onChange, disabled, numeric, after,
}: {
	value: string;
	onChange: (v: string) => void;
	disabled?: boolean;
	numeric?: boolean;
	after?: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-2">
			<div className="group flex flex-1 items-stretch rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm transition-colors duration-150 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/25">
				<span className="inline-flex select-none items-center rounded-l-lg border-r border-[var(--app-border)] bg-[var(--app-surface-alt)] px-2.5 text-[12px] font-medium text-[var(--app-muted)]">+62</span>
				<input
					inputMode={numeric ? "numeric" : undefined}
					className="w-full rounded-r-lg bg-transparent px-3 py-1.5 text-[13px] text-[var(--app-text)] focus:outline-none disabled:cursor-not-allowed disabled:text-[var(--app-muted)]"
					value={value}
					disabled={disabled}
					onChange={e => onChange(numeric ? e.target.value.replace(/\D/g, "") : e.target.value)}
				/>
			</div>
			{after}
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

interface CustomerDetailLoadResult {
	data: CustomerDetailData;
	lookups: Lookups;
	areas: Option[];
	npwpParts: string[];
	sameAsCustomerAddress: boolean | undefined;
	kecamatan1Options: Option[];
	kelurahan1Options: Option[];
	kecamatanNpwpOptions: Option[];
	kelurahanNpwpOptions: Option[];
	kecamatan1zOptions: Option[];
	kelurahan1zOptions: Option[];
	businessTypeOptions: Option[];
	indCodeOptions: Option[];
	indCode1Options: Option[];
	indCode2Options: Option[];
	indCode3Options: Option[];
	indCode4Options: Option[];
	indCode5Options: Option[];
	indCodeSel: IndCodeSel;
}

const CAMCustomerDetailPage = forwardRef<CamTabHandle, CAMCustomerDetailPageProps>(function CAMCustomerDetailPage({
	apless: initialApless, applNo, finType, guarantor, newCar, purpoffinc, contType, restructuringChange, custName, onSaved,
}, ref) {
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [lookups, setLookups] = useState<Lookups | null>(null);
	const [d, setD] = useState<CustomerDetailData>({});

	const [npwpParts, setNpwpParts] = useState(["", "", "", "", "", ""]);
	const [sameAsCustomerAddress, setSameAsCustomerAddress] = useState(true);

	const [areas, setAreas] = useState<Option[]>([]);
	const [kecamatan1Options, setKecamatan1Options] = useState<Option[]>([]);
	const [kelurahan1Options, setKelurahan1Options] = useState<Option[]>([]);
	const [kecamatanNpwpOptions, setKecamatanNpwpOptions] = useState<Option[]>([]);
	const [kelurahanNpwpOptions, setKelurahanNpwpOptions] = useState<Option[]>([]);
	const [kecamatan1zOptions, setKecamatan1zOptions] = useState<Option[]>([]);
	const [kelurahan1zOptions, setKelurahan1zOptions] = useState<Option[]>([]);
	const [businessTypeOptions, setBusinessTypeOptions] = useState<Option[]>([]);

	const [indCodeOptions, setIndCodeOptions] = useState<Option[]>([]);
	const [indCode1Options, setIndCode1Options] = useState<Option[]>([]);
	const [indCode2Options, setIndCode2Options] = useState<Option[]>([]);
	const [indCode3Options, setIndCode3Options] = useState<Option[]>([]);
	const [indCode4Options, setIndCode4Options] = useState<Option[]>([]);
	const [indCode5Options, setIndCode5Options] = useState<Option[]>([]);
	const [indCodeSel, setIndCodeSel] = useState<IndCodeSel>({ l0: "", l1: "", l2: "", l3: "", l4: "", l5: "" });

	const today = new Date();

	const maxAllowedDate = new Date(today);
	maxAllowedDate.setFullYear(today.getFullYear() + 5);
	const minBirthDate = new Date(1900, 0, 1);

	const set = (key: string, value: string) => setD(prev => ({ ...prev, [key]: value }));

	const loadIndustryTop = useCallback(async (): Promise<Option[]> => {
		const r = await api.get("/CAM/Combo/industry-codes", { params: { level: 1 } });
		return r.data;
	}, []);

	const loadIndustryChildren = useCallback(async (codeCandidate: string, headerCandidate: string): Promise<Option[]> => {
		if (codeCandidate) {
			const r = await api.get("/CAM/Combo/industry-codes", {
				params: { level: 2, parent: codeCandidate, header: headerCandidate },
			});
			return r.data;
		}
		if (headerCandidate) {
			const r = await api.get("/CAM/Combo/industry-codes", { params: { level: 2, parent: headerCandidate } });
			return r.data;
		}
		return [];
	}, []);

	const { data: loadResult, isLoading } = useQuery({
		queryKey: ['cam-customer-detail', initialApless],
		queryFn: async (): Promise<CustomerDetailLoadResult> => {
			const [detailRes, areasRes] = await Promise.all([
				api.get("/CAM/Customer/detail", { params: { apless: initialApless } }),
				api.get("/CAM/Combo/provinces-and-cities"),
			]);

			const data: CustomerDetailData = detailRes.data.data;
			const lookupsResult: Lookups = detailRes.data.lookups;
			const areasResult: Option[] = areasRes.data;

			const npwp = (data.npwp || "").padEnd(16, " ");
			const npwpParts6 = [
				npwp.slice(0, 2).trim(), npwp.slice(2, 5).trim(), npwp.slice(5, 8).trim(),
				npwp.slice(8, 9).trim(), npwp.slice(9, 12).trim(), npwp.slice(12, 16).trim(),
			];

			let sameAsCustomerAddressResult: boolean | undefined;
			if (data.address1 && data.grnSpouseAdd) {
				sameAsCustomerAddressResult = data.address1 === data.grnSpouseAdd;
			}

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
			let kecamatan1zOptionsResult: Option[] = [];
			if (data.areaCdz) {
				const r = await api.get("/CAM/Combo/kecamatan", { params: { areaCd: data.areaCdz } });
				kecamatan1zOptionsResult = r.data;
			}
			let kelurahan1zOptionsResult: Option[] = [];
			if (data.kecamatan1z) {
				const r = await api.get("/CAM/Combo/kelurahan", { params: { kecamatanCd: data.kecamatan1z } });
				kelurahan1zOptionsResult = r.data;
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
				sameAsCustomerAddress: sameAsCustomerAddressResult,
				kecamatan1Options: kecamatan1OptionsResult,
				kelurahan1Options: kelurahan1OptionsResult,
				kecamatanNpwpOptions: kecamatanNpwpOptionsResult,
				kelurahanNpwpOptions: kelurahanNpwpOptionsResult,
				kecamatan1zOptions: kecamatan1zOptionsResult,
				kelurahan1zOptions: kelurahan1zOptionsResult,
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
		if (loadResult.sameAsCustomerAddress !== undefined) {
			setSameAsCustomerAddress(loadResult.sameAsCustomerAddress);
		}
		setKecamatan1Options(loadResult.kecamatan1Options);
		setKelurahan1Options(loadResult.kelurahan1Options);
		setKecamatanNpwpOptions(loadResult.kecamatanNpwpOptions);
		setKelurahanNpwpOptions(loadResult.kelurahanNpwpOptions);
		setKecamatan1zOptions(loadResult.kecamatan1zOptions);
		setKelurahan1zOptions(loadResult.kelurahan1zOptions);
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
			set("province1", pc.data.province || "");
			set("city1", pc.data.city || "");
		} else {
			set("province1", "");
			set("city1", "");
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
	};

	const handleAreazChange = async (value: string) => {
		set("areaCdz", value);
		if (value) {
			const pc = await api.get("/CAM/Combo/province-city", { params: { areaCd: value } });
			set("province1z", pc.data.province || "");
			set("city1z", pc.data.city || "");
		} else {
			set("province1z", "");
			set("city1z", "");
		}
		const r = await api.get("/CAM/Combo/kecamatan", { params: { areaCd: value } });
		setKecamatan1zOptions(r.data);
		setKelurahan1zOptions([]);
	};

	const handleLesseeCatChange = async (value: string) => {
		set("lesseeCat", value);
		const r = await api.get("/CAM/Combo/business-type-detail", { params: { custType: value } });
		setBusinessTypeOptions(r.data);
		set("ocuType", "");
	};

	const handleSameAddressToggle = (same: boolean) => {
		setSameAsCustomerAddress(same);
		if (same) {
			set("grnSpouseAdd", d.address1 || "");
			set("areaCdz", d.areaCd || "");
			set("province1z", d.province1 || "");
			set("city1z", d.city1 || "");
			set("kecamatan1z", d.kecamatan1 || "");
			set("kelurahan1z", d.kelurahan1 || "");
			set("rt1z", d.rt1 || "");
			set("rw1z", d.rw1 || "");
			set("zipcode1z", d.zipcode1 || "");
			setKecamatan1zOptions(kecamatan1Options);
			setKelurahan1zOptions(kelurahan1Options);
		} else {
			set("grnSpouseAdd", "");
			set("areaCdz", "");
			set("province1z", "");
			set("city1z", "");
			set("kecamatan1z", "");
			set("kelurahan1z", "");
			set("rt1z", "");
			set("rw1z", "");
			set("zipcode1z", "");
		}
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

	const requiresSpouseFields = d.marital === "M" || d.marital === "O";

	const handleSubmit = useCallback(async () => {
		setSaving(true);
		setErrors({});
		try {
			const npwp = npwpParts.join("");
			const res = await api.post("/CAM/Customer/detail", {
				...d,
				npwp,
				apless: initialApless,
				applno: applNo,
				finType, guarantor, newCar, purpoffinc, contType,
				restructuringChange,
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
				alert(res.data.message || "Failed");
			}
		} catch {
			alert("Save failed. Please try again.");
		} finally {
			setSaving(false);
		}
	}, [d, npwpParts, initialApless, applNo, finType, guarantor, newCar, purpoffinc, contType, restructuringChange, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleSubmit }), [handleSubmit]);

	if (isLoading || !lookups) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	const spouseDisabled = !requiresSpouseFields;
	const spouseAddrDisabled = spouseDisabled || sameAsCustomerAddress;

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm0 1.5c-3.3 0-6 1.8-6 4v.5a1 1 0 001 1h10a1 1 0 001-1V15.5c0-2.2-2.7-4-6-4z" /></svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Detail Information</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>

			<div className="relative grid grid-cols-1 gap-x-10 gap-y-0.5 px-4 py-5 sm:px-6 lg:grid-cols-2 lg:[&>div:first-child]:pr-8 lg:[&>div:last-child]:border-l lg:[&>div:last-child]:border-[var(--app-border)] lg:[&>div:last-child]:pl-8">
				<div className="space-y-0.5">
					<F label={<>Name in ID Card * <InfoTooltip text="Merupakan nama debitur sesuai KTP, Akan digunakan di kontrak" /></>}>
						<input className={fRO} value={d.lesseeNm || ""} readOnly />
					</F>
					<F label={<>Customer Name Without Title * <InfoTooltip text="Merupakan nama lengkap debitur tanpa gelar akademik, keagamaan, adat, dsb" /></>} error={errors.idCardName}>
						<input className={fInput} value={d.idCardName || ""} onChange={e => set("idCardName", e.target.value)} />
					</F>
					<F label="Alias Name">
						<input className={fInput} value={d.aliasName || ""} onChange={e => set("aliasName", e.target.value)} />
					</F>
					<F label="Customer Profile *" error={errors.lesseeCat}>
						<select className={fInput} value={d.lesseeCat || ""} onChange={e => handleLesseeCatChange(e.target.value)}>
							<option value="">Select</option>
							{lookups.customerProfiles.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Occupation/ Business Type">
						<select className={fInput} value={d.ocuType || ""} disabled={d.lesseeCat === "PF"} onChange={e => set("ocuType", e.target.value)}>
							<option value="">Select</option>
							{businessTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Address in ID Card *" error={errors.address1}>
						<textarea className={fInput} rows={2} value={d.address1 || ""} onChange={e => set("address1", e.target.value)} />
					</F>
					<F label="Area *" error={errors.areaCd}>
						<select className={fInput} value={d.areaCd || ""} onChange={e => handleAreaChange(e.target.value)}>
							<option value="">Select</option>
							{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Province *">
						<input className={fRO} value={d.province1 || ""} readOnly />
					</F>
					<F label="District/ City *" error={errors.city1}>
						<input className={fRO} value={d.city1 || ""} readOnly />
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
					<F label="">
						<div className="flex items-center gap-2">
							<span className="text-[12.5px] font-medium text-[var(--app-muted)]">RT <span className="text-red-400">*</span></span>
							<input className={fInput} style={{ width: "80px" }} inputMode="numeric" maxLength={3} value={d.rt1 || ""} onChange={e => set("rt1", e.target.value.replace(/\D/g, "").slice(0, 3))} />
							<span className="text-[12.5px] font-medium text-[var(--app-muted)]">RW <span className="text-red-400">*</span></span>
							<input className={fInput} style={{ width: "80px" }} inputMode="numeric" maxLength={3} value={d.rw1 || ""} onChange={e => set("rw1", e.target.value.replace(/\D/g, "").slice(0, 3))} />
						</div>
					</F>
					<F label="Post Code *" error={errors.zipcode1}>
						<input className={fInput} style={{ width: "140px" }} value={d.zipcode1 || ""} onChange={e => set("zipcode1", e.target.value)} maxLength={5} />
					</F>
					<F label="Fax">
						<div className="flex items-center gap-2">
							<input className={fInput} style={{ width: "56px" }} value={d.faxH || ""} maxLength={3} onChange={e => set("faxH", e.target.value)} />
							<input className={fInput} style={{ width: "56px" }} value={d.faxA || ""} maxLength={4} onChange={e => set("faxA", e.target.value)} />
							<input className={fInput} value={d.fax1 || ""} maxLength={11} onChange={e => set("fax1", e.target.value)} />
						</div>
					</F>
					<F label="Live here since (year) *" error={errors.yearLive}>
						<input className={fInput} style={{ width: "100px" }} value={d.yearLive || ""} onChange={e => set("yearLive", e.target.value)} maxLength={4} />
					</F>
					<F label="Phone *" error={errors.phone2}>
						<PhoneInput value={d.phone2 || ""} numeric onChange={v => set("phone2", v)} />
					</F>
					<F label="Whatsapp No. *" error={errors.mobilePhone1}>
						<PhoneInput value={d.mobilePhone1 || ""} onChange={v => set("mobilePhone1", v)} />
					</F>
					<F label="Mobile 2">
						<PhoneInput value={d.mobilePhone2 || ""} numeric onChange={v => set("mobilePhone2", v)} />
					</F>
					<F label="Mobile 3">
						<PhoneInput value={d.mobilePhone3 || ""} numeric onChange={v => set("mobilePhone3", v)} />
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
					<F label="Email 1 *" error={errors.email1}>
						<input type="email" className={fInput} value={d.email1 || ""} onChange={e => set("email1", e.target.value)} />
					</F>
					<F label="Email 2">
						<input type="email" className={fInput} value={d.email2 || ""} onChange={e => set("email2", e.target.value)} />
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
							{lookups.biCustomerTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Industrial Code *" error={errors.indusCode}>
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
					<F label="">
						<select className={fInput} value={indCodeSel.l5} disabled={!indCodeSel.l4} onChange={e => handleIndCodeL5Change(e.target.value)}>
							<option value="">Select</option>
							{indCode5Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
				</div>

				<div className="space-y-0.5">
					<F label="Customer No. *">
						<input className={fRO} value={d.custNo || ""} readOnly />
					</F>
					<F label="Place/ Date of Birth *" error={errors.tglbirth}>
						<div className="flex items-center gap-2">
							<input className={`${fInput} flex-1 min-w-0`} value={d.placebirth || ""} onChange={e => set("placebirth", e.target.value)} placeholder="Place" />
							<span className="text-[13px] text-[var(--app-muted)]">/</span>
							<div className="w-[170px] shrink-0">
								<AsOfDatePickerComponent
									label=""
									format="dd-MM-yyyy"
									placeholder="dd-mm-yyyy"
									minDate={minBirthDate}
									maxDate={today}
									value={parseDMY((d.tglbirth || "").trim())}
									onChange={date => setD(f => ({ ...f, tglbirth: formatDMY(date) }))}
								/>
							</div>
						</div>
					</F>
					<F label="Gender *" error={errors.gender}>
						<select className={fInput} value={d.gender || ""} onChange={e => set("gender", e.target.value)}>
							<option value="">Select</option>
							<option value="M">Male</option>
							<option value="F">Female</option>
						</select>
					</F>
					<F label="Religion *" error={errors.religion}>
						<select className={fInput} value={d.religion || ""} onChange={e => set("religion", e.target.value)}>
							<option value="">Select</option>
							{lookups.religions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Last Education *" error={errors.lEdu}>
						<select className={fInput} value={d.lEdu || ""} onChange={e => set("lEdu", e.target.value)}>
							<option value="">Select</option>
							{lookups.lastEducation.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Career Field *" error={errors.career}>
						<select className={fInput} value={d.career || ""} onChange={e => set("career", e.target.value)}>
							<option value="">Select</option>
							{lookups.careerField.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
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
											next[i] = e.target.value.replace(/\D/g, "");
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
					<F label="District/ City *">
						<input className={fRO} value={d.cityNpwp || ""} readOnly />
					</F>
					<F label="Kecamatan *">
						<select className={fInput} value={d.kecamatanNpwp || ""} onChange={async e => {
							set("kecamatanNpwp", e.target.value);
							const r = await api.get("/CAM/Combo/kelurahan", { params: { kecamatanCd: e.target.value } });
							setKelurahanNpwpOptions(r.data);
							set("kelurahanNpwp", "");
						}}>
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
						<input className={fInput} style={{ width: "140px" }} value={d.zipcode2Npwp || ""} onChange={e => set("zipcode2Npwp", e.target.value)} maxLength={5} />
					</F>
					<F label="Citizenship *" error={errors.citizen1 || errors.nationality}>
						<div className="flex items-center gap-2">
							<select className={fInput} style={{ width: "110px" }} value={d.citizen1 || ""} onChange={e => set("citizen1", e.target.value)}>
								<option value="">Select</option>
								<option value="WNI">WNI</option>
								<option value="WNA">WNA</option>
							</select>
							<select
								className={fInput}
								value={d.citizen1 === "WNI" ? "ID" : (d.nationality || "")}
								disabled={d.citizen1 !== "WNA"}
								onChange={e => set("nationality", e.target.value)}
							>
								<option value="">Nationality</option>
								{lookups.countries.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</div>
					</F>
					<F label="ID Card No. *" error={errors.idCard}>
						<input className={fRO} value={d.idCard || ""} readOnly />
					</F>
					<F label="Validity ID Card *">
						<div className="flex items-center gap-2">
							<select
								className={fInput}
								style={{ width: "150px" }}
								value={d.idCardValid ? "0" : "1"}
								onChange={e => { if (e.target.value === "1") set("idCardValid", ""); else set("idCardValid", d.idCardValid || " "); }}
							>
								<option value="1">No Expire Date</option>
								<option value="0">Certain Period</option>
							</select>
							<AsOfDatePickerComponent
								label=""
								format="dd-MM-yyyy"
								placeholder="dd-mm-yyyy"
								minDate={today}
								maxDate={maxAllowedDate}
								disabled={!d.idCardValid}
								value={parseDMY((d.idCardValid || "").trim())}
								onChange={date => setD(f => ({ ...f, idCardValid: formatDMY(date) }))}
							/>
						</div>
					</F>
					<F label="Passport No.">
						<input className={fInput} value={d.passNo || ""} disabled={d.citizen1 !== "WNA"} onChange={e => set("passNo", e.target.value)} />
					</F>
					<F label="Family Card No. *" error={errors.famCard}>
						<input className={fInput} value={d.famCard || ""} onChange={e => set("famCard", e.target.value)} />
					</F>
					<F label={<>Mother's Maiden Name (Without Title) * <InfoTooltip text="Merupakan nama lengkap tanpa gelar akademik, keagamaan, adat, dsb" /></>} error={errors.mother}>
						<input className={fInput} value={d.mother || ""} onChange={e => set("mother", e.target.value)} />
					</F>
					<F label="Marital Status *" error={errors.marital}>
						<select className={fInput} value={d.marital || ""} onChange={e => set("marital", e.target.value)}>
							<option value="">Select</option>
							{lookups.maritalStatuses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>

					<SectionBar title="Spouse Information" />
					<F label={<>Spouse Name in ID Card * <InfoTooltip text="Merupakan nama pasangan sesuai KTP; Akan digunakan di kontrak" /></>}>
						<input className={fInput} value={d.spouse || ""} disabled={spouseDisabled} onChange={e => set("spouse", e.target.value)} />
					</F>
					<F label={<>Spouse Name Without Title * <InfoTooltip text="Merupakan nama lengkap pasangan tanpa gelar akademik, keagamaan, adat, dsb" /></>}>
						<input className={fInput} value={d.spouseWt || ""} disabled={spouseDisabled} onChange={e => set("spouseWt", e.target.value)} />
					</F>
					<F label="Spouse Address in ID Card *">
						<div className="flex flex-col gap-1 mb-1">
							<label className="flex items-center gap-2 text-[12.5px] text-[var(--app-text)]">
								<input type="radio" className="h-3.5 w-3.5 accent-blue-500" checked={sameAsCustomerAddress} disabled={spouseDisabled} onChange={() => handleSameAddressToggle(true)} />
								Same with Customer`s Address in ID Card
							</label>
							<label className="flex items-center gap-2 text-[12.5px] text-[var(--app-text)]">
								<input type="radio" className="h-3.5 w-3.5 accent-blue-500" checked={!sameAsCustomerAddress} disabled={spouseDisabled} onChange={() => handleSameAddressToggle(false)} />
								Different with Customer`s Address in ID Card
							</label>
						</div>
						<textarea className={fInput} rows={2} value={d.grnSpouseAdd || ""} disabled={spouseAddrDisabled} onChange={e => set("grnSpouseAdd", e.target.value)} />
					</F>
					<F label="Area *">
						<select className={fInput} value={d.areaCdz || ""} disabled={spouseAddrDisabled} onChange={e => handleAreazChange(e.target.value)}>
							<option value="">Select</option>
							{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Province *">
						<input className={fRO} value={d.province1z || ""} readOnly />
					</F>
					<F label="District / City *">
						<input className={fRO} value={d.city1z || ""} readOnly />
					</F>
					<F label="Kecamatan *">
						<select className={fInput} value={d.kecamatan1z || ""} disabled={spouseAddrDisabled} onChange={async e => {
							set("kecamatan1z", e.target.value);
							const r = await api.get("/CAM/Combo/kelurahan", { params: { kecamatanCd: e.target.value } });
							setKelurahan1zOptions(r.data);
							set("kelurahan1z", "");
						}}>
							<option value="">Select</option>
							{kecamatan1zOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Kelurahan *">
						<select className={fInput} value={d.kelurahan1z || ""} disabled={spouseAddrDisabled} onChange={e => set("kelurahan1z", e.target.value)}>
							<option value="">Select</option>
							{kelurahan1zOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="">
						<div className="flex items-center gap-2">
							<span className="text-[12.5px] font-medium text-[var(--app-muted)]">RT <span className="text-red-400">*</span></span>
							<input className={fInput} style={{ width: "80px" }} inputMode="numeric" maxLength={3} value={d.rt1z || ""} disabled={spouseAddrDisabled} onChange={e => set("rt1z", e.target.value.replace(/\D/g, "").slice(0, 3))} />
							<span className="text-[12.5px] font-medium text-[var(--app-muted)]">RW <span className="text-red-400">*</span></span>
							<input className={fInput} style={{ width: "80px" }} inputMode="numeric" maxLength={3} value={d.rw1z || ""} disabled={spouseAddrDisabled} onChange={e => set("rw1z", e.target.value.replace(/\D/g, "").slice(0, 3))} />
						</div>
					</F>
					<F label="Post Code *">
						<input className={fInput} style={{ width: "140px" }} value={d.zipcode1z || ""} disabled={spouseAddrDisabled} onChange={e => set("zipcode1z", e.target.value)} maxLength={5} />
					</F>
					<F label="Spouse Mobile Phone No. *">
						<PhoneInput value={d.spouseMobilePhone || ""} disabled={spouseDisabled} onChange={v => set("spouseMobilePhone", v)} />
					</F>
					<F label="Spouse Email *">
						<input type="email" className={fInput} value={d.spouseEmail || ""} disabled={spouseDisabled} onChange={e => set("spouseEmail", e.target.value)} />
					</F>
					<F label="Place/ Date of Birth *">
						<div className="flex items-center gap-2">
							<input className={`${fInput} flex-1 min-w-0`} value={d.placebirth2 || ""} disabled={spouseDisabled} onChange={e => set("placebirth2", e.target.value)} placeholder="Place" />
							<span className="text-[13px] text-[var(--app-muted)]">/</span>
							<div className="w-[170px] shrink-0">
								<AsOfDatePickerComponent
									label=""
									format="dd-MM-yyyy"
									placeholder="dd-mm-yyyy"
									minDate={minBirthDate}
									maxDate={today}
									disabled={spouseDisabled}
									value={parseDMY((d.tglbirth2 || "").trim())}
									onChange={date => setD(f => ({ ...f, tglbirth2: formatDMY(date) }))}
								/>
							</div>
						</div>
					</F>
					<F label="Citizenship *">
						<div className="flex items-center gap-2">
							<select className={fInput} style={{ width: "110px" }} value={d.citizen2 || ""} disabled={spouseDisabled} onChange={e => set("citizen2", e.target.value)}>
								<option value="">Select</option>
								<option value="WNI">WNI</option>
								<option value="WNA">WNA</option>
							</select>
							<select
								className={fInput}
								value={d.citizen2 === "WNI" ? "ID" : (d.nationality2 || "")}
								disabled={spouseDisabled || d.citizen2 !== "WNA"}
								onChange={e => set("nationality2", e.target.value)}
							>
								<option value="">Nationality</option>
								{lookups.countries.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</div>
					</F>
					<F label="ID Card No. *">
						<input className={fInput} value={d.idCard2 || ""} disabled={spouseDisabled} onChange={e => set("idCard2", e.target.value)} />
					</F>
					<F label="Validity ID Card *">
						<div className="flex items-center gap-2">
							<select
								className={fInput}
								style={{ width: "150px" }}
								value={d.idCardValid2 ? "0" : "1"}
								disabled={spouseDisabled}
								onChange={e => { if (e.target.value === "1") set("idCardValid2", ""); else set("idCardValid2", d.idCardValid2 || " "); }}
							>
								<option value="1">No Expire Date</option>
								<option value="0">Certain Period</option>
							</select>
							<AsOfDatePickerComponent
								label=""
								format="dd-MM-yyyy"
								placeholder="dd-mm-yyyy"
								minDate={today}
								maxDate={maxAllowedDate}
								disabled={spouseDisabled || !d.idCardValid2}
								value={parseDMY((d.idCardValid2 || "").trim())}
								onChange={date => setD(f => ({ ...f, idCardValid2: formatDMY(date) }))}
							/>
						</div>
					</F>
					<F label="Passport No. *">
						<input className={fInput} value={d.sPass || ""} disabled={spouseDisabled || d.citizen2 === "WNI"} onChange={e => set("sPass", e.target.value)} />
					</F>
					<F label="Marriage Agreement *">
						<select className={fInput} value={d.mAgree || ""} disabled={spouseDisabled} onChange={e => set("mAgree", e.target.value)}>
							<option value="">Select</option>
							{lookups.marriageAgreement.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
					</F>
					<F label="Total of Dependent">
						<div className="flex items-center gap-2">
							<select className={fInput} style={{ width: "90px" }} value={d.dependent || ""} onChange={e => set("dependent", e.target.value)}>
								<option value="">0</option>
								{lookups.dependent.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
							<span className="text-[12.5px] text-[var(--app-muted)]">person(s)</span>
						</div>
					</F>
					<F label="Relationship with Company *">
						<select className={fInput} value={d.relMlci || "e3"} onChange={e => set("relMlci", e.target.value)}>
							{lookups.relationshipWithCompany.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
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

			{saving && (
				<div className="flex items-center gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-3 text-[13px] font-medium text-[var(--app-muted)] sm:px-6">
					<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />
					Saving…
				</div>
			)}
		</div>
	);
});

export default CAMCustomerDetailPage;
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

const cellLabel =
	"border-b border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 py-2.5 align-top text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] whitespace-nowrap";
const cellValue = "border-b border-[var(--app-border)] px-4 py-2.5 align-top text-sm text-[var(--app-text)]";
const cellEmpty = "border-b border-[var(--app-border)] px-4 py-2.5";
const subheadCell =
	"border-b border-[var(--app-border)] bg-indigo-50/70 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-600";

function Row({
	left,
	right,
	rightHeader,
}: {
	left?: [React.ReactNode, React.ReactNode];
	right?: [React.ReactNode, React.ReactNode];
	rightHeader?: string;
}) {
	return (
		<tr>
			{left ? (
				<>
					<td className={cellLabel}>{left[0]}</td>
					<td className={cellValue}>{left[1]}</td>
				</>
			) : (
				<>
					<td className={cellEmpty}></td>
					<td className={cellEmpty}></td>
				</>
			)}
			{rightHeader ? (
				<td colSpan={2} className={subheadCell}>{rightHeader}</td>
			) : right ? (
				<>
					<td className={cellLabel}>{right[0]}</td>
					<td className={cellValue}>{right[1]}</td>
				</>
			) : (
				<>
					<td className={cellEmpty}></td>
					<td className={cellEmpty}></td>
				</>
			)}
		</tr>
	);
}

function FullRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
	return (
		<tr>
			<td className={cellLabel}>{label}</td>
			<td colSpan={3} className={cellValue}>{children}</td>
		</tr>
	);
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

const inputCls =
	"border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400";
const errCls = "text-red-600 text-xs mt-1";

const parseISODate = (value: string): Date | null => {
	if (!value) return null;
	const [y, m, d] = value.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d);
};

const toISODate = (value: Date | null): string => {
	if (!value) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
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

	const selectCls = (editable: boolean) =>
		`border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${editable ? "bg-[var(--app-card)]" : "bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed"
		}`;

	if (isLoading || !lookups) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			{judul && (
				<div className="judul border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-right text-xs font-semibold text-blue-400 sm:px-6">
					{judul}
				</div>
			)}
			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<h2 className="text-xl font-bold text-[var(--app-text)]">Customer Detail</h2>
				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[820px] border-collapse text-sm">
							<tbody>
								<Row
									left={[<>Name in ID Card * <InfoTooltip text="Merupakan nama debitur sesuai KTP, Akan digunakan di kontrak" /></>, (
										<>
											<input className={inputCls} value={d.lesseeNm || ""} readOnly />
											{errors.lesseeNm && <p className={errCls}>{errors.lesseeNm}</p>}
										</>
									)]}
									right={["Alias Name", (
										<input className={inputCls} value={d.aliasName || ""} onChange={e => set("aliasName", e.target.value)} />
									)]}
								/>
								<Row
									left={[<>Customer Name Without Title * <InfoTooltip text="Merupakan nama lengkap debitur tanpa gelar akademik, keagamaan, adat, dsb" /></>, (
										<>
											<input className={inputCls} value={d.idCardName || ""} onChange={e => set("idCardName", e.target.value)} />
											{errors.idCardName && <p className={errCls}>{errors.idCardName}</p>}
										</>
									)]}
									right={["Customer Profile *", (
										<>
											<select className={selectCls(true)} value={d.lesseeCat || ""} onChange={e => handleLesseeCatChange(e.target.value)}>
												<option value="">Select</option>
												{lookups.customerProfiles.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											{errors.lesseeCat && <p className={errCls}>{errors.lesseeCat}</p>}
										</>

									)]}
								/>
								<Row
									left={["Gender *", (
										<>
											<select className={selectCls(true)} value={d.gender || ""} onChange={e => set("gender", e.target.value)}>
												<option value="">Select</option>
												<option value="M">Male</option>
												<option value="F">Female</option>
											</select>
											{errors.gender && <p className={errCls}>{errors.gender}</p>}
										</>
									)]}
									right={["Religion *", (
										<>
											<select className={selectCls(true)} value={d.religion || ""} onChange={e => set("religion", e.target.value)}>
												<option value="">Select</option>
												{lookups.religions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											{errors.religion && <p className={errCls}>{errors.religion}</p>}
										</>
									)]}
								/>
								<Row
									left={["Occupation / Business Type", (
										<select className={selectCls(d.lesseeCat !== "PF")} value={d.ocuType || ""} disabled={d.lesseeCat === "PF"} onChange={e => set("ocuType", e.target.value)}>
											<option value="">Select</option>
											{businessTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Place / Date of Birth *", (
										<>
											<div className="flex gap-2">
												<input className={inputCls} value={d.placebirth || ""} onChange={e => set("placebirth", e.target.value)} placeholder="Place" />
												<input className={inputCls} value={d.tglbirth || ""} onChange={e => set("tglbirth", e.target.value)} placeholder="dd-mm-yyyy" />
											</div>
											{errors.tglbirth && <p className={errCls}>{errors.tglbirth}</p>}
										</>
									)]}
								/>

								<tr>
									<td colSpan={4} className={subheadCell}>Industrial Classification</td>
								</tr>
								<Row
									left={["Industry Sector *", (
										<select className={selectCls(true)} value={indCodeSel.l0} onChange={e => handleIndCodeL0Change(e.target.value)}>
											<option value="">Select</option>
											{indCodeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Industry Sub-sector *", (
										<select className={selectCls(!!indCodeSel.l0)} value={indCodeSel.l1} disabled={!indCodeSel.l0} onChange={e => handleIndCodeL1Change(e.target.value)}>
											<option value="">Select</option>
											{indCode1Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["Industry Group *", (
										<select className={selectCls(!!indCodeSel.l1)} value={indCodeSel.l2} disabled={!indCodeSel.l1} onChange={e => handleIndCodeL2Change(e.target.value)}>
											<option value="">Select</option>
											{indCode2Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Industry Class *", (
										<select className={selectCls(!!indCodeSel.l2)} value={indCodeSel.l3} disabled={!indCodeSel.l2} onChange={e => handleIndCodeL3Change(e.target.value)}>
											<option value="">Select</option>
											{indCode3Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["Industry Sub-class *", (
										<select className={selectCls(!!indCodeSel.l3)} value={indCodeSel.l4} disabled={!indCodeSel.l3} onChange={e => handleIndCodeL4Change(e.target.value)}>
											<option value="">Select</option>
											{indCode4Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Industry Code *", (
										<>
											<select className={selectCls(!!indCodeSel.l4)} value={indCodeSel.l5} disabled={!indCodeSel.l4} onChange={e => handleIndCodeL5Change(e.target.value)}>
												<option value="">Select</option>
												{indCode5Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											{errors.indusCode && <p className={errCls}>{errors.indusCode}</p>}
										</>
									)]}
								/>

								<tr>
									<td colSpan={4} className={subheadCell}>Address in ID Card</td>
								</tr>
								<FullRow label="Address in ID Card *">
									<textarea className={inputCls} value={d.address1 || ""} onChange={e => set("address1", e.target.value)} />
									{errors.address1 && <p className={errCls}>{errors.address1}</p>}
								</FullRow>
								<Row
									left={["Area *", (
										<>
											<select className={selectCls(true)} value={d.areaCd || ""} onChange={e => handleAreaChange(e.target.value)}>
												<option value="">Select</option>
												{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											{errors.areaCd && <p className={errCls}>{errors.areaCd}</p>}
										</>
									)]}
									right={["Province *", (
										<input className={inputCls} value={d.province1 || ""} readOnly />
									)]}
								/>
								<Row
									left={["District / City *", (
										<>
											<input className={inputCls} value={d.city1 || ""} readOnly />
											{errors.city1 && <p className={errCls}>{errors.city1}</p>}
										</>
									)]}
									right={["Kecamatan *", (
										<select className={selectCls(true)} value={d.kecamatan1 || ""} onChange={e => handleKecamatan1Change(e.target.value)}>
											<option value="">Select</option>
											{kecamatan1Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["Kelurahan *", (
										<select className={selectCls(true)} value={d.kelurahan1 || ""} onChange={e => set("kelurahan1", e.target.value)}>
											<option value="">Select</option>
											{kelurahan1Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["RT / RW *", (
										<div className="flex gap-2">
											<input className={inputCls} value={d.rt1 || ""} onChange={e => set("rt1", e.target.value)} placeholder="RT" />
											<input className={inputCls} value={d.rw1 || ""} onChange={e => set("rw1", e.target.value)} placeholder="RW" />
										</div>
									)]}
								/>
								<Row
									left={["Post Code *", (
										<>
											<input className={inputCls} value={d.zipcode1 || ""} onChange={e => set("zipcode1", e.target.value)} maxLength={5} />
											{errors.zipcode1 && <p className={errCls}>{errors.zipcode1}</p>}
										</>
									)]}
									right={["Live here since (year) *", (
										<>
											<input className={inputCls} value={d.yearLive || ""} onChange={e => set("yearLive", e.target.value)} maxLength={4} />
											{errors.yearLive && <p className={errCls}>{errors.yearLive}</p>}
										</>
									)]}
								/>

								<tr>
									<td colSpan={4} className={subheadCell}>Identity</td>
								</tr>
								<Row
									left={["ID Card No. *", (
										<>
											<input className={selectCls(true)} value={d.idCard || ""} readOnly />
											{errors.idCard && <p className={errCls}>{errors.idCard}</p>}
										</>
									)]}
									right={["Citizenship *", (
										<>
											<div className="flex gap-2">
												<select className={selectCls(true)} value={d.citizen1 || ""} onChange={e => set("citizen1", e.target.value)}>
													<option value="">Select</option>
													<option value="WNI">WNI</option>
													<option value="WNA">WNA</option>
												</select>
												<select
													className={selectCls(true)}
													value={d.citizen1 === "WNI" ? "ID" : (d.nationality || "")}
													disabled={d.citizen1 !== "WNA"}
													onChange={e => set("nationality", e.target.value)}
												>
													<option value="">Nationality</option>
													{lookups.countries.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
												</select>
											</div>
											{errors.citizen1 && <p className={errCls}>{errors.citizen1}</p>}
											{errors.nationality && <p className={errCls}>{errors.nationality}</p>}
										</>
									)]}
								/>
								<Row
									left={["Validity ID Card *", (
										<div className="flex gap-2">
											<select
												className={selectCls(true)}
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
												value={parseISODate((d.idCardValid || "").trim())}
												onChange={date => setD(f => ({ ...f, idCardValid: toISODate(date) }))}
											/>
										</div>
									)]}
									right={["Family Card No. *", (
										<>
											<input className={inputCls} value={d.famCard || ""} onChange={e => set("famCard", e.target.value)} />
											{errors.famCard && <p className={errCls}>{errors.famCard}</p>}
										</>
									)]}
								/>
								<Row
									left={["Passport No.", (
										<input className={inputCls} value={d.passNo || ""} disabled={d.citizen1 !== "WNA"} onChange={e => set("passNo", e.target.value)} />
									)]}
									right={["BI Customer Type", (
										<select className={selectCls(true)} value={d.custType || ""} onChange={e => set("custType", e.target.value)}>
											<option value="">Select</option>
											{lookups.biCustomerTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<FullRow label="NPWP *">
									<div className="flex gap-1 items-center">
										{[2, 3, 3, 1, 3, 4].map((len, i) => (
											<input
												key={i}
												className={inputCls}
												style={{ width: `${len * 14 + 16}px` }}
												maxLength={len}
												value={npwpParts[i]}
												onChange={e => {
													const next = [...npwpParts];
													next[i] = e.target.value.replace(/\D/g, "");
													setNpwpParts(next);
												}}
											/>
										))}
									</div>
									{errors.npwp && <p className={errCls}>{errors.npwp}</p>}
								</FullRow>

								<tr>
									<td colSpan={4} className={subheadCell}>NPWP Address</td>
								</tr>
								<FullRow label="Address in NPWP *">
									<textarea className={inputCls} value={d.addrNpwp || ""} onChange={e => set("addrNpwp", e.target.value)} maxLength={250} />
								</FullRow>
								<Row
									left={["Area *", (
										<select className={selectCls(true)} value={d.areaCdNpwp || ""} onChange={e => handleAreaNpwpChange(e.target.value)}>
											<option value="">Select</option>
											{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Province *", (
										<input className={inputCls} value={d.provinceNpwp || ""} readOnly />
									)]}
								/>
								<Row
									left={["District / City *", (
										<input className={inputCls} value={d.cityNpwp || ""} readOnly />
									)]}
									right={["Kecamatan / Kelurahan *", (
										<div className="flex gap-2">
											<select className={selectCls(true)} value={d.kecamatanNpwp || ""} onChange={async e => {
												set("kecamatanNpwp", e.target.value);
												const r = await api.get("/CAM/Combo/kelurahan", { params: { kecamatanCd: e.target.value } });
												setKelurahanNpwpOptions(r.data);
											}}>
												<option value="">Kecamatan</option>
												{kecamatanNpwpOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											<select className={selectCls(true)} value={d.kelurahanNpwp || ""} onChange={e => set("kelurahanNpwp", e.target.value)}>
												<option value="">Kelurahan</option>
												{kelurahanNpwpOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
										</div>
									)]}
								/>
								<Row
									left={["Post Code *", (
										<input className={inputCls} value={d.zipcode2Npwp || ""} onChange={e => set("zipcode2Npwp", e.target.value)} maxLength={5} />
									)]}
								/>

								<tr>
									<td colSpan={4} className={subheadCell}>Contact</td>
								</tr>
								<Row
									left={["Phone *", (
										<>
											<input className={inputCls} value={d.phone2 || ""} onChange={e => set("phone2", e.target.value)} />
											{errors.phone2 && <p className={errCls}>{errors.phone2}</p>}
										</>
									)]}
									right={["Whatsapp No. *", (
										<>
											<input className={inputCls} value={d.mobilePhone1 || ""} onChange={e => set("mobilePhone1", e.target.value)} />
											{errors.mobilePhone1 && <p className={errCls}>{errors.mobilePhone1}</p>}
										</>
									)]}
								/>
								<Row
									left={["Mobile 2", (
										<input className={inputCls} value={d.mobilePhone2 || ""} onChange={e => set("mobilePhone2", e.target.value)} />
									)]}
									right={["Mobile 3", (
										<input className={inputCls} value={d.mobilePhone3 || ""} onChange={e => set("mobilePhone3", e.target.value)} />
									)]}
								/>
								<Row
									left={["Other Phone 1", (
										<input className={inputCls} value={d.otherPhone1 || ""} onChange={e => set("otherPhone1", e.target.value)} />
									)]}
									right={["Other Phone Notes 1", (
										<input className={inputCls} value={d.otherPhoneNotes1 || ""} onChange={e => set("otherPhoneNotes1", e.target.value)} maxLength={50} />
									)]}
								/>
								<Row
									left={["Other Phone 2", (
										<input className={inputCls} value={d.otherPhone2 || ""} onChange={e => set("otherPhone2", e.target.value)} />
									)]}
									right={["Other Phone Notes 2", (
										<input className={inputCls} value={d.otherPhoneNotes2 || ""} onChange={e => set("otherPhoneNotes2", e.target.value)} maxLength={50} />
									)]}
								/>
								<Row
									left={["Fax", (
										<div className="flex gap-2">
											<input className={inputCls} style={{ width: "4rem" }} placeholder="Code" value={d.faxH || ""} maxLength={3} onChange={e => set("faxH", e.target.value)} />
											<input className={inputCls} style={{ width: "4rem" }} placeholder="Area" value={d.faxA || ""} maxLength={4} onChange={e => set("faxA", e.target.value)} />
											<input className={inputCls} placeholder="Number" value={d.fax1 || ""} maxLength={11} onChange={e => set("fax1", e.target.value)} />
										</div>
									)]}
								/>
								<Row
									left={["Email 1 *", (
										<input type="email" className={inputCls} value={d.email1 || ""} onChange={e => set("email1", e.target.value)} />
									)]}
									right={["Email 2", (
										<input type="email" className={inputCls} value={d.email2 || ""} onChange={e => set("email2", e.target.value)} />
									)]}
								/>
								<Row
									left={[<>Mother's Maiden Name (Without Title) * <InfoTooltip text="Merupakan nama lengkap tanpa gelar akademik, keagamaan, adat, dsb" /></>, (
										<>
											<input className={inputCls} value={d.mother || ""} onChange={e => set("mother", e.target.value)} />
											{errors.mother && <p className={errCls}>{errors.mother}</p>}
										</>
									)]}
									right={["Marital Status *", (
										<>
											<select className={selectCls(true)} value={d.marital || ""} onChange={e => set("marital", e.target.value)}>
												<option value="">Select</option>
												{lookups.maritalStatuses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											{errors.marital && <p className={errCls}>{errors.marital}</p>}
										</>
									)]}
								/>
								<Row
									left={["Group *", (
										<select className={selectCls(true)} value={d.grpcode || ""} onChange={e => set("grpcode", e.target.value)}>
											<option value="">Select</option>
											{lookups.groups.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Last Education *", (
										<>
											<select className={selectCls(true)} value={d.lEdu || ""} onChange={e => set("lEdu", e.target.value)}>
												<option value="">Select</option>
												{lookups.lastEducation.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											{errors.lEdu && <p className={errCls}>{errors.lEdu}</p>}
										</>
									)]}
								/>
								<Row
									left={["Career Field *", (
										<>
											<select className={selectCls(true)} value={d.career || ""} onChange={e => set("career", e.target.value)}>
												<option value="">Select</option>
												{lookups.careerField.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											{errors.career && <p className={errCls}>{errors.career}</p>}
										</>
									)]}
									right={["Relationship with Company *", (
										<select className={selectCls(true)} value={d.relMlci || "e3"} onChange={e => set("relMlci", e.target.value)}>
											{lookups.relationshipWithCompany.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>

								{requiresSpouseFields && (
									<>
										<Row rightHeader="Spouse Information" />
										<Row
											left={[<>Spouse Name in ID Card * <InfoTooltip text="Merupakan nama pasangan sesuai KTP; Akan digunakan di kontrak" /></>, (
												<input className={inputCls} value={d.spouse || ""} onChange={e => set("spouse", e.target.value)} />
											)]}
											right={[<>Spouse Name Without Title * <InfoTooltip text="Merupakan nama lengkap pasangan tanpa gelar akademik, keagamaan, adat, dsb" /></>, (
												<input className={inputCls} value={d.spouseWt || ""} onChange={e => set("spouseWt", e.target.value)} />
											)]}
										/>
										<Row
											left={["Spouse Place / Date of Birth *", (
												<div className="flex gap-2">
													<input className={inputCls} value={d.placebirth2 || ""} onChange={e => set("placebirth2", e.target.value)} placeholder="Place" />
													<input className={inputCls} value={d.tglbirth2 || ""} onChange={e => set("tglbirth2", e.target.value)} placeholder="dd-mm-yyyy" />
												</div>
											)]}
											right={["Spouse Citizenship *", (
												<div className="flex gap-2">
													<select className={selectCls(true)} value={d.citizen2 || ""} onChange={e => set("citizen2", e.target.value)}>
														<option value="">Select</option>
														<option value="WNI">WNI</option>
														<option value="WNA">WNA</option>
													</select>
													<select
														className={inputCls}
														value={d.citizen2 === "WNI" ? "ID" : (d.nationality2 || "")}
														disabled={d.citizen2 !== "WNA"}
														onChange={e => set("nationality2", e.target.value)}
													>
														<option value="">Nationality</option>
														{lookups.countries.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
													</select>
												</div>
											)]}
										/>
										<Row
											left={["Spouse ID Card No. *", (
												<input className={inputCls} value={d.idCard2 || ""} onChange={e => set("idCard2", e.target.value)} />
											)]}
											right={["Spouse Passport No. *", (
												<input className={inputCls} value={d.sPass || ""} onChange={e => set("sPass", e.target.value)} disabled={d.citizen2 === "WNI"} />
											)]}
										/>
										<Row
											left={["Spouse Validity ID Card *", (
												<div className="flex gap-2">
													<select
														className={selectCls(true)}
														value={d.idCardValid2 ? "0" : "1"}
														onChange={e => { if (e.target.value === "1") set("idCardValid2", ""); else set("idCardValid2", d.idCardValid2 || " "); }}
													>
														<option value="1">No Expire Date</option>
														<option value="0">Certain Period</option>
													</select>
													<input
														className={inputCls}
														placeholder="dd-mm-yyyy"
														value={(d.idCardValid2 || "").trim()}
														disabled={!d.idCardValid2}
														onChange={e => set("idCardValid2", e.target.value)}
													/>
												</div>
											)]}
										/>
										<Row
											left={["Marriage Agreement *", (
												<select className={selectCls(true)} value={d.mAgree || ""} onChange={e => set("mAgree", e.target.value)}>
													<option value="">Select</option>
													{lookups.marriageAgreement.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
												</select>
											)]}
											right={["Total of Dependent", (
												<select className={selectCls(true)} value={d.dependent || ""} onChange={e => set("dependent", e.target.value)}>
													<option value="">Select</option>
													{lookups.dependent.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
												</select>
											)]}
										/>
										<Row
											left={["Spouse Mobile Phone No. *", (
												<input className={inputCls} value={d.spouseMobilePhone || ""} onChange={e => set("spouseMobilePhone", e.target.value)} />
											)]}
											right={["Spouse Email *", (
												<input type="email" className={inputCls} value={d.spouseEmail || ""} onChange={e => set("spouseEmail", e.target.value)} />
											)]}
										/>
										<FullRow label="Spouse Address in ID Card *">
											<div className="flex gap-6 mb-2">
												<label className="flex items-center gap-2 text-sm">
													<input type="radio" checked={sameAsCustomerAddress} onChange={() => handleSameAddressToggle(true)} />
													Same with Customer's Address in ID Card
												</label>
												<label className="flex items-center gap-2 text-sm">
													<input type="radio" checked={!sameAsCustomerAddress} onChange={() => handleSameAddressToggle(false)} />
													Different
												</label>
											</div>
											<textarea
												className={inputCls}
												value={d.grnSpouseAdd || ""}
												readOnly={sameAsCustomerAddress}
												onChange={e => set("grnSpouseAdd", e.target.value)}
											/>
										</FullRow>
										<Row
											left={["Area *", (
												<select
													className={selectCls(true)}
													value={d.areaCdz || ""}
													disabled={sameAsCustomerAddress}
													onChange={e => handleAreazChange(e.target.value)}
												>
													<option value="">Select</option>
													{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
												</select>
											)]}
											right={["Province *", (
												<input className={inputCls} value={d.province1z || ""} readOnly />
											)]}
										/>
										<Row
											left={["District / City *", (
												<input className={inputCls} value={d.city1z || ""} readOnly />
											)]}
											right={["Kecamatan / Kelurahan *", (
												<div className="flex gap-2">
													<select
														className={selectCls(true)}
														value={d.kecamatan1z || ""}
														disabled={sameAsCustomerAddress}
														onChange={async e => {
															set("kecamatan1z", e.target.value);
															const r = await api.get("/CAM/Combo/kelurahan", { params: { kecamatanCd: e.target.value } });
															setKelurahan1zOptions(r.data);
														}}
													>
														<option value="">Kecamatan</option>
														{kecamatan1zOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
													</select>
													<select
														className={selectCls(true)}
														value={d.kelurahan1z || ""}
														disabled={sameAsCustomerAddress}
														onChange={e => set("kelurahan1z", e.target.value)}
													>
														<option value="">Kelurahan</option>
														{kelurahan1zOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
													</select>
												</div>
											)]}
										/>
										<Row
											left={["RT / RW *", (
												<div className="flex gap-2">
													<input className={inputCls} value={d.rt1z || ""} disabled={sameAsCustomerAddress} onChange={e => set("rt1z", e.target.value)} placeholder="RT" />
													<input className={inputCls} value={d.rw1z || ""} disabled={sameAsCustomerAddress} onChange={e => set("rw1z", e.target.value)} placeholder="RW" />
												</div>
											)]}
											right={["Post Code *", (
												<input className={inputCls} value={d.zipcode1z || ""} disabled={sameAsCustomerAddress} onChange={e => set("zipcode1z", e.target.value)} maxLength={5} />
											)]}
										/>
									</>
								)}

								<Row rightHeader="Emergency Contact" />
								<Row
									left={["Emergency Name *", (
										<input className={inputCls} value={d.emergencyName || ""} onChange={e => set("emergencyName", e.target.value)} />
									)]}
									right={["Emergency Phone *", (
										<input className={inputCls} value={d.emergencyPhone || ""} onChange={e => set("emergencyPhone", e.target.value)} />
									)]}
								/>
								<FullRow label="Emergency Address *">
									<textarea className={inputCls} value={d.emergencyAddress || ""} onChange={e => set("emergencyAddress", e.target.value)} />
								</FullRow>
								<Row
									left={["Emergency Relation *", (
										<input className={inputCls} value={d.emergencyRelation || ""} onChange={e => set("emergencyRelation", e.target.value)} />
									)]}
								/>
							</tbody>
						</table>
					</div>
				</div>

				{saving && <p className="text-sm text-[var(--app-muted)] mt-3">Saving…</p>}
			</div>
		</div>
	);
});

export default CAMCustomerDetailPage;
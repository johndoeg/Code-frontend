import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

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
const selectCls = (editable: boolean) =>
	`border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${editable ? "bg-[var(--app-card)]" : "bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed"
	}`;
const inputClsFor = (editable: boolean) =>
	`${inputCls} ${editable ? "bg-[var(--app-card)]" : "bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed"}`;

function filterDigits(value: string): string {
	return value.replace(/\D/g, "");
}

function filterPhoneDigits(value: string): string {
	return value.replace(/[^0-9xX]/g, "");
}

function PhoneField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
	return (
		<div className="relative">
			<span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--app-muted)]">62</span>
			<input
				type="tel"
				inputMode="numeric"
				className={`${inputClsFor(!disabled)} pl-7`}
				value={value}
				disabled={disabled}
				onChange={e => onChange(filterPhoneDigits(e.target.value))}
			/>
		</div>
	);
}

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

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			{judul && (
				<div className="judul border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-right text-xs font-semibold text-blue-400 sm:px-6">
					{judul}
				</div>
			)}
			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<h2 className="text-xl font-bold text-[var(--app-text)]">Corporate Detail</h2>

				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[820px] border-collapse text-sm">
							<tbody>
								<Row
									left={[<>Name in Akta * <InfoTooltip text="Merupakan nama debitur sesuai Akta, Akan digunakan di kontrak" /></>, (
										<>
											<input className={inputClsFor(false)} value={d.lesseeNm || ""} readOnly />
											{errors.lesseeNm && <p className={errCls}>{errors.lesseeNm}</p>}
										</>
									)]}
									right={["Customer No. *", (
										<input className={inputClsFor(false)} value={initialApless} readOnly />
									)]}
								/>
								<Row
									left={[<>Customer Name * <InfoTooltip text="Merupakan nama debitur tanpa PT, CV, dsb" /></>, (
										<>
											<input className={inputCls} value={d.idCardName || ""} onChange={e => set("idCardName", e.target.value)} />
											{errors.idCardName && <p className={errCls}>{errors.idCardName}</p>}
										</>
									)]}
									right={["NPWP *", (
										<>
											<div className="flex gap-1 items-center">
												{[2, 3, 3, 1, 3, 4].map((len, i) => (
													<input
														key={i}
														className={inputCls}
														style={{ width: `${len * 14 + 16}px` }}
														maxLength={len}
														inputMode="numeric"
														value={npwpParts[i]}
														onChange={e => {
															const next = [...npwpParts];
															next[i] = filterDigits(e.target.value);
															setNpwpParts(next);
														}}
													/>
												))}
											</div>
											{errors.npwp && <p className={errCls}>{errors.npwp}</p>}
										</>
									)]}
								/>
								<Row
									left={["Customer Profile *", (
										<>
											<select className={selectCls(true)} value={d.lesseeCat || ""} onChange={e => handleLesseeCatChange(e.target.value)}>
												<option value="">Select</option>
												{lookups.customerProfiles.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											{errors.lesseeCat && <p className={errCls}>{errors.lesseeCat}</p>}
										</>
									)]}
									right={["Address in NPWP *", (
										<textarea className={inputCls} value={d.addrNpwp || ""} onChange={e => set("addrNpwp", e.target.value)} maxLength={250} />
									)]}
								/>
								<Row
									left={["Occupation / Business Type", (
										<select className={selectCls(d.lesseeCat !== "FD")} value={d.ocuType || ""} disabled={d.lesseeCat === "FD"} onChange={e => set("ocuType", e.target.value)}>
											<option value="">Select</option>
											{businessTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["Address in SK. Domisili *", (
										<>
											<textarea className={inputCls} value={d.address2 || ""} onChange={e => set("address2", e.target.value)} maxLength={250} />
											{errors.address2 && <p className={errCls}>{errors.address2}</p>}
										</>
									)]}
									right={["Area *", (
										<select className={selectCls(true)} value={d.areaCdNpwp || ""} onChange={e => handleAreaNpwpChange(e.target.value)}>
											<option value="">Select</option>
											{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									right={["Province *", (
										<input className={inputClsFor(false)} value={d.provinceNpwp || ""} readOnly />
									)]}
								/>
								<Row
									right={["District / City *", (
										<input className={inputClsFor(false)} value={d.cityNpwp || ""} readOnly />
									)]}
								/>
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
									right={["Kecamatan *", (
										<select className={selectCls(true)} value={d.kecamatanNpwp || ""} onChange={e => handleKecamatanNpwpChange(e.target.value)}>
											<option value="">Select</option>
											{kecamatanNpwpOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["Province *", (
										<input className={inputClsFor(false)} value={d.province2 || ""} readOnly />
									)]}
									right={["Kelurahan *", (
										<select className={selectCls(true)} value={d.kelurahanNpwp || ""} onChange={e => set("kelurahanNpwp", e.target.value)}>
											<option value="">Select</option>
											{kelurahanNpwpOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["District / City *", (
										<>
											<input className={inputClsFor(false)} value={d.city2 || ""} readOnly />
											{errors.city2 && <p className={errCls}>{errors.city2}</p>}
										</>
									)]}
									right={["Post Code *", (
										<input className={inputCls} value={d.zipcode2Npwp || ""} inputMode="numeric" onChange={e => set("zipcode2Npwp", filterDigits(e.target.value))} maxLength={5} />
									)]}
								/>
								<Row
									left={["Kecamatan *", (
										<select className={selectCls(true)} value={d.kecamatan1 || ""} onChange={e => handleKecamatan1Change(e.target.value)}>
											<option value="">Select</option>
											{kecamatan1Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Form of Business Entity *", (
										<>
											<select className={selectCls(true)} value={d.businessEntity || ""} onChange={e => set("businessEntity", e.target.value)}>
												<option value="">Select</option>
												{lookups.businessEntities.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											{errors.businessEntity && <p className={errCls}>{errors.businessEntity}</p>}
										</>
									)]}
								/>
								<Row
									left={["Kelurahan *", (
										<select className={selectCls(true)} value={d.kelurahan1 || ""} onChange={e => set("kelurahan1", e.target.value)}>
											<option value="">Select</option>
											{kelurahan1Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Line of Business", (
										<textarea className={inputCls} value={d.lob || ""} onChange={e => set("lob", e.target.value)} maxLength={250} />
									)]}
								/>
								<Row
									left={["RT / RW", (
										<div className="flex gap-2">
											<input className={inputCls} value={d.rt1 || ""} inputMode="numeric" onChange={e => set("rt1", filterDigits(e.target.value))} placeholder="RT" />
											<input className={inputCls} value={d.rw1 || ""} inputMode="numeric" onChange={e => set("rw1", filterDigits(e.target.value))} placeholder="RW" />
										</div>
									)]}
								/>
								<Row
									left={["Post Code *", (
										<>
											<input className={inputCls} value={d.zipcode2 || ""} inputMode="numeric" onChange={e => set("zipcode2", filterDigits(e.target.value))} maxLength={5} />
											{errors.zipcode2 && <p className={errCls}>{errors.zipcode2}</p>}
										</>
									)]}
									right={["SIUP No.", (
										<input className={inputCls} value={d.siup || ""} onChange={e => set("siup", e.target.value)} />
									)]}
								/>
								<Row
									left={["Office Status *", (
										<>
											<select className={selectCls(true)} value={d.addressStatus || ""} onChange={e => set("addressStatus", e.target.value)}>
												<option value="">Select</option>
												{lookups.officeStatuses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
											{errors.addressStatus && <p className={errCls}>{errors.addressStatus}</p>}
										</>
									)]}
									right={["Domicile No.", (
										<input className={inputCls} value={d.domicile || ""} onChange={e => set("domicile", e.target.value)} />
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
									right={["Number of Employee *", (
										<div className="flex items-center gap-2">
											<input className={inputCls} value={d.employeeNumber || ""} inputMode="numeric" onChange={e => set("employeeNumber", filterDigits(e.target.value))} maxLength={7} />
											<span className="text-xs text-[var(--app-muted)] whitespace-nowrap">people (s)</span>
										</div>
									)]}
								/>
								<Row
									left={["Phone *", (
										<>
											<PhoneField value={d.phone1 || ""} onChange={v => set("phone1", v)} />
											{errors.phone1 && <p className={errCls}>{errors.phone1}</p>}
										</>
									)]}
									right={["Relationship with Genie *", (
										<select className={selectCls(true)} value={d.relMlci || "e3"} onChange={e => set("relMlci", e.target.value)}>
											{lookups.relationshipWithCompany.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["Whatsapp No. *", (
										<>
											<PhoneField value={d.mobilePhone1 || ""} onChange={v => set("mobilePhone1", v)} />
											{errors.mobilePhone1 && <p className={errCls}>{errors.mobilePhone1}</p>}
										</>
									)]}
									rightHeader="Contact Person"
								/>
								<Row
									left={["Mobile 2", (
										<PhoneField value={d.mobilePhone2 || ""} onChange={v => set("mobilePhone2", v)} />
									)]}
									right={["Name *", (
										<>
											<input className={inputCls} value={d.contact || ""} onChange={e => set("contact", e.target.value)} />
											{errors.contact && <p className={errCls}>{errors.contact}</p>}
										</>
									)]}
								/>
								<Row
									left={["Mobile 3", (
										<PhoneField value={d.mobilePhone3 || ""} onChange={v => set("mobilePhone3", v)} />
									)]}
									right={["Position *", (
										<>
											<input className={inputCls} value={d.occupation || ""} onChange={e => set("occupation", e.target.value)} />
											{errors.occupation && <p className={errCls}>{errors.occupation}</p>}
										</>
									)]}
								/>
								<Row
									left={["Other Phone 1", (
										<PhoneField value={d.otherPhone1 || ""} onChange={v => set("otherPhone1", v)} />
									)]}
									right={["Address *", (
										<textarea className={inputCls} value={d.address1 || ""} onChange={e => set("address1", e.target.value)} maxLength={250} />
									)]}
								/>
								<Row
									left={["Other Phone Notes 1", (
										<input className={inputCls} value={d.otherPhoneNotes1 || ""} onChange={e => set("otherPhoneNotes1", e.target.value)} maxLength={50} />
									)]}
								/>
								<Row
									left={["Other Phone 2", (
										<PhoneField value={d.otherPhone2 || ""} onChange={v => set("otherPhone2", v)} />
									)]}
								/>
								<Row
									left={["Other Phone Notes 2", (
										<input className={inputCls} value={d.otherPhoneNotes2 || ""} onChange={e => set("otherPhoneNotes2", e.target.value)} maxLength={50} />
									)]}
								/>
								<Row
									left={["Office Email for Correspondence *", (
										<input type="email" className={inputCls} value={d.email1 || ""} onChange={e => set("email1", e.target.value)} />
									)]}
									rightHeader="Emergency Contact"
								/>
								<Row
									left={["Establishment Place / Date *", (
										<>
											<div className="flex gap-2">
												<input className={inputCls} value={d.placebirth || ""} onChange={e => set("placebirth", e.target.value)} placeholder="Place" />
												<input className={inputCls} value={d.tglbirth || ""} onChange={e => set("tglbirth", e.target.value)} placeholder="dd-mm-yyyy" />
											</div>
											{errors.tglbirth && <p className={errCls}>{errors.tglbirth}</p>}
										</>
									)]}
									right={["Emergency Name *", (
										<input className={inputCls} value={d.emergencyName || ""} onChange={e => set("emergencyName", e.target.value)} />
									)]}
								/>
								<Row
									left={["Group *", (
										<select className={selectCls(true)} value={d.grpcode || ""} onChange={e => set("grpcode", e.target.value)}>
											<option value="">Select</option>
											{lookups.groups.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Emergency Address *", (
										<textarea className={inputCls} value={d.emergencyAddress || ""} onChange={e => set("emergencyAddress", e.target.value)} />
									)]}
								/>
								<Row
									left={["BI Customer Type", (
										<select className={selectCls(true)} value={d.custType || ""} onChange={e => set("custType", e.target.value)}>
											<option value="">Select</option>
											{d.custType && !(lookups.biCustomerTypes ?? []).some(o => o.value === d.custType) && (
												<option value={d.custType}>{d.custType}</option>
											)}
											{(lookups.biCustomerTypes ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Emergency Phone *", (
										<PhoneField value={d.emergencyPhone || ""} onChange={v => set("emergencyPhone", v)} />
									)]}
								/>
								<Row
									left={["Industrial Code *", (
										<select className={selectCls(true)} value={indCodeSel.l0} onChange={e => handleIndCodeL0Change(e.target.value)}>
											<option value="">Select</option>
											{indCodeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
									right={["Emergency Relation *", (
										<input className={inputCls} value={d.emergencyRelation || ""} onChange={e => set("emergencyRelation", e.target.value)} />
									)]}
								/>
								<Row
									left={["", (
										<select className={selectCls(!!indCodeSel.l0)} value={indCodeSel.l1} disabled={!indCodeSel.l0} onChange={e => handleIndCodeL1Change(e.target.value)}>
											<option value="">Select</option>
											{indCode1Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["", (
										<select className={selectCls(!!indCodeSel.l1)} value={indCodeSel.l2} disabled={!indCodeSel.l1} onChange={e => handleIndCodeL2Change(e.target.value)}>
											<option value="">Select</option>
											{indCode2Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["", (
										<select className={selectCls(!!indCodeSel.l2)} value={indCodeSel.l3} disabled={!indCodeSel.l2} onChange={e => handleIndCodeL3Change(e.target.value)}>
											<option value="">Select</option>
											{indCode3Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["", (
										<select className={selectCls(!!indCodeSel.l3)} value={indCodeSel.l4} disabled={!indCodeSel.l3} onChange={e => handleIndCodeL4Change(e.target.value)}>
											<option value="">Select</option>
											{indCode4Options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									)]}
								/>
								<Row
									left={["", (
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
									<td colSpan={4} className="px-4 py-2 text-xs text-red-600">*) wajib diisi</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>

				{saving && <p className="text-sm text-[var(--app-muted)] mt-3">Saving…</p>}

				{(formMessage || Object.keys(errors).length > 0) && (
					<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
						<ul className="list-disc list-inside text-sm text-red-700 space-y-1">
							{formMessage && <li>{formMessage}</li>}
							{Object.entries(errors).map(([key, msg]) => (
								<li key={key}>{msg}</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
});

export default CAMCustomerCorporateDetailPage;
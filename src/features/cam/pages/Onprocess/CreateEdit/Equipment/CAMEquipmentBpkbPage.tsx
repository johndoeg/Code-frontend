import React, { useCallback, useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import AsOfDatePickerComponent from '@/shared/components/AsOfDatePickerComponent';

export interface CAMEquipmentBpkbPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	newCar: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

interface LookupOption {
	value: string;
	label: string;
}

interface NotaryOption extends LookupOption {
	npwpNo: string;
	npwpAddrs: string;
}

interface AttorneyRow {
	name: string;
	occupation: string;
	address: string;
}

interface BpkbFormState {
	bpkbNo: string;
	bpkbAnTp: string;
	bpkbAn: string;
	relation: string;
	bpkbAddr: string;
	areaCd: string;
	cityBpkb: string;
	idFam: string;
	placebirth: string;
	tglbirth: string;
	cancelOrder: boolean;
	addCollateral: boolean;
	notaryNo: string;
	npwpNo: string;
	npwpAddrs: string;
}

interface DetailState {
	maritalStatus: string;
	spouseName: string;
	spouseStatus: string;
	spouseAddress: string;
	attorneys: AttorneyRow[];
}

interface Lookups {
	bpkbNameTypes: LookupOption[];
	familyStatuses: LookupOption[];
	maritalStatuses: LookupOption[];
	spouseStatuses: LookupOption[];
	attorneyOccupations: LookupOption[];
	notaries: NotaryOption[];
}

const EMPTY_FORM: BpkbFormState = {
	bpkbNo: "",
	bpkbAnTp: "",
	bpkbAn: "",
	relation: "",
	bpkbAddr: "",
	areaCd: "",
	cityBpkb: "",
	idFam: "",
	placebirth: "",
	tglbirth: "",
	cancelOrder: false,
	addCollateral: false,
	notaryNo: "",
	npwpNo: "",
	npwpAddrs: "",
};

const EMPTY_DETAIL: DetailState = {
	maritalStatus: "-",
	spouseName: "",
	spouseStatus: "-",
	spouseAddress: "",
	attorneys: [{ name: "", occupation: "", address: "" }],
};

const EMPTY_LOOKUPS: Lookups = {
	bpkbNameTypes: [],
	familyStatuses: [],
	maritalStatuses: [],
	spouseStatuses: [],
	attorneyOccupations: [],
	notaries: [],
};

const NOT_FAMILY_CODES = new Set(["40", "50"]);
const LEASING_COMPANY_NORMALIZED = "MITSUILEASINGCAPITALINDONESIAPT";

const FAMILY_STATUS_FIN_TYPES = ["S", "I", "M", "D", "W"];

function normalizeName(value: string): string {
	return (value || "").trim().toUpperCase();
}

function formatBpkbNo(raw: string): string {
	const stripped = raw.toUpperCase().replace(/-/g, "");
	const letters = (stripped.match(/^[A-Za-z]{0,2}/) || [""])[0];
	let formatted = letters;
	if (letters.length > 0) formatted += "-";
	const rest = stripped.slice(letters.length);
	const digits = (rest.match(/^\d{0,8}/) || [""])[0];
	if (formatted.includes("-")) formatted += digits;
	return formatted;
}

function computeIdFams(finType: string, bpkbAnTp: string, namesMatch: boolean, idFam: string): "" | "Family" | "Not Family" {
	if (finType === "F") return "Not Family";
	if (bpkbAnTp !== "PR") return "Not Family";
	if (namesMatch) return "Not Family";
	if (!idFam) return "";
	return NOT_FAMILY_CODES.has(idFam) ? "Not Family" : "Family";
}

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

const inputCls =
	"border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400";
const readonlyCls =
	"border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full bg-[var(--app-surface-alt)] text-[var(--app-muted)]";
const labelCls = "text-sm text-[var(--app-muted)] pt-1.5";
const selectCls = (editable: boolean) =>
	`border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${editable ? "bg-[var(--app-card)]" : "bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed"
	}`;

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
	return (
		<div className="grid grid-cols-4 items-start gap-2 py-1">
			<div className="col-span-1"><span className={labelCls}>{label}</span></div>
			<div className="col-span-3">{children}</div>
		</div>
	);
}

const CAMEquipmentBpkbPage = forwardRef<CamTabHandle, CAMEquipmentBpkbPageProps>(function CAMEquipmentBpkbPage({ apless, applNo, finType, custName, newCar, onSaved }, ref) {
	const [saving, setSaving] = useState(false);
	const [loadError, setLoadError] = useState("");
	const [errors, setErrors] = useState<string[]>([]);
	const [warning, setWarning] = useState("");
	const [message, setMessage] = useState("");
	const [lesseeName, setLesseeName] = useState("");
	const [carCondition, setCarCondition] = useState("");
	const [form, setForm] = useState<BpkbFormState>(EMPTY_FORM);
	const [detail, setDetail] = useState<DetailState>(EMPTY_DETAIL);
	const [showDetailPanel, setShowDetailPanel] = useState(false);
	const [lookups, setLookups] = useState<Lookups>(EMPTY_LOOKUPS);
	const [areas, setAreas] = useState<LookupOption[]>([]);

	const applyLoadedData = useCallback((d: any, areasData: LookupOption[]) => {
		setLesseeName(d.lesseeName || "");
		setCarCondition(d.carCondition || "");
		setForm({
			bpkbNo: formatBpkbNo(d.bpkb?.bpkbNo || ""),
			bpkbAnTp: d.bpkb?.bpkbAnTp || "",
			bpkbAn: d.bpkb?.bpkbAn || "",
			relation: d.bpkb?.relation || "",
			bpkbAddr: d.bpkb?.bpkbAddr || "",
			areaCd: d.bpkb?.areaCd || "",
			cityBpkb: d.bpkb?.cityBpkb || "",
			idFam: d.bpkb?.idFam || "",
			placebirth: d.bpkb?.placebirth || "",
			tglbirth: d.bpkb?.tglbirth || "",
			cancelOrder: !!d.bpkb?.cancelOrder,
			addCollateral: !!d.bpkb?.addCollateral,
			notaryNo: d.notary?.notaryNo || "",
			npwpNo: d.notary?.npwpNo || "",
			npwpAddrs: d.notary?.npwpAddrs || "",
		});
		setDetail({
			maritalStatus: d.detail?.maritalStatus || "-",
			spouseName: d.detail?.spouseName || "",
			spouseStatus: d.detail?.spouseStatus || "-",
			spouseAddress: d.detail?.spouseAddress || "",
			attorneys: d.detail?.attorneys?.length ? d.detail.attorneys : [{ name: "", occupation: "", address: "" }],
		});
		setLookups({
			bpkbNameTypes: d.lookups?.bpkbNameTypes || [],
			familyStatuses: d.lookups?.familyStatuses || [],
			maritalStatuses: d.lookups?.maritalStatuses || [],
			spouseStatuses: d.lookups?.spouseStatuses || [],
			attorneyOccupations: d.lookups?.attorneyOccupations || [],
			notaries: d.lookups?.notaries || [],
		});
		setAreas(areasData || []);
	}, []);

	const { data, isLoading: loading, isError } = useQuery({
		queryKey: ['cam-bpkb', apless, applNo],
		queryFn: async () => {
			const [bpkbRes, areasRes] = await Promise.all([
				api.get("/CAM/EditIndex/bpkb", { params: { apless, applno: applNo } }),
				api.get("/CAM/Combo/provinces-and-cities"),
			]);
			return { bpkb: bpkbRes.data || {}, areas: areasRes.data || [] };
		},
	});

	useEffect(() => {
		if (data) applyLoadedData(data.bpkb, data.areas);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	const isPR = form.bpkbAnTp === "PR";

	const namesMatch = useMemo(() => {
		const a = normalizeName(form.bpkbAn);
		const b = normalizeName(lesseeName);
		return a !== "" && a === b;
	}, [form.bpkbAn, lesseeName]);

	const isCompanyItself = useMemo(
		() => normalizeName(form.bpkbAn).replace(/ /g, "") === LEASING_COMPANY_NORMALIZED,
		[form.bpkbAn]
	);

	const idFams = useMemo(
		() => computeIdFams(finType, form.bpkbAnTp, namesMatch, form.idFam),
		[finType, form.bpkbAnTp, namesMatch, form.idFam]
	);

	const carIsNew = carCondition === "NEW";
	const showFamilyDropdown = isPR && FAMILY_STATUS_FIN_TYPES.includes(finType);
	const showCancelOrder = finType === "I" && carIsNew && idFams === "Not Family" && !namesMatch;
	const detailTriggerActive = form.bpkbAnTp !== "" && !namesMatch && newCar === "2" && idFams === "Not Family";
	const relationReadOnly = namesMatch;
	const relationRequired = !namesMatch && !isCompanyItself && finType !== "F";
	const showPlaceDob = isPR;
	const placeDobRequired = carCondition !== "USED";
	const placeDobDisabled = isPR && namesMatch && finType !== "F";
	const notaryVisible = finType !== "F";
	const notaryRequired = notaryVisible && finType !== "S" && finType !== "W";
	const npwpEditable = finType !== "W";
	const nameTypeReadOnly = form.bpkbAnTp === "PT" && finType === "F";

	useEffect(() => {
		setShowDetailPanel(detailTriggerActive);
	}, [detailTriggerActive]);

	const handleAreaChange = async (areaCd: string) => {
		if (!areaCd) {
			setForm(f => ({ ...f, areaCd: "", cityBpkb: "" }));
			return;
		}
		setForm(f => ({ ...f, areaCd }));
		try {
			const res = await api.get("/CAM/Combo/province-city", { params: { areaCd } });
			setForm(f => ({ ...f, cityBpkb: res.data?.city || f.cityBpkb }));
		} catch { }
	};

	const handleNotaryChange = (notaryNo: string) => {
		const match = lookups.notaries.find(n => n.value === notaryNo);
		setForm(f => ({ ...f, notaryNo, npwpNo: match?.npwpNo || "", npwpAddrs: match?.npwpAddrs || "" }));
	};

	const handleMaritalChange = (value: string) => {
		setDetail(d => ({
			...d,
			maritalStatus: value,
			spouseName: value === "S" ? "" : d.spouseName,
			spouseAddress: value === "S" ? "" : d.spouseAddress,
		}));
	};

	const spouseLocked = detail.maritalStatus === "S" || detail.maritalStatus === "-" || detail.maritalStatus === "";

	const handleResetName = async () => {
		if (!window.confirm("Reset BPKB name, address, and city?")) return;
		try {
			const res = await api.post("/CAM/EditIndex/bpkb/reset-name", { apless, applno: applNo });
			if (res.data?.success) {
				setForm(f => ({ ...f, bpkbAn: "", bpkbAddr: "", cityBpkb: "" }));
			} else {
				setLoadError(res.data?.message || "Failed to reset name.");
			}
		} catch (err: any) {
			setLoadError(err?.response?.data?.message || "Failed to reset name.");
		}
	};

	const addAttorney = () =>
		setDetail(d => ({ ...d, attorneys: [...d.attorneys, { name: "", occupation: "", address: "" }] }));

	const removeAttorney = () =>
		setDetail(d => (d.attorneys.length > 1 ? { ...d, attorneys: d.attorneys.slice(0, -1) } : d));

	const updateAttorney = (idx: number, patch: Partial<AttorneyRow>) =>
		setDetail(d => ({ ...d, attorneys: d.attorneys.map((a, i) => (i === idx ? { ...a, ...patch } : a)) }));

	const handleSubmit = useCallback(async () => {
		setSaving(true);
		setErrors([]);
		setWarning("");
		setMessage("");
		setLoadError("");
		try {
			const res = await api.post("/CAM/EditIndex/bpkb", {
				apless,
				applno: applNo,
				newCar,
				bpkbNo: form.bpkbNo,
				bpkbAnTp: form.bpkbAnTp,
				bpkbAn: form.bpkbAn,
				relation: form.relation,
				bpkbAddr: form.bpkbAddr,
				areaCd: form.areaCd,
				cityBpkb: form.cityBpkb,
				idFam: form.idFam,
				placebirth: form.placebirth,
				tglbirth: form.tglbirth,
				cancelOrder: form.cancelOrder,
				addCollateral: form.addCollateral,
				notaryNo: form.notaryNo,
				detail: isPR
					? {
						maritalStatus: detail.maritalStatus,
						spouseName: detail.spouseName,
						spouseStatus: detail.spouseStatus,
						spouseAddress: detail.spouseAddress,
						attorneys: [],
					}
					: {
						maritalStatus: "-",
						spouseName: "",
						spouseStatus: "-",
						spouseAddress: "",
						attorneys: detail.attorneys,
					},
			});
			if (!res.data.success) {
				setErrors(res.data.errors?.length ? res.data.errors : [res.data.message || "Save failed."]);
				setMessage("Failed");
				return;
			}
			if (res.data.warning) setWarning(res.data.warning);
			setMessage("Successful");
			onSaved({ apless, applno: applNo });
		} catch (err: any) {
			setErrors([err?.response?.data?.message || "Save failed. Please try again."]);
			setMessage("Failed");
		} finally {
			setSaving(false);
		}
	}, [apless, applNo, newCar, form, isPR, detail, onSaved]);

	const onFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		handleSubmit();
	};

	useImperativeHandle(ref, () => ({ save: handleSubmit }), [handleSubmit]);

	if (loading) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-[var(--app-muted)]">Loading…</p>
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="relative space-y-4 overflow-visible rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">BPKB</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>

			<div className="space-y-4 px-4 pb-4 sm:px-6">
				<form onSubmit={onFormSubmit}>
					{(loadError || isError) && (
						<p className="mb-2 text-sm text-red-600">{loadError || "Failed to load BPKB data."}</p>
					)}

					<Row label="BPKB No">
						<input
							type="text"
							maxLength={50}
							value={form.bpkbNo}
							onChange={e => setForm(f => ({ ...f, bpkbNo: formatBpkbNo(e.target.value) }))}
							placeholder="AB-12345678"
							className={inputCls}
						/>
					</Row>

					<Row label="BPKB Name Type *">
						<div className="flex flex-wrap items-center gap-3">
							{nameTypeReadOnly ? (
								<input
									type="text"
									readOnly
									value={lookups.bpkbNameTypes.find(o => o.value === form.bpkbAnTp)?.label || form.bpkbAnTp}
									className={`${readonlyCls} max-w-xs`}
								/>
							) : (
								<select
									required
									value={form.bpkbAnTp}
									onChange={e => setForm(f => ({ ...f, bpkbAnTp: e.target.value }))}
									className={`${selectCls(true)} max-w-xs`}
								>
									<option value="">Select</option>
									{lookups.bpkbNameTypes.map(o => (
										<option key={o.value} value={o.value}>{o.label}</option>
									))}
								</select>
							)}
							{detailTriggerActive && (
								<button
									type="button"
									onClick={() => setShowDetailPanel(s => !s)}
									className="text-sm text-blue-700 underline hover:text-blue-400"
								>
									BPKB name detail
								</button>
							)}
						</div>
					</Row>

					<Row label="BPKB Name *">
						<div className="flex flex-wrap items-center gap-3">
							<input
								type="text"
								required
								value={form.bpkbAn}
								onChange={e => setForm(f => ({ ...f, bpkbAn: e.target.value }))}
								className={`${inputCls} max-w-xs`}
							/>
							<button
								type="button"
								onClick={handleResetName}
								className="shrink-0 rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-medium text-[var(--app-text)] hover:bg-slate-300"
							>
								Reset Name
							</button>
							{showCancelOrder && (
								<label className="flex items-center gap-2 whitespace-nowrap text-sm text-[var(--app-muted)]">
									<input
										type="checkbox"
										checked={form.cancelOrder}
										onChange={e => setForm(f => ({ ...f, cancelOrder: e.target.checked }))}
									/>
									Cancellation Order
								</label>
							)}
						</div>
					</Row>

					{showPlaceDob && (
						<Row label="Place/ Date of Birth *">
							<div className="flex flex-nowrap items-center gap-2">
								<input
									type="text"
									maxLength={30}
									required={placeDobRequired}
									disabled={placeDobDisabled}
									value={form.placebirth}
									onChange={e => setForm(f => ({ ...f, placebirth: e.target.value }))}
									className={`${placeDobDisabled ? readonlyCls : inputCls} !w-32 shrink-0`}
								/>
								<span className="shrink-0 text-sm text-[var(--app-muted)]">/</span>
								<div className="w-44 shrink-0">
									<AsOfDatePickerComponent
										label=""
										format="dd-MM-yyyy"
										placeholder="dd-mm-yyyy"
										required={placeDobRequired}
										disabled={placeDobDisabled}
										value={parseISODate(form.tglbirth)}
										onChange={date => setForm(f => ({ ...f, tglbirth: toISODate(date) }))}
									/>
								</div>
							</div>
						</Row>
					)}

					{showFamilyDropdown && (
						<Row label="Family Status *">
							<select
								required
								disabled={namesMatch}
								value={namesMatch ? "" : form.idFam}
								onChange={e => setForm(f => ({ ...f, idFam: e.target.value }))}
								className={`${selectCls(!namesMatch)} max-w-xs`}
							>
								<option value="">Select</option>
								{!namesMatch && lookups.familyStatuses.map(o => (
									<option key={o.value} value={o.value}>{o.label}</option>
								))}
							</select>
						</Row>
					)}

					<Row label="Relationship With Customer *">
						<input
							type="text"
							readOnly={relationReadOnly}
							required={relationRequired}
							value={form.relation}
							onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
							className={`${relationReadOnly ? readonlyCls : inputCls} max-w-xs`}
						/>
					</Row>

					<Row label="BPKB Address *">
						<textarea
							required
							rows={3}
							value={form.bpkbAddr}
							onChange={e => setForm(f => ({ ...f, bpkbAddr: e.target.value }))}
							className={inputCls}
						/>
					</Row>

					<Row label="Area *">
						<select
							value={form.areaCd}
							onChange={e => handleAreaChange(e.target.value)}
							className={selectCls(true)}
						>
							<option value="">Select</option>
							{areas.map(o => (
								<option key={o.value} value={o.value}>{o.label}</option>
							))}
						</select>
					</Row>

					<Row label="City *">
						<input
							type="text"
							required
							maxLength={20}
							value={form.cityBpkb}
							onChange={e => setForm(f => ({ ...f, cityBpkb: e.target.value }))}
							className={`${inputCls} max-w-xs`}
						/>
					</Row>

					<Row label="Additional Collateral">
						<input
							type="checkbox"
							checked={form.addCollateral}
							onChange={e => setForm(f => ({ ...f, addCollateral: e.target.checked }))}
						/>
					</Row>

					{notaryVisible && (
						<>
							<Row label="Notary Name *">
								<select
									required={notaryRequired}
									value={form.notaryNo}
									onChange={e => handleNotaryChange(e.target.value)}
									className={selectCls(true)}
								>
									<option value="">Select</option>
									{lookups.notaries.map(o => (
										<option key={o.value} value={o.value}>{o.label}</option>
									))}
								</select>
							</Row>
							<Row label="NPWP">
								<input type="text" readOnly value={npwpEditable ? form.npwpNo : ""} className={`${readonlyCls} max-w-xs`} />
							</Row>
							<Row label="NPWP Address">
								<textarea readOnly rows={2} value={npwpEditable ? form.npwpAddrs : ""} className={readonlyCls} />
							</Row>
						</>
					)}

					{errors.length > 0 && (
						<div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
							<ul className="list-disc pl-4">
								{errors.map((msg, i) => <li key={i}>{msg}</li>)}
							</ul>
						</div>
					)}
					{warning && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">{warning}</p>}
					{saving && <p className="mt-3 text-sm text-[var(--app-muted)]">Saving…</p>}
					{message && !errors.length && <div className="message mt-3 text-sm text-[var(--app-muted)]">{message}</div>}

					<button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
				</form>
			</div>

			{showDetailPanel && detailTriggerActive && (
				<div className="absolute right-4 top-16 z-40 w-[480px] max-w-[92vw] rounded-lg border-2 border-[#9891A4] bg-white shadow-xl">
					<div className="flex items-center justify-end gap-2 border-b border-[var(--app-border)] px-3 py-2">
						{!isPR && (
							<>
								<button
									type="button"
									onClick={addAttorney}
									title="Add signer"
									className="rounded bg-slate-200 px-2 py-0.5 text-sm font-bold hover:bg-slate-300"
								>
									+
								</button>
								<button
									type="button"
									onClick={removeAttorney}
									title="Remove last signer"
									className="rounded bg-slate-200 px-2 py-0.5 text-sm font-bold hover:bg-slate-300"
								>
									−
								</button>
							</>
						)}
						<button
							type="button"
							onClick={() => setShowDetailPanel(false)}
							title="Close"
							className="rounded bg-slate-200 px-2 py-0.5 text-sm font-bold hover:bg-slate-300"
						>
							×
						</button>
					</div>

					<div className="p-3">
						{isPR ? (
							<div>
								<Row label="BPKB Name Marital Status *">
									<select
										value={detail.maritalStatus}
										onChange={e => handleMaritalChange(e.target.value)}
										className={selectCls(true)}
									>
										<option value="-">Select</option>
										{lookups.maritalStatuses.map(o => (
											<option key={o.value} value={o.value}>{o.label}</option>
										))}
									</select>
								</Row>
								<Row label="Spouse BPKB Name *">
									<input
										type="text"
										readOnly={spouseLocked}
										value={detail.spouseName}
										onChange={e => setDetail(d => ({ ...d, spouseName: e.target.value }))}
										className={spouseLocked ? readonlyCls : inputCls}
									/>
								</Row>
								<Row label="Spouse BPKB status *">
									<select
										value={detail.spouseStatus}
										onChange={e => setDetail(d => ({ ...d, spouseStatus: e.target.value }))}
										className={selectCls(true)}
									>
										<option value="-">Select</option>
										{lookups.spouseStatuses.map(o => (
											<option key={o.value} value={o.value}>{o.label}</option>
										))}
									</select>
								</Row>
								<Row label="Spouse BPKB Address *">
									<textarea
										rows={2}
										readOnly={spouseLocked}
										value={detail.spouseAddress}
										onChange={e => setDetail(d => ({ ...d, spouseAddress: e.target.value }))}
										className={spouseLocked ? readonlyCls : inputCls}
									/>
								</Row>
							</div>
						) : (
							<div>
								<p className="mb-2 text-center text-sm text-[var(--app-text)]">
									Signer on Power of Attorney (POA)
								</p>
								<div className="max-h-[50vh] overflow-y-auto">
									{detail.attorneys.map((a, idx) => (
										<div key={idx} className="border-b border-[var(--app-border)] pb-2">
											<Row label="Name *">
												<input
													type="text"
													value={a.name}
													onChange={e => updateAttorney(idx, { name: e.target.value })}
													className={inputCls}
												/>
											</Row>
											<Row label="Occupation *">
												<select
													value={a.occupation}
													onChange={e => updateAttorney(idx, { occupation: e.target.value })}
													className={selectCls(true)}
												>
													<option value="">Select</option>
													{lookups.attorneyOccupations.map(o => (
														<option key={o.value} value={o.value}>{o.label}</option>
													))}
												</select>
											</Row>
											<Row label="Address *">
												<textarea
													rows={2}
													value={a.address}
													onChange={e => updateAttorney(idx, { address: e.target.value })}
													className={inputCls}
												/>
											</Row>
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
});

export default CAMEquipmentBpkbPage;
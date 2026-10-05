import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import AsOfDatePickerComponent from '@/shared/components/AsOfDatePickerComponent';
import {
	type Option,
	fieldClsFor,
	NumericField,
	FieldCountControl,
	ClearButton,
	isValidMonth,
	parseDDMMYYYY,
	formatDDMMYYYY,
	currentYYYYMM,
	ManagementDetailModal,
	type ManagementDetailValue,
	emptyManagementDetail,
} from '@/features/cam/components/FormControls';

interface PengurusRow {
	name: string;
	position: string;
	owner: boolean;
	signer: boolean;
	signerEcontract: boolean;
}

interface PengawasRow {
	name: string;
	position: string;
	owner: boolean;
	signer: boolean;
}

interface DeedRow {
	deedNo: string;
	deedDate: string;
	notaryName: string;
	certificate: string;
}

interface KoperasiData {
	periodOptions: string[];
	period: string;
	hasAnyExistingPeriod: boolean;
	pengurus: PengurusRow[];
	pengawas: PengawasRow[];
	deeds: DeedRow[];
	pengurusPositions: Option[];
	certificateOptions: Option[];
	nameOptions: Option[];
	contractSignerOptions: Option[];
	contractSignerSelected: string;
	contractSignerOther: string;
	picSameAsE: boolean;
	picName: string;
	areaOptions: Option[];
	nationalityOptions: Option[];
	managementDetails: Record<string, ManagementDetailValue>;
}

export interface BusinessProfileKoperasiPageProps {
	apless: string;
	applNo: string;
	finType?: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

const DEED_TEXTAREA_START_INDEX = 7;

const cellLabel =
	"border-b border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 py-2.5 align-top text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] whitespace-nowrap";
const cellValue = "border-b border-[var(--app-border)] px-4 py-2.5 align-top text-sm text-[var(--app-text)]";

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-t border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-3 first:border-t-0">
			<h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{children}</h2>
		</div>
	);
}

function validateNewPeriodFormat(period: string): string | null {
	if (period.length !== 6 || !/^\d{6}$/.test(period)) return "Period not valid";
	const month = period.slice(4, 6);
	if (!isValidMonth(month)) return "Period not valid";
	if (Number(period.slice(0, 4)) > new Date().getFullYear()) return "Period not valid";
	if (Number(period) > currentYYYYMM()) return "Period not valid";
	return null;
}

const BusinessProfileKoperasiPage = forwardRef<CamTabHandle, BusinessProfileKoperasiPageProps>(function BusinessProfileKoperasiPage(
	{ apless, applNo, finType, custName, onSaved }, ref
) {
	const [saving, setSaving] = useState(false);
	const [formMessages, setFormMessages] = useState<string[]>([]);

	const [mode, setMode] = useState<"existing" | "new">("existing");
	const [existingPeriod, setExistingPeriod] = useState("");
	const [newPeriod, setNewPeriod] = useState("");
	const [editUnlocked, setEditUnlocked] = useState(false);
	const [loadingPeriod, setLoadingPeriod] = useState(false);

	const [pengurus, setPengurus] = useState<PengurusRow[]>([]);
	const [pengawas, setPengawas] = useState<PengawasRow[]>([]);
	const [deeds, setDeeds] = useState<DeedRow[]>([]);
	const [pengurusCountDraft, setPengurusCountDraft] = useState(0);
	const [pengawasCountDraft, setPengawasCountDraft] = useState(0);
	const [deedCountDraft, setDeedCountDraft] = useState(0);
	const [contractSignerSelected, setContractSignerSelected] = useState("");
	const [contractSignerOther, setContractSignerOther] = useState("");
	const [picSameAsE, setPicSameAsE] = useState(true);
	const [picName, setPicName] = useState("");
	const [managementDetails, setManagementDetails] = useState<Record<string, ManagementDetailValue>>({});
	const [openDetailFor, setOpenDetailFor] = useState<string | null>(null);

	const editable = mode === "new" ? newPeriod.length > 0 : editUnlocked;

	const applyLoadedData = (d: KoperasiData) => {
		setPengurus(d.pengurus);
		setPengawas(d.pengawas);
		setDeeds(d.deeds);
		setPengurusCountDraft(d.pengurus.length);
		setPengawasCountDraft(d.pengawas.length);
		setDeedCountDraft(d.deeds.length);
		setContractSignerSelected(d.contractSignerSelected);
		setContractSignerOther(d.contractSignerOther);
		setPicSameAsE(d.picSameAsE);
		setPicName(d.picName);
		setManagementDetails(d.managementDetails);
		setOpenDetailFor(null);
		if (d.period) {
			setMode("existing");
			setExistingPeriod(d.period);
		} else {
			setMode("new");
			setNewPeriod("");
		}
		setEditUnlocked(false);
	};

	const { data, isLoading: loading, isError, refetch } = useQuery({
		queryKey: ['cam-business-profile-koperasi', apless, applNo],
		queryFn: async (): Promise<KoperasiData> => {
			const res = await api.get("/CAM/EditIndex/organization-structure-koperasi", { params: { apless, applno: applNo } });
			return res.data;
		},
	});

	useEffect(() => {
		if (data) applyLoadedData(data);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	const handleExistingPeriodChange = async (period: string) => {
		setExistingPeriod(period);
		setLoadingPeriod(true);
		try {
			const res = await api.get("/CAM/EditIndex/organization-structure-koperasi", { params: { apless, applno: applNo, period } });
			applyLoadedData(res.data);
		} catch {
			setFormMessages(["Failed to load data for the selected period. Please try again."]);
		} finally {
			setLoadingPeriod(false);
		}
	};

	const handleModeChange = (m: "existing" | "new") => {
		setMode(m);
		if (m === "new") {
			setNewPeriod("");
			setPengurus([]); setPengawas([]); setDeeds([]);
			setPengurusCountDraft(0); setPengawasCountDraft(0); setDeedCountDraft(0);
			setManagementDetails({});
		}
	};

	const checkPeriodAgainstApplication = async () => {
		if (newPeriod.length !== 6) return;
		try {
			const res = await api.get("/CAM/EditIndex/organization-structure-koperasi/period-check", {
				params: { apless, applno: applNo, period: newPeriod },
			});
			if (res.data?.code === "0") {
				alert("Period in Organization Structure cannot > Period Create CAM");
				setNewPeriod("");
			} else if (res.data?.code === "9") {
				alert("Period not Valid");
				setNewPeriod("");
			}
		} catch { }
	};

	const setPengurusCount = (n: number) => setPengurus(prev => {
		const next = [...prev];
		while (next.length < n) next.push({ name: "", position: "", owner: false, signer: false, signerEcontract: false });
		return next.slice(0, Math.max(0, n));
	});
	const updatePengurus = (i: number, patch: Partial<PengurusRow>) =>
		setPengurus(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
	const clearPengurus = (i: number) => updatePengurus(i, { name: "", position: "", owner: false, signer: false, signerEcontract: false });
	const handlePengurusPositionChange = (i: number, value: string) => {
		updatePengurus(i, { position: value, signerEcontract: value ? pengurus[i].signerEcontract : false });
	};
	const handleSignerEcontractChange = (i: number, checked: boolean) => {
		setPengurus(prev => prev.map((row, idx) => ({
			...row,
			signerEcontract: idx === i ? checked : (checked ? false : row.signerEcontract),
		})));
	};

	const setPengawasCount = (n: number) => setPengawas(prev => {
		const next = [...prev];
		while (next.length < n) next.push({ name: "", position: "", owner: false, signer: false });
		return next.slice(0, Math.max(0, n));
	});
	const updatePengawas = (i: number, patch: Partial<PengawasRow>) =>
		setPengawas(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
	const clearPengawas = (i: number) => updatePengawas(i, { name: "", position: "", owner: false, signer: false });

	const setDeedCount = (n: number) => setDeeds(prev => {
		const next = [...prev];
		while (next.length < n) next.push({ deedNo: "", deedDate: "", notaryName: "", certificate: "" });
		return next.slice(0, Math.max(0, n));
	});
	const updateDeed = (i: number, patch: Partial<DeedRow>) =>
		setDeeds(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

	const managementRows: { name: string; isSigner: boolean }[] = (() => {
		const order: string[] = [];
		const byName = new Map<string, { name: string; isSigner: boolean }>();
		const scan = (rows: { name: string; signer: boolean }[]) => {
			for (const r of rows) {
				if (!r.name) continue;
				if (!byName.has(r.name)) { order.push(r.name); byName.set(r.name, { name: r.name, isSigner: r.signer }); }
				else if (r.signer) byName.get(r.name)!.isSigner = true;
			}
		};
		scan(pengurus);
		scan(pengawas);
		return order.map(name => byName.get(name)!);
	})();

	const fetchProvinceCity = useCallback(async (areaCd: string) => {
		const r = await api.get("/CAM/Combo/province-city", { params: { areaCd } });
		return { province: r.data.province || "", city: r.data.city || "" };
	}, []);
	const fetchKecamatan = useCallback(async (areaCd: string) => {
		const r = await api.get("/CAM/Combo/kecamatan", { params: { areaCd } });
		return r.data as Option[];
	}, []);
	const fetchKelurahan = useCallback(async (kecamatanCd: string) => {
		const r = await api.get("/CAM/Combo/kelurahan", { params: { kecamatanCd } });
		return r.data as Option[];
	}, []);
	const saveManagementDetail = (name: string, value: ManagementDetailValue) => {
		setManagementDetails(prev => ({ ...prev, [name]: value }));
	};

	const handleSave = useCallback(async () => {
		const period = mode === "new" ? newPeriod : existingPeriod;

		const messages: string[] = [];
		if (mode === "new") {
			const err = validateNewPeriodFormat(newPeriod);
			if (err) messages.push(err);
		} else if (!existingPeriod) {
			messages.push("Period not valid");
		}

		deeds.forEach((d, i) => {
			if (d.deedNo && !d.deedDate) messages.push(`Date of Deed number ${i + 1} must not empty`);
		});

		const pengurusRowsWithPosition = pengurus.filter(p => p.position !== "");
		const eContractSignerCount = pengurusRowsWithPosition.filter(p => p.signerEcontract).length;
		if (pengurusRowsWithPosition.length > 0 && eContractSignerCount === 0) {
			messages.push("Signer On E-Contract wajib dipilih salah satu");
		}
		if (eContractSignerCount > 1) {
			messages.push("Signer On E-Contract hanya boleh dipilih satu");
		}

		if (messages.length > 0) {
			setFormMessages(messages);
			return;
		}

		setFormMessages([]);
		setSaving(true);
		try {
			const res = await api.post("/CAM/EditIndex/organization-structure-koperasi", {
				apless,
				applno: applNo,
				period,
				isNew: mode === "new",
				pengurus,
				pengawas,
				deeds,
				contractSigner: { selected: contractSignerSelected, other: contractSignerOther },
				pic: { sameAsE: picSameAsE, name: picName },
				managementDetails,
			});
			if (res.data.success) {
				onSaved({ apless: res.data.apless ?? apless, applno: res.data.applno ?? applNo });
			} else if (res.data.messages) {
				setFormMessages(res.data.messages);
			} else {
				setFormMessages([res.data.message || "Save failed. Please try again."]);
			}
		} catch (err: any) {
			const respData = err?.response?.data;
			if (respData?.messages) setFormMessages(respData.messages);
			else if (respData?.message) setFormMessages([respData.message]);
			else setFormMessages(["Save failed. Please try again."]);
		} finally {
			setSaving(false);
		}
	}, [apless, applNo, mode, newPeriod, existingPeriod, pengurus, pengawas, deeds,
		contractSignerSelected, contractSignerOther, picSameAsE, picName, managementDetails, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

	if (loading || !data) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}
	if (isError) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
				Failed to load organization structure data. Please try again.
				<button onClick={() => refetch()} className="underline ml-4">Retry</button>
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Organization Structure — Koperasi</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>
			<div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-6">
				<p className="text-sm text-[var(--app-muted)]">Customer No. {apless || "(new)"}</p>

				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					<div className="flex flex-wrap items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-3">
						<span className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">Period</span>
						<select
							className={fieldClsFor(true)}
							style={{ width: "140px" }}
							value={mode === "existing" ? existingPeriod : "__new__"}
							onChange={e => {
								if (e.target.value === "__new__") handleModeChange("new");
								else { handleModeChange("existing"); handleExistingPeriodChange(e.target.value); }
							}}
						>
							<option value="__new__">New</option>
							{data.periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
						</select>
						{mode === "new" && (
							<NumericField value={newPeriod} onChange={setNewPeriod} onBlur={checkPeriodAgainstApplication}
								maxLength={6} placeholder="yyyymm" className={`${fieldClsFor(true)} w-24`}
							/>
						)}
						{mode === "existing" && data.hasAnyExistingPeriod && (
							<label className="ml-2 flex items-center gap-2 text-sm text-[var(--app-text)]">
								<input type="checkbox" checked={editUnlocked} onChange={e => setEditUnlocked(e.target.checked)} />
								Edit
							</label>
						)}
						{loadingPeriod && <span className="text-xs text-[var(--app-muted)]">Loading…</span>}
					</div>

					<SectionHeader>A. Composition of Board of Management / Susunan Pengurus</SectionHeader>
					<div className="px-6 py-2">
						<FieldCountControl count={pengurusCountDraft} editable={editable}
							onCountChange={setPengurusCountDraft} onGo={() => setPengurusCount(pengurusCountDraft)} />
					</div>
					<div className="overflow-x-auto px-6 pb-4">
						<table className="w-full min-w-[860px] border-collapse text-sm">
							<thead>
								<tr>
									<td className={cellLabel}>No.</td>
									<td className={cellLabel}>Name in ID Card</td>
									<td className={cellLabel}>Position</td>
									<td className={cellLabel}>Owner</td>
									<td className={cellLabel}>Signer</td>
									<td className={cellLabel}>Signer On E-Contract</td>
									<td className={cellLabel}>Action</td>
								</tr>
							</thead>
							<tbody>
								{pengurus.map((row, i) => (
									<tr key={i}>
										<td className={cellValue}>{i + 1}</td>
										<td className={cellValue}>
											<select className={fieldClsFor(editable)} disabled={!editable} value={row.name}
												onChange={e => updatePengurus(i, { name: e.target.value })}>
												<option value="">Select</option>
												{data.nameOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
										</td>
										<td className={cellValue}>
											<select className={fieldClsFor(editable)} disabled={!editable} value={row.position}
												onChange={e => handlePengurusPositionChange(i, e.target.value)}>
												<option value="">Select</option>
												{data.pengurusPositions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
										</td>
										<td className={cellValue + " text-center"}>
											<input type="checkbox" checked={row.owner} disabled={!editable}
												onChange={e => updatePengurus(i, { owner: e.target.checked })} />
										</td>
										<td className={cellValue + " text-center"}>
											<input type="checkbox" checked={row.signer} disabled={!editable}
												onChange={e => updatePengurus(i, { signer: e.target.checked })} />
										</td>
										<td className={cellValue + " text-center"}>
											<input type="checkbox" checked={row.signerEcontract} disabled={!editable || !row.position}
												onChange={e => handleSignerEcontractChange(i, e.target.checked)} />
										</td>
										<td className={cellValue + " text-center"}>
											<ClearButton visible={editable && !!row.name} onClick={() => clearPengurus(i)} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<SectionHeader>B. Composition of Board of Supervisor / Susunan Pengawas</SectionHeader>
					<div className="px-6 py-2">
						<FieldCountControl count={pengawasCountDraft} editable={editable}
							onCountChange={setPengawasCountDraft} onGo={() => setPengawasCount(pengawasCountDraft)} />
					</div>
					<div className="overflow-x-auto px-6 pb-4">
						<table className="w-full min-w-[720px] border-collapse text-sm">
							<thead>
								<tr>
									<td className={cellLabel}>No.</td>
									<td className={cellLabel}>Name in ID Card</td>
									<td className={cellLabel}>Position</td>
									<td className={cellLabel}>Owner</td>
									<td className={cellLabel}>Signer</td>
									<td className={cellLabel}>Action</td>
								</tr>
							</thead>
							<tbody>
								{pengawas.map((row, i) => (
									<tr key={i}>
										<td className={cellValue}>{i + 1}</td>
										<td className={cellValue}>
											<select className={fieldClsFor(editable)} disabled={!editable} value={row.name}
												onChange={e => updatePengawas(i, { name: e.target.value })}>
												<option value="">Select</option>
												{data.nameOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
											</select>
										</td>
										<td className={cellValue}>
											<input className={fieldClsFor(editable)} disabled={!editable} value={row.position}
												onChange={e => updatePengawas(i, { position: e.target.value })} />
										</td>
										<td className={cellValue + " text-center"}>
											<input type="checkbox" checked={row.owner} disabled={!editable}
												onChange={e => updatePengawas(i, { owner: e.target.checked })} />
										</td>
										<td className={cellValue + " text-center"}>
											<input type="checkbox" checked={row.signer} disabled={!editable}
												onChange={e => updatePengawas(i, { signer: e.target.checked })} />
										</td>
										<td className={cellValue + " text-center"}>
											<ClearButton visible={editable && !!row.name} onClick={() => clearPengawas(i)} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<SectionHeader>C. Deed of Establishment / Akta Pendirian</SectionHeader>
					<div className="px-6 py-2">
						<FieldCountControl count={deedCountDraft} editable={editable}
							onCountChange={setDeedCountDraft} onGo={() => setDeedCount(deedCountDraft)} />
					</div>
					<div className="overflow-x-auto px-6 pb-4">
						<table className="w-full min-w-[820px] border-collapse text-sm">
							<thead>
								<tr>
									<td className={cellLabel}>No.</td>
									<td className={cellLabel}>Deed No</td>
									<td className={cellLabel}>Date of Deed</td>
									<td className={cellLabel}>Notary Name</td>
									<td className={cellLabel}>Certification of Ministry of Law &amp; Human Rights</td>
								</tr>
							</thead>
							<tbody>
								{deeds.map((row, i) => (
									<tr key={i}>
										<td className={cellValue}>{i + 1}</td>
										<td className={cellValue}>
											<NumericField value={row.deedNo} editable={editable}
												onChange={v => updateDeed(i, { deedNo: v })} className={fieldClsFor(editable)} />
										</td>
										<td className={cellValue}>
											<AsOfDatePickerComponent
												label=""
												format="dd-MM-yyyy"
												placeholder="dd-mm-yyyy"
												disabled={!editable}
												value={parseDDMMYYYY(row.deedDate)}
												onChange={date => updateDeed(i, { deedDate: formatDDMMYYYY(date) })}
											/>
										</td>
										<td className={cellValue}>
											<input className={fieldClsFor(editable)} disabled={!editable}
												value={row.notaryName} onChange={e => updateDeed(i, { notaryName: e.target.value })} />
										</td>
										<td className={cellValue}>
											{i >= DEED_TEXTAREA_START_INDEX ? (
												<textarea className={fieldClsFor(editable)} disabled={!editable}
													value={row.certificate} onChange={e => updateDeed(i, { certificate: e.target.value })} />
											) : (
												<select className={fieldClsFor(editable)} disabled={!editable}
													value={row.certificate} onChange={e => updateDeed(i, { certificate: e.target.value })}>
													<option value="">Select</option>
													{data.certificateOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
												</select>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<SectionHeader>Description Table / Tabel Deskripsi</SectionHeader>
					<div className="overflow-x-auto px-6 pb-4">
						<table className="w-full min-w-[500px] border-collapse text-sm">
							<thead>
								<tr>
									<td className={cellLabel + " text-center"}>Option</td>
									<td className={cellLabel}>Certificate of Ministry of Law &amp; Human Rights</td>
								</tr>
							</thead>
							<tbody>
								{data.certificateOptions.map(o => (
									<tr key={o.value}>
										<td className={cellValue + " text-center"}>{o.value}</td>
										<td className={cellValue}>{o.label}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<SectionHeader>D. Contract Sign Follow the Article: Board of Management Roles and Authority</SectionHeader>
					<div className="px-6 py-4 space-y-2">
						{data.contractSignerOptions.map(o => (
							<label key={o.value} className="flex items-center gap-2 text-sm">
								<input type="radio" name="contractSigner" disabled={!editable} checked={contractSignerSelected === o.value}
									onChange={() => setContractSignerSelected(o.value)} />
								{o.label}
							</label>
						))}
						<div>
							<input className={fieldClsFor(editable)} disabled={!editable} value={contractSignerOther}
								onChange={e => setContractSignerOther(e.target.value)} />
							<p className="text-xs text-[var(--app-muted)] mt-1">Format : Must input in English</p>
						</div>
					</div>

					<SectionHeader>E. Person in Charge to Sign Contract</SectionHeader>
					<div className="px-6 py-4 space-y-2">
						<p className="text-sm text-[var(--app-muted)]">Apakah tanda tangan Kontrak sama antara butir D?</p>
						<label className="flex items-center gap-2 text-sm">
							<input type="radio" name="picSame" disabled={!editable} checked={picSameAsE}
								onChange={() => setPicSameAsE(true)} />
							Ya
						</label>
						<label className="flex items-center gap-2 text-sm">
							<input type="radio" name="picSame" disabled={!editable} checked={!picSameAsE}
								onChange={() => setPicSameAsE(false)} />
							Tidak, Mohon Isi Pejabat yang Akan Tanda Tangan Kontrak:
						</label>
						<div>
							<input className={fieldClsFor(editable && !picSameAsE)} disabled={!editable || picSameAsE}
								value={picName} onChange={e => setPicName(e.target.value)} />
							<p className="text-xs text-[var(--app-muted)] mt-1">Format : Must input in English</p>
						</div>
					</div>

					<SectionHeader>F. Management Detail Information</SectionHeader>
					<div className="overflow-x-auto px-6 pb-4">
						<table className="w-full min-w-[720px] border-collapse text-sm">
							<thead>
								<tr>
									<td className={cellLabel}>No.</td>
									<td className={cellLabel}>Name in ID Card</td>
									<td className={cellLabel}>ID Card</td>
									<td className={cellLabel}>Address</td>
									<td className={cellLabel}>City</td>
									<td className={cellLabel}>Detail</td>
								</tr>
							</thead>
							<tbody>
								{managementRows.map((row, i) => {
									const detail = managementDetails[row.name];
									return (
										<tr key={row.name}>
											<td className={cellValue}>{i + 1}</td>
											<td className={cellValue}>{row.name}</td>
											<td className={cellValue}>{(detail?.idCard || detail?.passportNo) || <span className="text-slate-300">—</span>}</td>
											<td className={cellValue}>{detail?.address || <span className="text-slate-300">—</span>}</td>
											<td className={cellValue}>{detail?.city || <span className="text-slate-300">—</span>}</td>
											<td className={cellValue}>
												<button type="button" onClick={() => setOpenDetailFor(row.name)}
													className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium">
													Detail
												</button>
											</td>
										</tr>
									);
								})}
								{managementRows.length === 0 && (
									<tr><td colSpan={6} className={cellValue + " text-center text-[var(--app-muted)]"}>Add Pengurus or Pengawas members above to populate this list.</td></tr>
								)}
							</tbody>
						</table>
					</div>

				</div>

				{openDetailFor && data && (() => {
					const row = managementRows.find(r => r.name === openDetailFor);
					if (!row) return null;
					return (
						<ManagementDetailModal
							open={true}
							onClose={() => setOpenDetailFor(null)}
							name={row.name}
							shareStatus=""
							value={managementDetails[row.name] ?? emptyManagementDetail}
							onSave={v => saveManagementDetail(row.name, v)}
							editable={editable}
							areaOptions={data.areaOptions}
							nationalityOptions={data.nationalityOptions}
							fetchProvinceCity={fetchProvinceCity}
							fetchKecamatan={fetchKecamatan}
							fetchKelurahan={fetchKelurahan}
							isSigner={row.isSigner}
						/>
					);
				})()}

				{saving && <p className="text-sm text-[var(--app-muted)] mt-3">Saving…</p>}

				{formMessages.length > 0 && (
					<div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
						<ul className="list-disc list-inside text-sm text-red-700 space-y-1">
							{formMessages.map((msg, i) => <li key={i}>{msg}</li>)}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
});

export default BusinessProfileKoperasiPage;
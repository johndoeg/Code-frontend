import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import {
	type Option,
	fieldClsFor,
	NumericField,
	FieldCountControl,
	ClearButton,
	isValidMonth,
	currentYYYYMM,
	ManagementDetailModal,
	type ManagementDetailValue,
	emptyManagementDetail,
} from '@/features/cam/components/FormControls';

interface ShareholderRow {
	name: string;
	status: string;
	totalShares: string;
	nominalShares: string;
	signer: boolean;
}

interface DirectorRow {
	name: string;
	bod: string;
	boc: string;
	other: string;
	owner: boolean;
	signer: boolean;
	signerEcontract: boolean;
}

interface DeedRow {
	stateNo: string;
	deedNo: string;
	deedDate: string;
	notaryName: string;
	certificate: string;
}

interface OrgStructureData {
	periodOptions: string[];
	period: string;
	hasAnyExistingPeriod: boolean;
	capital: { authorized: string; paidIn: string };
	shareholders: ShareholderRow[];
	directors: DirectorRow[];
	deeds: DeedRow[];
	certificateOptions: Option[];
	bodPositions: Option[];
	bocPositions: Option[];
	shareholderStatusOptions: Option[];
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

export interface BusinessProfilePTPageProps {
	apless: string;
	applNo: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

const BOD_OTHER_VALUE = "5";
const BOC_OTHER_VALUE = "10";

const cellLabel =
	"border-b border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 py-2.5 align-top text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] whitespace-nowrap";
const cellValue = "border-b border-[var(--app-border)] px-4 py-2.5 align-top text-sm text-[var(--app-text)]";
const errCls = "text-red-600 text-xs mt-1";

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-t border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-3 first:border-t-0">
			<h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{children}</h2>
		</div>
	);
}

function validateNewPeriodFormat(period: string): string | null {
	if (period.length !== 6 || !/^\d{6}$/.test(period)) return "Period not valid";
	const year = period.slice(0, 4);
	const month = period.slice(4, 6);
	if (!isValidMonth(month)) return "Period not valid";
	if (Number(year) > new Date().getFullYear()) return "Period not valid";
	if (Number(period) > currentYYYYMM()) return "Period not valid";
	return null;
}

const BusinessProfilePTPage = forwardRef<CamTabHandle, BusinessProfilePTPageProps>(function BusinessProfilePTPage(
	{ apless, applNo, onSaved }, ref
) {
	const [saving, setSaving] = useState(false);
	const [formMessages, setFormMessages] = useState<string[]>([]);

	const [mode, setMode] = useState<"existing" | "new">("existing");
	const [existingPeriod, setExistingPeriod] = useState("");
	const [newPeriod, setNewPeriod] = useState("");
	const [editUnlocked, setEditUnlocked] = useState(false);
	const [loadingPeriod, setLoadingPeriod] = useState(false);

	const [capital, setCapital] = useState({ authorized: "", paidIn: "" });
	const [shareholders, setShareholders] = useState<ShareholderRow[]>([]);
	const [directors, setDirectors] = useState<DirectorRow[]>([]);
	const [deeds, setDeeds] = useState<DeedRow[]>([]);
	const [shareholderCountDraft, setShareholderCountDraft] = useState(0);
	const [directorCountDraft, setDirectorCountDraft] = useState(0);
	const [deedCountDraft, setDeedCountDraft] = useState(0);
	const [contractSignerSelected, setContractSignerSelected] = useState("");
	const [contractSignerOther, setContractSignerOther] = useState("");
	const [picSameAsE, setPicSameAsE] = useState(true);
	const [picName, setPicName] = useState("");
	const [managementDetails, setManagementDetails] = useState<Record<string, ManagementDetailValue>>({});
	const [openDetailFor, setOpenDetailFor] = useState<string | null>(null);

	const editable =
		mode === "new"
			? newPeriod.length > 0
			: editUnlocked;

	const applyLoadedData = (d: OrgStructureData) => {
		setCapital(d.capital);
		setShareholders(d.shareholders);
		setDirectors(d.directors);
		setDeeds(d.deeds);
		setShareholderCountDraft(d.shareholders.length);
		setDirectorCountDraft(d.directors.length);
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
		queryKey: ['cam-business-profile-pt', apless, applNo],
		queryFn: async (): Promise<OrgStructureData> => {
			const res = await api.get("/CAM/EditIndex/organization-structure", { params: { apless, applno: applNo } });
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
			const res = await api.get("/CAM/EditIndex/organization-structure", { params: { apless, applno: applNo, period } });
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
			setCapital({ authorized: "", paidIn: "" });
			setShareholders([]);
			setDirectors([]);
			setDeeds([]);
			setShareholderCountDraft(0);
			setDirectorCountDraft(0);
			setDeedCountDraft(0);
			setManagementDetails({});
		}
	};

	const checkPeriodAgainstApplication = async () => {
		if (newPeriod.length !== 6) return;
		try {
			const res = await api.get("/CAM/EditIndex/organization-structure/period-check", {
				params: { apless, applno: applNo, period: newPeriod },
			});
			if (res.data?.valid === false) {
				alert("Period in Organization Structure cannot > Period Create CAM");
				setNewPeriod("");
			}
		} catch {}
	};

	const setShareholderCount = (n: number) => {
		setShareholders(prev => {
			const next = [...prev];
			while (next.length < n) next.push({ name: "", status: "", totalShares: "", nominalShares: "", signer: false });
			return next.slice(0, Math.max(0, n));
		});
	};
	const updateShareholder = (i: number, patch: Partial<ShareholderRow>) => {
		setShareholders(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
	};
	const clearShareholder = (i: number) => {
		updateShareholder(i, { name: "", status: "", totalShares: "", nominalShares: "" });
	};
	const paidInTotal = shareholders.reduce((sum, s) => sum + (Number(s.nominalShares.replace(/\D/g, "")) || 0), 0);
	useEffect(() => {
		setCapital(prev => ({ ...prev, paidIn: String(paidInTotal) }));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [paidInTotal]);

	const setDirectorCount = (n: number) => {
		setDirectors(prev => {
			const next = [...prev];
			while (next.length < n) next.push({ name: "", bod: "", boc: "", other: "", owner: false, signer: false, signerEcontract: false });
			return next.slice(0, Math.max(0, n));
		});
	};
	const updateDirector = (i: number, patch: Partial<DirectorRow>) => {
		setDirectors(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
	};
	const clearDirector = (i: number) => {
		updateDirector(i, { name: "", bod: "", boc: "", other: "", owner: false, signer: false, signerEcontract: false });
	};
	const handleBodChange = (i: number, value: string) => {
		updateDirector(i, { bod: value, boc: value ? "" : directors[i].boc, signerEcontract: value ? directors[i].signerEcontract : false });
	};
	const handleBocChange = (i: number, value: string) => {
		updateDirector(i, { boc: value, bod: value ? "" : directors[i].bod, signerEcontract: false });
	};
	const handleSignerEcontractChange = (i: number, checked: boolean) => {
		setDirectors(prev => prev.map((row, idx) => ({
			...row,
			signerEcontract: idx === i ? checked : (checked ? false : row.signerEcontract),
		})));
	};

	const setDeedCount = (n: number) => {
		setDeeds(prev => {
			const next = [...prev];
			while (next.length < n) next.push({ stateNo: "", deedNo: "", deedDate: "", notaryName: "", certificate: "" });
			return next.slice(0, Math.max(0, n));
		});
	};
	const updateDeed = (i: number, patch: Partial<DeedRow>) => {
		setDeeds(prev => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
	};
	const handleStateNoChange = (i: number, value: string) => {
		updateDeed(i, { stateNo: value, deedNo: value ? "" : deeds[i].deedNo });
	};
	const handleDeedNoChange = (i: number, value: string) => {
		updateDeed(i, { deedNo: value, stateNo: value ? "" : deeds[i].stateNo });
	};

	const managementRows: { name: string; shareStatus: string; isSigner: boolean }[] = (() => {
		const order: string[] = [];
		const byName = new Map<string, { name: string; shareStatus: string; isSigner: boolean }>();
		for (const s of shareholders) {
			if (!s.name) continue;
			if (!byName.has(s.name)) { order.push(s.name); byName.set(s.name, { name: s.name, shareStatus: s.status, isSigner: s.signer }); }
			else if (s.signer) byName.get(s.name)!.isSigner = true;
		}
		for (const d of directors) {
			if (!d.name) continue;
			if (!byName.has(d.name)) { order.push(d.name); byName.set(d.name, { name: d.name, shareStatus: "", isSigner: d.signer }); }
			else if (d.signer) byName.get(d.name)!.isSigner = true;
		}
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
			if (d.stateNo && !d.deedDate) messages.push(`Date of Deed number ${i + 1} must not empty`);
			if (d.stateNo && !d.certificate) messages.push(`Certification of Ministry of Law & Human Rights number ${i + 1} must not empty`);
			if (d.deedNo) {
				if (!d.deedDate) messages.push(`Date of Deed number ${i + 1} must not empty`);
				if (!d.notaryName) messages.push(`Notary Name number ${i + 1} must not empty`);
				if (!d.certificate) messages.push(`Certification of Ministry of Law & Human Rights number ${i + 1} must not empty`);
			}
		});

		const bodRows = directors.filter(d => d.bod !== "");
		const eContractSignerCount = bodRows.filter(d => d.signerEcontract).length;
		if (bodRows.length > 0 && eContractSignerCount === 0) {
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
			const res = await api.post("/CAM/EditIndex/organization-structure", {
				apless,
				applno: applNo,
				period,
				isNew: mode === "new",
				capital,
				shareholders,
				directors,
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
	}, [apless, applNo, mode, newPeriod, existingPeriod, capital, shareholders, directors, deeds,
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

	return (
		<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
			<h2 className="text-xl font-bold text-[var(--app-text)]">Organization Structure</h2>
			<p className="text-sm text-[var(--app-muted)]">Customer No. {apless || "(new)"}</p>

			<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<SectionHeader>Period (yyyymm)</SectionHeader>
				<div className="flex flex-wrap items-end gap-3 px-6 py-4">
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
						<label className="flex items-center gap-2 text-sm text-[var(--app-text)] ml-4">
							<input type="checkbox" checked={editUnlocked} onChange={e => setEditUnlocked(e.target.checked)} />
							Edit
						</label>
					)}
					{loadingPeriod && <span className="text-xs text-[var(--app-muted)]">Loading…</span>}
				</div>

				<SectionHeader>A. Capital / Modal</SectionHeader>
				<div className="px-6 py-4 space-y-3">
					<div className="flex items-center gap-2">
						<label className="text-sm text-[var(--app-muted)] w-64">Authorized Capital / Modal Dasar (Rp)</label>
						<NumericField value={capital.authorized} editable={editable}
							onChange={v => setCapital(prev => ({ ...prev, authorized: v }))}
							className={`${fieldClsFor(editable)} w-48 text-right`} />
					</div>
					<div className="flex items-center gap-2">
						<label className="text-sm text-[var(--app-muted)] w-64">Paid-In Capital / Modal Disetor (Rp)</label>
						<NumericField value={capital.paidIn} editable={false} onChange={() => { }}
							className={`${fieldClsFor(false)} w-48 text-right`} />
						<span className="text-xs text-[var(--app-muted)]">(sum of nominal shares below)</span>
					</div>
				</div>

				<SectionHeader>B. Share Holder / Susunan Pemegang Saham</SectionHeader>
				<div className="px-6 py-2">
					<FieldCountControl count={shareholderCountDraft} editable={editable}
						onCountChange={setShareholderCountDraft} onGo={() => setShareholderCount(shareholderCountDraft)} />
				</div>
				<div className="overflow-x-auto px-6 pb-4">
					<table className="w-full min-w-[820px] border-collapse text-sm">
						<thead>
							<tr>
								<td className={cellLabel}>No.</td>
								<td className={cellLabel}>Name in ID Card / Akta</td>
								<td className={cellLabel}>Status</td>
								<td className={cellLabel}>Total of Shares (Pieces)</td>
								<td className={cellLabel}>Nominal of Shares (Rp.)</td>
								<td className={cellLabel}>Signer</td>
								<td className={cellLabel}>Action</td>
							</tr>
						</thead>
						<tbody>
							{shareholders.map((row, i) => (
								<tr key={i}>
									<td className={cellValue}>{i + 1}</td>
									<td className={cellValue}>
										<select className={fieldClsFor(editable)} disabled={!editable} value={row.name}
											onChange={e => updateShareholder(i, { name: e.target.value })}>
											<option value="">Select</option>
											{data.nameOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									</td>
									<td className={cellValue}>
										<select className={fieldClsFor(editable)} disabled={!editable} value={row.status}
											onChange={e => updateShareholder(i, { status: e.target.value })}>
											<option value="">Select</option>
											{data.shareholderStatusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									</td>
									<td className={cellValue}>
										<NumericField value={row.totalShares} editable={editable}
											onChange={v => updateShareholder(i, { totalShares: v })}
											className={`${fieldClsFor(editable)} text-right`} />
									</td>
									<td className={cellValue}>
										<NumericField value={row.nominalShares} editable={editable}
											onChange={v => updateShareholder(i, { nominalShares: v })}
											className={`${fieldClsFor(editable)} text-right`} />
									</td>
									<td className={cellValue + " text-center"}>
										<input type="checkbox" checked={row.signer} disabled={!editable}
											onChange={e => updateShareholder(i, { signer: e.target.checked })} />
									</td>
									<td className={cellValue + " text-center"}>
										<ClearButton visible={editable && !!row.name} onClick={() => clearShareholder(i)} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<SectionHeader>C. Composition the Board of Directors (BOD) &amp; Board of Commissioners (BOC)</SectionHeader>
				<div className="px-6 py-2">
					<FieldCountControl count={directorCountDraft} editable={editable}
						onCountChange={setDirectorCountDraft} onGo={() => setDirectorCount(directorCountDraft)} />
				</div>
				<div className="overflow-x-auto px-6 pb-4">
					<table className="w-full min-w-[920px] border-collapse text-sm">
						<thead>
							<tr>
								<td className={cellLabel}>No.</td>
								<td className={cellLabel}>Name in ID Card</td>
								<td className={cellLabel}>BOD</td>
								<td className={cellLabel}>BOC</td>
								<td className={cellLabel}>Other</td>
								<td className={cellLabel}>Owner</td>
								<td className={cellLabel}>Signer</td>
								<td className={cellLabel}>Signer On E-Contract</td>
								<td className={cellLabel}>Action</td>
							</tr>
						</thead>
						<tbody>
							{directors.map((row, i) => (
								<tr key={i}>
									<td className={cellValue}>{i + 1}</td>
									<td className={cellValue}>
										<select className={fieldClsFor(editable)} disabled={!editable} value={row.name}
											onChange={e => updateDirector(i, { name: e.target.value })}>
											<option value="">Select</option>
											{data.nameOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									</td>
									<td className={cellValue}>
										<select className={fieldClsFor(editable && !row.boc)} disabled={!editable || !!row.boc} value={row.bod}
											onChange={e => handleBodChange(i, e.target.value)}>
											<option value="">Select</option>
											{data.bodPositions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									</td>
									<td className={cellValue}>
										<select className={fieldClsFor(editable && !row.bod)} disabled={!editable || !!row.bod} value={row.boc}
											onChange={e => handleBocChange(i, e.target.value)}>
											<option value="">Select</option>
											{data.bocPositions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									</td>
									<td className={cellValue}>
										<input className={fieldClsFor(editable)} disabled={!editable} value={row.other}
											onChange={e => updateDirector(i, { other: e.target.value })} />
									</td>
									<td className={cellValue + " text-center"}>
										<input type="checkbox" checked={row.owner} disabled={!editable}
											onChange={e => updateDirector(i, { owner: e.target.checked })} />
									</td>
									<td className={cellValue + " text-center"}>
										<input type="checkbox" checked={row.signer} disabled={!editable}
											onChange={e => updateDirector(i, { signer: e.target.checked })} />
									</td>
									<td className={cellValue + " text-center"}>
										<input type="checkbox" checked={row.signerEcontract} disabled={!editable || !row.bod}
											onChange={e => handleSignerEcontractChange(i, e.target.checked)} />
									</td>
									<td className={cellValue + " text-center"}>
										<ClearButton visible={editable && !!row.name} onClick={() => clearDirector(i)} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<SectionHeader>D. Deed of Establishment / Akta Pendirian dan Perubahannya</SectionHeader>
				<div className="px-6 py-2">
					<FieldCountControl count={deedCountDraft} editable={editable}
						onCountChange={setDeedCountDraft} onGo={() => setDeedCount(deedCountDraft)} />
				</div>
				<div className="overflow-x-auto px-6 pb-4">
					<table className="w-full min-w-[920px] border-collapse text-sm">
						<thead>
							<tr>
								<td className={cellLabel}>No.</td>
								<td className={cellLabel}>State Gazette No</td>
								<td className={cellLabel}>Deed No</td>
								<td className={cellLabel}>Date of Deed / State Gazette</td>
								<td className={cellLabel}>Notary Name</td>
								<td className={cellLabel}>Certification of Ministry of Law &amp; Human Rights</td>
							</tr>
						</thead>
						<tbody>
							{deeds.map((row, i) => (
								<tr key={i}>
									<td className={cellValue}>{i + 1}</td>
									<td className={cellValue}>
										<NumericField value={row.stateNo} editable={editable && !row.deedNo}
											onChange={v => handleStateNoChange(i, v)} className={fieldClsFor(editable && !row.deedNo)} />
									</td>
									<td className={cellValue}>
										<input className={fieldClsFor(editable && !row.stateNo)} disabled={!editable || !!row.stateNo}
											value={row.deedNo} onChange={e => handleDeedNoChange(i, e.target.value)} />
									</td>
									<td className={cellValue}>
										<input className={fieldClsFor(editable)} disabled={!editable} placeholder="dd-mm-yyyy"
											value={row.deedDate} onChange={e => updateDeed(i, { deedDate: e.target.value })} />
									</td>
									<td className={cellValue}>
										<input className={fieldClsFor(editable)} disabled={!editable}
											value={row.notaryName} onChange={e => updateDeed(i, { notaryName: e.target.value })} />
									</td>
									<td className={cellValue}>
										{i >= 8 ? (
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

				<SectionHeader>E. Contract Signer According Deed of Establishment: Board of Director's Roles and Authority</SectionHeader>
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

				<SectionHeader>F. Person in Charge to Sign Contract</SectionHeader>
				<div className="px-6 py-4 space-y-2">
					<p className="text-sm text-[var(--app-muted)]">Apakah tanda tangan Kontrak sama antara butir E?</p>
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

				<SectionHeader>G. Management Detail Information</SectionHeader>
				<div className="overflow-x-auto px-6 pb-4">
					<table className="w-full min-w-[720px] border-collapse text-sm">
						<thead>
							<tr>
								<td className={cellLabel}>No.</td>
								<td className={cellLabel}>Name in ID Card / Akta</td>
								<td className={cellLabel}>ID Card</td>
								<td className={cellLabel}>Address in ID Card / SK. Domisili</td>
								<td className={cellLabel}>City</td>
								<td className={cellLabel}>Detail</td>
							</tr>
						</thead>
						<tbody>
							{managementRows.map((row, i) => {
								const detail = managementDetails[row.name];
								const idCardSummary = row.shareStatus === "1" ? detail?.npwp : (detail?.idCard || detail?.passportNo);
								return (
									<tr key={row.name}>
										<td className={cellValue}>{i + 1}</td>
										<td className={cellValue}>{row.name}</td>
										<td className={cellValue}>{idCardSummary || <span className="text-slate-300">—</span>}</td>
										<td className={cellValue}>{(row.shareStatus === "1" ? detail?.addressNpwp : detail?.address) || <span className="text-slate-300">—</span>}</td>
										<td className={cellValue}>{(row.shareStatus === "1" ? detail?.cityNpwp : detail?.city) || <span className="text-slate-300">—</span>}</td>
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
								<tr><td colSpan={6} className={cellValue + " text-center text-[var(--app-muted)]"}>Add shareholders or directors above to populate this list.</td></tr>
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
						shareStatus={row.shareStatus}
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
	);
});

export default BusinessProfilePTPage;
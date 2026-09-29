import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from '@/shared/api/axiosInstance';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';

type CustomerType = "PR" | "PT";

interface Option { value: string; label: string; disabled?: boolean; }

interface Member {
	id_blacklist?: number;
	name: string;
	bod_position: string;
	boc_position: string;
	other: string;
	id_card: string;
	address: string;
	city: string;
	image: string;
	file?: File | null;
}

interface PpatkFile { file_nm: string; fname: string; }

const WATCHLIST_LIST_PATH = '/watchlist';
const MAX_FILE_SIZE = 2_000_000;
const MAX_PPATK_FILES = 3;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/pjpeg', 'image/x-png', 'image/png', 'image/gif'];
const BOD_OTHER_VALUE = '5';
const BOC_OTHER_VALUE = '10';
const CORSEC_REASON = '8';

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };
const selectStyle: React.CSSProperties = { colorScheme: 'light' };

const inputCls =
	"w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none transition-shadow disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)] disabled:cursor-not-allowed";
const selectCls = `${inputCls} bg-white text-[var(--app-text)]`;

const toApiDate = (d: Date | null): string => {
	if (!d || isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fromApiDate = (s: string): Date | null => (s ? new Date(`${s}T00:00:00`) : null);

const stripNpwp = (v: string) => (v || '').replace(/\D/g, '').slice(0, 16);
const formatNpwp = (v: string) => {
	const d = stripNpwp(v);
	if (!d) return "";
	const p = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 9), d.slice(9, 12), d.slice(12, 16)];
	let out = p[0];
	if (p[1]) out += `.${p[1]}`;
	if (p[2]) out += `.${p[2]}`;
	if (p[3]) out += `.${p[3]}`;
	if (p[4]) out += `-${p[4]}`;
	if (p[5]) out += `.${p[5]}`;
	return out;
};

const emptyMember = (): Member => ({
	name: "", bod_position: "", boc_position: "", other: "",
	id_card: "", address: "", city: "", image: "", file: null,
});

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
	<div>
		<label className="block text-sm font-medium text-[var(--app-text)] mb-1">
			{label}{required && <span className="text-red-500 ml-0.5">*</span>}
		</label>
		{children}
	</div>
);

const WatchlistEditPage: React.FC = () => {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const no = Number(searchParams.get('no') || 0);
	const akses = (searchParams.get('akses') || 'View').trim();

	const [customerType, setCustomerType] = useState<CustomerType>("PR");
	const [name, setName] = useState("");
	const [aliasName, setAliasName] = useState("");
	const [address, setAddress] = useState("");
	const [phone, setPhone] = useState("");
	const [npwp, setNpwp] = useState("");
	const [idCard, setIdCard] = useState("");
	const [birth, setBirth] = useState<Date | null>(null);
	const [esBirth, setEsBirth] = useState<Date | null>(null);
	const [spouseName, setSpouseName] = useState("");
	const [mother, setMother] = useState("");
	const [contactPerson, setContactPerson] = useState("");
	const [contactAddress, setContactAddress] = useState("");
	const [groupCode, setGroupCode] = useState("");
	const [reasonCategory, setReasonCategory] = useState("");
	const [reasonOther, setReasonOther] = useState("");
	const [remark, setRemark] = useState("");
	const [members, setMembers] = useState<Member[]>([]);
	const [ppatkFiles, setPpatkFiles] = useState<PpatkFile[]>([]);

	const [apless, setApless] = useState("");
	const [problemSince, setProblemSince] = useState("");
	const [createUser, setCreateUser] = useState("");
	const [createDate, setCreateDate] = useState("");
	const [lastUser, setLastUser] = useState("");
	const [lastUpdate, setLastUpdate] = useState("");

	const [reasons, setReasons] = useState<Option[]>([]);
	const [groups, setGroups] = useState<Option[]>([]);
	const [bodOptions, setBodOptions] = useState<Option[]>([]);
	const [bocOptions, setBocOptions] = useState<Option[]>([]);

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [errors, setErrors] = useState<string[]>([]);

	const memberFileRefs = useRef<(HTMLInputElement | null)[]>([]);
	const ppatkInputRef = useRef<HTMLInputElement>(null);

	const isPR = customerType === 'PR';
	const isCorsec = reasonCategory === CORSEC_REASON;
	const isView = akses !== 'Editor' || isCorsec;
	const editable = !isView && !saving;
	const categoryLocked = reasonCategory === '4' || isCorsec;

	const loadPage = useCallback(async () => {
		if (!no) { setLoadError("No record selected."); setLoading(false); return; }
		setLoading(true);
		setLoadError(null);
		try {
			const { data: d } = await api.get('/MasterData/watchlist/detail', { params: { no } });

			setCustomerType(d.customer_type === 'PT' ? 'PT' : 'PR');
			setName(d.name);
			setAliasName(d.alias_name);
			setAddress(d.address);
			setPhone(d.phone);
			setNpwp(d.npwp);
			setIdCard(d.id_card);
			setBirth(fromApiDate(d.birth));
			setEsBirth(fromApiDate(d.es_birth));
			setSpouseName(d.spouse_name);
			setMother(d.mother);
			setContactPerson(d.contact_person);
			setContactAddress(d.contact_address);
			setGroupCode(d.group_code);
			setReasonCategory(d.reason_category);
			setReasonOther(d.reason_other);
			setRemark(d.remark);
			setApless(d.apless);
			setProblemSince(d.problem_since);
			setCreateUser(d.create_user);
			setCreateDate(d.create_date);
			setLastUser(d.last_user);
			setLastUpdate(d.last_update);
			setMembers((d.members ?? []).map((m: any) => ({ ...m, file: null })));
			setPpatkFiles(d.ppatk_files ?? []);

			const [reasonsRes, groupsRes, positionsRes] = await Promise.all([
				api.get('/MasterData/watchlist/reasons', { params: { current: d.reason_category } }),
				api.get('/MasterData/watchlist/groups'),
				api.get('/MasterData/watchlist/positions'),
			]);
			setReasons(reasonsRes.data ?? []);
			setGroups((groupsRes.data ?? []).map((g: any) => ({ value: g.code, label: g.name })));
			setBodOptions(positionsRes.data.bod_options ?? []);
			setBocOptions(positionsRes.data.boc_options ?? []);
		} catch (err: any) {
			setLoadError(
				err?.response?.status === 404
					? "Record not found."
					: "Failed to load watchlist data. Please try again."
			);
		} finally {
			setLoading(false);
		}
	}, [no]);

	useEffect(() => { loadPage(); }, [loadPage]);

	const goToList = () => navigate(WATCHLIST_LIST_PATH);

	const updateMember = (index: number, patch: Partial<Member>) =>
		setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));

	const pickPosition = (index: number, field: 'bod_position' | 'boc_position', value: string) =>
		updateMember(index, field === 'bod_position'
			? { bod_position: value, boc_position: "" }
			: { boc_position: value, bod_position: "" });

	const pickMemberFile = (index: number, file: File | null) => {
		if (!file) { updateMember(index, { file: null }); return; }
		if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
			setErrors([`${file.name}: only JPEG, PNG or GIF images are allowed`]);
			return;
		}
		if (file.size > MAX_FILE_SIZE) {
			setErrors([`${file.name}: file size exceeds Maximum Upload Limit`]);
			return;
		}
		setErrors([]);
		updateMember(index, { file });
	};

	const removeMemberImage = async (index: number) => {
		const member = members[index];
		if (!member.id_blacklist) { updateMember(index, { image: "" }); return; }
		if (!window.confirm("Delete this image?")) return;
		try {
			await api.delete(`/MasterData/watchlist/management/${member.id_blacklist}/image`);
			updateMember(index, { image: "" });
		} catch {
			setErrors(["Failed to delete the image."]);
		}
	};

	const uploadPpatk = async (file: File | null) => {
		if (!file) return;
		if (!apless) { setErrors(["This record has no application number, so PPATK files cannot be attached."]); return; }
		if (file.size > MAX_FILE_SIZE) { setErrors([`${file.name}: file size exceeds 2 MB`]); return; }

		setUploading(true);
		setErrors([]);
		try {
			const fd = new FormData();
			fd.append('apless', apless);
			fd.append('fileppatk', file);
			const { data } = await api.post('/MasterData/watchlist/upload-ppatk', fd);
			setPpatkFiles((prev) => [...prev, { file_nm: data.file_nm, fname: data.fname }]);
		} catch (err: any) {
			setErrors([err?.response?.data?.error || "Upload failed."]);
		} finally {
			setUploading(false);
			if (ppatkInputRef.current) ppatkInputRef.current.value = "";
		}
	};

	const deletePpatk = async (fileNm: string) => {
		if (!window.confirm("Delete this file?")) return;
		try {
			await api.post('/MasterData/watchlist/delete-ppatk', { file_nm: fileNm, apless });
			setPpatkFiles((prev) => prev.filter((f) => f.file_nm !== fileNm));
		} catch (err: any) {
			setErrors([err?.response?.data?.error || "Delete failed."]);
		}
	};

	const validate = (): string[] => {
		const errs: string[] = [];
		if (isPR && !idCard.trim()) errs.push("ID Card must not empty");
		if (!name.trim()) errs.push("Name must not empty");
		if (!address.trim()) errs.push("Address must not empty");
		if (!reasonCategory) errs.push("Reason Category must not empty");
		if (reasonCategory === '5' && !reasonOther.trim()) errs.push("Reason Other must not empty");

		const chosen = isPR ? birth : esBirth;
		if (chosen && chosen > new Date()) errs.push("DOB / Establishment Date not valid");

		if (!isPR && !isCorsec) {
			members.forEach((m) => {
				if (m.name.trim() && !m.bod_position && !m.boc_position) {
					errs.push(`BOD or BOC position must be selected for ${m.name.trim()}`);
				}
			});
		}
		return errs;
	};

	const handleSave = async () => {
		const errs = validate();
		if (errs.length) { setErrors(errs); return; }

		setSaving(true);
		setErrors([]);
		try {
			const named = (isPR || isCorsec) ? [] : members.filter((m) => m.name.trim());

			const payload = {
				no,
				customer_type: customerType,
				name: name.trim(),
				alias_name: aliasName.trim(),
				address: address.trim(),
				phone: phone.trim(),
				npwp: stripNpwp(npwp),
				id_card: idCard.trim(),
				birth: isPR ? toApiDate(birth) : "",
				es_birth: isPR ? "" : toApiDate(esBirth),
				spouse_name: spouseName.trim(),
				mother: mother.trim(),
				contact_person: contactPerson.trim(),
				contact_address: contactAddress.trim(),
				group_code: groupCode,
				reason_category: reasonCategory,
				reason_other: reasonOther.trim(),
				remark: remark.trim(),
				members: named.map(({ file, ...rest }) => rest),
			};

			const fd = new FormData();
			fd.append('data', JSON.stringify(payload));
			named.forEach((m, i) => { if (m.file) fd.append(`member_image_${i}`, m.file); });

			await api.post('/MasterData/watchlist/update', fd);
			goToList();
		} catch (err: any) {
			const list = err?.response?.data?.errors;
			setErrors(Array.isArray(list) ? list : ["Save failed. Please try again."]);
		} finally {
			setSaving(false);
		}
	};

	const title = useMemo(
		() => (isView ? "Watchlist Detail" : "Edit Watchlist"),
		[isView]
	);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[var(--app-surface)]">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto space-y-6">

				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
						<div>
							<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">{title}</h1>
							<p className="text-[var(--app-muted)] mt-1 text-sm">
								{isView ? "Read-only view of a watchlisted customer" : "Individual (PR) or Corporate (PT) customer"}
							</p>
						</div>
						<div className="flex items-center gap-2 self-start">
							<span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
								No. {no}
							</span>
							{apless && (
								<span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-mono">
									{apless}
								</span>
							)}
						</div>
					</div>

					{loadError && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
							{loadError}
							<button onClick={loadPage} className="ml-4 underline text-red-900">Retry</button>
							<button onClick={goToList} className="ml-4 underline text-red-900">Back to list</button>
						</div>
					)}

					{errors.length > 0 && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
							<ul className="list-disc list-inside space-y-1">
								{errors.map((e, i) => <li key={i} className="text-sm text-red-600">{e}</li>)}
							</ul>
						</div>
					)}

					{isCorsec && (
						<div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
							This entry was created by Corporate Secretary from an application and is read-only.
						</div>
					)}

					<div className="mb-6">
						<label className="block text-sm font-medium text-[var(--app-text)] mb-2">Customer Type</label>
						<div className="flex gap-6">
							{(["PR", "PT"] as CustomerType[]).map((t) => (
								<label key={t} className="flex items-center gap-2 text-sm opacity-60">
									<input type="radio" checked={customerType === t} disabled readOnly className="accent-amber-600" />
									{t === "PR" ? "Individual" : "Corporate"}
								</label>
							))}
						</div>
						<p className="text-xs text-[var(--app-muted)] mt-1">Customer type cannot be changed after creation.</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field label="Name" required>
							<input type="text" value={name} disabled={!editable}
								onChange={(e) => setName(e.target.value)} className={inputCls} />
						</Field>

						{isPR && (
							<Field label="Alias Name">
								<input type="text" value={aliasName} disabled={!editable}
									onChange={(e) => setAliasName(e.target.value)} className={inputCls} />
							</Field>
						)}

						<Field label="Address" required>
							<textarea value={address} rows={2} disabled={!editable}
								onChange={(e) => setAddress(e.target.value)} className={`${inputCls} resize-none`} />
						</Field>

						<Field label="Phone">
							<input type="text" inputMode="numeric" value={phone} disabled={!editable}
								onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className={inputCls} />
						</Field>

						{isPR && (
							<Field label="ID Card No." required>
								<input type="text" inputMode="numeric" value={idCard} disabled={!editable}
									onChange={(e) => setIdCard(e.target.value.replace(/\D/g, ''))} className={inputCls} />
							</Field>
						)}

						<Field label="NPWP">
							<input type="text" value={formatNpwp(npwp)} disabled={!editable}
								onChange={(e) => setNpwp(stripNpwp(e.target.value))}
								placeholder="00.000.000.0-000.000" className={inputCls} />
						</Field>

						{isPR ? (
							<>
								<AsOfDatePicker
									label="Date of Birth"
									format="DD-MM-YYYY"
									placeholder="dd-mm-yyyy"
									maxDate={new Date()}
									disabled={!editable}
									value={birth}
									onChange={(d: Date | null) => setBirth(d)}
								/>
								<Field label="Spouse Name">
									<input type="text" value={spouseName} disabled={!editable}
										onChange={(e) => setSpouseName(e.target.value)} className={inputCls} />
								</Field>
								<Field label="Mother's Maiden Name">
									<input type="text" value={mother} disabled={!editable}
										onChange={(e) => setMother(e.target.value)} className={inputCls} />
								</Field>
							</>
						) : (
							<>
								<AsOfDatePicker
									label="Establishment Date"
									format="DD-MM-YYYY"
									placeholder="dd-mm-yyyy"
									maxDate={new Date()}
									disabled={!editable}
									value={esBirth}
									onChange={(d: Date | null) => setEsBirth(d)}
								/>
								<Field label="Contact Person">
									<input type="text" value={contactPerson} disabled={!editable}
										onChange={(e) => setContactPerson(e.target.value)} className={inputCls} />
								</Field>
								<Field label="Contact Address">
									<textarea value={contactAddress} rows={2} disabled={!editable}
										onChange={(e) => setContactAddress(e.target.value)} className={`${inputCls} resize-none`} />
								</Field>
								<Field label="Group">
									<select value={groupCode} disabled={!editable} style={selectStyle}
										onChange={(e) => setGroupCode(e.target.value)} className={selectCls}>
										<option value="" style={optionStyle}>— Select —</option>
										{groups.map((g) => (
											<option key={g.value} value={g.value} style={optionStyle}>{g.label}</option>
										))}
									</select>
								</Field>
							</>
						)}

						<Field label="Reason" required>
							<select value={reasonCategory} disabled={!editable || categoryLocked} style={selectStyle}
								onChange={(e) => setReasonCategory(e.target.value)} className={selectCls}>
								<option value="" style={optionStyle}>— Select reason —</option>
								{reasons.map((r) => (
									<option key={r.value} value={r.value}
										disabled={r.disabled && r.value !== reasonCategory} style={optionStyle}>
										{r.label}
									</option>
								))}
							</select>
						</Field>

						{reasonCategory === '5' && (
							<Field label="Reason Other" required>
								<textarea value={reasonOther} rows={2} disabled={!editable}
									onChange={(e) => setReasonOther(e.target.value)} className={`${inputCls} resize-none`} />
							</Field>
						)}

						<Field label="Remark">
							<textarea value={remark} rows={2} disabled={!editable}
								onChange={(e) => setRemark(e.target.value)} className={`${inputCls} resize-none`} />
						</Field>

						<Field label="Problem Since">
							<input type="text" value={problemSince} disabled className={inputCls} />
						</Field>
						<Field label="Create By">
							<input type="text" value={createUser} disabled className={inputCls} />
						</Field>
						<Field label="Create Date">
							<input type="text" value={createDate} disabled className={inputCls} />
						</Field>
						<Field label="Last Update By">
							<input type="text" value={lastUser ? `${lastUser} (${lastUpdate})` : ""} disabled className={inputCls} />
						</Field>
					</div>
				</div>

				{apless && (
					<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
						<div className="flex items-center justify-between mb-4">
							<div>
								<h2 className="text-lg font-bold text-[var(--app-text)]">PPATK Documents</h2>
								<p className="text-[var(--app-muted)] text-sm mt-0.5">
									Up to {MAX_PPATK_FILES} files, max 2 MB each (PDF, Word, Excel, image).
								</p>
							</div>
							{!isView && ppatkFiles.length < MAX_PPATK_FILES && (
								<>
									<input
										ref={ppatkInputRef}
										type="file"
										className="hidden"
										accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
										onChange={(e) => uploadPpatk(e.target.files?.[0] || null)}
									/>
									<button
										onClick={() => ppatkInputRef.current?.click()}
										disabled={uploading}
										className="border border-[var(--app-border)] px-4 py-2 rounded-lg text-sm hover:bg-[var(--app-surface)] transition-colors disabled:opacity-60"
									>
										{uploading ? "Uploading…" : "+ Add file"}
									</button>
								</>
							)}
						</div>

						{ppatkFiles.length === 0 ? (
							<p className="text-sm text-[var(--app-muted)]">No PPATK documents attached</p>
						) : (
							<ul className="divide-y divide-[var(--app-border)] rounded-xl border border-[var(--app-border)]">
								{ppatkFiles.map((f) => (
									<li key={f.file_nm} className="flex items-center justify-between px-4 py-3">
										<a
											href={`/MasterData/watchlist/ppatk?apless=${encodeURIComponent(apless)}&file_nm=${encodeURIComponent(f.file_nm)}`}
											target="_blank"
											rel="noreferrer"
											className="text-sm text-blue-600 underline break-all"
										>
											{f.fname}
										</a>
										{!isView && (
											<button onClick={() => deletePpatk(f.file_nm)}
												className="text-xs text-red-500 hover:text-red-700 ml-4 shrink-0">
												Delete
											</button>
										)}
									</li>
								))}
							</ul>
						)}
					</div>
				)}

				{!isPR && !isCorsec && (
					<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
						<div className="mb-4">
							<h2 className="text-lg font-bold text-[var(--app-text)]">Composition of BOD / BOC</h2>
							<p className="text-[var(--app-muted)] text-sm mt-0.5">
								Each person needs a BOD or BOC position. Images max 2 MB (JPEG, PNG, GIF).
							</p>
						</div>

						<div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
							<table className="w-full">
								<thead className="bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-surface-alt)]">
									<tr>
										{["No.", "Name", "BOD", "BOC", "Other", "ID Card", "Address", "City", "Image", ""].map((h) => (
											<th key={h} className="py-3 px-3 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody className="divide-y divide-[var(--app-border)]">
									{members.length === 0 ? (
										<tr>
											<td colSpan={10} className="py-8 text-center text-[var(--app-muted)] text-sm">
												No composition recorded
											</td>
										</tr>
									) : members.map((m, i) => (
										<tr key={m.id_blacklist ?? `new-${i}`} className="align-top">
											<td className="py-2 px-3 text-sm text-[var(--app-muted)]">{i + 1}</td>
											<td className="py-2 px-3">
												<input type="text" value={m.name} disabled={!editable}
													onChange={(e) => updateMember(i, { name: e.target.value })}
													className={`${inputCls} min-w-[10rem]`} />
											</td>
											<td className="py-2 px-3">
												<select value={m.bod_position} disabled={!editable || !!m.boc_position}
													style={selectStyle}
													onChange={(e) => pickPosition(i, 'bod_position', e.target.value)}
													className={`${selectCls} min-w-[9rem]`}>
													<option value="" style={optionStyle}>Select</option>
													{bodOptions.map((p) => (
														<option key={p.value} value={p.value} style={optionStyle}>{p.label}</option>
													))}
												</select>
											</td>
											<td className="py-2 px-3">
												<select value={m.boc_position} disabled={!editable || !!m.bod_position}
													style={selectStyle}
													onChange={(e) => pickPosition(i, 'boc_position', e.target.value)}
													className={`${selectCls} min-w-[9rem]`}>
													<option value="" style={optionStyle}>Select</option>
													{bocOptions.map((p) => (
														<option key={p.value} value={p.value} style={optionStyle}>{p.label}</option>
													))}
												</select>
											</td>
											<td className="py-2 px-3">
												<input type="text" value={m.other}
													disabled={!editable || !(m.bod_position === BOD_OTHER_VALUE || m.boc_position === BOC_OTHER_VALUE)}
													onChange={(e) => updateMember(i, { other: e.target.value })}
													className={`${inputCls} min-w-[8rem]`} />
											</td>
											<td className="py-2 px-3">
												<input type="text" inputMode="numeric" value={m.id_card} disabled={!editable}
													onChange={(e) => updateMember(i, { id_card: e.target.value.replace(/\D/g, '') })}
													className={`${inputCls} min-w-[9rem]`} />
											</td>
											<td className="py-2 px-3">
												<textarea value={m.address} rows={2} disabled={!editable}
													onChange={(e) => updateMember(i, { address: e.target.value })}
													className={`${inputCls} min-w-[10rem] resize-none`} />
											</td>
											<td className="py-2 px-3">
												<input type="text" value={m.city} disabled={!editable}
													onChange={(e) => updateMember(i, { city: e.target.value })}
													className={`${inputCls} min-w-[8rem]`} />
											</td>
											<td className="py-2 px-3 min-w-[12rem]">
												{m.image && (
													<div className="flex items-center gap-2 mb-1">
														<a
															href={`/MasterData/watchlist/management/${m.id_blacklist}/image`}
															target="_blank"
															rel="noreferrer"
															className="text-xs text-blue-600 underline break-all"
														>
															{m.image}
														</a>
														{editable && (
															<button onClick={() => removeMemberImage(i)}
																className="text-xs text-red-500 hover:text-red-700">Delete</button>
														)}
													</div>
												)}
												{editable && (
													<>
														<input
															ref={(el) => { memberFileRefs.current[i] = el; }}
															type="file"
															className="hidden"
															accept=".jpg,.jpeg,.png,.gif"
															onChange={(e) => pickMemberFile(i, e.target.files?.[0] || null)}
														/>
														<button onClick={() => memberFileRefs.current[i]?.click()}
															className="text-xs border border-[var(--app-border)] rounded-md px-2 py-1 hover:bg-[var(--app-surface)]">
															{m.file ? m.file.name : "Choose image"}
														</button>
													</>
												)}
											</td>
											<td className="py-2 px-3">
												{editable && (
													<button
														onClick={() => setMembers((prev) => prev.filter((_, idx) => idx !== i))}
														className="text-xs text-red-500 hover:text-red-700"
													>
														Remove
													</button>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						{editable && (
							<button
								onClick={() => setMembers((prev) => [...prev, emptyMember()])}
								className="mt-4 border border-[var(--app-border)] px-4 py-2 rounded-lg text-sm hover:bg-[var(--app-surface)] transition-colors"
							>
								+ Add person
							</button>
						)}
					</div>
				)}

				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg px-6 py-4 flex justify-end gap-3">
					<button onClick={goToList} disabled={saving}
						className="px-5 py-2 border border-[var(--app-border)] rounded-lg text-sm text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors">
						{isView ? "Back" : "Cancel"}
					</button>
					{!isView && (
						<button onClick={handleSave} disabled={saving}
							className={`px-5 py-2 rounded-lg text-sm text-white font-medium transition-colors ${saving ? "bg-amber-400 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-700"}`}>
							{saving ? "Saving…" : "Save"}
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default WatchlistEditPage;
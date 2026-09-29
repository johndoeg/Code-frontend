import React, { useEffect, useState } from "react";
import api from '@/shared/api/axiosInstance';
import AsOfDatePicker from '@/shared/components/AsOfDatePickerComponent';

type CustomerType = "PR" | "PT";

const BOD_OS_CODE = 'PT02';
const BOC_OS_CODE = 'PT03';
const BOD_OTHER_VALUE = '5';
const BOC_OTHER_VALUE = '10';
const LOCKED_REASONS = ['4', '8'];
const MAX_FILE_SIZE = 2_000_000;
const IMAGE_TYPES = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/x-png', 'image/gif'];

interface ApiMember {
	id_blacklist: number;
	os_code: string;
	name: string;
	bod_position: string;
	boc_position: string;
	other: string;
	id_card: string;
	address: string;
	city: string;
	image: string;
}

interface MemberRow {
	key: string;
	id_blacklist: number | null;
	name: string;
	bod_position: string;
	boc_position: string;
	other: string;
	id_card: string;
	address: string;
	city: string;
	image: string;
	file: File | null;
}

interface EditForm {
	name: string;
	alias_name: string;
	address: string;
	phone: string;
	id_card: string;
	birth: string;
	spouse_name: string;
	mother: string;
	npwp: string;
	contact_person: string;
	contact_address: string;
	group_code: string;
	es_birth: string;
	reason_category: string;
	reason_other: string;
	remark: string;
}

interface Reason { value: string; label: string; disabled: boolean; }
interface Option { value: string; label: string; }
interface Group { code: string; name: string; }

interface Props {
	no: number;
	groups: Group[];
	onClose: () => void;
	onSaved: () => void;
}

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };
const selectStyle: React.CSSProperties = { colorScheme: 'light' };
const inputCls =
	"w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent focus:outline-none transition-shadow disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)]";
const selectCls = `${inputCls} bg-white text-[var(--app-text)]`;

let rowSeq = 0;
const newKey = () => `m${++rowSeq}`;

function parseISODate(value: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || "").trim());
	if (!m) return null;
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

function formatISODate(date: Date | null): string {
	if (!date) return "";
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const emptyMember = (): MemberRow => ({
	key: newKey(), id_blacklist: null, name: "", bod_position: "", boc_position: "",
	other: "", id_card: "", address: "", city: "", image: "", file: null,
});

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
	<div>
		<label className="block text-sm font-medium text-[var(--app-text)] mb-1">
			{label}{required && <span className="text-red-500 ml-0.5">*</span>}
		</label>
		{children}
	</div>
);

const WatchlistEditModal: React.FC<Props> = ({ no, groups, onClose, onSaved }) => {
	const [custType, setCustType] = useState<CustomerType>("PR");
	const [storedCategory, setStoredCategory] = useState("");
	const [form, setForm] = useState<EditForm | null>(null);
	const [members, setMembers] = useState<MemberRow[]>([]);
	const [reasons, setReasons] = useState<Reason[]>([]);
	const [bodOptions, setBodOptions] = useState<Option[]>([]);
	const [bocOptions, setBocOptions] = useState<Option[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [errors, setErrors] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setLoadError("");
			try {
				const { data } = await api.get('/MasterData/watchlist/detail', { params: { no } });
				if (cancelled) return;

				const category = String(data.reason_category || "").trim();
				setCustType(data.customer_type);
				setStoredCategory(category);
				setForm({
					name: data.name, alias_name: data.alias_name, address: data.address, phone: data.phone,
					id_card: data.id_card, birth: data.birth, spouse_name: data.spouse_name, mother: data.mother,
					npwp: data.npwp, contact_person: data.contact_person, contact_address: data.contact_address,
					group_code: data.group_code, es_birth: data.es_birth, reason_category: category,
					reason_other: data.reason_other, remark: data.remark,
				});
				setMembers(
					(data.members || [])
						.filter((m: ApiMember) => m.os_code === BOD_OS_CODE || m.os_code === BOC_OS_CODE)
						.map((m: ApiMember) => ({
							key: newKey(), id_blacklist: m.id_blacklist, name: m.name,
							bod_position: String(m.bod_position || ""), boc_position: String(m.boc_position || ""),
							other: m.other, id_card: m.id_card, address: m.address, city: m.city,
							image: m.image, file: null,
						}))
				);

				const [r, p] = await Promise.all([
					api.get('/MasterData/watchlist/reasons', { params: { current: category } }),
					data.customer_type === 'PT'
						? api.get('/MasterData/watchlist/positions')
						: Promise.resolve({ data: { bod_options: [], boc_options: [] } }),
				]);
				if (cancelled) return;
				setReasons(r.data || []);
				const toOpt = (o: { value: unknown; label: string }) => ({ value: String(o.value), label: o.label });
				setBodOptions((p.data.bod_options || []).map(toOpt));
				setBocOptions((p.data.boc_options || []).map(toOpt));
			} catch (err: any) {
				if (!cancelled) setLoadError(err?.response?.data?.error || "Failed to load watchlist data.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, [no]);

	const setField = (field: keyof EditForm, value: string) =>
		setForm(f => (f ? { ...f, [field]: value } : f));

	const updateMember = (idx: number, patch: Partial<MemberRow>) =>
		setMembers(ms => ms.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

	const removeMember = (idx: number) => setMembers(ms => ms.filter((_, i) => i !== idx));

	const handleMemberFile = (idx: number, file: File | null) => {
		if (file && !IMAGE_TYPES.includes(file.type)) {
			setErrors([`${file.name}: only JPEG, PNG or GIF images are allowed`]);
			return;
		}
		if (file && file.size > MAX_FILE_SIZE) {
			setErrors([`${file.name}: file size exceeds Maximum Upload Limit`]);
			return;
		}
		updateMember(idx, { file });
	};

	const openStoredImage = async (id: number) => {
		const win = window.open("", "_blank");
		try {
			const res = await api.get(`/MasterData/watchlist/management/${id}/image`, { responseType: 'blob' });
			const url = URL.createObjectURL(res.data);
			if (win) win.location.href = url; else window.open(url, "_blank");
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} catch {
			win?.close();
			setErrors(["Image could not be opened."]);
		}
	};

	const deleteStoredImage = async (idx: number, id: number) => {
		if (!window.confirm("Delete this image?")) return;
		try {
			await api.delete(`/MasterData/watchlist/management/${id}/image`);
			updateMember(idx, { image: "" });
		} catch (err: any) {
			setErrors([err?.response?.data?.error || "Failed to delete image."]);
		}
	};

	const validate = (f: EditForm): string[] => {
		const errs: string[] = [];
		if (custType === "PR" && !f.id_card.trim()) errs.push("ID Card must not empty");
		if (!f.name.trim()) errs.push("Name must not empty");
		if (!f.address.trim()) errs.push("Address must not empty");
		if (!f.reason_category) errs.push("Reason Category must not empty");
		if (f.reason_category === "5" && !f.reason_other.trim()) errs.push("Reason Other must not empty");
		if (custType === "PT" && !f.npwp.trim()) errs.push("NPWP must not be empty");
		if (custType === "PT") {
			members.forEach(m => {
				if (m.name.trim() && !m.bod_position && !m.boc_position)
					errs.push(`BOD or BOC position must be selected for ${m.name.trim()}`);
			});
		}
		return errs;
	};

	const handleSave = async () => {
		if (!form) return;
		const errs = validate(form);
		if (errs.length) { setErrors(errs); return; }

		setSaving(true);
		setErrors([]);
		try {
			const payload = {
				no,
				...form,
				members: custType === "PT"
					? members.map(({ key, file, id_blacklist, ...rest }) => rest)
					: [],
			};
			const fd = new FormData();
			fd.append("data", JSON.stringify(payload));
			if (custType === "PT") {
				members.forEach((m, i) => { if (m.file) fd.append(`member_image_${i}`, m.file); });
			}
			await api.post('/MasterData/watchlist/update', fd);
			onSaved();
		} catch (err: any) {
			const e = err?.response?.data?.errors;
			setErrors(Array.isArray(e) ? e : ["Update failed. Please try again."]);
		} finally {
			setSaving(false);
		}
	};

	const reasonLocked = LOCKED_REASONS.includes(storedCategory);

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
			<div className="bg-[var(--app-card)] rounded-2xl shadow-2xl w-full max-w-5xl my-8">

				<div className="flex justify-between items-center px-6 py-5 border-b">
					<div>
						<h2 className="text-xl font-bold text-[var(--app-text)]">Edit Watchlist Entry</h2>
						<p className="text-sm text-[var(--app-muted)] mt-0.5">{form?.name || "\u00a0"}</p>
					</div>
					<button onClick={onClose} className="text-[var(--app-muted)] hover:text-[var(--app-text)] text-2xl leading-none">×</button>
				</div>

				<div className="p-6">
					{errors.length > 0 && (
						<div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex justify-between gap-3">
							<ul className="list-disc pl-4 m-0">
								{errors.map((e, i) => <li key={i} className="text-sm text-red-600">{e}</li>)}
							</ul>
							<button onClick={() => setErrors([])} className="text-red-600 text-lg leading-none">×</button>
						</div>
					)}

					{loading ? (
						<div className="py-16 flex justify-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
						</div>
					) : loadError ? (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">{loadError}</div>
					) : form && (
						<>
							<div className="mb-6 flex items-center gap-3">
								<span className="text-sm font-semibold text-[var(--app-text)]">Customer Type</span>
								<span
									style={{
										fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
										background: custType === "PR" ? "#dbeafe" : "#fef3c7",
										color: custType === "PR" ? "#1e40af" : "#92400e",
									}}
								>
									{custType === "PR" ? "Individual" : "Corporate"}
								</span>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
								<div className="space-y-4">
									<h3 className="text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">
										{custType === "PR" ? "Personal Information" : "Company Information"}
									</h3>

									<Field label="Name" required>
										<input type="text" value={form.name} onChange={e => setField("name", e.target.value)} className={inputCls} />
									</Field>

									{custType === "PR" && (
										<Field label="Alias Name">
											<input type="text" value={form.alias_name} onChange={e => setField("alias_name", e.target.value)} className={inputCls} />
										</Field>
									)}

									<Field label="Address" required>
										<textarea value={form.address} onChange={e => setField("address", e.target.value)} className={`${inputCls} resize-none`} rows={3} />
									</Field>

									<Field label="Phone">
										<input type="tel" value={form.phone} onChange={e => setField("phone", e.target.value.replace(/\D/g, ""))} className={inputCls} />
									</Field>

									{custType === "PR" ? (
										<>
											<Field label="ID Card No." required>
												<input type="text" value={form.id_card} maxLength={16}
													onChange={e => setField("id_card", e.target.value.replace(/\D/g, ""))} className={inputCls} />
											</Field>
											<AsOfDatePicker
												label="Date of Birth" format="DD-MM-YYYY" placeholder="dd-mm-yyyy" maxDate={new Date()}
												value={parseISODate(form.birth)} onChange={d => setField("birth", formatISODate(d))}
											/>
											<Field label="NPWP">
												<input type="text" value={form.npwp} maxLength={16}
													onChange={e => setField("npwp", e.target.value.replace(/\D/g, ""))} className={inputCls} />
											</Field>
											<Field label="Spouse Name">
												<input type="text" value={form.spouse_name} onChange={e => setField("spouse_name", e.target.value)} className={inputCls} />
											</Field>
											<Field label="Mother's Maiden Name">
												<input type="text" value={form.mother} onChange={e => setField("mother", e.target.value)} className={inputCls} />
											</Field>
										</>
									) : (
										<>
											<Field label="NPWP" required>
												<input type="text" value={form.npwp} maxLength={16}
													onChange={e => setField("npwp", e.target.value.replace(/\D/g, ""))} className={inputCls} />
											</Field>
											<AsOfDatePicker
												label="Establishment Date" format="DD-MM-YYYY" placeholder="dd-mm-yyyy" maxDate={new Date()}
												value={parseISODate(form.es_birth)} onChange={d => setField("es_birth", formatISODate(d))}
											/>
										</>
									)}
								</div>

								<div className="space-y-4">
									<h3 className="text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">
										{custType === "PT" ? "Contact Person" : "Case Information"}
									</h3>

									{custType === "PT" && (
										<>
											<Field label="Contact Person Name">
												<input type="text" value={form.contact_person} onChange={e => setField("contact_person", e.target.value)} className={inputCls} />
											</Field>
											<Field label="Contact Person Address">
												<textarea value={form.contact_address} onChange={e => setField("contact_address", e.target.value)} className={`${inputCls} resize-none`} rows={3} />
											</Field>
											<Field label="Group">
												<select value={form.group_code} onChange={e => setField("group_code", e.target.value)} style={selectStyle} className={selectCls}>
													<option value="" style={optionStyle}>— Select —</option>
													{groups.map(g => <option key={g.code} value={g.code} style={optionStyle}>{g.name}</option>)}
												</select>
											</Field>
										</>
									)}

									<Field label="Reason" required>
										<select
											value={form.reason_category}
											onChange={e => setField("reason_category", e.target.value)}
											disabled={reasonLocked}
											style={selectStyle}
											className={selectCls}
										>
											<option value="" style={optionStyle}>— Select reason —</option>
											{reasons.map(r => (
												<option key={r.value} value={r.value} disabled={r.disabled} style={optionStyle}>{r.label}</option>
											))}
										</select>
									</Field>

									{form.reason_category === "5" && (
										<Field label="Reason Other" required>
											<textarea value={form.reason_other} onChange={e => setField("reason_other", e.target.value)} className={`${inputCls} resize-none`} rows={2} />
										</Field>
									)}

									<Field label="Remark">
										<textarea value={form.remark} onChange={e => setField("remark", e.target.value)} className={`${inputCls} resize-none`} rows={3} maxLength={1000} />
									</Field>
								</div>
							</div>

							{custType === "PT" && (
								<div className="mt-8">
									<div className="flex items-center justify-between mb-3">
										<h3 className="text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">
											Composition of BOD / BOC &amp; Management Detail
										</h3>
										<button
											type="button"
											onClick={() => setMembers(ms => [...ms, emptyMember()])}
											className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
										>
											+ Add Member
										</button>
									</div>

									{members.length === 0 ? (
										<div className="text-sm text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-lg p-6 text-center">
											No members
										</div>
									) : (
										<div className="space-y-3">
											{members.map((m, idx) => {
												const otherEnabled = m.bod_position === BOD_OTHER_VALUE || m.boc_position === BOC_OTHER_VALUE;
												return (
													<div key={m.key} className="border border-[var(--app-border)] rounded-xl p-4">
														<div className="flex justify-between items-center mb-3">
															<span className="text-sm font-semibold text-[var(--app-text)]">#{idx + 1}</span>
															<button type="button" onClick={() => removeMember(idx)} className="text-red-500 hover:text-red-700 text-xs">
																Remove
															</button>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
															<Field label="Name">
																<input type="text" value={m.name} onChange={e => updateMember(idx, { name: e.target.value })} className={inputCls} />
															</Field>
															<Field label="BOD">
																<select
																	value={m.bod_position}
																	disabled={!!m.boc_position}
																	onChange={e => updateMember(idx, {
																		bod_position: e.target.value,
																		other: e.target.value === BOD_OTHER_VALUE ? m.other : "",
																	})}
																	style={selectStyle}
																	className={selectCls}
																>
																	<option value="" style={optionStyle}>Select</option>
																	{bodOptions.map(o => <option key={o.value} value={o.value} style={optionStyle}>{o.label}</option>)}
																</select>
															</Field>
															<Field label="BOC">
																<select
																	value={m.boc_position}
																	disabled={!!m.bod_position}
																	onChange={e => updateMember(idx, {
																		boc_position: e.target.value,
																		other: e.target.value === BOC_OTHER_VALUE ? m.other : "",
																	})}
																	style={selectStyle}
																	className={selectCls}
																>
																	<option value="" style={optionStyle}>Select</option>
																	{bocOptions.map(o => <option key={o.value} value={o.value} style={optionStyle}>{o.label}</option>)}
																</select>
															</Field>
															<Field label="Other">
																<input type="text" value={m.other} disabled={!otherEnabled}
																	onChange={e => updateMember(idx, { other: e.target.value })} className={inputCls} />
															</Field>
															<Field label="ID Card">
																<input type="text" value={m.id_card} onChange={e => updateMember(idx, { id_card: e.target.value })} className={inputCls} />
															</Field>
															<Field label="Address">
																<input type="text" value={m.address} onChange={e => updateMember(idx, { address: e.target.value })} className={inputCls} />
															</Field>
															<Field label="City">
																<input type="text" value={m.city} onChange={e => updateMember(idx, { city: e.target.value })} className={inputCls} />
															</Field>
															<Field label="Image (max 2 MB)">
																{m.image && !m.file && m.id_blacklist !== null ? (
																	<div className="flex items-center gap-2 flex-wrap">
																		<button type="button" onClick={() => openStoredImage(m.id_blacklist!)}
																			className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-md text-xs">View</button>
																		<button type="button" onClick={() => deleteStoredImage(idx, m.id_blacklist!)}
																			className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-xs">Delete</button>
																		<label className="text-xs text-blue-600 hover:underline cursor-pointer">
																			Replace
																			<input type="file" className="hidden" accept=".jpg,.jpeg,.png,.gif"
																				onChange={e => handleMemberFile(idx, e.target.files?.[0] || null)} />
																		</label>
																	</div>
																) : m.file ? (
																	<div className="flex items-center gap-2 text-xs">
																		<span className="truncate max-w-[140px]" title={m.file.name}>{m.file.name}</span>
																		<button type="button" onClick={() => updateMember(idx, { file: null })}
																			className="text-red-500 hover:text-red-700">Remove</button>
																	</div>
																) : (
																	<input type="file" accept=".jpg,.jpeg,.png,.gif"
																		onChange={e => handleMemberFile(idx, e.target.files?.[0] || null)}
																		className="text-xs w-full" />
																)}
															</Field>
														</div>
													</div>
												);
											})}
										</div>
									)}
								</div>
							)}
						</>
					)}
				</div>

				<div className="flex justify-end gap-3 px-6 py-4 border-t bg-[var(--app-surface)] rounded-b-2xl">
					<button
						onClick={onClose}
						className="px-5 py-2 border border-[var(--app-border)] rounded-lg text-sm text-[var(--app-text)] hover:bg-[var(--app-surface-alt)] transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						disabled={saving || loading || !!loadError}
						className={`px-6 py-2 rounded-lg text-sm text-white font-medium transition-colors ${saving ? "bg-amber-400 cursor-not-allowed" : "bg-amber-600 hover:bg-amber-700"}`}
					>
						{saving ? "Saving…" : "Save Changes"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default WatchlistEditModal;
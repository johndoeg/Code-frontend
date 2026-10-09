import React, { useEffect, useState } from "react";
import api from '@/shared/api/axiosInstance';

type CustomerType = "PR" | "PT";

const BOD_OS_CODE = 'PT02';
const BOC_OS_CODE = 'PT03';
const BOD_OTHER_VALUE = '5';
const BOC_OTHER_VALUE = '10';
const CORSEC_REASON = '8';

const NPWP_SEGMENTS = [2, 3, 3, 1, 3, 4];
const NPWP_SEPS = ['.', '.', '.', '-', '.'];

interface Member {
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

interface PpatkFile { file_nm: string; fname: string; }

interface Detail {
	no: number;
	customer_type: CustomerType;
	name: string;
	alias_name: string;
	address: string;
	phone: string;
	npwp: string;
	id_card: string;
	birth: string;
	spouse_name: string;
	mother: string;
	es_birth: string;
	contact_person: string;
	contact_address: string;
	group_code: string;
	reason_category: string;
	reason_label: string;
	reason_other: string;
	remark: string;
	create_user: string;
	create_date: string;
	last_user: string;
	last_update: string;
	apless: string;
	members: Member[];
	ppatk_files: PpatkFile[];
}

interface Option { value: string; label: string; }
interface Group { code: string; name: string; }

interface Props {
	no: number;
	groups: Group[];
	onClose: () => void;
}

const toDisplayDate = (iso: string) => {
	const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
	return m ? `${m[3]}-${m[2]}-${m[1]}` : (iso || "");
};

function npwpSegments(npwp: string): string[] {
	const digits = (npwp || "").replace(/\D/g, "");
	const out: string[] = [];
	let pos = 0;
	for (const len of NPWP_SEGMENTS) {
		out.push(digits.substr(pos, len));
		pos += len;
	}
	return out;
}

const roInput =
	"w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm text-[var(--app-text)] bg-[var(--app-surface)]";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<div className="flex items-start gap-3">
		<label className="w-40 flex-shrink-0 pt-2 text-sm font-medium text-[var(--app-text)]">{label}</label>
		<div className="flex-1 min-w-0">{children}</div>
	</div>
);

const ReadInput = ({ value, multiline }: { value?: string; multiline?: boolean }) => (
	<div className={`${roInput} ${multiline ? "whitespace-pre-wrap min-h-[64px]" : "truncate"}`}>
		{value && value.trim() !== "" ? value : <span className="text-[var(--app-muted)]">-</span>}
	</div>
);

function NpwpView({ value }: { value: string }) {
	const segs = npwpSegments(value);
	return (
		<div className="flex items-center gap-1 flex-wrap">
			{segs.map((s, i) => (
				<React.Fragment key={i}>
					<div
						className={`${roInput} text-center px-2`}
						style={{ width: `${NPWP_SEGMENTS[i] * 18 + 28}px`, flex: "0 0 auto" }}
					>
						{s || " "}
					</div>
					{i < NPWP_SEPS.length && <span className="px-0.5 text-sm font-bold text-[var(--app-text)]">{NPWP_SEPS[i]}</span>}
				</React.Fragment>
			))}
		</div>
	);
}

const WatchlistDetailModal: React.FC<Props> = ({ no, groups, onClose }) => {
	const [detail, setDetail] = useState<Detail | null>(null);
	const [reasonLabel, setReasonLabel] = useState("");
	const [bodOptions, setBodOptions] = useState<Option[]>([]);
	const [bocOptions, setBocOptions] = useState<Option[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [fileError, setFileError] = useState("");
	const [showBodBoc, setShowBodBoc] = useState(false);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			setLoading(true);
			setError("");
			try {
				const { data } = await api.get<Detail>('/MasterData/watchlist/detail', { params: { no } });
				if (cancelled) return;
				setDetail(data);

				const [reasonsRes, positionsRes] = await Promise.all([
					api.get('/MasterData/watchlist/reasons', { params: { current: data.reason_category } }),
					data.customer_type === 'PT'
						? api.get('/MasterData/watchlist/positions')
						: Promise.resolve({ data: { bod_options: [], boc_options: [] } }),
				]);
				if (cancelled) return;

				const match = (reasonsRes.data || []).find(
					(r: { value: string }) => String(r.value).trim() === String(data.reason_category).trim()
				);
				setReasonLabel(match?.label ?? data.reason_category);
				setBodOptions(positionsRes.data.bod_options || []);
				setBocOptions(positionsRes.data.boc_options || []);
			} catch (err: any) {
				if (!cancelled) setError(err?.response?.data?.error || "Failed to load watchlist detail.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, [no]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	const openFile = async (url: string, params?: Record<string, string>) => {
		setFileError("");
		const win = window.open("", "_blank");
		try {
			const res = await api.get(url, { params, responseType: 'blob' });
			const objectUrl = URL.createObjectURL(res.data);
			if (win) win.location.href = objectUrl;
			else window.open(objectUrl, "_blank");
			setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
		} catch {
			win?.close();
			setFileError("File could not be opened.");
		}
	};

	const positionLabel = (m: Member) => {
		if (m.os_code === BOD_OS_CODE) {
			if (m.bod_position === BOD_OTHER_VALUE) return { bod: "Other", boc: "", other: m.other };
			return { bod: bodOptions.find(o => String(o.value) === String(m.bod_position))?.label ?? m.bod_position, boc: "", other: "" };
		}
		if (m.boc_position === BOC_OTHER_VALUE) return { bod: "", boc: "Other", other: m.other };
		return { bod: "", boc: bocOptions.find(o => String(o.value) === String(m.boc_position))?.label ?? m.boc_position, other: "" };
	};

	const isPR = detail?.customer_type === "PR";
	const isCorsec = detail?.reason_category === CORSEC_REASON;
	const boardMembers = (detail?.members || []).filter(m => m.os_code === BOD_OS_CODE || m.os_code === BOC_OS_CODE);
	const groupName = groups.find(g => g.code === detail?.group_code)?.name ?? detail?.group_code ?? "";

	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto"
			onClick={onClose}
		>
			<div
				className="bg-[var(--app-card)] rounded-2xl shadow-2xl w-full max-w-8xl my-8"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex justify-between items-center px-6 py-5 border-b">
					<div>
						<h2 className="text-xl font-bold text-[var(--app-text)]">Watchlist Detail</h2>
						<p className="text-sm text-[var(--app-muted)] mt-0.5">{detail?.name || " "}</p>
					</div>
					<button onClick={onClose} className="text-[var(--app-muted)] hover:text-[var(--app-text)] text-2xl leading-none">×</button>
				</div>

				<div className="p-6">
					{loading ? (
						<div className="py-16 flex justify-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
						</div>
					) : error ? (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-600">{error}</div>
					) : detail && (
						<>
							{fileError && (
								<div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 mb-4">{fileError}</div>
							)}

							<h3 className="text-sm font-bold text-[var(--app-text)] mb-4">WATCHLIST</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
								<div className="space-y-3">
									<Field label="Customer Type">
										<div className="flex gap-4 pt-1">
											{(["PR", "PT"] as CustomerType[]).map(t => (
												<label key={t} className="flex items-center gap-2 text-sm text-[var(--app-text)]">
													<input type="radio" checked={detail.customer_type === t} disabled readOnly className="accent-amber-600" />
													{t === "PR" ? "Individual" : "Corporate"}
												</label>
											))}
										</div>
									</Field>

									<Field label="Name"><ReadInput value={detail.name} /></Field>
									{isPR && <Field label="Alias Name"><ReadInput value={detail.alias_name} /></Field>}
									<Field label="Address"><ReadInput value={detail.address} multiline /></Field>
									<Field label="Phone"><ReadInput value={detail.phone} /></Field>

									{isPR ? (
										<>
											<Field label="ID Card No."><ReadInput value={detail.id_card} /></Field>
											<Field label="Date of Birth"><ReadInput value={toDisplayDate(detail.birth)} /></Field>
											<Field label="NPWP"><NpwpView value={detail.npwp} /></Field>
											<Field label="Spouse Name"><ReadInput value={detail.spouse_name} /></Field>
											<Field label="Mother's Maiden Name"><ReadInput value={detail.mother} /></Field>
										</>
									) : (
										<>
											<Field label="NPWP"><NpwpView value={detail.npwp} /></Field>
											<Field label="Establishment Date"><ReadInput value={toDisplayDate(detail.es_birth)} /></Field>

											<div className="pt-2 pb-1">
												<span className="text-sm font-bold text-[var(--app-text)] underline">Contact person</span>
											</div>

											<Field label="Name"><ReadInput value={detail.contact_person} /></Field>
											<Field label="Address"><ReadInput value={detail.contact_address} multiline /></Field>
											<Field label="Group"><ReadInput value={groupName} /></Field>
											<Field label="Composition of BOD / BOC">
												<button
													type="button"
													onClick={() => setShowBodBoc(s => !s)}
													className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-1.5 rounded-md text-sm font-medium"
												>
													{showBodBoc ? "Hide" : "View"}
												</button>
											</Field>
										</>
									)}
								</div>

								<div className="space-y-3">
									<Field label="Reason">
										<select
											disabled
											value={detail.reason_category}
											className={`${roInput} cursor-not-allowed`}
											style={{ colorScheme: "light" }}
										>
											<option value={detail.reason_category} style={{ backgroundColor: "#fff", color: "#0f172a" }}>
												{detail.reason_label || reasonLabel || detail.reason_category}
											</option>
										</select>
									</Field>
									{detail.reason_category === "5" && <Field label="Reason Other"><ReadInput value={detail.reason_other} multiline /></Field>}
									<Field label="Remark"><ReadInput value={detail.remark} multiline /></Field>
									<Field label="Create By"><ReadInput value={detail.create_user} /></Field>
									<Field label="Create Date"><ReadInput value={toDisplayDate(detail.create_date)} /></Field>
									{(detail.last_user || detail.last_update) && (
										<>
											<Field label="Update by"><ReadInput value={detail.last_user} /></Field>
											<Field label="Last Update"><ReadInput value={toDisplayDate(detail.last_update)} /></Field>
										</>
									)}

									{isCorsec && (
										<Field label="Attachment">
											{detail.ppatk_files.length === 0 ? (
												<div className={roInput}><span className="text-[var(--app-muted)]">-</span></div>
											) : (
												<ul className="space-y-1">
													{detail.ppatk_files.map(f => (
														<li key={f.file_nm}>
															<button
																type="button"
																onClick={() => openFile('/MasterData/watchlist/ppatk', { apless: detail.apless, file_nm: f.file_nm })}
																className="text-sm text-blue-600 hover:underline break-all text-left"
															>
																{f.fname}
															</button>
														</li>
													))}
												</ul>
											)}
										</Field>
									)}
								</div>
							</div>

							{!isPR && showBodBoc && (
								<div className="mt-8">
									<h3 className="text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider mb-3">
										Composition of BOD / BOC &amp; Management Detail
									</h3>

									{boardMembers.length === 0 ? (
										<div className="text-sm text-[var(--app-muted)] border border-dashed border-[var(--app-border)] rounded-lg p-6 text-center">
											No members
										</div>
									) : (
										<div className="space-y-3">
											{boardMembers.map((m, idx) => {
												const p = positionLabel(m);
												return (
													<div key={m.id_blacklist} className="border border-[var(--app-border)] rounded-xl p-4">
														<div className="flex justify-between items-center mb-3">
															<span className="text-sm font-semibold text-[var(--app-text)]">#{idx + 1}</span>
														</div>
														<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
															<div>
																<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Name</label>
																<input type="text" value={m.name} disabled className={roInput} />
															</div>
															<div>
																<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">BOD</label>
																<input type="text" value={p.bod} disabled className={roInput} />
															</div>
															<div>
																<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">BOC</label>
																<input type="text" value={p.boc} disabled className={roInput} />
															</div>
															<div>
																<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Other</label>
																<input type="text" value={p.other} disabled className={roInput} />
															</div>
															<div>
																<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">ID Card</label>
																<input type="text" value={m.id_card} disabled className={roInput} />
															</div>
															<div>
																<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Address</label>
																<input type="text" value={m.address} disabled className={roInput} />
															</div>
															<div>
																<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">City</label>
																<input type="text" value={m.city} disabled className={roInput} />
															</div>
															<div>
																<label className="block text-xs font-medium text-[var(--app-muted)] mb-1">Image</label>
																{m.image ? (
																	<button
																		type="button"
																		onClick={() => openFile(`/MasterData/watchlist/management/${m.id_blacklist}/image`)}
																		className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-md text-xs font-medium"
																	>
																		View
																	</button>
																) : (
																	<div className={roInput}><span className="text-[var(--app-muted)]">-</span></div>
																)}
															</div>
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

				<div className="flex justify-end px-6 py-4 border-t bg-[var(--app-surface)] rounded-b-2xl">
					<button
						onClick={onClose}
						className="px-5 py-2 border border-[var(--app-border)] rounded-lg text-sm text-[var(--app-text)] hover:bg-[var(--app-surface-alt)] transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
};

export default WatchlistDetailModal;
import React, { useEffect, useState } from "react";
import api from '@/shared/api/axiosInstance';

type CustomerType = "PR" | "PT";

const BOD_OS_CODE = 'PT02';
const BOC_OS_CODE = 'PT03';
const BOD_OTHER_VALUE = '5';
const BOC_OTHER_VALUE = '10';
const CORSEC_REASON = '8';

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
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
	return m ? `${m[3]}-${m[2]}-${m[1]}` : (iso || "");
};

const ReadField = ({ label, value, multiline }: { label: string; value?: string; multiline?: boolean }) => (
	<div>
		<div className="text-xs font-medium text-[var(--app-muted)] mb-1">{label}</div>
		<div
			className={`w-full border border-[var(--app-border)] rounded-lg px-3 py-2 text-sm text-[var(--app-text)] bg-[var(--app-surface)] ${multiline ? "whitespace-pre-wrap min-h-[64px]" : "truncate"}`}
		>
			{value && value.trim() !== "" ? value : <span className="text-[var(--app-muted)]">-</span>}
		</div>
	</div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
	<h3 className="text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider mb-3">{children}</h3>
);

const WatchlistDetailModal: React.FC<Props> = ({ no, groups, onClose }) => {
	const [detail, setDetail] = useState<Detail | null>(null);
	const [reasonLabel, setReasonLabel] = useState("");
	const [bodOptions, setBodOptions] = useState<Option[]>([]);
	const [bocOptions, setBocOptions] = useState<Option[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [fileError, setFileError] = useState("");

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
	const managementRows = (detail?.members || []).filter(m => (isCorsec ? m.os_code === 'PT04' : true) && m.name);
	const groupName = groups.find(g => g.code === detail?.group_code)?.name ?? detail?.group_code ?? "";

	return (
		<div
			className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto"
			onClick={onClose}
		>
			<div
				className="bg-[var(--app-card)] rounded-2xl shadow-2xl w-full max-w-5xl my-8"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex justify-between items-center px-6 py-5 border-b">
					<div>
						<h2 className="text-xl font-bold text-[var(--app-text)]">Watchlist Detail</h2>
						<p className="text-sm text-[var(--app-muted)] mt-0.5">{detail?.name || "\u00a0"}</p>
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

							<div className="mb-5">
								<span
									style={{
										fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
										background: isPR ? "#dbeafe" : "#fef3c7", color: isPR ? "#1e40af" : "#92400e",
									}}
								>
									{isPR ? "Individual" : "Corporate"}
								</span>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-4">
									<SectionTitle>{isPR ? "Personal Information" : "Company Information"}</SectionTitle>
									<ReadField label="Name" value={detail.name} />
									{isPR && <ReadField label="Alias Name" value={detail.alias_name} />}
									<ReadField label="Address" value={detail.address} multiline />
									<ReadField label="Phone" value={detail.phone} />
									{isPR ? (
										<>
											<ReadField label="ID Card No." value={detail.id_card} />
											<ReadField label="Date of Birth" value={toDisplayDate(detail.birth)} />
											<ReadField label="NPWP" value={detail.npwp} />
											<ReadField label="Spouse Name" value={detail.spouse_name} />
											<ReadField label="Mother's Maiden Name" value={detail.mother} />
										</>
									) : (
										<>
											<ReadField label="NPWP" value={detail.npwp} />
											<ReadField label="Establishment Date" value={toDisplayDate(detail.es_birth)} />
											<ReadField label="Contact Person Name" value={detail.contact_person} />
											<ReadField label="Contact Person Address" value={detail.contact_address} multiline />
											<ReadField label="Group" value={groupName} />
										</>
									)}
								</div>

								<div className="space-y-4">
									<SectionTitle>Case Information</SectionTitle>
									<ReadField label="Reason" value={reasonLabel} />
									{detail.reason_category === "5" && <ReadField label="Reason Other" value={detail.reason_other} multiline />}
									<ReadField label="Remark" value={detail.remark} multiline />
									<div className="grid grid-cols-2 gap-4">
										<ReadField label="Create By" value={detail.create_user} />
										<ReadField label="Create Date" value={toDisplayDate(detail.create_date)} />
									</div>
									{detail.last_user && (
										<div className="grid grid-cols-2 gap-4">
											<ReadField label="Update By" value={detail.last_user} />
											<ReadField label="Last Update" value={toDisplayDate(detail.last_update)} />
										</div>
									)}

									{isCorsec && (
										<div>
											<div className="text-xs font-medium text-[var(--app-muted)] mb-1">Attachment</div>
											{detail.ppatk_files.length === 0 ? (
												<div className="text-sm text-[var(--app-muted)]">-</div>
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
										</div>
									)}
								</div>
							</div>

							{!isPR && (
								<div className="mt-8 space-y-6">
									<div>
										<SectionTitle>Composition of BOD / BOC</SectionTitle>
										<div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
											<table className="w-full text-sm">
												<thead className="bg-[var(--app-surface)]">
													<tr>
														{["No.", "Name", "BOD", "BOC", "Other"].map(h => (
															<th key={h} className="py-2 px-3 text-left text-xs font-semibold text-[var(--app-muted)] uppercase">{h}</th>
														))}
													</tr>
												</thead>
												<tbody className="divide-y divide-[var(--app-border)]">
													{boardMembers.length === 0 ? (
														<tr><td colSpan={5} className="py-6 text-center text-[var(--app-muted)]">No records</td></tr>
													) : boardMembers.map((m, i) => {
														const p = positionLabel(m);
														return (
															<tr key={m.id_blacklist}>
																<td className="py-2 px-3 text-center">{i + 1}</td>
																<td className="py-2 px-3">{m.name}</td>
																<td className="py-2 px-3">{p.bod || "-"}</td>
																<td className="py-2 px-3">{p.boc || "-"}</td>
																<td className="py-2 px-3">{p.other || "-"}</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</div>

									<div>
										<SectionTitle>Management Detail Information</SectionTitle>
										<div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
											<table className="w-full text-sm">
												<thead className="bg-[var(--app-surface)]">
													<tr>
														{["No.", "Name", "ID Card", "Address", "City", "Image"].map(h => (
															<th key={h} className="py-2 px-3 text-left text-xs font-semibold text-[var(--app-muted)] uppercase">{h}</th>
														))}
													</tr>
												</thead>
												<tbody className="divide-y divide-[var(--app-border)]">
													{managementRows.length === 0 ? (
														<tr><td colSpan={6} className="py-6 text-center text-[var(--app-muted)]">No records</td></tr>
													) : managementRows.map((m, i) => (
														<tr key={m.id_blacklist}>
															<td className="py-2 px-3 text-center">{i + 1}</td>
															<td className="py-2 px-3">{m.name}</td>
															<td className="py-2 px-3">{m.id_card || "-"}</td>
															<td className="py-2 px-3 whitespace-pre-wrap">{m.address || "-"}</td>
															<td className="py-2 px-3">{m.city || "-"}</td>
															<td className="py-2 px-3">
																{m.image ? (
																	<button
																		type="button"
																		onClick={() => openFile(`/MasterData/watchlist/management/${m.id_blacklist}/image`)}
																		className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-md text-xs font-medium"
																	>
																		View
																	</button>
																) : "-"}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</div>
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
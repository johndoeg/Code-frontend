import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import { isImageFile } from '@/shared/constants/DefaultValue';

interface OcrField {
	value: string;
	confidence: string;
	verified: string;
}

interface OcrData {
	citizen: string;
	idType?: string;
	idCardNo: OcrField;
	name: OcrField;
	pob: OcrField;
	dob: OcrField;
	gender: OcrField;
	bloodType: OcrField;
	address: OcrField;
	rt: OcrField;
	rw: OcrField;
	subdistrict: OcrField;
	district: OcrField;
	city: OcrField;
	province: OcrField;
	religion: OcrField;
	job: OcrField;
	maritalStatus?: string;
	photo: string;
	signature: string;
}

interface Document {
	id: number;
	name: string;
	type: string;
	viewUrl?: string;
}

interface ViewData {
	prechecking_id: string;
	apless: string;
	check_for: string;
	customer_type: string;
	lessee_type: string;
	new_ro: string;
	nationality: string;
	marital: string;
	is_carro: string;
	note: string;
	last_checking_date: string;
	outstanding: number;
	customer?: OcrData;
	spouse?: OcrData;
	wna_name?: string;
	wna_idcard?: string;
	wna_id_type?: string;
	is_corporate?: boolean;
	is_guarantor_pt?: boolean;
	corp_name?: string;
	corp_npwp?: string;
	corp_address?: string;
	corp_type_label?: string;
	wna_board?: { name: string; idCardNo: string; idType?: string }[];
	shareholders?: { name: string; npwpNo: string; idType?: string }[];
	corporate?: OcrData[];
	sik: { subject: string; credit_bureau: string; status: string; score: string; grade: string; }[];
	documents: Record<string, Document[]>;
}

interface PreviewState {
	open: boolean;
	name: string;
	url: string;
	doc?: Document;
}

const PREVIEW_CLOSED: PreviewState = {
	open: false,
	name: "",
	url: "",
};

const CORP_KTP_PREFIX = "corp-ocr-ktp_";
const SHAREHOLDER_DOC_PREFIX = "shareholder-npwp_";

const CANCEL_PATH = "/cam-request-onhand";

const idTypeLabel = (citizen?: string, idType?: string): string => {
	if ((citizen || "").toUpperCase() !== "WNA") return "KTP";
	const t = (idType || "").toUpperCase();
	return t === "KITAP" || t === "KITAS" ? t : "KITAS";
};

const pickDocs = (documents: Record<string, Document[]>, types: string[]): Document[] =>
	types.flatMap((t) => documents[t] ?? []);

const customerIdDocTypes = (isIndividu: boolean, citizen?: string): string[] => {
	const prefix = isIndividu ? "cust" : "guarantor";
	return (citizen || "").toUpperCase() === "WNA"
		? [`${prefix}-kitas`, `${prefix}-kitap`]
		: [`${prefix}-ktp`];
};

const spouseIdDocTypes = (isIndividu: boolean, mainCitizen?: string, spouseCitizen?: string): string[] => {
	const prefix = isIndividu ? "cust" : "guarantor";
	if ((spouseCitizen || "").toUpperCase() === "WNA") {
		return [`${prefix}-spouse-kitas`, `${prefix}-spouse-kitap`];
	}
	return (mainCitizen || "").toUpperCase() === "WNA"
		? [`${prefix}-wna-spouse-ktp`]
		: [`${prefix}-spouse-ktp`];
};


const officerKtpDocs = (
	documents: Record<string, Document[]>,
	officers: OcrData[],
	index: number,
): Document[] => {
	const entries = Object.entries(documents).filter(([t]) => t.startsWith(CORP_KTP_PREFIX));
	if (!entries.length) return [];

	const suffixOf = (type: string) => type.slice(CORP_KTP_PREFIX.length).trim();
	const suffixes = entries.map(([t]) => suffixOf(t));
	const zeroBased = suffixes.includes("0");
	const posKey = (i: number) => String(zeroBased ? i : i + 1);

	const matchesOfficer = (suffix: string, i: number) => {
		const nik = (officers[i]?.idCardNo?.value || "").trim();
		return suffix === posKey(i) || (!!nik && suffix === nik);
	};

	const anyMatch = suffixes.some(s => officers.some((_, i) => matchesOfficer(s, i)));
	if (!anyMatch) return entries.flatMap(([, list]) => list);

	return entries
		.filter(([t]) => matchesOfficer(suffixOf(t), index))
		.flatMap(([, list]) => list);
};

const boardDocsFor = (
	documents: Record<string, Document[]>,
	prefix: string,
	members: { idCardNo: string }[],
	index: number,
): Document[] => {
	const entries = Object.entries(documents).filter(([t]) => t.startsWith(prefix));
	if (!entries.length) return [];

	const suffixOf = (type: string) => type.slice(prefix.length).trim();
	const suffixes = entries.map(([t]) => suffixOf(t));
	const zeroBased = suffixes.includes("0");
	const posKey = (i: number) => String(zeroBased ? i : i + 1);
	const nikOf = (i: number) => (members[i]?.idCardNo || "").trim();
	const matches = (suffix: string, i: number) =>
		suffix === posKey(i) || (!!nikOf(i) && suffix === nikOf(i));

	const anyMatch = suffixes.some((s) => members.some((_, i) => matches(s, i)));
	if (!anyMatch) return index === 0 ? entries.flatMap(([, list]) => list) : [];

	return entries
		.filter(([t]) => matches(suffixOf(t), index))
		.flatMap(([, list]) => list);
};

const shareholderDocsFor = (documents: Record<string, Document[]>, npwpNo: string): Document[] => {
	const token = (npwpNo || "").replace(/[^A-Za-z0-9]/g, "");
	return token ? documents[`${SHAREHOLDER_DOC_PREFIX}${token}`] ?? [] : [];
};

const triggerBlobDownload = (blob: Blob, fileName: string) => {
	const objectUrl = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = objectUrl;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
};

const fileNameFromDisposition = (header: string | undefined, fallback: string): string => {
	if (!header) return fallback;
	const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
	if (utf8) {
		try { return decodeURIComponent(utf8[1]); } catch { }
	}
	const plain = /filename="?([^";]+)"?/i.exec(header);
	return plain ? plain[1] : fallback;
};

const DocPreviewModal: React.FC<{
	state: PreviewState;
	onClose: () => void;
	onDownload: (doc: Document) => void;
	downloadingId?: number;
}> = ({ state, onClose, onDownload, downloadingId }) => {
	const [imgError, setImgError] = useState(false);

	useEffect(() => { setImgError(false); }, [state.url]);

	if (!state.open) return null;

	const cleanName = state.name.split("?")[0];
	const isImage = isImageFile(cleanName);
	const isPdf = cleanName.split(".").pop()?.toLowerCase() === "pdf";
	const busy = !!state.doc && downloadingId === state.doc.id;

	return (
		<div
			onClick={onClose}
			style={{
				position: "fixed", inset: 0,
				background: "rgba(0,0,0,.7)",
				zIndex: 9999, display: "flex",
				justifyContent: "center", alignItems: "center",
			}}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					width: "90%", height: "90%",
					background: "var(--app-card)", borderRadius: 10,
					overflow: "hidden", display: "flex",
					flexDirection: "column",
				}}
			>
				<div style={{
					padding: "12px 16px",
					borderBottom: "1px solid var(--app-border)",
					display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
				}}>
					<span style={{ fontWeight: 600, fontSize: ".9rem", color: "var(--app-text)" }}>{state.name}</span>
					<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
						{state.doc && (
							<button
								onClick={() => onDownload(state.doc!)}
								disabled={busy}
								className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="7 10 12 15 17 10" />
									<line x1="12" y1="15" x2="12" y2="3" />
								</svg>
								{busy ? "Downloading…" : "Download"}
							</button>
						)}
						<button onClick={onClose} style={{ cursor: "pointer", background: "none", border: "none", fontSize: "1.2rem", color: "var(--app-text)" }}>✕</button>
					</div>
				</div>

				<div style={{ flex: 1, overflow: "hidden", padding: 20 }}>
					{isImage && !imgError ? (
						<img
							src={state.url}
							alt={state.name}
							style={{ width: "100%", height: "100%", objectFit: "contain" }}
							onError={() => setImgError(true)}
						/>
					) : isPdf ? (
						<iframe title={state.name} src={state.url} width="100%" height="100%" />
					) : (
						<div style={{ textAlign: "center", paddingTop: 40 }}>
							<p style={{ marginBottom: 12, color: "var(--app-muted)" }}>
								{imgError ? "Failed to load image." : "Preview not available for this file type."}
							</p>
							{state.doc && (
								<button
									onClick={() => onDownload(state.doc!)}
									disabled={busy}
									className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{busy ? "Downloading…" : "Download file"}
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

const DocChip: React.FC<{
	doc: Document;
	onPreview: (doc: Document) => void;
	onDownload: (doc: Document) => void;
	loading?: boolean;
	downloading?: boolean;
}> = ({ doc, onPreview, onDownload, loading = false, downloading = false }) => {
	const [hovered, setHovered] = useState(false);

	return (
		<div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
			<button
				onClick={() => onPreview(doc)}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				disabled={loading}
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: 6,
					border: `1px solid ${hovered ? "#ea580c" : "#f97316"}`,
					background: hovered ? "#f97316" : "#fff7ed",
					color: hovered ? "#fff" : "#c2410c",
					borderRadius: 6,
					padding: "5px 12px",
					fontSize: 13,
					fontWeight: 500,
					cursor: loading ? "not-allowed" : "pointer",
					opacity: loading ? 0.7 : 1,
					transition: "background 0.15s, color 0.15s, border-color 0.15s",
				}}
			>
				<svg
					width="15" height="15"
					viewBox="0 0 24 24" fill="none"
					stroke="currentColor" strokeWidth="2"
					strokeLinecap="round" strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
				{loading ? "Loading…" : "View"}
			</button>

			<button
				onClick={() => onDownload(doc)}
				disabled={downloading}
				title={`Download ${doc.name}`}
				className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-[5px] text-[13px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
			>
				<svg
					width="15" height="15"
					viewBox="0 0 24 24" fill="none"
					stroke="currentColor" strokeWidth="2"
					strokeLinecap="round" strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="7 10 12 15 17 10" />
					<line x1="12" y1="15" x2="12" y2="3" />
				</svg>
				{downloading ? "Downloading…" : "Download"}
			</button>

			<span style={{ fontSize: 13, color: "var(--app-text)" }}>{doc.name}</span>
		</div>
	);
};

const KtpFileChips: React.FC<{
	label?: string;
	docs: Document[];
	onPreview: (doc: Document) => void;
	onDownload: (doc: Document) => void;
	loadingId?: number;
	downloadingId?: number;
}> = ({ label, docs, onPreview, onDownload, loadingId, downloadingId }) => (
	<div style={{ marginBottom: 12 }}>
		{label && (
			<div className="text-[var(--app-muted)] text-xs font-semibold uppercase tracking-wider mb-2">
				{label}
			</div>
		)}
		{!docs || docs.length === 0 ? (
			<span style={{ color: "var(--app-text)", fontSize: ".875rem" }}>No file(s) uploaded.</span>
		) : (
			<div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
				{docs.map((d) => (
					<DocChip
						key={d.id}
						doc={d}
						onPreview={onPreview}
						onDownload={onDownload}
						loading={loadingId === d.id}
						downloading={downloadingId === d.id}
					/>
				))}
			</div>
		)}
	</div>
);

const ConfBadge: React.FC<{ value: string }> = ({ value }) => {
	if (!value || value === "0") return <span className="text-[var(--app-muted)]">—</span>;
	const n = parseFloat(value);
	const color = n >= 90
		? "text-green-700 bg-green-50 border-green-200"
		: n >= 70
			? "text-yellow-700 bg-yellow-50 border-yellow-200"
			: "text-red-700 bg-red-50 border-red-200";
	return (
		<span className={`px-2 py-0.5 rounded-full text-xs font-mono font-semibold border ${color}`}>
			{value}%
		</span>
	);
};

const VerBadge: React.FC<{ value: string }> = ({ value }) => {
	if (!value) return <span className="text-[var(--app-muted)]">—</span>;
	const color = value === "True"
		? "text-green-700 bg-green-50 border-green-200"
		: value === "False"
			? "text-red-700 bg-red-50 border-red-200"
			: "text-[var(--app-muted)] bg-[var(--app-surface)] border-[var(--app-border)]";
	return (
		<span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
			{value}
		</span>
	);
};

const OcrTable: React.FC<{ title: string; data: OcrData }> = ({ title, data }) => {
	const rows = [
		{ label: "NIK", field: data.idCardNo },
		{ label: "Nama", field: data.name },
		{ label: "Tempat Lahir", field: data.pob },
		{ label: "Tanggal Lahir", field: data.dob },
		{ label: "Jenis Kelamin", field: data.gender },
		{ label: "Golongan Darah", field: data.bloodType },
		{ label: "Alamat", field: data.address },
		{
			label: "RT/RW",
			field: {
				value: `${data.rt?.value ?? ""} / ${data.rw?.value ?? ""}`,
				confidence: data.rt?.confidence ?? "",
				verified: data.rt?.verified ?? "",
			},
		},
		{ label: "Kelurahan/Desa", field: data.subdistrict },
		{ label: "Kecamatan", field: data.district },
		{ label: "Kota/Kabupaten", field: data.city },
		{ label: "Provinsi", field: data.province },
		{ label: "Agama", field: data.religion },
		{ label: "Pekerjaan", field: data.job },
	];

	return (
		<div className="rounded-xl border border-[var(--app-border)] overflow-hidden shadow-sm mb-6">
			<div className="bg-gradient-to-r from-blue-900 to-blue-700 px-4 py-3">
				<h3 className="text-white font-semibold text-sm">{title}</h3>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm table-fixed" style={{ minWidth: 720 }}>
					<colgroup>
						<col style={{ width: 220 }} />
						<col />
						<col style={{ width: 176 }} />
						<col style={{ width: 176 }} />
					</colgroup>
					<thead className="bg-[var(--app-surface)]">
						<tr>
							{["Field", "Value", "Confidence Rate", "Verification (Dukcapil)"].map((h, i) => (
								<th
									key={h}
									className={`px-4 py-2.5 ${i < 2 ? "text-left" : "text-center"} text-xs font-bold text-[var(--app-muted)] uppercase tracking-wider`}
								>{h}</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-[var(--app-border)]">
						<tr className="hover:bg-[var(--app-surface)] transition-colors">
							<td className="px-4 py-2.5 font-medium text-[var(--app-text)]">ID Type</td>
							<td className="px-4 py-2.5 text-[var(--app-text)]" colSpan={3}>
								{idTypeLabel(data.citizen, data.idType)}
							</td>
						</tr>
						{rows.map(({ label, field }) => (
							<tr key={label} className="hover:bg-[var(--app-surface)] transition-colors">
								<td className="px-4 py-2.5 font-medium text-[var(--app-text)]">{label}</td>
								<td className="px-4 py-2.5 text-[var(--app-text)] break-words">{field?.value || "—"}</td>
								<td className="px-4 py-2.5 text-center align-middle">
									<ConfBadge value={field?.confidence ?? ""} />
								</td>
								<td className="px-4 py-2.5 text-center align-middle">
									<VerBadge value={field?.verified ?? ""} />
								</td>
							</tr>
						))}
						<tr className="hover:bg-[var(--app-surface)]">
							<td className="px-4 py-2.5 font-medium text-[var(--app-text)]">Foto</td>
							<td className="px-4 py-2.5" colSpan={3}>
								{data.photo ? (
									<img
										src={`data:image/jpeg;base64,${data.photo}`}
										alt="Foto"
										style={{ height: 118, width: 92, objectFit: "cover" }}
										className="rounded-lg border border-[var(--app-border)] shadow-sm"
									/>
								) : (
									<div
										style={{ height: 118, width: 92 }}
										className="bg-[var(--app-surface-alt)] rounded-lg border-2 border-dashed border-[var(--app-border)] flex items-center justify-center text-[var(--app-muted)] text-xs"
									>
										No Photo
									</div>
								)}
							</td>
						</tr>
						<tr className="hover:bg-[var(--app-surface)]">
							<td className="px-4 py-2.5 font-medium text-[var(--app-text)]">Tanda Tangan</td>
							<td className="px-4 py-2.5" colSpan={3}>
								{data.signature ? (
									<img
										src={`data:image/jpeg;base64,${data.signature}`}
										alt="Tanda Tangan"
										style={{ height: 44 }}
										className="rounded border border-[var(--app-border)]"
									/>
								) : (
									<div
										style={{ height: 44, width: 120 }}
										className="bg-[var(--app-surface-alt)] rounded border-2 border-dashed border-[var(--app-border)]"
									/>
								)}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
	<div className="flex items-center gap-3 mb-4">
		<span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
		<span className="text-xs font-bold uppercase tracking-widest text-[color:var(--app-accent,#1D4ED8)]">
			{title}
		</span>
		<hr className="flex-1 border-t-2 border-[var(--app-border)]" />
	</div>
);

const FieldRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
	<div className="flex gap-4 py-2 border-b border-[var(--app-border)] last:border-0">
		<span className="text-[var(--app-muted)] text-sm w-48 flex-shrink-0">{label}</span>
		<span className="text-[var(--app-text)] text-sm font-medium">{value ?? "—"}</span>
	</div>
);

const StatBlock: React.FC<{ rows: [string, React.ReactNode][] }> = ({ rows }) => (
	<div className="flex justify-end w-full mb-8">
		<table className="border-collapse ml-auto">
			<tbody>
				{rows.map(([label, value]) => (
					<tr key={label}>
						<td className="py-0.5 pr-3.5 text-left text-[.82rem] text-[var(--app-muted)] whitespace-nowrap">{label}</td>
						<td className="py-0.5 text-right text-[.95rem] font-extrabold text-[var(--app-text)] whitespace-nowrap">{value}</td>
					</tr>
				))}
			</tbody>
		</table>
	</div>
);

const DocRow: React.FC<{
	label: string;
	docs: Document[];
	onPreview: (doc: Document) => void;
	onDownload: (doc: Document) => void;
	loadingId?: number;
	downloadingId?: number;
}> = ({ label, docs, onPreview, onDownload, loadingId, downloadingId }) => (
	<div className="flex gap-4 py-2 border-b border-[var(--app-border)] last:border-0 items-start">
		<span className="text-[var(--app-muted)] text-sm w-48 flex-shrink-0 pt-0.5">{label}</span>
		<div>
			{!docs || docs.length === 0 ? (
				<span style={{ color: "var(--app-text)", fontSize: ".875rem" }}>No file(s) uploaded.</span>
			) : (
				<div className="flex flex-wrap gap-2.5">
					{docs.map((doc) => (
						<DocChip
							key={doc.id}
							doc={doc}
							onPreview={onPreview}
							onDownload={onDownload}
							loading={loadingId === doc.id}
							downloading={downloadingId === doc.id}
						/>
					))}
				</div>
			)}
		</div>
	</div>
);

const DisabledSelect: React.FC<{ label: string; value: string }> = ({ label, value }) => (
	<div className="flex gap-4 py-2 border-b border-[var(--app-border)] last:border-0 items-center">
		<span className="text-[var(--app-muted)] text-sm w-48 flex-shrink-0">{label}</span>
		<div className="relative w-full max-w-md">
			<select
				disabled
				value={value || "—"}
				className="w-full appearance-none bg-[var(--app-surface-alt)] border border-[var(--app-border)] text-[var(--app-muted)] text-sm rounded-lg pl-3 pr-9 py-2 cursor-not-allowed"
			>
				<option value={value || "—"}>{value || "—"}</option>
			</select>
			<svg
				className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--app-muted)]"
				fill="none" stroke="currentColor" viewBox="0 0 24 24"
			>
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</div>
);

const DisabledTextarea: React.FC<{ label: string; value: string }> = ({ label, value }) => (
	<div className="flex gap-4 py-2 border-b border-[var(--app-border)] last:border-0 items-start">
		<span className="text-[var(--app-muted)] text-sm w-48 flex-shrink-0 pt-2">{label}</span>
		<textarea
			disabled
			readOnly
			value={value ?? ""}
			rows={2}
			className="w-full max-w-md bg-[var(--app-surface-alt)] border border-[var(--app-border)] text-[var(--app-muted)] text-sm rounded-lg px-3 py-2 cursor-not-allowed resize-y"
		/>
	</div>
);

const ApprovalHistory: React.FC<{ apless: string; precheckingId: string }> = ({
	apless,
	precheckingId,
}) => {
	const { data, isLoading: loading } = useQuery({
		queryKey: ["prechecking-approval-history", apless, precheckingId],
		queryFn: async () => {
			const res = await api.get("/Prechecking/View/approval-history", {
				params: { apless, prechecking_id: precheckingId },
			});
			return res.data;
		},
	});
	const rows: any[] = data ?? [];

	if (loading) return (
		<div className="flex justify-center py-12">
			<svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
				<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
				<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
			</svg>
		</div>
	);

	if (!rows.length) return (
		<div className="bg-[var(--app-card)] rounded-2xl shadow-sm border border-[var(--app-border)] p-12 text-center text-[var(--app-muted)]">
			No approval history found.
		</div>
	);

	return (
		<div className="bg-[var(--app-card)] rounded-2xl shadow-sm border border-[var(--app-border)] overflow-hidden">
			<table className="w-full text-sm">
				<thead className="bg-[var(--app-surface)]">
					<tr>
						{["Date", "Action", "By", "Remarks"].map((h) => (
							<th
								key={h}
								className="px-4 py-3 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider"
							>{h}</th>
						))}
					</tr>
				</thead>
				<tbody className="divide-y divide-[var(--app-border)]">
					{rows.map((row, i) => {
						const actionColor =
							row.action === "approve" ? "bg-green-100 text-green-700" :
								row.action === "reject" ? "bg-red-100 text-red-700" :
									row.action === "submit" ? "bg-blue-100 text-blue-700" :
										"bg-[var(--app-surface-alt)] text-[var(--app-muted)]";
						return (
							<tr key={i} className={i % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}>
								<td className="px-4 py-3 whitespace-nowrap text-[var(--app-muted)]">{row.date}</td>
								<td className="px-4 py-3">
									<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${actionColor}`}>
										{row.action}
									</span>
								</td>
								<td className="px-4 py-3 text-[var(--app-text)]">{row.by}</td>
								<td className="px-4 py-3 text-[var(--app-muted)]">{row.remarks}</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};

const PengurusTabs: React.FC<{
	officers: OcrData[];
	documents: Record<string, Document[]>;
	onPreview: (doc: Document) => void;
	onDownload: (doc: Document) => void;
	loadingId?: number;
	downloadingId?: number;
}> = ({ officers, documents, onPreview, onDownload, loadingId, downloadingId }) => {
	const [active, setActive] = useState(0);

	useEffect(() => {
		if (active >= officers.length) setActive(0);
	}, [officers.length, active]);

	if (!officers.length) return null;
	const activeIndex = active < officers.length ? active : 0;
	const current = officers[activeIndex];
	const activeDocs = officerKtpDocs(documents, officers, activeIndex);

	return (
		<div>
			<div role="tablist" className="flex flex-wrap gap-2 w-fit mb-4">
				{officers.map((o, i) => {
					const name = o.name?.value ?? "";
					const shortName = name.length > 16 ? name.slice(0, 16) + "…" : name;
					const isActive = activeIndex === i;
					return (
						<button
							key={i}
							role="tab"
							aria-selected={isActive}
							onClick={() => setActive(i)}
							className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all whitespace-nowrap ${isActive
								? "bg-blue-600 text-white border-blue-600 shadow-sm"
								: "bg-[var(--app-card)] border-[var(--app-border)] text-[var(--app-muted)] hover:text-[var(--app-text)] hover:border-[var(--app-muted)]"
								}`}
						>
							Pengurus #{i + 1}
							{name && (
								<span className={isActive ? "text-blue-100" : "text-[var(--app-muted)]"}>
									{" "}· {shortName}
								</span>
							)}
						</button>
					);
				})}
			</div>

			<KtpFileChips
				label={`File KTP Pengurus #${activeIndex + 1}`}
				docs={activeDocs}
				onPreview={onPreview}
				onDownload={onDownload}
				loadingId={loadingId}
				downloadingId={downloadingId}
			/>
			<OcrTable title={`Pengurus #${activeIndex + 1} · WNI`} data={current} />
			<FieldRow label="Status Perkawinan" value={current.maritalStatus} />
		</div>
	);
};

export interface ViewPrecheckingPageProps {
	apless?: string;
	precheckingId?: string;
	onClose?: () => void;
}

const ViewPrecheckingPage: React.FC<ViewPrecheckingPageProps> = ({
	apless: aplessProp,
	precheckingId: precheckingIdProp,
	onClose,
}) => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const embedded = precheckingIdProp !== undefined;
	const apless = aplessProp ?? searchParams.get("apless") ?? "";
	const prechecking_id = precheckingIdProp ?? searchParams.get("prechecking_id") ?? "";

	const [tab, setTab] = useState<"data" | "history">("data");
	const [fetchingId, setFetchingId] = useState<number | undefined>();
	const [downloadingId, setDownloadingId] = useState<number | undefined>();
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);

	const missingParams = !apless || !prechecking_id;

	const { data, isLoading: loading, isError } = useQuery({
		queryKey: ["prechecking-view-data", apless, prechecking_id],
		queryFn: async () => {
			const res = await api.get<ViewData>("/Prechecking/View/get-data", {
				params: { apless, prechecking_id },
			});
			return res.data;
		},
		enabled: !missingParams,
	});

	const error = missingParams
		? "Missing apless or prechecking ID."
		: isError
			? "Failed to load prechecking data."
			: null;

	const handlePreview = async (doc: Document) => {
		setFetchingId(doc.id);
		try {
			const res = await api.get("/Prechecking/View/document-url", {
				params: { customer_document_id: doc.id },
			});
			if (!res.data?.url) {
				alert(res.data?.error ?? "Dokumen tidak dapat ditampilkan.");
				return;
			}
			setPreview({
				open: true,
				name: res.data.file_name || doc.name,
				url: res.data.url,
				doc,
			});
		} catch (e: any) {
			alert(e.response?.data?.error ?? "Gagal memuat pratinjau dokumen.");
		} finally {
			setFetchingId(undefined);
		}
	};

	const handleDownload = async (doc: Document) => {
		setDownloadingId(doc.id);
		try {
			const res = await api.get("/Prechecking/View/document-file", {
				params: { customer_document_id: doc.id },
				responseType: "blob",
			});

			if ((res.data?.type || "").includes("application/json")) {
				const text = await (res.data as Blob).text();
				let message = "Gagal mengunduh dokumen.";
				try { message = JSON.parse(text).error ?? message; } catch { }
				alert(message);
				return;
			}

			const fileName = fileNameFromDisposition(
				res.headers["content-disposition"],
				doc.name || `document-${doc.id}`,
			);
			triggerBlobDownload(res.data as Blob, fileName);
		} catch (e: any) {
			alert(e.response?.data?.error ?? "Gagal mengunduh dokumen.");
		} finally {
			setDownloadingId(undefined);
		}
	};

	const closePreview = useCallback(() => setPreview(PREVIEW_CLOSED), []);

	const goBack = () => {
		if (onClose) {
			onClose();
		} else {
			navigate(CANCEL_PATH);
		}
	};

	if (loading) return (
		<div className={`bg-[var(--app-surface)] flex items-center justify-center ${embedded ? 'py-16' : 'min-h-screen'}`}>
			<svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
				<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
				<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
			</svg>
		</div>
	);

	if (error) return (
		<div className={`bg-[var(--app-surface)] flex items-center justify-center ${embedded ? 'py-16' : 'min-h-screen'}`}>
			<div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-md">
				<p className="text-red-700 font-medium">{error}</p>
				<button
					onClick={goBack}
					className="mt-4 text-blue-600 hover:underline text-sm"
				>{embedded ? "✕ Close" : "← Go back"}</button>
			</div>
		</div>
	);

	if (!data) return null;

	const docs = data.documents ?? {};
	const isIndividu = data.check_for === "C" && data.customer_type === "PR";
	const isGuarnPR = data.check_for === "G" && data.customer_type === "PR";
	const isCorporate = !!data.is_corporate || !!data.is_guarantor_pt;

	const custIdLabel = idTypeLabel(data.customer?.citizen, data.customer?.idType ?? data.wna_id_type);
	const spouseIdLabel = idTypeLabel(data.spouse?.citizen, data.spouse?.idType);

	const custIdDocs = pickDocs(docs, customerIdDocTypes(isIndividu, data.customer?.citizen));
	const spouseIdDocs = pickDocs(
		docs,
		spouseIdDocTypes(isIndividu, data.customer?.citizen, data.spouse?.citizen),
	);

	return (
		<div className={`bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6 ${embedded ? '' : 'min-h-screen'}`}>

			<DocPreviewModal
				state={preview}
				onClose={closePreview}
				onDownload={handleDownload}
				downloadingId={downloadingId}
			/>

			<div className="max-w-full mx-auto space-y-4">
				<div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-600 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div>
						<h1 className="text-white text-2xl font-bold">View Prechecking Data</h1>
						<p className="text-blue-200 text-sm mt-1">
							Prechecking ID:{" "}
							<span className="font-mono font-semibold text-white">{data.prechecking_id}</span>
						</p>
					</div>
					<button
						onClick={goBack}
						className="self-start md:self-auto bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
					>
						{embedded ? (
							<>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
								</svg>
								Close
							</>
						) : (
							<>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
										d="M10 19l-7-7m0 0l7-7m-7 7h18" />
								</svg>
								Back
							</>
						)}
					</button>
				</div>

				<div className="flex gap-1 bg-[var(--app-card)] rounded-xl p-1 shadow-sm border border-[var(--app-border)] w-fit">
					{(["data", "history"] as const).map((t) => (
						<button
							key={t}
							onClick={() => setTab(t)}
							className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === t
								? "bg-blue-600 text-white shadow-sm"
								: "text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]"
								}`}
						>
							{t === "data" ? "Prechecking Data" : "Approval History"}
						</button>
					))}
				</div>

				{tab === "data" && (
					<div className="bg-[var(--app-card)] rounded-2xl shadow-sm border border-[var(--app-border)] p-6 space-y-8">

						<section>
							<SectionHeader title="General Information" />
							<StatBlock rows={[
								["Last Prechecking Date", data.last_checking_date || "—"],
								["Outstanding", `IDR ${(data.outstanding ?? 0).toLocaleString("id-ID")}`],
							]} />
							<div className="grid md:grid-cols-2 gap-x-12">
								<div>
									<FieldRow label="Checking For"
										value={
											data.check_for === "C" ? "Customer"
												: data.check_for === "G" ? "Guarantor"
													: data.check_for === "P" ? "Pengurus"
														: data.check_for
										} />
									<FieldRow label="Type"
										value={data.customer_type === "PR" ? "Individu" : "Corporate"} />
									<FieldRow label="New / Repeat Order"
										value={data.new_ro === "1" ? "Repeat Order" : "New"} />
									<FieldRow label="Temp. Customer No."
										value={<span className="font-mono">{data.apless}</span>} />
								</div>
								<div>
									{!isCorporate && <FieldRow label="Nationality" value={data.nationality} />}
									{!isCorporate && <FieldRow label="ID Type" value={custIdLabel} />}
								</div>
							</div>
						</section>

						{isCorporate && (
							<section>
								<SectionHeader title="Company Information" />
								<FieldRow label="Company Type" value={data.corp_type_label} />
								<FieldRow label="Nama" value={data.corp_name} />
								<FieldRow label="NPWP" value={data.corp_npwp} />
								<DocRow
									label="File NPWP"
									docs={docs["corp-npwp"] ?? []}
									onPreview={handlePreview}
									onDownload={handleDownload}
									loadingId={fetchingId}
									downloadingId={downloadingId}
								/>
								<FieldRow label="Alamat" value={data.corp_address} />
							</section>
						)}

						{isCorporate && (data.corporate?.length ?? 0) > 0 && (
							<section>
								<SectionHeader title="Data Pengurus (WNI)" />
								<PengurusTabs
									officers={data.corporate!}
									documents={docs}
									onPreview={handlePreview}
									onDownload={handleDownload}
									loadingId={fetchingId}
									downloadingId={downloadingId}
								/>
							</section>
						)}

						{isCorporate && (data.wna_board?.length ?? 0) > 0 && (
							<section>
								<SectionHeader title="Data Pengurus (WNA)" />
								<div className="rounded-xl border border-[var(--app-border)] overflow-x-auto mb-3">
									<table className="w-full text-sm table-fixed">
										<colgroup>
											<col style={{ width: "30%" }} />
											<col style={{ width: "15%" }} />
											<col style={{ width: "20%" }} />
											<col style={{ width: "35%" }} />
										</colgroup>
										<thead className="bg-[var(--app-surface)]">
											<tr>
												<th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">Name</th>
												<th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">ID Type</th>
												<th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">ID Card No.</th>
												<th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">File Identitas</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--app-border)]">
											{data.wna_board!.map((w, i) => {
												const fileDocs = boardDocsFor(docs, "wna-corp-board_", data.wna_board!, i);
												return (
													<tr key={i}>
														<td className="px-4 py-2.5 text-[var(--app-text)] align-top break-words">{w.name || "—"}</td>
														<td className="px-4 py-2.5 text-[var(--app-text)] align-top break-words">{idTypeLabel("WNA", w.idType)}</td>
														<td className="px-4 py-2.5 text-[var(--app-text)] align-top break-words">{w.idCardNo || "—"}</td>
														<td className="px-4 py-2.5 align-top">
															{fileDocs.length === 0 ? (
																<span className="text-[var(--app-muted)] text-sm">No file(s) uploaded.</span>
															) : (
																<div className="flex flex-wrap gap-2">
																	{fileDocs.map((d) => (
																		<DocChip
																			key={d.id}
																			doc={d}
																			onPreview={handlePreview}
																			onDownload={handleDownload}
																			loading={fetchingId === d.id}
																			downloading={downloadingId === d.id}
																		/>
																	))}
																</div>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</section>
						)}

						{isCorporate && (data.shareholders?.length ?? 0) > 0 && (
							<section>
								<SectionHeader title="Data Shareholder Company" />
								<div className="rounded-xl border border-[var(--app-border)] overflow-x-auto mb-3">
									<table className="w-full text-sm table-fixed">
										<colgroup>
											<col style={{ width: "6%" }} />
											<col style={{ width: "28%" }} />
											<col style={{ width: "12%" }} />
											<col style={{ width: "20%" }} />
											<col style={{ width: "34%" }} />
										</colgroup>
										<thead className="bg-[var(--app-surface)]">
											<tr>
												<th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">#</th>
												<th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">Name</th>
												<th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">ID Type</th>
												<th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">NPWP No.</th>
												<th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider">File NPWP</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--app-border)]">
											{data.shareholders!.map((sh, i) => {
												const fileDocs = shareholderDocsFor(docs, sh.npwpNo);
												return (
													<tr key={i}>
														<td className="px-4 py-2.5 text-[var(--app-text)] align-top">{i + 1}</td>
														<td className="px-4 py-2.5 text-[var(--app-text)] align-top break-words">{sh.name || "—"}</td>
														<td className="px-4 py-2.5 text-[var(--app-text)] align-top break-words">{sh.idType || "NPWP"}</td>
														<td className="px-4 py-2.5 text-[var(--app-text)] align-top break-words font-mono">{sh.npwpNo || "—"}</td>
														<td className="px-4 py-2.5 align-top">
															{fileDocs.length === 0 ? (
																<span className="text-[var(--app-muted)] text-sm">No file(s) uploaded.</span>
															) : (
																<div className="flex flex-wrap gap-2">
																	{fileDocs.map((d) => (
																		<DocChip
																			key={d.id}
																			doc={d}
																			onPreview={handlePreview}
																			onDownload={handleDownload}
																			loading={fetchingId === d.id}
																			downloading={downloadingId === d.id}
																		/>
																	))}
																</div>
															)}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</section>
						)}

						{(isIndividu || isGuarnPR) && data.customer && data.customer.citizen === "WNI" && (
							<section>
								<SectionHeader title={isIndividu ? "Customer KTP (OCR)" : "Guarantor KTP (OCR)"} />
								<KtpFileChips
									label="File KTP"
									docs={custIdDocs}
									onPreview={handlePreview}
									onDownload={handleDownload}
									loadingId={fetchingId}
									downloadingId={downloadingId}
								/>
								<OcrTable
									title={isIndividu ? "Customer · WNI" : "Guarantor · WNI"}
									data={data.customer}
								/>
							</section>
						)}

						{(isIndividu || isGuarnPR) && data.customer?.citizen === "WNA" && (
							<section>
								<SectionHeader title={isIndividu ? "Customer WNA" : "Guarantor WNA"} />
								<FieldRow label="Nama" value={data.wna_name} />
								<FieldRow label="ID Type" value={custIdLabel} />
								<FieldRow label={`ID Card No. (${custIdLabel})`} value={data.wna_idcard} />
								<DocRow
									label={`ID Card (${custIdLabel} / Passport)`}
									docs={custIdDocs}
									onPreview={handlePreview}
									onDownload={handleDownload}
									loadingId={fetchingId}
									downloadingId={downloadingId}
								/>
							</section>
						)}

						{!isCorporate && (
							<section>
								<SectionHeader title="Marital Status" />
								<div className="max-w-2xl">
									<DisabledSelect label="Marital Status" value={data.marital} />
								</div>
							</section>
						)}

						{data.spouse && data.spouse.citizen === "WNI" && (
							<section>
								<SectionHeader title="Spouse KTP (OCR)" />
								<KtpFileChips
									label="File KTP Pasangan"
									docs={spouseIdDocs}
									onPreview={handlePreview}
									onDownload={handleDownload}
									loadingId={fetchingId}
									downloadingId={downloadingId}
								/>
								<OcrTable title="Spouse · WNI" data={data.spouse} />
							</section>
						)}

						{data.spouse && data.spouse.citizen === "WNA" && (
							<section>
								<SectionHeader title="Spouse (WNA)" />
								<FieldRow label="Spouse Name" value={data.spouse.name?.value} />
								<FieldRow label="Spouse ID Type" value={spouseIdLabel} />
								<FieldRow label={`Spouse ID Card No. (${spouseIdLabel})`} value={data.spouse.idCardNo?.value} />
								<DocRow
									label={`Spouse ID Card (${spouseIdLabel})`}
									docs={spouseIdDocs}
									onPreview={handlePreview}
									onDownload={handleDownload}
									loadingId={fetchingId}
									downloadingId={downloadingId}
								/>
							</section>
						)}

						{!isCorporate && (
							<section>
								<SectionHeader title="Documents & Notes" />
								<div className="max-w-2xl">
									<DocRow
										label="KK (Kartu Keluarga)"
										docs={docs[isIndividu ? "cust-kk" : "guarantor-kk"] ?? []}
										onPreview={handlePreview}
										onDownload={handleDownload}
										loadingId={fetchingId}
										downloadingId={downloadingId}
									/>
									<DocRow
										label="NPWP"
										docs={docs[isIndividu ? "cust-npwp" : "guarantor-npwp"] ?? []}
										onPreview={handlePreview}
										onDownload={handleDownload}
										loadingId={fetchingId}
										downloadingId={downloadingId}
									/>
									<DocRow
										label="Akta Cerai / Akta Kematian"
										docs={docs[isIndividu ? "cust-marriage-or-death-statement" : "guarantor-marriage-or-death-statement"] ?? []}
										onPreview={handlePreview}
										onDownload={handleDownload}
										loadingId={fetchingId}
										downloadingId={downloadingId}
									/>
									<DisabledSelect label="Reference"
										value={data.is_carro === "1" ? "Carro" : "Non Carro"} />
									<DisabledTextarea label="Note for Prechecking" value={data.note} />
								</div>
							</section>
						)}

						{isCorporate && (
							<section>
								<SectionHeader title="Supporting Documents, Reference & Notes" />
								<div className="max-w-2xl">
									<DocRow label="Akta Pendirian" docs={docs["corp-akta"] ?? []} onPreview={handlePreview} onDownload={handleDownload} loadingId={fetchingId} downloadingId={downloadingId} />
									<DocRow label="SK Kemenkumham Akta Pendirian" docs={docs["corp-sk-akta"] ?? []} onPreview={handlePreview} onDownload={handleDownload} loadingId={fetchingId} downloadingId={downloadingId} />
									<DocRow label="Akta Perubahan Terakhir" docs={docs["corp-akta-terakhir"] ?? []} onPreview={handlePreview} onDownload={handleDownload} loadingId={fetchingId} downloadingId={downloadingId} />
									<DocRow label="SK Kemenkumham atas Akta Perubahan Terakhir" docs={docs["corp-sk-akta-terakhir"] ?? []} onPreview={handlePreview} onDownload={handleDownload} loadingId={fetchingId} downloadingId={downloadingId} />
									<DisabledSelect label="Reference"
										value={data.is_carro === "1" ? "Carro" : "Non Carro"} />
									<DisabledTextarea label="Note for Prechecking" value={data.note} />
								</div>
							</section>
						)}

						{data.sik && data.sik.length > 0 && (
							<section>
								<SectionHeader title="SIK Checking Data" />
								<div className="rounded-xl border border-[var(--app-border)] overflow-hidden">
									<table className="w-full text-sm">
										<thead className="bg-[var(--app-surface)]">
											<tr>
												{["Subject", "Credit Bureau", "Status", "Score", "Grade"].map((h) => (
													<th
														key={h}
														className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--app-muted)] uppercase tracking-wider"
													>{h}</th>
												))}
											</tr>
										</thead>
										<tbody className="divide-y divide-[var(--app-border)]">
											{data.sik.map((row, i) => (
												<tr key={i} className={i % 2 === 0 ? "bg-[var(--app-card)]" : "bg-[var(--app-surface)]"}>
													<td className="px-4 py-2.5 text-[var(--app-text)]">{row.subject}</td>
													<td className="px-4 py-2.5 text-[var(--app-text)]">{row.credit_bureau}</td>
													<td className="px-4 py-2.5 text-[var(--app-text)]">{row.status}</td>
													<td className="px-4 py-2.5 text-[var(--app-text)]">{row.score}</td>
													<td className="px-4 py-2.5 text-[var(--app-text)]">{row.grade}</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</section>
						)}

					</div>
				)}

				{tab === "history" && (
					<ApprovalHistory apless={apless} precheckingId={prechecking_id} />
				)}

			</div>
		</div>
	);
};

export default ViewPrecheckingPage;
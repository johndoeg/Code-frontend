import React, { useEffect, useState } from "react";

export interface CustomerData {
	idCardNo: string; name: string; placeOfBirth: string; dateOfBirth: string;
	gender: string; bloodType: string; address: string; rt: string; rw: string;
	subdistrict: string; district: string; city: string; province: string;
	religion: string; job: string; citizen: string; photo: string; signature: string;
}
export type ConfidenceMap = Partial<Record<keyof CustomerData, string>>;
export type VerifiedMap = Partial<Record<keyof CustomerData, string>>;
export interface DukcapilVerification { checked: boolean; status: boolean | null; reason: string; }
export const ver_UNCHECKED: DukcapilVerification = { checked: false, status: null, reason: "" };
export interface MaritalOption { value: string; label: string; }
export interface UploadedDoc { id: number; name: string; type: string; key: string; previewUrl?: string; view_url?: string | null; readonly?: boolean; }

export type IdType = "KTP" | "KITAS" | "KITAP";
export const WNA_ID_TYPES: IdType[] = ["KITAS", "KITAP"];

export const EMPTY_CUSTOMER = (): CustomerData => ({
	idCardNo: "", name: "", placeOfBirth: "", dateOfBirth: "",
	gender: "", bloodType: "", address: "", rt: "", rw: "",
	subdistrict: "", district: "", city: "", province: "",
	religion: "", job: "", citizen: "", photo: "", signature: "",
});

const EMPTY_ID_SET: Set<number> = new Set();

export interface OcrRecord {
	id?: number;
	nik?: string; nama?: string; tempatLahir?: string; tglLahir?: string;
	jenisKelamin?: string; golonganDarah?: string; alamat?: string; rtRw?: string;
	kelurahan?: string; kecamatan?: string; kota?: string; provinsi?: string;
	agama?: string; pekerjaan?: string; status_perkawinan?: string;
	kewarnegaraan?: string; idType?: string; foto?: string; tandaTangan?: string;
	confidence?: ConfidenceMap;
	verified?: VerifiedMap;
	dukcapil?: DukcapilVerification;
}

export const mapOcrToCustomer = (ocr?: OcrRecord | null): CustomerData => {
	if (!ocr || !ocr.id) return EMPTY_CUSTOMER();
	const [rt = "", rw = ""] = (ocr.rtRw || "").split("/").map((s) => s.trim());
	return {
		idCardNo: ocr.nik || "",
		name: ocr.nama || "",
		placeOfBirth: ocr.tempatLahir || "",
		dateOfBirth: ocr.tglLahir || "",
		gender: ocr.jenisKelamin || "",
		bloodType: ocr.golonganDarah || "",
		address: ocr.alamat || "",
		rt, rw,
		subdistrict: ocr.kelurahan || "",
		district: ocr.kecamatan || "",
		city: ocr.kota || "",
		province: ocr.provinsi || "",
		religion: ocr.agama || "",
		job: ocr.pekerjaan || "",
		citizen: ocr.kewarnegaraan || "",
		photo: ocr.foto || "",
		signature: ocr.tandaTangan || "",
	};
};

export const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "bmp", "heic", "heif", "tiff", "tif", "webp"]);

export const matchToBit = (value?: string): number => (value === "True" ? 1 : 0);

const STYLE_TAG_ID = "prechecking-individu-styles";

const CSS = `
  :root {
    --navy:   #1B3A7A;
    --blue:   #2D5BE3;
    --sky:    #EBF1FF;
    --mint:   #10B981;
    --amber:  #F59E0B;
    --rose:   #EF4444;
    --ink:    #0F1D3C;
    --muted:  #64748B;
    --border: #DDE3F0;
    --card:   #FFFFFF;
    --bg:     #F2F5FB;
    --font:   'Plus Jakarta Sans', sans-serif;
    --mono:   'JetBrains Mono', monospace;
  }
  * { box-sizing: border-box; }
  body { font-family: var(--font); background: var(--bg); }

  .page-wrap { margin: 0 auto; padding: 10px; }

  .hdr {
    background: linear-gradient(135deg, #0F1D3C 0%, #1B3A7A 55%, #2D5BE3 100%);
    border-radius: 16px; padding: 20px 28px;
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 24px; box-shadow: 0 8px 32px rgba(27,58,122,.35);
    position: relative; overflow: hidden;
  }
  .hdr::after {
    content: ''; position: absolute; right: -40px; top: -40px;
    width: 160px; height: 160px; border-radius: 50%;
    background: rgba(255,255,255,.06); pointer-events: none;
  }
  .hdr-title { color: #fff; font-size: 1.125rem; font-weight: 800; letter-spacing: -.01em; }
  .hdr-sub { color: rgba(255,255,255,.65); font-size: .75rem; margin-top: 2px; }
  .hdr-badge {
    background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2);
    border-radius: 10px; padding: 8px 16px; display: flex; flex-direction: column; align-items: flex-end;
  }
  .hdr-badge-label { color: rgba(255,255,255,.6); font-size: .7rem; text-transform: uppercase; letter-spacing: .08em; }
  .hdr-badge-value { color: #fff; font-size: .875rem; font-family: var(--mono); font-weight: 500; }

  .card {
    background: var(--card); border-radius: 16px;
    border: 1px solid var(--border); padding: 28px;
    box-shadow: 0 2px 12px rgba(15,29,60,.06); margin-bottom: 20px;
  }
  .section-label {
    display: flex; align-items: center; gap: 10px;
    font-size: .8rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .1em; color: var(--navy); margin-bottom: 20px;
  }
  .section-label span.dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--blue); flex-shrink: 0;
  }
  .section-label hr { flex: 1; border: none; border-top: 1.5px solid var(--border); }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 28px; }
  @media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } }
  .form-field { display: flex; flex-direction: column; gap: 6px; }
  .form-field.full { grid-column: 1 / -1; }
  .form-label { font-size: .78rem; font-weight: 600; color: var(--ink); letter-spacing: .01em; }
  .form-label .req { color: var(--rose); margin-left: 2px; }
  .form-input, .form-select, .form-textarea {
    width: 100%; padding: 9px 14px; font-size: .875rem; font-family: var(--font);
    border: 1.5px solid var(--border); border-radius: 10px; color: var(--ink);
    background: #fff; transition: border-color .18s, box-shadow .18s; outline: none;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus {
    border-color: var(--blue); box-shadow: 0 0 0 3px rgba(45,91,227,.1);
  }
  .form-input.err, .form-select.err { border-color: var(--rose); }
  .form-textarea { resize: vertical; min-height: 72px; }
  .field-err { font-size: .72rem; color: var(--rose); margin-top: 2px; }

  .upload-zone {
    border: 2px dashed var(--border); border-radius: 12px;
    padding: 16px 20px; cursor: pointer;
    transition: border-color .2s, background .2s; background: #F8FAFF;
    display: flex; align-items: center; gap: 12px;
  }
  .upload-zone:hover { border-color: var(--blue); background: var(--sky); }
  .upload-zone-icon {
    width: 38px; height: 38px; border-radius: 10px;
    background: var(--sky); border: 1.5px solid var(--border);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    color: var(--blue);
  }
  .upload-zone-text { text-align: left; }
  .upload-zone-title { font-size: .82rem; font-weight: 600; color: var(--navy); }
  .upload-zone-sub { font-size: .72rem; color: var(--muted); margin-top: 1px; }

  .doc-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .doc-chip {
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--sky); border: 1px solid #C7D7F8;
    border-radius: 6px; padding: 3px 8px;
    font-size: .72rem; font-weight: 500; color: var(--navy);
  }
  .doc-chip-btn {
    background: none; border: none; cursor: pointer; padding: 0 1px;
    color: var(--muted); display: flex; align-items: center; transition: color .15s; line-height: 1;
  }
  .doc-chip-btn:hover { color: var(--blue); }
  .doc-chip-del {
    background: none; border: none; cursor: pointer;
    color: var(--muted); font-size: .9rem; line-height: 1; padding: 0 1px; transition: color .15s;
  }
  .doc-chip-del:hover { color: var(--rose); }

  .sub-section { border-radius: 12px; padding: 20px; border: 1.5px solid; }
  .sub-section.blue   { border-color: #BFDBFE; background: #EFF6FF; }
  .sub-section.orange { border-color: #FED7AA; background: #FFF7ED; }
  .sub-section.purple { border-color: #DDD6FE; background: #F5F3FF; }
  .sub-section-title { font-size: .82rem; font-weight: 700; margin-bottom: 16px; }
  .sub-section.blue   .sub-section-title { color: #1E3A8A; }
  .sub-section.orange .sub-section-title { color: #9A3412; }
  .sub-section.purple .sub-section-title { color: #4C1D95; }

  .spin {
    display: inline-block; width: 18px; height: 18px; border-radius: 50%;
    border: 3px solid rgba(255,255,255,.3); border-top-color: #fff;
    animation: spin .7s linear infinite; flex-shrink: 0;
  }
  .spin.dark { border-color: rgba(27,58,122,.15); border-top-color: var(--navy); }
  @keyframes spin { to { transform: rotate(360deg); } }

  .btn-modal-ghost {
    background: none; border: 1.5px solid var(--border); border-radius: 10px;
    padding: 9px 20px; font-size: .82rem; font-weight: 600; font-family: var(--font);
    cursor: pointer; color: var(--ink); transition: background .2s;
  }
  .btn-modal-ghost:hover { background: #F4F7FF; }

  .btn-primary {
    background: linear-gradient(135deg, var(--navy), var(--blue));
    color: #fff; border: none; border-radius: 12px;
    padding: 11px 28px; font-size: .875rem; font-weight: 700;
    font-family: var(--font); cursor: pointer;
    transition: opacity .2s, transform .15s;
    display: inline-flex; align-items: center; gap: 8px;
    box-shadow: 0 4px 16px rgba(45,91,227,.3);
  }
  .btn-primary:hover { opacity: .9; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: .55; cursor: not-allowed; transform: none; }
  .btn-ghost {
    background: #fff; color: var(--ink); border: 1.5px solid var(--border);
    border-radius: 12px; padding: 11px 24px; font-size: .875rem; font-weight: 600;
    font-family: var(--font); cursor: pointer; transition: background .2s;
  }
  .btn-ghost:hover { background: #F4F7FF; }

  .select-wrap { position: relative; }
  .select-wrap select { appearance: none; padding-right: 36px; }
  .select-wrap::after {
    content: ''; position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    width: 0; height: 0;
    border-left: 5px solid transparent; border-right: 5px solid transparent;
    border-top: 6px solid var(--muted); pointer-events: none;
  }
  .select-wrap:focus-within::after { border-top-color: var(--blue); }

  .form-select.nat-active {
    border-color: var(--blue); background: var(--sky); color: var(--navy); font-weight: 700;
  }
  .form-input.is-readonly {
    background: #F4F7FF; color: var(--muted); cursor: default; border-color: #E8EEF8;
  }
  .form-select.is-disabled {
    background: #F4F7FF; color: var(--muted); cursor: default; border-color: #E8EEF8;
  }

  .dukcapil-gate {
    border-radius: 12px; padding: 12px 16px; margin-bottom: 4px;
    font-size: .8rem; font-weight: 600; display: flex; align-items: center; gap: 8px;
  }
  .dukcapil-gate.pending { background: #FEF2F2; color: #B91C1C; border: 1.5px solid #FECACA; }

  .lookup-note { margin-top: 10px; font-size: .76rem; font-weight: 600; }
  .lookup-note.ok   { color: #047857; }
  .lookup-note.warn { color: #B45309; }

  .lookup-panel {
    margin-top: 14px; background: #fff; border: 1.5px solid var(--border);
    border-radius: 12px; overflow: hidden;
  }
  .lookup-panel-head {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 10px 14px; border-bottom: 1px solid var(--border); background: #F8FAFF;
  }
  .lookup-panel-title { font-size: .78rem; font-weight: 700; color: var(--navy); }
  .lookup-body { display: flex; gap: 16px; padding: 14px; align-items: flex-start; flex-wrap: wrap; }
  .lookup-photo {
    width: 92px; height: 118px; object-fit: cover; border-radius: 8px;
    border: 1.5px solid var(--border); background: #F8FAFF; cursor: pointer; flex-shrink: 0;
  }
  .lookup-photo-empty {
    width: 92px; height: 118px; border-radius: 8px; border: 1.5px dashed var(--border);
    background: #F8FAFF; color: var(--muted); font-size: .68rem; font-weight: 600;
    display: flex; align-items: center; justify-content: center; text-align: center;
    padding: 6px; flex-shrink: 0;
  }
  .lookup-docs { flex: 1 1 240px; min-width: 220px; }
  .lookup-docs-label {
    font-size: .68rem; font-weight: 700; color: var(--muted);
    text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px;
  }
  .lookup-docs-empty { font-size: .76rem; color: var(--muted); }
  .lookup-badge {
    display: inline-block; padding: 2px 8px; border-radius: 999px;
    font-size: .68rem; font-weight: 700; white-space: nowrap;
  }
  .lookup-badge.ok   { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
  .lookup-badge.no   { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
  .lookup-badge.idle { background: #F1F5F9; color: #64748B; border: 1px solid #E2E8F0; }
  .epc-stats { display: flex; justify-content: flex-end; width: 100%; margin-bottom: 14px; }
  .epc-stats table { border-collapse: collapse; margin-left: auto; }
  .epc-stats td { padding: 2px 0; white-space: nowrap; }
  .epc-stats td.k { padding-right: 14px; font-size: .82rem; color: var(--muted); text-align: left; }
  .epc-stats td.v { font-size: .95rem; font-weight: 800; color: var(--ink); text-align: right; }
  .epc-wna-card { border: 1.5px solid var(--border); border-radius: 12px; background: #FAFCFF; padding: 14px 16px; margin-bottom: 12px; }
  .epc-wna-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
  .epc-wna-title { font-size: .82rem; font-weight: 800; color: var(--navy); }
  .epc-wna-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 24px; }
  .epc-wna-row + .epc-wna-row { margin-top: 12px; }
  .epc-pair { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
  .epc-pair-label { flex: 0 0 120px; padding-top: 10px; font-size: .78rem; font-weight: 700; color: var(--ink); }
  .epc-pair-body { flex: 1 1 auto; min-width: 0; }
  @media (max-width: 760px) { .epc-wna-row { grid-template-columns: 1fr; } }
`;

export const useInjectStyles = () => {
	useEffect(() => {
		let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
		if (!tag) {
			tag = document.createElement("style");
			tag.id = STYLE_TAG_ID;
			document.head.appendChild(tag);
		}
		tag.textContent = CSS;
	}, []);
};

export const Spinner: React.FC<{ dark?: boolean; size?: number }> = ({ dark, size = 18 }) => (
	<span className={`spin${dark ? " dark" : ""}`} style={{ width: size, height: size }} />
);

export const FileInput: React.FC<{
	multiple?: boolean; onFileChange: (f: File) => void;
	label?: string; uploading?: boolean;
}> = ({ multiple, onFileChange, label = "Upload Document", uploading = false }) => {
	const ref = React.useRef<HTMLInputElement>(null);
	return (
		<label
			className="upload-zone"
			onClick={() => !uploading && ref.current?.click()}
			style={{ cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.7 : 1 }}
		>
			<div className="upload-zone-icon">
				{uploading
					? <span className="spin dark" style={{ width: 18, height: 18 }} />
					: (
						<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
						</svg>
					)
				}
			</div>
			<div className="upload-zone-text">
				<div className="upload-zone-title">{uploading ? "Mengupload…" : label}</div>
				<div className="upload-zone-sub">
					{uploading ? "Sedang upload ke server, harap tunggu" : "PNG, JPG, PDF, TIFF · max 2 MB"}
				</div>
			</div>
			<input
				ref={ref} type="file" multiple={multiple}
				accept=".png,.jpg,.jpeg,.pdf,.tiff"
				style={{ display: "none" }}
				disabled={uploading}
				onChange={(e) => {
					const f = e.target.files?.[0];
					if (f) { onFileChange(f); e.target.value = ""; }
				}}
			/>
		</label>
	);
};

const DocChip: React.FC<{
	doc: UploadedDoc;
	onPreview: (doc: UploadedDoc) => void;
	onDelete: (id: number) => void;
	isDeleting: boolean;
	isPreviewLoading: boolean;
	canPreview: boolean;
}> = ({ doc, onPreview, onDelete, isDeleting, isPreviewLoading, canPreview }) => {
	const [hovered, setHovered] = useState(false);

	return (
		<div style={{ display: "inline-flex", alignItems: "center", gap: 8, opacity: isDeleting ? 0.6 : 1 }}>
			{canPreview && (
				<button
					onClick={() => onPreview(doc)}
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
					disabled={isPreviewLoading}
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
						cursor: isPreviewLoading ? "not-allowed" : "pointer",
						transition: "background 0.15s, color 0.15s, border-color 0.15s",
					}}
				>
					{isPreviewLoading ? (
						<span style={{ width: 13, height: 13, display: "inline-block", borderRadius: "50%", border: "2px solid rgba(194,65,12,.3)", borderTopColor: "#c2410c", animation: "spin .7s linear infinite" }} />
					) : (
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
					)}
					View
				</button>
			)}
			<span style={{ fontSize: 13, color: "#374151" }}>{doc.name}</span>
			{doc.readonly && (
				<span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".04em" }}>
					Existing
				</span>
			)}
			{isDeleting
				? <span className="spin dark" style={{ width: 12, height: 12 }} />
				: !doc.readonly && <button className="doc-chip-del" title="Hapus" onClick={() => onDelete(doc.id)}>×</button>
			}
		</div>
	);
};

const NOOP_DELETE = () => { };

export const DocList: React.FC<{
	docs: UploadedDoc[];
	onDelete: (id: number) => void;
	deletingDocs?: Set<number>;
	onPreview: (doc: UploadedDoc) => void;
	previewLoadingId?: number | null;
}> = ({ docs, onDelete, deletingDocs = EMPTY_ID_SET, onPreview, previewLoadingId = null }) =>
		docs.length ? (
			<div className="doc-chips" style={{ flexDirection: "column", alignItems: "flex-start", gap: 8 }}>
				{docs.map((d) => {
					const ext = d.name.split(".").pop()?.toLowerCase() ?? "";
					const canPreview = IMAGE_EXTS.has(ext) || ext === "pdf";
					return (
						<DocChip
							key={d.id}
							doc={d}
							onPreview={onPreview}
							onDelete={onDelete}
							isDeleting={deletingDocs.has(d.id)}
							isPreviewLoading={previewLoadingId === d.id}
							canPreview={canPreview}
						/>
					);
				})}
			</div>
		) : null;

const asImageSrc = (raw?: string): string | undefined => {
	if (!raw) return undefined;
	return raw.startsWith("data:") ? raw : `data:image/jpeg;base64,${raw}`;
};

export const LookupResultPanel: React.FC<{
	dukcapil: DukcapilVerification;
	sourcePrecheckingId?: string;
	lastOCROn?: string;
	photo?: string;
	documents: UploadedDoc[];
	onPreview: (doc: UploadedDoc) => void;
	onPreviewPhoto: (src: string) => void;
	previewLoadingId?: number | null;
	onCancel?: () => void;
	cancelLabel?: string;
	cancelDisabled?: boolean;
}> = ({
	dukcapil, sourcePrecheckingId, lastOCROn, photo, documents, onPreview, onPreviewPhoto,
	previewLoadingId = null, onCancel, cancelLabel = "Cancel", cancelDisabled = false,
}) => {
		const photoSrc = asImageSrc(photo);

		const dukcapilBadge =
			!dukcapil.checked
				? <span className="lookup-badge idle">Belum diverifikasi</span>
				: dukcapil.status
					? <span className="lookup-badge ok">Dukcapil: Match</span>
					: <span className="lookup-badge no">Dukcapil: Not Match</span>;

		return (
			<div className="lookup-panel">
				<div className="lookup-panel-head">
					<span className="lookup-panel-title">
						Hasil Pencarian
						{sourcePrecheckingId ? ` · Prechecking ${sourcePrecheckingId}` : ""}
						{lastOCROn ? ` · OCR ${lastOCROn}` : ""}
					</span>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						{dukcapilBadge}
						{onCancel && (
							<button
								type="button"
								className="btn-ghost"
								style={{ padding: "5px 12px", fontSize: ".74rem" }}
								onClick={onCancel}
								disabled={cancelDisabled}
							>
								{cancelLabel}
							</button>
						)}
					</div>
				</div>
				<div className="lookup-body">
					{photoSrc
						? <img className="lookup-photo" src={photoSrc} alt="Pas foto" onClick={() => onPreviewPhoto(photoSrc)} />
						: <div className="lookup-photo-empty">Pas foto tidak tersedia</div>
					}
					<div className="lookup-docs">
						<div className="lookup-docs-label">Dokumen Identitas</div>
						{documents.length
							? (
								<DocList
									docs={documents}
									onDelete={NOOP_DELETE}
									onPreview={onPreview}
									previewLoadingId={previewLoadingId}
								/>
							)
							: <p className="lookup-docs-empty">File identitas tidak ditemukan pada prechecking sebelumnya.</p>
						}
					</div>
				</div>
			</div>
		);
	};

export const StatBlock: React.FC<{ rows: [string, React.ReactNode][] }> = ({ rows }) => (
	<div className="epc-stats">
		<table>
			<tbody>
				{rows.map(([label, value]) => (
					<tr key={label}>
						<td className="k">{label}</td>
						<td className="v">{value}</td>
					</tr>
				))}
			</tbody>
		</table>
	</div>
);

export const FieldPair: React.FC<{ label: React.ReactNode; children: React.ReactNode }> = ({ label, children }) => (
	<div className="epc-pair">
		<label className="epc-pair-label">{label}</label>
		<div className="epc-pair-body">{children}</div>
	</div>
);

export interface PreviewState { open: boolean; name: string; previewUrl?: string; }
export const PREVIEW_CLOSED: PreviewState = { open: false, name: "", previewUrl: undefined };

export const DocPreviewModal: React.FC<{ state: PreviewState; onClose: () => void }> = ({ state, onClose }) => {
	useEffect(() => {
		if (!state.open) return;
		const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [state.open, onClose]);

	if (!state.open) return null;

	const ext = state.name.split(".").pop()?.toLowerCase() ?? "";
	const isImage = IMAGE_EXTS.has(ext);
	const isPdf = ext === "pdf";

	return (
		<div className="preview-overlay" onClick={onClose}
			style={{ position: "fixed", inset: 0, background: "rgba(10,18,40,.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 24, backdropFilter: "blur(6px)" }}>
			<div onClick={(e) => e.stopPropagation()}
				style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 32px 96px rgba(10,18,40,.4)", display: "flex", flexDirection: "column", width: "min(90vw,800px)", maxHeight: "90vh" }}>
				<div style={{ background: "linear-gradient(135deg,#0F1D3C,#2D5BE3)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
					<span style={{ color: "#fff", fontSize: ".875rem", fontWeight: 700, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{state.name}</span>
					<button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.25)", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>×</button>
				</div>
				<div style={{ overflow: "auto", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#F2F5FB", flex: 1, minHeight: 0 }}>
					{isImage && state.previewUrl
						? <img src={state.previewUrl} alt={state.name} style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 10, boxShadow: "0 4px 24px rgba(10,18,40,.18)" }} />
						: isPdf && state.previewUrl
							? <iframe src={state.previewUrl} title={state.name} style={{ width: "100%", height: "60vh", border: "none", borderRadius: 10 }} />
							: <p style={{ color: "#64748B" }}>Preview tidak tersedia untuk tipe file ini</p>
					}
				</div>
				<div style={{ padding: "12px 20px", borderTop: "1px solid #DDE3F0", display: "flex", justifyContent: "flex-end", background: "#fff" }}>
					<button onClick={onClose} className="btn-modal-ghost">Tutup</button>
				</div>
			</div>
		</div>
	);
};
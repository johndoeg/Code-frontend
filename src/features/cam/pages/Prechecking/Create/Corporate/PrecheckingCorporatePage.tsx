import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from '@/shared/api/axiosInstance';
import OCRUploadSection, {
	type InitialOcrData,
	type ConfidenceMap as OcrConfMap,
	type VerifiedMap as OcrVerMap,
	type DukcapilVerification as OcrDukcapil,
} from '@/features/cam/contexts/OCRUploadSection';
import { MAX_FILE_LIMIT } from '@/shared/constants/DefaultValue';

interface DirectorData {
	idCardNo: string; name: string; placeOfBirth: string; dateOfBirth: string;
	gender: string; bloodType: string; address: string; rt: string; rw: string;
	subdistrict: string; district: string; city: string; province: string;
	religion: string; job: string; maritalStatus: string; citizen: string;
	photo: string; signature: string;
}
type ConfidenceMap = Partial<Record<keyof DirectorData, string>>;

type IdType = "KTP" | "KITAS" | "KITAP";
const WNA_ID_TYPES: IdType[] = ["KITAS", "KITAP"];

interface LookupMsg { tone: "ok" | "warn"; text: string; }
interface LookupMeta { precheckingId: string; lastOCROn: string; }

interface DirectorEntry {
	uid: string;
	data: DirectorData;
	conf: ConfidenceMap;
	ver: OcrVerMap;
	dukcapil?: OcrDukcapil;
	initialData?: InitialOcrData;
	seedKey: number;
	nikSearch: string;
	lookupLoading: boolean;
	lookupMsg: LookupMsg | null;
	lookupMeta: LookupMeta | null;
	lookupDocs: UploadedDoc[];
}

interface WnaBoardMember { uid: string; name: string; idCardNo: string; idType: IdType; }

interface LesseeTypeOption { value: string; label: string; }
interface ModalState {
	open: boolean; type: "reject" | "inprogress" | "valid" | "expired" | "";
	message: string; apless: string; precheckingId: string;
}
interface UploadedDoc { id: number; name: string; type: string; key: string; previewUrl?: string; view_url?: string | null; readonly?: boolean; }

const EMPTY_DIRECTOR = (): DirectorData => ({
	idCardNo: "", name: "", placeOfBirth: "", dateOfBirth: "",
	gender: "", bloodType: "", address: "", rt: "", rw: "",
	subdistrict: "", district: "", city: "", province: "",
	religion: "", job: "", maritalStatus: "", citizen: "",
	photo: "", signature: "",
});

interface OcrRecord {
	id?: number;
	nik?: string; nama?: string; tempatLahir?: string; tglLahir?: string;
	jenisKelamin?: string; golonganDarah?: string; alamat?: string; rtRw?: string;
	kelurahan?: string; kecamatan?: string; kota?: string; provinsi?: string;
	agama?: string; pekerjaan?: string; status_perkawinan?: string;
	kewarnegaraan?: string; idType?: string; foto?: string; tandaTangan?: string;
	confidence?: OcrConfMap;
	verified?: OcrVerMap;
	dukcapil?: OcrDukcapil;
}

const mapOcrToDirectorData = (ocr?: OcrRecord | null): DirectorData => {
	if (!ocr || !ocr.id) return EMPTY_DIRECTOR();
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
		maritalStatus: ocr.status_perkawinan || "",
		citizen: ocr.kewarnegaraan || "",
		photo: ocr.foto || "",
		signature: ocr.tandaTangan || "",
	};
};

interface IncomingMeta {
	maritalStatus?: string;
	isCarro?: boolean;
	workAddress?: string;
}

interface IncomingPrecheckState {
	idCard?: string;
	customerType?: string;
	customerName?: string;
	apless?: string;
	precheckingData?: {
		corporate?: OcrRecord[];
	};
	meta?: IncomingMeta;
	documents?: Record<string, { customerDocumentId: number; fileName: string; fileExt: string; awsKey: string; readonly?: boolean }[]>;
}

const REQUIRED_DIRECTOR_FIELDS: [keyof DirectorData, string][] = [
	["idCardNo", "NIK"], ["name", "Nama"], ["placeOfBirth", "Tempat Lahir"],
	["dateOfBirth", "Tanggal Lahir"], ["gender", "Jenis Kelamin"],
	["address", "Alamat"], ["rt", "RT"], ["rw", "RW"],
	["subdistrict", "Kelurahan/Desa"], ["district", "Kecamatan"],
	["city", "Kota/Kabupaten"], ["province", "Provinsi"],
	["job", "Pekerjaan"], ["maritalStatus", "Status Perkawinan"],
];

const directorLabel = (entry: DirectorEntry, all: DirectorEntry[]) =>
	`#${all.findIndex((d) => d.uid === entry.uid) + 1}`;

const directorIsComplete = (entry: DirectorEntry) =>
	REQUIRED_DIRECTOR_FIELDS.every(([key]) => !!entry.data[key]);

const directorHasError = (entry: DirectorEntry, errors: Record<string, string>) =>
	Object.keys(errors).some((k) => k.startsWith(`director_${entry.uid}_`));

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "bmp", "heic", "heif", "tiff", "tif", "webp"]);

const uid = () => Math.random().toString(36).slice(2, 10);

const sanitizeToken = (value?: string) => (value || "").replace(/[^A-Za-z0-9]/g, "");

const DIRECTOR_DOC_PREFIX = "corp-ocr-ktp";
const WNA_BOARD_DOC_PREFIX = "wna-corp-board";

const SERVER_FIELD_MAP: Record<string, keyof DirectorData> = {
	id_card_no: "idCardNo", name: "name", pob: "placeOfBirth", dob: "dateOfBirth",
	gender: "gender", address: "address", rt: "rt", rw: "rw",
	subdistrict: "subdistrict", district: "district", city: "city",
	province: "province", job: "job", marital_status: "maritalStatus",
};

const asImageSrc = (raw?: string): string | undefined => {
	if (!raw) return undefined;
	return raw.startsWith("data:") ? raw : `data:image/jpeg;base64,${raw}`;
};

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

  .spin {
    display: inline-block; width: 18px; height: 18px; border-radius: 50%;
    border: 3px solid rgba(255,255,255,.3); border-top-color: #fff;
    animation: spin .7s linear infinite; flex-shrink: 0;
  }
  .spin.dark { border-color: rgba(27,58,122,.15); border-top-color: var(--navy); }
  @keyframes spin { to { transform: rotate(360deg); } }

  .modal-overlay {
    position: fixed; inset: 0; background: rgba(15,29,60,.5);
    display: flex; align-items: center; justify-content: center; z-index: 50;
    padding: 16px; backdrop-filter: blur(3px);
  }
  .modal-card {
    background: #fff; border-radius: 20px; width: 100%; max-width: 480px;
    overflow: hidden; box-shadow: 0 24px 80px rgba(15,29,60,.25);
    animation: modal-in .22s ease;
  }
  @keyframes modal-in { from { opacity:0; transform: scale(.94) translateY(8px); } }
  .modal-hdr {
    background: linear-gradient(135deg, #0F1D3C, #2D5BE3);
    padding: 18px 24px; display: flex; align-items: center; gap: 10px;
  }
  .modal-icon {
    width: 32px; height: 32px; border-radius: 50%;
    background: rgba(255,255,255,.15); display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .modal-title { color: #fff; font-size: .95rem; font-weight: 700; }
  .modal-body { padding: 24px; font-size: .875rem; color: #334155; line-height: 1.6; }
  .modal-footer {
    padding: 16px 24px; border-top: 1px solid var(--border);
    display: flex; justify-content: flex-end; gap: 10px;
  }
  .btn-modal-primary {
    background: var(--navy); color: #fff; border: none; border-radius: 10px;
    padding: 9px 20px; font-size: .82rem; font-weight: 700; font-family: var(--font);
    cursor: pointer; transition: opacity .2s;
  }
  .btn-modal-primary:hover { opacity: .85; }
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

  .btn-soft {
    background: var(--sky); color: var(--navy); border: 1.5px dashed #C7D7F8;
    border-radius: 12px; padding: 10px 18px; font-size: .82rem; font-weight: 700;
    font-family: var(--font); cursor: pointer; transition: background .2s, border-color .2s;
    display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-soft:hover { background: #DCEAFF; border-color: var(--blue); }
  .btn-remove {
    background: none; border: 1.5px solid var(--border); color: var(--rose);
    border-radius: 10px; padding: 7px 14px; font-size: .78rem; font-weight: 700;
    font-family: var(--font); cursor: pointer; transition: background .2s, border-color .2s;
  }
  .btn-remove:hover { background: #FEF2F2; border-color: var(--rose); }

  .select-wrap { position: relative; }
  .select-wrap select { appearance: none; padding-right: 36px; }
  .select-wrap::after {
    content: ''; position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    width: 0; height: 0;
    border-left: 5px solid transparent; border-right: 5px solid transparent;
    border-top: 6px solid var(--muted); pointer-events: none;
  }
  .select-wrap:focus-within::after { border-top-color: var(--blue); }

  .form-input.is-readonly {
    background: #F4F7FF; color: var(--muted); cursor: default; border-color: #E8EEF8;
  }
  .form-select.is-disabled {
    background: #F4F7FF; color: var(--muted); cursor: default; border-color: #E8EEF8;
  }

  .director-card {
    border: 1.5px solid var(--border); border-radius: 14px;
    padding: 22px; margin-bottom: 18px; background: #FAFCFF;
    position: relative;
  }
  .director-card-hdr {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }
  .director-card-title {
    font-size: .85rem; font-weight: 800; color: var(--navy);
    display: flex; align-items: center; gap: 8px;
  }
  .director-badge {
    width: 24px; height: 24px; border-radius: 7px; background: var(--navy);
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-size: .72rem; font-weight: 800; flex-shrink: 0;
  }

  .director-tabs-wrap {
    border: 1.5px solid var(--border); border-radius: 14px;
    background: #FAFCFF; overflow: hidden; margin-bottom: 18px;
  }
  .director-tabbar {
    display: flex; align-items: stretch; gap: 0; overflow-x: auto;
    background: #F4F7FF; border-bottom: 1.5px solid var(--border);
    scrollbar-width: thin;
  }
  .director-tab {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 18px; border: none; background: none; cursor: pointer;
    font-family: var(--font); font-size: .8rem; font-weight: 700; color: var(--muted);
    white-space: nowrap; position: relative; transition: color .15s, background .15s;
    border-right: 1px solid var(--border);
  }
  .director-tab:hover { background: #EAF0FF; color: var(--navy); }
  .director-tab.active {
    color: var(--navy); background: #fff;
  }
  .director-tab.active::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: -1.5px;
    height: 2.5px; background: var(--blue);
  }
  .director-tab-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    background: var(--border);
  }
  .director-tab-dot.complete { background: var(--mint); }
  .director-tab-dot.error { background: var(--rose); }
  .director-tab-close {
    border: none; background: none; cursor: pointer; color: var(--muted);
    font-size: .95rem; line-height: 1; padding: 0 0 0 2px; transition: color .15s;
  }
  .director-tab-close:hover { color: var(--rose); }
  .director-tab-add {
    display: flex; align-items: center; gap: 6px;
    padding: 12px 16px; border: none; background: none; cursor: pointer;
    font-family: var(--font); font-size: .8rem; font-weight: 700; color: var(--blue);
    white-space: nowrap; transition: background .15s;
  }
  .director-tab-add:hover { background: #EAF0FF; }
  .director-tabpanel { padding: 22px; }

  .wna-board-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; }
  .wna-board-table th {
    text-align: left; font-size: .72rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .06em; color: var(--muted); padding: 0 10px 4px;
  }
  .wna-board-table td { padding: 0 10px; vertical-align: top; }
  .wna-board-row-actions { display: flex; align-items: flex-start; padding-top: 9px; }

  .lookup-box {
    border: 1.5px solid #BFDBFE; background: #EFF6FF;
    border-radius: 12px; padding: 18px; margin-bottom: 16px;
  }
  .lookup-box-title { font-size: .82rem; font-weight: 700; color: #1E3A8A; margin-bottom: 14px; }
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
`;

const styleTag = document.createElement("style");
styleTag.textContent = CSS;
document.head.appendChild(styleTag);

const Spinner: React.FC<{ dark?: boolean; size?: number }> = ({ dark, size = 18 }) => (
	<span className={`spin${dark ? " dark" : ""}`} style={{ width: size, height: size }} />
);

const FileInput: React.FC<{
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

const DocList: React.FC<{
	docs: UploadedDoc[];
	onDelete: (id: number) => void;
	deletingDocs?: Set<number>;
	onPreview: (doc: UploadedDoc) => void;
	previewLoadingId?: number | null;
}> = ({ docs, onDelete, deletingDocs = new Set(), onPreview, previewLoadingId = null }) =>
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

const LookupResultPanel: React.FC<{
	dukcapil?: OcrDukcapil;
	meta: LookupMeta | null;
	photo?: string;
	documents: UploadedDoc[];
	onPreview: (doc: UploadedDoc) => void;
	onPreviewPhoto: (src: string) => void;
	previewLoadingId?: number | null;
}> = ({ dukcapil, meta, photo, documents, onPreview, onPreviewPhoto, previewLoadingId = null }) => {
	const photoSrc = asImageSrc(photo);

	const badge =
		!dukcapil || !dukcapil.checked
			? <span className="lookup-badge idle">Belum diverifikasi</span>
			: dukcapil.status
				? <span className="lookup-badge ok">Dukcapil: Match</span>
				: <span className="lookup-badge no">Dukcapil: Not Match</span>;

	return (
		<div className="lookup-panel">
			<div className="lookup-panel-head">
				<span className="lookup-panel-title">
					Hasil Pencarian
					{meta?.precheckingId ? ` · Prechecking ${meta.precheckingId}` : ""}
					{meta?.lastOCROn ? ` · OCR ${meta.lastOCROn}` : ""}
				</span>
				{badge}
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
								onDelete={() => { }}
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

interface PreviewState { open: boolean; name: string; previewUrl?: string; }
const PREVIEW_CLOSED: PreviewState = { open: false, name: "", previewUrl: undefined };

const DocPreviewModal: React.FC<{ state: PreviewState; onClose: () => void }> = ({ state, onClose }) => {
	if (!state.open) return null;
	const ext = state.name.split(".").pop()?.toLowerCase() ?? "";
	const isImage = IMAGE_EXTS.has(ext);
	const isPdf = ext === "pdf";

	React.useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [onClose]);

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

const HistoryModal: React.FC<{
	modal: ModalState; setModal: React.Dispatch<React.SetStateAction<ModalState>>;
}> = ({ modal, setModal }) => {
	const close = () => setModal((m) => ({ ...m, open: false }));
	return (
		<div className="modal-overlay">
			<div className="modal-card">
				<div className="modal-hdr">
					<div className="modal-icon">
						<svg width="16" height="16" fill="none" stroke="#fff" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
					<span className="modal-title">Notification</span>
				</div>
				<div className="modal-body">{modal.message}</div>
				<div className="modal-footer">
					{modal.type === "reject" && (
						<>
							<button className="btn-modal-ghost" onClick={() => window.history.back()}>NO</button>
							<button className="btn-modal-primary" onClick={close}>YES – Continue</button>
						</>
					)}
					{modal.type === "valid" && (
						<>
							<button className="btn-modal-ghost" onClick={() => window.location.href = `/repeat-order-pt?apless=${modal.apless}&prechecking_id=${modal.precheckingId}&types=P`}>Prechecking</button>
							<button className="btn-modal-primary" onClick={() => window.location.href = `/create-new-cam?apless=${modal.apless}&prechecking_id=${modal.precheckingId}&lessee_tp=PT`}>Create New CAM</button>
						</>
					)}
					{(modal.type === "inprogress" || modal.type === "expired") && (
						<button className="btn-modal-primary" onClick={() => {
							close();
							if (modal.type === "expired") window.location.href = `/repeat-order-pt?apless=${modal.apless}&prechecking_id=${modal.precheckingId}&types=P`;
						}}>Close</button>
					)}
				</div>
			</div>
		</div>
	);
};

const NEW_DIRECTOR = (): DirectorEntry => ({
	uid: uid(),
	data: EMPTY_DIRECTOR(),
	conf: {},
	ver: {},
	dukcapil: undefined,
	seedKey: 0,
	nikSearch: "",
	lookupLoading: false,
	lookupMsg: null,
	lookupMeta: null,
	lookupDocs: [],
});

const PrecheckingCorporatePage: React.FC = () => {
	const location = useLocation();
	const incoming = location.state as IncomingPrecheckState | null;

	const buildInitialDirectors = (): DirectorEntry[] => {
		const officers = incoming?.precheckingData?.corporate || [];
		if (!officers.length) {
			return [NEW_DIRECTOR()];
		}
		return officers.map((officer) => {
			const data = mapOcrToDirectorData(officer);
			return {
				...NEW_DIRECTOR(),
				data,
				conf: (officer.confidence as ConfidenceMap) || {},
				ver: officer.verified || {},
				dukcapil: officer.dukcapil,
				initialData: {
					data,
					conf: officer.confidence,
					ver: officer.verified,
					verification: officer.dukcapil,
				},
			};
		});
	};

	const [precheckingId, setPrecheckingId] = useState("");
	const [apless, setApless] = useState("");
	const [lesseeType, setLesseeType] = useState("");
	const [lesseeTypeOptions, setLesseeTypeOptions] = useState<LesseeTypeOption[]>([]);

	const [corpName, setCorpName] = useState("");
	const [corpAddress, setCorpAddress] = useState("");
	const [corpNpwpNo, setCorpNpwpNo] = useState("");

	const [isCarro, setIsCarro] = useState(true);
	const [notes, setNotes] = useState("");

	const [directors, setDirectors] = useState<DirectorEntry[]>(() => buildInitialDirectors());
	const [activeDirectorTab, setActiveDirectorTab] = useState<string>(() => directors[0].uid);
	const [wnaBoard, setWnaBoard] = useState<WnaBoardMember[]>([]);

	const [docs, setDocs] = useState<UploadedDoc[]>([]);
	const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());
	const [deletingDocs, setDeletingDocs] = useState<Set<number>>(new Set());
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);
	const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);

	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [modal, setModal] = useState<ModalState>({ open: false, type: "", message: "", apless: "", precheckingId: "" });

	useEffect(() => {
		const init = async () => {
			setLoading(true);
			try {
				const lesseePromise = api.get('/CAM/Prechecking/lessee-types');

				const pidPromise = api.post('/CAM/Prechecking/generate-prechecking-id', {});

				const aplessPromise = incoming?.apless
					? Promise.resolve({ data: incoming.apless })
					: api.post('/CAM/Prechecking/generate-apless', { customer_type: "PT" });

				const [lesseeR, pidR, aplessR] = await Promise.all([lesseePromise, pidPromise, aplessPromise]);

				setLesseeTypeOptions(lesseeR.data);
				setPrecheckingId(pidR.data);
				setApless(aplessR.data);

				if (incoming?.customerName) setCorpName(incoming.customerName);
				if (incoming?.idCard) setCorpNpwpNo(incoming.idCard);
				if (incoming?.meta?.workAddress) setCorpAddress(incoming.meta.workAddress);
				if (incoming?.meta && typeof incoming.meta.isCarro === "boolean") {
					setIsCarro(incoming.meta.isCarro);
				}

				const flatDocs: UploadedDoc[] = [];
				Object.entries(incoming?.documents || {}).forEach(([docType, list]) => {
					(list || []).forEach((d) => {
						flatDocs.push({
							id: d.customerDocumentId,
							name: d.fileName,
							type: docType,
							key: d.awsKey,
							readonly: true,
						});
					});
				});
				if (flatDocs.length) setDocs(flatDocs);
			} catch (e) { console.error("Init error", e); }
			finally { setLoading(false); }
		};
		init();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!apless || !precheckingId) return;
		_refreshDocs();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [apless, precheckingId]);

	const _uploadDoc = async (file: File, docType: string) => {
		const MAX_MB = MAX_FILE_LIMIT;
		const ALLOWED_EXTS = [".png", ".jpg", ".jpeg", ".pdf", ".tiff", ".tif", ".bmp", ".gif", ".heic", ".heif", ".xlsx", ".docx"];
		const ext = "." + file.name.split(".").pop()!.toLowerCase();

		if (!ALLOWED_EXTS.includes(ext)) {
			alert("Format file tidak didukung.\nFormat yang diizinkan: PNG, JPG, PDF, TIFF, BMP, GIF, HEIC, XLSX, DOCX");
			return;
		}
		if (ext !== ".pdf" && file.size > MAX_MB * 1024 * 1024) {
			alert(`Ukuran file melebihi batas maksimal (${MAX_MB} MB).`);
			return;
		}

		let localPreviewUrl: string | undefined;
		const extClean = ext.replace(".", "");
		if (IMAGE_EXTS.has(extClean) || ext === ".pdf") {
			localPreviewUrl = URL.createObjectURL(file);
		}

		setUploadingDocs((prev) => new Set(prev).add(docType));
		try {
			const fd = new FormData();
			fd.append("file", file);
			fd.append("apless", apless);
			fd.append("prechecking_id", precheckingId);
			fd.append("document_type", docType);
			fd.append("cust_type", "PT");
			fd.append("lessee_type", lesseeType);

			const res = await api.post(
				'/CAM/Prechecking/upload-document-corporate',
				fd,
				{ headers: { "Content-Type": "multipart/form-data" } },
			);

			if (!res.data?.success) {
				alert(res.data?.message ?? "Upload gagal. Silakan coba lagi.");
				if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
				return;
			}

			await _refreshDocs(localPreviewUrl, res.data.document_name);
		} catch (e: any) {
			if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
			alert(e.response?.data?.message ?? "Upload gagal. Periksa koneksi dan coba lagi.");
		} finally {
			setUploadingDocs((prev) => {
				const next = new Set(prev);
				next.delete(docType);
				return next;
			});
		}
	};

	const _refreshDocs = async (newPreviewUrl?: string, newDocName?: string) => {
		if (!apless || !precheckingId) return;
		try {
			const res = await api.get('/CAM/Prechecking/documents-corporate', {
				params: { apless, prechecking_id: precheckingId },
			});
			const fetched: UploadedDoc[] = res.data ?? [];
			setDocs((prev) => {
				const previewMap = new Map(prev.map((d) => [d.id, d.previewUrl]));
				const readonlyDocs = prev.filter((d) => d.readonly);
				const freshDocs = fetched.map((d) => ({
					...d,
					previewUrl:
						(newDocName && d.name === newDocName)
							? newPreviewUrl
							: previewMap.get(d.id),
				}));
				return [...readonlyDocs, ...freshDocs];
			});
		} catch (e) {
			console.error("Failed to refresh docs", e);
		}
	};

	const _nikForDocType = (docType: string): string => {
		const dirMatch = /^corp-ocr-ktp_(.+)$/.exec(docType);
		if (dirMatch) {
			const token = dirMatch[1];
			const d = directors.find((x) => x.uid === token || sanitizeToken(x.data.idCardNo) === token);
			return d?.data.idCardNo ?? "";
		}
		const wnaMatch = /^wna-corp-board_(.+)$/.exec(docType);
		if (wnaMatch) {
			const token = wnaMatch[1];
			const w = wnaBoard.find((x) => x.uid === token || sanitizeToken(x.idCardNo) === token);
			return w?.idCardNo ?? "";
		}
		return "";
	};

	const handleDeleteDoc = async (docId: number) => {
		const target = docs.find((d) => d.id === docId);
		if (target?.readonly) return;
		if (!window.confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) return;
		setDeletingDocs((prev) => new Set(prev).add(docId));
		try {
			const doc = docs.find((d) => d.id === docId);
			if (doc?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(doc.previewUrl);

			const nik = doc ? _nikForDocType(doc.type) : "";
			const res = await api.post('/CAM/Prechecking/delete-document-corporate', {
				customer_document_id: docId,
				prechecking_id: precheckingId,
				nik,
			});
			if (!res.data?.success) {
				alert(res.data?.message ?? "Hapus dokumen gagal. Silakan coba lagi.");
				return;
			}
			await _refreshDocs();
		} catch (e: any) {
			alert(e.response?.data?.message ?? "Hapus dokumen gagal. Periksa koneksi dan coba lagi.");
		} finally {
			setDeletingDocs((prev) => {
				const next = new Set(prev);
				next.delete(docId);
				return next;
			});
		}
	};

	const _deleteDocsByTypes = async (docTypes: string[], nik?: string) => {
		const types = docTypes.filter(Boolean);
		if (!types.length) return;
		try {
			await api.post('/CAM/Prechecking/delete-documents-by-type-corporate', {
				prechecking_id: precheckingId, document_types: types, nik: nik ?? "",
			});
			setDocs((prev) => prev.filter((d) => !types.includes(d.type)));
		} catch (e) {
			console.error("Failed to cascade-delete documents for", types, e);
		}
	};

	const handlePreview = async (doc: UploadedDoc) => {
		if (doc.previewUrl) {
			setPreview({ open: true, name: doc.name, previewUrl: doc.previewUrl });
			return;
		}
		if (doc.view_url) {
			setPreview({ open: true, name: doc.name, previewUrl: doc.view_url });
			return;
		}

		setPreviewLoadingId(doc.id);
		try {
			const res = await api.get('/CAM/Prechecking/view-document-corporate', {
				params: { customer_document_id: doc.id },
			});
			if (res.data?.success && res.data?.view_url) {
				setPreview({ open: true, name: doc.name, previewUrl: res.data.view_url });
			} else {
				alert(res.data?.message ?? "Dokumen tidak dapat ditampilkan.");
			}
		} catch (e: any) {
			alert(e.response?.data?.message ?? "Gagal memuat pratinjau dokumen.");
		} finally {
			setPreviewLoadingId(null);
		}
	};

	const handleNpwpBlur = async () => {
		if (corpNpwpNo.length < 15) {
			alert("No NPWP kurang panjang, minimal 15 karakter!");
			return;
		}
		try {
			const res = await api.post('/CAM/Prechecking/check-customer-history', {
				idNo: corpNpwpNo, prechecking_id: precheckingId, lesseeType: "PT", checking_for: "C",
			});
			const [msg, al, type, pid] = res.data;
			if (msg) setModal({ open: true, type, message: msg, apless: al, precheckingId: pid });
		} catch (e) { console.error(e); }
	};

	const handleCancel = async () => {
		try { await api.post('/CAM/Prechecking/cancel-corporate', { prechecking_id: precheckingId }); }
		finally { window.history.back(); }
	};

	const docTypeForDirector = (entryUid: string) => `${DIRECTOR_DOC_PREFIX}_${entryUid}`;
	const docTypeForWnaBoard = (entryUid: string) => `${WNA_BOARD_DOC_PREFIX}_${entryUid}`;

	const persistedDirectorDocType = (entry: DirectorEntry) => {
		const nik = sanitizeToken(entry.data.idCardNo);
		return nik ? `${DIRECTOR_DOC_PREFIX}_${nik}` : docTypeForDirector(entry.uid);
	};

	const persistedWnaDocType = (member: WnaBoardMember) => {
		const idNo = sanitizeToken(member.idCardNo);
		return idNo ? `${WNA_BOARD_DOC_PREFIX}_${idNo}` : docTypeForWnaBoard(member.uid);
	};

	const directorDocTypes = (entry: DirectorEntry) =>
		Array.from(new Set([docTypeForDirector(entry.uid), persistedDirectorDocType(entry)]));

	const wnaDocTypes = (member: WnaBoardMember) =>
		Array.from(new Set([docTypeForWnaBoard(member.uid), persistedWnaDocType(member)]));

	const mapServerErrors = (serverErrors: Record<string, string>): Record<string, string> => {
		const mapped: Record<string, string> = {};
		Object.entries(serverErrors || {}).forEach(([key, message]) => {
			const m = /^corp_board_([A-Za-z0-9]+)__(.+)$/.exec(key);
			if (!m) {
				mapped[key] = String(message);
				return;
			}
			const [, token, field] = m;
			const owner = directors.find(
				(d) => d.uid === token || sanitizeToken(d.data.idCardNo) === token,
			);
			const mappedField = SERVER_FIELD_MAP[field];
			if (owner && mappedField) mapped[`director_${owner.uid}_${mappedField}`] = String(message);
			else mapped[key] = String(message);
		});
		return mapped;
	};

	const patchDirector = (entryUid: string, patch: Partial<DirectorEntry>) => {
		setDirectors((prev) => prev.map((d) => (d.uid === entryUid ? { ...d, ...patch } : d)));
	};

	const addDirector = () => {
		const entry = NEW_DIRECTOR();
		setDirectors((prev) => [...prev, entry]);
		setActiveDirectorTab(entry.uid);
	};

	const removeDirector = (entryUid: string) => {
		const removedNik = directors.find((d) => d.uid === entryUid)?.data.idCardNo ?? "";
		setDirectors((prev) => {
			if (prev.length <= 1) return prev;
			const next = prev.filter((d) => d.uid !== entryUid);
			setActiveDirectorTab((cur) => (cur === entryUid ? next[0].uid : cur));
			return next;
		});
		const removed = directors.find((d) => d.uid === entryUid);
		_deleteDocsByTypes(removed ? directorDocTypes(removed) : [docTypeForDirector(entryUid)], removedNik);
	};

	const updateDirector = (
		entryUid: string,
		data: DirectorData,
		conf: ConfidenceMap,
		ver?: OcrVerMap,
		dukcapil?: OcrDukcapil,
	) => {
		setDirectors((prev) => prev.map((d) => (
			d.uid === entryUid
				? {
					...d,
					data,
					conf,
					ver: ver ?? d.ver,
					dukcapil: dukcapil ?? d.dukcapil,
				}
				: d
		)));
	};

	const handleDirectorLookup = async (entryUid: string) => {
		const entry = directors.find((d) => d.uid === entryUid);
		if (!entry) return;

		const nik = entry.nikSearch.replace(/\D/g, "");

		if (nik.length !== 16) {
			patchDirector(entryUid, { lookupMsg: { tone: "warn", text: "NIK harus 16 digit." } });
			return;
		}
		if (directors.some((d) => d.uid !== entryUid && d.data.idCardNo === nik)) {
			patchDirector(entryUid, { lookupMsg: { tone: "warn", text: "NIK ini sudah dipakai pengurus lain." } });
			return;
		}

		patchDirector(entryUid, { lookupLoading: true, lookupMsg: null });
		try {
			const res = await api.post('/CAM/lookup-ocr-by-nik', {
				nik,
				exclude_prechecking_id: precheckingId,
			});

			if (!res.data?.found) {
				patchDirector(entryUid, {
					lookupLoading: false,
					lookupMeta: null,
					lookupDocs: [],
					initialData: undefined,
					lookupMsg: {
						tone: "warn",
						text: res.data?.message ?? "Data tidak ditemukan. Silakan upload KTP untuk OCR.",
					},
				});
				return;
			}

			const rec = res.data.ocr as OcrRecord;
			const data = mapOcrToDirectorData(rec);

			setDirectors((prev) => prev.map((d) => (
				d.uid === entryUid
					? {
						...d,
						data,
						conf: (rec.confidence as ConfidenceMap) || {},
						ver: rec.verified || {},
						dukcapil: rec.dukcapil,
						initialData: {
							data,
							conf: rec.confidence,
							ver: rec.verified,
							verification: rec.dukcapil,
						},
						seedKey: d.seedKey + 1,
						lookupLoading: false,
						lookupMeta: {
							precheckingId: res.data.sourcePrecheckingId || "",
							lastOCROn: res.data.lastOCROn || "",
						},
						lookupDocs: ((res.data.documents ?? []) as UploadedDoc[]).map((doc) => ({ ...doc, readonly: true })),
						lookupMsg: { tone: "ok", text: "Data pengurus ditemukan. Periksa kembali sebelum submit." },
					}
					: d
			)));
		} catch (e: any) {
			patchDirector(entryUid, {
				lookupLoading: false,
				lookupMsg: {
					tone: "warn",
					text: e.response?.data?.message ?? "Gagal mencari data pengurus.",
				},
			});
		}
	};

	const addWnaBoard = () => {
		setWnaBoard((prev) => [...prev, { uid: uid(), name: "", idCardNo: "", idType: "KITAS" }]);
	};

	const removeWnaBoard = (entryUid: string) => {
		const removedNik = wnaBoard.find((w) => w.uid === entryUid)?.idCardNo ?? "";
		setWnaBoard((prev) => prev.filter((w) => w.uid !== entryUid));
		const removed = wnaBoard.find((w) => w.uid === entryUid);
		_deleteDocsByTypes(removed ? wnaDocTypes(removed) : [docTypeForWnaBoard(entryUid)], removedNik);
	};

	const updateWnaBoard = (entryUid: string, field: "name" | "idCardNo" | "idType", value: string) => {
		setWnaBoard((prev) => prev.map((w) => (w.uid === entryUid ? { ...w, [field]: value } : w)));
	};

	const handleSubmit = async () => {
		const e: Record<string, string> = {};
		if (!lesseeType) e.lessee_type = "Company Type is required";
		if (!corpName) e.corp_name = "Nama is required";
		if (!corpAddress) e.corp_address = "Alamat is required";
		if (!corpNpwpNo) e.corp_npwp_no = "NPWP No is required";

		let firstInvalidTab: string | null = null;
		directors.forEach((d) => {
			let hasError = false;
			REQUIRED_DIRECTOR_FIELDS.forEach(([key, label]) => {
				if (!d.data[key]) {
					e[`director_${d.uid}_${key}`] = `${label} is required (Pengurus ${directorLabel(d, directors)})`;
					hasError = true;
				}
			});
			if (hasError && !firstInvalidTab) firstInvalidTab = d.uid;
		});

		wnaBoard.forEach((w, idx) => {
			if (!w.idCardNo.trim()) return;
			if (!w.name.trim()) e[`wna_board_${idx}_name`] = `Nama is required (Pengurus WNA #${idx + 1})`;
			if (!w.idType) e[`wna_board_${idx}_id_type`] = `ID Type is required (Pengurus WNA #${idx + 1})`;
		});

		setErrors(e);
		if (firstInvalidTab) setActiveDirectorTab(firstInvalidTab);
		if (Object.keys(e).length) return;

		setLoading(true);
		try {
			const isDirectorDocType = (t: string) => t.startsWith("corp-ocr-ktp_");
			const isWnaBoardDocType = (t: string) => t.startsWith("wna-corp-board_");

			const carriedMap = new Map<number, { customer_document_id: number; document_type: string }>();

			docs
				.filter((d) => d.readonly && !isDirectorDocType(d.type) && !isWnaBoardDocType(d.type))
				.forEach((d) => carriedMap.set(d.id, { customer_document_id: d.id, document_type: d.type }));

			const uploadedTypes = new Set(docs.filter((d) => !d.readonly).map((d) => d.type));

			directors.forEach((entry) => {
				const ownTypes = directorDocTypes(entry);
				if (ownTypes.some((t) => uploadedTypes.has(t))) return;

				const target = persistedDirectorDocType(entry);
				const inherited = docs.filter((d) => d.readonly && ownTypes.includes(d.type));

				[...inherited, ...entry.lookupDocs].forEach((d) => {
					carriedMap.set(d.id, { customer_document_id: d.id, document_type: target });
				});
			});

			wnaBoard.forEach((member) => {
				const ownTypes = wnaDocTypes(member);
				if (ownTypes.some((t) => uploadedTypes.has(t))) return;

				const target = persistedWnaDocType(member);
				docs
					.filter((d) => d.readonly && ownTypes.includes(d.type))
					.forEach((d) => carriedMap.set(d.id, { customer_document_id: d.id, document_type: target }));
			});

			const carriedDocuments = Array.from(carriedMap.values())
				.filter((d) => !uploadedTypes.has(d.document_type));

			const payload = {
				prechecking_id: precheckingId, apless, cust_type: "PT", lessee_type: lesseeType,
				carried_documents: carriedDocuments,
				check_for: "C", corp_new_ro: "New",
				corp_name: corpName, corp_address: corpAddress, corp_npwp_no: corpNpwpNo,
				is_carro_type: isCarro ? 1 : 0, note_prechecking_pt: notes,
				directors: directors.map((d) => ({
					id_card_no: d.data.idCardNo, name: d.data.name, pob: d.data.placeOfBirth,
					dob: d.data.dateOfBirth, gender: d.data.gender, blood_type: d.data.bloodType,
					address: d.data.address, rt: d.data.rt, rw: d.data.rw,
					subdistrict: d.data.subdistrict, district: d.data.district, city: d.data.city,
					province: d.data.province, religion: d.data.religion, job: d.data.job,
					marital_status: d.data.maritalStatus, citizen: d.data.citizen || "WNI",
					id_type: "KTP", doc_token: d.uid,
					photo_hidden: d.data.photo, signature_hidden: d.data.signature,
					val_id_card_no: d.conf.idCardNo ?? "", val_name: d.conf.name ?? "",
					val_pob: d.conf.placeOfBirth ?? "", val_dob: d.conf.dateOfBirth ?? "",
					val_gender: d.conf.gender ?? "", val_blood_type: d.conf.bloodType ?? "",
					val_address: d.conf.address ?? "", val_rt: d.conf.rt ?? "", val_rw: d.conf.rw ?? "",
					val_subdistrict: d.conf.subdistrict ?? "", val_district: d.conf.district ?? "",
					val_city: d.conf.city ?? "", val_province: d.conf.province ?? "",
					val_religion: d.conf.religion ?? "", val_job: d.conf.job ?? "",
					val_marital_status: d.conf.maritalStatus ?? "", val_citizen: d.conf.citizen ?? "",
					ver_id_card_no: d.ver.idCardNo ?? "", ver_name: d.ver.name ?? "",
					ver_pob: d.ver.placeOfBirth ?? "", ver_dob: d.ver.dateOfBirth ?? "",
					ver_gender: d.ver.gender ?? "", ver_address: d.ver.address ?? "",
					ver_rt: d.ver.rt ?? "", ver_rw: d.ver.rw ?? "",
					ver_subdistrict: d.ver.subdistrict ?? "", ver_district: d.ver.district ?? "",
					ver_city: d.ver.city ?? "", ver_province: d.ver.province ?? "",
					ver_job: d.ver.job ?? "", ver_marital_status: d.ver.maritalStatus ?? "",
				})),
				wna_board: wnaBoard
					.filter((w) => w.idCardNo.trim())
					.map((w) => ({ name: w.name, id_card_no: w.idCardNo, id_type: w.idType, doc_token: w.uid })),
			};

			const res = await api.post('/CAM/Prechecking/submit-corporate', payload);
			if (res.data?.success) {
				const failedDocs: string[] = res.data?.documents_failed ?? [];
				alert(
					failedDocs.length
						? `Corporate prechecking submitted, tetapi dokumen berikut gagal disalin: ${failedDocs.join(", ")}. Silakan upload ulang.`
						: "Corporate prechecking submitted successfully!",
				);
				window.history.back();
			}
			else if (res.data?.errors) {
				setErrors(mapServerErrors(res.data.errors));
				alert("Please complete all required fields.");
			} else alert(res.data?.message ?? "Submission failed");
		} catch (err: any) {
			const serverErrors = err.response?.data?.errors;
			if (serverErrors) {
				setErrors(mapServerErrors(serverErrors));
				alert("Please complete all required fields.");
			} else {
				alert(err.response?.data?.message ?? "Submission failed");
			}
		}
		finally { setLoading(false); }
	};

	const docsOf = (type: string) => docs.filter((d) => d.type === type);
	const docsOfAny = (types: string[]) => docs.filter((d) => types.includes(d.type));

	if (loading && !precheckingId) {
		return (
			<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
				<Spinner dark size={40} />
			</div>
		);
	}

	return (
		<div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font)" }}>

			<DocPreviewModal state={preview} onClose={() => setPreview(PREVIEW_CLOSED)} />
			{modal.open && <HistoryModal modal={modal} setModal={setModal} />}

			<div className="page-wrap">

				<div className="hdr">
					<div>
						<div className="hdr-title">Add Prechecking Data</div>
						<div className="hdr-sub">Corporate Customer (PT) · KYC Verification</div>
					</div>
					<div className="hdr-badge">
						<span className="hdr-badge-label">Prechecking ID</span>
						<span className="hdr-badge-value">{precheckingId || "—"}</span>
					</div>
				</div>

				<div className="card">

					<div className="section-label"><span className="dot" />General Information<hr /></div>
					<div style={{ marginBottom: 24 }}>
						<div className="form-grid" style={{ marginBottom: 14 }}>
							<div className="form-field">
								<label className="form-label">Checking For <span className="req">*</span></label>
								<div className="select-wrap"><select disabled value="C" className="form-select is-disabled"><option value="C">Customer</option></select></div>
							</div>
							<div className="form-field">
								<label className="form-label">Type <span className="req">*</span></label>
								<div className="select-wrap"><select disabled value="PT" className="form-select is-disabled"><option value="PT">Corporate</option></select></div>
							</div>
						</div>
						<div className="form-grid" style={{ marginBottom: 14 }}>
							<div className="form-field">
								<label className="form-label">Company Type <span className="req">*</span></label>
								<div className="select-wrap">
									<select value={lesseeType} onChange={(e) => setLesseeType(e.target.value)} className={`form-select${errors.lessee_type ? " err" : ""}`}>
										<option value="">Select</option>
										{lesseeTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
									</select>
								</div>
								{errors.lessee_type && <p className="field-err">{errors.lessee_type}</p>}
							</div>
							<div className="form-field">
								<label className="form-label">New / Repeat Order</label>
								<div className="select-wrap"><select disabled value="New" className="form-select is-disabled"><option value="New">New</option></select></div>
							</div>
						</div>
						<div className="form-grid">
							<div className="form-field">
								<label className="form-label">Temp. Customer No.</label>
								<input readOnly value={apless} className="form-input is-readonly" />
							</div>
						</div>
					</div>

					<div className="section-label"><span className="dot" />Company Information<hr /></div>
					<div className="form-grid" style={{ marginBottom: 24 }}>
						<div className="form-field full">
							<label className="form-label">Nama <span className="req">*</span></label>
							<input value={corpName} onChange={(e) => setCorpName(e.target.value.toUpperCase())} className={`form-input${errors.corp_name ? " err" : ""}`} style={{ textTransform: "uppercase" }} maxLength={100} />
							{errors.corp_name && <p className="field-err">{errors.corp_name}</p>}
						</div>
						<div className="form-field full">
							<label className="form-label">Alamat <span className="req">*</span></label>
							<input value={corpAddress} onChange={(e) => setCorpAddress(e.target.value.toUpperCase())} className={`form-input${errors.corp_address ? " err" : ""}`} style={{ textTransform: "uppercase" }} maxLength={100} />
							{errors.corp_address && <p className="field-err">{errors.corp_address}</p>}
						</div>
						<div className="form-field">
							<label className="form-label">NPWP No. <span className="req">*</span></label>
							<input
								value={corpNpwpNo}
								onChange={(e) => setCorpNpwpNo(e.target.value.replace(/\D/g, "").slice(0, 16))}
								onBlur={handleNpwpBlur}
								className={`form-input${errors.corp_npwp_no ? " err" : ""}`}
								maxLength={16}
							/>
							{errors.corp_npwp_no && <p className="field-err">{errors.corp_npwp_no}</p>}
						</div>
						<div className="form-field full">
							<label className="form-label">NPWP <span className="req">*</span></label>
							<FileInput multiple label="Upload NPWP" onFileChange={(f) => _uploadDoc(f, "corp-npwp")} uploading={uploadingDocs.has("corp-npwp")} />
							<DocList docs={docsOf("corp-npwp")} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
						</div>
					</div>

					<div className="section-label"><span className="dot" />Data Pengurus (WNI)<hr /></div>
					<div className="director-tabs-wrap">
						<div className="director-tabbar" role="tablist">
							{directors.map((entry) => {
								const complete = directorIsComplete(entry);
								const hasErr = directorHasError(entry, errors);
								const dotClass = hasErr ? "error" : complete ? "complete" : "";
								return (
									<button
										key={entry.uid}
										type="button"
										role="tab"
										aria-selected={activeDirectorTab === entry.uid}
										className={`director-tab${activeDirectorTab === entry.uid ? " active" : ""}`}
										onClick={() => setActiveDirectorTab(entry.uid)}
									>
										<span className={`director-tab-dot${dotClass ? ` ${dotClass}` : ""}`} />
										Pengurus {directorLabel(entry, directors)}
										{entry.data.name && (
											<span style={{ color: "var(--muted)", fontWeight: 500 }}>
												· {entry.data.name.length > 16 ? entry.data.name.slice(0, 16) + "…" : entry.data.name}
											</span>
										)}
										{directors.length > 1 && (
											<span
												className="director-tab-close"
												role="button"
												aria-label={`Remove Pengurus ${directorLabel(entry, directors)}`}
												onClick={(ev) => {
													ev.stopPropagation();
													if (window.confirm(`Hapus Pengurus ${directorLabel(entry, directors)}? Dokumen yang sudah diupload untuk pengurus ini juga akan dihapus.`)) {
														removeDirector(entry.uid);
													}
												}}
											>×</span>
										)}
									</button>
								);
							})}
							<button type="button" className="director-tab-add" onClick={addDirector}>
								<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
								Add Pengurus
							</button>
						</div>
						<div className="director-tabpanel">
							{directors.map((entry) => (
								<div key={entry.uid} style={{ display: activeDirectorTab === entry.uid ? "block" : "none" }}>
									<DirectorCard
										entry={entry}
										label={directorLabel(entry, directors)}
										apless={apless}
										precheckingId={precheckingId}
										lesseeType={lesseeType}
										docs={docsOfAny(directorDocTypes(entry))}
										docTypeAliases={directorDocTypes(entry)}
										previewLoadingId={previewLoadingId}
										onPreview={handlePreview}
										onPreviewPhoto={(src) => setPreview({ open: true, name: "Pas Foto KTP.jpg", previewUrl: src })}
										onNikSearchChange={(value) => patchDirector(entry.uid, { nikSearch: value })}
										onLookup={() => handleDirectorLookup(entry.uid)}
										onChange={(data, conf, ver, dukcapil) => updateDirector(entry.uid, data, conf, ver, dukcapil)}
										errors={errors}
										onHistoryModal={(msg, al, type, pid) =>
											setModal({ open: true, type: type as any, message: msg, apless: al, precheckingId: pid })
										}
									/>
								</div>
							))}
						</div>
					</div>

					<div className="section-label"><span className="dot" />Data Pengurus (WNA)<hr /></div>
					<div style={{ marginBottom: 12, overflowX: "auto" }}>
						{wnaBoard.length > 0 && (
							<table className="wna-board-table">
								<thead>
									<tr>
										<th style={{ width: "22%" }}>Name</th>
										<th style={{ width: "14%" }}>ID Type</th>
										<th style={{ width: "22%" }}>ID Card No.</th>
										<th style={{ width: "32%" }}>Upload ID Card File</th>
										<th style={{ width: "10%" }}></th>
									</tr>
								</thead>
								<tbody>
									{wnaBoard.map((w, idx) => {
										const boardDocType = docTypeForWnaBoard(w.uid);
										return (
											<tr key={w.uid}>
												<td>
													<input
														className={`form-input${errors[`wna_board_${idx}_name`] ? " err" : ""}`}
														style={{ textTransform: "uppercase" }}
														value={w.name}
														onChange={(e) => updateWnaBoard(w.uid, "name", e.target.value.toUpperCase())}
													/>
													{errors[`wna_board_${idx}_name`] && <p className="field-err">{errors[`wna_board_${idx}_name`]}</p>}
												</td>
												<td>
													<div className="select-wrap">
														<select
															className="form-select"
															value={w.idType}
															onChange={(e) => updateWnaBoard(w.uid, "idType", e.target.value)}
														>
															{WNA_ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
														</select>
													</div>
												</td>
												<td>
													<input
														className="form-input"
														value={w.idCardNo}
														onChange={(e) => updateWnaBoard(w.uid, "idCardNo", e.target.value)}
													/>
												</td>
												<td>
													<FileInput
														label={`Upload ${w.idType}`}
														onFileChange={(f) => _uploadDoc(f, boardDocType)}
														uploading={uploadingDocs.has(boardDocType)}
													/>
													<DocList docs={docsOfAny(wnaDocTypes(w))} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
												</td>
												<td className="wna-board-row-actions">
													<button
														type="button"
														className="btn-remove"
														onClick={() => {
															if (window.confirm(`Hapus Pengurus WNA #${idx + 1}? Dokumen yang sudah diupload untuk pengurus ini juga akan dihapus.`)) {
																removeWnaBoard(w.uid);
															}
														}}
													>Remove</button>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}
					</div>
					<div style={{ marginBottom: 24 }}>
						<button type="button" className="btn-soft" onClick={addWnaBoard}>
							<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
							Add Pengurus (WNA)
						</button>
					</div>

					<div className="section-label"><span className="dot" />Supporting Documents<hr /></div>
					<div className="form-grid" style={{ marginBottom: 24 }}>
						{[
							{ label: "Akta Pendirian", type: "corp-akta" },
							{ label: "SK Kemenkumham Akta Pendirian", type: "corp-sk-akta" },
							{ label: "Akta Perubahan Terakhir", type: "corp-akta-terakhir" },
							{ label: "SK Kemenkumham atas Akta Perubahan Terakhir", type: "corp-sk-akta-terakhir" },
						].map((doc) => (
							<div className="form-field" key={doc.type}>
								<label className="form-label">{doc.label}</label>
								<FileInput multiple label={`Upload ${doc.label}`} onFileChange={(f) => _uploadDoc(f, doc.type)} uploading={uploadingDocs.has(doc.type)} />
								<DocList docs={docsOf(doc.type)} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
							</div>
						))}
					</div>

					<div className="section-label"><span className="dot" />Reference &amp; Notes<hr /></div>
					<div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 460, marginBottom: 8 }}>
						<div className="form-field">
							<label className="form-label">Reference</label>
							<div className="select-wrap">
								<select value={isCarro ? "1" : "0"} onChange={(e) => setIsCarro(e.target.value === "1")} className="form-select">
									<option value="1">Carro</option>
									<option value="0">Non Carro</option>
								</select>
							</div>
						</div>
						<div className="form-field">
							<label className="form-label">Note for Prechecking</label>
							<textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value.toUpperCase())} className="form-textarea" placeholder="Optional notes…" style={{ textTransform: "uppercase" }} />
						</div>
					</div>

				</div>

				<div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
					<button className="btn-ghost" onClick={handleCancel} disabled={loading}>Cancel</button>
					<button className="btn-primary" onClick={handleSubmit} disabled={loading}>
						{loading && <Spinner />}
						Submit Prechecking
					</button>
				</div>

			</div>
		</div>
	);
};

const DirectorCard: React.FC<{
	entry: DirectorEntry;
	label: string;
	apless: string;
	precheckingId: string;
	lesseeType: string;
	docs: UploadedDoc[];
	docTypeAliases: string[];
	previewLoadingId: number | null;
	onPreview: (doc: UploadedDoc) => void;
	onPreviewPhoto: (src: string) => void;
	onNikSearchChange: (value: string) => void;
	onLookup: () => void;
	onChange: (data: DirectorData, conf: ConfidenceMap, ver?: OcrVerMap, dukcapil?: OcrDukcapil) => void;
	errors: Record<string, string>;
	onHistoryModal: (msg: string, apless: string, type: string, pid: string) => void;
}> = ({
	entry, label, apless, precheckingId, lesseeType, docs, docTypeAliases, previewLoadingId,
	onPreview, onPreviewPhoto, onNikSearchChange, onLookup, onChange, errors,
	onHistoryModal,
}) => {

		const handleOcrChange = (data: any, conf: any, ver?: OcrVerMap, dukcapil?: OcrDukcapil) => {
			onChange(
				{ ...entry.data, ...data, maritalStatus: data.maritalStatus ?? entry.data.maritalStatus },
				{ ...entry.conf, ...conf },
				ver,
				dukcapil,
			);
		};

		const setMaritalStatus = (val: string) => {
			onChange({ ...entry.data, maritalStatus: val }, entry.conf, entry.ver, entry.dukcapil);
		};

		const docType = `corp-ocr-ktp_${entry.uid}`;
		const errKey = `director_${entry.uid}_maritalStatus`;

		return (
			<div>
				<div className="lookup-box">
					<div className="lookup-box-title">Cari Data Pengurus berdasarkan NIK</div>
					<div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
						<div className="form-field" style={{ flex: "1 1 280px" }}>
							<label className="form-label">NIK Pengurus · KTP</label>
							<input
								className="form-input"
								inputMode="numeric"
								maxLength={16}
								placeholder="16 digit NIK"
								value={entry.nikSearch}
								onChange={(e) => onNikSearchChange(e.target.value.replace(/\D/g, "").slice(0, 16))}
								onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onLookup(); } }}
							/>
						</div>
						<button
							type="button"
							className="btn-primary"
							onClick={onLookup}
							disabled={entry.lookupLoading || entry.nikSearch.length !== 16}
						>
							{entry.lookupLoading && <Spinner size={14} />}
							Cari Data
						</button>
					</div>

					{entry.lookupMsg && (
						<p className={`lookup-note ${entry.lookupMsg.tone}`}>{entry.lookupMsg.text}</p>
					)}

					{entry.lookupMeta && (
						<LookupResultPanel
							dukcapil={entry.dukcapil}
							meta={entry.lookupMeta}
							photo={entry.data.photo}
							documents={entry.lookupDocs}
							onPreview={onPreview}
							onPreviewPhoto={onPreviewPhoto}
							previewLoadingId={previewLoadingId}
						/>
					)}
				</div>

				<div style={{ marginBottom: 16 }}>
					<div className="form-field full">
						<label className="form-label">Upload ID Card Pengurus for OCR <span className="req">*</span></label>
					</div>
				</div>

				<OCRUploadSection
					key={`director-${entry.uid}-${entry.seedKey}`}
					apless={apless}
					precheckingId={precheckingId}
					ocrFor="corporate"
					docType={docType}
					title={`Pengurus ${label} · WNI`}
					nationality="WNI"
					lesseeType={lesseeType}
					initialData={entry.initialData}
					docTypeAliases={docTypeAliases}
					initialDocs={docs
						.filter((d) => d.readonly)
						.map((d) => ({ id: d.id, name: d.name, key: d.key }))}
					expectedNik={
						entry.initialData?.data.idCardNo
						|| (entry.nikSearch.length === 16 ? entry.nikSearch : "")
						|| undefined
					}
					onDataChange={handleOcrChange}
					onHistoryModal={onHistoryModal}
				/>

				<div className="form-grid" style={{ marginTop: 16 }}>
					<div className="form-field">
						<label className="form-label">ID Type</label>
						<input readOnly value="KTP" className="form-input is-readonly" />
					</div>
					<div className="form-field">
						<label className="form-label">Status Perkawinan <span className="req">*</span></label>
						<input
							value={entry.data.maritalStatus}
							onChange={(e) => setMaritalStatus(e.target.value)}
							className={`form-input${errors[errKey] ? " err" : ""}`}
							maxLength={50}
						/>
						{errors[errKey] && <p className="field-err">{errors[errKey]}</p>}
					</div>
				</div>
			</div>
		);
	};

export default PrecheckingCorporatePage;
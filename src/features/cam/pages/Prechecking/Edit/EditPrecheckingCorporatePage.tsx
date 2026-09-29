import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/shared/api/axiosInstance';
import { MAX_FILE_LIMIT } from '@/shared/constants/DefaultValue';
import {
	type UploadedDoc, type IdType, type MaritalOption, type PreviewState, type DukcapilVerification,
	ver_UNCHECKED, WNA_ID_TYPES, IMAGE_EXTS, PREVIEW_CLOSED,
	useInjectStyles, Spinner, FileInput, DocList, LookupResultPanel, DocPreviewModal, StatBlock,
} from '@/features/cam/components/PrecheckingShared';

const CANCEL_PATH = '/cam-request-onhand';
const DIR_PREFIX = 'corp-ocr-ktp_';
const WNA_PREFIX = 'wna-corp-board_';

type FieldKey =
	| 'id_card_no' | 'name' | 'pob' | 'dob' | 'gender' | 'blood_type' | 'address' | 'rt' | 'rw'
	| 'subdistrict' | 'district' | 'city' | 'province' | 'religion' | 'job' | 'marital_status';

type DirectorValues = Record<FieldKey, string>;
type VerMap = Partial<Record<FieldKey, 'True' | 'False'>>;
type ConfMap = Partial<Record<FieldKey | 'citizen', string>>;

interface LookupMeta { precheckingId: string; lastOCROn: string; }

interface DirectorEntry {
	uid: string;
	ocrId: number | null;
	lockedNik: string;
	values: DirectorValues;
	conf: ConfMap;
	ver: VerMap;
	dukcapil: DukcapilVerification;
	photo: string;
	signature: string;
	docTypes: string[];
	nikSearch: string;
	lookupMsg: { tone: 'ok' | 'warn'; text: string } | null;
	lookupMeta: LookupMeta | null;
	lookupDocs: UploadedDoc[];
}

interface WnaEntry {
	uid: string;
	ocrId: number | null;
	origIdNo: string;
	origIdType: IdType;
	name: string;
	idCardNo: string;
	idType: IdType;
	docTypes: string[];
}

interface LoadedDirector {
	id: number;
	values: DirectorValues;
	confidence: ConfMap;
	verified: VerMap;
	dukcapil: DukcapilVerification;
	photo: string;
	signature: string;
	doc_types: string[];
}

interface LoadResponse {
	success: boolean;
	message?: string;
	apless: string;
	prechecking_id: string;
	check_for: string;
	lessee_type: string;
	corp_name: string;
	corp_address: string;
	corp_npwp_no: string;
	note: string;
	is_carro: '0' | '1';
	repeat_order: '0' | '1';
	last_checking_date: string;
	outstanding: number;
	directors: LoadedDirector[];
	wna_board: { id: number; name: string; id_card_no: string; id_type: IdType; doc_types: string[] }[];
	unassigned_documents: UploadedDoc[];
	sik: { subject: string; credit_bureau: string; status: string; score: string; grade: string }[];
}

interface LookupRecord {
	nik?: string; nama?: string; tempatLahir?: string; tglLahir?: string; jenisKelamin?: string;
	golonganDarah?: string; alamat?: string; rtRw?: string; kelurahan?: string; kecamatan?: string;
	kota?: string; provinsi?: string; agama?: string; pekerjaan?: string; status_perkawinan?: string;
	foto?: string; tandaTangan?: string;
	confidence?: Record<string, string>;
	verified?: Record<string, string>;
	dukcapil?: DukcapilVerification;
}

const FIELD_ROWS: { key: FieldKey; label: string; dukcapil: boolean; required: boolean }[] = [
	{ key: 'id_card_no', label: 'NIK', dukcapil: true, required: true },
	{ key: 'name', label: 'Nama', dukcapil: true, required: true },
	{ key: 'pob', label: 'Tempat Lahir', dukcapil: true, required: true },
	{ key: 'dob', label: 'Tanggal Lahir (dd-mm-yyyy)', dukcapil: true, required: true },
	{ key: 'gender', label: 'Jenis Kelamin', dukcapil: true, required: true },
	{ key: 'blood_type', label: 'Golongan Darah', dukcapil: false, required: false },
	{ key: 'address', label: 'Alamat', dukcapil: true, required: true },
	{ key: 'rt', label: 'RT', dukcapil: true, required: true },
	{ key: 'rw', label: 'RW', dukcapil: true, required: true },
	{ key: 'subdistrict', label: 'Kelurahan/Desa', dukcapil: true, required: true },
	{ key: 'district', label: 'Kecamatan', dukcapil: true, required: true },
	{ key: 'city', label: 'Kota/Kabupaten', dukcapil: true, required: true },
	{ key: 'province', label: 'Provinsi', dukcapil: true, required: true },
	{ key: 'religion', label: 'Agama', dukcapil: false, required: false },
	{ key: 'job', label: 'Pekerjaan', dukcapil: true, required: true },
	{ key: 'marital_status', label: 'Status Perkawinan', dukcapil: true, required: true },
];
const DUKCAPIL_KEYS = FIELD_ROWS.filter((f) => f.dukcapil).map((f) => f.key);
const CONF_KEYS: (FieldKey | 'citizen')[] = [...FIELD_ROWS.map((f) => f.key), 'citizen'];

const CAMEL_TO_KEY: Record<string, FieldKey | 'citizen'> = {
	idCardNo: 'id_card_no', name: 'name', placeOfBirth: 'pob', dateOfBirth: 'dob', gender: 'gender',
	bloodType: 'blood_type', address: 'address', rt: 'rt', rw: 'rw', subdistrict: 'subdistrict',
	district: 'district', city: 'city', province: 'province', religion: 'religion', job: 'job',
	maritalStatus: 'marital_status', citizen: 'citizen',
};

const MARITAL_TEXT_TO_CODE: Record<string, string> = {
	'BELUM KAWIN': 'S', 'KAWIN': 'M', 'KAWIN TERCATAT': 'M', 'KAWIN BELUM TERCATAT': 'O',
	'PERJANJIAN PRANIKAH': 'P', 'CERAI HIDUP': 'D', 'CERAI MATI': 'D',
};
const MARITAL_FALLBACK: MaritalOption[] = [
	{ value: 'S', label: 'Belum Kawin' }, { value: 'M', label: 'Kawin Tercatat' },
	{ value: 'O', label: 'Kawin Belum Tercatat' }, { value: 'P', label: 'Perjanjian Pranikah' },
	{ value: 'D', label: 'Cerai' },
];

const NIK_RE = /^\d{16}$/;
const RTRW_RE = /^\d{3}$/;
const DOB_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

const newUid = () => `e${Math.random().toString(36).slice(2, 10)}`;
const token = (v: string) => (v || '').replace(/[^A-Za-z0-9]/g, '');

const emptyValues = (): DirectorValues => ({
	id_card_no: '', name: '', pob: '', dob: '', gender: '', blood_type: '', address: '', rt: '', rw: '',
	subdistrict: '', district: '', city: '', province: '', religion: '', job: '', marital_status: '',
});

const toMaritalCode = (raw?: string): string => {
	const v = (raw || '').trim().toUpperCase();
	if (['S', 'M', 'O', 'D', 'P'].includes(v)) return v;
	return MARITAL_TEXT_TO_CODE[v] ?? '';
};

const normalizeVer = (ver?: Record<string, unknown>): VerMap => {
	const out: VerMap = {};
	DUKCAPIL_KEYS.forEach((k) => {
		const v = ver?.[k];
		out[k] = v === 'True' || v === true || v === 1 ? 'True' : 'False';
	});
	return out;
};

const formatDobInput = (raw: string, prev: string): string => {
	const deleting = raw.length < prev.length;
	const digits = raw.replace(/\D/g, '').slice(0, 8);
	let dd = digits.slice(0, 2);
	let mm = digits.slice(2, 4);
	let yyyy = digits.slice(4, 8);

	if (dd.length === 1 && dd > '3') dd = `0${dd}`;
	if (dd.length === 2) {
		const n = Number(dd);
		dd = n < 1 ? '01' : n > 31 ? '31' : dd;
	}
	if (mm.length === 1 && mm > '1') mm = `0${mm}`;
	if (mm.length === 2) {
		const n = Number(mm);
		mm = n < 1 ? '01' : n > 12 ? '12' : mm;
	}
	if (yyyy.length >= 1 && !['1', '2'].includes(yyyy[0])) yyyy = '';
	if (yyyy.length === 4) {
		const n = Number(yyyy);
		const max = new Date().getFullYear();
		yyyy = String(n < 1900 ? 1900 : n > max ? max : n);
	}

	let out = dd;
	if (mm || (dd.length === 2 && !deleting)) out += '-';
	out += mm;
	if (yyyy || (mm.length === 2 && !deleting)) out += '-';
	out += yyyy;
	return out;
};

const dobError = (value: string): string | null => {
	const m = DOB_RE.exec(value);
	if (!m) return 'must be in dd-mm-yyyy format';
	const [, dd, mm, yyyy] = m;
	const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
	if (d.getFullYear() !== Number(yyyy) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) {
		return 'is not a valid date';
	}
	if (d.getTime() > Date.now()) return 'cannot be in the future';
	return null;
};

const newDirector = (uid = newUid()): DirectorEntry => ({
	uid, ocrId: null, lockedNik: '', values: emptyValues(), conf: {}, ver: {},
	dukcapil: ver_UNCHECKED, photo: '', signature: '', docTypes: [],
	nikSearch: '', lookupMsg: null, lookupMeta: null, lookupDocs: [],
});

const directorFromLoaded = (d: LoadedDirector): DirectorEntry => ({
	...newDirector(),
	ocrId: d.id,
	lockedNik: d.values.id_card_no,
	values: { ...emptyValues(), ...d.values },
	conf: d.confidence || {},
	ver: normalizeVer(d.verified),
	dukcapil: d.dukcapil ?? ver_UNCHECKED,
	photo: d.photo || '',
	signature: d.signature || '',
	docTypes: d.doc_types || [],
});

const comparableDirector = (d: DirectorEntry) => ({
	id: d.ocrId, values: d.values, ver: normalizeVer(d.ver),
	carry: d.lookupDocs.map((x) => x.id),
});
const comparableWna = (w: WnaEntry) => ({ id: w.ocrId, name: w.name.trim(), idNo: w.idCardNo.trim(), type: w.idType });

const asPhotoSrc = (raw: string) => (raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`);

const LOCAL_STYLE_ID = 'edit-prechecking-corporate-styles';
const LOCAL_CSS = `
  .director-tabs-wrap { border: 1.5px solid var(--border); border-radius: 14px; background: #FAFCFF; overflow: hidden; margin-bottom: 18px; }
  .director-tabbar { display: flex; align-items: stretch; overflow-x: auto; background: #F4F7FF; border-bottom: 1.5px solid var(--border); }
  .director-tab { display: flex; align-items: center; gap: 8px; padding: 12px 18px; border: none; background: none; cursor: pointer;
    font-family: var(--font); font-size: .8rem; font-weight: 700; color: var(--muted); white-space: nowrap; position: relative;
    border-right: 1px solid var(--border); transition: color .15s, background .15s; }
  .director-tab:hover { background: #EAF0FF; color: var(--navy); }
  .director-tab.active { color: var(--navy); background: #fff; }
  .director-tab.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1.5px; height: 2.5px; background: var(--blue); }
  .director-tab-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--border); }
  .director-tab-dot.complete { background: var(--mint); }
  .director-tab-dot.error { background: var(--rose); }
  .director-tab-close { color: var(--muted); font-size: .95rem; line-height: 1; padding-left: 2px; }
  .director-tab-close:hover { color: var(--rose); }
  .director-tab-add { display: flex; align-items: center; gap: 6px; padding: 12px 16px; border: none; background: none; cursor: pointer;
    font-family: var(--font); font-size: .8rem; font-weight: 700; color: var(--blue); white-space: nowrap; }
  .director-tab-add:hover { background: #EAF0FF; }
  .director-tabpanel { padding: 22px; }
  .ocr-table-wrap { border: 1.5px solid var(--border); border-radius: 12px; overflow: hidden; background: #fff; }
  .ocr-table-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px;
    background: linear-gradient(135deg, #0F1D3C, #2D5BE3); color: #fff; }
  .ocr-table-title { font-size: .85rem; font-weight: 700; }
  .ocr-table { width: 100%; border-collapse: collapse; font-size: .84rem; }
  .ocr-table th { text-align: left; padding: 9px 14px; font-size: .7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: .06em; color: var(--muted); background: #F8FAFF; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .ocr-table th.c, .ocr-table td.c { text-align: center; width: 150px; }
  .ocr-table td { padding: 7px 14px; border-bottom: 1px solid #EEF2FA; vertical-align: middle; }
  .ocr-table td.lbl { width: 230px; font-weight: 600; color: var(--ink); white-space: nowrap; }
  .ocr-table .form-input, .ocr-table .form-select { padding: 7px 10px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: .72rem; font-weight: 700; border: 1px solid; }
  .badge.ok { color: #047857; background: #ECFDF5; border-color: #A7F3D0; }
  .badge.mid { color: #B45309; background: #FFFBEB; border-color: #FDE68A; }
  .badge.no { color: #B91C1C; background: #FEF2F2; border-color: #FECACA; }
  .badge.idle { color: #64748B; background: #F1F5F9; border-color: #E2E8F0; }
  .btn-light { background: #fff; color: var(--navy); border: none; border-radius: 10px; padding: 8px 14px; font-size: .78rem;
    font-weight: 700; font-family: var(--font); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
  .btn-light:disabled { opacity: .6; cursor: not-allowed; }
  .btn-soft { background: var(--sky); color: var(--navy); border: 1.5px dashed #C7D7F8; border-radius: 12px; padding: 10px 18px;
    font-size: .82rem; font-weight: 700; font-family: var(--font); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
  .btn-remove { background: none; border: 1.5px solid var(--border); color: var(--rose); border-radius: 10px; padding: 7px 14px;
    font-size: .78rem; font-weight: 700; font-family: var(--font); cursor: pointer; }
  .btn-remove:hover { background: #FEF2F2; border-color: var(--rose); }
  .ktp-photo { width: 92px; height: 118px; object-fit: cover; border-radius: 8px; border: 1.5px solid var(--border); }
  .ktp-sign { height: 44px; border-radius: 6px; border: 1.5px solid var(--border); background: #fff; }
  .ktp-empty { background: #F4F7FF; border: 2px dashed var(--border); border-radius: 8px; display: flex;
    align-items: center; justify-content: center; color: var(--muted); font-size: .72rem; }
  .ktp-empty.photo { width: 92px; height: 118px; }
  .ktp-empty.sign { width: 120px; height: 44px; }
`;

const ConfBadge: React.FC<{ value?: string }> = ({ value }) => {
	const n = parseFloat((value || '').replace(/[^\d.]/g, ''));
	if (!value || Number.isNaN(n) || n === 0) return <span className="badge idle">—</span>;
	const tone = n >= 90 ? 'ok' : n >= 70 ? 'mid' : 'no';
	return <span className={`badge ${tone}`}>{n}%</span>;
};

const VerBadge: React.FC<{ value?: string; checked: boolean }> = ({ value, checked }) => {
	if (!checked) return <span className="badge idle">Belum</span>;
	return value === 'True' ? <span className="badge ok">True</span> : <span className="badge no">False</span>;
};

const EditPrecheckingCorporatePage: React.FC = () => {
	useInjectStyles();
	useEffect(() => {
		let tag = document.getElementById(LOCAL_STYLE_ID) as HTMLStyleElement | null;
		if (!tag) {
			tag = document.createElement('style');
			tag.id = LOCAL_STYLE_ID;
			document.head.appendChild(tag);
		}
		tag.textContent = LOCAL_CSS;
	}, []);

	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const apless = searchParams.get('apless') || '';
	const precheckingId = searchParams.get('prechecking_id') || '';

	const [data, setData] = useState<LoadResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [baseline, setBaseline] = useState('');

	const [lesseeLabel, setLesseeLabel] = useState('');
	const [maritalOptions, setMaritalOptions] = useState<MaritalOption[]>(MARITAL_FALLBACK);
	const [corpName, setCorpName] = useState('');
	const [corpAddress, setCorpAddress] = useState('');
	const [notes, setNotes] = useState('');
	const [isCarro, setIsCarro] = useState(true);

	const [directors, setDirectors] = useState<DirectorEntry[]>([]);
	const [originals, setOriginals] = useState<Record<string, DirectorEntry>>({});
	const [activeUid, setActiveUid] = useState('');
	const [wnaBoard, setWnaBoard] = useState<WnaEntry[]>([]);

	const [docs, setDocs] = useState<UploadedDoc[]>([]);
	const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());
	const [deletingDocs, setDeletingDocs] = useState<Set<number>>(new Set());
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);
	const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);

	const [scanningUid, setScanningUid] = useState<string | null>(null);
	const [verifyingUid, setVerifyingUid] = useState<string | null>(null);
	const [lookupUid, setLookupUid] = useState<string | null>(null);

	const closePreview = useCallback(() => setPreview(PREVIEW_CLOSED), []);

	const fetchDocs = useCallback(async (): Promise<UploadedDoc[]> => {
		const res = await api.get('/Prechecking/EditPT/documents-corporate', {
			params: { apless, prechecking_id: precheckingId },
		});
		return (res.data ?? []) as UploadedDoc[];
	}, [apless, precheckingId]);

	const refreshDocs = useCallback(async () => {
		try {
			setDocs(await fetchDocs());
		} catch (e) {
			console.error('Failed to refresh docs', e);
		}
	}, [fetchDocs]);

	const docsOf = (type: string) => docs.filter((d) => d.type === type);
	const docsOfAny = (types: string[]) => docs.filter((d) => types.includes(d.type));

	const stagingDirDocs = (d: DirectorEntry) => docsOf(`${DIR_PREFIX}${d.uid}`);
	const persistedDirTypes = (d: DirectorEntry) =>
		Array.from(new Set([...d.docTypes, ...(d.lockedNik ? [`${DIR_PREFIX}${token(d.lockedNik)}`] : [])]));
	const carryDocsOf = (d: DirectorEntry) => (stagingDirDocs(d).length ? [] : d.lookupDocs);

	const ktpDocsFor = (d: DirectorEntry): UploadedDoc[] => {
		const staged = stagingDirDocs(d);
		if (staged.length) return staged;
		if (d.lookupDocs.length) return d.lookupDocs;
		return docsOfAny(persistedDirTypes(d)).map((x) => ({ ...x, readonly: true }));
	};

	const stagingWnaDocs = (w: WnaEntry) => docsOf(`${WNA_PREFIX}${w.uid}`);
	const wnaDocsFor = (w: WnaEntry): UploadedDoc[] => {
		const staged = stagingWnaDocs(w);
		if (staged.length) return staged;
		const types = Array.from(new Set([...w.docTypes, ...(w.origIdNo ? [`${WNA_PREFIX}${token(w.origIdNo)}`] : [])]));
		return docsOfAny(types).map((x) => ({ ...x, readonly: true }));
	};

	const uploadFile = async (file: File, docType: string): Promise<boolean> => {
		const ALLOWED = ['.png', '.jpg', '.jpeg', '.pdf', '.tiff', '.tif'];
		const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
		if (!ALLOWED.includes(ext)) {
			alert('Format file tidak didukung.\nFormat yang diizinkan: PNG, JPG, PDF, TIFF');
			return false;
		}
		if (ext !== '.pdf' && file.size > MAX_FILE_LIMIT * 1024 * 1024) {
			alert(`Ukuran file melebihi batas maksimal (${MAX_FILE_LIMIT} MB).`);
			return false;
		}
		setUploadingDocs((prev) => new Set(prev).add(docType));
		try {
			const fd = new FormData();
			fd.append('file', file);
			fd.append('apless', apless);
			fd.append('prechecking_id', precheckingId);
			fd.append('document_type', docType);
			fd.append('cust_type', 'PT');
			fd.append('lessee_type', data?.lessee_type || '');
			const res = await api.post('/Prechecking/EditPT/upload-document-corporate', fd, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			if (!res.data?.success) {
				alert(res.data?.message ?? 'Upload gagal. Silakan coba lagi.');
				return false;
			}
			await refreshDocs();
			return true;
		} catch (e: any) {
			alert(e.response?.data?.message ?? 'Upload gagal. Periksa koneksi dan coba lagi.');
			return false;
		} finally {
			setUploadingDocs((prev) => {
				const next = new Set(prev);
				next.delete(docType);
				return next;
			});
		}
	};

	const deleteDocNow = async (docId: number, confirmFirst = true): Promise<boolean> => {
		if (confirmFirst && !window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return false;
		setDeletingDocs((prev) => new Set(prev).add(docId));
		try {
			const res = await api.post('/Prechecking/EditPT/delete-document-corporate', {
				customer_document_id: docId, prechecking_id: precheckingId, nik: '',
			});
			if (!res.data?.success) {
				alert(res.data?.message ?? 'Hapus dokumen gagal. Silakan coba lagi.');
				return false;
			}
			return true;
		} catch (e: any) {
			alert(e.response?.data?.message ?? 'Hapus dokumen gagal. Periksa koneksi dan coba lagi.');
			return false;
		} finally {
			setDeletingDocs((prev) => {
				const next = new Set(prev);
				next.delete(docId);
				return next;
			});
		}
	};

	const handleDeleteDoc = async (docId: number) => {
		const doc = docs.find((d) => d.id === docId);
		if (!doc || doc.readonly) return;
		if (await deleteDocNow(docId)) await refreshDocs();
	};

	const discardStaging = async (types: string[]) => {
		const staged = docs.filter((d) => types.includes(d.type));
		for (const d of staged) await deleteDocNow(d.id, false);
		if (staged.length) await refreshDocs();
	};

	const handlePreview = async (doc: UploadedDoc) => {
		const direct = doc.previewUrl || doc.view_url;
		if (direct) {
			setPreview({ open: true, name: doc.name, previewUrl: direct });
			return;
		}
		setPreviewLoadingId(doc.id);
		try {
			const res = await api.get('/Prechecking/EditPT/view-document-corporate', { params: { customer_document_id: doc.id } });
			if (res.data?.success && res.data?.view_url) {
				setPreview({ open: true, name: doc.name, previewUrl: res.data.view_url });
			} else {
				alert(res.data?.message ?? 'Dokumen tidak dapat ditampilkan.');
			}
		} catch (e: any) {
			alert(e.response?.data?.message ?? 'Gagal memuat pratinjau dokumen.');
		} finally {
			setPreviewLoadingId(null);
		}
	};

	const buildComparable = (
		name: string, address: string, note: string, carro: boolean,
		dirs: DirectorEntry[], wnas: WnaEntry[], stagedTypes: string[],
	) => JSON.stringify({
		name: name.trim(), address: address.trim(), note: note.trim(), carro,
		dirs: dirs.map(comparableDirector), wnas: wnas.map(comparableWna), staged: [...stagedTypes].sort(),
	});

	useEffect(() => {
		const init = async () => {
			if (!apless || !precheckingId) {
				setLoadError('Missing apless or prechecking_id in the URL.');
				setLoading(false);
				return;
			}
			setLoading(true);
			setLoadError(null);
			try {
				const [editR, lesseeR, maritalR, docList] = await Promise.all([
					api.get('/Prechecking/EditPT/edit-corporate', { params: { apless, prechecking_id: precheckingId } }),
					api.get('/Prechecking/EditPT/lessee-types').catch(() => ({ data: [] })),
					api.get('/Prechecking/EditPT/marital-statuses').catch(() => ({ data: [] })),
					fetchDocs().catch(() => [] as UploadedDoc[]),
				]);
				const res = editR.data as LoadResponse;
				if (!res.success) {
					setLoadError(res.message || 'Failed to load prechecking data.');
					return;
				}

				const dirs = res.directors.length ? res.directors.map(directorFromLoaded) : [newDirector()];
				const wnas: WnaEntry[] = res.wna_board.map((w) => ({
					uid: newUid(), ocrId: w.id, origIdNo: w.id_card_no, origIdType: w.id_type,
					name: w.name, idCardNo: w.id_card_no, idType: w.id_type, docTypes: w.doc_types || [],
				}));
				const carro = res.is_carro === '1';

				const lessee = ((lesseeR.data ?? []) as MaritalOption[]).find((o) => o.value === res.lessee_type);
				setLesseeLabel(lessee?.label || res.lessee_type || '—');
				if (Array.isArray(maritalR.data) && maritalR.data.length) setMaritalOptions(maritalR.data);

				setDocs(docList);
				setCorpName(res.corp_name);
				setCorpAddress(res.corp_address);
				setNotes(res.note);
				setIsCarro(carro);
				setDirectors(dirs);
				setOriginals(Object.fromEntries(dirs.map((d) => [d.uid, d])));
				setActiveUid(dirs[0].uid);
				setWnaBoard(wnas);
				setBaseline(buildComparable(res.corp_name, res.corp_address, res.note, carro, dirs, wnas, []));
				setData(res);
			} catch (e: any) {
				setLoadError(e.response?.data?.message ?? 'Failed to load prechecking data. Please try again.');
			} finally {
				setLoading(false);
			}
		};
		init();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [apless, precheckingId, fetchDocs]);

	const patchDirector = (uid: string, patch: Partial<DirectorEntry> | ((d: DirectorEntry) => Partial<DirectorEntry>)) => {
		setDirectors((prev) => prev.map((d) => (d.uid === uid ? { ...d, ...(typeof patch === 'function' ? patch(d) : patch) } : d)));
	};

	const setField = (uid: string, key: FieldKey, value: string) => {
		patchDirector(uid, (d) => ({
			values: { ...d.values, [key]: value },
			...(DUKCAPIL_KEYS.includes(key) ? { dukcapil: ver_UNCHECKED, ver: normalizeVer({}) } : {}),
		}));
	};

	const addDirector = () => {
		const entry = newDirector();
		setDirectors((prev) => [...prev, entry]);
		setOriginals((prev) => ({ ...prev, [entry.uid]: entry }));
		setActiveUid(entry.uid);
	};

	const removeDirector = async (uid: string, label: string) => {
		if (directors.length <= 1) return;
		const entry = directors.find((d) => d.uid === uid);
		if (!entry) return;
		const msg = entry.ocrId
			? `Hapus Pengurus ${label}? Data dan file KTP-nya akan dihapus saat Save.`
			: `Hapus Pengurus ${label}?`;
		if (!window.confirm(msg)) return;
		await discardStaging([`${DIR_PREFIX}${uid}`]);
		setDirectors((prev) => {
			const next = prev.filter((d) => d.uid !== uid);
			if (activeUid === uid) setActiveUid(next[0].uid);
			return next;
		});
	};

	const resetDirector = async (uid: string, label: string) => {
		const original = originals[uid];
		if (!original) return;
		if (!window.confirm(`Batalkan perubahan Pengurus ${label} dan kembalikan ke data awal (data, tabel, dan file)?`)) return;
		await discardStaging([`${DIR_PREFIX}${uid}`]);
		patchDirector(uid, { ...original, uid });
		setErrors((prev) => {
			const idx = directors.findIndex((d) => d.uid === uid);
			return Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`director_${idx}_`)));
		});
	};

	const handleLookup = async (uid: string) => {
		const entry = directors.find((d) => d.uid === uid);
		if (!entry || entry.lockedNik) return;
		const nik = entry.nikSearch.replace(/\D/g, '');
		if (nik.length !== 16) {
			patchDirector(uid, { lookupMsg: { tone: 'warn', text: 'NIK harus 16 digit.' } });
			return;
		}
		if (directors.some((d) => d.uid !== uid && d.values.id_card_no === nik)) {
			patchDirector(uid, { lookupMsg: { tone: 'warn', text: 'NIK ini sudah dipakai pengurus lain.' } });
			return;
		}
		setLookupUid(uid);
		patchDirector(uid, { lookupMsg: null });
		try {
			const res = await api.post('/CAM/lookup-ocr-by-nik', { nik, exclude_prechecking_id: precheckingId });
			if (!res.data?.found) {
				patchDirector(uid, {
					lookupMeta: null, lookupDocs: [],
					lookupMsg: { tone: 'warn', text: res.data?.message ?? 'Data tidak ditemukan. Silakan upload KTP untuk OCR.' },
				});
				return;
			}
			const rec = res.data.ocr as LookupRecord;
			const [rt = '', rw = ''] = (rec.rtRw || '').split('/').map((s) => s.trim());
			const conf: ConfMap = {};
			Object.entries(rec.confidence || {}).forEach(([k, v]) => {
				const key = CAMEL_TO_KEY[k];
				if (key) conf[key] = String(v ?? '');
			});
			const ver: Record<string, string> = {};
			Object.entries(rec.verified || {}).forEach(([k, v]) => {
				const key = CAMEL_TO_KEY[k];
				if (key) ver[key] = String(v ?? '');
			});
			patchDirector(uid, {
				values: {
					id_card_no: rec.nik || nik, name: rec.nama || '', pob: rec.tempatLahir || '', dob: rec.tglLahir || '',
					gender: rec.jenisKelamin || '', blood_type: rec.golonganDarah || '', address: rec.alamat || '',
					rt, rw, subdistrict: rec.kelurahan || '', district: rec.kecamatan || '', city: rec.kota || '',
					province: rec.provinsi || '', religion: rec.agama || '', job: rec.pekerjaan || '',
					marital_status: toMaritalCode(rec.status_perkawinan),
				},
				conf,
				ver: normalizeVer(ver),
				dukcapil: rec.dukcapil ?? ver_UNCHECKED,
				photo: rec.foto || '',
				signature: rec.tandaTangan || '',
				lookupMeta: { precheckingId: res.data.sourcePrecheckingId || '', lastOCROn: res.data.lastOCROn || '' },
				lookupDocs: ((res.data.documents ?? []) as UploadedDoc[]).map((d) => ({ ...d, readonly: true })),
				lookupMsg: { tone: 'ok', text: 'Data pengurus ditemukan. Periksa kembali sebelum simpan.' },
			});
			await discardStaging([`${DIR_PREFIX}${uid}`]);
		} catch (e: any) {
			patchDirector(uid, { lookupMsg: { tone: 'warn', text: e.response?.data?.message ?? 'Gagal mencari data pengurus.' } });
		} finally {
			setLookupUid(null);
		}
	};

	const handleKtpUpload = async (uid: string, file: File) => {
		const entry = directors.find((d) => d.uid === uid);
		if (!entry) return;
		const ext = (file.name.split('.').pop() || '').toLowerCase();
		if (!IMAGE_EXTS.has(ext)) {
			alert('File KTP harus berupa gambar (PNG/JPG) agar bisa dibaca OCR.');
			return;
		}
		setScanningUid(uid);
		try {
			const qf = new FormData();
			qf.append('image', file);
			qf.append('param', 'check_qualities');
			qf.append('prechecking_id', precheckingId);
			const quality = (await api.post('/Prechecking/OCR/scanOCRCustomer', qf, {
				headers: { 'Content-Type': 'multipart/form-data' },
			})).data;
			if (quality?.status !== 'SUCCESS' || quality?.reason !== 'File successfully read.') {
				alert(quality?.reason || 'Document checking failed, please change the document!');
				return;
			}
			if (quality.qualities?.blur?.value !== false || quality.qualities?.document?.value !== 'ktp') {
				alert('Document checking failed, please change the document!');
				return;
			}

			const of = new FormData();
			of.append('image', file);
			of.append('param', 'ocr_customer');
			of.append('apless', apless);
			of.append('customer_type', 'PT');
			of.append('prechecking_id', precheckingId);
			of.append('check_for', data?.check_for === 'G' ? 'G' : 'C');
			of.append('repeat_order', '0');
			of.append('ocr_for', data?.check_for === 'G' ? 'G' : 'P');
			const result = (await api.post('/Prechecking/OCR/scanOCRCustomer', of, {
				headers: { 'Content-Type': 'multipart/form-data' },
			})).data;
			if (result?.status !== 'SUCCESS' || result?.reason !== 'File successfully read.') {
				alert(result?.reason || 'OCR gagal. Silakan coba lagi.');
				return;
			}

			const read = result.read || {};
			const ocrNik = String(read.nik?.value || '').replace(/\D/g, '');
			const typedNik = NIK_RE.test(entry.values.id_card_no) ? entry.values.id_card_no : '';
			const expected = entry.lockedNik || typedNik;
			if (expected && ocrNik !== expected) {
				alert('NIK tidak sama');
				return;
			}
			if (directors.some((d) => d.uid !== uid && d.values.id_card_no === ocrNik)) {
				alert('NIK ini sudah dipakai pengurus lain.');
				return;
			}

			if (!(await uploadFile(file, `${DIR_PREFIX}${uid}`))) return;

			const [rt = '', rw = ''] = String(read.rtRw?.value || '').split('/').map((s: string) => s.trim());
			const c = (f: { confidence?: unknown } | undefined) => (f?.confidence != null ? String(f.confidence) : '');
			patchDirector(uid, (d) => ({
				values: {
					...d.values,
					id_card_no: ocrNik || d.values.id_card_no,
					name: read.nama?.value ?? d.values.name,
					pob: read.tempatLahir?.value ?? d.values.pob,
					dob: read.tanggalLahir?.value ?? d.values.dob,
					gender: read.jenisKelamin?.value ?? d.values.gender,
					blood_type: read.golonganDarah?.value ?? d.values.blood_type,
					address: read.alamat?.value ?? d.values.address,
					rt: rt || d.values.rt,
					rw: rw || d.values.rw,
					subdistrict: read.kelurahanDesa?.value ?? d.values.subdistrict,
					district: read.kecamatan?.value ?? d.values.district,
					city: read.kotaKabupaten?.value ?? d.values.city,
					province: read.provinsi?.value ?? d.values.province,
					religion: read.agama?.value ?? d.values.religion,
					job: read.pekerjaan?.value ?? d.values.job,
					marital_status: toMaritalCode(read.statusPerkawinan?.value) || d.values.marital_status,
				},
				conf: {
					id_card_no: c(read.nik), name: c(read.nama), pob: c(read.tempatLahir), dob: c(read.tanggalLahir),
					gender: c(read.jenisKelamin), blood_type: c(read.golonganDarah), address: c(read.alamat),
					rt: c(read.rtRw), rw: c(read.rtRw), subdistrict: c(read.kelurahanDesa), district: c(read.kecamatan),
					city: c(read.kotaKabupaten), province: c(read.provinsi), religion: c(read.agama),
					job: c(read.pekerjaan), marital_status: c(read.statusPerkawinan), citizen: c(read.kewarganegaraan),
				},
				ver: normalizeVer({}),
				dukcapil: ver_UNCHECKED,
				photo: result.images?.photo || d.photo,
				signature: result.images?.sign || d.signature,
				lookupDocs: [],
				lookupMeta: null,
			}));
		} catch (e: any) {
			alert(e.response?.data?.message ?? 'Error, data cannot be sent!');
		} finally {
			setScanningUid(null);
		}
	};

	const handleVerify = async (uid: string) => {
		const d = directors.find((x) => x.uid === uid);
		if (!d) return;
		const missing = FIELD_ROWS.filter((f) => f.dukcapil && !d.values[f.key].trim()).map((f) => f.label);
		if (missing.length) {
			alert(`Lengkapi data sebelum verifikasi Dukcapil:\n${missing.join(', ')}`);
			return;
		}
		setVerifyingUid(uid);
		try {
			const form = new FormData();
			form.append('param', 'check_data_duckapil');
			form.append('prechecking_id', precheckingId);
			form.append('nik', d.values.id_card_no);
			form.append('name', d.values.name);
			form.append('place_of_birth', d.values.pob);
			form.append('date_of_birth', d.values.dob);
			form.append('gender', d.values.gender);
			form.append('address', d.values.address);
			form.append('rt', d.values.rt);
			form.append('rw', d.values.rw);
			form.append('subdistrict', d.values.subdistrict);
			form.append('district', d.values.district);
			form.append('city', d.values.city);
			form.append('province', d.values.province);
			form.append('job_type', d.values.job);
			form.append('marital_status', maritalOptions.find((o) => o.value === d.values.marital_status)?.label || d.values.marital_status);
			const res = await api.post('/Prechecking/OCR/scanOCRCustomer', form, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			const r = res.data?.result;
			if (!r || typeof r !== 'object') {
				alert(res.data?.reason || res.data?.message || 'Verifikasi Dukcapil gagal.');
				return;
			}
			const raw: Record<string, unknown> = {
				id_card_no: r.nik, name: r.name, pob: r.place_of_birth, dob: r.date_of_birth, gender: r.gender,
				address: r.address, rt: r.rt, rw: r.rw ?? r.rt, subdistrict: r.subdistrict, district: r.district,
				city: r.city, province: r.province, job: r.job_type, marital_status: r.marital_status,
			};
			const ver = normalizeVer(raw);
			const returned = Object.entries(raw).filter(([, v]) => v != null).map(([k]) => k as FieldKey);
			patchDirector(uid, {
				ver,
				dukcapil: {
					checked: true,
					status: returned.length > 0 && returned.every((k) => ver[k] === 'True'),
					reason: String(res.data?.reason ?? ''),
				},
			});
		} catch (e: any) {
			alert(e.response?.data?.message ?? 'Error: verification failed');
		} finally {
			setVerifyingUid(null);
		}
	};

	const patchWna = (uid: string, patch: Partial<WnaEntry>) =>
		setWnaBoard((prev) => prev.map((w) => (w.uid === uid ? { ...w, ...patch } : w)));

	const addWna = () => setWnaBoard((prev) => [...prev, {
		uid: newUid(), ocrId: null, origIdNo: '', origIdType: 'KITAS', name: '', idCardNo: '', idType: 'KITAS', docTypes: [],
	}]);

	const removeWna = async (uid: string, idx: number) => {
		const w = wnaBoard.find((x) => x.uid === uid);
		if (!w) return;
		const msg = w.ocrId
			? `Hapus Pengurus WNA #${idx + 1}? Data dan file-nya akan dihapus saat Save.`
			: `Hapus Pengurus WNA #${idx + 1}?`;
		if (!window.confirm(msg)) return;
		await discardStaging([`${WNA_PREFIX}${uid}`]);
		setWnaBoard((prev) => prev.filter((x) => x.uid !== uid));
	};

	const isChanged = (d: DirectorEntry) => {
		const o = originals[d.uid];
		if (!o || !d.ocrId) return true;
		return stagingDirDocs(d).length > 0 || d.lookupDocs.length > 0
			|| JSON.stringify(comparableDirector(d)) !== JSON.stringify(comparableDirector(o));
	};
	const needsDukcapil = (d: DirectorEntry) => isChanged(d) && !d.dukcapil.checked;
	const dukcapilPending = directors.some(needsDukcapil);

	const stagedTypes = useMemo(() => {
		const tokens = new Set([...directors.map((d) => `${DIR_PREFIX}${d.uid}`), ...wnaBoard.map((w) => `${WNA_PREFIX}${w.uid}`)]);
		return Array.from(new Set(docs.filter((d) => tokens.has(d.type)).map((d) => d.type)));
	}, [docs, directors, wnaBoard]);

	const validate = (): Record<string, string> => {
		const e: Record<string, string> = {};
		if (!corpName.trim()) e.corp_name = 'Nama is required';
		if (!corpAddress.trim()) e.corp_address = 'Alamat is required';

		const used = new Map<string, string>();
		directors.forEach((d, i) => {
			const label = `Pengurus #${i + 1}`;
			const v = d.values;
			FIELD_ROWS.forEach((f) => {
				if (f.required && !v[f.key].trim()) e[`director_${i}_${f.key}`] = `${label}: ${f.label.replace(' (dd-mm-yyyy)', '')} is required`;
			});
			if (v.id_card_no && !NIK_RE.test(v.id_card_no)) e[`director_${i}_id_card_no`] = `${label}: NIK must be 16 digits (numbers only)`;
			if (d.lockedNik && v.id_card_no !== d.lockedNik) e[`director_${i}_id_card_no`] = `${label}: NIK cannot be changed on edit`;
			if (v.dob) {
				const err = dobError(v.dob.trim());
				if (err) e[`director_${i}_dob`] = `${label}: Tanggal Lahir ${err}`;
			}
			if (v.rt && !RTRW_RE.test(v.rt.trim())) e[`director_${i}_rt`] = `${label}: RT must be a 3-digit number (e.g. 003)`;
			if (v.rw && !RTRW_RE.test(v.rw.trim())) e[`director_${i}_rw`] = `${label}: RW must be a 3-digit number (e.g. 005)`;
			if (v.id_card_no) {
				if (used.has(v.id_card_no)) e[`director_${i}_id_card_no`] = `${label}: NIK is already used by ${used.get(v.id_card_no)}`;
				used.set(v.id_card_no, label);
			}
			if (isChanged(d) && !ktpDocsFor(d).length) e[`director_${i}_document`] = `${label}: KTP file is required`;
			if (needsDukcapil(d)) e[`director_${i}_dukcapil`] = `${label}: verify the KTP data with Dukcapil before saving`;
		});

		wnaBoard.forEach((w, i) => {
			const label = `Pengurus WNA #${i + 1}`;
			if (!w.name.trim()) e[`wna_${i}_name`] = `${label}: Nama is required`;
			if (!w.idCardNo.trim()) e[`wna_${i}_id_card_no`] = `${label}: ID Card No. is required`;
			else if (used.has(w.idCardNo.trim())) e[`wna_${i}_id_card_no`] = `${label}: ID Card No. is already used by ${used.get(w.idCardNo.trim())}`;
			else used.set(w.idCardNo.trim(), label);
			if (!WNA_ID_TYPES.includes(w.idType)) e[`wna_${i}_id_type`] = `${label}: ID Type must be KITAS or KITAP`;
			if (w.ocrId && w.idType !== w.origIdType && !stagingWnaDocs(w).length) {
				e[`wna_${i}_document`] = `${label}: upload the ${w.idType} file when changing ID Type`;
			}
		});
		return e;
	};

	const handleSubmit = async () => {
		const e = validate();
		setErrors(e);
		if (Object.keys(e).length) {
			const firstDir = Object.keys(e).map((k) => /^director_(\d+)_/.exec(k)).find(Boolean);
			if (firstDir) setActiveUid(directors[Number(firstDir[1])].uid);
			alert(Object.values(e).join('\n'));
			return;
		}
		if (buildComparable(corpName, corpAddress, notes, isCarro, directors, wnaBoard, stagedTypes) === baseline) {
			alert('No data changes.');
			return;
		}

		setSaving(true);
		try {
			const res = await api.post('/Prechecking/EditPT/update-corporate', {
				apless,
				prechecking_id: precheckingId,
				corp_name: corpName.trim(),
				corp_address: corpAddress.trim(),
				note: notes,
				is_carro: isCarro ? 1 : 0,
				directors: directors.map((d) => ({
					id: d.ocrId,
					doc_token: d.uid,
					doc_types: persistedDirTypes(d),
					...Object.fromEntries(Object.entries(d.values).map(([k, v]) => [k, v.trim()])),
					photo: d.photo,
					signature: d.signature,
					conf: Object.fromEntries(CONF_KEYS.map((k) => [k, d.conf[k] ?? ''])),
					ver: normalizeVer(d.ver),
					dukcapil: d.dukcapil,
					carried_document_ids: carryDocsOf(d).map((x) => x.id),
				})),
				wna_board: wnaBoard.map((w) => ({
					id: w.ocrId,
					doc_token: w.uid,
					doc_types: w.docTypes,
					name: w.name.trim(),
					id_card_no: w.idCardNo.trim(),
					id_type: w.idType,
				})),
			});
			if (res.data?.success && res.data?.no_changes) {
				alert('No data changes.');
				return;
			}
			if (res.data?.success) {
				alert('Data updated successfully.');
				navigate(CANCEL_PATH);
				return;
			}
			setErrors(res.data?.errors || {});
			alert(res.data?.message || 'Save failed.');
		} catch (err: any) {
			if (err.response?.data?.errors) setErrors(err.response.data.errors);
			alert(err.response?.data?.message ?? 'Failed to save. Please try again.');
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = async () => {
		if (stagedTypes.length) await discardStaging(stagedTypes);
		navigate(CANCEL_PATH);
	};

	if (loading) {
		return (
			<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
				<Spinner dark size={40} />
			</div>
		);
	}
	if (loadError || !data) {
		return (
			<div className="page-wrap">
				<div className="dukcapil-gate pending">{loadError || 'Data not found.'}</div>
				<div style={{ marginTop: 12 }}>
					<button className="btn-ghost" onClick={() => navigate(CANCEL_PATH)}>Back</button>
				</div>
			</div>
		);
	}

	const fieldErr = (key: string) => (errors[key] ? <p className="field-err">{errors[key]}</p> : null);
	const isGuarantor = data.check_for === 'G';

	return (
		<div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
			<DocPreviewModal state={preview} onClose={closePreview} />

			<div className="page-wrap">
				<div className="hdr">
					<div>
						<div className="hdr-title">Edit Prechecking Data</div>
						<div className="hdr-sub">Corporate {isGuarantor ? 'Guarantor' : 'Customer'} (PT) · {data.apless}</div>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
						<div className="hdr-badge">
							<span className="hdr-badge-label">Prechecking ID</span>
							<span className="hdr-badge-value">{data.prechecking_id}</span>
						</div>
						<button
							type="button"
							onClick={handleCancel}
							disabled={saving}
							style={{
								display: 'inline-flex', alignItems: 'center', gap: 6,
								background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.3)',
								borderRadius: 10, padding: '10px 16px', color: '#fff',
								fontSize: '.82rem', fontWeight: 600, fontFamily: 'var(--font)', cursor: 'pointer',
							}}
						>
							<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
							</svg>
							Back
						</button>
					</div>
				</div>

				<div className="card">
					<div className="section-label"><span className="dot" />General Information<hr /></div>
					<StatBlock rows={[
						['Last Prechecking Date', data.last_checking_date || '—'],
						['Outstanding', `IDR ${data.outstanding.toLocaleString('id-ID')}`],
					]} />
					<div className="form-grid" style={{ marginBottom: 24 }}>
						<div className="form-field">
							<label className="form-label">Checking For</label>
							<input readOnly value={isGuarantor ? 'Guarantor' : 'Customer'} className="form-input is-readonly" />
						</div>
						<div className="form-field">
							<label className="form-label">Type</label>
							<input readOnly value="Corporate" className="form-input is-readonly" />
						</div>
						<div className="form-field">
							<label className="form-label">Company Type</label>
							<input readOnly value={lesseeLabel} className="form-input is-readonly" />
						</div>
						<div className="form-field">
							<label className="form-label">New / Repeat Order</label>
							<input readOnly value={data.repeat_order === '1' ? 'Repeat Order' : 'New'} className="form-input is-readonly" />
						</div>
						<div className="form-field">
							<label className="form-label">Temp. Customer No.</label>
							<input readOnly value={data.apless} className="form-input is-readonly" />
						</div>
					</div>

					<div className="section-label"><span className="dot" />Company Information<hr /></div>
					<div className="form-grid" style={{ marginBottom: 24 }}>
						<div className="form-field full">
							<label className="form-label">Nama <span className="req">*</span></label>
							<input value={corpName} onChange={(e) => setCorpName(e.target.value.toUpperCase())} maxLength={100}
								className={`form-input${errors.corp_name ? ' err' : ''}`} style={{ textTransform: 'uppercase' }} />
							{fieldErr('corp_name')}
						</div>
						<div className="form-field full">
							<label className="form-label">Alamat <span className="req">*</span></label>
							<input value={corpAddress} onChange={(e) => setCorpAddress(e.target.value.toUpperCase())} maxLength={100}
								className={`form-input${errors.corp_address ? ' err' : ''}`} style={{ textTransform: 'uppercase' }} />
							{fieldErr('corp_address')}
						</div>
						<div className="form-field">
							<label className="form-label">NPWP No.</label>
							<input readOnly value={data.corp_npwp_no} className="form-input is-readonly" />
						</div>
						<div className="form-field full">
							<label className="form-label">NPWP</label>
							<FileInput multiple label="Upload NPWP" onFileChange={(f) => uploadFile(f, 'corp-npwp')} uploading={uploadingDocs.has('corp-npwp')} />
							<DocList docs={docsOf('corp-npwp')} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
						</div>
					</div>

					<div className="section-label"><span className="dot" />Data Pengurus (WNI)<hr /></div>
					{fieldErr('directors')}
					<div className="director-tabs-wrap">
						<div className="director-tabbar" role="tablist">
							{directors.map((d, i) => {
								const hasErr = Object.keys(errors).some((k) => k.startsWith(`director_${i}_`));
								const complete = FIELD_ROWS.every((f) => !f.required || d.values[f.key].trim());
								return (
									<button
										key={d.uid}
										type="button"
										role="tab"
										aria-selected={activeUid === d.uid}
										className={`director-tab${activeUid === d.uid ? ' active' : ''}`}
										onClick={() => setActiveUid(d.uid)}
									>
										<span className={`director-tab-dot${hasErr ? ' error' : complete ? ' complete' : ''}`} />
										Pengurus #{i + 1}
										{d.values.name && (
											<span style={{ color: 'var(--muted)', fontWeight: 500 }}>
												· {d.values.name.length > 16 ? `${d.values.name.slice(0, 16)}…` : d.values.name}
											</span>
										)}
										{directors.length > 1 && (
											<span
												className="director-tab-close"
												role="button"
												aria-label={`Remove Pengurus #${i + 1}`}
												onClick={(ev) => { ev.stopPropagation(); removeDirector(d.uid, `#${i + 1}`); }}
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
							{directors.map((d, i) => {
								if (d.uid !== activeUid) return null;
								const ktpDocs = ktpDocsFor(d);
								const stagingType = `${DIR_PREFIX}${d.uid}`;
								const showingLookupFile = !stagingDirDocs(d).length && d.lookupDocs.length > 0;
								const dirErrors = Object.entries(errors).filter(([k]) => k.startsWith(`director_${i}_`)).map(([, v]) => v);
								return (
									<div key={d.uid}>
										<div className="form-field full" style={{ marginBottom: 16 }}>
											<label className="form-label">File KTP Pengurus <span className="req">*</span></label>
											<FileInput
												label={ktpDocs.length ? 'Ganti File KTP (NIK harus sama)' : 'Upload File KTP'}
												onFileChange={(f) => handleKtpUpload(d.uid, f)}
												uploading={scanningUid === d.uid || uploadingDocs.has(stagingType)}
											/>
											<DocList docs={ktpDocs} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
											{showingLookupFile && (
												<p className="lookup-note ok" style={{ marginTop: 6 }}>
													File dari hasil pencarian NIK akan disalin ke prechecking ini saat Save.
												</p>
											)}
										</div>

										{!d.lockedNik && (
											<div className="sub-section blue" style={{ marginBottom: 16 }}>
												<div className="sub-section-title">Cari Data Pengurus berdasarkan NIK</div>
												<div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
													<div className="form-field" style={{ flex: '1 1 280px' }}>
														<label className="form-label">NIK Pengurus · KTP</label>
														<input
															className="form-input"
															inputMode="numeric"
															maxLength={16}
															placeholder="16 digit NIK"
															value={d.nikSearch}
															onChange={(e) => patchDirector(d.uid, { nikSearch: e.target.value.replace(/\D/g, '').slice(0, 16) })}
															onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(d.uid); } }}
														/>
													</div>
													<button type="button" className="btn-primary" onClick={() => handleLookup(d.uid)}
														disabled={lookupUid === d.uid || d.nikSearch.length !== 16}>
														{lookupUid === d.uid && <Spinner size={14} />}
														Cari Data
													</button>
												</div>
												{d.lookupMsg && <p className={`lookup-note ${d.lookupMsg.tone}`}>{d.lookupMsg.text}</p>}
												{d.lookupMeta && (
													<LookupResultPanel
														dukcapil={d.dukcapil}
														sourcePrecheckingId={d.lookupMeta.precheckingId}
														lastOCROn={d.lookupMeta.lastOCROn}
														photo={d.photo}
														documents={d.lookupDocs}
														onPreview={handlePreview}
														onPreviewPhoto={(src) => setPreview({ open: true, name: 'Pas Foto KTP.jpg', previewUrl: src })}
														previewLoadingId={previewLoadingId}
														onCancel={() => resetDirector(d.uid, `#${i + 1}`)}
														cancelDisabled={saving || scanningUid === d.uid}
													/>
												)}
											</div>
										)}

										<div className="ocr-table-wrap">
											<div className="ocr-table-head">
												<span className="ocr-table-title">Pengurus #{i + 1} · WNI</span>
												<button type="button" className="btn-light" onClick={() => handleVerify(d.uid)} disabled={verifyingUid === d.uid}>
													{verifyingUid === d.uid && <Spinner dark size={12} />}
													Verify Dukcapil
												</button>
											</div>
											<div style={{ overflowX: 'auto' }}>
												<table className="ocr-table">
													<thead>
														<tr>
															<th>Field</th>
															<th>Value</th>
															<th className="c">Confidence Rate</th>
															<th className="c">Verification (Dukcapil)</th>
														</tr>
													</thead>
													<tbody>
														<tr>
															<td className="lbl">ID Type</td>
															<td colSpan={3}><input readOnly value="KTP" className="form-input is-readonly" /></td>
														</tr>
														{FIELD_ROWS.map((f) => {
															const errKey = `director_${i}_${f.key}`;
															const locked = f.key === 'id_card_no' && !!d.lockedNik;
															return (
																<tr key={f.key}>
																	<td className="lbl">
																		{f.label}{f.required && <span className="req" style={{ color: 'var(--rose)' }}> *</span>}
																	</td>
																	<td>
																		{f.key === 'marital_status' ? (
																			<div className="select-wrap">
																				<select value={d.values.marital_status} onChange={(e) => setField(d.uid, f.key, e.target.value)}
																					className={`form-select${errors[errKey] ? ' err' : ''}`}>
																					<option value="">— Select —</option>
																					{maritalOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
																				</select>
																			</div>
																		) : (
																			<input
																				value={d.values[f.key]}
																				disabled={locked}
																				readOnly={locked}
																				inputMode={['id_card_no', 'rt', 'rw'].includes(f.key) ? 'numeric' : undefined}
																				maxLength={f.key === 'id_card_no' ? 16 : ['rt', 'rw'].includes(f.key) ? 3 : f.key === 'dob' ? 10 : undefined}
																				placeholder={f.key === 'dob' ? 'dd-mm-yyyy' : undefined}
																				onChange={(e) => {
																					let v = e.target.value;
																					if (['id_card_no', 'rt', 'rw'].includes(f.key)) v = v.replace(/\D/g, '');
																					else if (f.key === 'dob') v = formatDobInput(v, d.values.dob);
																					else v = v.toUpperCase();
																					setField(d.uid, f.key, v);
																				}}
																				className={`form-input${locked ? ' is-readonly' : ''}${errors[errKey] ? ' err' : ''}`}
																			/>
																		)}
																	</td>
																	<td className="c"><ConfBadge value={d.conf[f.key]} /></td>
																	<td className="c">
																		{f.dukcapil ? <VerBadge value={d.ver[f.key]} checked={d.dukcapil.checked} /> : <span className="badge idle">—</span>}
																	</td>
																</tr>
															);
														})}
														<tr>
															<td className="lbl">Foto</td>
															<td colSpan={3}>
																{d.photo
																	? <img className="ktp-photo" src={asPhotoSrc(d.photo)} alt="Foto" style={{ cursor: 'zoom-in' }}
																		onClick={() => setPreview({ open: true, name: 'Pas Foto KTP.jpg', previewUrl: asPhotoSrc(d.photo) })} />
																	: <div className="ktp-empty photo">No Photo</div>}
															</td>
														</tr>
														<tr>
															<td className="lbl">Tanda Tangan</td>
															<td colSpan={3}>
																{d.signature
																	? <img className="ktp-sign" src={asPhotoSrc(d.signature)} alt="Tanda Tangan" />
																	: <div className="ktp-empty sign" />}
															</td>
														</tr>
													</tbody>
												</table>
											</div>
										</div>

										{dirErrors.length > 0 && (
											<div className="dukcapil-gate pending" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, marginTop: 10 }}>
												{dirErrors.map((m) => <span key={m}>{m}</span>)}
											</div>
										)}

										<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
											<button type="button" className="btn-ghost" onClick={() => resetDirector(d.uid, `#${i + 1}`)} disabled={saving || scanningUid === d.uid}>
												Cancel Pengurus #{i + 1} Changes
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{data.unassigned_documents.length > 0 && (
						<div className="sub-section orange" style={{ marginBottom: 18 }}>
							<div className="sub-section-title">File identitas yang belum terhubung ke pengurus</div>
							<DocList
								docs={data.unassigned_documents.map((d) => ({ ...d, readonly: true }))}
								onDelete={() => { }}
								onPreview={handlePreview}
								previewLoadingId={previewLoadingId}
							/>
						</div>
					)}

					<div className="section-label"><span className="dot" />Data Pengurus (WNA)<hr /></div>
					<div style={{ marginBottom: 12 }}>
						{wnaBoard.map((w, idx) => {
							const stagingType = `${WNA_PREFIX}${w.uid}`;
							return (
								<div className="epc-wna-card" key={w.uid}>
									<div className="epc-wna-head">
										<span className="epc-wna-title">Pengurus WNA #{idx + 1}</span>
										<button type="button" className="btn-remove" onClick={() => removeWna(w.uid, idx)}>Remove</button>
									</div>
									<div className="epc-wna-row">
										<div className="epc-pair">
											<label className="epc-pair-label">Name <span className="req">*</span></label>
											<div className="epc-pair-body">
												<input className={`form-input${errors[`wna_${idx}_name`] ? ' err' : ''}`} style={{ textTransform: 'uppercase' }}
													value={w.name} onChange={(e) => patchWna(w.uid, { name: e.target.value.toUpperCase() })} />
												{fieldErr(`wna_${idx}_name`)}
											</div>
										</div>
										<div className="epc-pair">
											<label className="epc-pair-label">ID Type <span className="req">*</span></label>
											<div className="epc-pair-body">
												<div className="select-wrap">
													<select className={`form-select${errors[`wna_${idx}_id_type`] ? ' err' : ''}`} value={w.idType}
														onChange={(e) => patchWna(w.uid, { idType: e.target.value as IdType })}>
														{WNA_ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
													</select>
												</div>
												{fieldErr(`wna_${idx}_id_type`)}
											</div>
										</div>
									</div>
									<div className="epc-wna-row">
										<div className="epc-pair">
											<label className="epc-pair-label">ID Card No. <span className="req">*</span></label>
											<div className="epc-pair-body">
												<input className={`form-input${errors[`wna_${idx}_id_card_no`] ? ' err' : ''}`} value={w.idCardNo}
													placeholder={`No. ${w.idType}`}
													onChange={(e) => patchWna(w.uid, { idCardNo: e.target.value.toUpperCase() })} />
												{fieldErr(`wna_${idx}_id_card_no`)}
											</div>
										</div>
										<div className="epc-pair">
											<label className="epc-pair-label">ID Card File</label>
											<div className="epc-pair-body">
												<FileInput label={`Upload ${w.idType}`} onFileChange={(f) => uploadFile(f, stagingType)} uploading={uploadingDocs.has(stagingType)} />
												<DocList docs={wnaDocsFor(w)} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
												{fieldErr(`wna_${idx}_document`)}
											</div>
										</div>
									</div>
								</div>
							);
						})}
					</div>
					<div style={{ marginBottom: 24 }}>
						<button type="button" className="btn-soft" onClick={addWna}>
							<svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
							Add Pengurus (WNA)
						</button>
					</div>

					<div className="section-label"><span className="dot" />Supporting Documents<hr /></div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
						{[
							{ label: 'Akta Pendirian', type: 'corp-akta' },
							{ label: 'SK Kemenkumham Akta Pendirian', type: 'corp-sk-akta' },
							{ label: 'Akta Perubahan Terakhir', type: 'corp-akta-terakhir' },
							{ label: 'SK Kemenkumham atas Akta Perubahan Terakhir', type: 'corp-sk-akta-terakhir' },
						].map((doc) => (
							<div className="form-field" key={doc.type}>
								<label className="form-label">{doc.label}</label>
								<FileInput multiple label={`Upload ${doc.label}`} onFileChange={(f) => uploadFile(f, doc.type)} uploading={uploadingDocs.has(doc.type)} />
								<DocList docs={docsOf(doc.type)} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
							</div>
						))}
					</div>

					<div className="section-label"><span className="dot" />Reference &amp; Notes<hr /></div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460, marginBottom: 8 }}>
						<div className="form-field">
							<label className="form-label">Reference</label>
							<div className="select-wrap">
								<select value={isCarro ? '1' : '0'} onChange={(e) => setIsCarro(e.target.value === '1')} className="form-select">
									<option value="1">Carro</option>
									<option value="0">Non Carro</option>
								</select>
							</div>
						</div>
						<div className="form-field">
							<label className="form-label">Note for Prechecking</label>
							<textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value.toUpperCase())} className="form-textarea"
								placeholder="Optional notes…" style={{ textTransform: 'uppercase' }} />
						</div>
					</div>

					{data.sik.length > 0 && (
						<>
							<div className="section-label" style={{ marginTop: 24 }}><span className="dot" />Credit Bureau Checks<hr /></div>
							<div style={{ overflowX: 'auto', border: '1.5px solid var(--border)', borderRadius: 12 }}>
								<table className="ocr-table">
									<thead>
										<tr>{['Subject', 'Bureau', 'Status', 'Score', 'Grade'].map((h) => <th key={h}>{h}</th>)}</tr>
									</thead>
									<tbody>
										{data.sik.map((s, i) => (
											<tr key={`${s.subject}-${i}`}>
												<td>{s.subject}</td><td>{s.credit_bureau}</td><td>{s.status}</td><td>{s.score}</td><td>{s.grade}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>

				{dukcapilPending && (
					<div className="dukcapil-gate pending">
						<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 004.02 21h15.96a2 2 0 001.91-2.96L13.71 3.86a2 2 0 00-3.42 0z" />
						</svg>
						Save is locked until every new or changed pengurus has been checked with "Verify Dukcapil".
					</div>
				)}

				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
					<button className="btn-ghost" onClick={handleCancel} disabled={saving}>Cancel</button>
					<button className="btn-primary" onClick={handleSubmit} disabled={saving || dukcapilPending}
						title={dukcapilPending ? 'Verify Dukcapil for every new or changed pengurus first' : undefined}>
						{saving && <Spinner />}
						Save Changes
					</button>
				</div>
			</div>
		</div>
	);
};

export default EditPrecheckingCorporatePage;
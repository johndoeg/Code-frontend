import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/shared/api/axiosInstance';
import OCRUploadSection, { type InitialOcrData } from '@/features/cam/contexts/OCRUploadSection';
import { MAX_FILE_LIMIT } from '@/shared/constants/DefaultValue';
import { fetchCamEditPrData, submitCamEditPr } from '@/features/cam/api/editPR';
import type { CamEditPrSubmitPayload } from '@/features/cam/types/prechecking';
import { extractErrorMessage } from '@/features/cam/utils/prechecking/errorMessage';
import {
	type CustomerData, type ConfidenceMap, type VerifiedMap, type DukcapilVerification,
	type MaritalOption, type UploadedDoc, type IdType, type OcrRecord, type PreviewState,
	ver_UNCHECKED, WNA_ID_TYPES, EMPTY_CUSTOMER, IMAGE_EXTS, PREVIEW_CLOSED,
	mapOcrToCustomer, useInjectStyles,
	Spinner, FileInput, DocList, LookupResultPanel, DocPreviewModal, StatBlock, FieldPair,
} from '@/features/cam/components/PrecheckingShared';

const CANCEL_PATH = '/cam-request-onhand';

type Nat = 'WNI' | 'WNA';

interface SikRow { subject: string; creditBureau: string; status: string; score: string; grade: string; }

interface EditSpouseData { nationality: Nat; idType: IdType; record: OcrRecord; }

interface EditPrLoadResponse {
	apless: string;
	prechecking_id: string;
	check_for: string;
	customer_type: string;
	repeat_order: '0' | '1';
	is_carro: '0' | '1';
	note: string;
	last_checking_date: string;
	outstanding: number;
	marital_status: string;
	nationality: Nat;
	cust_id_type: IdType;
	customer: OcrRecord;
	spouse: EditSpouseData | null;
	sik: SikRow[];
}

interface PersonBlock {
	person: CustomerData;
	conf: ConfidenceMap;
	ver: VerifiedMap;
	dukcapil: DukcapilVerification;
}

interface EditPrSubmitPayload {
	apless: string;
	prechecking_id: string;
	marital_status: string;
	is_carro: 0 | 1;
	note: string;
	cust_id_type: IdType;
	customer?: PersonBlock;
	wna_customer?: { name: string; id_no: string };
	spouse:
	| null
	| ({ nationality: Nat; id_type: IdType } & (Partial<PersonBlock> & {
		name?: string;
		id_no?: string;
		carried_documents?: { customer_document_id: number; document_type: string }[];
	}));
}

interface EditPrSubmitResult {
	success: boolean;
	no_changes?: boolean;
	message?: string;
	errors?: Record<string, string>;
}

const DUKCAPIL_KEYS: (keyof CustomerData)[] = [
	'idCardNo', 'name', 'placeOfBirth', 'dateOfBirth', 'gender', 'address',
	'rt', 'rw', 'subdistrict', 'district', 'city', 'province', 'job',
];

const REQUIRED_PERSON_FIELDS: [keyof CustomerData, string][] = [
	['idCardNo', 'NIK'], ['name', 'Nama'], ['placeOfBirth', 'Tempat Lahir'],
	['dateOfBirth', 'Tanggal Lahir'], ['gender', 'Jenis Kelamin'], ['address', 'Alamat'],
	['rt', 'RT'], ['rw', 'RW'], ['subdistrict', 'Kelurahan/Desa'], ['district', 'Kecamatan'],
	['city', 'Kota/Kabupaten'], ['province', 'Provinsi'], ['religion', 'Agama'], ['job', 'Pekerjaan'],
];

const COMPARE_FIELDS: (keyof CustomerData)[] = [...REQUIRED_PERSON_FIELDS.map(([k]) => k), 'bloodType'];

const NIK_RE = /^\d{16}$/;
const RTRW_RE = /^\d{3}$/;
const DOB_RE = /^(\d{2})-(\d{2})-(\d{4})$/;

const normalizeVerified = (ver?: VerifiedMap): VerifiedMap => {
	const out: VerifiedMap = {};
	DUKCAPIL_KEYS.forEach((k) => { out[k] = ver?.[k] === 'True' ? 'True' : 'False'; });
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

const validatePerson = (prefix: string, label: string, p: CustomerData, e: Record<string, string>) => {
	REQUIRED_PERSON_FIELDS.forEach(([key, lbl]) => {
		if (!(p[key] || '').trim()) e[`${prefix}.${key}`] = `${label} ${lbl} is required`;
	});
	if (p.idCardNo && !NIK_RE.test(p.idCardNo.trim())) {
		e[`${prefix}.idCardNo`] = `${label} NIK must be 16 digits (numbers only)`;
	}
	if (p.dateOfBirth) {
		const err = dobError(p.dateOfBirth.trim());
		if (err) e[`${prefix}.dateOfBirth`] = `${label} Tanggal Lahir ${err}`;
	}
	if (p.rt && !RTRW_RE.test(p.rt.trim())) e[`${prefix}.rt`] = `${label} RT must be a 3-digit number (e.g. 003)`;
	if (p.rw && !RTRW_RE.test(p.rw.trim())) e[`${prefix}.rw`] = `${label} RW must be a 3-digit number (e.g. 005)`;
};

interface FormSnapshot {
	nationality: Nat;
	marital: string;
	notes: string;
	isCarro: boolean;
	custIdType: IdType;
	customer: CustomerData;
	custVer: VerifiedMap;
	wnaName: string;
	wnaIdCard: string;
	spouseNat: Nat | '';
	spouse: CustomerData;
	spouseVer: VerifiedMap;
	wnaSpName: string;
	wnaSpId: string;
	wnaSpIdType: IdType;
	spouseCarryIds: number[];
}

const pickFields = (p: CustomerData) => COMPARE_FIELDS.map((k) => (p[k] || '').trim());

const buildComparable = (s: FormSnapshot): string => {
	const married = ['M', 'O'].includes(s.marital);
	return JSON.stringify({
		marital: s.marital,
		notes: s.notes.trim(),
		carro: s.isCarro,
		customer: s.nationality === 'WNI'
			? { fields: pickFields(s.customer), ver: normalizeVerified(s.custVer) }
			: { name: s.wnaName.trim(), id: s.wnaIdCard.trim(), type: s.custIdType },
		spouse: !married ? null
			: s.spouseNat === 'WNI'
				? { nat: 'WNI', fields: pickFields(s.spouse), ver: normalizeVerified(s.spouseVer), carry: s.spouseCarryIds }
				: s.spouseNat === 'WNA'
					? { nat: 'WNA', name: s.wnaSpName.trim(), id: s.wnaSpId.trim(), type: s.wnaSpIdType }
					: { nat: '' },
	});
};

interface SpouseSeedState {
	nat: Nat | '';
	person: CustomerData;
	conf: ConfidenceMap;
	ver: VerifiedMap;
	dukcapil: DukcapilVerification;
	wnaName: string;
	wnaId: string;
	wnaIdType: IdType;
}

const spouseSeedFrom = (sp: EditSpouseData | null): SpouseSeedState => {
	const isWni = sp?.nationality === 'WNI';
	const isWna = sp?.nationality === 'WNA';
	return {
		nat: sp?.nationality ?? '',
		person: isWni ? mapOcrToCustomer(sp.record) : EMPTY_CUSTOMER(),
		conf: isWni ? sp.record.confidence ?? {} : {},
		ver: isWni ? normalizeVerified(sp.record.verified) : {},
		dukcapil: isWni ? sp.record.dukcapil ?? ver_UNCHECKED : ver_UNCHECKED,
		wnaName: isWna ? sp.record.nama || '' : '',
		wnaId: isWna ? sp.record.nik || '' : '',
		wnaIdType: isWna && WNA_ID_TYPES.includes(sp.idType) ? sp.idType : 'KITAS',
	};
};

const ErrorList: React.FC<{ errors: Record<string, string>; prefix: string }> = ({ errors, prefix }) => {
	const msgs = Object.entries(errors).filter(([k]) => k.startsWith(`${prefix}.`)).map(([, v]) => v);
	if (!msgs.length) return null;
	return (
		<div className="dukcapil-gate pending" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, marginTop: 10 }}>
			{msgs.map((m) => <span key={m}>{m}</span>)}
		</div>
	);
};

const EditPrecheckingIndividuPage: React.FC = () => {
	useInjectStyles();

	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const apless = searchParams.get('apless') || '';
	const precheckingId = searchParams.get('prechecking_id') || '';

	const [data, setData] = useState<EditPrLoadResponse | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [baseline, setBaseline] = useState('');
	const [maritalOptions, setMaritalOptions] = useState<MaritalOption[]>([]);

	const [marital, setMarital] = useState('');
	const [isCarro, setIsCarro] = useState(true);
	const [notes, setNotes] = useState('');

	const [custIdType, setCustIdType] = useState<IdType>('KTP');
	const [customer, setCustomer] = useState<CustomerData>(EMPTY_CUSTOMER());
	const [custConf, setCustConf] = useState<ConfidenceMap>({});
	const [custVer, setCustVer] = useState<VerifiedMap>({});
	const [custDukcapil, setCustDukcapil] = useState<DukcapilVerification>(ver_UNCHECKED);
	const [wnaName, setWnaName] = useState('');
	const [wnaIdCard, setWnaIdCard] = useState('');

	const [spouseNat, setSpouseNat] = useState<Nat | ''>('');
	const [spouse, setSpouse] = useState<CustomerData>(EMPTY_CUSTOMER());
	const [spouseConf, setSpouseConf] = useState<ConfidenceMap>({});
	const [spouseVer, setSpouseVer] = useState<VerifiedMap>({});
	const [spouseDukcapil, setSpouseDukcapil] = useState<DukcapilVerification>(ver_UNCHECKED);
	const [wnaSpName, setWnaSpName] = useState('');
	const [wnaSpId, setWnaSpId] = useState('');
	const [wnaSpIdType, setWnaSpIdType] = useState<IdType>('KITAS');

	const [spouseNikSearch, setSpouseNikSearch] = useState('');
	const [spouseLookupLoading, setSpouseLookupLoading] = useState(false);
	const [spouseLookupMsg, setSpouseLookupMsg] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
	const [spouseSeed, setSpouseSeed] = useState<InitialOcrData | null>(null);
	const [spouseSeedKey, setSpouseSeedKey] = useState(0);
	const [spouseSeedMeta, setSpouseSeedMeta] = useState<{ precheckingId: string; lastOCROn: string } | null>(null);
	const [spouseLookupDocs, setSpouseLookupDocs] = useState<UploadedDoc[]>([]);

	const [docs, setDocs] = useState<UploadedDoc[]>([]);
	const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());
	const [deletingDocs, setDeletingDocs] = useState<Set<number>>(new Set());
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);
	const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);

	const [errors, setErrors] = useState<Record<string, string>>({});

	const nationality: Nat = data?.nationality ?? 'WNI';
	const docPrefix = data?.check_for === 'G' ? 'guarantor' : 'cust';
	const organizationType = data?.check_for === 'G' ? 'GUARNPR' : 'PR';
	const custKtpType = `${docPrefix}-ktp`;
	const custWnaDocType = `${docPrefix}-${custIdType === 'KITAP' ? 'kitap' : 'kitas'}`;
	const spouseKtpType = nationality === 'WNA' ? `${docPrefix}-wna-spouse-ktp` : `${docPrefix}-spouse-ktp`;
	const spouseWnaDocType = `${docPrefix}-spouse-${wnaSpIdType === 'KITAP' ? 'kitap' : 'kitas'}`;
	const supportingDocs = [
		{ label: 'KK (Kartu Keluarga)', type: `${docPrefix}-kk` },
		{ label: 'NPWP', type: `${docPrefix}-npwp` },
		{ label: 'Akta Cerai / Akta Kematian', type: `${docPrefix}-marriage-or-death-statement` },
	];

	const snapshot = (): FormSnapshot => ({
		nationality, marital, notes, isCarro, custIdType, customer, custVer,
		wnaName, wnaIdCard, spouseNat, spouse, spouseVer, wnaSpName, wnaSpId, wnaSpIdType,
		spouseCarryIds: carrySpouseDocs ? spouseLookupDocs.map((d) => d.id) : [],
	});

	const handleCustomerData = useCallback(
		(d: CustomerData, conf: ConfidenceMap, verified: VerifiedMap, verification: DukcapilVerification) => {
			setCustomer(d);
			setCustConf(conf);
			setCustVer(normalizeVerified(verified));
			setCustDukcapil(verification);
		},
		[],
	);

	const handleSpouseData = useCallback(
		(d: CustomerData, conf: ConfidenceMap, verified: VerifiedMap, verification: DukcapilVerification) => {
			setSpouse(d);
			setSpouseConf(conf);
			setSpouseVer(normalizeVerified(verified));
			setSpouseDukcapil(verification);
		},
		[],
	);

	const applySpouseSeed = useCallback((seed: SpouseSeedState) => {
		setSpouseNat(seed.nat);
		setSpouse(seed.person);
		setSpouseConf(seed.conf);
		setSpouseVer(seed.ver);
		setSpouseDukcapil(seed.dukcapil);
		setWnaSpName(seed.wnaName);
		setWnaSpId(seed.wnaId);
		setWnaSpIdType(seed.wnaIdType);
		setSpouseNikSearch('');
		setSpouseLookupMsg(null);
		setSpouseSeed(null);
		setSpouseSeedMeta(null);
		setSpouseLookupDocs([]);
		setSpouseSeedKey((k) => k + 1);
	}, []);

	const closePreview = useCallback(() => setPreview(PREVIEW_CLOSED), []);

	const fetchDocs = useCallback(async (): Promise<UploadedDoc[]> => {
		const res = await api.get('/CAM/Prechecking/documents', {
			params: { apless, prechecking_id: precheckingId },
		});
		return (res.data ?? []) as UploadedDoc[];
	}, [apless, precheckingId]);

	const refreshDocs = useCallback(async (newPreviewUrl?: string, newDocName?: string) => {
		try {
			const fetched = await fetchDocs();
			setDocs((prev) => {
				const previewMap = new Map(prev.map((d) => [d.id, d.previewUrl]));
				return fetched.map((d) => ({
					...d,
					previewUrl: newDocName && d.name === newDocName ? newPreviewUrl : previewMap.get(d.id),
				}));
			});
		} catch (e) {
			console.error('Failed to refresh docs', e);
		}
	}, [fetchDocs]);

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
				const [raw, maritalR, docList] = await Promise.all([
					fetchCamEditPrData(apless, precheckingId),
					api.get('/CAM/Prechecking/marital-statuses'),
					fetchDocs().catch(() => [] as UploadedDoc[]),
				]);
				const res = raw as unknown as EditPrLoadResponse;

				const seedCustomer = mapOcrToCustomer(res.customer);
				const seedCustVer = normalizeVerified(res.customer.verified);
				const seedWnaName = res.nationality === 'WNA' ? res.customer.nama || '' : '';
				const seedWnaId = res.nationality === 'WNA' ? res.customer.nik || '' : '';

				const sp = spouseSeedFrom(res.spouse);
				const seedCarro = res.is_carro === '1';

				setMaritalOptions(maritalR.data ?? []);
				setDocs(docList);

				setMarital(res.marital_status || '');
				setIsCarro(seedCarro);
				setNotes(res.note || '');
				setCustIdType(res.cust_id_type);
				setCustomer(seedCustomer);
				setCustConf(res.customer.confidence ?? {});
				setCustVer(seedCustVer);
				setCustDukcapil(res.customer.dukcapil ?? ver_UNCHECKED);
				setWnaName(seedWnaName);
				setWnaIdCard(seedWnaId);
				applySpouseSeed(sp);

				setBaseline(buildComparable({
					nationality: res.nationality,
					marital: res.marital_status || '',
					notes: res.note || '',
					isCarro: seedCarro,
					custIdType: res.cust_id_type,
					customer: seedCustomer,
					custVer: seedCustVer,
					wnaName: seedWnaName,
					wnaIdCard: seedWnaId,
					spouseNat: sp.nat,
					spouse: sp.person,
					spouseVer: sp.ver,
					wnaSpName: sp.wnaName,
					wnaSpId: sp.wnaId,
					wnaSpIdType: sp.wnaIdType,
					spouseCarryIds: [],
				}));
				setData(res);
			} catch (err) {
				setLoadError(extractErrorMessage(err, 'Failed to load prechecking data. Please try again.'));
			} finally {
				setLoading(false);
			}
		};
		init();
	}, [apless, precheckingId, fetchDocs, applySpouseSeed]);

	const custInitialData = useMemo<InitialOcrData | undefined>(() => {
		if (!data || data.nationality !== 'WNI') return undefined;
		return {
			data: mapOcrToCustomer(data.customer),
			conf: data.customer.confidence,
			ver: normalizeVerified(data.customer.verified),
			verification: data.customer.dukcapil,
		};
	}, [data]);

	const spouseInitialData = useMemo<InitialOcrData | undefined>(() => {
		const sp = data?.spouse;
		if (!sp || sp.nationality !== 'WNI') return undefined;
		return {
			data: mapOcrToCustomer(sp.record),
			conf: sp.record.confidence,
			ver: normalizeVerified(sp.record.verified),
			verification: sp.record.dukcapil,
		};
	}, [data]);

	const uploadDoc = async (file: File, docType: string) => {
		const ALLOWED_EXTS = ['.png', '.jpg', '.jpeg', '.pdf', '.tiff', '.tif', '.bmp', '.gif', '.heic', '.heif', '.xlsx', '.docx'];
		const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();

		if (!ALLOWED_EXTS.includes(ext)) {
			alert('Format file tidak didukung.\nFormat yang diizinkan: PNG, JPG, PDF, TIFF, BMP, GIF, HEIC, XLSX, DOCX');
			return;
		}
		if (ext !== '.pdf' && file.size > MAX_FILE_LIMIT * 1024 * 1024) {
			alert(`Ukuran file melebihi batas maksimal (${MAX_FILE_LIMIT} MB).`);
			return;
		}

		const extClean = ext.replace('.', '');
		const localPreviewUrl = IMAGE_EXTS.has(extClean) || ext === '.pdf' ? URL.createObjectURL(file) : undefined;

		setUploadingDocs((prev) => new Set(prev).add(docType));
		try {
			const fd = new FormData();
			fd.append('file', file);
			fd.append('apless', apless);
			fd.append('prechecking_id', precheckingId);
			fd.append('document_type', docType);
			fd.append('cust_type', 'PR');
			fd.append('organization_type', organizationType);

			const res = await api.post('/CAM/Prechecking/upload-document', fd);
			if (!res.data?.success) {
				alert(res.data?.message ?? 'Upload gagal. Silakan coba lagi.');
				if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
				return;
			}
			await refreshDocs(localPreviewUrl, res.data.document_name);
		} catch (e) {
			if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
			alert(extractErrorMessage(e, 'Upload gagal. Periksa koneksi dan coba lagi.'));
		} finally {
			setUploadingDocs((prev) => {
				const next = new Set(prev);
				next.delete(docType);
				return next;
			});
		}
	};

	const clearDataForDocType = (docType: string) => {
		if (docType === custKtpType) {
			setCustomer(EMPTY_CUSTOMER());
			setCustConf({});
			setCustVer({});
			setCustDukcapil(ver_UNCHECKED);
		} else if (docType === spouseKtpType) {
			setSpouse(EMPTY_CUSTOMER());
			setSpouseConf({});
			setSpouseVer({});
			setSpouseDukcapil(ver_UNCHECKED);
			setSpouseSeed(null);
			setSpouseSeedMeta(null);
			setSpouseLookupDocs([]);
			setSpouseLookupMsg(null);
		}
	};

	const handleDeleteDoc = async (docId: number) => {
		const doc = docs.find((d) => d.id === docId);
		if (!doc || doc.readonly) return;
		if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return;
		setDeletingDocs((prev) => new Set(prev).add(docId));
		try {
			if (doc.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(doc.previewUrl);
			const res = await api.post('/CAM/Prechecking/delete-document', {
				customer_document_id: docId,
				prechecking_id: precheckingId,
				nik: '',
			});
			if (!res.data?.success) {
				alert(res.data?.message ?? 'Hapus dokumen gagal. Silakan coba lagi.');
				return;
			}
			clearDataForDocType(doc.type);
			await refreshDocs();
		} catch (e) {
			alert(extractErrorMessage(e, 'Hapus dokumen gagal. Periksa koneksi dan coba lagi.'));
		} finally {
			setDeletingDocs((prev) => {
				const next = new Set(prev);
				next.delete(docId);
				return next;
			});
		}
	};

	const handlePreview = async (doc: UploadedDoc) => {
		const direct = doc.previewUrl || doc.view_url;
		if (direct) {
			setPreview({ open: true, name: doc.name, previewUrl: direct });
			return;
		}
		setPreviewLoadingId(doc.id);
		try {
			const res = await api.get('/CAM/Prechecking/view-document', { params: { customer_document_id: doc.id } });
			if (res.data?.success && res.data?.view_url) {
				setPreview({ open: true, name: doc.name, previewUrl: res.data.view_url });
			} else {
				alert(res.data?.message ?? 'Dokumen tidak dapat ditampilkan.');
			}
		} catch (e) {
			alert(extractErrorMessage(e, 'Gagal memuat pratinjau dokumen.'));
		} finally {
			setPreviewLoadingId(null);
		}
	};

	const handleSpouseNikLookup = async () => {
		const nik = spouseNikSearch.replace(/\D/g, '');
		if (nik.length !== 16) {
			setSpouseLookupMsg({ tone: 'warn', text: 'NIK harus 16 digit.' });
			return;
		}
		if (nationality === 'WNI' && nik === customer.idCardNo) {
			setSpouseLookupMsg({ tone: 'warn', text: 'NIK pasangan tidak boleh sama dengan NIK debitur.' });
			return;
		}

		setSpouseLookupLoading(true);
		setSpouseLookupMsg(null);
		try {
			const res = await api.post('/CAM/lookup-ocr-by-nik', { nik, exclude_prechecking_id: precheckingId });
			if (!res.data?.found) {
				setSpouseSeed(null);
				setSpouseSeedMeta(null);
				setSpouseLookupDocs([]);
				setSpouseLookupMsg({
					tone: 'warn',
					text: res.data?.message ?? 'Data tidak ditemukan. Silakan upload KTP pasangan untuk OCR.',
				});
				return;
			}

			const rec = res.data.ocr as OcrRecord;
			const seeded = mapOcrToCustomer(rec);
			const seededVer = normalizeVerified(rec.verified);
			setSpouse(seeded);
			setSpouseConf(rec.confidence ?? {});
			setSpouseVer(seededVer);
			setSpouseDukcapil(rec.dukcapil ?? ver_UNCHECKED);
			setSpouseSeed({ data: seeded, conf: rec.confidence, ver: seededVer, verification: rec.dukcapil });
			setSpouseSeedMeta({ precheckingId: res.data.sourcePrecheckingId || '', lastOCROn: res.data.lastOCROn || '' });
			setSpouseLookupDocs(((res.data.documents ?? []) as UploadedDoc[]).map((d) => ({ ...d, readonly: true })));
			setSpouseSeedKey((k) => k + 1);
			setSpouseLookupMsg({ tone: 'ok', text: 'Data pasangan ditemukan. Periksa kembali sebelum simpan.' });
		} catch (e) {
			setSpouseLookupMsg({ tone: 'warn', text: extractErrorMessage(e, 'Gagal mencari data pasangan.') });
		} finally {
			setSpouseLookupLoading(false);
		}
	};

	const isMarried = ['M', 'O'].includes(marital);
	const showSpouseOCR = isMarried && spouseNat === 'WNI';
	const showSpouseWna = isMarried && spouseNat === 'WNA';

	const custDukcapilRequired = nationality === 'WNI';
	const dukcapilPending =
		(custDukcapilRequired && !custDukcapil.checked) ||
		(showSpouseOCR && !spouseDukcapil.checked);

	const spouseExpectedNik =
		spouseSeed?.data.idCardNo
		|| (spouseNikSearch.length === 16 ? spouseNikSearch : '')
		|| undefined;

	const docsOf = (type: string) => docs.filter((d) => d.type === type);
	const docsOfAny = (types: string[]) => docs.filter((d) => types.includes(d.type));

	const carrySpouseDocs = showSpouseOCR && !!spouseSeed && spouseLookupDocs.length > 0;
	const spouseKtpDocs = carrySpouseDocs ? spouseLookupDocs : docsOf(spouseKtpType);

	const validate = (): Record<string, string> => {
		const e: Record<string, string> = {};
		if (!marital) e.marital_status = 'Marital Status is required';

		if (nationality === 'WNI') {
			validatePerson('customer', 'Customer', customer, e);
			if (data && customer.idCardNo && customer.idCardNo !== data.customer.nik) {
				e['customer.idCardNo'] = 'Customer NIK cannot be changed on edit';
			}
			if (!docsOf(custKtpType).length) e['customer.document'] = 'Customer KTP file is required';
			if (!custDukcapil.checked) e['customer.dukcapil'] = "Please verify the Customer's KTP data with Dukcapil before saving";
		} else {
			if (!wnaName.trim()) e['customer.name'] = 'Nama is required';
			if (!wnaIdCard.trim()) e['customer.idCardNo'] = `${custIdType} number is required`;
			if (!WNA_ID_TYPES.includes(custIdType)) e['customer.idType'] = 'ID Type must be KITAS or KITAP';
			if (custIdType !== data?.cust_id_type && !docsOf(custWnaDocType).length) {
				e['customer.document'] = `${custIdType} file is required when changing ID Type`;
			}
		}

		if (isMarried) {
			if (!spouseNat) {
				e['spouse.nationality'] = 'Spouse Nationality is required';
			} else if (spouseNat === 'WNI') {
				validatePerson('spouse', 'Spouse', spouse, e);
				if (nationality === 'WNI' && spouse.idCardNo && spouse.idCardNo === customer.idCardNo) {
					e['spouse.idCardNo'] = 'Spouse NIK cannot be the same as the customer NIK';
				}
				if (!spouseKtpDocs.length) e['spouse.document'] = 'Spouse KTP file is required';
				if (!spouseDukcapil.checked) e['spouse.dukcapil'] = "Please verify the Spouse's KTP data with Dukcapil before saving";
			} else {
				if (!wnaSpName.trim()) e['spouse.name'] = 'Spouse Name is required';
				if (!wnaSpId.trim()) e['spouse.idCardNo'] = `Spouse ${wnaSpIdType} number is required`;
				if (!WNA_ID_TYPES.includes(wnaSpIdType)) e['spouse.idType'] = 'Spouse ID Type must be KITAS or KITAP';
				const loaded = data?.spouse;
				const typeChanged = !loaded || loaded.nationality !== 'WNA' || loaded.idType !== wnaSpIdType;
				if (typeChanged && !docsOf(spouseWnaDocType).length) {
					e['spouse.document'] = `Spouse ${wnaSpIdType} file is required`;
				}
			}
		}
		return e;
	};

	const buildPayload = (): EditPrSubmitPayload => {
		const ktpBlock = (person: CustomerData, conf: ConfidenceMap, ver: VerifiedMap, duk: DukcapilVerification): PersonBlock => ({
			person: { ...person, idCardNo: person.idCardNo.trim(), rt: person.rt.trim(), rw: person.rw.trim(), dateOfBirth: person.dateOfBirth.trim() },
			conf,
			ver: normalizeVerified(ver),
			dukcapil: duk,
		});

		let spousePayload: EditPrSubmitPayload['spouse'] = null;
		if (isMarried && spouseNat === 'WNI') {
			spousePayload = {
				nationality: 'WNI',
				id_type: 'KTP',
				...ktpBlock(spouse, spouseConf, spouseVer, spouseDukcapil),
				carried_documents: carrySpouseDocs
					? spouseLookupDocs.map((d) => ({ customer_document_id: d.id, document_type: spouseKtpType }))
					: [],
			};
		} else if (isMarried && spouseNat === 'WNA') {
			spousePayload = { nationality: 'WNA', id_type: wnaSpIdType, name: wnaSpName.trim(), id_no: wnaSpId.trim() };
		}

		return {
			apless,
			prechecking_id: precheckingId,
			marital_status: marital,
			is_carro: isCarro ? 1 : 0,
			note: notes,
			cust_id_type: nationality === 'WNI' ? 'KTP' : custIdType,
			customer: nationality === 'WNI' ? ktpBlock(customer, custConf, custVer, custDukcapil) : undefined,
			wna_customer: nationality === 'WNA' ? { name: wnaName.trim(), id_no: wnaIdCard.trim() } : undefined,
			spouse: spousePayload,
		};
	};

	const handleSubmit = async () => {
		const e = validate();
		setErrors(e);
		if (Object.keys(e).length) {
			alert(Object.values(e).join('\n'));
			return;
		}

		if (buildComparable(snapshot()) === baseline) {
			alert('No data changes.');
			return;
		}

		setSaving(true);
		try {
			const res = (await submitCamEditPr(buildPayload() as unknown as CamEditPrSubmitPayload)) as unknown as EditPrSubmitResult;
			if (res.success && res.no_changes) {
				alert('No data changes.');
				return;
			}
			if (res.success) {
				alert('Data updated successfully.');
				navigate(CANCEL_PATH);
				return;
			}
			setErrors(res.errors || {});
			alert(res.message || 'Please fix the highlighted fields.');
		} catch (err) {
			const serverErrors = (err as { response?: { data?: { errors?: Record<string, string> } } })?.response?.data?.errors;
			if (serverErrors) setErrors(serverErrors);
			alert(extractErrorMessage(err, 'Failed to save. Please try again.'));
		} finally {
			setSaving(false);
		}
	};

	const handleCancel = () => navigate(CANCEL_PATH);

	const handleResetSpouse = () => {
		if (!data) return;
		if (!window.confirm('Batalkan perubahan data pasangan dan kembalikan ke data awal?')) return;
		applySpouseSeed(spouseSeedFrom(data.spouse));
		setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith('spouse.'))));
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
					<button className="btn-ghost" onClick={handleCancel}>Back</button>
				</div>
			</div>
		);
	}

	const fieldErr = (key: string) => (errors[key] ? <p className="field-err">{errors[key]}</p> : null);
	const idTypeSelect = (value: IdType, onChange: (v: IdType) => void, errKey: string) => (
		<div className="select-wrap">
			<select value={value} onChange={(e) => onChange(e.target.value as IdType)} className={`form-select${errors[errKey] ? ' err' : ''}`}>
				{WNA_ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
			</select>
		</div>
	);

	return (
		<div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>
			<DocPreviewModal state={preview} onClose={closePreview} />

			<div className="page-wrap">
				<div className="hdr">
					<div>
						<div className="hdr-title">Edit Prechecking Data</div>
						<div className="hdr-sub">Individual {data.check_for === 'G' ? 'Guarantor' : 'Customer'} · {data.apless}</div>
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
					<div style={{ marginBottom: 24 }}>
						<div className="form-grid" style={{ marginBottom: 14 }}>
							<div className="form-field">
								<label className="form-label">Checking For</label>
								<input readOnly value={data.check_for === 'G' ? 'Guarantor' : 'Customer'} className="form-input is-readonly" />
							</div>
							<div className="form-field">
								<label className="form-label">Type</label>
								<input readOnly value="Individu" className="form-input is-readonly" />
							</div>
						</div>
						<div className="form-grid" style={{ marginBottom: 14 }}>
							<div className="form-field">
								<label className="form-label">New / Repeat Order</label>
								<input readOnly value={data.repeat_order === '1' ? 'Repeat Order' : 'New'} className="form-input is-readonly" />
							</div>
							<div className="form-field">
								<label className="form-label">Temp. Customer No.</label>
								<input readOnly value={data.apless} className="form-input is-readonly" />
							</div>
						</div>
						<div className="form-grid">
							<div className="form-field">
								<label className="form-label">Nationality</label>
								<input readOnly value={nationality} className="form-input is-readonly" />
							</div>
							<div className="form-field">
								<label className="form-label">ID Type <span className="req">*</span></label>
								{nationality === 'WNI'
									? <input readOnly value="KTP" className="form-input is-readonly" />
									: idTypeSelect(custIdType, setCustIdType, 'customer.idType')}
								{fieldErr('customer.idType')}
							</div>
						</div>
					</div>

					{nationality === 'WNI' && (
						<>
							<div className="section-label"><span className="dot" />Customer KTP (OCR)<hr /></div>
							<div className="form-field full" style={{ marginBottom: 16 }}>
								<label className="form-label">File KTP Debitur <span className="req">*</span></label>
								{!docsOf(custKtpType).length && (
									<FileInput
										label="Upload File KTP"
										onFileChange={(f) => uploadDoc(f, custKtpType)}
										uploading={uploadingDocs.has(custKtpType)}
									/>
								)}
								<DocList docs={docsOf(custKtpType)} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
							</div>
							<OCRUploadSection
								apless={apless}
								precheckingId={precheckingId}
								ocrFor="customer"
								docType={custKtpType}
								title="Customer · WNI"
								nationality="WNI"
								maritalStatus={maritalOptions.find((o) => o.value === marital)?.label}
								initialData={custInitialData}
								expectedNik={data.customer.nik}
								onDataChange={handleCustomerData}
							/>
							<ErrorList errors={errors} prefix="customer" />
							<div style={{ marginBottom: 20 }} />
						</>
					)}

					{nationality === 'WNA' && (
						<>
							<div className="section-label"><span className="dot" />Customer WNA Information<hr /></div>
							<div className="epc-wna-card" style={{ marginBottom: 20 }}>
								<div className="epc-wna-head">
									<span className="epc-wna-title">🌐 Customer WNA · {custIdType}</span>
								</div>
								<div className="epc-wna-row">
									<FieldPair label={<>Nama <span className="req">*</span></>}>
										<input value={wnaName} onChange={(e) => setWnaName(e.target.value.toUpperCase())} className={`form-input${errors['customer.name'] ? ' err' : ''}`} style={{ textTransform: 'uppercase' }} />
										{fieldErr('customer.name')}
									</FieldPair>
									<FieldPair label={<>ID Type <span className="req">*</span></>}>
										{idTypeSelect(custIdType, setCustIdType, 'customer.idType')}
										{fieldErr('customer.idType')}
									</FieldPair>
								</div>
								<div className="epc-wna-row">
									<FieldPair label={<>ID Card No. <span className="req">*</span></>}>
										<input value={wnaIdCard} placeholder={`No. ${custIdType} / Passport`} onChange={(e) => setWnaIdCard(e.target.value)} className={`form-input${errors['customer.idCardNo'] ? ' err' : ''}`} />
										{fieldErr('customer.idCardNo')}
									</FieldPair>
									<FieldPair label="ID Card File">
										<FileInput label={`Upload ${custIdType} / Passport`} onFileChange={(f) => uploadDoc(f, custWnaDocType)} uploading={uploadingDocs.has(custWnaDocType)} />
										<DocList docs={docsOfAny([`${docPrefix}-kitas`, `${docPrefix}-kitap`])} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
										{fieldErr('customer.document')}
									</FieldPair>
								</div>
							</div>
						</>
					)}

					<div className="section-label"><span className="dot" />Marital Status<hr /></div>
					<div className="form-grid" style={{ marginBottom: 20 }}>
						<div className="form-field">
							<label className="form-label">Marital Status <span className="req">*</span></label>
							<div className="select-wrap">
								<select value={marital} onChange={(e) => setMarital(e.target.value)} className={`form-select${errors.marital_status ? ' err' : ''}`}>
									<option value="">— Select —</option>
									{maritalOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
							{fieldErr('marital_status')}
						</div>
						{isMarried && (
							<div className="form-field">
								<label className="form-label">Spouse Nationality <span className="req">*</span></label>
								<div className="select-wrap">
									<select value={spouseNat} onChange={(e) => setSpouseNat(e.target.value as Nat | '')} className={`form-select${errors['spouse.nationality'] ? ' err' : ''}`}>
										<option value="">— Select —</option>
										<option value="WNI">WNI</option>
										<option value="WNA">WNA</option>
									</select>
								</div>
								{fieldErr('spouse.nationality')}
							</div>
						)}
					</div>

					{showSpouseOCR && (
						<>
							<div className="section-label"><span className="dot" />{nationality === 'WNA' ? 'Spouse of WNA Customer (WNI KTP)' : 'Spouse KTP (OCR)'}<hr /></div>
							<div className="form-field full" style={{ marginBottom: 16 }}>
								<label className="form-label">File KTP Pasangan <span className="req">*</span></label>
								{!spouseKtpDocs.length && (
									<FileInput
										label="Upload File KTP Pasangan"
										onFileChange={(f) => uploadDoc(f, spouseKtpType)}
										uploading={uploadingDocs.has(spouseKtpType)}
									/>
								)}
								<DocList docs={spouseKtpDocs} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
								{carrySpouseDocs && (
									<p className="lookup-note ok" style={{ marginTop: 6 }}>
										File dari hasil pencarian NIK akan disalin ke prechecking ini saat Save.
									</p>
								)}
							</div>

							<div className="sub-section blue" style={{ marginBottom: 16 }}>
								<div className="sub-section-title">Cari Data Pasangan berdasarkan NIK</div>
								<div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
									<div className="form-field" style={{ flex: '1 1 280px' }}>
										<label className="form-label">NIK Pasangan · KTP</label>
										<input
											className="form-input"
											inputMode="numeric"
											maxLength={16}
											placeholder="16 digit NIK"
											value={spouseNikSearch}
											onChange={(e) => setSpouseNikSearch(e.target.value.replace(/\D/g, '').slice(0, 16))}
											onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSpouseNikLookup(); } }}
										/>
									</div>
									<button
										className="btn-primary"
										onClick={handleSpouseNikLookup}
										disabled={spouseLookupLoading || spouseNikSearch.length !== 16}
									>
										{spouseLookupLoading && <Spinner size={14} />}
										Cari Data
									</button>
								</div>

								{spouseSeed && (
									<div style={{ marginTop: 10 }}>
										<button type="button" className="btn-ghost" onClick={handleResetSpouse} disabled={saving || spouseLookupLoading}>
											Cancel Spouse Changes
										</button>
									</div>
								)}

								{spouseLookupMsg && <p className={`lookup-note ${spouseLookupMsg.tone}`}>{spouseLookupMsg.text}</p>}

								{spouseSeed && (
									<LookupResultPanel
										dukcapil={spouseSeed.verification ?? ver_UNCHECKED}
										sourcePrecheckingId={spouseSeedMeta?.precheckingId}
										lastOCROn={spouseSeedMeta?.lastOCROn}
										photo={spouseSeed.data.photo}
										documents={spouseLookupDocs}
										onPreview={handlePreview}
										onPreviewPhoto={(src) => setPreview({ open: true, name: 'Pas Foto KTP.jpg', previewUrl: src })}
										previewLoadingId={previewLoadingId}
									/>
								)}
							</div>

							<OCRUploadSection
								key={`spouse-ocr-${spouseSeedKey}`}
								apless={apless}
								precheckingId={precheckingId}
								ocrFor={nationality === 'WNA' ? 'wna_spouse' : 'spouse'}
								docType={spouseKtpType}
								title={nationality === 'WNA' ? 'Spouse of WNA · WNI KTP' : 'Spouse · WNI'}
								initialData={spouseSeed ?? spouseInitialData}
								expectedNik={spouseExpectedNik}
								onDataChange={handleSpouseData}
							/>
							<ErrorList errors={errors} prefix="spouse" />
							<div style={{ marginBottom: 20 }} />
						</>
					)}

					{showSpouseWna && (
						<>
							<div className="section-label"><span className="dot" />Spouse (WNA)<hr /></div>
							<div className="epc-wna-card" style={{ marginBottom: 20 }}>
								<div className="epc-wna-head">
									<span className="epc-wna-title">Spouse WNA · {wnaSpIdType}</span>
									<button type="button" className="btn-ghost" style={{ padding: '6px 14px', fontSize: '.78rem' }} onClick={handleResetSpouse} disabled={saving}>
										Cancel Spouse Changes
									</button>
								</div>
								<div className="epc-wna-row">
									<FieldPair label={<>Name <span className="req">*</span></>}>
										<input value={wnaSpName} onChange={(e) => setWnaSpName(e.target.value.toUpperCase())} className={`form-input${errors['spouse.name'] ? ' err' : ''}`} style={{ textTransform: 'uppercase' }} />
										{fieldErr('spouse.name')}
									</FieldPair>
									<FieldPair label={<>ID Type <span className="req">*</span></>}>
										{idTypeSelect(wnaSpIdType, setWnaSpIdType, 'spouse.idType')}
										{fieldErr('spouse.idType')}
									</FieldPair>
								</div>
								<div className="epc-wna-row">
									<FieldPair label={<>ID Card No. <span className="req">*</span></>}>
										<input value={wnaSpId} placeholder={`No. ${wnaSpIdType}`} onChange={(e) => setWnaSpId(e.target.value)} className={`form-input${errors['spouse.idCardNo'] ? ' err' : ''}`} />
										{fieldErr('spouse.idCardNo')}
									</FieldPair>
									<FieldPair label="ID Card File">
										<FileInput label={`Upload Spouse ${wnaSpIdType}`} onFileChange={(f) => uploadDoc(f, spouseWnaDocType)} uploading={uploadingDocs.has(spouseWnaDocType)} />
										<DocList docs={docsOfAny([`${docPrefix}-spouse-kitas`, `${docPrefix}-spouse-kitap`])} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
										{fieldErr('spouse.document')}
									</FieldPair>
								</div>
							</div>
						</>
					)}

					<div className="section-label"><span className="dot" />Supporting Documents<hr /></div>
					<div className="form-grid" style={{ marginBottom: 24 }}>
						{supportingDocs.map((doc) => (
							<div className="form-field" key={doc.type}>
								<label className="form-label">{doc.label}</label>
								<FileInput multiple label={`Upload ${doc.label}`} onFileChange={(f) => uploadDoc(f, doc.type)} uploading={uploadingDocs.has(doc.type)} />
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
							<textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value.toUpperCase())} className="form-textarea" placeholder="Optional notes…" style={{ textTransform: 'uppercase' }} />
						</div>
					</div>

					{data.sik.length > 0 && (
						<>
							<div className="section-label" style={{ marginTop: 24 }}><span className="dot" />Credit Bureau Checks<hr /></div>
							<div style={{ overflowX: 'auto', border: '1.5px solid var(--border)', borderRadius: 12 }}>
								<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
									<thead style={{ background: '#F8FAFF' }}>
										<tr>
											{['Subject', 'Bureau', 'Status', 'Score', 'Grade'].map((h) => (
												<th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 700 }}>{h}</th>
											))}
										</tr>
									</thead>
									<tbody>
										{data.sik.map((s, i) => (
											<tr key={`${s.subject}-${i}`} style={{ borderTop: '1px solid var(--border)' }}>
												<td style={{ padding: '8px 12px' }}>{s.subject}</td>
												<td style={{ padding: '8px 12px' }}>{s.creditBureau}</td>
												<td style={{ padding: '8px 12px' }}>{s.status}</td>
												<td style={{ padding: '8px 12px' }}>{s.score}</td>
												<td style={{ padding: '8px 12px' }}>{s.grade}</td>
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
						Save is locked until every KTP shown above has been checked with "Verify Dukcapil" and a result is displayed.
					</div>
				)}

				<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
					<button className="btn-ghost" onClick={handleCancel} disabled={saving}>Cancel</button>
					<button
						className="btn-primary"
						onClick={handleSubmit}
						disabled={saving || dukcapilPending}
						title={dukcapilPending ? 'Complete Dukcapil verification for all KTP sections first' : undefined}
					>
						{saving && <Spinner />}
						Save Changes
					</button>
				</div>
			</div>
		</div>
	);
};

export default EditPrecheckingIndividuPage;
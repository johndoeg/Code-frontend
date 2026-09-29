import React, { useState, useEffect, useMemo, useCallback } from "react";
import api from '@/shared/api/axiosInstance';
import OCRUploadSection, { type InitialOcrData } from '@/features/cam/contexts/OCRUploadSection';
import { MAX_FILE_LIMIT } from '@/shared/constants/DefaultValue';
import { useLocation } from "react-router-dom";
import {
	type CustomerData, type ConfidenceMap, type VerifiedMap, type DukcapilVerification,
	type MaritalOption, type UploadedDoc, type IdType, type OcrRecord, type PreviewState,
	ver_UNCHECKED, WNA_ID_TYPES, EMPTY_CUSTOMER, IMAGE_EXTS, PREVIEW_CLOSED,
	mapOcrToCustomer, matchToBit, useInjectStyles,
	Spinner, FileInput, DocList, LookupResultPanel, DocPreviewModal,
} from '@/features/cam/components/PrecheckingShared';

interface IncomingMeta {
	maritalStatus?: string;
	wnaMaritalStatus?: string;
	nationalityType?: string;
	idType?: string;
	spouseIdType?: string;
	isCarro?: boolean;
	notes?: string;
}

const OCR_DOC_TYPES = new Set(["cust-ktp", "cust-spouse-ktp", "cust-wna-spouse-ktp"]);

interface IncomingDocEntry {
	customerDocumentId: number;
	fileName: string;
	fileExt: string;
	awsKey: string;
	readonly?: boolean;
}

interface IncomingPrecheckState {
	idCard?: string;
	customerType?: string;
	customerName?: string;
	apless?: string;
	precheckingData?: {
		customer?: OcrRecord;
		spouse?: OcrRecord;
	};
	meta?: IncomingMeta;
	documents?: Record<string, IncomingDocEntry[]>;
	previousPrecheckingId?: string;
}

interface SeedDoc { id: number; name: string; key: string; }

const mapIncomingDocs = (list?: IncomingDocEntry[]): SeedDoc[] =>
	(list || []).map((d) => ({ id: d.customerDocumentId, name: d.fileName, key: d.awsKey }));

const PrecheckingIndividuPage: React.FC = () => {
	useInjectStyles();

	const location = useLocation();
	const incoming = location.state as IncomingPrecheckState | null;

	const custInitialData = useMemo<InitialOcrData>(() => ({
		data: mapOcrToCustomer(incoming?.precheckingData?.customer),
		conf: incoming?.precheckingData?.customer?.confidence,
		ver: incoming?.precheckingData?.customer?.verified,
		verification: incoming?.precheckingData?.customer?.dukcapil,
	}), [incoming]);

	const spouseInitialData = useMemo<InitialOcrData>(() => ({
		data: mapOcrToCustomer(incoming?.precheckingData?.spouse),
		conf: incoming?.precheckingData?.spouse?.confidence,
		ver: incoming?.precheckingData?.spouse?.verified,
		verification: incoming?.precheckingData?.spouse?.dukcapil,
	}), [incoming]);

	const custInitialDocs = useMemo(
		() => mapIncomingDocs(incoming?.documents?.["cust-ktp"]),
		[incoming],
	);
	const spouseInitialDocs = useMemo(
		() => mapIncomingDocs(incoming?.documents?.["cust-spouse-ktp"]),
		[incoming],
	);
	const wnaSpouseInitialDocs = useMemo(
		() => mapIncomingDocs(incoming?.documents?.["cust-wna-spouse-ktp"]),
		[incoming],
	);

	const [precheckingId, setPrecheckingId] = useState("");
	const [apless, setApless] = useState("");
	const [nationality, setNationality] = useState<"WNI" | "WNA">("WNI");
	const [marital, setMarital] = useState("");
	const [spouseNat, setSpouseNat] = useState<"WNI" | "WNA" | "">("");
	const [wnaMarital, setWnaMarital] = useState("");
	const [wnaSpouseNat, setWnaSpouseNat] = useState<"WNI" | "WNA" | "">("");
	const [isCarro, setIsCarro] = useState(true);
	const [notes, setNotes] = useState("");
	const [maritalOptions, setMaritalOptions] = useState<MaritalOption[]>([]);

	const [wnaIdType, setWnaIdType] = useState<IdType>("KITAS");
	const [wnaSpIdType, setWnaSpIdType] = useState<IdType>("KITAS");

	const [customer, setCustomer] = useState<CustomerData>(EMPTY_CUSTOMER());
	const [spouse, setSpouse] = useState<CustomerData>(EMPTY_CUSTOMER());
	const [wnaSpouse, setWnaSpouse] = useState<CustomerData>(EMPTY_CUSTOMER());
	const [wnaName, setWnaName] = useState("");
	const [wnaIdCard, setWnaIdCard] = useState("");
	const [wnaSpName, setWnaSpName] = useState("");
	const [wnaSpId, setWnaSpId] = useState("");

	const [custConf, setCustConf] = useState<ConfidenceMap>({});
	const [spouseConf, setSpouseConf] = useState<ConfidenceMap>({});
	const [wnaSpConf, setWnaSpConf] = useState<ConfidenceMap>({});

	const [custVer, setCustVer] = useState<VerifiedMap>({});
	const [spouseVer, setSpouseVer] = useState<VerifiedMap>({});
	const [wnaSpVer, setWnaSpVer] = useState<VerifiedMap>({});
	const [custDukcapil, setCustDukcapil] = useState<DukcapilVerification>(ver_UNCHECKED);
	const [spouseDukcapil, setSpouseDukcapil] = useState<DukcapilVerification>(ver_UNCHECKED);
	const [wnaSpDukcapil, setWnaSpDukcapil] = useState<DukcapilVerification>(ver_UNCHECKED);

	const [spouseNikSearch, setSpouseNikSearch] = useState("");
	const [spouseLookupLoading, setSpouseLookupLoading] = useState(false);
	const [spouseLookupMsg, setSpouseLookupMsg] = useState<{ tone: "ok" | "warn"; text: string } | null>(null);
	const [spouseSeed, setSpouseSeed] = useState<InitialOcrData | null>(null);
	const [spouseSeedKey, setSpouseSeedKey] = useState(0);
	const [spouseSeedMeta, setSpouseSeedMeta] = useState<{ precheckingId: string; lastOCROn: string } | null>(null);
	const [spouseLookupDocs, setSpouseLookupDocs] = useState<UploadedDoc[]>([]);

	const [docs, setDocs] = useState<UploadedDoc[]>([]);
	const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());
	const [deletingDocs, setDeletingDocs] = useState<Set<number>>(new Set());
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);
	const [previewLoadingId, setPreviewLoadingId] = useState<number | null>(null);

	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleCustomerData = useCallback(
		(data: CustomerData, conf: ConfidenceMap, verified: VerifiedMap, verification: DukcapilVerification) => {
			setCustomer(data);
			setCustConf(conf);
			setCustVer(verified);
			setCustDukcapil(verification);
		},
		[],
	);

	const handleSpouseData = useCallback(
		(data: CustomerData, conf: ConfidenceMap, verified: VerifiedMap, verification: DukcapilVerification) => {
			setSpouse(data);
			setSpouseConf(conf);
			setSpouseVer(verified);
			setSpouseDukcapil(verification);
		},
		[],
	);

	const handleWnaSpouseData = useCallback(
		(data: CustomerData, conf: ConfidenceMap, verified: VerifiedMap, verification: DukcapilVerification) => {
			setWnaSpouse(data);
			setWnaSpConf(conf);
			setWnaSpVer(verified);
			setWnaSpDukcapil(verification);
		},
		[],
	);

	const closePreview = useCallback(() => setPreview(PREVIEW_CLOSED), []);

	const _refreshDocs = useCallback(async (newPreviewUrl?: string, newDocName?: string) => {
		if (!apless || !precheckingId) return;
		try {
			const res = await api.get('/CAM/Prechecking/documents', {
				params: { apless, prechecking_id: precheckingId, previous_prechecking_id: incoming?.previousPrecheckingId || "" },
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
	}, [apless, precheckingId, incoming?.previousPrecheckingId]);

	useEffect(() => {
		const init = async () => {
			setLoading(true);
			try {
				const maritalPromise = api.get('/CAM/Prechecking/marital-statuses');
				const pidPromise = api.post('/CAM/Prechecking/generate-prechecking-id', {});

				const aplessPromise = incoming?.apless
					? Promise.resolve({ data: incoming.apless })
					: api.post('/CAM/Prechecking/generate-apless', { customer_type: "PR" });

				const [maritalR, pidR, aplessR] = await Promise.all([maritalPromise, pidPromise, aplessPromise]);

				setMaritalOptions(maritalR.data);
				setPrecheckingId(pidR.data);
				setApless(aplessR.data);

				if (incoming?.meta) {
					setMarital(incoming.meta.maritalStatus || "");
					setWnaMarital(incoming.meta.wnaMaritalStatus || "");
					setNationality((incoming.meta.nationalityType as "WNI" | "WNA") || "WNI");
					if (WNA_ID_TYPES.includes((incoming.meta.idType || "") as IdType)) {
						setWnaIdType(incoming.meta.idType as IdType);
					}
					if (WNA_ID_TYPES.includes((incoming.meta.spouseIdType || "") as IdType)) {
						setWnaSpIdType(incoming.meta.spouseIdType as IdType);
					}
					if (typeof incoming.meta.isCarro === "boolean") setIsCarro(incoming.meta.isCarro);
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
	}, [apless, precheckingId, _refreshDocs]);

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
			fd.append("cust_type", "PR");
			fd.append("organization_type", "PR");

			const res = await api.post('/CAM/Prechecking/upload-document', fd);

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

	const _nikForDocType = (docType: string): string => {
		if (docType === "cust-ktp") return customer.idCardNo;
		if (docType === "cust-spouse-ktp") return spouse.idCardNo;
		if (docType === "cust-wna-spouse-ktp") return wnaSpouse.idCardNo;

		return "";
	};

	const _clearDataForDocType = (docType: string) => {
		if (docType === "cust-ktp") {
			setCustomer(EMPTY_CUSTOMER());
			setCustConf({});
			setCustVer({});
			setCustDukcapil(ver_UNCHECKED);
		} else if (docType === "cust-spouse-ktp") {
			setSpouse(EMPTY_CUSTOMER());
			setSpouseConf({});
			setSpouseVer({});
			setSpouseDukcapil(ver_UNCHECKED);
			setSpouseSeed(null);
			setSpouseSeedMeta(null);
			setSpouseLookupDocs([]);
			setSpouseLookupMsg(null);
		} else if (docType === "cust-wna-spouse-ktp") {
			setWnaSpouse(EMPTY_CUSTOMER());
			setWnaSpConf({});
			setWnaSpVer({});
			setWnaSpDukcapil(ver_UNCHECKED);
		}
	};

	const handleSpouseNikLookup = async () => {
		const nik = spouseNikSearch.replace(/\D/g, "");

		if (nik.length !== 16) {
			setSpouseLookupMsg({ tone: "warn", text: "NIK harus 16 digit." });
			return;
		}
		if (nik === customer.idCardNo) {
			setSpouseLookupMsg({ tone: "warn", text: "NIK pasangan tidak boleh sama dengan NIK debitur." });
			return;
		}

		setSpouseLookupLoading(true);
		setSpouseLookupMsg(null);
		try {
			const res = await api.post('/CAM/lookup-ocr-by-nik', {
				nik,
				exclude_prechecking_id: precheckingId,
			});

			if (!res.data?.found) {
				setSpouseSeed(null);
				setSpouseSeedMeta(null);
				setSpouseLookupDocs([]);
				setSpouseLookupMsg({
					tone: "warn",
					text: res.data?.message ?? "Data tidak ditemukan. Silakan upload KTP pasangan untuk OCR.",
				});
				return;
			}

			const rec = res.data.ocr as OcrRecord;
			const data = mapOcrToCustomer(rec);

			setSpouse(data);
			setSpouseConf(rec.confidence ?? {});
			setSpouseVer(rec.verified ?? {});
			setSpouseDukcapil(rec.dukcapil ?? ver_UNCHECKED);
			setSpouseSeed({
				data,
				conf: rec.confidence,
				ver: rec.verified,
				verification: rec.dukcapil,
			});
			setSpouseSeedMeta({
				precheckingId: res.data.sourcePrecheckingId || "",
				lastOCROn: res.data.lastOCROn || "",
			});
			setSpouseLookupDocs(
				((res.data.documents ?? []) as UploadedDoc[]).map((d) => ({ ...d, readonly: true })),
			);
			setSpouseSeedKey((k) => k + 1);
			setSpouseLookupMsg({
				tone: "ok",
				text: "Data pasangan ditemukan. Periksa kembali sebelum submit.",
			});
		} catch (e: any) {
			setSpouseLookupMsg({
				tone: "warn",
				text: e.response?.data?.message ?? "Gagal mencari data pasangan.",
			});
		} finally {
			setSpouseLookupLoading(false);
		}
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

			const res = await api.post('/CAM/Prechecking/delete-document', {
				customer_document_id: docId,
				prechecking_id: precheckingId,
				nik,
			});

			if (!res.data?.success) {
				alert(res.data?.message ?? "Hapus dokumen gagal. Silakan coba lagi.");
				return;
			}

			if (doc && OCR_DOC_TYPES.has(doc.type)) {
				_clearDataForDocType(doc.type);
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
			const res = await api.get('/CAM/Prechecking/view-document', {
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

	const handleCancel = async () => {
		try { await api.post('/CAM/Prechecking/cancel', { prechecking_id: precheckingId }); }
		finally { window.location.reload(); }
	};

	const isMarried = ["M", "O"].includes(marital);
	const showSpouseNat = nationality === "WNI" && isMarried;
	const showSpouseOCR = showSpouseNat && spouseNat === "WNI";
	const showWnaSpInfo = showSpouseNat && spouseNat === "WNA";
	const showWnaSection = nationality === "WNA";
	const isWnaMarried = ["M", "O"].includes(wnaMarital);
	const showWnaSpNat = showWnaSection && isWnaMarried;
	const showWnaSpOCR = showWnaSpNat && wnaSpouseNat === "WNI";
	const showWnaSpWna = showWnaSpNat && wnaSpouseNat === "WNA";

	const custIdType: IdType = nationality === "WNI" ? "KTP" : wnaIdType;
	const spouseIdType: IdType | "" =
		showSpouseOCR || showWnaSpOCR ? "KTP"
			: (showWnaSpInfo || showWnaSpWna) ? wnaSpIdType
				: "";

	const wnaDocType = wnaIdType === "KITAP" ? "cust-kitap" : "cust-kitas";
	const wnaSpDocType = wnaSpIdType === "KITAP" ? "cust-spouse-kitap" : "cust-spouse-kitas";

	const custDukcapilRequired = nationality === "WNI";
	const spouseDukcapilRequired = showSpouseOCR;
	const wnaSpDukcapilRequired = showWnaSpOCR;

	const dukcapilPending =
		(custDukcapilRequired && !custDukcapil.checked) ||
		(spouseDukcapilRequired && !spouseDukcapil.checked) ||
		(wnaSpDukcapilRequired && !wnaSpDukcapil.checked);

	const spouseExpectedNik =
		spouseSeed?.data.idCardNo
		|| (spouseNikSearch.length === 16 ? spouseNikSearch : "")
		|| spouseInitialData.data.idCardNo
		|| undefined;

	const handleSubmit = async () => {
		const e: Record<string, string> = {};

		if (nationality === "WNI") {
			if (!customer.idCardNo) e.cust_idCardNo = "NIK is required";
			if (!customer.name) e.cust_name = "Nama is required";
			if (!customer.placeOfBirth) e.cust_pob = "Tempat Lahir is required";
			if (!customer.dateOfBirth) e.cust_dob = "Tanggal Lahir is required";
			if (!customer.gender) e.cust_gender = "Jenis Kelamin is required";
			if (!customer.address) e.cust_address = "Alamat is required";
			if (!customer.rt) e.cust_rt = "RT/RW is required";
			if (!customer.subdistrict) e.cust_subdistrict = "Kelurahan/Desa is required";
			if (!customer.district) e.cust_district = "Kecamatan is required";
			if (!customer.city) e.cust_city = "Kota/Kabupaten is required";
			if (!customer.province) e.cust_province = "Provinsi is required";
			if (!customer.religion) e.cust_religion = "Agama is required";
			if (!customer.job) e.cust_job = "Pekerjaan is required";
			if (!marital) e.marital = "Marital Status is required";
		} else {
			if (!wnaName) e.wna_name = "Nama is required";
			if (!wnaIdCard) e.wna_idcard = "ID Card No. is required";
			if (!wnaIdType) e.wna_id_type = "ID Type is required";
			if (!wnaMarital) e.wna_marital = "Marital Status is required";
		}

		if (showSpouseNat) {
			if (!spouseNat) {
				e.spouse_nat = "Spouse Nationality is required";
			} else if (spouseNat === "WNI") {
				if (!spouse.idCardNo) e.spouse_idCardNo = "Spouse NIK is required";
				if (!spouse.name) e.spouse_name = "Spouse Nama is required";
				if (!spouse.placeOfBirth) e.spouse_pob = "Spouse Tempat Lahir is required";
				if (!spouse.dateOfBirth) e.spouse_dob = "Spouse Tanggal Lahir is required";
				if (!spouse.gender) e.spouse_gender = "Spouse Jenis Kelamin is required";
				if (!spouse.address) e.spouse_address = "Spouse Alamat is required";
			} else if (spouseNat === "WNA") {
				if (!wnaSpName) e.wna_spouse_name = "Spouse Name is required";
				if (!wnaSpId) e.wna_spouse_idcard = "Spouse ID Card No. is required";
				if (!wnaSpIdType) e.wna_spouse_id_type = "Spouse ID Type is required";
			}
		}

		if (showWnaSpNat) {
			if (!wnaSpouseNat) {
				e.wna_spouse_nat = "Spouse Nationality is required";
			} else if (wnaSpouseNat === "WNI") {
				if (!wnaSpouse.idCardNo) e.wna_spouse_ktp_idCardNo = "Spouse NIK is required";
				if (!wnaSpouse.name) e.wna_spouse_ktp_name = "Spouse Nama is required";
			} else if (wnaSpouseNat === "WNA") {
				if (!wnaSpName) e.wna_spouse_name = "Spouse Name is required";
				if (!wnaSpId) e.wna_spouse_idcard = "Spouse ID Card No. is required";
				if (!wnaSpIdType) e.wna_spouse_id_type = "Spouse ID Type is required";
			}
		}

		if (custDukcapilRequired && !custDukcapil.checked) {
			e.cust_dukcapil = "Please verify the Customer's KTP data with Dukcapil before submitting";
		}
		if (spouseDukcapilRequired && !spouseDukcapil.checked) {
			e.spouse_dukcapil = "Please verify the Spouse's KTP data with Dukcapil before submitting";
		}
		if (wnaSpDukcapilRequired && !wnaSpDukcapil.checked) {
			e.wna_spouse_dukcapil = "Please verify the WNA's Spouse KTP data with Dukcapil before submitting";
		}

		setErrors(e);
		if (Object.keys(e).length) {
			const dukcapilMsgs = [e.cust_dukcapil, e.spouse_dukcapil, e.wna_spouse_dukcapil].filter(Boolean) as string[];
			if (dukcapilMsgs.length) {
				alert(dukcapilMsgs.join("\n"));
			}
			return;
		}

		setLoading(true);
		try {
			const carriedMap = new Map<number, { customer_document_id: number; document_type: string }>();
			docs.filter((d) => d.readonly).forEach((d) => {
				carriedMap.set(d.id, { customer_document_id: d.id, document_type: d.type });
			});
			if (showSpouseOCR) {
				spouseLookupDocs.forEach((d) => {
					carriedMap.set(d.id, { customer_document_id: d.id, document_type: "cust-spouse-ktp" });
				});
			}
			const uploadedTypes = new Set(docs.filter((d) => !d.readonly).map((d) => d.type));
			const carriedDocuments = Array.from(carriedMap.values())
				.filter((d) => !uploadedTypes.has(d.document_type));

			const payload = {
				prechecking_id: precheckingId, apless, cust_type: "PR", lessee_type: "PR",
				carried_documents: carriedDocuments,
				check_for: "C", cust_new_ro: "New", cust_nationality_type: nationality,
				marital_status: marital, wna_marital_status: wnaMarital,
				is_carro_type: isCarro ? 1 : 0, note_prechecking_pr: notes,

				cust_id_type: custIdType,
				cust_spouse_id_type: spouseIdType,
				cust_spouse_nationality_type: spouseNat,
				wna_spouse_nationality_type: wnaSpouseNat,

				cust_id_card_no: customer.idCardNo, cust_name: customer.name,
				cust_pob: customer.placeOfBirth, cust_dob: customer.dateOfBirth,
				cust_gender: customer.gender, cust_blood_type: customer.bloodType,
				cust_address: customer.address, cust_rt: customer.rt, cust_rw: customer.rw,
				cust_subdistrict: customer.subdistrict, cust_district: customer.district,
				cust_city: customer.city, cust_province: customer.province,
				cust_religion: customer.religion, cust_job: customer.job,
				cust_citizen: customer.citizen, cust_photo_hidden: customer.photo,
				cust_signature_hidden: customer.signature,

				val_cust_id_card_no: custConf.idCardNo ?? "", val_cust_name: custConf.name ?? "",
				val_cust_pob: custConf.placeOfBirth ?? "", val_cust_dob: custConf.dateOfBirth ?? "",
				val_cust_gender: custConf.gender ?? "", val_cust_blood_type: custConf.bloodType ?? "",
				val_cust_address: custConf.address ?? "", val_cust_rt: custConf.rt ?? "",
				val_cust_rw: custConf.rw ?? "",
				val_cust_subdistrict: custConf.subdistrict ?? "", val_cust_district: custConf.district ?? "",
				val_cust_city: custConf.city ?? "", val_cust_province: custConf.province ?? "",
				val_cust_religion: custConf.religion ?? "", val_cust_job: custConf.job ?? "",

				cust_ver_verified: custDukcapil.checked ? 1 : 0,
				cust_ver_status: custDukcapil.status === null ? "" : (custDukcapil.status ? 1 : 0),
				cust_ver_reason: custDukcapil.reason ?? "",
				ver_cust_id_card_no: matchToBit(custVer.idCardNo), ver_cust_name: matchToBit(custVer.name),
				ver_cust_pob: matchToBit(custVer.placeOfBirth), ver_cust_dob: matchToBit(custVer.dateOfBirth),
				ver_cust_gender: matchToBit(custVer.gender), ver_cust_address: matchToBit(custVer.address),
				ver_cust_rt: matchToBit(custVer.rt), ver_cust_rw: matchToBit(custVer.rw),
				ver_cust_subdistrict: matchToBit(custVer.subdistrict), ver_cust_district: matchToBit(custVer.district),
				ver_cust_city: matchToBit(custVer.city), ver_cust_province: matchToBit(custVer.province),
				ver_cust_job: matchToBit(custVer.job),

				cust_spouse_id_card_no: spouse.idCardNo, cust_spouse_name: spouse.name,
				cust_spouse_pob: spouse.placeOfBirth, cust_spouse_dob: spouse.dateOfBirth,
				cust_spouse_gender: spouse.gender, cust_spouse_blood_type: spouse.bloodType,
				cust_spouse_address: spouse.address, cust_spouse_rt: spouse.rt,
				cust_spouse_rw: spouse.rw, cust_spouse_subdistrict: spouse.subdistrict,
				cust_spouse_district: spouse.district, cust_spouse_city: spouse.city,
				cust_spouse_province: spouse.province, cust_spouse_religion: spouse.religion,
				cust_spouse_job: spouse.job, cust_spouse_citizen: spouse.citizen,
				cust_spouse_photo_hidden: spouse.photo, cust_spouse_signature_hidden: spouse.signature,

				val_cust_spouse_id_card_no: spouseConf.idCardNo ?? "", val_cust_spouse_name: spouseConf.name ?? "",
				val_cust_spouse_pob: spouseConf.placeOfBirth ?? "", val_cust_spouse_dob: spouseConf.dateOfBirth ?? "",
				val_cust_spouse_gender: spouseConf.gender ?? "", val_cust_spouse_address: spouseConf.address ?? "",
				val_cust_spouse_rt: spouseConf.rt ?? "", val_cust_spouse_rw: spouseConf.rw ?? "",
				val_cust_spouse_subdistrict: spouseConf.subdistrict ?? "",
				val_cust_spouse_district: spouseConf.district ?? "", val_cust_spouse_city: spouseConf.city ?? "",
				val_cust_spouse_province: spouseConf.province ?? "", val_cust_spouse_job: spouseConf.job ?? "",

				cust_spouse_ver_verified: spouseDukcapil.checked ? 1 : 0,
				cust_spouse_ver_status: spouseDukcapil.status === null ? "" : (spouseDukcapil.status ? 1 : 0),
				cust_spouse_ver_reason: spouseDukcapil.reason ?? "",
				ver_cust_spouse_id_card_no: matchToBit(spouseVer.idCardNo), ver_cust_spouse_name: matchToBit(spouseVer.name),
				ver_cust_spouse_pob: matchToBit(spouseVer.placeOfBirth), ver_cust_spouse_dob: matchToBit(spouseVer.dateOfBirth),
				ver_cust_spouse_gender: matchToBit(spouseVer.gender), ver_cust_spouse_address: matchToBit(spouseVer.address),
				ver_cust_spouse_rt: matchToBit(spouseVer.rt), ver_cust_spouse_rw: matchToBit(spouseVer.rw),
				ver_cust_spouse_subdistrict: matchToBit(spouseVer.subdistrict), ver_cust_spouse_district: matchToBit(spouseVer.district),
				ver_cust_spouse_city: matchToBit(spouseVer.city), ver_cust_spouse_province: matchToBit(spouseVer.province),
				ver_cust_spouse_job: matchToBit(spouseVer.job),

				wna_name: wnaName, wna_idcard_no: wnaIdCard,
				wna_spouse_name: wnaSpName, wna_spouse_idcard_no: wnaSpId,

				cust_wna_spouse_id_card_no: wnaSpouse.idCardNo, cust_wna_spouse_name: wnaSpouse.name,
				cust_wna_spouse_pob: wnaSpouse.placeOfBirth, cust_wna_spouse_dob: wnaSpouse.dateOfBirth,
				cust_wna_spouse_gender: wnaSpouse.gender, cust_wna_spouse_blood_type: wnaSpouse.bloodType,
				cust_wna_spouse_address: wnaSpouse.address, cust_wna_spouse_rt: wnaSpouse.rt,
				cust_wna_spouse_rw: wnaSpouse.rw, cust_wna_spouse_subdistrict: wnaSpouse.subdistrict,
				cust_wna_spouse_district: wnaSpouse.district, cust_wna_spouse_city: wnaSpouse.city,
				cust_wna_spouse_province: wnaSpouse.province, cust_wna_spouse_religion: wnaSpouse.religion,
				cust_wna_spouse_job: wnaSpouse.job, cust_wna_spouse_citizen: wnaSpouse.citizen,
				cust_wna_spouse_photo_hidden: wnaSpouse.photo, cust_wna_spouse_signature_hidden: wnaSpouse.signature,

				val_cust_wna_spouse_id_card_no: wnaSpConf.idCardNo ?? "", val_cust_wna_spouse_name: wnaSpConf.name ?? "",
				val_cust_wna_spouse_pob: wnaSpConf.placeOfBirth ?? "", val_cust_wna_spouse_dob: wnaSpConf.dateOfBirth ?? "",
				val_cust_wna_spouse_gender: wnaSpConf.gender ?? "", val_cust_wna_spouse_address: wnaSpConf.address ?? "",
				val_cust_wna_spouse_rt: wnaSpConf.rt ?? "", val_cust_wna_spouse_rw: wnaSpConf.rw ?? "",
				val_cust_wna_spouse_subdistrict: wnaSpConf.subdistrict ?? "",
				val_cust_wna_spouse_district: wnaSpConf.district ?? "", val_cust_wna_spouse_city: wnaSpConf.city ?? "",
				val_cust_wna_spouse_province: wnaSpConf.province ?? "", val_cust_wna_spouse_job: wnaSpConf.job ?? "",

				cust_wna_spouse_ver_verified: wnaSpDukcapil.checked ? 1 : 0,
				cust_wna_spouse_ver_status: wnaSpDukcapil.status === null ? "" : (wnaSpDukcapil.status ? 1 : 0),
				cust_wna_spouse_ver_reason: wnaSpDukcapil.reason ?? "",
				ver_cust_wna_spouse_id_card_no: matchToBit(wnaSpVer.idCardNo), ver_cust_wna_spouse_name: matchToBit(wnaSpVer.name),
				ver_cust_wna_spouse_pob: matchToBit(wnaSpVer.placeOfBirth), ver_cust_wna_spouse_dob: matchToBit(wnaSpVer.dateOfBirth),
				ver_cust_wna_spouse_gender: matchToBit(wnaSpVer.gender), ver_cust_wna_spouse_address: matchToBit(wnaSpVer.address),
				ver_cust_wna_spouse_rt: matchToBit(wnaSpVer.rt), ver_cust_wna_spouse_rw: matchToBit(wnaSpVer.rw),
				ver_cust_wna_spouse_subdistrict: matchToBit(wnaSpVer.subdistrict), ver_cust_wna_spouse_district: matchToBit(wnaSpVer.district),
				ver_cust_wna_spouse_city: matchToBit(wnaSpVer.city), ver_cust_wna_spouse_province: matchToBit(wnaSpVer.province),
				ver_cust_wna_spouse_job: matchToBit(wnaSpVer.job),
			};

			const res = await api.post('/CAM/Prechecking/submit', payload);
			if (res.data?.success) {
				const failedDocs: string[] = res.data?.documents_failed ?? [];
				const missingDocs: string[] = res.data?.documents_missing ?? [];
				const warnings: string[] = [];
				if (failedDocs.length) warnings.push(`Dokumen gagal disalin: ${failedDocs.join(", ")}.`);
				if (missingDocs.length) warnings.push(`File belum tersimpan: ${missingDocs.join(", ")}.`);
				alert(
					warnings.length
						? `Prechecking submitted.\n${warnings.join("\n")}\nSilakan upload ulang file tersebut.`
						: "Prechecking submitted successfully!",
				);
				window.location.reload();
			} else {
				alert(res.data?.message ?? "Submission failed");
			}
		} catch (err: any) { alert(err.response?.data?.message ?? "Submission failed"); }
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

			<DocPreviewModal state={preview} onClose={closePreview} />

			<div className="page-wrap">
				<div className="hdr">
					<div>
						<div className="hdr-title">Add Prechecking Data</div>
						<div className="hdr-sub">Individual Customer · KYC Verification</div>
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
								<div className="select-wrap"><select disabled value="PR" className="form-select is-disabled"><option value="PR">Individu</option></select></div>
							</div>
						</div>
						<div className="form-grid" style={{ marginBottom: 14 }}>
							<div className="form-field">
								<label className="form-label">New / Repeat Order</label>
								<div className="select-wrap"><select disabled value="New" className="form-select is-disabled"><option value="New">New</option></select></div>
							</div>
							<div className="form-field">
								<label className="form-label">Temp. Customer No.</label>
								<input readOnly value={apless} className="form-input is-readonly" />
							</div>
						</div>
						<div className="form-grid">
							<div className="form-field">
								<label className="form-label">Nationality <span className="req">*</span></label>
								<div className="select-wrap">
									<select value={nationality} onChange={(e) => setNationality(e.target.value as "WNI" | "WNA")} className={`form-select${nationality ? " nat-active" : ""}`}>
										<option value="WNI">🇮🇩 WNI</option>
										<option value="WNA">🌐 WNA</option>
									</select>
								</div>
							</div>
							<div className="form-field">
								<label className="form-label">ID Type <span className="req">*</span></label>
								{nationality === "WNI" ? (
									<input readOnly value="KTP" className="form-input is-readonly" />
								) : (
									<div className="select-wrap">
										<select
											value={wnaIdType}
											onChange={(e) => setWnaIdType(e.target.value as IdType)}
											className={`form-select${errors.wna_id_type ? " err" : ""}`}
										>
											{WNA_ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
										</select>
									</div>
								)}
								{errors.wna_id_type && <p className="field-err">{errors.wna_id_type}</p>}
							</div>
						</div>
					</div>

					{nationality === "WNI" && (
						<>
							<div className="section-label"><span className="dot" />Customer KTP (OCR)<hr /></div>
							<OCRUploadSection
								apless={apless}
								precheckingId={precheckingId}
								ocrFor="customer"
								docType="cust-ktp"
								title="Customer · WNI"
								nationality="WNI"
								maritalStatus={maritalOptions.find((o) => o.value === marital)?.label}
								initialData={custInitialData}
								expectedNik={incoming?.idCard}
								previousPrecheckingId={incoming?.previousPrecheckingId}
								initialDocs={custInitialDocs}
								onDataChange={handleCustomerData}
							/>
							<div className="form-field full" style={{ marginTop: 12, marginBottom: 20 }}>
								<label className="form-label">File KTP Debitur</label>
								{!docsOf("cust-ktp").length && (
									<FileInput
										label="Upload File KTP"
										onFileChange={(f) => _uploadDoc(f, "cust-ktp")}
										uploading={uploadingDocs.has("cust-ktp")}
									/>
								)}
								<DocList docs={docsOf("cust-ktp")} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
							</div>
						</>
					)}

					{showWnaSection && (
						<>
							<div className="section-label"><span className="dot" />Customer WNA Information<hr /></div>
							<div className="sub-section blue" style={{ marginBottom: 20 }}>
								<div className="sub-section-title">🌐 Customer WNA · {wnaIdType}</div>
								<div className="form-grid">
									<div className="form-field">
										<label className="form-label">Nama <span className="req">*</span></label>
										<input value={wnaName} onChange={(e) => setWnaName(e.target.value.toUpperCase())} className={`form-input${errors.wna_name ? " err" : ""}`} style={{ textTransform: "uppercase" }} />
										{errors.wna_name && <p className="field-err">{errors.wna_name}</p>}
									</div>
									<div className="form-field">
										<label className="form-label">ID Type <span className="req">*</span></label>
										<div className="select-wrap">
											<select
												value={wnaIdType}
												onChange={(e) => setWnaIdType(e.target.value as IdType)}
												className={`form-select${errors.wna_id_type ? " err" : ""}`}
											>
												{WNA_ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
											</select>
										</div>
										{errors.wna_id_type && <p className="field-err">{errors.wna_id_type}</p>}
									</div>
									<div className="form-field">
										<label className="form-label">ID Card No. ({wnaIdType}) <span className="req">*</span></label>
										<input value={wnaIdCard} onChange={(e) => setWnaIdCard(e.target.value)} className={`form-input${errors.wna_idcard ? " err" : ""}`} />
										{errors.wna_idcard && <p className="field-err">{errors.wna_idcard}</p>}
									</div>
									<div className="form-field full">
										<label className="form-label">ID Card ({wnaIdType} / Passport)</label>
										<FileInput label={`Upload ${wnaIdType} / Passport`} onFileChange={(f) => _uploadDoc(f, wnaDocType)} uploading={uploadingDocs.has(wnaDocType)} />
										<DocList docs={docsOfAny(["cust-kitas", "cust-kitap"])} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
									</div>
								</div>
							</div>
						</>
					)}

					{nationality === "WNI" && (
						<>
							<div className="section-label"><span className="dot" />Marital Status<hr /></div>
							<div className="form-grid" style={{ marginBottom: 20 }}>
								<div className="form-field">
									<label className="form-label">Marital Status <span className="req">*</span></label>
									<div className="select-wrap">
										<select value={marital} onChange={(e) => setMarital(e.target.value)} className={`form-select${errors.marital ? " err" : ""}`}>
											<option value="">— Select —</option>
											{maritalOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									</div>
									{errors.marital && <p className="field-err">{errors.marital}</p>}
								</div>
								{showSpouseNat && (
									<div className="form-field">
										<label className="form-label">Spouse Nationality <span className="req">*</span></label>
										<div className="select-wrap">
											<select value={spouseNat} onChange={(e) => setSpouseNat(e.target.value as any)} className={`form-select${errors.spouse_nat ? " err" : ""}`}>
												<option value="">— Select —</option>
												<option value="WNI">WNI</option>
												<option value="WNA">WNA</option>
											</select>
										</div>
										{errors.spouse_nat && <p className="field-err">{errors.spouse_nat}</p>}
									</div>
								)}
							</div>
						</>
					)}

					{showWnaSection && (
						<>
							<div className="section-label"><span className="dot" />Marital Status (WNA)<hr /></div>
							<div className="form-grid" style={{ marginBottom: 20 }}>
								<div className="form-field">
									<label className="form-label">Marital Status <span className="req">*</span></label>
									<div className="select-wrap">
										<select value={wnaMarital} onChange={(e) => setWnaMarital(e.target.value)} className={`form-select${errors.wna_marital ? " err" : ""}`}>
											<option value="">— Select —</option>
											{maritalOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
									</div>
									{errors.wna_marital && <p className="field-err">{errors.wna_marital}</p>}
								</div>
								{showWnaSpNat && (
									<div className="form-field">
										<label className="form-label">Spouse Nationality <span className="req">*</span></label>
										<div className="select-wrap">
											<select value={wnaSpouseNat} onChange={(e) => setWnaSpouseNat(e.target.value as any)} className={`form-select${errors.wna_spouse_nat ? " err" : ""}`}>
												<option value="">— Select —</option>
												<option value="WNI">WNI</option>
												<option value="WNA">WNA</option>
											</select>
										</div>
										{errors.wna_spouse_nat && <p className="field-err">{errors.wna_spouse_nat}</p>}
									</div>
								)}
							</div>
						</>
					)}

					{showSpouseOCR && (
						<>
							<div className="section-label"><span className="dot" />Spouse KTP (OCR)<hr /></div>

							<div className="sub-section blue" style={{ marginBottom: 16 }}>
								<div className="sub-section-title">Cari Data Pasangan berdasarkan NIK</div>
								<div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
									<div className="form-field" style={{ flex: "1 1 280px" }}>
										<label className="form-label">NIK Pasangan · KTP</label>
										<input
											className="form-input"
											inputMode="numeric"
											maxLength={16}
											placeholder="16 digit NIK"
											value={spouseNikSearch}
											onChange={(e) => setSpouseNikSearch(e.target.value.replace(/\D/g, "").slice(0, 16))}
											onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSpouseNikLookup(); } }}
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

								{spouseLookupMsg && (
									<p className={`lookup-note ${spouseLookupMsg.tone}`}>{spouseLookupMsg.text}</p>
								)}

								{spouseSeed && (
									<LookupResultPanel
										dukcapil={spouseSeed.verification ?? ver_UNCHECKED}
										sourcePrecheckingId={spouseSeedMeta?.precheckingId}
										lastOCROn={spouseSeedMeta?.lastOCROn}
										photo={spouseSeed.data.photo}
										documents={spouseLookupDocs}
										onPreview={handlePreview}
										onPreviewPhoto={(src) => setPreview({ open: true, name: "Pas Foto KTP.jpg", previewUrl: src })}
										previewLoadingId={previewLoadingId}
									/>
								)}
							</div>

							<OCRUploadSection
								key={`spouse-ocr-${spouseSeedKey}`}
								apless={apless}
								precheckingId={precheckingId}
								ocrFor="spouse"
								docType="cust-spouse-ktp"
								title="Spouse · WNI"
								initialData={spouseSeed ?? spouseInitialData}
								expectedNik={spouseExpectedNik}
								previousPrecheckingId={incoming?.previousPrecheckingId}
								initialDocs={spouseInitialDocs}
								onDataChange={handleSpouseData}
							/>
							<div className="form-field full" style={{ marginTop: 12, marginBottom: 20 }}>
								<label className="form-label">File KTP Pasangan</label>
								{!docsOf("cust-spouse-ktp").length && (
									<FileInput
										label="Upload File KTP Pasangan"
										onFileChange={(f) => _uploadDoc(f, "cust-spouse-ktp")}
										uploading={uploadingDocs.has("cust-spouse-ktp")}
									/>
								)}
								<DocList docs={docsOf("cust-spouse-ktp")} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
							</div>
						</>
					)}

					{showWnaSpInfo && (
						<>
							<div className="section-label"><span className="dot" />Spouse (WNA)<hr /></div>
							<div className="sub-section orange" style={{ marginBottom: 20 }}>
								<div className="sub-section-title">Spouse — Foreign National · {wnaSpIdType}</div>
								<div className="form-grid">
									<div className="form-field">
										<label className="form-label">Spouse Name <span className="req">*</span></label>
										<input value={wnaSpName} onChange={(e) => setWnaSpName(e.target.value.toUpperCase())} className={`form-input${errors.wna_spouse_name ? " err" : ""}`} style={{ textTransform: "uppercase" }} />
										{errors.wna_spouse_name && <p className="field-err">{errors.wna_spouse_name}</p>}
									</div>
									<div className="form-field">
										<label className="form-label">Spouse ID Type <span className="req">*</span></label>
										<div className="select-wrap">
											<select
												value={wnaSpIdType}
												onChange={(e) => setWnaSpIdType(e.target.value as IdType)}
												className={`form-select${errors.wna_spouse_id_type ? " err" : ""}`}
											>
												{WNA_ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
											</select>
										</div>
										{errors.wna_spouse_id_type && <p className="field-err">{errors.wna_spouse_id_type}</p>}
									</div>
									<div className="form-field">
										<label className="form-label">Spouse ID Card No. ({wnaSpIdType}) <span className="req">*</span></label>
										<input value={wnaSpId} onChange={(e) => setWnaSpId(e.target.value)} className={`form-input${errors.wna_spouse_idcard ? " err" : ""}`} />
										{errors.wna_spouse_idcard && <p className="field-err">{errors.wna_spouse_idcard}</p>}
									</div>
									<div className="form-field full">
										<label className="form-label">Spouse ID Card ({wnaSpIdType})</label>
										<FileInput label={`Upload Spouse ${wnaSpIdType}`} onFileChange={(f) => _uploadDoc(f, wnaSpDocType)} uploading={uploadingDocs.has(wnaSpDocType)} />
										<DocList docs={docsOfAny(["cust-spouse-kitas", "cust-spouse-kitap"])} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
									</div>
								</div>
							</div>
						</>
					)}

					{showWnaSpOCR && (
						<>
							<div className="section-label"><span className="dot" />Spouse of WNA Customer (WNI KTP)<hr /></div>
							<OCRUploadSection
								apless={apless}
								precheckingId={precheckingId}
								ocrFor="wna_spouse"
								docType="cust-wna-spouse-ktp"
								title="Spouse of WNA · WNI KTP"
								previousPrecheckingId={incoming?.previousPrecheckingId}
								initialDocs={wnaSpouseInitialDocs}
								onDataChange={handleWnaSpouseData}
							/>
							<div className="form-field full" style={{ marginTop: 12, marginBottom: 20 }}>
								<label className="form-label">File KTP Pasangan (WNI)</label>
								{!docsOf("cust-wna-spouse-ktp").length && (
									<FileInput
										label="Upload File KTP Pasangan"
										onFileChange={(f) => _uploadDoc(f, "cust-wna-spouse-ktp")}
										uploading={uploadingDocs.has("cust-wna-spouse-ktp")}
									/>
								)}
								<DocList docs={docsOf("cust-wna-spouse-ktp")} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
							</div>
						</>
					)}

					{showWnaSpWna && (
						<>
							<div className="section-label"><span className="dot" />Spouse of WNA (Foreign ID)<hr /></div>
							<div className="sub-section purple" style={{ marginBottom: 20 }}>
								<div className="sub-section-title">Spouse — Foreign National · {wnaSpIdType}</div>
								<div className="form-grid">
									<div className="form-field">
										<label className="form-label">Spouse Name <span className="req">*</span></label>
										<input value={wnaSpName} onChange={(e) => setWnaSpName(e.target.value.toUpperCase())} className={`form-input${errors.wna_spouse_name ? " err" : ""}`} style={{ textTransform: "uppercase" }} />
										{errors.wna_spouse_name && <p className="field-err">{errors.wna_spouse_name}</p>}
									</div>
									<div className="form-field">
										<label className="form-label">Spouse ID Type <span className="req">*</span></label>
										<div className="select-wrap">
											<select
												value={wnaSpIdType}
												onChange={(e) => setWnaSpIdType(e.target.value as IdType)}
												className={`form-select${errors.wna_spouse_id_type ? " err" : ""}`}
											>
												{WNA_ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
											</select>
										</div>
										{errors.wna_spouse_id_type && <p className="field-err">{errors.wna_spouse_id_type}</p>}
									</div>
									<div className="form-field">
										<label className="form-label">Spouse ID Card No. ({wnaSpIdType}) <span className="req">*</span></label>
										<input value={wnaSpId} onChange={(e) => setWnaSpId(e.target.value)} className={`form-input${errors.wna_spouse_idcard ? " err" : ""}`} />
										{errors.wna_spouse_idcard && <p className="field-err">{errors.wna_spouse_idcard}</p>}
									</div>
									<div className="form-field full">
										<label className="form-label">Spouse {wnaSpIdType}</label>
										<FileInput label={`Upload Spouse ${wnaSpIdType}`} onFileChange={(f) => _uploadDoc(f, wnaSpDocType)} uploading={uploadingDocs.has(wnaSpDocType)} />
										<DocList docs={docsOfAny(["cust-spouse-kitas", "cust-spouse-kitap"])} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
									</div>
								</div>
							</div>
						</>
					)}

					<div className="section-label"><span className="dot" />Supporting Documents<hr /></div>
					<div className="form-grid" style={{ marginBottom: 24 }}>
						{[
							{ label: "KK (Kartu Keluarga)", type: "cust-kk" },
							{ label: "NPWP", type: "cust-npwp" },
							{ label: "Akta Cerai / Akta Kematian", type: "cust-marriage-or-death-statement" },
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

				{dukcapilPending && (
					<div className="dukcapil-gate pending">
						<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 004.02 21h15.96a2 2 0 001.91-2.96L13.71 3.86a2 2 0 00-3.42 0z" />
						</svg>
						Submit is locked until every KTP shown above has been checked with "Verify Dukcapil" and a result is displayed.
					</div>
				)}

				<div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 4 }}>
					<button className="btn-ghost" onClick={handleCancel} disabled={loading}>Cancel</button>
					<button className="btn-primary" onClick={handleSubmit} disabled={loading || dukcapilPending} title={dukcapilPending ? "Complete Dukcapil verification for all KTP sections first" : undefined}>
						{loading && <Spinner />}
						Submit Prechecking
					</button>
				</div>

			</div>
		</div>
	);
};

export default PrecheckingIndividuPage;
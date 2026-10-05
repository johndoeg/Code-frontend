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

const OCR_DOC_TYPES = new Set(["guarantor-ktp", "guarantor-spouse-ktp", "guarantor-wna-spouse-ktp"]);

const NOTES_MAX_LENGTH = 1000;

interface IncomingDocEntry {
	customerDocumentId: number;
	fileName: string;
	fileExt: string;
	awsKey: string;
	readonly?: boolean;
}

export interface IncomingGuarantorPrecheckState {
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

interface PrecheckingGuarantorIndividuPageProps {
	incomingState?: IncomingGuarantorPrecheckState | null;
	onBack?: () => void;
}

const PrecheckingGuarantorIndividuPage: React.FC<PrecheckingGuarantorIndividuPageProps> = ({ incomingState, onBack }) => {
	useInjectStyles();

	const location = useLocation();
	const incoming = incomingState ?? (location.state as IncomingGuarantorPrecheckState | null);

	const guarantorInitialData = useMemo<InitialOcrData>(() => ({
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

	const guarantorInitialDocs = useMemo(
		() => mapIncomingDocs(incoming?.documents?.["guarantor-ktp"]),
		[incoming],
	);
	const spouseInitialDocs = useMemo(
		() => mapIncomingDocs(incoming?.documents?.["guarantor-spouse-ktp"]),
		[incoming],
	);
	const wnaSpouseInitialDocs = useMemo(
		() => mapIncomingDocs(incoming?.documents?.["guarantor-wna-spouse-ktp"]),
		[incoming],
	);

	const isRepeatOrder = !!incoming?.customerName?.trim();

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

	const [guarantor, setGuarantor] = useState<CustomerData>(EMPTY_CUSTOMER());
	const [spouse, setSpouse] = useState<CustomerData>(EMPTY_CUSTOMER());
	const [wnaSpouse, setWnaSpouse] = useState<CustomerData>(EMPTY_CUSTOMER());
	const [wnaName, setWnaName] = useState("");
	const [wnaIdCard, setWnaIdCard] = useState("");
	const [wnaSpName, setWnaSpName] = useState("");
	const [wnaSpId, setWnaSpId] = useState("");

	const [guarantorConf, setGuarantorConf] = useState<ConfidenceMap>({});
	const [spouseConf, setSpouseConf] = useState<ConfidenceMap>({});
	const [wnaSpConf, setWnaSpConf] = useState<ConfidenceMap>({});

	const [guarantorVer, setGuarantorVer] = useState<VerifiedMap>({});
	const [spouseVer, setSpouseVer] = useState<VerifiedMap>({});
	const [wnaSpVer, setWnaSpVer] = useState<VerifiedMap>({});
	const [guarantorDukcapil, setGuarantorDukcapil] = useState<DukcapilVerification>(ver_UNCHECKED);
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

	const handleGuarantorData = useCallback(
		(data: CustomerData, conf: ConfidenceMap, verified: VerifiedMap, verification: DukcapilVerification) => {
			setGuarantor(data);
			setGuarantorConf(conf);
			setGuarantorVer(verified);
			setGuarantorDukcapil(verification);
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
			const res = await api.get('/CAM/Prechecking/documents-guarantor', {
				params: { apless, prechecking_id: precheckingId, previous_prechecking_id: incoming?.previousPrecheckingId || "" },
			});
			const fetched: UploadedDoc[] = res.data ?? [];
			setDocs((prev) => {
				const previewMap = new Map(prev.map((d) => [d.id, d.previewUrl]));
				const readonlyIds = new Set(prev.filter((d) => d.readonly).map((d) => d.id));
				return fetched.map((d: any) => ({
					...d,
					readonly: readonlyIds.has(d.id) || (d.prechecking_id != null && d.prechecking_id !== precheckingId),
					previewUrl:
						(newDocName && d.name === newDocName)
							? newPreviewUrl
							: previewMap.get(d.id),
				}));
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
					: api.post('/CAM/Prechecking/generate-apless', { customer_type: "G" });

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
			fd.append("organization_type", "GUARNPR");

			const res = await api.post('/CAM/Prechecking/upload-document-guarantor', fd);

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
		if (docType === "guarantor-ktp") return guarantor.idCardNo;
		if (docType === "guarantor-spouse-ktp") return spouse.idCardNo;
		if (docType === "guarantor-wna-spouse-ktp") return wnaSpouse.idCardNo;

		return "";
	};

	const _clearDataForDocType = (docType: string) => {
		if (docType === "guarantor-ktp") {
			setGuarantor(EMPTY_CUSTOMER());
			setGuarantorConf({});
			setGuarantorVer({});
			setGuarantorDukcapil(ver_UNCHECKED);
		} else if (docType === "guarantor-spouse-ktp") {
			setSpouse(EMPTY_CUSTOMER());
			setSpouseConf({});
			setSpouseVer({});
			setSpouseDukcapil(ver_UNCHECKED);
			setSpouseSeed(null);
			setSpouseSeedMeta(null);
			setSpouseLookupDocs([]);
			setSpouseLookupMsg(null);
		} else if (docType === "guarantor-wna-spouse-ktp") {
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
		if (nik === guarantor.idCardNo) {
			setSpouseLookupMsg({ tone: "warn", text: "NIK pasangan tidak boleh sama dengan NIK penjamin." });
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

	const resetSpouseLookup = () => {
		const removeIds = new Set(spouseLookupDocs.map((d) => d.id));
		if (removeIds.size) {
			setDocs((prev) => prev.filter((d) => !(d.readonly && removeIds.has(d.id))));
		}
		setSpouse(EMPTY_CUSTOMER());
		setSpouseConf({});
		setSpouseVer({});
		setSpouseDukcapil(ver_UNCHECKED);
		setSpouseSeed(null);
		setSpouseSeedMeta(null);
		setSpouseLookupDocs([]);
		setSpouseLookupMsg(null);
		setSpouseNikSearch("");
		setSpouseSeedKey((k) => k + 1);
		setErrors((prev) =>
			Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith("spouse_")))
		);
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

			const res = await api.post('/CAM/Prechecking/delete-document-guarantor', {
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
			const res = await api.get('/CAM/Prechecking/view-document-guarantor', {
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
		try { await api.post('/CAM/Prechecking/cancel-guarantor', { prechecking_id: precheckingId }); }
		finally { onBack ? onBack() : window.history.back(); }
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

	const guarantorIdType: IdType = nationality === "WNI" ? "KTP" : wnaIdType;
	const spouseIdType: IdType | "" =
		showSpouseOCR || showWnaSpOCR ? "KTP"
			: (showWnaSpInfo || showWnaSpWna) ? wnaSpIdType
				: "";

	const wnaDocType = wnaIdType === "KITAP" ? "guarantor-kitap" : "guarantor-kitas";
	const wnaSpDocType = wnaSpIdType === "KITAP" ? "guarantor-spouse-kitap" : "guarantor-spouse-kitas";

	const guarantorDukcapilRequired = nationality === "WNI";
	const spouseDukcapilRequired = showSpouseOCR;
	const wnaSpDukcapilRequired = showWnaSpOCR;

	const dukcapilPending =
		(guarantorDukcapilRequired && !guarantorDukcapil.checked) ||
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
			if (!guarantor.idCardNo) e.guarantor_idCardNo = "NIK is required";
			if (!guarantor.name) e.guarantor_name = "Nama is required";
			if (!guarantor.placeOfBirth) e.guarantor_pob = "Tempat Lahir is required";
			if (!guarantor.dateOfBirth) e.guarantor_dob = "Tanggal Lahir is required";
			if (!guarantor.gender) e.guarantor_gender = "Jenis Kelamin is required";
			if (!guarantor.address) e.guarantor_address = "Alamat is required";
			if (!guarantor.rt) e.guarantor_rt = "RT/RW is required";
			if (!guarantor.subdistrict) e.guarantor_subdistrict = "Kelurahan/Desa is required";
			if (!guarantor.district) e.guarantor_district = "Kecamatan is required";
			if (!guarantor.city) e.guarantor_city = "Kota/Kabupaten is required";
			if (!guarantor.province) e.guarantor_province = "Provinsi is required";
			if (!guarantor.religion) e.guarantor_religion = "Agama is required";
			if (!guarantor.job) e.guarantor_job = "Pekerjaan is required";
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

		if (guarantorDukcapilRequired && !guarantorDukcapil.checked) {
			e.guarantor_dukcapil = "Please verify the Guarantor's KTP data with Dukcapil before submitting";
		}
		if (spouseDukcapilRequired && !spouseDukcapil.checked) {
			e.spouse_dukcapil = "Please verify the Spouse's KTP data with Dukcapil before submitting";
		}
		if (wnaSpDukcapilRequired && !wnaSpDukcapil.checked) {
			e.wna_spouse_dukcapil = "Please verify the WNA's Spouse KTP data with Dukcapil before submitting";
		}

		if (notes.length > NOTES_MAX_LENGTH) {
			e.notes = `Note for Prechecking must be ${NOTES_MAX_LENGTH} characters or fewer`;
		}

		setErrors(e);
		if (Object.keys(e).length) {
			const summary = Object.values(e).filter(Boolean);
			alert(
				summary.length > 1
					? `Please complete all required fields:\n\n• ${summary.join("\n• ")}`
					: summary[0] ?? "Please complete all required fields.",
			);
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
					carriedMap.set(d.id, { customer_document_id: d.id, document_type: "guarantor-spouse-ktp" });
				});
			}
			const uploadedTypes = new Set(docs.filter((d) => !d.readonly).map((d) => d.type));
			const carriedDocuments = Array.from(carriedMap.values())
				.filter((d) => !uploadedTypes.has(d.document_type));

			const payload = {
				prechecking_id: precheckingId, apless, cust_type: "PR", lessee_type: "PR",
				carried_documents: carriedDocuments,
				check_for: "G", cust_new_ro: isRepeatOrder ? "Repeat Order" : "New", guarantor_nationality_type: nationality,
				marital_status: marital, wna_marital_status: wnaMarital,
				is_carro_type: isCarro ? 1 : 0, note_prechecking_pr: notes,

				guarantor_id_type: guarantorIdType,
				guarantor_spouse_id_type: spouseIdType,
				guarantor_spouse_nationality_type: spouseNat,
				wna_spouse_nationality_type: wnaSpouseNat,

				guarantor_id_card_no: guarantor.idCardNo, guarantor_name: guarantor.name,
				guarantor_pob: guarantor.placeOfBirth, guarantor_dob: guarantor.dateOfBirth,
				guarantor_gender: guarantor.gender, guarantor_blood_type: guarantor.bloodType,
				guarantor_address: guarantor.address, guarantor_rt: guarantor.rt, guarantor_rw: guarantor.rw,
				guarantor_subdistrict: guarantor.subdistrict, guarantor_district: guarantor.district,
				guarantor_city: guarantor.city, guarantor_province: guarantor.province,
				guarantor_religion: guarantor.religion, guarantor_job: guarantor.job,
				guarantor_citizen: guarantor.citizen, guarantor_photo_hidden: guarantor.photo,
				guarantor_signature_hidden: guarantor.signature,

				val_guarantor_id_card_no: guarantorConf.idCardNo ?? "", val_guarantor_name: guarantorConf.name ?? "",
				val_guarantor_pob: guarantorConf.placeOfBirth ?? "", val_guarantor_dob: guarantorConf.dateOfBirth ?? "",
				val_guarantor_gender: guarantorConf.gender ?? "", val_guarantor_blood_type: guarantorConf.bloodType ?? "",
				val_guarantor_address: guarantorConf.address ?? "", val_guarantor_rt: guarantorConf.rt ?? "",
				val_guarantor_rw: guarantorConf.rw ?? "",
				val_guarantor_subdistrict: guarantorConf.subdistrict ?? "", val_guarantor_district: guarantorConf.district ?? "",
				val_guarantor_city: guarantorConf.city ?? "", val_guarantor_province: guarantorConf.province ?? "",
				val_guarantor_religion: guarantorConf.religion ?? "", val_guarantor_job: guarantorConf.job ?? "",

				guarantor_ver_verified: guarantorDukcapil.checked ? 1 : 0,
				guarantor_ver_status: guarantorDukcapil.status === null ? "" : (guarantorDukcapil.status ? 1 : 0),
				guarantor_ver_reason: guarantorDukcapil.reason ?? "",
				ver_guarantor_id_card_no: matchToBit(guarantorVer.idCardNo), ver_guarantor_name: matchToBit(guarantorVer.name),
				ver_guarantor_pob: matchToBit(guarantorVer.placeOfBirth), ver_guarantor_dob: matchToBit(guarantorVer.dateOfBirth),
				ver_guarantor_gender: matchToBit(guarantorVer.gender), ver_guarantor_address: matchToBit(guarantorVer.address),
				ver_guarantor_rt: matchToBit(guarantorVer.rt), ver_guarantor_rw: matchToBit(guarantorVer.rw),
				ver_guarantor_subdistrict: matchToBit(guarantorVer.subdistrict), ver_guarantor_district: matchToBit(guarantorVer.district),
				ver_guarantor_city: matchToBit(guarantorVer.city), ver_guarantor_province: matchToBit(guarantorVer.province),
				ver_guarantor_job: matchToBit(guarantorVer.job),

				guarantor_spouse_id_card_no: spouse.idCardNo, guarantor_spouse_name: spouse.name,
				guarantor_spouse_pob: spouse.placeOfBirth, guarantor_spouse_dob: spouse.dateOfBirth,
				guarantor_spouse_gender: spouse.gender, guarantor_spouse_blood_type: spouse.bloodType,
				guarantor_spouse_address: spouse.address, guarantor_spouse_rt: spouse.rt,
				guarantor_spouse_rw: spouse.rw, guarantor_spouse_subdistrict: spouse.subdistrict,
				guarantor_spouse_district: spouse.district, guarantor_spouse_city: spouse.city,
				guarantor_spouse_province: spouse.province, guarantor_spouse_religion: spouse.religion,
				guarantor_spouse_job: spouse.job, guarantor_spouse_citizen: spouse.citizen,
				guarantor_spouse_photo_hidden: spouse.photo, guarantor_spouse_signature_hidden: spouse.signature,

				val_guarantor_spouse_id_card_no: spouseConf.idCardNo ?? "", val_guarantor_spouse_name: spouseConf.name ?? "",
				val_guarantor_spouse_pob: spouseConf.placeOfBirth ?? "", val_guarantor_spouse_dob: spouseConf.dateOfBirth ?? "",
				val_guarantor_spouse_gender: spouseConf.gender ?? "", val_guarantor_spouse_address: spouseConf.address ?? "",
				val_guarantor_spouse_rt: spouseConf.rt ?? "", val_guarantor_spouse_rw: spouseConf.rw ?? "",
				val_guarantor_spouse_subdistrict: spouseConf.subdistrict ?? "",
				val_guarantor_spouse_district: spouseConf.district ?? "", val_guarantor_spouse_city: spouseConf.city ?? "",
				val_guarantor_spouse_province: spouseConf.province ?? "", val_guarantor_spouse_job: spouseConf.job ?? "",

				guarantor_spouse_ver_verified: spouseDukcapil.checked ? 1 : 0,
				guarantor_spouse_ver_status: spouseDukcapil.status === null ? "" : (spouseDukcapil.status ? 1 : 0),
				guarantor_spouse_ver_reason: spouseDukcapil.reason ?? "",
				ver_guarantor_spouse_id_card_no: matchToBit(spouseVer.idCardNo), ver_guarantor_spouse_name: matchToBit(spouseVer.name),
				ver_guarantor_spouse_pob: matchToBit(spouseVer.placeOfBirth), ver_guarantor_spouse_dob: matchToBit(spouseVer.dateOfBirth),
				ver_guarantor_spouse_gender: matchToBit(spouseVer.gender), ver_guarantor_spouse_address: matchToBit(spouseVer.address),
				ver_guarantor_spouse_rt: matchToBit(spouseVer.rt), ver_guarantor_spouse_rw: matchToBit(spouseVer.rw),
				ver_guarantor_spouse_subdistrict: matchToBit(spouseVer.subdistrict), ver_guarantor_spouse_district: matchToBit(spouseVer.district),
				ver_guarantor_spouse_city: matchToBit(spouseVer.city), ver_guarantor_spouse_province: matchToBit(spouseVer.province),
				ver_guarantor_spouse_job: matchToBit(spouseVer.job),

				guarantor_wna_name: wnaName, guarantor_wna_idcard_no: wnaIdCard,
				guarantor_spouse_wna_name: wnaSpName, guarantor_spouse_wna_id_card_no: wnaSpId,

				guarantor_wna_spouse_id_card_no: wnaSpouse.idCardNo, guarantor_wna_spouse_name: wnaSpouse.name,
				guarantor_wna_spouse_pob: wnaSpouse.placeOfBirth, guarantor_wna_spouse_dob: wnaSpouse.dateOfBirth,
				guarantor_wna_spouse_gender: wnaSpouse.gender, guarantor_wna_spouse_blood_type: wnaSpouse.bloodType,
				guarantor_wna_spouse_address: wnaSpouse.address, guarantor_wna_spouse_rt: wnaSpouse.rt,
				guarantor_wna_spouse_rw: wnaSpouse.rw, guarantor_wna_spouse_subdistrict: wnaSpouse.subdistrict,
				guarantor_wna_spouse_district: wnaSpouse.district, guarantor_wna_spouse_city: wnaSpouse.city,
				guarantor_wna_spouse_province: wnaSpouse.province, guarantor_wna_spouse_religion: wnaSpouse.religion,
				guarantor_wna_spouse_job: wnaSpouse.job, guarantor_wna_spouse_citizen: wnaSpouse.citizen,
				guarantor_wna_spouse_photo_hidden: wnaSpouse.photo, guarantor_wna_spouse_signature_hidden: wnaSpouse.signature,

				val_guarantor_wna_spouse_id_card_no: wnaSpConf.idCardNo ?? "", val_guarantor_wna_spouse_name: wnaSpConf.name ?? "",
				val_guarantor_wna_spouse_pob: wnaSpConf.placeOfBirth ?? "", val_guarantor_wna_spouse_dob: wnaSpConf.dateOfBirth ?? "",
				val_guarantor_wna_spouse_gender: wnaSpConf.gender ?? "", val_guarantor_wna_spouse_address: wnaSpConf.address ?? "",
				val_guarantor_wna_spouse_rt: wnaSpConf.rt ?? "", val_guarantor_wna_spouse_rw: wnaSpConf.rw ?? "",
				val_guarantor_wna_spouse_subdistrict: wnaSpConf.subdistrict ?? "",
				val_guarantor_wna_spouse_district: wnaSpConf.district ?? "", val_guarantor_wna_spouse_city: wnaSpConf.city ?? "",
				val_guarantor_wna_spouse_province: wnaSpConf.province ?? "", val_guarantor_wna_spouse_job: wnaSpConf.job ?? "",

				guarantor_wna_spouse_ver_verified: wnaSpDukcapil.checked ? 1 : 0,
				guarantor_wna_spouse_ver_status: wnaSpDukcapil.status === null ? "" : (wnaSpDukcapil.status ? 1 : 0),
				guarantor_wna_spouse_ver_reason: wnaSpDukcapil.reason ?? "",
				ver_guarantor_wna_spouse_id_card_no: matchToBit(wnaSpVer.idCardNo), ver_guarantor_wna_spouse_name: matchToBit(wnaSpVer.name),
				ver_guarantor_wna_spouse_pob: matchToBit(wnaSpVer.placeOfBirth), ver_guarantor_wna_spouse_dob: matchToBit(wnaSpVer.dateOfBirth),
				ver_guarantor_wna_spouse_gender: matchToBit(wnaSpVer.gender), ver_guarantor_wna_spouse_address: matchToBit(wnaSpVer.address),
				ver_guarantor_wna_spouse_rt: matchToBit(wnaSpVer.rt), ver_guarantor_wna_spouse_rw: matchToBit(wnaSpVer.rw),
				ver_guarantor_wna_spouse_subdistrict: matchToBit(wnaSpVer.subdistrict), ver_guarantor_wna_spouse_district: matchToBit(wnaSpVer.district),
				ver_guarantor_wna_spouse_city: matchToBit(wnaSpVer.city), ver_guarantor_wna_spouse_province: matchToBit(wnaSpVer.province),
				ver_guarantor_wna_spouse_job: matchToBit(wnaSpVer.job),
			};

			const res = await api.post('/CAM/Prechecking/submit-guarantor', payload);
			if (res.data?.success) {
				const failedDocs: string[] = res.data?.documents_failed ?? [];
				const missingDocs: string[] = res.data?.documents_missing ?? [];
				const warnings: string[] = [];
				if (failedDocs.length) warnings.push(`Dokumen gagal disalin: ${failedDocs.join(", ")}.`);
				if (missingDocs.length) warnings.push(`File belum tersimpan: ${missingDocs.join(", ")}.`);
				const carryDebug: string[] = res.data?.carry_debug ?? [];
				const debugBlock = carryDebug.length
					? `\n\n--- carry_debug ---\n${carryDebug.join("\n")}`
					: "\n\n--- carry_debug: (field absent — backend not deployed/restarted) ---";
				alert(
					warnings.length
						? `Guarantor prechecking submitted.\n${warnings.join("\n")}\nSilakan upload ulang file tersebut.${debugBlock}`
						: "Guarantor prechecking submitted successfully!",
				);
				if (onBack) onBack(); else window.history.back();
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
					<div style={{ flex: 1, minWidth: 0 }}>
						<div className="hdr-title">Add Guarantor Data</div>
						<div className="hdr-sub">Individual Guarantor · KYC Verification</div>
					</div>
					<div className="hdr-badge">
						<span className="hdr-badge-label">Prechecking ID</span>
						<span className="hdr-badge-value">{precheckingId || "—"}</span>
					</div>
					<button
						type="button"
						onClick={handleCancel}
						disabled={loading}
						aria-label="Back"
						style={{
							display: "inline-flex", alignItems: "center", gap: 7,
							padding: "9px 16px 9px 12px",
							borderRadius: 999,
							border: "1px solid rgba(15, 29, 60, .1)",
							background: "linear-gradient(180deg, #ffffff, #F6F9FE)",
							color: "#0F1D3C",
							fontSize: ".82rem",
							fontWeight: 600,
							fontFamily: "inherit",
							letterSpacing: ".01em",
							cursor: loading ? "not-allowed" : "pointer",
							marginLeft: 12,
							flexShrink: 0,
							opacity: loading ? 0.55 : 1,
							boxShadow: "0 1px 2px rgba(15, 29, 60, .04), 0 1px 1px rgba(15, 29, 60, .02)",
							transition: "transform .18s cubic-bezier(.4,0,.2,1), box-shadow .18s cubic-bezier(.4,0,.2,1), border-color .18s, background .18s",
						}}
						onMouseEnter={(e) => {
							if (loading) return;
							e.currentTarget.style.background = "linear-gradient(180deg, #F6F9FE, #EBF1FB)";
							e.currentTarget.style.borderColor = "rgba(15, 29, 60, .18)";
							e.currentTarget.style.boxShadow = "0 4px 12px rgba(15, 29, 60, .09), 0 1px 2px rgba(15, 29, 60, .04)";
							const arrow = e.currentTarget.querySelector<SVGElement>("svg");
							if (arrow) arrow.style.transform = "translateX(-2px)";
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.background = "linear-gradient(180deg, #ffffff, #F6F9FE)";
							e.currentTarget.style.borderColor = "rgba(15, 29, 60, .1)";
							e.currentTarget.style.boxShadow = "0 1px 2px rgba(15, 29, 60, .04), 0 1px 1px rgba(15, 29, 60, .02)";
							const arrow = e.currentTarget.querySelector<SVGElement>("svg");
							if (arrow) arrow.style.transform = "translateX(0)";
						}}
						onMouseDown={(e) => {
							if (loading) return;
							e.currentTarget.style.transform = "scale(.97)";
						}}
						onMouseUp={(e) => {
							e.currentTarget.style.transform = "scale(1)";
						}}
					>
						<svg
							width="15" height="15"
							viewBox="0 0 24 24" fill="none"
							stroke="currentColor" strokeWidth="2.2"
							strokeLinecap="round" strokeLinejoin="round"
							style={{ transition: "transform .18s cubic-bezier(.4,0,.2,1)" }}
							aria-hidden="true"
						>
							<path d="M19 12H5" />
							<path d="M12 19l-7-7 7-7" />
						</svg>
						<span>Back</span>
					</button>
				</div>

				<div className="card">
					<div className="section-label"><span className="dot" />General Information<hr /></div>
					<div style={{ marginBottom: 24 }}>
						<div className="form-grid" style={{ marginBottom: 14 }}>
							<div className="form-field">
								<label className="form-label">Checking For <span className="req">*</span></label>
								<div className="select-wrap"><select disabled value="G" className="form-select is-disabled"><option value="G">Guarantor</option></select></div>
							</div>
							<div className="form-field">
								<label className="form-label">Type <span className="req">*</span></label>
								<div className="select-wrap"><select disabled value="PR" className="form-select is-disabled"><option value="PR">Individu</option></select></div>
							</div>
						</div>
						<div className="form-grid" style={{ marginBottom: 14 }}>
							<div className="form-field">
								<label className="form-label">New / Repeat Order</label>
								<div className="select-wrap">
									<select disabled value={isRepeatOrder ? "Repeat Order" : "New"} className="form-select is-disabled">
										<option value={isRepeatOrder ? "Repeat Order" : "New"}>{isRepeatOrder ? "Repeat Order" : "New"}</option>
									</select>
								</div>
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
							<div className="section-label"><span className="dot" />Guarantor KTP (OCR)<hr /></div>
							<OCRUploadSection
								apless={apless}
								precheckingId={precheckingId}
								ocrFor="guarantor"
								docType="guarantor-ktp"
								title="Guarantor · WNI"
								nationality="WNI"
								maritalStatus={maritalOptions.find((o) => o.value === marital)?.label}
								initialData={guarantorInitialData}
								expectedNik={incoming?.idCard}
								previousPrecheckingId={incoming?.previousPrecheckingId}
								initialDocs={guarantorInitialDocs}
								onDataChange={handleGuarantorData}
								onUpload={_refreshDocs}
							/>
						</>
					)}

					{showWnaSection && (
						<>
							<div className="section-label"><span className="dot" />Guarantor WNA Information<hr /></div>
							<div className="sub-section blue" style={{ marginBottom: 20 }}>
								<div className="sub-section-title">🌐 Guarantor WNA · {wnaIdType}</div>
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
										<DocList docs={docsOfAny(["guarantor-kitas", "guarantor-kitap"])} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
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
										<div style={{ position: "relative" }}>
											<input
												className="form-input"
												inputMode="numeric"
												maxLength={16}
												placeholder="16 digit NIK"
												value={spouseNikSearch}
												onChange={(e) => setSpouseNikSearch(e.target.value.replace(/\D/g, "").slice(0, 16))}
												onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSpouseNikLookup(); } }}
												style={{ paddingRight: (spouseNikSearch || spouseSeed) ? 34 : undefined }}
											/>
											{(spouseNikSearch || spouseSeed) && (
												<button
													type="button"
													aria-label="Hapus & reset data pasangan"
													title="Hapus & reset data pasangan"
													onClick={resetSpouseLookup}
													style={{
														position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
														width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer",
														background: "#e2e8f0", color: "#475569", fontSize: 14, lineHeight: "22px",
														display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
													}}
												>×</button>
											)}
										</div>
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
										onCancel={resetSpouseLookup}
									/>
								)}
							</div>

							<OCRUploadSection
								key={`spouse-ocr-${spouseSeedKey}`}
								apless={apless}
								precheckingId={precheckingId}
								ocrFor="guarantor_spouse"
								docType="guarantor-spouse-ktp"
								title="Spouse · WNI"
								initialData={spouseSeed ?? spouseInitialData}
								expectedNik={spouseExpectedNik}
								previousPrecheckingId={incoming?.previousPrecheckingId}
								initialDocs={spouseInitialDocs}
								onDataChange={handleSpouseData}
								onUpload={_refreshDocs}
							/>
							<div className="form-field full" style={{ marginTop: 12, marginBottom: 20 }}>
								<label className="form-label">File KTP Pasangan</label>
								{!docsOf("guarantor-spouse-ktp").length && (
									<FileInput
										label="Upload File KTP Pasangan"
										onFileChange={(f) => _uploadDoc(f, "guarantor-spouse-ktp")}
										uploading={uploadingDocs.has("guarantor-spouse-ktp")}
									/>
								)}
								<DocList docs={docsOf("guarantor-spouse-ktp")} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
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
										<DocList docs={docsOfAny(["guarantor-spouse-kitas", "guarantor-spouse-kitap"])} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
									</div>
								</div>
							</div>
						</>
					)}

					{showWnaSpOCR && (
						<>
							<div className="section-label"><span className="dot" />Spouse of WNA Guarantor (WNI KTP)<hr /></div>
							<OCRUploadSection
								apless={apless}
								precheckingId={precheckingId}
								ocrFor="guarantor_wna_spouse"
								docType="guarantor-wna-spouse-ktp"
								title="Spouse of WNA · WNI KTP"
								previousPrecheckingId={incoming?.previousPrecheckingId}
								initialDocs={wnaSpouseInitialDocs}
								onDataChange={handleWnaSpouseData}
								onUpload={_refreshDocs}
							/>
							<div className="form-field full" style={{ marginTop: 12, marginBottom: 20 }}>
								<label className="form-label">File KTP Pasangan (WNI)</label>
								{!docsOf("guarantor-wna-spouse-ktp").length && (
									<FileInput
										label="Upload File KTP Pasangan"
										onFileChange={(f) => _uploadDoc(f, "guarantor-wna-spouse-ktp")}
										uploading={uploadingDocs.has("guarantor-wna-spouse-ktp")}
									/>
								)}
								<DocList docs={docsOf("guarantor-wna-spouse-ktp")} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
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
										<DocList docs={docsOfAny(["guarantor-spouse-kitas", "guarantor-spouse-kitap"])} onDelete={handleDeleteDoc} deletingDocs={deletingDocs} onPreview={handlePreview} previewLoadingId={previewLoadingId} />
									</div>
								</div>
							</div>
						</>
					)}

					<div className="section-label"><span className="dot" />Supporting Documents<hr /></div>
					<div className="form-grid" style={{ marginBottom: 24 }}>
						{[
							{ label: "KK (Kartu Keluarga)", type: "guarantor-kk" },
							{ label: "NPWP", type: "guarantor-npwp" },
							{ label: "Akta Cerai / Akta Kematian", type: "guarantor-marriage-or-death-statement" },
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
							<textarea
								rows={4}
								value={notes}
								onChange={(e) => setNotes(e.target.value.toUpperCase().slice(0, NOTES_MAX_LENGTH))}
								maxLength={NOTES_MAX_LENGTH}
								className={`form-textarea${errors.notes ? " err" : ""}`}
								placeholder=""
								style={{ textTransform: "uppercase" }}
							/>
							<div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
								{errors.notes ? <p className="field-err" style={{ margin: 0 }}>{errors.notes}</p> : <span />}
								<span style={{ fontSize: 12, color: "#888" }}>{notes.length}/{NOTES_MAX_LENGTH}</span>
							</div>
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
						Submit Guarantor Prechecking
					</button>
				</div>

			</div>
		</div>
	);
};

export default PrecheckingGuarantorIndividuPage;
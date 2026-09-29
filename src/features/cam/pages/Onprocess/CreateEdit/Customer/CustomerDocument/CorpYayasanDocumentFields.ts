import type { CorpDocumentSection, CorpDocumentFieldConfig } from "./Types";

export const YAYASAN_DOCUMENT_SECTIONS: CorpDocumentSection[] = [
	{
		fields: [
			{ fieldKey: "corp_ktp_pengawas", documentType: "corp-ktp-pengawas", prefix: "-CORP_KTP_PENGAWAS-", label: "KTP an. Pengawas", subfolder: "DATA_DIRI/KTP_PENGAWAS", maxFileSizeMb: 2 },
			{ fieldKey: "corp_nib", documentType: "corp-nib", prefix: "-CORP_NIB-", label: "NIB", subfolder: "DATA_DIRI/NIB", maxFileSizeMb: 2 },
		],
	},
	{
		title: "Dokumen BPKB",
		fields: [
			{ fieldKey: "corp_ktp_bpkb", documentType: "corp-ktp-bpkb", prefix: "-CORP_KTP_BPKB-", label: "KTP an. BPKB", subfolder: "DATA_DIRI/KTP_BPKB", maxFileSizeMb: 2 },
			{ fieldKey: "corp_kk_bpkb", documentType: "corp-kk-bpkb", prefix: "-CORP_KK_BPKB-", label: "Kartu Keluarga an. BPKB", subfolder: "DATA_DIRI/KK_BPKB", maxFileSizeMb: 2 },
		],
	},
	{
		spacerBefore: true,
		fields: [
			{ fieldKey: "corp_other", documentType: "corp-other", prefix: "-CORP_OTHER-", label: "Other", subfolder: "DATA_DIRI/OTHER", maxFileSizeMb: 2 },
		],
	},
	{
		title: "Dokumen Data Perusahaan",
		fields: [
			{ fieldKey: "corp_akta", documentType: "corp-akta", prefix: "-CORP_AKTA-", label: "Akta Pendirian", subfolder: "DATA_DIRI/AKTA_PENDIRIAN", maxFileSizeMb: 0 },
			{ fieldKey: "corp_sk_akta", documentType: "corp-sk-akta", prefix: "-CORP_SK_AKTA-", label: "SK Kemenkumham Akta Pendirian", subfolder: "DATA_DIRI/SK_KEMENKUMHAM_PENDIRIAN", maxFileSizeMb: 2 },
			{ fieldKey: "corp_akta_terakhir", documentType: "corp-akta-terakhir", prefix: "-CORP_AKTA_TERAKHIR-", label: "Akta Perubahan Terakhir", subfolder: "DATA_DIRI/AKTA_PERUBAHAN", maxFileSizeMb: 0 },
			{ fieldKey: "corp_sk_akta_terakhir", documentType: "corp-sk-akta-terakhir", prefix: "-CORP_SK_AKTA_TERAKHIR-", label: "SK Kemenkumham atas Akta Perubahan Terakhir", subfolder: "DATA_DIRI/SK_KEMENKUMHAM_PERUBAHAN", maxFileSizeMb: 2 },
			{ fieldKey: "corp_ktp_akta_terakhir", documentType: "corp-ktp-akta-terakhir", prefix: "-CORP_KTP_AKTA_TERAKHIR-", label: "KTP Pengurus pada Akta Perubahan Terakhir", subfolder: "DATA_DIRI/KTP_PENGURUS", maxFileSizeMb: 2 },
		],
	},
];

export const YAYASAN_TRAILING_FIELDS: CorpDocumentFieldConfig[] = [
	{ fieldKey: "corp_npwp", documentType: "corp-npwp", prefix: "-CORP_NPWP-", label: "NPWP Perusahaan", subfolder: "DATA_DIRI/NPWP", maxFileSizeMb: 2 },
	{ fieldKey: "corp_spk", documentType: "corp-spk", prefix: "-CORP_SPK-", label: "SPK", subfolder: "SPK", maxFileSizeMb: 2 },
];

export const YAYASAN_DYNAMIC_SECTION_TITLE = "KTP Pengurus pada Akta Perubahan Terakhir";

export const YAYASAN_DYNAMIC_DIRECTOR_FIELD: Omit<CorpDocumentFieldConfig, "fieldKey" | "documentType" | "prefix"> = {
	label: "KTP Direktur",
	subfolder: "DATA_DIRI/KTP_PENGURUS",
	maxFileSizeMb: 2,
};

export const YAYASAN_DYNAMIC_WNA_BOARD_FIELD: Omit<CorpDocumentFieldConfig, "fieldKey" | "documentType" | "prefix"> = {
	label: "KTP/Paspor Anggota Dewan (WNA)",
	subfolder: "DATA_DIRI/KTP_PENGURUS",
	maxFileSizeMb: 2,
};
export interface CustomerDocumentDto {
	id: number;
	documentType: string;
	fileName: string;
	uploadedAt: string | null;
}

export interface DynamicCustomerDocumentDto extends CustomerDocumentDto {
	index: number;
}

export interface CustomerDocumentListResponse {
	documents: Record<string, CustomerDocumentDto[]>;
	directorDocuments: DynamicCustomerDocumentDto[];
	boardDocuments: DynamicCustomerDocumentDto[];
	nextDirectorIndex: number;
	nextBoardIndex: number;
	hasAnyDocument: boolean;
}

export interface CorpDocumentFieldConfig {
	fieldKey: string;
	documentType: string;
	prefix: string;
	label: string;
	subfolder: string;
	maxFileSizeMb: number;
}

export interface CorpDocumentSection {
	title?: string;
	spacerBefore?: boolean;
	fields: CorpDocumentFieldConfig[];
}

export interface DynamicSectionConfig {
	documentTypePrefix: string;
	filePrefix: string;
	subfolder: string;
	accept: string;
	maxFileSizeMb: number;
}

export const DIRECTOR_KTP_CONFIG: DynamicSectionConfig = {
	documentTypePrefix: "corp-ocr-ktp_",
	filePrefix: "-CORP_KTP-",
	subfolder: "DATA_DIRI/KTP_PENGURUS",
	accept: ".png, .jpg, .jpeg, .pdf, .tiff",
	maxFileSizeMb: 2,
};

export const WNA_BOARD_CONFIG: DynamicSectionConfig = {
	documentTypePrefix: "wna-corp-board_",
	filePrefix: "-WNA_CORP_BOARD-",
	subfolder: "DATA_DIRI/KTP_PENGURUS",
	accept: ".png, .jpg, .jpeg, .pdf, .tiff",
	maxFileSizeMb: 2,
};

export const LEGACY_KTP_AKTA_TERAKHIR_DOCUMENT_TYPE = "corp-ktp-akta-terakhir";
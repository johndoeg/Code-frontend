const path = require("path");

const DOMAIN_SLUG = {
	CAM: "cam",
	MasterData: "master-data",
	Insurance: "insurance",
	Disbursement: "disbursement",
	HistoryPayment: "history-payment",
	Delima: "delima",
	ESPAY: "espay",
	Employee: "employee",
	GPS: "gps",
	Main: "main",
	Menu: "menu",
	OJK: "ojk",
	User: "user",
};

const EXPLICIT = {
	"api/axiosInstance.tsx": "shared/api/axiosInstance.tsx",
	"api/editPR.tsx": "features/cam/api/editPR.tsx",
	"api/onhandDetail.ts": "features/cam/api/onhandDetail.ts",

	"assets/new_logo_genie.webp": "shared/assets/new_logo_genie.webp",

	"components/Layout.tsx": "shared/components/Layout.tsx",
	"components/Sidebar.tsx": "shared/components/Sidebar.tsx",
	"components/Sidebar.css": "shared/components/Sidebar.css",
	"components/TopBar.tsx": "shared/components/TopBar.tsx",
	"components/TopHeader.tsx": "shared/components/TopHeader.tsx",
	"components/ThemeToggle.tsx": "shared/components/ThemeToggle.tsx",
	"components/PageLoader.tsx": "shared/components/PageLoader.tsx",
	"components/ProtectedRoute.tsx": "shared/components/ProtectedRoute.tsx",
	"components/PublicRoute.tsx": "shared/components/PublicRoute.tsx",
	"components/MaintenanceGate.tsx": "shared/components/MaintenanceGate.tsx",
	"components/MaintenancePage.tsx": "shared/components/MaintenancePage.tsx",
	"components/Modal.tsx": "shared/components/Modal.tsx",
	"components/AsOfDatePickerComponent.tsx": "shared/components/AsOfDatePickerComponent.tsx",

	"components/CAMTabs.tsx": "features/cam/components/CAMTabs.tsx",
	"components/ApprovalHistory.tsx": "features/cam/components/ApprovalHistory.tsx",
	"components/DocChip.tsx": "features/cam/components/DocChip.tsx",
	"components/DocPreviewModal.tsx": "features/cam/components/DocPreviewModal.tsx",
	"components/DocumentUploadField.tsx": "features/cam/components/DocumentUploadField.tsx",
	"components/FieldRow.tsx": "features/cam/components/FieldRow.tsx",
	"components/OcrFieldRow.tsx": "features/cam/components/OcrFieldRow.tsx",
	"components/PersonOcrTable.tsx": "features/cam/components/PersonOcrTable.tsx",
	"components/SectionHeader.tsx": "features/cam/components/SectionHeader.tsx",
	"components/SikTable.tsx": "features/cam/components/SikTable.tsx",
	"components/SimpleIdentityFields.tsx": "features/cam/components/SimpleIdentityFields.tsx",
	"components/ErrorCard.tsx": "features/cam/components/ErrorCard.tsx",
	"components/LoadingCard.tsx": "features/cam/components/LoadingCard.tsx",
	"components/NoDataCard.tsx": "features/cam/components/NoDataCard.tsx",

	"config/modalRoutes.ts": "shared/config/modalRoutes.ts",

	"constants/DefaultValue.tsx": "shared/constants/DefaultValue.tsx",

	"contexts/AuthContext.tsx": "shared/contexts/AuthContext.tsx",
	"contexts/ThemeContext.tsx": "shared/contexts/ThemeContext.tsx",
	"contexts/CamContext.tsx": "features/cam/contexts/CamContext.tsx",
	"contexts/OCRUploadSection.tsx": "features/cam/contexts/OCRUploadSection.tsx",

	"helpers/Formatter.tsx": "shared/utils/Formatter.tsx",
	"helpers/Base64Formatter.tsx": "shared/utils/Base64Formatter.tsx",
	"helpers/Pagination.tsx": "shared/utils/Pagination.tsx",

	"hooks/useCachedGet.ts": "shared/hooks/useCachedGet.ts",
	"hooks/useSessionTimeout.ts": "shared/hooks/useSessionTimeout.ts",
	"hooks/useIndustry.ts": "features/master-data/hooks/useIndustry.ts",

	"layouts/CAMLayout.tsx": "features/cam/layouts/CAMLayout.tsx",
	"layouts/AppLayout.tsx": "layouts/AppLayout.tsx",

	"shared/CKEditorNotes.tsx": "features/cam/components/CKEditorNotes.tsx",
	"shared/FormControls.tsx": "features/cam/components/FormControls.tsx",

	"types/maintenance.tsx": "shared/types/maintenance.tsx",
	"types/onhandDetail.ts": "features/cam/types/onhandDetail.ts",
	"types/prechecking.ts": "features/cam/types/prechecking.ts",
	"types/types.ts": "shared/types/types.ts",

	"utils/caching/requestCache.ts": "shared/utils/caching/requestCache.ts",
	"utils/prechecking/documentConfig.ts": "features/cam/utils/prechecking/documentConfig.ts",
	"utils/prechecking/errorMessage.ts": "features/cam/utils/prechecking/errorMessage.ts",
	"utils/prechecking/grade.ts": "features/cam/utils/prechecking/grade.ts",
	"utils/prechecking/DocumentUploadField.tsx": "features/cam/utils/prechecking/DocumentUploadField.tsx",
};

function mapPath(relPath) {
	const norm = relPath.split(path.sep).join("/");

	if (EXPLICIT[norm]) return EXPLICIT[norm];

	const pagesMatch = norm.match(/^pages\/([^/]+)\/(.*)$/);
	if (pagesMatch) {
		const [, domain, rest] = pagesMatch;
		const slug = DOMAIN_SLUG[domain];
		if (!slug) throw new Error(`Unknown domain folder under pages/: ${domain}`);
		return `features/${slug}/pages/${rest}`;
	}

	if (norm.startsWith("app/")) return norm;
	if (norm.startsWith("routes/")) return norm;
	if (norm === "main.tsx") return norm;
	if (norm === "index.css") return norm;

	return null;
}

module.exports = { mapPath, DOMAIN_SLUG, EXPLICIT };
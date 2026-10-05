import type { ComponentType } from "react";

export type RouteImportFn = () => Promise<{ default: ComponentType<any> }>;
export type RouteTuple = [path: string, importFn: RouteImportFn];

export const CAM_CORE_ROUTES: RouteTuple[] = [
    ["/index", () => import("@/features/cam/pages/AddCAM/AddCAMCustomerForm")],
    ["/cam-create", () => import("@/features/cam/pages/Onprocess/CreateEdit/MainEdit/CAMEditTabs")],
    ["/index-guarantor", () => import("@/features/cam/pages/AddCAM/AddCAMGuarantorForm")],
    ["/cam-onhand", () => import("@/features/cam/pages/Onprocess/Onhand/CAMOnhandPage")],
    ["/cam-inprogress", () => import("@/features/cam/pages/Onprocess/Inprogress/CAMInProgressPage")],
    ["/cam-approved", () => import("@/features/cam/pages/Onprocess/Approved/CAMApprovedPage")],
];

export const CAM_PRECHECKING_ROUTES: RouteTuple[] = [
    ["/PrecheckingIndividuPage", () => import("@/features/cam/pages/Prechecking/Create/Individu/PrecheckingIndividuPage")],
    ["/PrecheckingCorporatePage", () => import("@/features/cam/pages/Prechecking/Create/Corporate/PrecheckingCorporatePage")],
    ["/PrecheckingGuarantorIndividuPage", () => import("@/features/cam/pages/Prechecking/Create/Individu/PrecheckingGuarantorIndividuPage")],
    ["/PrecheckingGuarantorCorporatePage", () => import("@/features/cam/pages/Prechecking/Create/Corporate/PrecheckingGuarantorCorporatePage")],
    ["/cam-request-onhand", () => import("@/features/cam/pages/Prechecking/Onhand/PrecheckingOnhandPage")],
    ["/cam-request-inprogress", () => import("@/features/cam/pages/Prechecking/Inprogress/PrecheckingInProgressPage")],
    ["/cam-request-approved", () => import("@/features/cam/pages/Prechecking/Approval/PrecheckingApprovedPage")],
    ["/cam-request-rejected", () => import("@/features/cam/pages/Prechecking/Rejected/PrecheckingRejectedPage")],
    ["/view-prechecking", () => import("@/features/cam/pages/Prechecking/View/ViewPrecheckingPage")],
    ["/cam-request-approval", () => import("@/features/cam/pages/Prechecking/Approval/ApprovalPrecheckingPage")],
    ["/cam-request-edit-pr", () => import("@/features/cam/pages/Prechecking/Edit/Individu/EditPrecheckingIndividuPage")],
    ["/cam-request-edit-pt", () => import("@/features/cam/pages/Prechecking/Edit/Corporate/EditPrecheckingCorporatePage")],
    ["/cam-request-edit-guarantor-pr", () => import("@/features/cam/pages/Prechecking/Edit/Individu/EditPrecheckingGuarantorIndividu")],
    ["/cam-request-edit-guarantor-pt", () => import("@/features/cam/pages/Prechecking/Edit/Corporate/EditPrecheckingCorporatePage")],
    ["/cam-request-onhand-detail", () => import("@/features/cam/pages/Prechecking/Approval/CamRequestOnhandDetailPage")],
];

export const CAM_REPORT_ROUTES: RouteTuple[] = [
    ["/report-nett-booking-appi", () => import("@/features/cam/pages/ReportView/Others/NettBookingAPPIPage")],
    ["/undisbursecontract", () => import("@/features/cam/pages/ReportView/Others/UndisbursedContractPage")],
    ["/report-list-cont-del-by-system", () => import("@/features/cam/pages/ReportView/Others/PendingContractWillBeDeletedBySystemPage")],
    ["/report-his-bpkb-submit", () => import("@/features/cam/pages/ReportView/Others/HistoryBPKBSubmissionPage")],
    ["/report-pelunasan-mobil", () => import("@/features/cam/pages/ReportView/Others/LaporanPelunasanMobilPage")],
    ["/report-summary-cam-bycmo", () => import("@/features/cam/pages/ReportView/Others/MonthlySummaryCAMApprovedPage")],
    ["/report-f6pd", () => import("@/features/cam/pages/ReportView/Others/F6PDReportPage")],
    ["/rpt-top-customer", () => import("@/features/cam/pages/ReportView/Others/Top20CustomerPage")],
    ["/prechecking-and-cam-sla", () => import("@/features/cam/pages/ReportView/Others/PrecheckingAndCAMSLAPage")],
    ["/customer-outstanding", () => import("@/features/cam/pages/ReportView/Others/CustomerOustandingPage")],
    ["/summary-rundownosp", () => import("@/features/cam/pages/ReportView/Others/SummaryRunDownOSPPage")],
    ["/history-mrp", () => import("@/features/cam/pages/ReportView/Others/HistoryMRPPage")],
    ["/cam-ma", () => import("@/features/cam/pages/EditCAM/ByMA/CamEditContainer")],
    ["/edit-insurance", () => import("@/features/cam/pages/EditCAM/Insurance/EditInsurancePage")],
    ["/rpt-in-progress-cam", () => import("@/features/cam/pages/ReportView/ApprovedCAM/ListInprogressCAMPage")],
    ["/rpt-cam-by-cust-group", () => import("@/features/cam/pages/ReportView/ApprovedCAM/ListCAMByCustomerGroupPage")],
    ["/rpt-cam-by-app-date", () => import("@/features/cam/pages/ReportView/ApprovedCAM/ListCAMByApprovalDatePage")],
    ["/rpt-cam-by-app", () => import("@/features/cam/pages/ReportView/ApprovedCAM/ListCAMByApproverPage")],
    ["/rpt-approved-cam-by-car-cond", () => import("@/features/cam/pages/ReportView/ApprovedCAM/ListCAMByCarConditionPage")],
    ["/rpt-cam-by-dealer", () => import("@/features/cam/pages/ReportView/ApprovedCAM/ListApprovedByDealerPerDisbursementDatePage")],
    ["/rpt-rjt-cam", () => import("@/features/cam/pages/ReportView/ApprovedCAM/ListRejectedCAMPage")],
    ["/rpt-sum-cam-by-month", () => import("@/features/cam/pages/ReportView/ApprovedCAM/SummaryApprovedCAMPage")],
    ["/rpt-all-cam-data", () => import("@/features/cam/pages/ReportView/ApprovedCAM/AllCAMDataPage")],
    ["/rpt-all-insurance-data", () => import("@/features/cam/pages/ReportView/ApprovedCAM/AllInsuranceDataPage")],
    ["/rpt-cam-by-disb-date", () => import("@/features/cam/pages/ReportView/ApprovedCAM/ListCAMByDisbursementDatePage")],
    ["/report-cmo-daily-productivity", () => import("@/features/cam/pages/ReportView/CMOReport/CmoDailyProductivityPage")],
    ["/report-cmo-daily-productivity-by-branch", () => import("@/features/cam/pages/ReportView/CMOReport/CmoDailyProductivityByBranchPage")],
    ["/report-cmo-daily-productivity-by-cmo", () => import("@/features/cam/pages/ReportView/CMOReport/CmoDailyProductivityByCmoPage")],
    ["/hiscomm-incentivepayment-company", () => import("@/features/cam/pages/ReportView/Commission/Company/HistoryCommissionReportPage")],
    ["/detcomm-incentivepayment-company", () => import("@/features/cam/pages/ReportView/Commission/Company/DetailCommissionReportPage")],
    ["/hiscomm-incentivepayment-individu", () => import("@/features/cam/pages/ReportView/Commission/Individu/HistoryCommissionReportPage")],
    ["/detcomm-incentivepayment-individu", () => import("@/features/cam/pages/ReportView/Commission/Individu/DetailCommissionReportPage")],
    ["/report-monthly", () => import("@/features/cam/pages/ReportView/Incentive/HistoryIncentive3rdPartyReportPage")],
    ["/detail-report-monthly", () => import("@/features/cam/pages/ReportView/Incentive/DetailIncentive3rdPartyReportPage")],
];

export const MASTER_DATA_ROUTES: RouteTuple[] = [
    ["/sales", () => import("@/features/master-data/pages/Sales/SalesPage")],
    ["/sales-entry", () => import("@/features/master-data/pages/Sales/SalesEntryPage")],
    ["/rpt-list-sales", () => import("@/features/master-data/pages/Sales/ListOfSalesPage")],
    ["/supplier", () => import("@/features/master-data/pages/Dealer/SupplierPage")],
    ["/supplier-entry", () => import("@/features/master-data/pages/Dealer/SupplierEntryPage")],
    ["/rpt-list-supplier", () => import("@/features/master-data/pages/Dealer/ListOfSupplierPage")],
    ["/report-delete-dealer", () => import("@/features/master-data/pages/Dealer/DealerDeletedReportPage")],
    ["/brand-entry", () => import("@/features/master-data/pages/CollateralObject/Brand/BrandPage")],
    ["/brand-vehicle", () => import("@/features/master-data/pages/CollateralObject/Brand/BrandVehiclePage")],
    ["/rpt-list-vehicle", () => import("@/features/master-data/pages/CollateralObject/Brand/ListBrandPage")],
    ["/model-entry", () => import("@/features/master-data/pages/CollateralObject/Model/ModelEntryPage")],
    ["/rpt-list-model", () => import("@/features/master-data/pages/CollateralObject/Model/ListModelPage")],
    ["/karoseri-entry", () => import("@/features/master-data/pages/CollateralObject/Karoseri/KaroseriPage")],
    ["/rpt-list-karoseri", () => import("@/features/master-data/pages/CollateralObject/Karoseri/ListKaroseriPage")],
    ["/group-entry", () => import("@/features/master-data/pages/Group/GroupPage")],
    ["/group-member", () => import("@/features/master-data/pages/Group/GroupMemberPage")],
    ["/rpt-group", () => import("@/features/master-data/pages/Group/GroupReportPage")],
    ["/insurance", () => import("@/features/master-data/pages/Insurance/InsurancePage")],
    ["/ins-company", () => import("@/features/master-data/pages/Insurance/InsuranceCompanyPage")],
    ["/rpt-list-insurance", () => import("@/features/master-data/pages/Insurance/ListOfInsuranceReportPage")],
    ["/wlist-entry", () => import("@/features/master-data/pages/Watchlist/WatchListEntryPage")],
    ["/wlist-edit", () => import("@/features/master-data/pages/Watchlist/WatchListEditPage")],
    ["/wlist-entry-by-corsec", () => import("@/features/master-data/pages/Watchlist/WatchListEntryByCorsec")],
    ["/rpt-wlist", () => import("@/features/master-data/pages/Watchlist/WatchListReportPage")],
    ["/blacklist-entry", () => import("@/features/master-data/pages/Blacklist/BlackListEntryPage")],
    ["/blacklist/new", () => import("@/features/master-data/pages/Blacklist/BlackListFormPage")],
    ["/blacklist/:no", () => import("@/features/master-data/pages/Blacklist/BlackListFormPage")],
    ["/rpt-blacklist", () => import("@/features/master-data/pages/Blacklist/BlackListReportPage")],
    ["/blacklist-pel-ttot", () => import("@/features/master-data/pages/Blacklist/TtotReportPage")],
    ["/master-data-threshold-level", () => import("@/features/master-data/pages/RatioAndDeviation/MasterDataThresholdLevelPage")],
    ["/master-data-ratio", () => import("@/features/master-data/pages/RatioAndDeviation/MasterDataRatioPage")],
    ["/master-data-ratio-view-edit", () => import("@/features/master-data/pages/RatioAndDeviation/MasterDataRatioViewEditPage")],
    ["/master-data-npf-range", () => import("@/features/master-data/pages/RatioAndDeviation/MasterDataNPFRangePage")],
    ["/master-data-deviation-dp", () => import("@/features/master-data/pages/RatioAndDeviation/MasterDataDeviationDPPage")],
    ["/master-data-deviation-dp-view", () => import("@/features/master-data/pages/RatioAndDeviation/MasterDataDeviationDPViewPage")],
    ["/industrial-code", () => import("@/features/master-data/pages/IndustryCode/IndustrialCodePage")],
];

export const REPORT_ROUTES: RouteTuple[] = [
    ["/rpt-his-pmt", () => import("@/features/history-payment/pages/HistoryPaymentReportPage")],
    ["/rpt-amortization", () => import("@/features/history-payment/pages/AmortizationReportPage")],
    ["/report-aging-detail", () => import("@/features/history-payment/pages/DetailAgingReportPage")],
    ["/report-aging-summary", () => import("@/features/history-payment/pages/SummaryAgingReportPage")],
    ["/rpt-jurnal-financing", () => import("@/features/disbursement/pages/JurnalFinancingPage")],
    ["/rpt-print-his-pmt", () => import("@/features/history-payment/pages/PrintHistoryPaymentPage")],
];

export const INSURANCE_INVOICE_ROUTES: RouteTuple[] = [
    ["/insurance-entry", () => import("@/features/insurance/pages/InsuranceEntryPage")],
    ["/insurance-report", () => import("@/features/insurance/pages/InsuranceReportPage")],
    ["/invoice-raksa", () => import("@/features/insurance/pages/InvoiceRaksaPage")],
    ["/invoice-simas", () => import("@/features/insurance/pages/InvoiceSimasPage")],
    ["/invoice-gps", () => import("@/features/gps/pages/InvoiceGPSPage")],
    ["/va-list", () => import("@/features/espay/pages/VAListPage")],
    ["/espay-invoice", () => import("@/features/espay/pages/EspayInvoicePage")],
    ["/delima-invoice", () => import("@/features/delima/pages/InvoicePage")],
    ["/report-list-fiducia", () => import("@/features/delima/pages/FiduciaReportPage")],
];

export const OJK_ROUTES: RouteTuple[] = [
    ["/form-10", () => import("@/features/ojk/pages/SILARAS/Form10Page")],
    ["/slik", () => import("@/features/ojk/pages/SLIK/SLIKPage")],
    ["/sipesat", () => import("@/features/ojk/pages/SIPESAT/SipesatPage")],
];

export const ADMIN_ROUTES: RouteTuple[] = [
    ["/menu-entry", () => import("@/features/menu/pages/MenuEntryPage")],
    ["/menu-edit", () => import("@/features/menu/pages/MenuEditPage")],
    ["/uacc-entry", () => import("@/features/user/pages/UserAccessPage")],
    ["/users", () => import("@/features/user/pages/UsersPage")],
    ["/user-entry", () => import("@/features/user/pages/UserEntryPage")],
    ["/dashboard", () => import("@/features/dashboard/pages/DashboardPage")],
    ["/employee-data", () => import("@/features/employee/pages/EmployeeDataPage")],
    ["/memo-employee", () => import("@/features/employee/pages/EmployeeMemoPage")],
];

export const ALL_ROUTE_TUPLES: RouteTuple[] = [
    ...CAM_CORE_ROUTES,
    ...CAM_PRECHECKING_ROUTES,
    ...CAM_REPORT_ROUTES,
    ...MASTER_DATA_ROUTES,
    ...REPORT_ROUTES,
    ...INSURANCE_INVOICE_ROUTES,
    ...OJK_ROUTES,
    ...ADMIN_ROUTES,
];
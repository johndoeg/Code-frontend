import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import CamTabBoundary from './CamTabBoundary';

import CAMCustomerDetailPage from '../Customer/CAMCustomerDetailPage.tsx';
import CAMCustomerCorporateDetailPage from '../Customer/CAMCustomerCorporateDetailPage.tsx';
import CAMCustomerAddressPage from '../Customer/CAMCustomerAddressPage.tsx';
import CAMBusinessHistoryPage from '../Customer/CAMBusinessHistoryPage.tsx';
import IndividualFinancialStatementPage from '../Customer/IndividualFinancialStatementPage.tsx';
import CorporateBalanceSheetPage from '../Customer/CorporateBalanceSheetPage.tsx';
import BusinesProfile from '../Customer/BusinesProfile/BusinessProfileMain.tsx';
import CustIndividualDocumentPage from '../Customer/CustomerDocument/CustIndividualDocumentPage.tsx';
import CAMSurveyFilePage from '../Customer/CAMSurveyFilePage.tsx';
import CAMCustomerDocument from '../Customer/CustomerDocument/CAMCustomerDocumentPage.tsx';
import CAMReferencesPage from '../Customer/CAMReferencesPage.tsx';

import GuarantorListPage from '../Guarantor/GuarantorListPage.tsx';

import CAMEquipmentDetailPage from '../Equipment/CAMEquipmentDetailPage.tsx';
import CAMEquipmentBpkbPage from '../Equipment/CAMEquipmentBpkbPage.tsx';
import CAMEquipmentSurveyFilePage from '../Equipment/CAMEquipmentSurveyFilePage.tsx';
import CAMCrossCollateralPage from '../Equipment/CAMCrossCollateralPage.tsx';

import CAMFinancingPage from '../Financing/CAMFinancingPage.tsx';
import CAMFinancingInsurancePage from '../Financing/CAMFinancingInsurancePage.tsx';
import CAMFinancingCommissionPage from '../Financing/CAMFinancingCommissionPage.tsx';
import CAMFinancingDisbursementPage from '../Financing/CAMFinancingDisbursementPage.tsx';
import CAMFinancingOutstandingPage from '../Financing/CAMFinancingOutstandingPage.tsx';

import CAMSurveyPage from '../Survey/CAMSurveyPage.tsx';

import CAMAPUPPTPage from '../APUPPT/CAMAPUPPTPage.tsx';

import CAMNotesPage from '../Other/CAMNotesPage.tsx';
import CAMCustomerNotesPage from '../Other/CAMCustomerNotesPage.tsx';
import CAMRevisionNotesPage from '../Other/CAMRevisionNotesPage.tsx';

export type CamMode = 'edit' | 'create';

export const CAM_CREATE_PATH = '/cam-create';

export interface CamMenuCtx {
	finType: string;
	indCor: string;
	guarantor: string;
	newCar: string;
	status: string;
	c2c: string;
	boa: string;
	bot: string;
	akseskhusus?: boolean;
}

export interface CamSubmenuItem {
	key: number;
	label: string;
	page: string;
}

export interface CamMenuItem {
	key: number;
	label: string;
	submenus: CamSubmenuItem[];
}

export function buildCamMenu(ctx: CamMenuCtx): CamMenuItem[] {
	const { finType, indCor, guarantor, newCar, c2c, boa, bot, akseskhusus } = ctx;

	const hasBo = boa === "2";
	const equipmentIsSpecial = finType === "S";

	const equipmentLabel = equipmentIsSpecial ? "Financing Object" : "Equipment";
	const bpkbLabel = equipmentIsSpecial ? "Financing Object BPKB" : "BPKB";

	const equipmentSubmenus: CamSubmenuItem[] = c2c === "1"
		? [
			{ key: 1, label: equipmentLabel, page: "eq_equipment" },
			{ key: 2, label: bpkbLabel, page: "eq_bpkb" },
			{ key: 3, label: "C to C", page: "eq_ctoc" },
			{ key: 4, label: "Survey File", page: "eq_survey_file" },
		]
		: [
			{ key: 1, label: equipmentLabel, page: "eq_equipment" },
			{ key: 2, label: bpkbLabel, page: "eq_bpkb" },
			{ key: 3, label: "Survey File", page: "eq_survey_file" },
			{ key: 4, label: "Cross Collateral", page: "eq_cross" },
		];

	const financingSubmenus: CamSubmenuItem[] = [
		{ key: 1, label: "Financing", page: "fin_financing" },
		{ key: 2, label: "Insurance", page: "insurance" },
		akseskhusus
			? { key: 3, label: "Commission", page: "fin_commission_cam" }
			: { key: 3, label: "Commission (Detail)", page: "fin_commission" },
		{ key: 4, label: "Disbursement", page: "fin_disbursement" },
		{ key: 5, label: "Outstanding", page: "fin_outstanding" },
	];

	const custDetailPage = indCor === "1" ? "cust_detail" : "corp_detail";
	const custAddressPage = indCor === "1" ? "cust_address" : "corp_address";
	const custBusinessLabel = indCor === "1" ? "Business/ Job History" : "Business Profile";
	const custBusinessPage = indCor === "1" ? "cust_business_history" : "corp_business_profile";

	const customerSubmenus: CamSubmenuItem[] = guarantor === "2"
		? [
			{ key: 1, label: "Detail", page: custDetailPage },
			{ key: 2, label: "Address", page: custAddressPage },
			{ key: 3, label: "Guarantor", page: "cust_guarantor" },
			{ key: 4, label: "Financial Information", page: "cust_finance_info" },
			{ key: 5, label: custBusinessLabel, page: custBusinessPage },
			{ key: 6, label: "Survey File", page: "cust_survey_file" },
			{ key: 7, label: "Customer's Document", page: "cust_document" },
			{ key: 8, label: "References", page: "cust_references" },
		]
		: [
			{ key: 1, label: "Detail", page: custDetailPage },
			{ key: 2, label: "Address", page: custAddressPage },
			{ key: 3, label: "Financial Information", page: "cust_finance_info" },
			{ key: 4, label: custBusinessLabel, page: custBusinessPage },
			{ key: 5, label: "Survey File", page: "cust_survey_file" },
			{ key: 6, label: "Customer's Document", page: "cust_document" },
			{ key: 7, label: "References", page: "cust_references" },
		];

	const beneficialOwnerSubmenus: CamSubmenuItem[] = [
		{ key: 1, label: "Detail", page: bot === "1" ? "ind_beneficial_detail" : "corp_beneficial_detail" },
	];

	const surveySubmenus: CamSubmenuItem[] = [{ key: 1, label: "Survey", page: "survey" }];
	const apuPptSubmenus: CamSubmenuItem[] = [{ key: 1, label: "APU PPT", page: "edit_apu_ppt" }];
	const otherSubmenus: CamSubmenuItem[] = [
		{ key: 1, label: "CAM Notes", page: "cam_notes" },
		{ key: 2, label: "Customer Notes", page: "other_notes" },
		{ key: 3, label: "Revision Notes", page: "revision_notes" },
	];

	if (!hasBo) {
		return [
			{ key: 1, label: "Customer", submenus: customerSubmenus },
			{ key: 2, label: "Equipment", submenus: equipmentSubmenus },
			{ key: 3, label: "Financing", submenus: financingSubmenus },
			{ key: 4, label: "Survey", submenus: surveySubmenus },
			{ key: 5, label: "APU PPT", submenus: apuPptSubmenus },
			{ key: 6, label: "Other", submenus: otherSubmenus },
		];
	}

	return [
		{ key: 1, label: "Customer", submenus: customerSubmenus },
		{ key: 2, label: "Beneficial Owner", submenus: beneficialOwnerSubmenus },
		{ key: 3, label: "Equipment", submenus: equipmentSubmenus },
		{ key: 4, label: "Financing", submenus: financingSubmenus },
		{ key: 5, label: "Survey", submenus: surveySubmenus },
		{ key: 6, label: "APU PPT", submenus: apuPptSubmenus },
		{ key: 7, label: "Other", submenus: otherSubmenus },
	];
}

export function findMenuPositionByPage(menu: CamMenuItem[], page: string): { menu: number; submenu: number } | null {
	for (const m of menu) {
		for (const s of m.submenus) {
			if (s.page === page) return { menu: m.key, submenu: s.key };
		}
	}
	return null;
}

export function flattenCamMenu(menu: CamMenuItem[]): { menu: number; submenu: number; page: string }[] {
	const flat: { menu: number; submenu: number; page: string }[] = [];
	for (const m of menu) {
		for (const s of m.submenus) {
			flat.push({ menu: m.key, submenu: s.key, page: s.page });
		}
	}
	return flat;
}

export function getAdjacentMenuPosition(
	menu: CamMenuItem[],
	currentMenu: number,
	currentSubmenu: number,
	direction: 1 | -1
): { menu: number; submenu: number } | null {
	const flat = flattenCamMenu(menu);
	const idx = flat.findIndex(f => f.menu === currentMenu && f.submenu === currentSubmenu);
	if (idx === -1) return null;
	const targetIdx = idx + direction;
	if (targetIdx < 0 || targetIdx >= flat.length) return null;
	return { menu: flat[targetIdx].menu, submenu: flat[targetIdx].submenu };
}

export interface CamEditCtx extends CamMenuCtx {
	purpoffinc: string;
	contType: string;
	apless: string;
	applno: string;
	repeat?: string;
	restructuringChange?: string;
	goPublic?: string;
	custName?: string;
}

type EditComponent = React.FC<{
	ctx: CamEditCtx;
	onSaved: (result: { apless: string; applno: string }) => void;
}>;

export interface CamTabHandle {
	save: () => void;
}

type TabProps = {
	ctx: CamEditCtx;
	onSaved: (result: { apless: string; applno: string }) => void;
};

function camTab(
	render: (props: TabProps, ref: React.Ref<CamTabHandle>) => React.ReactElement,
	displayName: string
): EditComponent {
	const Wrapped = forwardRef<CamTabHandle, TabProps>((props, ref) => render(props, ref));
	Wrapped.displayName = displayName;
	return Wrapped as unknown as EditComponent;
}

const SHARED_NAV_PAGES = new Set<string>([
	'eq_cross',
	'cust_detail', 'corp_detail', 'cust_address', 'corp_address', 'cust_guarantor', 'cust_survey_file', 'cust_document', 'cust_references',
	'cust_finance_info', 'cust_business_history',
	'corp_business_profile',
	'eq_equipment', 'eq_bpkb', 'eq_survey_file',
	'fin_financing', 'insurance', 'fin_commission', 'fin_commission_cam',
	'fin_disbursement', 'fin_outstanding',
	'survey', 'edit_apu_ppt',
	'cam_notes', 'other_notes', 'revision_notes',
]);

function pageSupportsSharedNav(page: string, ctx: CamEditCtx): boolean {
	// if (page === 'cust_document') return ctx.indCor === '1';
	return SHARED_NAV_PAGES.has(page);
}

const IMPLEMENTED_EDIT_PAGES: Partial<Record<string, EditComponent>> = {
	'cust_detail': camTab(({ ctx, onSaved }, ref) => (
		<CAMCustomerDetailPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			guarantor={ctx.guarantor}
			newCar={ctx.newCar}
			purpoffinc={ctx.purpoffinc}
			contType={ctx.contType}
			restructuringChange={ctx.restructuringChange || ''}
			onSaved={onSaved}
		/>
	), 'CustDetailTab'),
	'corp_detail': camTab(({ ctx, onSaved }, ref) => (
		<CAMCustomerCorporateDetailPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			guarantor={ctx.guarantor}
			newCar={ctx.newCar}
			purpoffinc={ctx.purpoffinc}
			contType={ctx.contType}
			restructuringChange={ctx.restructuringChange || ''}
			goPublic={ctx.goPublic || ''}
			onSaved={onSaved}
		/>
	), 'CorpDetailTab'),
	'cust_address': camTab(({ ctx, onSaved }, ref) => (
		<CAMCustomerAddressPage ref={ref} apless={ctx.apless} applNo={ctx.applno} finType={ctx.finType} custName={ctx.custName || ''} onSaved={onSaved} />
	), 'CustAddressTab'),
	'corp_address': camTab(({ ctx, onSaved }, ref) => (
		<CAMCustomerAddressPage ref={ref} apless={ctx.apless} applNo={ctx.applno} finType={ctx.finType} custName={ctx.custName || ''} onSaved={onSaved} />
	), 'CorpAddressTab'),
	'cust_guarantor': camTab(({ ctx, onSaved }, ref) => (
		<GuarantorListPage ref={ref} apless={ctx.apless} applNo={ctx.applno} onSaved={onSaved} />
	), 'CustGuarantorTab'),
	'cust_finance_info': camTab(({ ctx, onSaved }, ref) => (
		ctx.indCor === '1'
			? <IndividualFinancialStatementPage ref={ref} apless={ctx.apless} applNo={ctx.applno} finType={ctx.finType} custName={ctx.custName || ''} onSaved={onSaved} />
			: <CorporateBalanceSheetPage ref={ref} apless={ctx.apless} applNo={ctx.applno} finType={ctx.finType} custName={ctx.custName || ''} onSaved={onSaved} />
	), 'CustFinanceInfoTab'),
	'cust_business_history': camTab(({ ctx, onSaved }, ref) => (
		<CAMBusinessHistoryPage ref={ref} apless={ctx.apless} applNo={ctx.applno} finType={ctx.finType} custName={ctx.custName || ''} onSaved={onSaved} />
	), 'CustBusinessHistoryTab'),
	'corp_business_profile': camTab(({ ctx, onSaved }, ref) => (
		<BusinesProfile
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			onSaved={onSaved}
		/>
	), 'CorpBusinessProfileTab'),
	'cust_survey_file': camTab(({ ctx, onSaved }, ref) => (
		<CAMSurveyFilePage ref={ref} apless={ctx.apless} applNo={ctx.applno} status={ctx.status} finType={ctx.finType} custName={ctx.custName || ''} onSaved={onSaved} />
	), 'CustSurveyFileTab'),
	'cust_document': camTab(({ ctx, onSaved }, ref) => (
		ctx.indCor === '1'
			? <CustIndividualDocumentPage ref={ref} apless={ctx.apless} applNo={ctx.applno} finType={ctx.finType} custName={ctx.custName || ''} onSaved={onSaved} />
			: <CAMCustomerDocument ref={ref} apless={ctx.apless} applNo={ctx.applno} indCor={ctx.indCor} finType={ctx.finType} custName={ctx.custName || ''} onSaved={onSaved} />
	), 'CustDocumentTab'),
	'cust_references': camTab(({ ctx, onSaved }, ref) => (
		<CAMReferencesPage ref={ref} apless={ctx.apless} applNo={ctx.applno} finType={ctx.finType} custName={ctx.custName || ''} onSaved={onSaved} />
	), 'CustReferencesTab'),
	'eq_equipment': camTab(({ ctx, onSaved }, ref) => (
		<CAMEquipmentDetailPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			purpoffinc={ctx.purpoffinc}
			newCar={ctx.newCar}
			onSaved={onSaved}
		/>
	), 'EqEquipmentTab'),
	'eq_bpkb': camTab(({ ctx, onSaved }, ref) => (
		<CAMEquipmentBpkbPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			newCar={ctx.newCar}
			onSaved={onSaved}
		/>
	), 'EqBpkbTab'),
	'eq_survey_file': camTab(({ ctx, onSaved }, ref) => (
		<CAMEquipmentSurveyFilePage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			status={ctx.status}
			onSaved={onSaved}
		/>
	), 'EqSurveyFileTab'),
	'eq_cross': camTab(({ ctx, onSaved }, ref) => (
		<CAMCrossCollateralPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			onSaved={onSaved}
		/>
	), 'EqCrossTab'),
	'fin_financing': camTab(({ ctx, onSaved }, ref) => (
		<CAMFinancingPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			purpoffinc={ctx.purpoffinc}
			contType={ctx.contType}
			newCar={ctx.newCar}
			onSaved={onSaved}
		/>
	), 'FinFinancingTab'),
	'insurance': camTab(({ ctx, onSaved }, ref) => (
		<CAMFinancingInsurancePage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			onSaved={onSaved}
		/>
	), 'InsuranceTab'),
	'fin_commission': camTab(({ ctx, onSaved }, ref) => (
		<CAMFinancingCommissionPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			onSaved={onSaved}
		/>
	), 'FinCommissionTab'),
	'fin_disbursement': camTab(({ ctx, onSaved }, ref) => (
		<CAMFinancingDisbursementPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			contType={ctx.contType}
			onSaved={onSaved}
		/>
	), 'FinDisbursementTab'),
	'fin_outstanding': camTab(({ ctx, onSaved }, ref) => (
		<CAMFinancingOutstandingPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			onSaved={onSaved}
		/>
	), 'FinOutstandingTab'),
	'survey': camTab(({ ctx, onSaved }, ref) => (
		<CAMSurveyPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			indCor={ctx.indCor === '2' ? '2' : '1'}
			onSaved={onSaved}
		/>
	), 'SurveyTab'),
	'edit_apu_ppt': camTab(({ ctx, onSaved }, ref) => (
		<CAMAPUPPTPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			onSaved={onSaved}
		/>
	), 'EditApuPptTab'),
	'cam_notes': camTab(({ ctx, onSaved }, ref) => (
		<CAMNotesPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			onSaved={onSaved}
		/>
	), 'CamNotesTab'),
	'other_notes': camTab(({ ctx, onSaved }, ref) => (
		<CAMCustomerNotesPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			onSaved={onSaved}
		/>
	), 'OtherNotesTab'),
	'revision_notes': camTab(({ ctx, onSaved }, ref) => (
		<CAMRevisionNotesPage
			ref={ref}
			apless={ctx.apless}
			applNo={ctx.applno}
			finType={ctx.finType}
			custName={ctx.custName || ''}
			onSaved={onSaved}
		/>
	), 'RevisionNotesTab'),
};

export interface CamEditTabsProps {
	ctx?: CamEditCtx;
	mode?: CamMode;
	initialMenu?: number;
	initialSubmenu?: number;
	onHome?: () => void;
}

export default function CamEditTabs({
	ctx: ctxProp,
	mode: modeProp,
	initialMenu,
	initialSubmenu,
	onHome,
}: CamEditTabsProps) {
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const [searchParams] = useSearchParams();

	const ctxFromParams = useMemo<CamEditCtx>(() => {
		const get = (key: string, fallback = '') => searchParams.get(key) ?? fallback;
		return {
			apless: get('apless'),
			applno: get('applno'),
			indCor: get('indCor', '1'),
			finType: get('finType'),
			guarantor: get('guarantor', '1'),
			newCar: get('newCar'),
			purpoffinc: get('purpoffinc'),
			contType: get('contType', 'NEW'),
			status: get('status'),
			c2c: get('c2c'),
			boa: get('boa', '1'),
			bot: get('bot'),
			goPublic: get('goPublic'),
			custName: get('custName'),
		};
	}, [searchParams]);

	const mode: CamMode = modeProp ?? (pathname === CAM_CREATE_PATH ? 'create' : 'edit');

	const [ctx, setCtx] = useState<CamEditCtx>(ctxProp ?? ctxFromParams);
	const [menu, setMenu] = useState<number>(initialMenu || 1);
	const [submenuIndex, setSubmenuIndex] = useState<number>(initialSubmenu || 1);

	const goHome = onHome ?? (() => navigate('/index'));

	const menuTree = useMemo(
		() =>
			buildCamMenu({
				finType: ctx.finType,
				indCor: ctx.indCor,
				guarantor: ctx.guarantor,
				newCar: ctx.newCar,
				status: ctx.status,
				c2c: ctx.c2c,
				boa: ctx.boa || '1',
				bot: ctx.bot || '',
				akseskhusus: ctx.akseskhusus,
			}),
		[ctx.finType, ctx.indCor, ctx.guarantor, ctx.newCar, ctx.status, ctx.c2c, ctx.boa, ctx.bot, ctx.akseskhusus]
	);

	const activeTopMenu = menuTree.find(m => m.key === menu) ?? menuTree[0];
	const submenuItems = activeTopMenu?.submenus ?? [];

	useEffect(() => {
		if (submenuIndex < 1 || submenuIndex > submenuItems.length) {
			setSubmenuIndex(1);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [menu]);

	const { data: headerData } = useQuery({
		queryKey: ['cam-edit-header', ctx.apless, ctx.applno],
		queryFn: async () => {
			const res = await api.get('/CAM/EditIndex/header', {
				params: { apless: ctx.apless, applno: ctx.applno },
			});
			return res.data;
		},
		enabled: !!(ctx.apless || ctx.applno),
	});

	useEffect(() => {
		if (headerData?.custName) {
			setCtx(prev => ({ ...prev, custName: headerData.custName }));
		}
	}, [headerData]);

	const activeSubmenu = submenuItems[submenuIndex - 1];
	const ActiveComponent = activeSubmenu ? IMPLEMENTED_EDIT_PAGES[activeSubmenu.page] : undefined;
	const supportsSharedNav = activeSubmenu ? pageSupportsSharedNav(activeSubmenu.page, ctx) : false;
	const activeTabRef = useRef<CamTabHandle>(null);

	const RenderableActiveComponent = ActiveComponent as React.ForwardRefExoticComponent<
		{
			ctx: CamEditCtx;
			onSaved: (result: { apless: string; applno: string }) => void;
		} & React.RefAttributes<CamTabHandle>
	> | undefined;

	const handleSaved = ({ apless, applno }: { apless: string; applno: string }) => {
		setCtx(prev => ({ ...prev, apless, applno }));
		if (submenuIndex < submenuItems.length) {
			setSubmenuIndex(submenuIndex + 1);
		} else {
			const menuIdx = menuTree.findIndex(m => m.key === menu);
			const nextMenu = menuTree[menuIdx + 1];
			if (nextMenu) {
				setMenu(nextMenu.key);
				setSubmenuIndex(1);
			} else {
				goHome();
			}
		}
	};

	const prevPosition = useMemo(
		() => getAdjacentMenuPosition(menuTree, menu, submenuIndex, -1),
		[menuTree, menu, submenuIndex]
	);
	const nextPosition = useMemo(
		() => getAdjacentMenuPosition(menuTree, menu, submenuIndex, 1),
		[menuTree, menu, submenuIndex]
	);
	const isLastTab = !nextPosition;

	const goTo = (pos: { menu: number; submenu: number } | null) => {
		if (!pos) return;
		setMenu(pos.menu);
		setSubmenuIndex(pos.submenu);
	};

	if (!ctx.apless && !ctx.applno) {
		return (
			<div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--app-surface-alt)] p-6">
				<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
					<p className="text-base font-medium text-[var(--app-text)]">
						No CAM identity in the URL
					</p>
					<p className="mt-1 text-sm text-[var(--app-muted)]">
						Expected <code>apless</code> and <code>applno</code> query parameters.
					</p>
					<button
						type="button"
						onClick={goHome}
						className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
					>
						Back to Add CAM
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto bg-[var(--app-surface-alt)] p-6">
			<div className="w-full">
				<div className="mb-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-white shadow">

					<div>
						<h1 className="text-lg font-semibold">
							{mode === 'create' ? 'CAM Create' : 'CAM Edit'}
						</h1>
						{ctx.custName && (
							<p className="text-xs text-white/80">
								{ctx.custName}{ctx.applno ? ` · ${ctx.applno}` : ''}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={goHome}
						aria-label="Close"
						className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-900"
					>
						✕ Close
					</button>
				</div>

				<div className="mb-3 flex flex-wrap gap-1 rounded-2xl bg-[var(--app-card)] p-2 shadow">
					{menuTree.map(item => (
						<button
							key={item.key}
							type="button"
							onClick={() => { setMenu(item.key); setSubmenuIndex(1); }}
							className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${menu === item.key ? 'bg-orange-500 text-white' : 'text-[var(--app-muted)] hover:bg-[var(--app-surface-alt)]'
								}`}
						>
							{item.label}
						</button>
					))}
				</div>

				<div className="mb-4 flex flex-wrap gap-1 rounded-2xl bg-[var(--app-card)] p-2 shadow">
					{submenuItems.map((item, idx) => (
						<button
							key={item.key}
							type="button"
							onClick={() => setSubmenuIndex(idx + 1)}
							className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${submenuIndex === idx + 1 ? 'bg-blue-600 text-white' : 'text-[var(--app-muted)] hover:bg-[var(--app-surface-alt)]'
								}`}
						>
							{item.label}
						</button>
					))}
				</div>

				<div>
					{ActiveComponent && RenderableActiveComponent ? (
						<CamTabBoundary key={activeSubmenu?.page}>
							<RenderableActiveComponent
								ctx={ctx}
								onSaved={handleSaved}
								ref={activeTabRef}
							/>
						</CamTabBoundary>
					) : (
						<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
							<p className="text-base font-medium text-[var(--app-text)]">
								{activeSubmenu?.label || 'This tab'} hasn&apos;t been migrated yet
							</p>
							<p className="mt-1 text-sm text-[var(--app-muted)]">
								No editable component has been wired up for this tab yet.
							</p>
						</div>
					)}
				</div>

				<div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[var(--app-card)] p-3 shadow">
					<div>
						{prevPosition && (
							<button
								type="button"
								onClick={() => goTo(prevPosition)}
								className="flex items-center gap-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
							>
								<span aria-hidden>‹</span> Prev
							</button>
						)}
					</div>

					<div>
						{(supportsSharedNav || (!ActiveComponent && nextPosition)) && (
							<button
								type="button"
								onClick={() => {
									if (supportsSharedNav) {
										activeTabRef.current?.save();
									} else {
										goTo(nextPosition);
									}
								}}
								className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition ${isLastTab ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-green-600 hover:bg-green-700'
									}`}
							>
								{isLastTab ? 'Finish' : (<>Next <span aria-hidden>›</span></>)}
							</button>
						)}
					</div>
				</div>

			</div>
		</div>
	);
}
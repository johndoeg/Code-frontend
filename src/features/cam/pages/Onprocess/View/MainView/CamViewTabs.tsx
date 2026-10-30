import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

const CustomerDetailView = lazy(() => import('@/features/cam/pages/Onprocess/View/Customer/CustomerDetailView'));
const CorporateDetailView = lazy(() => import('@/features/cam/pages/Onprocess/View/Customer/CorporateDetailView'));
const GuarantorDetailView = lazy(() => import('@/features/cam/pages/Onprocess/View/Customer/GuarantorDetailView'));
const FinancialInfoView = lazy(() => import('@/features/cam/pages/Onprocess/View/Customer/FinancialInfoView'));
const BusinessHistoryView = lazy(() => import('@/features/cam/pages/Onprocess/View/Customer/BusinessHistoryView'));
const BusinessProfileView = lazy(() => import('@/features/cam/pages/Onprocess/View/Customer/BusinessProfileView'));
const CustomerSurveyFileView = lazy(() => import('@/features/cam/pages/Onprocess/View/Customer/CustomerSurveyFileView'));

const EquipmentView = lazy(() => import('@/features/cam/pages/Onprocess/View/Equipment/EquipmentView'));
const EquipmentSurveyFileView = lazy(() => import('@/features/cam/pages/Onprocess/View/Equipment/EquipmentSurveyFileView'));

const FinancingView = lazy(() => import('@/features/cam/pages/Onprocess/View/Financing/FinancingView'));

const DeviationView = lazy(() => import('@/features/cam/pages/Onprocess/View/Deviation/DeviationView'));

const SurveyView = lazy(() => import('@/features/cam/pages/Onprocess/View/Survey/SurveyView'));

const ApuPptView = lazy(() => import('@/features/cam/pages/Onprocess/View/APUPPT/ApuPptView'));

const CamNotesView = lazy(() =>
	import('@/features/cam/pages/Onprocess/View/Other/NotesView').then(m => ({ default: m.CamNotesView })));
const OtherNotesView = lazy(() =>
	import('@/features/cam/pages/Onprocess/View/Other/NotesView').then(m => ({ default: m.OtherNotesView })));

const HistoryPaymentView = lazy(() => import('@/features/cam/pages/Onprocess/View/HistoryPayment/HistoryPaymentView'));

const ReportCamView = lazy(() => import('@/features/cam/pages/Onprocess/View/ReportCAM/ReportCAMView'));

const AllFilesView = lazy(() => import('@/features/cam/pages/Onprocess/View/AllFiles/AllFilesView'));

const ApprovalView = lazy(() => import('@/features/cam/pages/Onprocess/View/Approval/ApprovalView'));
const CreditRecommendationView = lazy(() => import('@/features/cam/pages/Onprocess/View/Approval/CreditRecomendationView'));

export interface CamCtx {
	finType: string;
	indCor: string;
	repeat: string;
	guarantor: string;
	newCar: string;
	status: string;
	purpoffinc: string;
	c2c: string;
	contType: string;
	apless: string;
	applno: string;
	boa?: string;
	bot?: string;
	akseskhusus?: boolean;
	restructuringChange?: string;
	goPublic?: string;
	custName?: string;
}

type ViewKey =
	| 'customer_detail'
	| 'corporate_detail'
	| 'guarantor'
	| 'financial_info'
	| 'business_profile'
	| 'business_history'
	| 'survey_file_customer'
	| 'equipment'
	| 'used_car_checklist'
	| 'survey_file_equipment'
	| 'financing'
	| 'deviation'
	| 'survey'
	| 'notes'
	| 'other_notes'
	| 'apu_ppt'
	| 'history_payment'
	| 'report_cam'
	| 'all_files'
	| 'approval'
	| 'credit_recommendation';

interface SubmenuItem {
	key: string;
	label: string;
	view: ViewKey;
}

const TOP_MENU: { key: number; label: string }[] = [
	{ key: 1, label: 'Customer' },
	{ key: 2, label: 'Equipment' },
	{ key: 3, label: 'Financing' },
	{ key: 4, label: 'Deviation' },
	{ key: 5, label: 'Survey' },
	{ key: 6, label: 'APU PPT' },
	{ key: 7, label: 'Other' },
	{ key: 8, label: 'History Payment' },
	{ key: 9, label: 'Report CAM' },
	{ key: 10, label: 'All Files' },
	{ key: 11, label: 'Approval' },
];

function getSubmenu(menu: number, ctx: CamCtx): SubmenuItem[] {
	switch (menu) {
		case 1: {
			const items: SubmenuItem[] = [
				ctx.indCor === '2'
					? { key: 'detail', label: 'Detail', view: 'corporate_detail' }
					: { key: 'detail', label: 'Detail', view: 'customer_detail' },
			];
			if (ctx.guarantor === '2') {
				items.push({ key: 'guarantor', label: 'Guarantor', view: 'guarantor' });
			}
			items.push({ key: 'finance', label: 'Financial Information', view: 'financial_info' });
			items.push(
				ctx.indCor === '2'
					? { key: 'history', label: 'Business Profile', view: 'business_profile' }
					: { key: 'history', label: 'Business/ Job History', view: 'business_history' }
			);
			items.push({ key: 'survey', label: 'Survey File', view: 'survey_file_customer' });
			return items;
		}
		case 2: {
			const items: SubmenuItem[] = [{ key: 'equipment', label: 'Equipment', view: 'equipment' }];
			// if (ctx.newCar === '1') {
			// 	items.push({ key: 'usedcar', label: 'Used Car Checklist', view: 'used_car_checklist' });
			// }
			items.push({ key: 'survey', label: 'Survey File', view: 'survey_file_equipment' });
			return items;
		}
		case 3:
			return [{ key: 'financing', label: 'Financing', view: 'financing' }];
		case 4:
			return [{ key: 'deviation', label: 'Deviation', view: 'deviation' }];
		case 5:
			return [{ key: 'survey', label: 'Survey', view: 'survey' }];
		case 6:
			return [{ key: 'apu_ppt', label: 'APU PPT', view: 'apu_ppt' }];
		case 7:
			return [
				{ key: 'notes', label: 'CAM Notes', view: 'notes' },
				{ key: 'other_notes', label: 'Customer Notes', view: 'other_notes' },
			];
		case 8:
			return [{ key: 'history_payment', label: 'History Payment', view: 'history_payment' }];
		case 9:
			return [{ key: 'report', label: 'Report CAM', view: 'report_cam' }];
		case 10:
			return [{ key: 'files', label: 'All Files', view: 'all_files' }];
		case 11:
			return [
				{ key: 'approval', label: 'Approval', view: 'approval' },
				{ key: 'credit_recommendation', label: 'Credit Recommendation', view: 'credit_recommendation' },
			];
		default:
			return [];
	}
}

const IMPLEMENTED_VIEWS: Partial<Record<ViewKey, React.FC<{ ctx: CamCtx }>>> = {
	customer_detail: CustomerDetailView,
	corporate_detail: CorporateDetailView,
	guarantor: GuarantorDetailView,
	financial_info: FinancialInfoView,
	business_profile: BusinessProfileView,
	business_history: BusinessHistoryView,
	survey_file_customer: CustomerSurveyFileView,
	equipment: EquipmentView,
	survey_file_equipment: EquipmentSurveyFileView,
	financing: FinancingView,
	deviation: DeviationView,
	survey: SurveyView,
	notes: CamNotesView,
	other_notes: OtherNotesView,
	apu_ppt: ApuPptView,
	history_payment: HistoryPaymentView,
	all_files: AllFilesView,
	approval: ApprovalView,
	report_cam: ReportCamView,
	credit_recommendation: CreditRecommendationView,
};

const ALL_VIEW_KEYS = Object.keys(IMPLEMENTED_VIEWS) as ViewKey[];

function TabLoading() {
	return (
		<div className="rounded-2xl bg-[var(--app-card)] p-10 text-center shadow">
			<div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[var(--app-border)] border-t-blue-600" />
			<p className="mt-3 text-sm text-[var(--app-text)]">Loading…</p>
		</div>
	);
}

function readCtxFromUrl(): CamCtx {
	const params = new URLSearchParams(window.location.search);
	return {
		finType: params.get('id1') || '',
		indCor: params.get('id2') || '',
		repeat: params.get('id3') || '',
		guarantor: params.get('id4') || '',
		newCar: params.get('id5') || '',
		status: params.get('id6') || '',
		purpoffinc: params.get('id7') || '',
		c2c: params.get('id8') || '',
		contType: params.get('id9') || '',
		apless: params.get('apless') || '',
		applno: params.get('applno') || '',
		custName: params.get('custName') || '',
	};
}

export interface CamViewTabsProps {
	ctx?: CamCtx;
	initialMenu?: number;
	initialSubmenu?: number;
	onHome?: () => void;
}

export default function CamViewTabs({ ctx: ctxProp, initialMenu, initialSubmenu, onHome }: CamViewTabsProps = {}) {
	const embedded = ctxProp !== undefined;
	const [ctx, setCtx] = useState<CamCtx>(() => ctxProp ?? readCtxFromUrl());
	const [menu, setMenu] = useState<number>(() => {
		if (initialMenu) return initialMenu;
		const params = new URLSearchParams(window.location.search);
		return Number(params.get('menu')) || 1;
	});
	const [submenuIndex, setSubmenuIndex] = useState<number>(() => {
		if (initialSubmenu) return initialSubmenu;
		const params = new URLSearchParams(window.location.search);
		return Number(params.get('submenu')) || 1;
	});

	const [visited, setVisited] = useState<Set<ViewKey>>(new Set());

	useEffect(() => {
		setVisited(new Set());
	}, [ctx.apless, ctx.applno]);

	const submenuItems = useMemo(() => getSubmenu(menu, ctx), [menu, ctx]);

	useEffect(() => {
		if (submenuIndex < 1 || submenuIndex > submenuItems.length) {
			setSubmenuIndex(1);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [menu]);

	useEffect(() => {
		if (embedded) return;
		const params = new URLSearchParams(window.location.search);
		params.set('menu', String(menu));
		params.set('submenu', String(submenuIndex));
		window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
	}, [embedded, menu, submenuIndex]);

	const { data: headerData } = useQuery({
		queryKey: ['cam-header', ctx.apless, ctx.applno],
		queryFn: async () => {
			const res = await api.get('/CAM/EditIndex/header', {
				params: { apless: ctx.apless, applno: ctx.applno },
			});
			return res.data;
		},
		enabled: Boolean(ctx.apless || ctx.applno),
	});

	useEffect(() => {
		if (headerData?.custName) {
			setCtx(prev => ({ ...prev, custName: headerData.custName }));
		}
	}, [headerData?.custName]);

	const judul = [ctx.finType, ctx.applno, ctx.custName].filter(Boolean).join(' - ');

	const activeSubmenu = submenuItems[submenuIndex - 1];

	useEffect(() => {
		if (!activeSubmenu || !IMPLEMENTED_VIEWS[activeSubmenu.view]) return;
		setVisited(prev => (prev.has(activeSubmenu.view) ? prev : new Set(prev).add(activeSubmenu.view)));
	}, [activeSubmenu]);

	const goHome = () => {
		if (onHome) {
			onHome();
		} else {
			window.location.href = '/cam_onhand';
		}
	};

	return (
		<div className="fixed inset-0 z-50 h-screen overflow-y-auto bg-[var(--app-surface-alt)] p-3 md:p-6">
			<div className="w-full">
				<div className="mb-4 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-4 text-white shadow sm:flex-row sm:items-center sm:justify-between sm:px-6">
					<div>
						<h1 className="text-lg font-semibold">CAM Review</h1>
						{ctx.custName ? (
							<p className="text-xs text-white/80">
								{ctx.custName}{ctx.applno ? ` · ${ctx.applno}` : ''}
							</p>
						) : (
							<p className="text-sm text-blue-100">
								APLESS {ctx.apless || '-'} &middot; Application {ctx.applno || '-'}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={goHome}
						aria-label="Close"
						className="self-start rounded-lg bg-[var(--app-card)]/10 px-3 py-1.5 text-sm font-medium transition hover:bg-[var(--app-card)]/20 sm:self-auto"
					>
						{embedded ? '✕ Close' : 'Home'}
					</button>
				</div>

				<div className="mb-3 flex flex-wrap gap-1 rounded-2xl bg-[var(--app-card)] p-2 shadow">
					{TOP_MENU.map((item) => (
						<button
							key={item.key}
							type="button"
							onClick={() => setMenu(item.key)}
							className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${menu === item.key ? 'bg-blue-600 text-white' : 'text-[var(--app-muted)] hover:bg-[var(--app-surface-alt)]'
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
							className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${submenuIndex === idx + 1 ? 'bg-orange-500 text-white' : 'text-[var(--app-muted)] hover:bg-[var(--app-surface-alt)]'
								}`}
						>
							{item.label}
						</button>
					))}
				</div>

				{judul && (
					<div className="judul mb-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-right text-xs font-semibold text-blue-400 shadow sm:px-6">
						{judul}
					</div>
				)}

				<div>
					{ALL_VIEW_KEYS.filter((key) => visited.has(key)).map((key) => {
						const Comp = IMPLEMENTED_VIEWS[key]!;
						const isActive = activeSubmenu?.view === key;
						return (
							<div key={key} style={{ display: isActive ? 'block' : 'none' }}>
								<Suspense fallback={<TabLoading />}>
									<Comp ctx={ctx} />
								</Suspense>
							</div>
						);
					})}

					{activeSubmenu && !IMPLEMENTED_VIEWS[activeSubmenu.view] && (
						<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
							<p className="text-base font-medium text-[var(--app-text)]">
								{activeSubmenu?.label || 'This tab'} hasn&apos;t been migrated yet
							</p>
							<p className="mt-1 text-sm text-[var(--app-muted)]">
								The legacy source for this tab wasn&apos;t part of this conversion, so there&apos;s nothing to
								render here yet.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
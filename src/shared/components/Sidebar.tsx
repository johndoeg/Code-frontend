import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MODAL_ROUTES } from '@/shared/config/modalRoutes';
import api from '@/shared/api/axiosInstance';
import { useAuth } from '@/shared/contexts/AuthContext';
import "./Sidebar.css";

interface MenuItem {
	menu_id: string;
	menu_desc: string;
	url?: string;
	menu_parent: string;
	children?: MenuItem[];
}

interface SidebarProps {
	open: boolean;
	mini: boolean;
	onClose: () => void;
}

const EXPANDED_W = 260;
const COLLAPSED_W = 52;
const MAX_WIDTH_CAP = 480;
const DRAG_THRESHOLD = 4;
const KEY_STEP = 16;
const CLOSE_AT = 190;

let _measureCanvas: HTMLCanvasElement | null = null;
function measureTextWidth(text: string, font: string): number {
	if (!_measureCanvas) _measureCanvas = document.createElement("canvas");
	const ctx = _measureCanvas.getContext("2d");
	if (!ctx) return text.length * 8;
	ctx.font = font;
	return ctx.measureText(text).width;
}

const TOP_FONT = "500 14.72px Inter, -apple-system, BlinkMacSystemFont, sans-serif";
const CHILD_FONT = "400 13.44px Inter, -apple-system, BlinkMacSystemFont, sans-serif";

const TOP_ICON_W = 40;
const TOP_CHEVRON_W = 14 + 10;
const TOP_MARGIN_X = 8 * 2;
const TOP_SLACK = 16;

const CHILD_INDENT_STEP = 24 + 4;
const CHILD_ICON_W = 16 + 8;
const CHILD_PADDING_X = 14 + 8 + CHILD_ICON_W;
const CHILD_SLACK = 16;

function computeMaxSidebarWidth(items: MenuItem[]): number {
	let max = EXPANDED_W;

	const walk = (list: MenuItem[], depth: number, indent: number) => {
		list.forEach((item) => {
			const hasChildren = !!item.children?.length;
			let needed: number;

			if (depth === 0) {
				const textW = measureTextWidth(item.menu_desc, TOP_FONT);
				needed = TOP_ICON_W + textW + TOP_MARGIN_X + TOP_SLACK + (hasChildren ? TOP_CHEVRON_W : 0);
			} else {
				const textW = measureTextWidth(item.menu_desc, CHILD_FONT);
				needed = indent + CHILD_PADDING_X + textW + CHILD_SLACK + (hasChildren ? 12 : 0);
			}

			if (needed > max) max = needed;
			if (hasChildren) walk(item.children!, depth + 1, indent + CHILD_INDENT_STEP);
		});
	};

	walk(items, 0, CHILD_INDENT_STEP);
	return Math.ceil(max);
}

function SidebarLink({
	to,
	className,
	dataTip,
	title,
	style,
	onNavigate,
	navState,
	children,
}: {
	to: string;
	className?: string;
	dataTip?: string;
	title?: string;
	style?: React.CSSProperties;
	onNavigate?: () => void;
	navState?: { background: Location };
	children: React.ReactNode;
}) {
	const navigate = useNavigate();

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

		e.preventDefault();
		navigate(to, navState ? { state: navState } : undefined);
		onNavigate?.();
	};

	return (
		<a href="/" className={className} data-tip={dataTip} title={title} style={style} onClick={handleClick}>
			{children}
		</a>
	);
}

function IconSidebar() {
	return (
		<svg viewBox="0 0 20 20" fill="currentColor">
			<path fillRule="evenodd" clipRule="evenodd"
				d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 1v10h3V5H5zm5 0v10h5V5h-5z" />
		</svg>
	);
}

function IconLogout({ size = 16 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
			<path d="M7.5 17.5H4.5A1.5 1.5 0 013 16V4a1.5 1.5 0 011.5-1.5h3" />
			<path d="M13 14l4-4-4-4" />
			<path d="M17 10H7.5" />
		</svg>
	);
}

const ICON_PATHS: Record<string, string[]> = {
	home: ["M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"],
	cog: ["M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"],
	users: ["M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"],
	userSingle: ["M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"],
	chart: ["M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"],
	badgeCheck: ["M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"],
	creditCard: ["M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"],
	refresh: ["M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"],
	database: ["M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z", "M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z", "M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"],
	monitor: ["M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z"],
	checkCircle: ["M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"],
	xCircle: ["M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"],
	clock: ["M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"],
	inbox: ["M5 3a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2v-2a2 2 0 00-2-2H5z"],
	plusCircle: ["M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"],
	truck: ["M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z", "M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"],
	building: ["M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"],
	tag: ["M17.707 9.293l-5-5A1 1 0 0012 4H7a3 3 0 00-3 3v5c0 .256.098.512.293.707l5 5a1 1 0 001.414 0l7-7a1 1 0 000-1.414zM6 6a1 1 0 100 2 1 1 0 000-2z"],
	collection: ["M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"],
	shield: ["M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"],
	eye: ["M10 12a2 2 0 100-4 2 2 0 000 4z", "M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"],
	ban: ["M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z"],
	sliders: ["M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"],
	clipboard: ["M9 2a1 1 0 000 2h2a1 1 0 100-2H9z", "M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"],
	cash: ["M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z", "M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"],
	calendar: ["M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"],
	archive: ["M4 3a2 2 0 100 4h12a2 2 0 100-4H4z", "M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"],
	mail: ["M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z", "M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"],
	key: ["M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z"],
	list: ["M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 12a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"],
	docReport: ["M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z"],
	document: ["M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"],
};

const MENU_ICON_RULES: Array<[RegExp, keyof typeof ICON_PATHS]> = [
	[/dashboard|home|beranda/, "home"],
	[/reject|ditolak/, "xCircle"],
	[/approval|persetujuan|approver/, "badgeCheck"],
	[/approved|disetujui/, "checkCircle"],
	[/in ?progress|onprocess|berjalan/, "clock"],
	[/on ?hand|inbox/, "inbox"],
	[/prechecking|checking|verif/, "shield"],
	[/watchlist/, "eye"],
	[/blacklist|ttot|teroris/, "ban"],
	[/insurance|asuransi|raksa|simas/, "shield"],
	[/invoice|tagihan|espay|va list|virtual account/, "cash"],
	[/commission|komisi|incentive|insentif/, "cash"],
	[/disburse|jurnal|financing|pencairan/, "creditCard"],
	[/aging|amortization|amortisasi/, "chart"],
	[/payment|bayar|pelunasan|transaksi|history/, "refresh"],
	[/dealer|supplier|karoseri/, "building"],
	[/sales|salesman/, "userSingle"],
	[/brand|vehicle|model|equipment|kendaraan|gps/, "truck"],
	[/group|grup/, "collection"],
	[/ratio|deviation|threshold|npf/, "sliders"],
	[/industr/, "tag"],
	[/ojk|slik|sipesat|silaras|form.?10|fiducia|fidusia/, "clipboard"],
	[/employee|karyawan|pegawai/, "userSingle"],
	[/memo|surat|mail/, "mail"],
	[/access|hak akses|role|permission/, "key"],
	[/user|pengguna|nasabah|pelanggan/, "users"],
	[/menu/, "list"],
	[/entry|add|input|tambah|create|new/, "plusCircle"],
	[/summary|rekap|schedule|periode|monthly|daily|date/, "calendar"],
	[/archive|arsip|delete|deleted|hapus/, "archive"],
	[/master|data/, "database"],
	[/report|laporan|rpt|analytic|statistik/, "docReport"],
	[/list|daftar/, "list"],
	[/cam|loan|kredit|pembiayaan|contract|kontrak/, "creditCard"],
	[/monitor|status/, "monitor"],
	[/setting|config|parameter|pengaturan/, "cog"],
];

function iconNameFor(label: string): keyof typeof ICON_PATHS {
	const l = (label || "").toLowerCase();
	for (const [pattern, name] of MENU_ICON_RULES) {
		if (pattern.test(l)) return name;
	}
	return "document";
}

function MenuIcon({ label, size = 16 }: { label: string; size?: number }) {
	const paths = ICON_PATHS[iconNameFor(label)] ?? ICON_PATHS.document;
	return (
		<svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			{paths.map((d, i) => (
				<path key={i} fillRule="evenodd" clipRule="evenodd" d={d} />
			))}
		</svg>
	);
}

function MenuNode({ item, collapsed, depth = 0, resetKey, currentPath, onNavigate, modalBackground }: {
	item: MenuItem; collapsed: boolean; depth?: number; resetKey: number; currentPath: string; onNavigate?: () => void; modalBackground: Location;
}) {
	const normalizedUrl = item.url ? normalizeUrl(item.url) : null;
	const isActive = !!normalizedUrl && currentPath === normalizedUrl;
	const hasChildren = !!item.children?.length;
	const hasActiveChild = hasChildren && item.children!.some(c => c.url && currentPath === normalizeUrl(c.url));
	const [open, setOpen] = useState(hasActiveChild);

	const icon = useMemo(
		() => <MenuIcon label={item.menu_desc} size={depth === 0 ? 16 : 13} />,
		[item.menu_desc, depth]
	);

	useEffect(() => { if (resetKey > 0) setOpen(false); }, [resetKey]);
	useEffect(() => { if (hasActiveChild) setOpen(true); }, [currentPath]);
	const toggle = () => setOpen(p => !p);

	if (depth === 0) {
		const row = (
			<>
				<span className="sb-icon">{icon}</span>
				<span className="sb-label" title={item.menu_desc}>{item.menu_desc}</span>
				{hasChildren && (
					<svg className={`sb-chevron${open ? " open" : ""}`} viewBox="0 0 20 20" fill="currentColor">
						<path fillRule="evenodd" clipRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
					</svg>
				)}
			</>
		);
		return (
			<li style={{ listStyle: "none" }}>
				{normalizedUrl && !hasChildren
					? <SidebarLink
						to={normalizedUrl}
						className={`sb-item${isActive ? " active" : ""}`}
						dataTip={collapsed ? item.menu_desc : undefined}
						onNavigate={onNavigate}
						navState={normalizedUrl && MODAL_ROUTES.has(normalizedUrl) ? { background: modalBackground } : undefined}
						style={{ textDecoration: "none" }}
					>{row}</SidebarLink>
					: <div className={`sb-item${isActive ? " active" : ""}`}
						data-tip={collapsed ? item.menu_desc : undefined}
						onClick={hasChildren ? toggle : undefined}
						style={{ cursor: hasChildren ? "pointer" : "default" }}>{row}</div>
				}
				{hasChildren && open && !collapsed && (
					<div className="sb-children">
						<ul style={{ padding: 0, margin: "2px 0" }}>
							{item.children!.map(c => (
								<MenuNode
									key={c.menu_id}
									item={c}
									collapsed={collapsed}
									depth={1}
									resetKey={resetKey}
									currentPath={currentPath}
									onNavigate={onNavigate}
									modalBackground={modalBackground}
								/>
							))}
						</ul>
					</div>
				)}
			</li>
		);
	}

	const childUrl = item.url ? normalizeUrl(item.url) : "#";
	const childActive = currentPath === childUrl;
	return (
		<li style={{ listStyle: "none" }}>
			{hasChildren ? (
				<>
					<div className={`sb-child-item${childActive ? " active" : ""}`} onClick={toggle} title={item.menu_desc}>
						<span className="sb-child-icon">{icon}</span>
						<span style={{ flex: 1 }}>{item.menu_desc}</span>
						<svg style={{ width: 12, height: 12, opacity: .4, flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform .18s" }} viewBox="0 0 20 20" fill="currentColor">
							<path fillRule="evenodd" clipRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
						</svg>
					</div>
					{open && (
						<div className="sb-children">
							<ul style={{ padding: "0 0 0 10px", margin: 0 }}>
								{item.children!.map(c => (
									<MenuNode
										key={c.menu_id}
										item={c}
										collapsed={collapsed}
										depth={1}
										resetKey={resetKey}
										currentPath={currentPath}
										onNavigate={onNavigate}
										modalBackground={modalBackground}
									/>
								))}
							</ul>
						</div>
					)}
				</>
			) : (
				<SidebarLink
					to={childUrl}
					className={`sb-child-item${childActive ? " active" : ""}`}
					title={item.menu_desc}
					onNavigate={onNavigate}
					navState={MODAL_ROUTES.has(childUrl) ? { background: modalBackground } : undefined}
					style={{ textDecoration: "none" }}
				>
					<span className="sb-child-icon">{icon}</span>
					<span style={{ flex: 1 }}>{item.menu_desc}</span>
				</SidebarLink>
			)}
		</li>
	);
}

export default function Sidebar({ open: _open, mini: _mini, onClose: _onClose }: SidebarProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const currentPath = location.pathname;
	const { logout } = useAuth();
	const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sb-collapsed") === "1");
	const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [resetKey, setResetKey] = useState(0);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const sidebarRef = useRef<HTMLDivElement>(null);

	const { data: menuData } = useQuery({
		queryKey: ["menus"],
		queryFn: () => api.get<MenuItem[]>("/menu/list-tree").then(r => r.data),
		staleTime: 5 * 60 * 1000,
	});
	const menuTree = useMemo(() => buildTree(menuData ?? []), [menuData]);

	const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
		const saved = Number(localStorage.getItem("sb-width"));
		return saved && !Number.isNaN(saved) ? saved : EXPANDED_W;
	});
	const [isResizing, setIsResizing] = useState(false);
	const [pointerDown, setPointerDown] = useState(false);
	const pointerDownRef = useRef(false);
	const startXRef = useRef(0);
	const draggedRef = useRef(false);
	const widthRef = useRef(sidebarWidth);
	const resizeTipRef = useRef<HTMLSpanElement>(null);
	useEffect(() => { widthRef.current = sidebarWidth; }, [sidebarWidth]);

	const maxWidth = useMemo(
		() => Math.max(EXPANDED_W, Math.min(MAX_WIDTH_CAP, computeMaxSidebarWidth(menuTree))),
		[menuTree]
	);

	useEffect(() => {
		if (!menuTree.length) return;
		setSidebarWidth(w => Math.min(Math.max(w, EXPANDED_W), maxWidth));
	}, [maxWidth, menuTree.length]);

	const hideSidebar = useCallback(() => {
		setCollapsed(true);
		localStorage.setItem("sb-collapsed", "1");
		setResetKey(k => k + 1);
	}, []);

	const startResize = useCallback((e: React.PointerEvent) => {
		if (isMobile || collapsed) return;
		e.preventDefault();
		e.stopPropagation();
		startXRef.current = e.clientX;
		draggedRef.current = false;
		pointerDownRef.current = true;
		setPointerDown(true);
	}, [isMobile, collapsed]);

	useEffect(() => {
		if (!pointerDown) return;

		const onMove = (e: PointerEvent) => {
			if (!pointerDownRef.current) return;

			if (!draggedRef.current) {
				if (Math.abs(e.clientX - startXRef.current) < DRAG_THRESHOLD) return;
				draggedRef.current = true;
				setIsResizing(true);
			}

			if (e.clientX < CLOSE_AT) {
				pointerDownRef.current = false;
				setPointerDown(false);
				setIsResizing(false);
				localStorage.setItem("sb-width", String(widthRef.current));
				hideSidebar();
				return;
			}

			const next = Math.min(maxWidth, Math.max(EXPANDED_W, e.clientX));
			widthRef.current = next;
			setSidebarWidth(next);
		};

		const onUp = () => {
			pointerDownRef.current = false;
			setPointerDown(false);

			if (draggedRef.current) {
				setIsResizing(false);
				localStorage.setItem("sb-width", String(widthRef.current));
			} else {
				hideSidebar();
			}
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
		return () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
		};
	}, [pointerDown, maxWidth, hideSidebar]);

	useEffect(() => {
		document.body.classList.toggle("sb-resizing", isResizing);
		return () => document.body.classList.remove("sb-resizing");
	}, [isResizing]);

	const positionResizeTip = useCallback((e: React.PointerEvent) => {
		const tip = resizeTipRef.current;
		if (!tip) return;
		const top = Math.min(Math.max(e.clientY - 24, 8), window.innerHeight - 72);
		tip.style.top = top + "px";
		tip.style.left = (e.clientX + 14) + "px";
	}, []);

	const handleResizeKey = useCallback((e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			hideSidebar();
			return;
		}

		let next: number | null = null;
		if (e.key === "ArrowLeft") {
			if (widthRef.current <= EXPANDED_W) {
				e.preventDefault();
				hideSidebar();
				return;
			}
			next = widthRef.current - KEY_STEP;
		}
		else if (e.key === "ArrowRight") next = widthRef.current + KEY_STEP;
		else if (e.key === "Home") next = EXPANDED_W;
		else if (e.key === "End") next = maxWidth;
		if (next === null) return;

		e.preventDefault();
		const clamped = Math.min(maxWidth, Math.max(EXPANDED_W, next));
		widthRef.current = clamped;
		setSidebarWidth(clamped);
		localStorage.setItem("sb-width", String(clamped));
	}, [maxWidth, hideSidebar]);

	useEffect(() => {
		let raf = 0;
		const check = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => {
				const m = window.innerWidth < 768;
				setIsMobile(m);
				if (!m) setMobileOpen(false);
			});
		};
		window.addEventListener("resize", check);
		return () => {
			window.removeEventListener("resize", check);
			cancelAnimationFrame(raf);
		};
	}, []);

	useEffect(() => {
		const h = (e: MouseEvent) => {
			if (isMobile && mobileOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node))
				setMobileOpen(false);
		};
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, [isMobile, mobileOpen]);

	const toggle = useCallback(() => {
		if (isMobile) {
			setMobileOpen(prev => !prev);
		} else {
			setCollapsed(prev => {
				const next = !prev;
				localStorage.setItem("sb-collapsed", next ? "1" : "0");
				return next;
			});
			setResetKey(k => k + 1);
		}
	}, [isMobile]);

	const expandSidebar = useCallback(() => {
		if (isMobile || !collapsed) return;
		setCollapsed(false);
		localStorage.setItem("sb-collapsed", "0");
		setResetKey(k => k + 1);
	}, [isMobile, collapsed]);

	const handleShellClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		const target = e.target as HTMLElement;
		if (target.closest('.sb-item, .sb-child-item, .sb-toggle-btn, .sb-header-link, .sb-resize-handle, a, button')) return;
		expandSidebar();
	}, [expandSidebar]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.key === ".") { e.preventDefault(); toggle(); }
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [toggle]);

	const handleMobileNavigate = useCallback(() => {
		if (isMobile) setMobileOpen(false);
	}, [isMobile]);

	const handleLogout = useCallback(async () => {
		if (isLoggingOut) return;
		if (!confirm("Are you sure you want to log out?")) return;

		setIsLoggingOut(true);
		try {
			await logout();
		} catch (e) {
			console.error("Logout failed:", e);
		} finally {
			setIsLoggingOut(false);
			navigate("/login", { replace: true });
		}
	}, [isLoggingOut, logout, navigate]);

	if (window.self !== window.top) return null;

	const sidebarCls = isMobile
		? (mobileOpen ? "sb-shell mobile-open" : "sb-shell mobile-closed")
		: (collapsed ? "sb-shell collapsed" : "sb-shell expanded");

	const currentW = isMobile ? 0 : (collapsed ? COLLAPSED_W : sidebarWidth);

	const shellStyle: React.CSSProperties | undefined = isMobile
		? undefined
		: {
			width: collapsed ? COLLAPSED_W : sidebarWidth,
			transition: isResizing ? "none" : undefined,
		};

	return (
		<>
			{isMobile && !mobileOpen && (
				<button
					className="sb-hamburger"
					onClick={() => setMobileOpen(true)}
					aria-label="Open menu"
					aria-expanded={false}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
						<line x1="3" y1="6" x2="21" y2="6" />
						<line x1="3" y1="12" x2="21" y2="12" />
						<line x1="3" y1="18" x2="21" y2="18" />
					</svg>
				</button>
			)}

			{isMobile && mobileOpen && (
				<div className="sb-overlay" onClick={() => setMobileOpen(false)} />
			)}

			<div ref={sidebarRef} className={sidebarCls} style={shellStyle} onClick={handleShellClick}>

				<div className="sb-header">
					<Link to="/" className="sb-header-link" aria-label="Go to home" onClick={handleMobileNavigate}>
						<div className="sb-logo" aria-hidden="true">
							<img src="/images/new_logo_genie.png" alt=""
								onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
							<span className="sb-logo-fb">G</span>
						</div>
						<div className="sb-appname">
							<div className="sb-appname-title">Genie</div>
							<div className="sb-appname-sub">CAM</div>
						</div>
					</Link>

					{!isMobile && (
						<button
							className="sb-toggle-btn"
							onClick={toggle}
							aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
							onMouseEnter={e => {
								const tip = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".sb-tip");
								if (!tip) return;
								const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
								tip.style.top = (r.bottom + 8) + "px";
								tip.style.left = Math.max(8, r.left + r.width / 2 - 70) + "px";
							}}
						>
							<IconSidebar />
							<span className="sb-tip">
								<span className="sb-tip-label">{collapsed ? "Open sidebar" : "Close sidebar"}</span>
								<span className="sb-tip-kbd"><kbd>Ctrl</kbd><span>+</span><kbd>.</kbd></span>
							</span>
						</button>
					)}

					{isMobile && (
						<button
							className="sb-toggle-btn"
							onClick={() => setMobileOpen(false)}
							aria-label="Close sidebar"
						>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
								<line x1="18" y1="6" x2="6" y2="18" />
								<line x1="6" y1="6" x2="18" y2="18" />
							</svg>
						</button>
					)}
				</div>

				<div className="sb-scroll">
					<div className="sb-section-head">Menu</div>
					<ul style={{ padding: 0, margin: 0 }}>
						{menuTree.map(item => (
							<MenuNode
								key={item.menu_id}
								item={item}
								collapsed={collapsed && !isMobile}
								resetKey={resetKey}
								currentPath={currentPath}
								onNavigate={handleMobileNavigate}
								modalBackground={location}
							/>
						))}
					</ul>
				</div>

				<div className="sb-footer">
					<button
						type="button"
						className="sb-item sb-logout"
						data-tip={(collapsed && !isMobile) ? "Logout" : undefined}
						onClick={handleLogout}
						disabled={isLoggingOut}
					>
						<span className="sb-icon">
							{isLoggingOut
								? <svg className="sb-spin" width={16} height={16} viewBox="0 0 24 24" fill="none">
									<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25" />
									<path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
								</svg>
								: <IconLogout />}
						</span>
						<span className="sb-label">{isLoggingOut ? "Logging out..." : "Logout"}</span>
					</button>
				</div>

			</div>

			{!isMobile && !collapsed && (
				<div
					className={`sb-resize-handle${isResizing ? " active" : ""}`}
					style={{ left: sidebarWidth }}
					onPointerDown={startResize}
					onPointerEnter={positionResizeTip}
					onPointerMove={positionResizeTip}
					onKeyDown={handleResizeKey}
					role="separator"
					tabIndex={0}
					aria-orientation="vertical"
					aria-label="Hide sidebar, or drag to resize"
					aria-valuenow={sidebarWidth}
					aria-valuemin={EXPANDED_W}
					aria-valuemax={maxWidth}
				>
					<div aria-hidden="true" className="sb-resize-surface" />
					<div aria-hidden="true" className="sb-resize-pill" />
					<span className="sb-resize-tip" ref={resizeTipRef}>
						<span className="sb-tip-label">Hide sidebar</span>
						<span className="sb-tip-kbd"><kbd>Ctrl</kbd><span>+</span><kbd>.</kbd></span>
						<span className="sb-resize-tip-hint">Drag to resize</span>
					</span>
				</div>
			)}

			{!isMobile && (
				<div style={{ width: currentW, flexShrink: 0, transition: isResizing ? "none" : `width 220ms cubic-bezier(.4,0,.2,1)` }} />
			)}
		</>
	);
}

function buildTree(items: MenuItem[]): MenuItem[] {
	const map: Record<string, MenuItem> = {};
	const roots: MenuItem[] = [];
	items.forEach(i => (map[i.menu_id] = { ...i, children: [] }));
	items.forEach(i => {
		if (i.menu_parent && i.menu_parent !== "0") map[i.menu_parent]?.children?.push(map[i.menu_id]);
		else roots.push(map[i.menu_id]);
	});
	return roots;
}

const URL_OVERRIDES: Record<string, string> = {
	"module_espay/invoice.php": "/espay-invoice",
	"module_h2h/invoice.php": "/delima-invoice",
};

function normalizeUrl(oldUrl: string): string {
	if (!oldUrl) return "#";

	const key = oldUrl.replace(/^\/+/, "").toLowerCase();
	if (URL_OVERRIDES[key]) return URL_OVERRIDES[key];

	return "/" + oldUrl
		.replace(/^(module_cam|module_other|module_h2h|module_espay|module_ojk|module_hr)\//, "")
		.replace(/\.php$/, "")
		.replace(/_/g, "-");
}
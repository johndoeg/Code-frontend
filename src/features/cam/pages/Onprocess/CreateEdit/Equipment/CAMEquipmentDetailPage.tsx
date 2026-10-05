import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import AsOfDatePickerComponent from '@/shared/components/AsOfDatePickerComponent';

export interface CAMEquipmentDetailPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	purpoffinc: string;
	newCar: string;
	conttype?: string;
	onSaved: (result: { apless: string; applno: string; c2c?: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

interface Option {
	value: string;
	label: string;
}

interface SupplierResult {
	supp: string;
	name: string;
	nickname: string;
	address: string;
	city: string;
	phone: string;
	contact: string;
	suppType: string;
}

type SupplierCategory = "dealer" | "karoseri" | "accessories" | "other";

const inputCls =
	"border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400";
const readonlyCls =
	"border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full bg-[var(--app-surface-alt)] text-[var(--app-muted)]";
const labelCls = "text-sm text-[var(--app-muted)] pt-1.5";
const linkLabelCls = "text-sm text-blue-700 underline hover:text-blue-400 text-left pt-1.5";
const sectionCls = "rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-5 shadow-sm";
const selectCls = (editable: boolean) =>
	`border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${editable ? "bg-[var(--app-card)]" : "bg-[var(--app-surface-alt)] text-[var(--app-muted)] cursor-not-allowed"
	}`;

const EMPTY_FORM = {
	supp: "", suppName: "", suppAddress: "", suppType: "", typeCd: "07",
	brand: "", type: "", model: "", tahun: "",
	chasis: "", engine: "", colour: "", policeno: "",
	userusage: "", purpose: "",
	karoseri: "", karoseriSupp: "", karoseriName: "", karoseriAddress: "",
	accessoriesSupp: "", accessoriesName: "", accessoriesAddress: "",
	otherSupp: "", otherName: "", otherAddress: "",
	parkLoc: "", parkZipcode: "", cityPark: "",
	wheels: "", stnkValidDt: "", fundPurpose: "", finPurpose: "",
	ojkFinGoods: "", ojkFinGoodsDetail: "", ojkCollGoods: "", ojkCollGoodsDetail: "",
	redCode: false, gpsVendor: "",
};

const WHEELS_INPUT_MODELS = ["05", "06", "07", "09", "10", "21"];

const CONDITION_OPTIONS: Option[] = [
	{ value: "NEW", label: "New" },
	{ value: "USED", label: "Used" },
];

const FIN_PURPOSE_OJK_MAP: Record<string, [string, string]> = {
	"06": ["J", "e56"], "07": ["J", "e57"], "09": ["J", "e61"], "10": ["J", "e58"],
	"11": ["J", "e61"], "12": ["J", "e59"], "51": ["P", "e2"], "52": ["P", "e3"],
	"53": ["P", "e5"], "54": ["P", "e6"], "55": ["P", "e7"], "56": ["P", "e8"],
	"57": ["P", "e9"], "58": ["P", "e86"], "59": ["P", "e87"], "60": ["P", "e11"],
	"61": ["P", "e20"], "62": ["J", "e61"],
};

const W61_FUND_PURPOSE = "Pembelian Kendaraan Bermotor (mobil) untuk Kegiatan usaha Debitur";

const SUPPLIER_MODAL_TITLE: Record<SupplierCategory, string> = {
	dealer: "List Dealer",
	karoseri: "List Dealer of Karoseri",
	accessories: "List Dealer of Accessories",
	other: "List Dealer of Others",
};

const parseISODate = (value: string): Date | null => {
	if (!value) return null;
	const [y, m, d] = value.slice(0, 10).split("-").map(Number);
	if (!y || !m || !d) return null;
	return new Date(y, m - 1, d);
};

const toISODate = (value: Date | null): string => {
	if (!value) return "";
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

function Row({ label, labelNode, children }: {
	label?: string;
	labelNode?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="grid grid-cols-3 items-start gap-2 py-1">
			<div className="col-span-1">{labelNode ?? <span className={labelCls}>{label}</span>}</div>
			<div className="col-span-2">{children}</div>
		</div>
	);
}

function SupplierSearchModal({
	open, category, newCar, onClose, onSelect,
}: {
	open: boolean;
	category: SupplierCategory;
	newCar: string;
	onClose: () => void;
	onSelect: (r: SupplierResult) => void;
}) {
	const [term, setTerm] = useState("");
	const [query, setQuery] = useState("");
	const [allBranch, setAllBranch] = useState(false);
	const [page, setPage] = useState(1);
	const [rows, setRows] = useState<SupplierResult[]>([]);
	const [total, setTotal] = useState(0);
	const [pageSize, setPageSize] = useState(20);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		setTerm("");
		setQuery("");
		setAllBranch(false);
		setPage(1);
	}, [open]);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const res = await api.get("/CAM/EditIndex/suppliers", {
					params: { category, name: query, newCar, allBranch: allBranch ? "1" : "0", page },
				});
				if (cancelled) return;
				setRows(res.data?.items || []);
				setTotal(res.data?.total || 0);
				setPageSize(res.data?.pageSize || 20);
			} catch {
				if (!cancelled) { setRows([]); setTotal(0); }
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => { cancelled = true; };
	}, [open, category, query, newCar, allBranch, page]);

	if (!open) return null;

	const lastPage = Math.max(1, Math.ceil(total / pageSize));

	const search = () => { setPage(1); setQuery(term); };

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 sm:p-8">
			<div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-xl">
				<div className="judul flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2">
					<strong className="text-sm font-semibold text-blue-400">{SUPPLIER_MODAL_TITLE[category]}</strong>
					<button type="button" onClick={onClose} className="text-sm text-[var(--app-muted)] hover:underline">
						Close
					</button>
				</div>

				<div className="flex flex-wrap items-center gap-2 border-b border-[var(--app-border)] px-4 py-3">
					<span className="text-sm text-[var(--app-muted)]">Dealer Name</span>
					<input
						autoFocus
						className={`${inputCls} w-56`}
						value={term}
						onChange={e => setTerm(e.target.value)}
						onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
					/>
					<label className="flex items-center gap-1 text-sm text-[var(--app-muted)]">
						<input
							type="checkbox"
							checked={allBranch}
							onChange={e => { setAllBranch(e.target.checked); setPage(1); }}
						/>
						All Branches
					</label>
					<button
						type="button"
						onClick={search}
						className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
					>
						Search
					</button>
				</div>

				<div className="max-h-[55vh] overflow-auto">
					<table className="w-full text-sm">
						<thead className="table_head sticky top-0 bg-[var(--app-surface)] text-left">
							<tr>
								<th className="px-3 py-2 font-semibold">Dealer Code</th>
								<th className="px-3 py-2 font-semibold">Dealer Name</th>
								<th className="px-3 py-2 font-semibold">Dealer Nickname</th>
								<th className="px-3 py-2 font-semibold">Address</th>
								<th className="px-3 py-2 font-semibold">Phone</th>
								<th className="px-3 py-2 font-semibold">Contact Person</th>
							</tr>
						</thead>
						<tbody>
							{loading ? (
								<tr><td colSpan={6} className="px-3 py-6 text-center text-[var(--app-muted)]">Searching…</td></tr>
							) : rows.length === 0 ? (
								<tr><td colSpan={6} className="px-3 py-6 text-center text-[var(--app-muted)]">No results.</td></tr>
							) : rows.map((r, i) => (
								<tr key={r.supp} className={i % 2 === 0 ? "bg-[var(--app-surface-alt)]" : ""}>
									<td className="px-3 py-1.5 align-top">
										<button
											type="button"
											onClick={() => { onSelect(r); onClose(); }}
											className="text-blue-700 underline hover:text-blue-400"
										>
											{r.supp}
										</button>
									</td>
									<td className="px-3 py-1.5 align-top">{r.name}</td>
									<td className="px-3 py-1.5 align-top">{r.nickname}</td>
									<td className="px-3 py-1.5 align-top">{r.address}</td>
									<td className="px-3 py-1.5 align-top">{r.phone}</td>
									<td className="px-3 py-1.5 align-top">{r.contact}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<div className="flex items-center justify-between border-t border-[var(--app-border)] px-4 py-2 text-sm text-[var(--app-muted)]">
					<span>{total} record(s)</span>
					<div className="flex items-center gap-2">
						<button
							type="button"
							disabled={page <= 1}
							onClick={() => setPage(p => Math.max(1, p - 1))}
							className="rounded-lg px-2 py-1 hover:bg-[var(--app-surface-alt)] disabled:opacity-40"
						>
							Prev
						</button>
						<span>{page} / {lastPage}</span>
						<button
							type="button"
							disabled={page >= lastPage}
							onClick={() => setPage(p => Math.min(lastPage, p + 1))}
							className="rounded-lg px-2 py-1 hover:bg-[var(--app-surface-alt)] disabled:opacity-40"
						>
							Next
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

const CAMEquipmentDetailPage = forwardRef<CamTabHandle, CAMEquipmentDetailPageProps>(function CAMEquipmentDetailPage({ apless, applNo, finType, custName, purpoffinc, newCar, conttype = "", onSaved }, ref) {
	const condition = newCar === "2" ? "NEW" : newCar === "1" ? "USED" : "";

	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [d, setD] = useState(EMPTY_FORM);
	const [cleared, setCleared] = useState({ karoseri: false, accessories: false, other: false });
	const [picker, setPicker] = useState<SupplierCategory | null>(null);

	const [brands, setBrands] = useState<Option[]>([]);
	const [models, setModels] = useState<Option[]>([]);
	const [types, setTypes] = useState<Option[]>([]);
	const [dealerTypes, setDealerTypes] = useState<Option[]>([]);
	const [equipmentTypes, setEquipmentTypes] = useState<Option[]>([]);
	const [karoseriOptions, setKaroseriOptions] = useState<Option[]>([]);
	const [purposes, setPurposes] = useState<Option[]>([]);
	const [areas, setAreas] = useState<Option[]>([]);
	const [gpsVendors, setGpsVendors] = useState<Option[]>([]);
	const [financingPurposes, setFinancingPurposes] = useState<Option[]>([]);
	const [ojkFinGoods, setOjkFinGoods] = useState<Option[]>([]);
	const [ojkFinGoodsDetailOpts, setOjkFinGoodsDetailOpts] = useState<Option[]>([]);
	const [ojkCollGood, setOjkCollGood] = useState<Option | null>(null);
	const [ojkCollGoodDetail, setOjkCollGoodDetail] = useState<Option[]>([]);
	const [wheelsRequired, setWheelsRequired] = useState(false);
	const [showFinancingPurpose, setShowFinancingPurpose] = useState(false);
	const [showFundPurpose, setShowFundPurpose] = useState(false);
	const [showOjkFinGoods, setShowOjkFinGoods] = useState(false);
	const [ojkFinGoodsRequired, setOjkFinGoodsRequired] = useState(true);
	const [ojkFinGoodsDisabled, setOjkFinGoodsDisabled] = useState(false);
	const [canSearchDealer, setCanSearchDealer] = useState(false);
	const [canSearchSupplier, setCanSearchSupplier] = useState(false);

	const set = (key: keyof typeof EMPTY_FORM, value: string | boolean) => setD(prev => ({ ...prev, [key]: value }));

	const applyLoadedData = useCallback((res: any) => {
		const eq = res.equipment;
		if (eq) {
			setD({
				...EMPTY_FORM,
				...eq,
				wheels: eq.wheels != null ? String(eq.wheels) : "",
			});
		}
		const lk = res.lookups || {};
		setBrands(lk.brands || []);
		setModels(lk.models || []);
		setTypes(lk.types || []);
		setDealerTypes(lk.dealerTypes || []);
		setEquipmentTypes(lk.equipmentTypes || []);
		setKaroseriOptions(lk.karoseri || []);
		setPurposes(lk.purposes || []);
		setAreas(lk.areas || []);
		setGpsVendors(lk.gpsVendors || []);
		setFinancingPurposes(lk.financingPurposes || []);
		setOjkFinGoods(lk.ojkFinGoods || []);
		setOjkFinGoodsDetailOpts(lk.ojkFinGoodsDetail || []);
		setOjkCollGood(lk.ojkCollGood || null);
		setOjkCollGoodDetail(lk.ojkCollGoodDetail || []);
		setWheelsRequired(!!lk.wheelsRequired);
		setShowFinancingPurpose(!!res.showFinancingPurpose);
		setShowFundPurpose(!!res.showFundPurpose);
		setShowOjkFinGoods(!!res.showOjkFinGoods);
		setOjkFinGoodsRequired(res.ojkFinGoodsRequired !== false);
		setOjkFinGoodsDisabled(!!res.ojkFinGoodsDisabled);
		setCanSearchDealer(!!res.canSearchDealer);
		setCanSearchSupplier(!!res.canSearchSupplier);
		setCleared({ karoseri: false, accessories: false, other: false });
	}, []);

	const { data, isLoading: loading, isError } = useQuery({
		queryKey: ['cam-equipment', apless, applNo, finType, purpoffinc, newCar, conttype],
		queryFn: async () => {
			const res = await api.get("/CAM/EditIndex/equipment", {
				params: { apless, applno: applNo, finType, purpoffinc, newCar, conttype },
			});
			return res.data;
		},
	});

	useEffect(() => {
		if (data) applyLoadedData(data);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	const fundPurposeLocked = finType === "W" && d.finPurpose === "61";
	useEffect(() => {
		if (fundPurposeLocked && d.fundPurpose !== W61_FUND_PURPOSE) {
			set("fundPurpose", W61_FUND_PURPOSE);
		}
	}, [fundPurposeLocked, d.fundPurpose]);

	const refreshModelOptions = useCallback(async (brand: string, model: string) => {
		try {
			const res = await api.get("/CAM/EditIndex/equipment/model-options", {
				params: { brand, model, newCar, purpoffinc, finType, ojkCollGoodsDetail: d.ojkCollGoodsDetail },
			});
			setTypes(res.data.types || []);
			setKaroseriOptions(res.data.karoseri || []);
			setOjkCollGood(res.data.ojkCollGood || null);
			setOjkCollGoodDetail(res.data.ojkCollGoodDetail || []);
			setWheelsRequired(!!res.data.wheelsRequired);
			setD(prev => ({
				...prev,
				ojkCollGoods: res.data.ojkCollGood?.value || "",
				ojkCollGoodsDetail: res.data.ojkCollGoodDetail?.[0]?.value || "",
				wheels: model && !res.data.wheelsRequired ? "4" : prev.wheels,
			}));
		} catch { }
	}, [newCar, purpoffinc, finType, d.ojkCollGoodsDetail]);

	const handleBrandChange = (value: string) => {
		set("brand", value);
		set("type", "");
		refreshModelOptions(value, d.model);
	};

	const handleModelChange = (value: string) => {
		setD(prev => ({ ...prev, model: value, type: "", karoseri: "" }));
		refreshModelOptions(d.brand, value);
	};

	const handleFinGoodChange = async (value: string) => {
		set("ojkFinGoods", value);
		set("ojkFinGoodsDetail", "");
		if (!value) {
			setOjkFinGoodsDetailOpts([]);
			return;
		}
		try {
			const res = await api.get("/CAM/EditIndex/equipment/ojk-fin-goods-detail", {
				params: { finGood: value, finType, purpoffinc, brand: d.brand, type: d.type, model: d.model, condition },
			});
			setOjkFinGoodsDetailOpts(res.data || []);
		} catch {
			setOjkFinGoodsDetailOpts([]);
		}
	};

	const handleFinPurposeChange = (value: string) => {
		const mapped = FIN_PURPOSE_OJK_MAP[value];
		setD(prev => ({
			...prev,
			finPurpose: value,
			ojkFinGoods: mapped ? mapped[0] : "",
			ojkFinGoodsDetail: mapped ? mapped[1] : "",
			fundPurpose: finType === "W" && value === "61" ? W61_FUND_PURPOSE : prev.fundPurpose,
		}));
	};

	const handleSupplierSelect = (category: SupplierCategory, r: SupplierResult) => {
		const address = `${r.address}\n${r.city}`;
		if (category === "dealer") {
			setD(prev => ({ ...prev, supp: r.supp, suppName: r.name, suppAddress: address, suppType: r.suppType }));
		} else if (category === "karoseri") {
			setCleared(prev => ({ ...prev, karoseri: false }));
			setD(prev => ({ ...prev, karoseriSupp: r.supp, karoseriName: r.name, karoseriAddress: address }));
		} else if (category === "accessories") {
			setCleared(prev => ({ ...prev, accessories: false }));
			setD(prev => ({ ...prev, accessoriesSupp: r.supp, accessoriesName: r.name, accessoriesAddress: address }));
		} else {
			setCleared(prev => ({ ...prev, other: false }));
			setD(prev => ({ ...prev, otherSupp: r.supp, otherName: r.name, otherAddress: address }));
		}
	};

	const toggleDelete = (category: "karoseri" | "accessories" | "other", checked: boolean) => {
		setCleared(prev => ({ ...prev, [category]: checked }));
	};

	const handleSubmit = useCallback(async () => {
		setSaving(true);
		setError("");
		try {
			const res = await api.post("/CAM/EditIndex/equipment", {
				apless,
				applno: applNo,
				finType,
				purpoffinc,
				newCar,
				conttype,
				...d,
				clearKaroseri: cleared.karoseri,
				clearAccessories: cleared.accessories,
				clearOther: cleared.other,
			});
			if (!res.data.success) {
				setError(res.data.message || "Save failed.");
				return;
			}
			onSaved({ apless, applno: applNo, c2c: res.data.c2c });
		} catch (err: any) {
			setError(err?.response?.data?.message || "Save failed. Please try again.");
		} finally {
			setSaving(false);
		}
	}, [apless, applNo, finType, purpoffinc, newCar, conttype, d, cleared, onSaved]);

	const onFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		handleSubmit();
	};

	const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
		if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
			e.preventDefault();
		}
	};

	useImperativeHandle(ref, () => ({ save: handleSubmit }), [handleSubmit]);

	if (loading) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	const nameLabel = (text: string, category: SupplierCategory, enabled: boolean) =>
		enabled ? (
			<button type="button" className={linkLabelCls} onClick={() => setPicker(category)}>
				{text}
			</button>
		) : (
			<span className={labelCls}>{text}</span>
		);

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">{finType === "S" ? "Financing Object" : "Equipment"}</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>

			<form onSubmit={onFormSubmit} onKeyDown={onFormKeyDown} className="space-y-4 px-4 pb-4 sm:px-6">

				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">

					<div className={sectionCls}>
						<Row labelNode={nameLabel("Dealer Name *", "dealer", canSearchDealer)}>
							<input className={readonlyCls} value={d.suppName} readOnly />
						</Row>

						<Row label="Dealer Address *">
							<textarea className={readonlyCls} value={d.suppAddress} readOnly rows={2} />
						</Row>

						<Row label="Dealer Type *">
							<select className={selectCls(false)} value={d.suppType} disabled>
								<option value="">Select</option>
								{dealerTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</Row>

						<Row label="Type of Equipment *">
							<select className={selectCls(false)} value={d.typeCd} disabled>
								<option value="">Select</option>
								{equipmentTypes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</Row>

						<Row label="Brand *">
							<select className={selectCls(true)} value={d.brand} onChange={e => handleBrandChange(e.target.value)} required>
								<option value="">Select</option>
								{brands.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</Row>

						<Row label="Model *">
							<select className={selectCls(true)} value={d.model} onChange={e => handleModelChange(e.target.value)} required>
								<option value="">Select</option>
								{models.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</Row>

						<Row label="Type *">
							<select className={selectCls(true)} value={d.type} onChange={e => set("type", e.target.value)} required>
								<option value="">Select</option>
								{types.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</Row>

						{showOjkFinGoods && (
							<Row label="OJK Financing Goods *">
								<div className="space-y-2">
									<select
										className={selectCls(!ojkFinGoodsDisabled)}
										value={d.ojkFinGoods}
										onChange={e => handleFinGoodChange(e.target.value)}
										required={ojkFinGoodsRequired}
										disabled={ojkFinGoodsDisabled}
									>
										<option value="">Select</option>
										{ojkFinGoods.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
									</select>
									<select
										className={selectCls(!ojkFinGoodsDisabled)}
										value={d.ojkFinGoodsDetail}
										onChange={e => set("ojkFinGoodsDetail", e.target.value)}
										required={ojkFinGoodsRequired}
										disabled={ojkFinGoodsDisabled}
									>
										<option value="">Select</option>
										{ojkFinGoodsDetailOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
									</select>
								</div>
							</Row>
						)}

						{ojkCollGood && (
							<Row label="OJK Collateral Goods *">
								<div className="space-y-2">
									<select className={selectCls(false)} value={d.ojkCollGoods} disabled required>
										<option value="">Select</option>
										<option value={ojkCollGood.value}>{ojkCollGood.label}</option>
									</select>
									<select className={selectCls(false)} value={d.ojkCollGoodsDetail} disabled required>
										<option value="">Select</option>
										{ojkCollGoodDetail.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
									</select>
								</div>
							</Row>
						)}

						{karoseriOptions.length > 0 && (
							<Row label="Karoseri">
								<select className={selectCls(true)} value={d.karoseri} onChange={e => set("karoseri", e.target.value)}>
									<option value="">Select</option>
									{karoseriOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</Row>
						)}

						<Row label="Parking Address *">
							<textarea className={inputCls} value={d.parkLoc} onChange={e => set("parkLoc", e.target.value)} required rows={2} />
						</Row>

						<Row label="Zip Code *">
							<input
								className={inputCls}
								value={d.parkZipcode}
								maxLength={5}
								onChange={e => set("parkZipcode", e.target.value.replace(/\D/g, ""))}
								required
							/>
						</Row>

						<Row label="City *">
							<select className={selectCls(true)} value={d.cityPark} onChange={e => set("cityPark", e.target.value)} required>
								<option value="">Select</option>
								{areas.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</Row>

						<Row labelNode={nameLabel("Karoseri Name", "karoseri", canSearchSupplier)}>
							<div className="flex items-center gap-2">
								<input className={readonlyCls} value={d.karoseriName} readOnly />
								<label className="flex items-center gap-1 whitespace-nowrap text-xs text-[var(--app-muted)]">
									<input
										type="checkbox"
										checked={cleared.karoseri}
										onChange={e => toggleDelete("karoseri", e.target.checked)}
									/>
									Delete
								</label>
							</div>
						</Row>

						<Row labelNode={nameLabel("Accessories Name", "accessories", canSearchSupplier)}>
							<div className="flex items-center gap-2">
								<input className={readonlyCls} value={d.accessoriesName} readOnly />
								<label className="flex items-center gap-1 whitespace-nowrap text-xs text-[var(--app-muted)]">
									<input
										type="checkbox"
										checked={cleared.accessories}
										onChange={e => toggleDelete("accessories", e.target.checked)}
									/>
									Delete
								</label>
							</div>
						</Row>

						<Row labelNode={nameLabel("Others Name", "other", canSearchSupplier)}>
							<div className="flex items-center gap-2">
								<input className={readonlyCls} value={d.otherName} readOnly />
								<label className="flex items-center gap-1 whitespace-nowrap text-xs text-[var(--app-muted)]">
									<input
										type="checkbox"
										checked={cleared.other}
										onChange={e => toggleDelete("other", e.target.checked)}
									/>
									Delete
								</label>
							</div>
						</Row>

						<Row label="Condition *">
							<select className={selectCls(false)} value={condition} disabled required>
								<option value="">Select</option>
								{CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</Row>
					</div>

					<div className={sectionCls}>
						{condition === "USED" && (
							<Row label="STNK Valid Date">
								<AsOfDatePickerComponent
									label=""
									format="dd-MM-yyyy"
									placeholder="dd-mm-yyyy"
									value={parseISODate(d.stnkValidDt)}
									onChange={date => set("stnkValidDt", toISODate(date))}
								/>
							</Row>
						)}

						<Row label="Chasis No">
							<input className={inputCls} value={d.chasis} maxLength={50} onChange={e => set("chasis", e.target.value.replace(/\s/g, ""))} />
						</Row>

						<Row label="Engine No">
							<input className={inputCls} value={d.engine} maxLength={50} onChange={e => set("engine", e.target.value.replace(/\s/g, ""))} />
						</Row>

						<Row label="Color">
							<input className={inputCls} value={d.colour} maxLength={50} onChange={e => set("colour", e.target.value)} />
						</Row>

						<Row label="Police No">
							<input className={inputCls} value={d.policeno} maxLength={100} onChange={e => set("policeno", e.target.value)} />
						</Row>

						<Row label="User Usage *">
							<input className={inputCls} value={d.userusage} maxLength={100} onChange={e => set("userusage", e.target.value)} required />
						</Row>

						<Row label="Vehicle Purpose *">
							<select className={selectCls(true)} value={d.purpose} onChange={e => set("purpose", e.target.value)} required>
								<option value="">Select</option>
								{purposes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
							</select>
						</Row>

						{showFinancingPurpose && (
							<Row label="Financing Purpose *">
								<select className={selectCls(true)} value={d.finPurpose} onChange={e => handleFinPurposeChange(e.target.value)} required>
									<option value="">Select</option>
									{financingPurposes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</Row>
						)}

						{showFundPurpose && (
							<>
								<Row label="Description for Customer Purpose *">
									<textarea
										className={inputCls}
										value={d.fundPurpose}
										onChange={e => set("fundPurpose", e.target.value)}
										readOnly={fundPurposeLocked}
										required
										rows={3}
									/>
								</Row>
								<div className="grid grid-cols-3 gap-2 py-1">
									<div className="col-span-1" />
									<div className="col-span-2 space-y-1 text-xs italic text-red-600">
										<p>Note : Harap CMO memberikan penjelasan secara lengkap dan jelas, menggunakan Bahasa Indonesia yang baku.</p>
										<p>Contoh<br />- Biaya Pendidikan Kuliah di Universitas Padjadjaran untuk 1 semester dalam periode Tahun Ajaran 2026</p>
										<p>- Biaya Pembelian Bahan Baku Semen di Toko Bangunan Sumber Jaya untuk ekspansi bisnis.</p>
									</div>
								</div>
							</>
						)}

						<Row label="Red Code">
							<div className="flex items-center gap-2">
								<input type="checkbox" checked={d.redCode} onChange={e => set("redCode", e.target.checked)} />
								<select
									className={selectCls(d.redCode)}
									value={d.gpsVendor}
									onChange={e => set("gpsVendor", e.target.value)}
									disabled={!d.redCode}
									required={d.redCode}
								>
									<option value="">Select</option>
									{gpsVendors.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
						</Row>

						<Row label="Wheels *">
							<input
								className={wheelsRequired ? inputCls : readonlyCls}
								value={d.wheels}
								onChange={e => set("wheels", e.target.value.replace(/\D/g, ""))}
								required={wheelsRequired}
								readOnly={!wheelsRequired}
							/>
						</Row>

						<Row label="Year *">
							<input className={inputCls} value={d.tahun} maxLength={4} onChange={e => set("tahun", e.target.value.replace(/\D/g, ""))} required />
						</Row>

						<Row label="Karoseri Address">
							<textarea className={readonlyCls} value={d.karoseriAddress} readOnly rows={2} />
						</Row>

						<Row label="Accessories Address">
							<textarea className={readonlyCls} value={d.accessoriesAddress} readOnly rows={2} />
						</Row>

						<Row label="Others Address">
							<textarea className={readonlyCls} value={d.otherAddress} readOnly rows={2} />
						</Row>
					</div>
				</div>

				{(error || isError) && (
					<p className="message whitespace-pre-line text-sm text-red-600">
						{error || "Failed to load equipment data."}
					</p>
				)}
				{saving && <p className="text-sm text-[var(--app-muted)]">Saving…</p>}
				<button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
			</form>

			<SupplierSearchModal
				open={picker !== null}
				category={picker ?? "dealer"}
				newCar={newCar}
				onClose={() => setPicker(null)}
				onSelect={r => picker && handleSupplierSelect(picker, r)}
			/>
		</div>
	);
});

export default CAMEquipmentDetailPage;
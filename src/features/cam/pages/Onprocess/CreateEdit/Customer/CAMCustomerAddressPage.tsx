import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

interface AddressData {
	address3: string;
	city3: string;
	phone3: string;
	zipcode3: string;
	fax3: string;
	address4: string;
	city4: string;
	phone4: string;
	zipcode4: string;
	fax4: string;
	address5: string;
	city5: string;
	phone5: string;
	zipcode5: string;
	fax5: string;
	address1?: string;
	city1?: string;
	phone2?: string;
	zipcode1?: string;
	fax1?: string;
}

export interface CAMCustomerAddressPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

const cellLabel =
	"border-b border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 py-2.5 align-top text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] whitespace-nowrap";
const cellValue = "border-b border-[var(--app-border)] px-4 py-2.5 align-top text-sm text-[var(--app-text)]";
const cellEmpty = "border-b border-[var(--app-border)] px-4 py-2.5";
const subheadCell =
	"border-b border-[var(--app-border)] bg-indigo-50/70 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-600";

function Row({
	left,
	right,
	rightHeader,
}: {
	left?: [string, React.ReactNode];
	right?: [string, React.ReactNode];
	rightHeader?: string;
}) {
	return (
		<tr>
			{left ? (
				<>
					<td className={cellLabel}>{left[0]}</td>
					<td className={cellValue}>{left[1]}</td>
				</>
			) : (
				<>
					<td className={cellEmpty}></td>
					<td className={cellEmpty}></td>
				</>
			)}
			{rightHeader ? (
				<td colSpan={2} className={subheadCell}>{rightHeader}</td>
			) : right ? (
				<>
					<td className={cellLabel}>{right[0]}</td>
					<td className={cellValue}>{right[1]}</td>
				</>
			) : (
				<>
					<td className={cellEmpty}></td>
					<td className={cellEmpty}></td>
				</>
			)}
		</tr>
	);
}

function FullRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<tr>
			<td className={cellLabel}>{label}</td>
			<td colSpan={3} className={cellValue}>{children}</td>
		</tr>
	);
}

const inputCls =
	"border border-[var(--app-border)] rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400";
const errCls = "text-red-600 text-xs mt-1";

const digitsOnlyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
	if (!/^\d$/.test(e.key) && !["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight"].includes(e.key)) {
		e.preventDefault();
	}
};

const emptyAddress: AddressData = {
	address3: "", city3: "", phone3: "", zipcode3: "", fax3: "",
	address4: "", city4: "", phone4: "", zipcode4: "", fax4: "",
	address5: "", city5: "", phone5: "", zipcode5: "", fax5: "",
};

const CAMCustomerAddressPage = forwardRef<CamTabHandle, CAMCustomerAddressPageProps>(function CAMCustomerAddressPage({ apless, applNo, finType, custName, onSaved }, ref) {
	const [saving, setSaving] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [d, setD] = useState<AddressData>(emptyAddress);

	const set = (key: keyof AddressData, value: string) => setD(prev => ({ ...prev, [key]: value }));

	const { data: loadedAddress, isLoading, isError, refetch } = useQuery({
		queryKey: ['cam-customer-address', apless],
		queryFn: async (): Promise<AddressData> => {
			const res = await api.get("/CAM/Customer/address", { params: { apless } });
			const data: AddressData = res.data;
			const hasCorrespondence = !!data.address3;
			return {
				...emptyAddress,
				...data,
				address3: hasCorrespondence ? data.address3 : (data.address1 || ""),
				city3: hasCorrespondence ? data.city3 : (data.city1 || ""),
				phone3: hasCorrespondence ? data.phone3 : (data.phone2 || ""),
				zipcode3: hasCorrespondence ? data.zipcode3 : (data.zipcode1 || ""),
				fax3: hasCorrespondence ? data.fax3 : (data.fax1 || ""),
			};
		},
	});

	useEffect(() => {
		if (loadedAddress) setD(loadedAddress);
	}, [loadedAddress]);

	const validate = (): boolean => {
		const next: Record<string, string> = {};
		if (d.zipcode3 && d.zipcode3.length !== 5) next.zipcode3 = "Post Code Correspondence not valid";
		if (d.zipcode4 && d.zipcode4.length !== 5) next.zipcode4 = "Post Code additional 1 not valid";
		if (d.zipcode5 && d.zipcode5.length !== 5) next.zipcode5 = "Post Code additional 2 not valid";
		setErrors(next);
		return Object.keys(next).length === 0;
	};

	const handleSubmit = useCallback(async () => {
		if (!validate()) return;
		setSaving(true);
		try {
			const res = await api.post("/CAM/Customer/address", { ...d, apless, applno: applNo });
			if (res.data.success) {
				onSaved({ apless: res.data.apless ?? apless, applno: res.data.applno ?? applNo });
			} else if (res.data.errors) {
				setErrors(res.data.errors);
			} else {
				alert(res.data.message || "Save failed. Please try again.");
			}
		} catch {
			alert("Save failed. Please try again.");
		} finally {
			setSaving(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [d, apless, applNo, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleSubmit }), [handleSubmit]);

	if (isLoading) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
				Failed to load address data. Please try again.
				<button onClick={() => refetch()} className="underline ml-4">Retry</button>
			</div>
		);
	}

	const renderBlock = (
		title: string,
		fields: { address: keyof AddressData; city: keyof AddressData; phone: keyof AddressData; zipcode: keyof AddressData; fax: keyof AddressData }
	) => (
		<>
			<tr>
				<td colSpan={4} className={subheadCell}>{title}</td>
			</tr>
			<FullRow label={title}>
				<textarea className={inputCls} value={d[fields.address]} onChange={e => set(fields.address, e.target.value)} />
			</FullRow>
			<Row
				left={["City", (
					<input className={inputCls} value={d[fields.city]} onChange={e => set(fields.city, e.target.value)} maxLength={50} />
				)]}
				right={["Post Code", (
					<>
						<input
							className={inputCls}
							value={d[fields.zipcode]}
							maxLength={5}
							onKeyDown={digitsOnlyKeyDown}
							onChange={e => set(fields.zipcode, e.target.value.replace(/\D/g, ""))}
						/>
						{errors[fields.zipcode] && <p className={errCls}>{errors[fields.zipcode]}</p>}
					</>
				)]}
			/>
			<Row
				left={["Phone", (
					<input
						className={inputCls}
						value={d[fields.phone]}
						maxLength={20}
						onKeyDown={digitsOnlyKeyDown}
						onChange={e => set(fields.phone, e.target.value.replace(/\D/g, ""))}
					/>
				)]}
				right={["Fax", (
					<input
						className={inputCls}
						value={d[fields.fax]}
						maxLength={20}
						onKeyDown={digitsOnlyKeyDown}
						onChange={e => set(fields.fax, e.target.value.replace(/\D/g, ""))}
					/>
				)]}
			/>
		</>
	);

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			{judul && (
				<div className="judul border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-right text-xs font-semibold text-blue-400 sm:px-6">
					{judul}
				</div>
			)}
			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<h2 className="text-xl font-bold text-[var(--app-text)]">Address Detail</h2>
				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[820px] border-collapse text-sm">
							<tbody>
								{renderBlock("Correspondence Address", { address: "address3", city: "city3", phone: "phone3", zipcode: "zipcode3", fax: "fax3" })}
								{renderBlock("Additional Address 1", { address: "address4", city: "city4", phone: "phone4", zipcode: "zipcode4", fax: "fax4" })}
								{renderBlock("Additional Address 2", { address: "address5", city: "city5", phone: "phone5", zipcode: "zipcode5", fax: "fax5" })}
							</tbody>
						</table>
					</div>
				</div>

				{saving && <p className="text-sm text-[var(--app-muted)] mt-3">Saving…</p>}
			</div>
		</div>
	);
});

export default CAMCustomerAddressPage;
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

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
	return (
		<div className={`grid grid-cols-[110px_minmax(0,1fr)] items-start gap-x-3 ${className}`}>
			<label className="pt-2 text-[13px] font-medium text-[var(--app-muted)]">{label}</label>
			<div>{children}</div>
		</div>
	);
}

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

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	const fieldCls =
		"w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2 text-[13px] text-[var(--app-text)] shadow-sm transition-colors placeholder:text-[var(--app-muted)]/50 hover:border-[var(--app-muted)]/50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25";
	const errCls = "mt-1 text-[11px] text-red-500";

	const numericProps = (key: keyof AddressData, max: number) => ({
		className: fieldCls,
		value: d[key] as string,
		maxLength: max,
		inputMode: "numeric" as const,
		onKeyDown: digitsOnlyKeyDown,
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value.replace(/\D/g, "")),
	});

	const renderBlock = (
		title: string,
		f: { address: keyof AddressData; city: keyof AddressData; phone: keyof AddressData; zipcode: keyof AddressData; fax: keyof AddressData },
	) => (
		<section className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)]">
			<div className="flex items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5">
				<span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
				<h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--app-text)]">{title}</h3>
			</div>
			<div className="grid grid-cols-1 gap-x-10 gap-y-3 p-4 md:grid-cols-2">
				<Field label="Address" className="md:col-span-2">
					<textarea
						className={`${fieldCls} resize-y`}
						rows={2}
						value={d[f.address] as string}
						onChange={e => set(f.address, e.target.value)}
					/>
				</Field>
				<Field label="City">
					<input className={fieldCls} value={d[f.city] as string} maxLength={50} onChange={e => set(f.city, e.target.value)} />
				</Field>
				<Field label="Post Code">
					<input {...numericProps(f.zipcode, 5)} />
					{errors[f.zipcode] && <p className={errCls}>{errors[f.zipcode]}</p>}
				</Field>
				<Field label="Phone">
					<input {...numericProps(f.phone, 20)} />
				</Field>
				<Field label="Fax">
					<input {...numericProps(f.fax, 20)} />
				</Field>
			</div>
		</section>
	);

	const errorMessages = Object.values(errors).filter(Boolean);

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Address Information</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>

			<div className="px-4 py-5 sm:px-6">
				<div className="space-y-4">
					{renderBlock("Correspondence Address", { address: "address3", city: "city3", phone: "phone3", zipcode: "zipcode3", fax: "fax3" })}
					{renderBlock("Additional Address 1", { address: "address4", city: "city4", phone: "phone4", zipcode: "zipcode4", fax: "fax4" })}
					{renderBlock("Additional Address 2", { address: "address5", city: "city5", phone: "phone5", zipcode: "zipcode5", fax: "fax5" })}
				</div>

				<div className="min-h-[1.5rem] pt-4 text-[13px]">
					{errorMessages.length > 0 ? (
						<div className="space-y-0.5 text-red-600">{errorMessages.map((m, i) => <p key={i}>{m}</p>)}</div>
					) : saving ? (
						<p className="text-[var(--app-muted)]">Saving…</p>
					) : null}
				</div>
			</div>
		</div>
	);
});

export default CAMCustomerAddressPage;
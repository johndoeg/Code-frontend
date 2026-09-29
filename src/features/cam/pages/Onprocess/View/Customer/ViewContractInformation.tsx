import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

interface IndividualDetail {
	name_in_id_card: string;
	name_without_title: string;
	gender: string;
	place_of_birth: string;
	date_of_birth: string;
	address: string;
	area: string;
	province: string;
	city: string;
	kecamatan: string;
	kelurahan: string;
	postcode: string;
	mobile_phone: string;
	email: string;
	citizenship: string;
	nationality: string;
	id_type: string;
	id_card_no: string;
	validity_type: string;
	validity_until: string | null;
	passport_no: string;
}

interface EntityDetail {
	name_in_akta: string;
	name_in_npwp: string;
	name_without_title: string;
	establishment_place: string;
	establishment_date: string;
	address: string;
	area: string;
	province: string;
	city: string;
	kecamatan: string;
	kelurahan: string;
	id_type: string;
	npwp_formatted: string;
	validity_type: string;
	validity_until: string | null;
	address_npwp: string;
	area_npwp: string;
	province_npwp: string;
	city_npwp: string;
	kecamatan_npwp: string;
	kelurahan_npwp: string;
	postcode_npwp: string;
	mobile_phone: string;
	email: string;
}

interface ManagementDetailResponse {
	management_nm: string;
	share_status: string;
	individual?: IndividualDetail;
	entity?: EntityDetail;
}

interface ViewContractInformationProps {
	apless: string;
	period: string;
	managementNm: string;
	shareStatus: string;
	onClose: () => void;
}

const controlClass =
	"rounded border border-[var(--app-border)] bg-[var(--app-surface-alt)] px-3 py-2 text-sm text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-100";

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1 py-2 sm:flex-row sm:items-start sm:gap-4">
			<label className="pt-2 text-sm font-bold text-[var(--app-muted)] sm:w-[35%] sm:shrink-0">{label}</label>
			<div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
		</div>
	);
}

function DisabledInput({ value, width }: { value?: string | null; width?: string }) {
	return (
		<input
			type="text"
			value={value || ''}
			disabled
			readOnly
			className={`${controlClass} ${width ? `${width} shrink-0` : 'flex-1'}`}
		/>
	);
}

function DisabledSelect({ value, width }: { value?: string | null; width?: string }) {
	return (
		<select disabled className={`${controlClass} ${width ? `${width} shrink-0` : 'flex-1'}`} value="0">
			<option value="0">{value || '-'}</option>
		</select>
	);
}

function DisabledTextarea({ value }: { value?: string | null }) {
	return (
		<textarea value={value || ''} disabled readOnly rows={2} className={`${controlClass} w-full resize`} />
	);
}

function DisabledPhone({ value, width }: { value?: string | null; width?: string }) {
	return (
		<div className= {`relative ${width ? `${width} shrink-0` : 'flex-1'}`}>
			<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--app-muted)]">62</span>
			<input type="text" value={value || ''} disabled readOnly className={`${controlClass} w-full pl-8`} />
		</div>
	);
}

export default function ViewContractInformation({ apless, period, managementNm, shareStatus, onClose }: ViewContractInformationProps) {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['cam-management-detail', apless, period, managementNm, shareStatus],
		queryFn: async () => {
			const res = await api.get<ManagementDetailResponse>('/CAM/View/management-detail', {
				params: { apless, period, management_nm: managementNm, share_status: shareStatus },
			});
			return res.data;
		},
	});

	const isEntity = shareStatus === '1';

	return (
		<div
			onClick={onClose}
			style={{
				position: "fixed", inset: 0,
				background: "rgba(0,0,0,.6)",
				zIndex: 9999, display: "flex",
				justifyContent: "center", alignItems: "center",
				padding: 20,
			}}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				className="rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] shadow-xl"
				style={{ width: "100%", maxWidth: 780, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
			>
				<div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-alt)] px-6 py-3">
					<h2 className="text-base font-bold text-[var(--app-text)]">Management Detail Information</h2>
					<button type="button" onClick={onClose} className="text-[var(--app-muted)] hover:text-[var(--app-muted)]" style={{ cursor: "pointer", background: "none", border: "none", fontSize: "1.2rem" }}>
						✕
					</button>
				</div>

				<div className="overflow-y-auto px-6 py-4">
					{isLoading && <div className="py-6 text-center text-sm text-[var(--app-muted)]">Loading…</div>}
					{isError && <div className="py-6 text-center text-sm text-red-500">Failed to load detail.</div>}

					{!isLoading && !isError && data && !isEntity && data.individual && (() => {
						const d = data.individual;
						return (
							<div className="divide-y divide-[var(--app-border)]">
								<FormRow label="BOD / BOC Name in ID Card"><DisabledInput value={d.name_in_id_card} /></FormRow>
								<FormRow label="BOD / BOC Name Without Title"><DisabledInput value={d.name_without_title} /></FormRow>
								<FormRow label="Gender"><DisabledSelect value={d.gender} /></FormRow>
								<FormRow label="Place / Date of Birth">
									<DisabledInput value={d.place_of_birth} width="sm:w-[66%]" />
									<DisabledInput value={d.date_of_birth} width="sm:w-[32%]" />
								</FormRow>
								<FormRow label="ID Address"><DisabledTextarea value={d.address} /></FormRow>
								<FormRow label="Area"><DisabledSelect value={d.area} /></FormRow>
								<FormRow label="Province"><DisabledInput value={d.province} /></FormRow>
								<FormRow label="District / City"><DisabledInput value={d.city} /></FormRow>
								<FormRow label="Kecamatan"><DisabledSelect value={d.kecamatan} /></FormRow>
								<FormRow label="Kelurahan"><DisabledSelect value={d.kelurahan} /></FormRow>
								<FormRow label="Post Code"><DisabledInput value={d.postcode} /></FormRow>
								<FormRow label="Mobile Phone No."><DisabledPhone value={d.mobile_phone} width="sm:w-[266px]"/></FormRow>
								<FormRow label="Email"><DisabledInput value={d.email} width="sm:w-[266px]" /></FormRow>
								<FormRow label="Citizenship">
									<DisabledSelect value={d.citizenship} width="sm:w-[70px]" />
									<DisabledSelect value={d.nationality} width="sm:w-[195px]" />
								</FormRow>
								<FormRow label="ID Type"><DisabledInput value={d.id_type} /></FormRow>
								{d.id_type !== 'Paspor' && (
									<FormRow label="ID Card No."><DisabledInput value={d.id_card_no} /></FormRow>
								)}
								<FormRow label="Validity ID Card">
									<DisabledSelect value={d.validity_type} width="sm:w-[150px]" />
									{d.validity_type === 'Certain Period' && <DisabledInput value={d.validity_until} width="sm:w-[30%]" />}
								</FormRow>
								{d.citizenship === 'WNA' && (
									<FormRow label="Passport No."><DisabledInput value={d.passport_no} /></FormRow>
								)}
							</div>
						);
					})()}

					{!isLoading && !isError && data && isEntity && data.entity && (() => {
						const d = data.entity;
						return (
							<div className="divide-y divide-[var(--app-border)]">
								<FormRow label="Name in Akta"><DisabledInput value={d.name_in_akta} /></FormRow>
								<FormRow label="Name in NPWP"><DisabledInput value={d.name_in_npwp} /></FormRow>
								<FormRow label="Name in Akta Without Title"><DisabledInput value={d.name_without_title} /></FormRow>
								<FormRow label="Establishment Place / Date">
									<DisabledInput value={d.establishment_place} width="sm:w-[300px]" />
									<DisabledInput value={d.establishment_date} width="sm:w-[18%]" />
								</FormRow>
								<FormRow label="Address in SK. Domisili"><DisabledTextarea value={d.address} /></FormRow>
								<FormRow label="Area"><DisabledSelect value={d.area} /></FormRow>
								<FormRow label="Province"><DisabledInput value={d.province} /></FormRow>
								<FormRow label="District / City"><DisabledInput value={d.city} /></FormRow>
								<FormRow label="Kecamatan"><DisabledSelect value={d.kecamatan} /></FormRow>
								<FormRow label="Kelurahan"><DisabledSelect value={d.kelurahan} /></FormRow>
								<FormRow label="ID Type"><DisabledInput value={d.id_type} /></FormRow>
								<FormRow label="NPWP No."><DisabledInput value={d.npwp_formatted} /></FormRow>
								<FormRow label="Validity ID Card">
									<DisabledSelect value={d.validity_type} width="sm:w-[150px]" />
									{d.validity_type === 'Certain Period' && <DisabledInput value={d.validity_until} width="sm:w-[18%]" />}
								</FormRow>
								<FormRow label="Address in NPWP"><DisabledTextarea value={d.address_npwp} /></FormRow>
								<FormRow label="Area (NPWP)"><DisabledSelect value={d.area_npwp} /></FormRow>
								<FormRow label="Province (NPWP)"><DisabledInput value={d.province_npwp} /></FormRow>
								<FormRow label="District / City (NPWP)"><DisabledInput value={d.city_npwp} /></FormRow>
								<FormRow label="Kecamatan (NPWP)"><DisabledSelect value={d.kecamatan_npwp} /></FormRow>
								<FormRow label="Kelurahan (NPWP)"><DisabledSelect value={d.kelurahan_npwp} /></FormRow>
								<FormRow label="Post Code (NPWP)"><DisabledInput value={d.postcode_npwp} /></FormRow>
								<FormRow label="Mobile Phone No."><DisabledPhone value={d.mobile_phone} width="sm:w-[266px]"/></FormRow>
								<FormRow label="Email"><DisabledInput value={d.email} width="sm:w-[266px]" /></FormRow>
							</div>
						);
					})()}
				</div>

				<div className="border-t border-[var(--app-border)] px-6 py-3 text-right">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
import React, { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

export interface CAMApuPptPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

interface EddQuestion {
	value: string;
	description: string;
}

interface PartySummary {
	name: string;
	type: string;
	occupationBusinessType: string;
	apuPptStatus: string;
	identificationProcess: string;
	eddRequired: boolean;
	eddQuestions: EddQuestion[];
	previouslyPassed: boolean;
}

type Answers = Record<string, "1" | "0" | undefined>;

const labelClass = "w-1/3 py-1 align-top text-sm text-[var(--app-muted)]";
const valueClass = "py-1 align-top text-sm text-[var(--app-text)]";

function PartyDetails({ party, entityLabel }: { party: PartySummary; entityLabel: string }) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[480px] text-sm">
				<tbody>
					<tr>
						<td className={labelClass}>{entityLabel} Name</td>
						<td className={valueClass}>{party.name}</td>
					</tr>
					<tr>
						<td className={labelClass}>{entityLabel} Type</td>
						<td className={valueClass}>{party.type}</td>
					</tr>
					<tr>
						<td className={labelClass}>Occupation / Business Type</td>
						<td className={valueClass}>{party.occupationBusinessType}</td>
					</tr>
					<tr>
						<td className={labelClass}>APU PPT Status</td>
						<td className={valueClass}>{party.apuPptStatus}</td>
					</tr>
					<tr>
						<td className={labelClass}>Identification and Verification Process</td>
						<td className={valueClass}>{party.identificationProcess}</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}

function EddQuestionnaire({
	groupName,
	instruction,
	questions,
	answers,
	onAnswer,
}: {
	groupName: string;
	instruction: React.ReactNode;
	questions: EddQuestion[];
	answers: Answers;
	onAnswer: (value: string, answer: "1" | "0") => void;
}) {
	return (
		<div className="space-y-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
			<p className="text-sm font-bold text-[var(--app-text)]">{instruction}</p>
			<div className="overflow-x-auto">
				<table className="w-full min-w-[480px] text-sm">
					<tbody>
						{questions.map((q, idx) => (
							<tr key={q.value} className="align-top">
								<td className="w-8 py-2 text-center text-[var(--app-muted)]">{idx + 1}.</td>
								<td className="py-2 text-[var(--app-text)]">{q.description}</td>
								<td className="w-16 py-2 text-center">
									<label className="inline-flex items-center gap-1 text-[var(--app-muted)]">
										<input
											type="radio"
											name={`${groupName}-${q.value}`}
											checked={answers[q.value] === "1"}
											onChange={() => onAnswer(q.value, "1")}
										/>
										YES
									</label>
								</td>
								<td className="w-16 py-2 text-center">
									<label className="inline-flex items-center gap-1 text-[var(--app-muted)]">
										<input
											type="radio"
											name={`${groupName}-${q.value}`}
											checked={answers[q.value] === "0"}
											onChange={() => onAnswer(q.value, "0")}
										/>
										NO
									</label>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

const CUSTOMER_EDD_INSTRUCTION = (
	<>
		Mohon diisi kuisioner EDD di bawah ini karena calon konsumen termasuk High Risk APU PPT / Please fill in the
		EDD questionnaire below because potential customers are a High Risk APU PPT
		<br />
		<span className="font-normal">
			Apakah CMO sudah melakukan identifikasi dan verifikasi secara mendalam terhadap calon konsumen, terkait hal
			berikut : / Has the CMO conducted in-depth identification and verification of potential customers, in
			relation to the following:
		</span>
	</>
);

const BO_EDD_INSTRUCTION = (
	<>
		Mohon diisi kuisioner EDD di bawah ini karena beneficial owner termasuk High Risk APU PPT / Please fill in the
		EDD questionnaire below because the beneficial owner is a High Risk APU PPT
		<br />
		<span className="font-normal">
			Apakah CMO sudah melakukan identifikasi dan verifikasi secara mendalam terhadap Beneficial Owner (BO),
			terkait hal berikut : / Has the CMO carried out in-depth identification and verification of the
			Beneficial Owner (BO), in relation to the following:
		</span>
	</>
);

const CAMApuPptPage = forwardRef<CamTabHandle, CAMApuPptPageProps>(function CAMApuPptPage({ apless, applNo, finType, custName, onSaved }, ref) {
	const [customerAnswers, setCustomerAnswers] = useState<Answers>({});
	const [boAnswers, setBoAnswers] = useState<Answers>({});
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState("");

	const { data, isLoading: loading, isError } = useQuery({
		queryKey: ['cam-apu-ppt', apless, applNo],
		queryFn: async () => {
			const res = await api.get("/CAM/EditIndex/apu-ppt", { params: { apless, applno: applNo } });
			return {
				customer: res.data.customer as PartySummary,
				bo: (res.data.beneficialOwner || null) as PartySummary | null,
			};
		},
	});

	useEffect(() => {
		if (!data) return;
		if (data.customer?.previouslyPassed) {
			const seeded: Answers = {};
			data.customer.eddQuestions.forEach(q => (seeded[q.value] = "1"));
			setCustomerAnswers(seeded);
		}
		if (data.bo?.previouslyPassed) {
			const seeded: Answers = {};
			data.bo.eddQuestions.forEach(q => (seeded[q.value] = "1"));
			setBoAnswers(seeded);
		}
	}, [data]);

	const customer = data?.customer ?? null;
	const bo = data?.bo ?? null;

	const handleNext = useCallback(async () => {
		setSaving(true);
		setSaveError("");
		try {
			const res = await api.post("/CAM/EditIndex/apu-ppt/next", {
				apless,
				applno: applNo,
				customerAnswers,
				boAnswers,
			});
			if (res.data.success) {
				onSaved({ apless, applno: applNo });
			} else {
				setSaveError(res.data.message || "Save failed.");
			}
		} catch (err: any) {
			setSaveError(err?.response?.data?.message || "Save failed. Please try again.");
		} finally {
			setSaving(false);
		}
	}, [apless, applNo, customerAnswers, boAnswers, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

	if (loading) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-[var(--app-muted)]">Loading…</p>
			</div>
		);
	}
	if (isError || !customer) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-red-600">
					{isError ? "Failed to load APU PPT data. Please try again." : "No APU PPT data found for this application."}
				</p>
			</div>
		);
	}

	const judul = [finType, applNo, custName || customer.name].filter(Boolean).join(" - ");

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
			<div className="flex items-center gap-2.5">
			<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
			<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
			<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
			</svg>
			</span>
			<h2 className="text-[15px] font-semibold text-[var(--app-text)]">APU PPT</h2>
			</div>
			{judul && (
			<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
			)}
			</div>

			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<div>
					<h3 className="mb-2 text-sm font-semibold text-[var(--app-muted)]">Customer</h3>
					<PartyDetails party={customer} entityLabel="Customer" />
				</div>

				{customer.eddRequired && (
					<EddQuestionnaire
						groupName="customer"
						instruction={CUSTOMER_EDD_INSTRUCTION}
						questions={customer.eddQuestions}
						answers={customerAnswers}
						onAnswer={(value, answer) => setCustomerAnswers(prev => ({ ...prev, [value]: answer }))}
					/>
				)}

				{bo && (
					<>
						<div>
							<h3 className="mb-2 text-sm font-semibold text-[var(--app-muted)]">Beneficial Owner</h3>
							<PartyDetails party={bo} entityLabel="Beneficial Owner" />
						</div>

						{bo.eddRequired && (
							<EddQuestionnaire
								groupName="bo"
								instruction={BO_EDD_INSTRUCTION}
								questions={bo.eddQuestions}
								answers={boAnswers}
								onAnswer={(value, answer) => setBoAnswers(prev => ({ ...prev, [value]: answer }))}
							/>
						)}
					</>
				)}

				{saveError && <p className="text-sm text-red-600">{saveError}</p>}
				{saving && <p className="text-sm text-[var(--app-muted)]">Saving…</p>}
			</div>
		</div>
	);
});

export default CAMApuPptPage;
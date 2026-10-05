import { useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import GuarantorSelectPage from "./GuarantorSelectPage";
import GuarantorInfoPage from "./GuarantorInfoPage";
import GuarantorBankPage from "./GuarantorBankPage";
import GuarantorDocumentPage from "./GuarantorDocumentPage";
import { GuarantorSectionHeader, type GuarantorSubView } from "./GuarantorShared";

interface GuarantorRow {
	grnId: string;
	name: string;
	type: string;
	occupation: string;
	relation: string;
}

export interface GuarantorListPageProps {
	apless: string;
	applNo: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

const cellLabel =
	"border-b border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 py-2.5 align-top text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] whitespace-nowrap";
const cellValue = "border-b border-[var(--app-border)] px-4 py-2.5 align-top text-sm text-[var(--app-text)]";

const TYPE_LABELS: Record<string, string> = { PR: "Individual", PT: "Corporate" };

const GuarantorListPage = forwardRef<CamTabHandle, GuarantorListPageProps>(function GuarantorListPage(
	{ apless, applNo, onSaved }, ref
) {
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [view, setView] = useState<'list' | 'select' | GuarantorSubView>('list');
	const [activeGrnId, setActiveGrnId] = useState('');

	const { data: guarantors = [], isLoading: loading, isError, refetch } = useQuery({
		queryKey: ['cam-guarantor-list', applNo],
		queryFn: async (): Promise<GuarantorRow[]> => {
			const res = await api.get("/CAM/EditIndex/guarantor", { params: { applno: applNo } });
			return res.data.guarantors || [];
		},
	});

	useImperativeHandle(ref, () => ({
		save: () => onSaved({ apless, applno: applNo }),
	}), [apless, applNo, onSaved]);

	const openSub = (v: GuarantorSubView, grnId: string) => {
		setActiveGrnId(grnId);
		setView(v);
	};

	const handleDelete = async (row: GuarantorRow) => {
		if (!window.confirm(`Delete guarantor "${row.name}"? This also removes their bank details and uploaded documents.`)) return;
		setDeletingId(row.grnId);
		try {
			await api.delete("/CAM/EditIndex/guarantor", { params: { grnId: row.grnId, grnTp: row.type, applno: applNo } });
			await refetch();
		} catch {
			alert("Delete failed. Please try again.");
		} finally {
			setDeletingId(null);
		}
	};

	if (view === 'select') {
		return (
			<GuarantorSelectPage
				apless={apless}
				applNo={applNo}
				onBack={() => { setView('list'); refetch(); }}
			/>
		);
	}

	if (view === 'info' || view === 'bank' || view === 'document') {
		const subProps = {
			apless,
			applNo,
			grnId: activeGrnId,
			onNavigate: (v: GuarantorSubView) => setView(v),
			onBack: () => { setView('list'); refetch(); },
		};
		if (view === 'info') return <GuarantorInfoPage {...subProps} />;
		if (view === 'bank') return <GuarantorBankPage {...subProps} />;
		return <GuarantorDocumentPage {...subProps} />;
	}

	if (loading) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}
	if (isError) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
				Failed to load guarantor list. Please try again.
				<button onClick={() => refetch()} className="underline ml-4">Retry</button>
			</div>
		);
	}

	return (
		<div>
			<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
				<GuarantorSectionHeader>List of Guarantor</GuarantorSectionHeader>
				<div className="overflow-x-auto">
					<table className="w-full min-w-[820px] border-collapse text-sm">
						<thead>
							<tr>
								<td className={cellLabel}>Name</td>
								<td className={cellLabel}>Guarantor Type</td>
								<td className={cellLabel}>Occupation</td>
								<td className={cellLabel}>Relationship with Customer</td>
								<td className={cellLabel}>
									<button
										type="button"
										onClick={() => setView("select")}
										className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium"
									>
										Add New Guarantor
									</button>
								</td>
							</tr>
						</thead>
						<tbody>
							{guarantors.map(row => (
								<tr key={row.grnId}>
									<td className={cellValue}>{row.name}</td>
									<td className={cellValue}>{TYPE_LABELS[row.type] || row.type}</td>
									<td className={cellValue}>{row.occupation || <span className="text-slate-300">—</span>}</td>
									<td className={cellValue}>{row.relation || <span className="text-slate-300">—</span>}</td>
									<td className={cellValue}>
										<div className="flex flex-wrap gap-2">
											<button type="button" onClick={() => openSub("info", row.grnId)}
												className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-[var(--app-text)] rounded text-xs font-medium">
												Edit
											</button>
											<button type="button" onClick={() => openSub("bank", row.grnId)}
												className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-[var(--app-text)] rounded text-xs font-medium">
												Edit Bank
											</button>
											<button type="button" onClick={() => openSub("document", row.grnId)}
												className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-[var(--app-text)] rounded text-xs font-medium">
												Upload Document
											</button>
											<button type="button" onClick={() => handleDelete(row)} disabled={deletingId === row.grnId}
												className="px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white rounded text-xs font-medium">
												{deletingId === row.grnId ? "Deleting…" : "Delete"}
											</button>
										</div>
									</td>
								</tr>
							))}
							{guarantors.length === 0 && (
								<tr><td colSpan={5} className={cellValue + " text-center text-[var(--app-muted)]"}>No guarantors added yet.</td></tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
});

export default GuarantorListPage;
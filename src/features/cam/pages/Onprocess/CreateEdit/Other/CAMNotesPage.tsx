import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

export interface CAMNotesPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
	onHome?: () => void;
}

export interface CamTabHandle {
	save: () => void;
}

const CAMNotesPage = forwardRef<CamTabHandle, CAMNotesPageProps>(function CAMNotesPage({ apless, applNo, finType, custName, onSaved, onHome }, ref) {
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [advancing, setAdvancing] = useState(false);
	const [nextError, setNextError] = useState("");

	const { data, isLoading: loading, isError } = useQuery({
		queryKey: ['cam-notes', apless, applNo],
		queryFn: async () => {
			const res = await api.get("/CAM/EditIndex/cam-notes", { params: { apless, applno: applNo } });
			return res.data as { blocked?: boolean; message?: string; notes?: string };
		},
	});

	useEffect(() => {
		if (data && !data.blocked) setNotes(data.notes || "");
	}, [data]);

	const handleSave = async () => {
		setSaving(true);
		setSaveMessage(null);
		try {
			const res = await api.post("/CAM/EditIndex/cam-notes/save", { apless, applno: applNo, notes });
			if (res.data.success) {
				setSaveMessage({ type: "success", text: "Successful" });
			} else {
				setSaveMessage({ type: "error", text: res.data.message || "Failed" });
			}
		} catch (err: any) {
			setSaveMessage({ type: "error", text: err?.response?.data?.message || "Failed" });
		} finally {
			setSaving(false);
		}
	};

	const handleNext = useCallback(async () => {
		setAdvancing(true);
		setNextError("");
		try {
			const res = await api.post("/CAM/EditIndex/cam-notes/next", { apless, applno: applNo });
			if (res.data.success) {
				onSaved({ apless, applno: applNo });
			} else {
				setNextError(res.data.message || "Please try again.");
			}
		} catch (err: any) {
			setNextError(err?.response?.data?.message || "Please try again.");
		} finally {
			setAdvancing(false);
		}
	}, [apless, applNo, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

	if (loading) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-[var(--app-muted)]">Loading…</p>
			</div>
		);
	}
	if (isError) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-red-600">Failed to load CAM Notes. Please try again.</p>
			</div>
		);
	}
	if (data?.blocked) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-red-600">{data.message || "This application cannot be edited right now."}</p>
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
			<div className="flex items-center gap-2.5">
			<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
			<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
			<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
			</svg>
			</span>
			<h2 className="text-[15px] font-semibold text-[var(--app-text)]">CAM Notes</h2>
			</div>
			{judul && (
			<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
			)}
			</div>
			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<div className="space-y-4 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-sm sm:p-6">
					<textarea
						value={notes}
						onChange={e => setNotes(e.target.value)}
						rows={8}
						className="w-full rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
					/>

					<div className="flex flex-wrap items-center gap-3">
						<button
							type="button"
							onClick={handleSave}
							disabled={saving}
							className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
						>
							{saving ? "Saving…" : "Save"}
						</button>

						{saveMessage && (
							<span className={`text-sm ${saveMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
								{saveMessage.text}
							</span>
						)}

						{saveMessage?.type === "success" && (
							<button
								type="button"
								onClick={() => onHome?.()}
								className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
							>
								Finish
							</button>
						)}
					</div>

					{nextError && <p className="text-sm text-red-600">{nextError}</p>}
					{advancing && <p className="text-sm text-[var(--app-muted)]">Please wait…</p>}
				</div>
			</div>
		</div>
	);
});

export default CAMNotesPage;
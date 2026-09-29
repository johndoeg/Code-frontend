import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';

export interface CAMRevisionNotesPageProps {
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

const MAX_LENGTH = 255;

const CAMRevisionNotesPage = forwardRef<CamTabHandle, CAMRevisionNotesPageProps>(function CAMRevisionNotesPage({ apless, applNo, finType, custName, onSaved, onHome }, ref) {
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
	const [advancing, setAdvancing] = useState(false);
	const [nextError, setNextError] = useState("");

	const { data, isLoading: loading, isError } = useQuery({
		queryKey: ['cam-revision-notes', apless, applNo],
		queryFn: async () => {
			const res = await api.get("/CAM/EditIndex/revision-notes", { params: { apless, applno: applNo } });
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
			const res = await api.post("/CAM/EditIndex/revision-notes/save", { apless, applno: applNo, notes });
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
			const res = await api.post("/CAM/EditIndex/revision-notes/next", { apless, applno: applNo });
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
				<p className="text-sm text-red-600">Failed to load Revision Notes. Please try again.</p>
			</div>
		);
	}
	if (data?.blocked) {
		return (
			<div className="rounded-2xl bg-[var(--app-card)] p-8 text-center shadow">
				<p className="text-sm text-red-600">
					{data.message || "The Application is on approval process or has finished. The Data cannot be changed"}
				</p>
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			{judul && (
				<div className="judul border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-right text-xs font-semibold text-blue-400 sm:px-6">
					{judul}
				</div>
			)}
			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<h2 className="text-xl font-bold text-[var(--app-text)]">Revision Notes</h2>
				<div className="space-y-2 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 shadow-sm sm:p-6">
					<textarea
						value={notes}
						onChange={e => setNotes(e.target.value.slice(0, MAX_LENGTH))}
						maxLength={MAX_LENGTH}
						rows={8}
						className="w-full rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
					/>
					<p className="text-right text-xs text-[var(--app-muted)]">{notes.length} / {MAX_LENGTH}</p>

					<div className="flex flex-wrap items-center justify-center gap-3 pt-2">
						<button
							type="button"
							onClick={handleSave}
							disabled={saving}
							className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
						>
							{saving ? "Saving…" : "Save"}
						</button>
					</div>

					{saveMessage && (
						<p className={`text-center text-sm ${saveMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
							{saveMessage.text}
						</p>
					)}
					{nextError && <p className="text-sm text-red-600">{nextError}</p>}
					{advancing && <p className="text-sm text-[var(--app-muted)]">Please wait…</p>}
				</div>
			</div>
		</div>
	);
});

export default CAMRevisionNotesPage;
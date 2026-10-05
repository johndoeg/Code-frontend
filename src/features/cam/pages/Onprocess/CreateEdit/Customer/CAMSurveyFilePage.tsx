import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import CKEditorNotes from '@/features/cam/components/CKEditorNotes';
import { isImageFile } from '@/shared/constants/DefaultValue';

interface SurveyFileItem {
	id: number;
	documentName: string;
	downloadUrl: string;
}

interface SurveySectionData {
	notes: string;
	files: SurveyFileItem[];
}

interface ContractSummary {
	status: string;
	brand: string;
	model: string;
	modelType: string;
	customerName: string;
	chassis: string;
	engine: string;
	bpkbName: string;
	bpkbAddress: string;
	year: string;
	condition: string;
	supplier: string;
	color: string;
	policeNo: string;
}

interface SurveyFileData {
	contract: ContractSummary;
	home: SurveySectionData;
	office: SurveySectionData;
	other: SurveySectionData;
}

export interface CAMSurveyFilePageProps {
	apless: string;
	applNo: string;
	status: string;
	finType: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5 sm:px-6">
			<span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
			<h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--app-text)]">{children}</h3>
		</div>
	);
}

function Info({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
	return (
		<div className={`grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 ${className}`}>
			<dt className="text-[13px] font-medium text-[var(--app-muted)]">{label}</dt>
			<dd className="break-words text-[13px] font-medium text-[var(--app-text)]">{value || <span className="text-[var(--app-muted)]">-</span>}</dd>
		</div>
	);
}

type SurveyType = "home" | "office" | "other";

const SURVEY_TYPE_CODES: Record<SurveyType, string> = {
	home: "home-survey",
	office: "office-survey",
	other: "other-survey",
};

const emptySection: SurveySectionData = { notes: "", files: [] };

function surveyFileDownloadUrl(id: number): string {
	const base = (api.defaults?.baseURL ?? "").replace(/\/$/, "");
	return `${base}/CAM/EditIndex/survey-file/download/${id}`;
}

interface PreviewState {
	open: boolean;
	id: number;
	name: string;
	url: string;
}

const PREVIEW_CLOSED: PreviewState = { open: false, id: 0, name: "", url: "" };
function DocPreviewModal({ state, onClose }: { state: PreviewState; onClose: () => void }) {
	const [imgError, setImgError] = useState(false);

	useEffect(() => {
		setImgError(false);
	}, [state.url]);

	if (!state.open) return null;

	const cleanName = state.name.split("?")[0];
	const isImage = isImageFile(cleanName);
	const isPdf = cleanName.split(".").pop()?.toLowerCase() === "pdf";

	return (
		<div
			onClick={onClose}
			className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
		>
			<div
				onClick={e => e.stopPropagation()}
				className="flex h-[90%] w-[90%] flex-col overflow-hidden rounded-xl bg-[var(--app-card)]"
			>
				<div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
					<span className="text-sm font-semibold text-[var(--app-text)]">{state.name}</span>
					<button
						type="button"
						onClick={onClose}
						className="text-lg leading-none text-[var(--app-muted)] hover:text-[var(--app-text)]"
					>
						✕
					</button>
				</div>
				<div className="flex-1 overflow-hidden p-5">
					{isImage && !imgError ? (
						<img
							src={state.url}
							alt={state.name}
							className="h-full w-full object-contain"
							onError={() => setImgError(true)}
						/>
					) : isPdf ? (
						<iframe title={state.name} src={state.url} width="100%" height="100%" />
					) : (
						<div className="pt-10 text-center">
							<p className="mb-3 text-[var(--app-muted)]">
								{imgError ? "Failed to load image." : "Preview not available for this file type."}
							</p>
						</div>
					)}
				</div>
				<div className="flex items-center justify-end border-t border-[var(--app-border)] px-4 py-3">
					<a
						href={surveyFileDownloadUrl(state.id)}
						className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
					>
						<svg
							width="16" height="16"
							viewBox="0 0 24 24" fill="none"
							stroke="currentColor" strokeWidth="2"
							strokeLinecap="round" strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M12 3v12m0 0-4-4m4 4 4-4" />
							<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
						</svg>
						Download
					</a>
				</div>
			</div>
		</div>
	);
}

function FileChip({
	file,
	onPreview,
	onDelete,
	deleting,
}: {
	file: SurveyFileItem;
	onPreview: (file: SurveyFileItem) => void;
	onDelete: (id: number) => void;
	deleting: boolean;
}) {
	return (
		<div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]/60 py-1 pl-3 pr-1.5 transition hover:border-blue-400/60 hover:bg-[var(--app-card)]">
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--app-muted)]" aria-hidden="true">
				<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
				<path d="M14 3v5h5" />
			</svg>
			<span className="max-w-[220px] truncate text-xs text-[var(--app-text)]" title={file.documentName}>
				{file.documentName}
			</span>
			<button
				type="button"
				onClick={() => onPreview(file)}
				title="View"
				aria-label="View"
				className="rounded-md p-1.5 text-orange-600 transition hover:bg-orange-500/10"
			>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			</button>
			<button
				type="button"
				onClick={() => onDelete(file.id)}
				disabled={deleting}
				title="Delete"
				aria-label="Delete"
				className="rounded-md p-1.5 text-red-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
			>
				{deleting ? (
					<span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-b-transparent" />
				) : (
					<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
						<path d="M3 6h18" />
						<path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
						<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
					</svg>
				)}
			</button>
		</div>
	);
}

function SurveySection({
	title,
	section,
	uploading,
	uploadError,
	deletingFileId,
	onNotesChange,
	onUpload,
	onDelete,
	onPreview,
}: {
	title: string;
	section: SurveySectionData;
	uploading: boolean;
	uploadError: string | null;
	deletingFileId: number | null;
	onNotesChange: (value: string) => void;
	onUpload: (fileList: FileList | null) => void;
	onDelete: (id: number) => void;
	onPreview: (file: SurveyFileItem) => void;
}) {
	return (
		<section className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)]">
			<SectionTitle>{title}</SectionTitle>
			<div className="space-y-4 px-4 py-4 sm:px-6">
				<div>
					<label
						className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--app-border)] bg-[var(--app-surface)]/50 px-4 py-4 text-[13px] font-medium text-[var(--app-muted)] transition hover:border-blue-400 hover:bg-blue-500/5 hover:text-blue-600 ${uploading ? "pointer-events-none opacity-60" : ""}`}
					>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
							<path d="M12 16V4m0 0-4 4m4-4 4 4" />
							<path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
						</svg>
						{uploading ? "Uploading…" : "Click to upload files"}
						<input
							type="file"
							multiple
							disabled={uploading}
							onChange={e => {
								onUpload(e.target.files);
								e.target.value = "";
							}}
							className="hidden"
						/>
					</label>
					{uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
				</div>

				{section.files.length > 0 && (
					<div className="flex flex-wrap gap-2">
						{section.files.map(f => (
							<FileChip
								key={f.id}
								file={f}
								onPreview={onPreview}
								onDelete={onDelete}
								deleting={deletingFileId === f.id}
							/>
						))}
					</div>
				)}

				<div>
					<label className="mb-1 block text-[13px] font-medium text-[var(--app-muted)]">Notes</label>
					<CKEditorNotes value={section.notes} onChange={onNotesChange} minHeight={250} />
				</div>
			</div>
		</section>
	);
}

const CAMSurveyFilePage = forwardRef<CamTabHandle, CAMSurveyFilePageProps>(function CAMSurveyFilePage({ apless, applNo, status, finType, custName, onSaved }, ref) {
	const [savingNext, setSavingNext] = useState(false);

	const [contract, setContract] = useState<ContractSummary | null>(null);
	const [sections, setSections] = useState<Record<SurveyType, SurveySectionData>>({
		home: emptySection, office: emptySection, other: emptySection,
	});
	const [uploadingType, setUploadingType] = useState<SurveyType | null>(null);
	const [uploadErrors, setUploadErrors] = useState<Record<SurveyType, string | null>>({
		home: null, office: null, other: null,
	});
	const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
	const [preview, setPreview] = useState<PreviewState>(PREVIEW_CLOSED);

	const { data: loadResult, isLoading: loading, isError, refetch } = useQuery({
		queryKey: ['cam-survey-file', apless, applNo, status],
		queryFn: async (): Promise<SurveyFileData> => {
			const res = await api.get("/CAM/EditIndex/survey-file", { params: { apless, applno: applNo, status } });
			return res.data;
		},
	});

	useEffect(() => {
		if (!loadResult) return;
		setContract(loadResult.contract);
		setSections({ home: loadResult.home, office: loadResult.office, other: loadResult.other });
	}, [loadResult]);

	const setNotes = (type: SurveyType, value: string) =>
		setSections(prev => ({ ...prev, [type]: { ...prev[type], notes: value } }));

	const handlePreview = (file: SurveyFileItem) => {
		setPreview({ open: true, id: file.id, name: file.documentName, url: file.downloadUrl });
	};

	const handleUpload = async (type: SurveyType, fileList: FileList | null) => {
		if (!fileList || fileList.length === 0) return;
		setUploadingType(type);
		setUploadErrors(prev => ({ ...prev, [type]: null }));
		try {
			const formData = new FormData();
			formData.append("apless", apless);
			formData.append("applno", applNo);
			formData.append("surveyType", SURVEY_TYPE_CODES[type]);
			Array.from(fileList).forEach(f => formData.append("files", f));

			const res = await api.post("/CAM/EditIndex/survey-file/upload", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			if (res.data.success) {
				setSections(prev => ({ ...prev, [type]: { ...prev[type], files: res.data.files } }));
			} else {
				setUploadErrors(prev => ({ ...prev, [type]: res.data.message || "Upload failed." }));
			}
		} catch {
			setUploadErrors(prev => ({ ...prev, [type]: "Upload failed. Please try again." }));
		} finally {
			setUploadingType(null);
		}
	};

	const handleDeleteFile = async (type: SurveyType, id: number) => {
		if (!window.confirm("Are you sure to delete this record?")) return;
		setDeletingFileId(id);
		try {
			await api.delete("/CAM/EditIndex/survey-file", { params: { apless, applno: applNo, id } });
			setSections(prev => ({ ...prev, [type]: { ...prev[type], files: prev[type].files.filter(f => f.id !== id) } }));
		} catch {
			alert("Delete failed. Please try again.");
		} finally {
			setDeletingFileId(null);
		}
	};

	const handleNext = useCallback(async () => {
		setSavingNext(true);
		try {
			const res = await api.post("/CAM/EditIndex/survey-file/next", {
				apless,
				applno: applNo,
				notesHome: sections.home.notes,
				notesOffice: sections.office.notes,
				notesOther: sections.other.notes,
			});
			if (res.data.success) {
				onSaved({ apless, applno: applNo });
			} else {
				alert(res.data.message || "Please upload Survey File.");
			}
		} catch {
			alert("Save failed. Please try again.");
		} finally {
			setSavingNext(false);
		}
	}, [apless, applNo, sections, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

	if (loading || !contract) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}
	if (isError) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
				Failed to load survey files. Please try again.
				<button onClick={() => refetch()} className="underline ml-4">Retry</button>
			</div>
		);
	}

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<DocPreviewModal state={preview} onClose={() => setPreview(PREVIEW_CLOSED)} />

			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Survey Files</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>

			<div className="space-y-4 px-4 py-5 sm:px-6">
				<section className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)]">
					<SectionTitle>Contract Summary</SectionTitle>
					<dl className="grid grid-cols-1 gap-x-10 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-2">
						<Info label="Contract Status" value={contract.status} />
						<Info label="Brand / Model / Type" value={`${contract.brand}/${contract.model}/${contract.modelType}`} />
						<Info label="Customer Name" value={contract.customerName} />
						<Info label="Chassis" value={contract.chassis} />
						<Info label="BPKB Name" value={contract.bpkbName} />
						<Info label="Engine" value={contract.engine} />
						<Info label="BPKB Address" value={contract.bpkbAddress} />
						<Info label="Year / Condition" value={`${contract.year}/${contract.condition}`} />
						<Info label="Supplier" value={contract.supplier} />
						<Info label="Color / Police No." value={`${contract.color}/${contract.policeNo}`} />
					</dl>
				</section>

				<SurveySection
					title="Home Survey Report"
					section={sections.home}
					uploading={uploadingType === "home"}
					uploadError={uploadErrors.home}
					deletingFileId={deletingFileId}
					onNotesChange={v => setNotes("home", v)}
					onUpload={fl => handleUpload("home", fl)}
					onDelete={id => handleDeleteFile("home", id)}
					onPreview={handlePreview}
				/>
				<SurveySection
					title="Office Survey Report"
					section={sections.office}
					uploading={uploadingType === "office"}
					uploadError={uploadErrors.office}
					deletingFileId={deletingFileId}
					onNotesChange={v => setNotes("office", v)}
					onUpload={fl => handleUpload("office", fl)}
					onDelete={id => handleDeleteFile("office", id)}
					onPreview={handlePreview}
				/>
				<SurveySection
					title="Other Survey Report"
					section={sections.other}
					uploading={uploadingType === "other"}
					uploadError={uploadErrors.other}
					deletingFileId={deletingFileId}
					onNotesChange={v => setNotes("other", v)}
					onUpload={fl => handleUpload("other", fl)}
					onDelete={id => handleDeleteFile("other", id)}
					onPreview={handlePreview}
				/>

				{savingNext && (
					<div className="flex items-center gap-2 text-[13px] font-medium text-[var(--app-muted)]">
						<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />
						Saving…
					</div>
				)}
			</div>
		</div>
	);
});

export default CAMSurveyFilePage;
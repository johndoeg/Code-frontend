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

const cellLabel =
	"border-b border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 py-2.5 align-top text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] whitespace-nowrap";
const cellValue = "border-b border-[var(--app-border)] px-4 py-2.5 align-top text-sm text-[var(--app-text)]";

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-t border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-3 first:border-t-0">
			<h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{children}</h2>
		</div>
	);
}

function Row({
	left,
	right,
}: {
	left: [string, React.ReactNode];
	right: [string, React.ReactNode];
}) {
	return (
		<tr>
			<td className={cellLabel}>{left[0]}</td>
			<td className={cellValue}>{left[1]}</td>
			<td className={cellLabel}>{right[0]}</td>
			<td className={cellValue}>{right[1]}</td>
		</tr>
	);
}

const fieldLabelCls = "text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] mb-1 block";

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
	const [viewHovered, setViewHovered] = useState(false);
	const [deleteHovered, setDeleteHovered] = useState(false);

	return (
		<div className="inline-flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-2 py-1.5">
			<span className="max-w-[220px] truncate text-xs text-[var(--app-muted)]" title={file.documentName}>
				{file.documentName}
			</span>
			<button
				type="button"
				onClick={() => onPreview(file)}
				onMouseEnter={() => setViewHovered(true)}
				onMouseLeave={() => setViewHovered(false)}
				className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition ${viewHovered
					? "border-orange-600 bg-orange-500 text-white"
					: "border-orange-600 bg-orange-100 text-orange-800"
					}`}
			>
				<svg
					width="14" height="14"
					viewBox="0 0 24 24" fill="none"
					stroke="currentColor" strokeWidth="2"
					strokeLinecap="round" strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
				View
			</button>
			<button
				type="button"
				onClick={() => onDelete(file.id)}
				onMouseEnter={() => setDeleteHovered(true)}
				onMouseLeave={() => setDeleteHovered(false)}
				disabled={deleting}
				className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${deleteHovered
					? "border-red-600 bg-red-500 text-white"
					: "border-red-600 bg-red-100 text-red-800"
					}`}
			>
				{deleting ? "Deleting…" : "Delete"}
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
		<>
			<SectionHeader>{title}</SectionHeader>
			<div className="px-6 py-4 space-y-4">
				<div>
					<input
						type="file"
						multiple
						disabled={uploading}
						onChange={e => {
							onUpload(e.target.files);
							e.target.value = "";
						}}
						className="text-sm text-[var(--app-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:cursor-pointer hover:file:bg-blue-700 disabled:opacity-50"
					/>
					{uploading && <p className="text-xs text-[var(--app-muted)] mt-1">Uploading…</p>}
					{uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
				</div>

				{section.files.length > 0 && (
					<div className="flex flex-wrap gap-3">
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
					<label className={fieldLabelCls}>Notes</label>
					<CKEditorNotes value={section.notes} onChange={onNotesChange} minHeight={250} />
				</div>
			</div>
		</>
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
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			<DocPreviewModal state={preview} onClose={() => setPreview(PREVIEW_CLOSED)} />

			{judul && (
				<div className="judul border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-right text-xs font-semibold text-blue-400 sm:px-6">
					{judul}
				</div>
			)}
			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<h2 className="text-xl font-bold text-[var(--app-text)] mb-1">Survey Files</h2>
				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					<SectionHeader>Contract Summary</SectionHeader>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[820px] border-collapse text-sm">
							<colgroup>
								<col style={{ width: "15%" }} />
								<col style={{ width: "40%" }} />
								<col style={{ width: "12%" }} />
								<col style={{ width: "33%" }} />
							</colgroup>
							<tbody>
								<Row
									left={["Contract Status", contract.status]}
									right={["Brand / Model / Type", `${contract.brand}/${contract.model}/${contract.modelType}`]}
								/>
								<Row left={["Customer Name", contract.customerName]} right={["Chassis", contract.chassis]} />
								<Row left={["BPKB Name", contract.bpkbName]} right={["Engine", contract.engine]} />
								<Row
									left={["BPKB Address", contract.bpkbAddress]}
									right={["Year / Condition", `${contract.year}/${contract.condition}`]}
								/>
								<Row
									left={["Supplier", contract.supplier]}
									right={["Color / Police No.", `${contract.color}/${contract.policeNo}`]}
								/>
							</tbody>
						</table>
					</div>

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
				</div>

				{savingNext && <p className="text-sm text-[var(--app-muted)] mt-3">Saving…</p>}
			</div>
		</div>
	);
});

export default CAMSurveyFilePage;
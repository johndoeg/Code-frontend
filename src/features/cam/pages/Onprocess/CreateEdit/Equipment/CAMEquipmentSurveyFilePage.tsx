import { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import { MAX_FILE_LIMIT } from '@/shared/constants/DefaultValue';
import CKEditorNotes from '@/features/cam/components/CKEditorNotes';

export interface CAMEquipmentSurveyFilePageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	status: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

interface SurveyFileItem {
	id: number;
	documentName: string;
	downloadUrl?: string;
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

type UploadCategory = "front-photo" | "vehicle-photo" | "data-bpkb" | "vehicle-data";

interface FilesState {
	frontPhoto: SurveyFileItem[];
	vehiclePhoto: SurveyFileItem[];
	dataBpkb: SurveyFileItem[];
	vehicleData: SurveyFileItem[];
}

const CATEGORY_KEY: Record<UploadCategory, keyof FilesState> = {
	"front-photo": "frontPhoto",
	"vehicle-photo": "vehiclePhoto",
	"data-bpkb": "dataBpkb",
	"vehicle-data": "vehicleData",
};

const emptyFiles: FilesState = { frontPhoto: [], vehiclePhoto: [], dataBpkb: [], vehicleData: [] };

const cellLabel =
	"border-b border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 py-2.5 align-top text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)] whitespace-nowrap";
const cellValue = "border-b border-[var(--app-border)] px-4 py-2.5 align-top text-sm text-[var(--app-text)]";

const btnView =
	"rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50";
const btnDelete =
	"rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50";
const btnNeutral =
	"rounded-lg bg-[var(--app-surface-alt)] px-3 py-1.5 text-xs font-medium text-[var(--app-muted)] transition hover:bg-slate-200";

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
const MAX_FILE_SIZE = MAX_FILE_LIMIT;

function isJpg(file: File): boolean {
	const name = file.name.toLowerCase();
	return file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
}
function isPdf(file: File): boolean {
	const name = file.name.toLowerCase();
	return file.type === "application/pdf" || name.endsWith(".pdf");
}

function validateFiles(fileList: FileList, kind: "photo" | "data" | "mix"): string | null {
	for (const file of Array.from(fileList)) {
		if (kind === "photo" && !isJpg(file)) return "Please select a JPG file (.jpg or .jpeg).";
		if (kind === "data" && !isPdf(file)) return "Please select a PDF file (.pdf).";
		if (kind === "mix" && !isJpg(file) && !isPdf(file)) {
			return "Please select a JPG file (.jpg or .jpeg) or PDF file (.pdf).";
		}
		if (file.size > MAX_FILE_SIZE) return "File size must not exceed 2MB.";
	}
	return null;
}

interface PreviewFile {
	id: number;
	name: string;
}

const SURVEY_API_BASE = "/CAM/EditIndex/eq-survey-file";

function absoluteUrl(path: string): string {
	const base = (api.defaults?.baseURL ?? "").replace(/\/$/, "");
	return `${base}${path}`;
}

export function surveyFileViewUrl(id: number): string {
	return absoluteUrl(`${SURVEY_API_BASE}/view/${id}`);
}

export function surveyFileDownloadUrl(id: number): string {
	return absoluteUrl(`${SURVEY_API_BASE}/download/${id}`);
}

function isImageFile(name: string): boolean {
	return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
}
function isPdfFile(name: string): boolean {
	return /\.pdf$/i.test(name);
}

function SurveyFilePreviewModal({ file, onClose }: { file: PreviewFile | null; onClose: () => void }) {
	if (!file) return null;

	const src = surveyFileViewUrl(file.id);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
			<div
				onClick={e => e.stopPropagation()}
				className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[var(--app-card)] shadow-xl"
			>
				<div className="flex items-center justify-between border-b border-[var(--app-border)] px-5 py-3">
					<p className="truncate text-sm font-semibold text-[var(--app-text)]">{file.name}</p>
					<button type="button" onClick={onClose} className="text-[var(--app-muted)] hover:text-[var(--app-text)]">✕</button>
				</div>
				<div className="flex flex-1 items-center justify-center overflow-auto bg-[var(--app-surface)] p-4">
					{isImageFile(file.name) ? (
						<img
							src={src}
							alt={file.name}
							className="max-h-[76vh] max-w-full object-contain"
							onError={e => {
								(e.currentTarget as HTMLImageElement).style.display = "none";
								const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
								if (fallback) fallback.style.display = "block";
							}}
						/>
					) : isPdfFile(file.name) ? (
						<iframe src={src} title={file.name} className="h-[76vh] w-full border-0" />
					) : (
						<p className="text-sm text-[var(--app-muted)]">Preview not available for this file type.</p>
					)}
					{isImageFile(file.name) && (
						<p className="hidden text-sm text-[var(--app-muted)]">
							Couldn't load this image. Use Download instead.
						</p>
					)}
				</div>
				<div className="flex justify-end gap-3 border-t border-[var(--app-border)] px-5 py-3">
					<a href={surveyFileDownloadUrl(file.id)} download={file.name} className={btnView}>
						Download
					</a>
					<button type="button" onClick={onClose} className={btnNeutral}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

function UploadSlot({
	title,
	remark,
	accept,
	multiple,
	kind,
	files,
	uploading,
	uploadError,
	deletingFileId,
	onUpload,
	onDelete,
	onPreview,
}: {
	title: string;
	remark: React.ReactNode;
	accept: string;
	multiple: boolean;
	kind: "photo" | "data" | "mix";
	files: SurveyFileItem[];
	uploading: boolean;
	uploadError: string | null;
	deletingFileId: number | null;
	onUpload: (fileList: FileList) => void;
	onDelete: (id: number) => void;
	onPreview: (file: SurveyFileItem) => void;
}) {
	return (
		<div className="rounded-xl border border-[var(--app-border)] p-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-sm font-semibold text-[var(--app-text)] mb-1">{title}</p>
					<input
						type="file"
						multiple={multiple}
						accept={accept}
						disabled={uploading}
						onChange={e => {
							const fl = e.target.files;
							if (fl && fl.length > 0) {
								const err = validateFiles(fl, kind);
								if (err) {
									alert(err);
								} else {
									onUpload(fl);
								}
							}
							e.target.value = "";
						}}
						className="text-sm text-[var(--app-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white file:cursor-pointer hover:file:bg-blue-700 disabled:opacity-50"
					/>
					{uploading && <p className="text-xs text-[var(--app-muted)] mt-1">Uploading…</p>}
					{uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
				</div>
				<div className="shrink-0 text-[11px] leading-relaxed text-red-600">
					Remark :<br />
					{remark}
				</div>
			</div>

			{files.length > 0 && (
				<div className="mt-3 overflow-hidden rounded-lg border border-[var(--app-border)]">
					<table className="w-full border-collapse text-sm">
						<tbody>
							{files.map(f => (
								<tr key={f.id}>
									<td className={cellValue}>{f.documentName}</td>
									<td className={cellValue + " w-48"}>
										<div className="flex gap-2">
											<button type="button" onClick={() => onPreview(f)} className={btnView}>
												View
											</button>
											<button
												type="button"
												onClick={() => onDelete(f.id)}
												disabled={deletingFileId === f.id}
												className={btnDelete}
											>
												{deletingFileId === f.id ? "Deleting…" : "Delete"}
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

export default forwardRef<CamTabHandle, CAMEquipmentSurveyFilePageProps>(function CAMEquipmentSurveyFilePage(
	{ apless, applNo, finType, custName, status, onSaved },
	ref
) {
	const [notes, setNotes] = useState("");
	const [files, setFiles] = useState<FilesState>(emptyFiles);
	const [uploadingCategory, setUploadingCategory] = useState<UploadCategory | null>(null);
	const [uploadErrors, setUploadErrors] = useState<Record<UploadCategory, string | null>>({
		"front-photo": null,
		"vehicle-photo": null,
		"data-bpkb": null,
		"vehicle-data": null,
	});
	const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
	const [savingNext, setSavingNext] = useState(false);
	const [nextError, setNextError] = useState("");
	const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

	const { data, isLoading: loading, isError, refetch } = useQuery({
		queryKey: ['cam-eq-survey-file', apless, applNo, status],
		queryFn: async () => {
			const res = await api.get("/CAM/EditIndex/eq-survey-file", { params: { apless, applno: applNo, status } });
			return res.data as { contract: ContractSummary; notes?: string; files?: FilesState };
		},
	});

	useEffect(() => {
		if (data) {
			setNotes(data.notes || "");
			setFiles(data.files || emptyFiles);
		}
	}, [data]);

	const contract = data?.contract ?? null;

	const handleUpload = async (category: UploadCategory, fileList: FileList) => {
		setUploadingCategory(category);
		setUploadErrors(prev => ({ ...prev, [category]: null }));
		try {
			const formData = new FormData();
			formData.append("apless", apless);
			formData.append("applno", applNo);
			formData.append("category", category);
			Array.from(fileList).forEach(f => formData.append("files", f));

			const res = await api.post("/CAM/EditIndex/eq-survey-file/upload", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			if (res.data.success) {
				await refetch();
			} else {
				setUploadErrors(prev => ({ ...prev, [category]: res.data.message || "Upload failed." }));
			}
		} catch (err: any) {
			setUploadErrors(prev => ({
				...prev,
				[category]: err?.response?.data?.message || "Upload failed. Please try again.",
			}));
		} finally {
			setUploadingCategory(null);
		}
	};

	const handleDelete = async (category: UploadCategory, id: number) => {
		if (!window.confirm("Are you sure to delete this record?")) return;
		setDeletingFileId(id);
		try {
			await api.delete("/CAM/EditIndex/eq-survey-file", { params: { apless, applno: applNo, id } });
			setFiles(prev => ({
				...prev,
				[CATEGORY_KEY[category]]: prev[CATEGORY_KEY[category]].filter(f => f.id !== id),
			}));
		} catch {
			alert("Delete failed. Please try again.");
		} finally {
			setDeletingFileId(null);
		}
	};

	const handlePreview = (f: SurveyFileItem) => setPreviewFile({ id: f.id, name: f.documentName });

	const handleNext = useCallback(async () => {
		setSavingNext(true);
		setNextError("");
		try {
			const res = await api.post("/CAM/EditIndex/eq-survey-file/next", { apless, applno: applNo, notes });
			if (res.data.success) {
				onSaved({ apless, applno: applNo });
			} else {
				setNextError(res.data.message || "Used car must at least have 1 survey file");
			}
		} catch (err: any) {
			setNextError(err?.response?.data?.message || "Save failed. Please try again.");
		} finally {
			setSavingNext(false);
		}
	}, [apless, applNo, notes, onSaved]);

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
				<button type="button" onClick={() => refetch()} className="underline ml-4">
					Retry
				</button>
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
			<div>
				<SurveyFilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

				<h2 className="text-xl font-bold text-[var(--app-text)] mb-1">Vehicle Survey Report Form</h2>
				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					<SectionHeader>Contract Summary</SectionHeader>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[820px] border-collapse text-sm">
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

					<SectionHeader>Vehicle Photo</SectionHeader>
					<div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
						<UploadSlot
							title="Front only"
							remark={
								<>
									- Format file that can be uploaded is "JPG" only
									<br />- Max. size that can be uploaded is 2 MB
								</>
							}
							accept=".jpg,.jpeg,image/jpeg"
							multiple={false}
							kind="photo"
							files={files.frontPhoto}
							uploading={uploadingCategory === "front-photo"}
							uploadError={uploadErrors["front-photo"]}
							deletingFileId={deletingFileId}
							onUpload={fl => handleUpload("front-photo", fl)}
							onDelete={id => handleDelete("front-photo", id)}
							onPreview={handlePreview}
						/>
						<UploadSlot
							title="Vehicle Photo"
							remark={
								<>
									- Format file that can be uploaded are JPG, JPEG, and/or PDF
									<br />- Max. size per upload is 2 MB
								</>
							}
							accept=".jpg,.jpeg,.pdf"
							multiple={true}
							kind="mix"
							files={files.vehiclePhoto}
							uploading={uploadingCategory === "vehicle-photo"}
							uploadError={uploadErrors["vehicle-photo"]}
							deletingFileId={deletingFileId}
							onUpload={fl => handleUpload("vehicle-photo", fl)}
							onDelete={id => handleDelete("vehicle-photo", id)}
							onPreview={handlePreview}
						/>
					</div>

					<SectionHeader>Vehicle Data</SectionHeader>
					<div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
						<UploadSlot
							title="BPKB, Faktur, Sertifikat NIK (if any) and/or Form A (if any)"
							remark={
								<>
									- Format file that can be uploaded is "PDF" only
									<br />- Max. size that can be uploaded is 2 MB
								</>
							}
							accept=".pdf,application/pdf"
							multiple={false}
							kind="data"
							files={files.dataBpkb}
							uploading={uploadingCategory === "data-bpkb"}
							uploadError={uploadErrors["data-bpkb"]}
							deletingFileId={deletingFileId}
							onUpload={fl => handleUpload("data-bpkb", fl)}
							onDelete={id => handleDelete("data-bpkb", id)}
							onPreview={handlePreview}
						/>
						<UploadSlot
							title="STNK"
							remark={
								<>
									- Format file that can be uploaded are JPG, JPEG, and/or PDF
									<br />- Max. size per upload is 2 MB
								</>
							}
							accept=".jpg,.jpeg,.pdf"
							multiple={true}
							kind="mix"
							files={files.vehicleData}
							uploading={uploadingCategory === "vehicle-data"}
							uploadError={uploadErrors["vehicle-data"]}
							deletingFileId={deletingFileId}
							onUpload={fl => handleUpload("vehicle-data", fl)}
							onDelete={id => handleDelete("vehicle-data", id)}
							onPreview={handlePreview}
						/>
					</div>

					<SectionHeader>Notes</SectionHeader>
					<div className="px-6 py-4">
						<label className={fieldLabelCls}>Notes</label>
						<CKEditorNotes value={notes} onChange={setNotes} minHeight={250} />
					</div>
				</div>

				{nextError && <p className="mt-3 text-sm text-red-600">{nextError}</p>}
				{savingNext && <p className="mt-3 text-sm text-[var(--app-muted)]">Saving…</p>}
			</div>
		</div>
	);
});
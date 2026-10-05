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


const btnView =
	"rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50";
const btnNeutral =
	"rounded-lg bg-[var(--app-surface-alt)] px-3 py-1.5 text-xs font-medium text-[var(--app-muted)] transition hover:bg-slate-200";

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
	return (
		<div className="mb-3 flex items-center gap-2">
			<span className="h-4 w-1 rounded-full bg-blue-500" />
			<h3 className="text-sm font-semibold text-[var(--app-text)]">{children}</h3>
			{hint && <span className="text-xs text-[var(--app-muted)]">{hint}</span>}
		</div>
	);
}

function Card({ children }: { children: React.ReactNode }) {
	return <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card)] p-4 sm:p-5">{children}</section>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex min-w-0 items-baseline gap-3 border-b border-[var(--app-border)]/60 pb-2">
			<dt className="w-36 shrink-0 text-xs font-medium text-[var(--app-muted)]">{label}</dt>
			<dd className="min-w-0 flex-1 break-words text-sm font-medium text-[var(--app-text)]">: {value || "-"}</dd>
		</div>
	);
}

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

function FileIcon({ name }: { name: string }) {
	const pdf = /\.pdf$/i.test(name);
	return (
		<span
			className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${pdf ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
				}`}
		>
			{pdf ? "PDF" : "IMG"}
		</span>
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
		<div className="flex flex-col rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]/40 p-4">
			<p className="mb-2 text-sm font-semibold text-[var(--app-text)]">{title}</p>

			<label
				className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[var(--app-border)] bg-[var(--app-card)] px-4 py-5 text-center transition hover:border-blue-500 hover:bg-blue-500/5 ${uploading ? "pointer-events-none opacity-60" : ""
					}`}
			>
				<svg viewBox="0 0 20 20" width="22" height="22" fill="currentColor" className="text-blue-500" aria-hidden="true">
					<path d="M10 2.5a.75.75 0 01.53.22l3 3a.75.75 0 11-1.06 1.06l-1.72-1.72v7.19a.75.75 0 01-1.5 0V5.06L7.53 6.78a.75.75 0 01-1.06-1.06l3-3A.75.75 0 0110 2.5zM3.5 12.75a.75.75 0 011.5 0v2.5c0 .14.11.25.25.25h9.5a.25.25 0 00.25-.25v-2.5a.75.75 0 011.5 0v2.5A1.75 1.75 0 0114.75 17h-9.5A1.75 1.75 0 013.5 15.25v-2.5z" />
				</svg>
				<span className="text-sm font-medium text-[var(--app-text)]">
					{uploading ? "Uploading…" : multiple ? "Choose files to upload" : "Choose a file to upload"}
				</span>
				<span className="text-[11px] text-[var(--app-muted)]">Click to browse</span>
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
					className="hidden"
				/>
			</label>

			{uploadError && <p className="mt-2 text-xs text-red-600">{uploadError}</p>}

			<div className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-600">
				<span className="font-semibold">Remark</span>
				<br />
				{remark}
			</div>

			{files.length > 0 && (
				<ul className="mt-3 space-y-2">
					{files.map(f => (
						<li
							key={f.id}
							className="flex items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2"
						>
							<FileIcon name={f.documentName} />
							<span className="min-w-0 flex-1 truncate text-sm text-[var(--app-text)]" title={f.documentName}>
								{f.documentName}
							</span>
							<button
								type="button"
								onClick={() => onPreview(f)}
								title="View"
								aria-label={`View ${f.documentName}`}
								className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 transition hover:bg-blue-500/20"
							>
								<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
									<path d="M10 4C5.5 4 2.5 8 1.8 9.2a1.5 1.5 0 000 1.6C2.5 12 5.5 16 10 16s7.5-4 8.2-5.2a1.5 1.5 0 000-1.6C17.5 8 14.5 4 10 4zm0 9.5a3.5 3.5 0 110-7 3.5 3.5 0 010 7zm0-5.5a2 2 0 100 4 2 2 0 000-4z" />
								</svg>
							</button>
							<button
								type="button"
								onClick={() => onDelete(f.id)}
								disabled={deletingFileId === f.id}
								title="Delete"
								aria-label={`Delete ${f.documentName}`}
								className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500 transition hover:bg-red-500/20 disabled:opacity-50"
							>
								{deletingFileId === f.id ? (
									<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
								) : (
									<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
										<path d="M8 2.5A1.5 1.5 0 006.5 4v.5H3.75a.75.75 0 000 1.5h.6l.67 9.4A2 2 0 007.02 17.3h5.96a2 2 0 002-1.9L15.65 6h.6a.75.75 0 000-1.5H13.5V4A1.5 1.5 0 0012 2.5H8zm0 2V4h4v.5H8zM8.5 8a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0V8zm3 0a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0V8z" />
									</svg>
								)}
							</button>
						</li>
					))}
				</ul>
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
		<div className="space-y-4 overflow-hidden rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl">
			<SurveyFilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M4.6 5.5A2 2 0 016.4 4.2h7.2a2 2 0 011.8 1.3l1 2.5h.1A1.5 1.5 0 0118 9.5V13a1 1 0 01-1 1h-.6a2 2 0 01-3.8 0H7.4a2 2 0 01-3.8 0H3a1 1 0 01-1-1V9.5A1.5 1.5 0 013.5 8h.1l1-2.5zM6.4 5.7L5.5 8h9l-.9-2.3a.5.5 0 00-.5-.3H6.9a.5.5 0 00-.5.3zM5.5 15a.8.8 0 100-1.6.8.8 0 000 1.6zm9 0a.8.8 0 100-1.6.8.8 0 000 1.6z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Vehicle Survey Report Form</h2>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>

			<div className="space-y-4 px-4 pb-5 sm:px-6">
				<Card>
					<SectionTitle>Contract Summary</SectionTitle>
					<dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
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
				</Card>

				<Card>
					<SectionTitle>Vehicle Photo</SectionTitle>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
				</Card>

				<Card>
					<SectionTitle>Vehicle Data</SectionTitle>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
				</Card>

				<Card>
					<SectionTitle>Notes</SectionTitle>
					<CKEditorNotes value={notes} onChange={setNotes} minHeight={250} />
				</Card>

				{nextError && (
					<div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-600">{nextError}</div>
				)}
				{savingNext && (
					<div className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
						<span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
						Saving…
					</div>
				)}
			</div>
		</div>
	);
});
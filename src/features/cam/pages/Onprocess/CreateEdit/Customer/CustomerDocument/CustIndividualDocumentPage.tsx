import React, { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/axiosInstance';
import { EyeIcon, TrashIcon, PlusIcon, FileIcon, ImageIcon, PdfIcon, XIcon, DownloadIcon } from "./Icons";
import { getFileKind } from "./FileKind";

interface DocumentFileItem {
	id: number;
	documentName: string;
	downloadUrl: string;
}

interface IndividualDocumentData {
	citizen: string;
	spouseCitizen: string;
	files: Record<string, DocumentFileItem[]>;
}

export interface CustIndividualDocumentPageProps {
	apless: string;
	applNo: string;
	finType: string;
	custName?: string;
	onSaved: (result: { apless: string; applno: string }) => void;
}

export interface CamTabHandle {
	save: () => void;
}

// card per document group (WNI / WNA / Additional / BPKB / Individual)
function Group({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)]">
			<div className="flex items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5 sm:px-6">
				<span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-500 to-indigo-500" />
				<h3 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--app-text)]">{title}</h3>
			</div>
			<div className="divide-y divide-[var(--app-border)] px-4 sm:px-6">{children}</div>
		</section>
	);
}

const KindIcon: React.FC<{ fileName: string; className?: string }> = ({ fileName, className }) => {
	const kind = getFileKind(fileName);
	if (kind === "image") return <ImageIcon className={className} />;
	if (kind === "pdf") return <PdfIcon className={className} />;
	return <FileIcon className={className} />;
};

function FilePreviewModal({
	file,
	onClose,
}: {
	file: DocumentFileItem;
	onClose: () => void;
}) {
	const kind = getFileKind(file.documentName);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
			onClick={onClose}
		>
			<div
				className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-[var(--app-card)] shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
					<p className="truncate pr-4 text-sm font-medium text-[var(--app-text)]" title={file.documentName}>
						{file.documentName}
					</p>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close preview"
						className="rounded-md p-1 text-[var(--app-muted)] hover:bg-[var(--app-surface-alt)] hover:text-[var(--app-text)]"
					>
						<XIcon className="h-5 w-5" />
					</button>
				</div>
				<div className="flex flex-1 items-center justify-center overflow-auto bg-[var(--app-surface)] p-4">
					{kind === "image" && (
						<img src={file.downloadUrl} alt={file.documentName} className="max-h-[60vh] max-w-full rounded-md object-contain" />
					)}
					{kind === "pdf" && (
						<iframe src={file.downloadUrl} title={file.documentName} className="h-[65vh] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-card)]" />
					)}
					{kind === "other" && (
						<div className="py-10 text-center text-sm text-[var(--app-muted)]">
							<p>Preview isn't available for this file type.</p>
							<p className="mt-1">Download it to view the contents.</p>
						</div>
					)}
				</div>
				<div className="flex justify-end border-t border-[var(--app-border)] px-4 py-3">
					<a
						href={file.downloadUrl}
						className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
					>
						<DownloadIcon className="h-4 w-4" />
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
	file: DocumentFileItem;
	onPreview: (file: DocumentFileItem) => void;
	onDelete: (id: number) => void;
	deleting: boolean;
}) {
	return (
		<div className="flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]/60 py-1 pl-3 pr-1.5 text-[13px] transition hover:border-blue-400/60 hover:bg-[var(--app-card)]">
			<KindIcon fileName={file.documentName} className="h-4 w-4 shrink-0 text-[var(--app-muted)]" />
			<span className="min-w-0 flex-1 truncate text-[var(--app-text)]" title={file.documentName}>
				{file.documentName}
			</span>
			<button
				type="button"
				onClick={() => onPreview(file)}
				title="View"
				aria-label={`View ${file.documentName}`}
				className="shrink-0 rounded-md p-1.5 text-orange-600 transition hover:bg-orange-500/10"
			>
				<EyeIcon className="h-4 w-4" />
			</button>
			<button
				type="button"
				onClick={() => onDelete(file.id)}
				disabled={deleting}
				title="Delete"
				aria-label={`Delete ${file.documentName}`}
				className="shrink-0 rounded-md p-1.5 text-red-600 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
			>
				{deleting ? (
					<span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-b-transparent" />
				) : (
					<TrashIcon className="h-4 w-4" />
				)}
			</button>
		</div>
	);
}

function DocumentUploadRow({
	label,
	files,
	uploading,
	uploadError,
	deletingFileId,
	onUpload,
	onPreview,
	onDelete,
}: {
	label: string;
	files: DocumentFileItem[];
	uploading: boolean;
	uploadError: string | null;
	deletingFileId: number | null;
	onUpload: (fileList: FileList | null) => void;
	onPreview: (file: DocumentFileItem) => void;
	onDelete: (id: number) => void;
}) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const uploaded = files.length > 0;
	return (
		<div className="grid grid-cols-1 gap-x-6 gap-y-2 py-3 md:grid-cols-[280px_minmax(0,1fr)]">
			<div className="flex items-start gap-2 pt-1">
				<span
					className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${uploaded ? "bg-green-500" : "bg-[var(--app-border)]"}`}
					title={uploaded ? "Uploaded" : "No file yet"}
				/>
				<p className="text-[13px] font-medium text-[var(--app-text)]">{label}</p>
			</div>

			<div className="min-w-0 space-y-1.5">
				{files.map(f => (
					<FileChip key={f.id} file={f} onPreview={onPreview} onDelete={onDelete} deleting={deletingFileId === f.id} />
				))}
				<button
					type="button"
					disabled={uploading}
					onClick={() => inputRef.current?.click()}
					className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--app-border)] px-3 py-1.5 text-[13px] font-medium text-[var(--app-muted)] transition hover:border-blue-400 hover:bg-blue-500/5 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{uploading ? (
						<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
					) : (
						<PlusIcon className="h-3.5 w-3.5" />
					)}
					{uploading ? "Uploading…" : "Add file"}
				</button>
				<input
					ref={inputRef}
					type="file"
					multiple
					disabled={uploading}
					onChange={e => {
						onUpload(e.target.files);
						e.target.value = "";
					}}
					className="hidden"
				/>
				{uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
			</div>
		</div>
	);
}

const CustIndividualDocumentPage = forwardRef<CamTabHandle, CustIndividualDocumentPageProps>(function CustIndividualDocumentPage({ apless, applNo, finType, custName, onSaved }, ref) {
	const [savingNext, setSavingNext] = useState(false);

	const [files, setFiles] = useState<Record<string, DocumentFileItem[]>>({});
	const [uploadingType, setUploadingType] = useState<string | null>(null);
	const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
	const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
	const [previewFile, setPreviewFile] = useState<DocumentFileItem | null>(null);

	const { data, isLoading: loading, isError, refetch } = useQuery({
		queryKey: ['cam-individual-document', apless, applNo],
		queryFn: async (): Promise<IndividualDocumentData> => {
			const res = await api.get("/CAM/EditIndex/document/individual", { params: { apless, applno: applNo } });
			return res.data;
		},
	});

	useEffect(() => {
		if (data) setFiles(data.files || {});
	}, [data]);

	const citizen = data?.citizen ?? "WNI";
	const spouseCitizen = data?.spouseCitizen ?? "WNI";

	const filesFor = (docType: string) => files[docType] || [];

	const handleUpload = async (docType: string, fileList: FileList | null) => {
		if (!fileList || fileList.length === 0) return;
		setUploadingType(docType);
		setUploadErrors(prev => ({ ...prev, [docType]: null }));
		try {
			const formData = new FormData();
			formData.append("apless", apless);
			formData.append("applno", applNo);
			formData.append("documentType", docType);
			Array.from(fileList).forEach(f => formData.append("files", f));

			const res = await api.post("/CAM/EditIndex/document/individual/upload", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			if (res.data.success) {
				setFiles(prev => ({ ...prev, [docType]: res.data.files }));
			} else {
				setUploadErrors(prev => ({ ...prev, [docType]: res.data.message || "Upload failed." }));
			}
		} catch {
			setUploadErrors(prev => ({ ...prev, [docType]: "Upload failed. Please try again." }));
		} finally {
			setUploadingType(null);
		}
	};

	const handleDeleteFile = async (docType: string, id: number) => {
		if (!window.confirm("Are you sure to delete this record?")) return;
		setDeletingFileId(id);
		try {
			await api.delete("/CAM/EditIndex/document/individual", { params: { apless, applno: applNo, id } });
			setFiles(prev => ({ ...prev, [docType]: (prev[docType] || []).filter(f => f.id !== id) }));
		} catch {
			alert("Delete failed. Please try again.");
		} finally {
			setDeletingFileId(null);
		}
	};

	const handleNext = useCallback(async () => {
		setSavingNext(true);
		try {
			const res = await api.post("/CAM/EditIndex/document/individual/next", { apless, applno: applNo });
			if (res.data.success) {
				onSaved({ apless, applno: applNo });
			} else {
				alert(res.data.message || "Please upload Customer's Document.");
			}
		} catch {
			alert("Save failed. Please try again.");
		} finally {
			setSavingNext(false);
		}
	}, [apless, applNo, onSaved]);

	useImperativeHandle(ref, () => ({ save: handleNext }), [handleNext]);

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
				Failed to load customer documents. Please try again.
				<button onClick={() => refetch()} className="underline ml-4">Retry</button>
			</div>
		);
	}

	const row = (docType: string, label: string) => (
		<DocumentUploadRow
			key={docType}
			label={label}
			files={filesFor(docType)}
			uploading={uploadingType === docType}
			uploadError={uploadErrors[docType] || null}
			deletingFileId={deletingFileId}
			onUpload={fl => handleUpload(docType, fl)}
			onPreview={setPreviewFile}
			onDelete={id => handleDeleteFile(docType, id)}
		/>
	);

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3 sm:px-6">
				<h2 className="text-[17px] font-bold text-[var(--app-text)]">Customer's Document</h2>
				{judul && <span className="text-xs font-bold text-blue-700">{judul}</span>}
			</div>

			<div className="space-y-4 px-4 py-5 sm:px-6">
				{citizen === "WNI" && (
					<Group title="WNI">
						{row("cust-spouse-kk", "Customer's Spouse Family Card")}
					</Group>
				)}
				{citizen === "WNA" && (
					<Group title="WNA">
						{row("cust-kitas", "KITAS/KITAP a/n Pelanggan")}
						{spouseCitizen === "WNI"
							? row("cust-wna-spouse-ktp", "KITAS/KITAP a/n Suami/Istri Pelanggan")
							: row("cust-spouse-kitas", "KITAS/KITAP a/n Suami/Istri Pelanggan")}
						{row("cust-family-tree", "SK. Susunan Keluarga Pendatang (SKSP) WNA")}
						{row("cust-reference", "Surat Referensi Kerja dari Perusahaan WNA Bekerja")}
					</Group>
				)}

				<Group title="Additional Document">
					{row("cust-salary-receipt", "Salary Receipt")}
				</Group>

				<Group title="BPKB Document">
					{row("cust-ktp-bpkb", "BPKB ID")}
					{row("cust-kk-bpkb", "BPKB Family Card")}
					{row("cust-other", "Other")}
				</Group>

				<Group title="Individual Document">
					{row("cust-ktp", "ID Card")}
					{citizen === "WNI" &&
						(spouseCitizen === "WNI"
							? row("cust-spouse-ktp", "Spouse ID Card")
							: row("cust-spouse-kitas", "Spouse ID Card"))}
					{row("cust-kk", "KK")}
					{row("cust-npwp", "NPWP")}
					{row("cust-spk", "SPK")}
					{row("cust-marriage-or-death-statement", "Marriage/ Death/ Divorce/ Prenuptial Statement")}
				</Group>

				{savingNext && (
					<div className="flex items-center gap-2 text-[13px] font-medium text-[var(--app-muted)]">
						<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-b-transparent" />
						Saving…
					</div>
				)}
			</div>

			{previewFile && (
				<FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
			)}
		</div>
	);
});

export default CustIndividualDocumentPage;
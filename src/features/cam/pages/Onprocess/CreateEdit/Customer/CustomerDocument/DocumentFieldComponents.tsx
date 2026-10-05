import React, { useRef } from "react";
import type { CorpDocumentFieldConfig, CustomerDocumentDto, DynamicCustomerDocumentDto } from "./types";
import { EyeIcon, TrashIcon, PlusIcon, FileIcon, ImageIcon, PdfIcon } from "./icons";
import { getFileKind } from "./fileKind";

const KindIcon: React.FC<{ fileName: string; className?: string }> = ({ fileName, className }) => {
	const kind = getFileKind(fileName);
	if (kind === "image") return <ImageIcon className={className} />;
	if (kind === "pdf") return <PdfIcon className={className} />;
	return <FileIcon className={className} />;
};

export const FileChip: React.FC<{
	file: CustomerDocumentDto;
	isViewMode: boolean;
	onView: (id: number, fileName: string) => void;
	onDelete: (id: number) => void;
}> = ({ file, isViewMode, onView, onDelete }) => (
	<div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]/50 py-1 pl-2.5 pr-1.5 text-sm transition-colors hover:border-blue-500/50">
		<KindIcon fileName={file.fileName} className="h-4 w-4 shrink-0 text-blue-500" />
		<span className="min-w-0 max-w-[240px] truncate text-[13px] text-[var(--app-text)]" title={file.fileName}>
			{file.fileName}
		</span>
		<button
			type="button"
			onClick={() => onView(file.id, file.fileName)}
			aria-label={`View ${file.fileName}`}
			title="View"
			className="shrink-0 rounded-md bg-blue-500/10 p-1.5 text-blue-500 transition hover:bg-blue-500/20"
		>
			<EyeIcon className="h-3.5 w-3.5" />
		</button>
		{!isViewMode && (
			<button
				type="button"
				onClick={() => onDelete(file.id)}
				aria-label={`Delete ${file.fileName}`}
				title="Delete"
				className="shrink-0 rounded-md bg-red-500/10 p-1.5 text-red-500 transition hover:bg-red-500/20"
			>
				<TrashIcon className="h-3.5 w-3.5" />
			</button>
		)}
	</div>
);

export const FileList: React.FC<{
	files: CustomerDocumentDto[];
	isViewMode: boolean;
	onView: (id: number, fileName: string) => void;
	onDelete: (id: number) => void;
}> = ({ files, isViewMode, onView, onDelete }) => {
	if (files.length === 0) return null;
	return (
		<>
			{files.map((f) => (
				<FileChip key={f.id} file={f} isViewMode={isViewMode} onView={onView} onDelete={onDelete} />
			))}
		</>
	);
};

const AddFileButton: React.FC<{
	multiple?: boolean;
	accept?: string;
	disabled?: boolean;
	label?: string;
	onSelect: (files: FileList | null) => void;
}> = ({ multiple, accept, disabled, label = "Add file", onSelect }) => {
	const inputRef = useRef<HTMLInputElement>(null);
	return (
		<>
			<button
				type="button"
				disabled={disabled}
				onClick={() => inputRef.current?.click()}
				className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--app-border)] px-3 py-1.5 text-[13px] font-medium text-[var(--app-muted)] transition hover:border-blue-500 hover:bg-blue-500/5 hover:text-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{disabled ? (
					<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
				) : (
					<PlusIcon className="h-3.5 w-3.5" />
				)}
				{disabled ? "Uploading…" : label}
			</button>
			<input
				ref={inputRef}
				type="file"
				multiple={multiple}
				accept={accept}
				disabled={disabled}
				onChange={(e) => {
					onSelect(e.target.files);
					e.target.value = "";
				}}
				className="hidden"
			/>
		</>
	);
};

const ROW_GRID = "grid grid-cols-1 items-start gap-2 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6";

export const DocumentFieldRow: React.FC<{
	field: CorpDocumentFieldConfig;
	files: CustomerDocumentDto[];
	isViewMode: boolean;
	busy: boolean;
	error?: string;
	onSelect: (files: FileList | null) => void;
	onView: (id: number, fileName: string) => void;
	onDelete: (id: number) => void;
}> = ({ field, files, isViewMode, busy, error, onSelect, onView, onDelete }) => (
	<div className={ROW_GRID}>
		<p className="pt-1 text-[13px] font-medium leading-snug text-[var(--app-text)]">{field.label}</p>
		<div className="min-w-0">
			<div className={files.length > 1 ? "flex flex-col items-start gap-2" : "flex flex-wrap items-center gap-2"}>
				<FileList files={files} isViewMode={isViewMode} onView={onView} onDelete={onDelete} />
				{!isViewMode && <AddFileButton multiple accept={undefined} disabled={busy} onSelect={onSelect} />}
				{isViewMode && files.length === 0 && <span className="text-sm text-[var(--app-muted)]">—</span>}
			</div>
			{error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
		</div>
	</div>
);

export const DynamicDocumentEntries: React.FC<{
	kind: "director" | "board";
	label: string;
	existing: DynamicCustomerDocumentDto[];
	nextIndex: number;
	isViewMode: boolean;
	busyFields: Record<string, boolean>;
	fieldErrors: Record<string, string>;
	accept: string;
	onSelect: (index: number, file: File | null) => void;
	onView: (id: number, fileName: string) => void;
	onDelete: (id: number) => void;
}> = ({ kind, label, existing, nextIndex, isViewMode, busyFields, fieldErrors, accept, onSelect, onView, onDelete }) => {
	const busyKey = `${kind}_${nextIndex}`;
	return (
		<div className={ROW_GRID}>
			<p className="pt-1 text-[13px] font-medium leading-snug text-[var(--app-text)]">{label}</p>
			<div className="min-w-0">
				<div className={existing.length > 1 ? "flex flex-col items-start gap-2" : "flex flex-wrap items-center gap-2"}>
					<FileList files={existing} isViewMode={isViewMode} onView={onView} onDelete={onDelete} />
					{!isViewMode && (
						<AddFileButton
							accept={accept}
							disabled={!!busyFields[busyKey]}
							onSelect={(fl) => onSelect(nextIndex, fl?.[0] ?? null)}
						/>
					)}
					{isViewMode && existing.length === 0 && <span className="text-sm text-[var(--app-muted)]">—</span>}
				</div>
				{fieldErrors[busyKey] && <p className="mt-1.5 text-xs text-red-600">{fieldErrors[busyKey]}</p>}
			</div>
		</div>
	);
};
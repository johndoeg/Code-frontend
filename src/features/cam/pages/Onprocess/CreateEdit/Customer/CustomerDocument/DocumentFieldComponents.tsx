import React, { useRef } from "react";
import type { CorpDocumentFieldConfig, CustomerDocumentDto, DynamicCustomerDocumentDto } from "./Types";
import { EyeIcon, TrashIcon, PlusIcon, FileIcon, ImageIcon, PdfIcon } from "./Icons";
import { getFileKind } from "./FileKind";

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
	<div className="flex items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-card)] px-3 py-2 text-sm transition-colors hover:border-[var(--app-border)]">
		<KindIcon fileName={file.fileName} className="h-4 w-4 shrink-0 text-[var(--app-muted)]" />
		<span className="min-w-0 flex-1 truncate text-[var(--app-text)]" title={file.fileName}>
			{file.fileName}
		</span>
		<button
			type="button"
			onClick={() => onView(file.id, file.fileName)}
			aria-label={`View ${file.fileName}`}
			className="shrink-0 rounded-md border border-orange-600 bg-orange-100 p-1.5 text-orange-800 transition hover:bg-orange-500 hover:text-white"
		>
			<EyeIcon className="h-4 w-4" />
		</button>
		{!isViewMode && (
			<button
				type="button"
				onClick={() => onDelete(file.id)}
				aria-label={`Delete ${file.fileName}`}
				className="shrink-0 rounded-md border border-red-600 bg-red-100 p-1.5 text-red-800 transition hover:bg-red-500 hover:text-white"
			>
				<TrashIcon className="h-4 w-4" />
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
		<div className="space-y-1.5">
			{files.map((f) => (
				<FileChip key={f.id} file={f} isViewMode={isViewMode} onView={onView} onDelete={onDelete} />
			))}
		</div>
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
				className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--app-border)] px-3 py-1.5 text-sm font-medium text-[var(--app-muted)] hover:border-slate-400 hover:bg-[var(--app-surface)] disabled:cursor-not-allowed disabled:opacity-50"
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
	<div className="py-3">
		<div className="mb-2 flex items-center justify-between gap-3">
			<p className="text-sm font-medium text-[var(--app-text)]">{field.label}</p>
			{!isViewMode && <AddFileButton multiple accept={undefined} disabled={busy} onSelect={onSelect} />}
		</div>
		{error && <p className="mb-2 text-sm text-red-600">{error}</p>}
		<FileList files={files} isViewMode={isViewMode} onView={onView} onDelete={onDelete} />
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
		<div className="py-2">
			<div className="mb-2 flex items-center justify-between gap-3">
				<p className="text-sm font-medium text-[var(--app-text)]">{label}</p>
				{!isViewMode && (
					<AddFileButton
						accept={accept}
						disabled={!!busyFields[busyKey]}
						onSelect={(fl) => onSelect(nextIndex, fl?.[0] ?? null)}
					/>
				)}
			</div>
			{fieldErrors[busyKey] && <p className="mb-2 text-sm text-red-600">{fieldErrors[busyKey]}</p>}
			<FileList
				files={existing}
				isViewMode={isViewMode}
				onView={onView}
				onDelete={onDelete}
			/>
		</div>
	);
};
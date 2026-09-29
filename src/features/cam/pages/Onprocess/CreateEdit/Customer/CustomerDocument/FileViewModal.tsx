import React, { useEffect } from "react";
import { XIcon, DownloadIcon } from "./Icons";
import { getFileKind } from "./FileKind";
import { downloadUrl, viewUrl } from "./CustomerDocumentsApi";

export interface FileViewModalProps {
	id: number;
	fileName: string;
	onClose: () => void;
}

export const FileViewModal: React.FC<FileViewModalProps> = ({ id, fileName, onClose }) => {
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onClose]);

	const kind = getFileKind(fileName);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
			onClick={onClose}
		>
			<div
				className="flex max-h-[120vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-[var(--app-card)] shadow-xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between border-b border-[var(--app-border)] px-4 py-3">
					<p className="truncate pr-4 text-sm font-medium text-[var(--app-text)]" title={fileName}>
						{fileName}
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
						<img src={viewUrl(id)} alt={fileName} className="max-h-[60vh] max-w-full rounded-md object-contain" />
					)}
					{kind === "pdf" && (
						<iframe src={viewUrl(id)} title={fileName} className="h-[65vh] w-full rounded-md border border-[var(--app-border)] bg-[var(--app-card)]" />
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
						href={downloadUrl(id)}
						className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
					>
						<DownloadIcon className="h-4 w-4" />
						Download
					</a>
				</div>
			</div>
		</div>
	);
};
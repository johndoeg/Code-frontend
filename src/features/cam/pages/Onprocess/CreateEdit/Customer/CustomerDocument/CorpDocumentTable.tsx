import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import type { CorpDocumentSection, CorpDocumentFieldConfig } from "./types";
import { useCustomerDocuments } from "./useCustomerDocuments";
import { DIRECTOR_KTP_CONFIG, WNA_BOARD_CONFIG, LEGACY_KTP_AKTA_TERAKHIR_DOCUMENT_TYPE } from "./types";
import { DocumentFieldRow, DynamicDocumentEntries, FileList } from "./documentFieldComponents";
import { FileViewModal } from "./FileViewModal";

export interface CamTabHandle {
	save: () => void;
}

export interface CorpDocumentTableProps {
	organizationType: string;
	customerTypeLabel: string;
	sections: CorpDocumentSection[];
	trailingFields: CorpDocumentFieldConfig[];
	dynamicSectionTitle: string;
	apless: string;
	applNo: string;
	finType?: string;
	custName?: string;
	mode?: "edit" | "view";
	onSaved: (result: { apless: string; applno: string }) => void;
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
	return (
		<section className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-card)]">
			{title && (
				<div className="flex items-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-surface)]/60 px-4 py-2.5 sm:px-5">
					<span className="h-4 w-1 rounded-full bg-blue-500" />
					<h3 className="text-sm font-semibold text-[var(--app-text)]">{title}</h3>
				</div>
			)}
			<div className="divide-y divide-[var(--app-border)] px-4 sm:px-5">{children}</div>
		</section>
	);
}

export const CorpDocumentTable = forwardRef<CamTabHandle, CorpDocumentTableProps>(function CorpDocumentTable(
	{
		organizationType,
		customerTypeLabel,
		sections,
		trailingFields,
		dynamicSectionTitle,
		apless,
		applNo,
		finType,
		custName,
		mode = "edit",
		onSaved,
	},
	ref
) {
	const isViewMode = mode === "view";
	const {
		data,
		loading,
		fieldErrors,
		busyFields,
		saveError,
		handleStaticFileSelect,
		handleDynamicFileSelect,
		handleDelete,
		trySaveAndContinue,
	} = useCustomerDocuments(organizationType, apless, applNo);

	const [viewingFile, setViewingFile] = useState<{ id: number; fileName: string } | null>(null);
	const openView = (id: number, fileName: string) => setViewingFile({ id, fileName });

	const handleSave = useCallback(async () => {
		await trySaveAndContinue(() => onSaved({ apless, applno: applNo }));
	}, [trySaveAndContinue, onSaved, apless, applNo]);

	useImperativeHandle(ref, () => ({ save: handleSave }), [handleSave]);

	if (loading && !data) {
		return (
			<div className="flex justify-center py-16">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
			</div>
		);
	}

	const legacyKtpDocs = data?.documents[LEGACY_KTP_AKTA_TERAKHIR_DOCUMENT_TYPE] ?? [];

	const judul = [finType, applNo, custName].filter(Boolean).join(" - ");

	return (
		<div className="overflow-hidden rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl">
			<div className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-surface)] to-[var(--app-card)] px-5 py-3 sm:px-6">
				<div className="flex items-center gap-2.5">
					<span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
						<svg viewBox="0 0 20 20" width="15" height="15" fill="currentColor" aria-hidden="true">
							<path d="M5 2.5A1.5 1.5 0 003.5 4v12A1.5 1.5 0 005 17.5h10a1.5 1.5 0 001.5-1.5V7.4a1.5 1.5 0 00-.44-1.06l-3.9-3.9A1.5 1.5 0 0011.1 2H5zm6 1.2l3.8 3.8H12a1 1 0 01-1-1V3.7zM6.5 10h7a.75.75 0 010 1.5h-7a.75.75 0 010-1.5zm0 3h7a.75.75 0 010 1.5h-7a.75.75 0 010-1.5z" />
						</svg>
					</span>
					<h2 className="text-[15px] font-semibold text-[var(--app-text)]">Customer's Document</h2>
					<span className="rounded-md bg-[var(--app-surface-alt)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--app-muted)]">
						{customerTypeLabel}
					</span>
				</div>
				{judul && (
					<span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500">{judul}</span>
				)}
			</div>

			<div className="space-y-4 px-4 py-4 sm:px-6 sm:pb-6">
				{saveError && (
					<div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-600">
						{saveError}
					</div>
				)}

				{sections.map((section, sIdx) => (
					<SectionCard key={sIdx} title={section.title}>
						{section.fields.map((field) => (
							<DocumentFieldRow
								key={field.fieldKey}
								field={field}
								files={data?.documents[field.documentType] ?? []}
								isViewMode={isViewMode}
								busy={!!busyFields[field.fieldKey]}
								error={fieldErrors[field.fieldKey]}
								onSelect={(fl) => handleStaticFileSelect(field, fl)}
								onView={openView}
								onDelete={handleDelete}
							/>
						))}
					</SectionCard>
				))}

				<SectionCard title={dynamicSectionTitle}>
					<DynamicDocumentEntries
						kind="director"
						label="KTP Pengurus"
						existing={data?.director_documents ?? []}
						nextIndex={data?.next_director_index ?? 0}
						isViewMode={isViewMode}
						busyFields={busyFields}
						fieldErrors={fieldErrors}
						accept={DIRECTOR_KTP_CONFIG.accept}
						onSelect={(index, file) => handleDynamicFileSelect("director", index, file, DIRECTOR_KTP_CONFIG)}
						onView={openView}
						onDelete={handleDelete}
					/>
					<DynamicDocumentEntries
						kind="board"
						label="WNA Corp Board"
						existing={data?.board_documents ?? []}
						nextIndex={data?.next_director_index ?? 0}
						isViewMode={isViewMode}
						busyFields={busyFields}
						fieldErrors={fieldErrors}
						accept={WNA_BOARD_CONFIG.accept}
						onSelect={(index, file) => handleDynamicFileSelect("board", index, file, WNA_BOARD_CONFIG)}
						onView={openView}
						onDelete={handleDelete}
					/>
					{legacyKtpDocs.length > 0 && (
						<div className="grid grid-cols-1 items-start gap-2 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6">
							<p className="pt-1 text-[13px] font-medium leading-snug text-[var(--app-text)]">KTP Pengurus (older record)</p>
							<div className="flex flex-col items-start gap-2">
								<FileList files={legacyKtpDocs} isViewMode={isViewMode} onView={openView} onDelete={handleDelete} />
							</div>
						</div>
					)}
					{trailingFields.map((field) => (
						<DocumentFieldRow
							key={field.fieldKey}
							field={field}
							files={data?.documents[field.documentType] ?? []}
							isViewMode={isViewMode}
							busy={!!busyFields[field.fieldKey]}
							error={fieldErrors[field.fieldKey]}
							onSelect={(fl) => handleStaticFileSelect(field, fl)}
							onView={openView}
							onDelete={handleDelete}
						/>
					))}
				</SectionCard>
			</div>

			{viewingFile && (
				<FileViewModal id={viewingFile.id} fileName={viewingFile.fileName} onClose={() => setViewingFile(null)} />
			)}
		</div>
	);
});
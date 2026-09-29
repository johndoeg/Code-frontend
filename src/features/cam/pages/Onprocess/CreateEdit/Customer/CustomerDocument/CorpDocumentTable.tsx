import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import type { CorpDocumentSection, CorpDocumentFieldConfig } from "./Types";
import { useCustomerDocuments } from "./UseCustomerDocuments";
import { DIRECTOR_KTP_CONFIG, WNA_BOARD_CONFIG, LEGACY_KTP_AKTA_TERAKHIR_DOCUMENT_TYPE } from "./Types";
import { DocumentFieldRow, DynamicDocumentEntries, FileList } from "./DocumentFieldComponents";
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

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-t border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-3 first:border-t-0">
			<h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--app-muted)]">{children}</h2>
		</div>
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
		<div className="space-y-4 rounded-2xl bg-[var(--app-card)] shadow sm:rounded-2xl overflow-hidden">
			{judul && (
				<div className="judul border-b border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-right text-xs font-semibold text-blue-400 sm:px-6">
					{judul}
				</div>
			)}
			<div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
				<div className="text-center">
					<h2 className="text-xl font-bold text-[var(--app-text)]">Customer's Document</h2>
					<p className="mt-0.5 text-sm text-[var(--app-muted)]">
						{customerTypeLabel}
						{custName ? ` · ${custName}` : ""}
					</p>
				</div>

				{saveError && (
					<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
						{saveError}
					</div>
				)}

				<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
					{sections.map((section, sIdx) => (
						<div key={sIdx}>
							{section.title && <SectionHeader>{section.title}</SectionHeader>}
							<div className="divide-y divide-[var(--app-border)] px-6">
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
							</div>
						</div>
					))}

					<SectionHeader>{dynamicSectionTitle}</SectionHeader>
					<div className="divide-y divide-[var(--app-border)] px-6">
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
							<div className="py-2">
								<p className="mb-2 text-sm font-medium text-[var(--app-text)]">KTP Pengurus (older record)</p>
								<FileList files={legacyKtpDocs} isViewMode={isViewMode} onView={openView} onDelete={handleDelete} />
							</div>
						)}
					</div>

					<div className="divide-y divide-[var(--app-border)] px-6">
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
					</div>
				</div>
			</div>

			{viewingFile && (
				<FileViewModal id={viewingFile.id} fileName={viewingFile.fileName} onClose={() => setViewingFile(null)} />
			)}
		</div>
	);
});
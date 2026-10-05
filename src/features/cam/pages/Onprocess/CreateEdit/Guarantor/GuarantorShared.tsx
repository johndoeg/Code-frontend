import React from 'react';

export type GuarantorSubView = 'info' | 'bank' | 'document';

export interface GuarantorSubPageProps {
	apless: string;
	applNo: string;
	grnId: string;
	onNavigate: (view: GuarantorSubView) => void;
	onBack: () => void;
}

export interface GuarantorFileItem {
	id: number;
	documentName: string;
	downloadUrl: string;
}

export const errorMessage = (e: unknown, fallback: string): string =>
	(e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const cellLabel =
	'border-b border-[var(--app-border)] bg-[var(--app-surface)]/70 px-4 py-2.5 align-top text-[11px] font-medium uppercase tracking-wide text-[var(--app-muted)]';
export const cellValue = 'border-b border-[var(--app-border)] px-4 py-2.5 align-top text-sm text-[var(--app-text)]';

export function GuarantorSectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<div className="border-b border-[var(--app-border)] bg-[#2055DE] px-6 py-2.5">
			<h2 className="text-center text-sm font-bold uppercase tracking-wide text-white">{children}</h2>
		</div>
	);
}

const btn =
	'rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50';

export function GuarantorNavButtons({
	current, onNavigate, onBack, primary,
}: {
	current: GuarantorSubView;
	onNavigate: (view: GuarantorSubView) => void;
	onBack: () => void;
	primary?: React.ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center justify-center gap-2 border-t border-[var(--app-border)] px-6 py-4">
			{primary}
			{current !== 'info' && (
				<button type="button" onClick={() => onNavigate('info')} className={btn + ' bg-orange-500 text-white hover:bg-orange-600'}>
					Information
				</button>
			)}
			{current !== 'bank' && (
				<button type="button" onClick={() => onNavigate('bank')} className={btn + ' bg-orange-500 text-white hover:bg-orange-600'}>
					Bank Summary
				</button>
			)}
			{current !== 'document' && (
				<button type="button" onClick={() => onNavigate('document')} className={btn + ' bg-orange-500 text-white hover:bg-orange-600'}>
					Upload Document
				</button>
			)}
			<button type="button" onClick={onBack} className={btn + ' bg-red-600 text-white hover:bg-red-700'}>
				Back to Guarantor
			</button>
		</div>
	);
}

export function FileList({
	files, deletingId, disabled, onDelete,
}: {
	files: GuarantorFileItem[];
	deletingId: number | null;
	disabled?: boolean;
	onDelete: (id: number) => void;
}) {
	if (files.length === 0) return null;
	return (
		<div className="mt-2 overflow-hidden rounded-lg border border-[var(--app-border)]">
			<table className="w-full border-collapse text-sm">
				<tbody>
					{files.map(f => (
						<tr key={f.id}>
							<td className={cellValue}>{f.documentName}</td>
							<td className={cellValue + ' w-40'}>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => window.open(f.downloadUrl, '_blank', 'noopener,noreferrer')}
										disabled={!f.downloadUrl}
										className="rounded bg-orange-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
									>
										Download
									</button>
									<button
										type="button" onClick={() => onDelete(f.id)} disabled={disabled || deletingId === f.id}
										className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:bg-slate-300"
									>
										{deletingId === f.id ? 'Deleting…' : 'Delete'}
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export function UploadInput({ uploading, disabled, onFiles }: { uploading: boolean; disabled?: boolean; onFiles: (f: FileList | null) => void }) {
	return (
		<input
			type="file" multiple disabled={uploading || disabled}
			accept=".png,.jpg,.jpeg,.pdf,.tiff"
			onChange={e => { onFiles(e.target.files); e.target.value = ''; }}
			className="text-sm text-[var(--app-muted)] file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-50"
		/>
	);
}
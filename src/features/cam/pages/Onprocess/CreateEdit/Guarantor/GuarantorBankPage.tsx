import React, { useCallback, useEffect, useState } from 'react';
import api from '@/shared/api/axiosInstance';
import {
	GuarantorSectionHeader, GuarantorNavButtons, FileList, UploadInput, errorMessage, cellLabel, cellValue,
	type GuarantorSubPageProps, type GuarantorFileItem,
} from './GuarantorShared';

const GuarantorBankPage: React.FC<GuarantorSubPageProps> = ({ applNo, grnId, onNavigate, onBack }) => {
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [files, setFiles] = useState<GuarantorFileItem[]>([]);
	const [blocked, setBlocked] = useState('');
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const res = await api.get('/CAM/EditIndex/guarantor/bank', { params: { applno: applNo, grnId } });
			setFiles(res.data.files || []);
			setBlocked(res.data.blocked ? (res.data.blockedMessage || 'This application can no longer be changed.') : '');
		} catch (e) {
			setLoadError(errorMessage(e, 'Failed to load bank statements.'));
		} finally {
			setLoading(false);
		}
	}, [applNo, grnId]);

	useEffect(() => { load(); }, [load]);

	const handleUpload = async (fileList: FileList | null) => {
		if (!fileList || fileList.length === 0) return;
		setUploading(true);
		setUploadError(null);
		try {
			const fd = new FormData();
			fd.append('applno', applNo);
			fd.append('grnId', grnId);
			Array.from(fileList).forEach(f => fd.append('files', f));
			const res = await api.post('/CAM/EditIndex/guarantor/bank/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			setFiles(res.data.files || []);
		} catch (e) {
			setUploadError(errorMessage(e, 'Upload failed. Please try again.'));
		} finally {
			setUploading(false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!window.confirm('Are you sure to delete this record?')) return;
		setDeletingId(id);
		try {
			await api.delete('/CAM/EditIndex/guarantor/bank', { params: { applno: applNo, grnId, id } });
			setFiles(prev => prev.filter(f => f.id !== id));
		} catch (e) {
			alert(errorMessage(e, 'Delete failed. Please try again.'));
		} finally {
			setDeletingId(null);
		}
	};

	if (loading) {
		return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>;
	}
	if (loadError) {
		return (
			<div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
				{loadError}
				<span className="flex gap-4">
					<button onClick={load} className="underline">Retry</button>
					<button onClick={onBack} className="underline">Back</button>
				</span>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<GuarantorSectionHeader>Guarantor Bank Statement</GuarantorSectionHeader>
			{blocked && <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{blocked}</div>}
			<table className="w-full border-collapse text-sm">
				<tbody>
					<tr>
						<td className={cellLabel + ' w-1/4'}>Bank Statement File(s)</td>
						<td className={cellValue}>
							<UploadInput uploading={uploading} disabled={!!blocked} onFiles={handleUpload} />
							{uploading && <p className="mt-1 text-xs text-[var(--app-muted)]">Uploading…</p>}
							{uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
							<FileList files={files} deletingId={deletingId} disabled={!!blocked} onDelete={handleDelete} />
						</td>
					</tr>
				</tbody>
			</table>
			<GuarantorNavButtons current="bank" onNavigate={onNavigate} onBack={onBack} />
		</div>
	);
};

export default GuarantorBankPage;
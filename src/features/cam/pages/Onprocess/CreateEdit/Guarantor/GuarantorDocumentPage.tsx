import React, { useCallback, useEffect, useState } from 'react';
import api from '@/shared/api/axiosInstance';
import {
	GuarantorSectionHeader, GuarantorNavButtons, FileList, UploadInput, errorMessage, cellLabel, cellValue,
	type GuarantorSubPageProps, type GuarantorFileItem,
} from './GuarantorShared';

const BOARD_PREFIXES = ['corp-guarantor-ocr-ktp_', 'wna-corp-guarantor-board_'];
const BOARD_EXACT = ['corp-ktp-akta-terakhir'];
const isBoardType = (t: string) => BOARD_EXACT.includes(t) || BOARD_PREFIXES.some(p => t.startsWith(p));

const GuarantorDocumentPage: React.FC<GuarantorSubPageProps> = ({ applNo, grnId, onNavigate, onBack }) => {
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [grnTp, setGrnTp] = useState('');
	const [citizen, setCitizen] = useState('');
	const [blocked, setBlocked] = useState('');
	const [files, setFiles] = useState<Record<string, GuarantorFileItem[]>>({});
	const [uploadingType, setUploadingType] = useState<string | null>(null);
	const [uploadErrors, setUploadErrors] = useState<Record<string, string | null>>({});
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setLoadError(null);
		try {
			const res = await api.get('/CAM/EditIndex/guarantor/document', { params: { applno: applNo, grnId } });
			setGrnTp(res.data.guarantorType || '');
			setCitizen(res.data.citizen || '');
			setFiles(res.data.files || {});
			setBlocked(res.data.blocked ? (res.data.blockedMessage || 'This application can no longer be changed.') : '');
		} catch (e) {
			setLoadError(errorMessage(e, 'Failed to load guarantor documents.'));
		} finally {
			setLoading(false);
		}
	}, [applNo, grnId]);

	useEffect(() => { load(); }, [load]);

	const handleUpload = async (docType: string, fileList: FileList | null) => {
		if (!fileList || fileList.length === 0) return;
		setUploadingType(docType);
		setUploadErrors(prev => ({ ...prev, [docType]: null }));
		try {
			const fd = new FormData();
			fd.append('applno', applNo);
			fd.append('grnId', grnId);
			fd.append('documentType', docType);
			Array.from(fileList).forEach(f => fd.append('files', f));
			const res = await api.post('/CAM/EditIndex/guarantor/document/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			setFiles(prev => ({ ...prev, [docType]: res.data.files || [] }));
		} catch (e) {
			setUploadErrors(prev => ({ ...prev, [docType]: errorMessage(e, 'Upload failed. Please try again.') }));
		} finally {
			setUploadingType(null);
		}
	};

	const handleDelete = async (docType: string, id: number) => {
		if (!window.confirm('Are you sure to delete this record?')) return;
		setDeletingId(id);
		try {
			await api.delete('/CAM/EditIndex/guarantor/document', { params: { applno: applNo, grnId, id } });
			setFiles(prev => ({ ...prev, [docType]: (prev[docType] || []).filter(f => f.id !== id) }));
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

	const uploadCell = (docType: string) => (
		<>
			<UploadInput uploading={uploadingType === docType} disabled={!!blocked} onFiles={fl => handleUpload(docType, fl)} />
			{uploadingType === docType && <p className="mt-1 text-xs text-[var(--app-muted)]">Uploading…</p>}
			{uploadErrors[docType] && <p className="mt-1 text-xs text-red-600">{uploadErrors[docType]}</p>}
			<FileList files={files[docType] || []} deletingId={deletingId} disabled={!!blocked} onDelete={id => handleDelete(docType, id)} />
		</>
	);
	const row = (docType: string, label: string) => (
		<tr key={docType}>
			<td className={cellLabel + ' w-1/4'}>{label}</td>
			<td className={cellValue}>{uploadCell(docType)}</td>
		</tr>
	);

	const boardTypes = Object.keys(files).filter(isBoardType).sort();

	return (
		<div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-card)] shadow-sm">
			<GuarantorSectionHeader>Guarantor Document</GuarantorSectionHeader>
			{blocked && <div className="m-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{blocked}</div>}
			<div className="overflow-x-auto">
				<table className="w-full min-w-[720px] border-collapse text-sm">
					<tbody>
						{grnTp === 'PR' && (
							<>
								{row('guarantor-spouse-kk', 'Kartu Keluarga a/n Suami/Istri Penjamin')}
								{citizen === 'WNA' ? row('guarantor-kitas', 'KTP a/n Penjamin') : row('guarantor-ktp', 'KTP a/n Penjamin')}
								{row('guarantor-spouse-ktp', 'KTP a/n Suami/Istri Penjamin')}
								{row('guarantor-kk', 'Kartu Keluarga a/n Penjamin')}
								{row('guarantor-npwp', 'NPWP a/n Penjamin')}
								{row('guarantor-marriage-or-death-statement', 'Akta Cerai/Mati a/n Penjamin')}
							</>
						)}
						{grnTp === 'PT' && (
							<>
								{row('corp-guarantor-kk', 'Kartu Keluarga a/n Pemegang Saham (jika ada)')}
								{row('corp-guarantor-akta', 'Akta Pendirian')}
								{row('corp-guarantor-sk-akta', 'SK Kemenkumham Akta Pendirian')}
								{row('corp-guarantor-akta-terakhir', 'Akta Perubahan Terakhir')}
								{row('corp-guarantor-sk-akta-terakhir', 'SK Kemenkumham atas Akta Perubahan Terakhir')}
								<tr>
									<td className={cellLabel + ' w-1/4'}>KTP Pengurus atas Akta Perubahan Terakhir</td>
									<td className={cellValue}>
										{boardTypes.length === 0 && <span className="text-slate-300">—</span>}
										<div className="space-y-4">
											{boardTypes.map(t => <div key={t}>{uploadCell(t)}</div>)}
										</div>
									</td>
								</tr>
								{row('corp-guarantor-npwp', 'NPWP')}
							</>
						)}
						{grnTp !== 'PR' && grnTp !== 'PT' && (
							<tr><td className={cellValue + ' text-center text-[var(--app-muted)]'} colSpan={2}>Guarantor type is not set.</td></tr>
						)}
					</tbody>
				</table>
			</div>
			<GuarantorNavButtons current="document" onNavigate={onNavigate} onBack={onBack} />
		</div>
	);
};

export default GuarantorDocumentPage;
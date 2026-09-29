import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/shared/api/axiosInstance';

interface MenuDetail {
	menu_id: string;
	menu_desc: string;
	menu_parent: string;
	parent_label: string;
	url: string;
}

const MENU_LIST_PATH = '/menu-entry';

const MenuEditPage: React.FC = () => {
	const [searchParams] = useSearchParams();
	const menuId = searchParams.get('menu_id') ?? '';

	const navigate = useNavigate();

	const [menuParent, setMenuParent] = useState("");
	const [parentLabel, setParentLabel] = useState("");
	const [formDesc, setFormDesc] = useState("");
	const [formUrl, setFormUrl] = useState("");

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const parentDisplay = useMemo(() => {
		if (menuParent === '0') return 'Parent';
		return `${menuParent} ${parentLabel}`.trim();
	}, [menuParent, parentLabel]);

	const fetchDetail = useCallback(async () => {
		if (!menuId) {
			setError("No menu selected.");
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await api.get(`/SystemAdmin/menu/${encodeURIComponent(menuId)}`);
			const detail: MenuDetail = res.data.data;
			setMenuParent(detail.menu_parent);
			setParentLabel(detail.parent_label);
			setFormDesc(detail.menu_desc);
			setFormUrl(detail.url);
		} catch (err: any) {
			setError(
				err?.response?.status === 404
					? "Menu not found."
					: "Failed to load menu data. Please try again."
			);
		} finally {
			setLoading(false);
		}
	}, [menuId]);

	useEffect(() => { fetchDetail(); }, [fetchDetail]);

	const goToList = () => navigate('/menu-entry');

	const handleSave = async () => {
		if (!formDesc.trim()) {
			setFormMessage({ type: "error", text: "Menu Description must not empty" });
			return;
		}

		setSaving(true);
		setFormMessage(null);
		try {
			await api.put(`/SystemAdmin/menu/${encodeURIComponent(menuId)}`, {
				menu_desc: formDesc,
				url: formUrl,
			});
			setFormMessage({ type: "success", text: "Successful" });
			setTimeout(goToList, 600);
		} catch (err: any) {
			const msgs = err?.response?.data?.message;
			setFormMessage({
				type: "error",
				text: Array.isArray(msgs) ? msgs.join(", ") : "Failed",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
					<div className="mb-6">
						<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">Menu</h1>
						<p className="text-[var(--app-muted)] mt-1">Edit an existing menu entry</p>
					</div>

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
							{error}
							<button onClick={fetchDetail} className="ml-4 underline text-red-900">Retry</button>
							<button onClick={goToList} className="ml-4 underline text-red-900">Back to list</button>
						</div>
					)}

					{loading ? (
						<div className="flex justify-center py-10">
							<svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
							</svg>
						</div>
					) : !error && (
						<>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Menu Parent</label>
									<div className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 bg-[var(--app-surface)] text-[var(--app-muted)]">
										{parentDisplay || "-"}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Menu ID</label>
									<div className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 bg-[var(--app-surface)] text-[var(--app-muted)] font-mono">
										{menuId}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Menu Description</label>
									<div className="relative">
										<input
											type="text"
											value={formDesc}
											onChange={(e) => setFormDesc(e.target.value)}
											placeholder="Enter menu description"
											className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
										/>
										{formDesc && (
											<button type="button" onClick={() => setFormDesc("")} aria-label="Clear menu description"
												className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] text-base leading-none">
												&times;
											</button>
										)}
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-[var(--app-text)] mb-1">Menu URL</label>
									<div className="relative">
										<input
											type="text"
											value={formUrl}
											onChange={(e) => setFormUrl(e.target.value)}
											placeholder="/path/to/page"
											className="w-full border border-[var(--app-border)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
										/>
										{formUrl && (
											<button type="button" onClick={() => setFormUrl("")} aria-label="Clear menu URL"
												className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-muted)] hover:text-[var(--app-text)] text-base leading-none">
												&times;
											</button>
										)}
									</div>
								</div>
							</div>

							<div className="mt-4 flex items-center gap-4">
								<button
									onClick={handleSave}
									disabled={saving}
									className={`bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all ${saving ? "opacity-75 cursor-not-allowed" : ""}`}
								>
									{saving ? "Saving..." : "Save"}
								</button>

								<button
									onClick={goToList}
									disabled={saving}
									className="bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] px-6 py-2 rounded-lg font-medium transition-colors hover:bg-[var(--app-surface-alt)]"
								>
									Cancel
								</button>

								{formMessage && (
									<span className={`text-sm font-medium ${formMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
										{formMessage.text}
									</span>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default MenuEditPage;
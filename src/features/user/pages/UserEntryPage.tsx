import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from '@/shared/api/axiosInstance';
import AsOfDatePickerComponent from '@/shared/components/AsOfDatePickerComponent';

type Mode = 'Add' | 'Edit' | 'View';

interface BranchOption { branch_cd: string; branch_name: string; }
interface SuperiorOption { employee_id: string; fullname: string; }

const optionStyle: React.CSSProperties = { backgroundColor: '#ffffff', color: '#0f172a' };

const USERS_LIST_PATH = '/users';

const toApiDate = (d: Date | null): string => {
	if (!d || isNaN(d.getTime())) return "";
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fromApiDate = (s: string): Date | null => (s ? new Date(`${s}T00:00:00`) : null);

const UserEntryPage: React.FC = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const rawMode = searchParams.get('id') ?? 'Add';
	const mode: Mode = (rawMode === 'Edit' || rawMode === 'View') ? rawMode : 'Add';
	const employeeIdParam = searchParams.get('employee_id') ?? '';

	const isAdd = mode === 'Add';
	const isView = mode === 'View';
	const keysLocked = !isAdd;

	const [username, setUsername] = useState("");
	const [fullname, setFullname] = useState("");
	const [employeeId, setEmployeeId] = useState("");
	const [branchCd, setBranchCd] = useState("");
	const [accesscam, setAccesscam] = useState("");
	const [superior, setSuperior] = useState("");
	const [status, setStatus] = useState("A");
	const [resignDate, setResignDate] = useState<Date | null>(null);

	const [branches, setBranches] = useState<BranchOption[]>([]);
	const [accessGroups, setAccessGroups] = useState<string[]>([]);
	const [superiors, setSuperiors] = useState<SuperiorOption[]>([]);

	const [akses, setAkses] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	const canManage = String(akses).trim().toUpperCase() === "ADMIN";
	const canSave = !isView && (isAdd || canManage);

	const goToList = () => navigate(USERS_LIST_PATH);

	const errorText = (err: any): string => {
		const msgs = err?.response?.data?.message;
		if (Array.isArray(msgs)) return msgs.join(", ");
		if (typeof msgs === 'string' && msgs) return msgs;
		return "Failed";
	};

	const loadPage = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [branchRes, groupRes, superiorRes] = await Promise.all([
				api.get('/SystemAdmin/users/branch-options'),
				api.get('/SystemAdmin/users/access-group-options'),
				api.get('/SystemAdmin/users/superior-options'),
			]);
			setBranches(branchRes.data.data ?? []);
			setAccessGroups(groupRes.data.data ?? []);
			setSuperiors(superiorRes.data.data ?? []);

			if (mode !== 'Add') {
				if (!employeeIdParam) {
					setError("No user selected.");
					return;
				}
				const res = await api.get(`/SystemAdmin/users/${encodeURIComponent(employeeIdParam)}`);
				const d = res.data.data;
				setUsername(d.username);
				setFullname(d.fullname);
				setEmployeeId(d.employee_id);
				setBranchCd(d.branch_cd);
				setAccesscam(d.accesscam);
				setSuperior(d.superior);
				setStatus(d.status || "A");
				setResignDate(fromApiDate(d.resign_date));
				setAkses(res.data.akses ?? "");
			}
		} catch (err: any) {
			setError(
				err?.response?.status === 404
					? "User not found."
					: "Failed to load user data. Please try again."
			);
		} finally {
			setLoading(false);
		}
	}, [mode, employeeIdParam]);

	useEffect(() => { loadPage(); }, [loadPage]);

	const validate = (): string[] => {
		const errs: string[] = [];
		if (isAdd) {
			if (!username.trim()) errs.push("Username must not be empty");
			if (!employeeId.trim()) errs.push("Employee ID must not be empty");
		}
		if (!fullname.trim()) errs.push("Fullname must not be empty");
		if (!branchCd) errs.push("Branch must not be empty");
		if (!accesscam) errs.push("Access Group must not be empty");
		return errs;
	};

	const handleSave = async () => {
		const errs = validate();
		if (errs.length) {
			setFormMessage({ type: "error", text: errs.join(", ") });
			return;
		}

		setSaving(true);
		setFormMessage(null);
		try {
			if (isAdd) {
				await api.post('/SystemAdmin/users', {
					username,
					employee_id: employeeId,
					fullname,
					branch_cd: branchCd,
					accesscam,
					superior,
				});
			} else {
				await api.put(`/SystemAdmin/users/${encodeURIComponent(employeeId)}`, {
					fullname,
					branch_cd: branchCd,
					accesscam,
					superior,
					resign_date: toApiDate(resignDate),
				});
			}
			setFormMessage({ type: "success", text: "Successful" });
			setTimeout(goToList, 600);
		} catch (err: any) {
			setFormMessage({ type: "error", text: errorText(err) });
		} finally {
			setSaving(false);
		}
	};

	const inputClass = "w-full border border-[var(--app-border)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)] disabled:cursor-not-allowed";
	const selectClass = "w-full border border-[var(--app-border)] rounded-lg px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)] disabled:cursor-not-allowed";
	const labelClass = "block text-sm font-medium text-[var(--app-text)] mb-1";

	return (
		<div className="min-h-screen bg-gradient-to-br from-[var(--app-surface)] to-[var(--app-surface-alt)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="bg-[var(--app-card)] rounded-2xl shadow-lg p-6">
					<div className="mb-6">
						<h1 className="text-2xl md:text-3xl font-bold text-[var(--app-text)]">{mode} User</h1>
						<p className="text-[var(--app-muted)] mt-1">
							{isAdd ? "Create a new user record" : isView ? "User details (read only)" : "Edit an existing user record"}
						</p>
					</div>

					{error && (
						<div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
							{error}
							<button onClick={loadPage} className="ml-4 underline text-red-900">Retry</button>
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
									<label className={labelClass}>Username</label>
									<input
										type="text"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
										disabled={keysLocked || isView}
										placeholder="Enter username"
										className={inputClass}
									/>
								</div>

								<div>
									<label className={labelClass}>Employee ID</label>
									<input
										type="text"
										value={employeeId}
										onChange={(e) => setEmployeeId(e.target.value)}
										disabled={keysLocked || isView}
										placeholder="Enter employee ID"
										className={inputClass}
									/>
								</div>

								<div className="md:col-span-2">
									<label className={labelClass}>Fullname</label>
									<input
										type="text"
										value={fullname}
										onChange={(e) => setFullname(e.target.value)}
										disabled={isView}
										placeholder="Enter fullname"
										className={inputClass}
									/>
								</div>

								<div>
									<label className={labelClass}>Branch</label>
									<select
										value={branchCd}
										onChange={(e) => setBranchCd(e.target.value)}
										disabled={isView}
										className={selectClass}
									>
										<option value="" style={optionStyle}>Select</option>
										{branches.map((b) => (
											<option key={b.branch_cd} value={b.branch_cd} style={optionStyle}>
												{b.branch_name}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className={labelClass}>Access Group</label>
									<select
										value={accesscam}
										onChange={(e) => setAccesscam(e.target.value)}
										disabled={isView}
										className={selectClass}
									>
										<option value="" style={optionStyle}>Select</option>
										{accessGroups.map((g) => (
											<option key={g} value={g} style={optionStyle}>{g}</option>
										))}
									</select>
								</div>

								<div>
									<label className={labelClass}>Superior</label>
									<select
										value={superior}
										onChange={(e) => setSuperior(e.target.value)}
										disabled={isView}
										className={selectClass}
									>
										<option value="" style={optionStyle}>No Superior</option>
										{superiors.map((s) => (
											<option key={s.employee_id} value={s.employee_id} style={optionStyle}>
												{s.fullname}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className={labelClass}>Status</label>
									<select
										value={status}
										onChange={(e) => setStatus(e.target.value)}
										disabled
										className={selectClass}
									>
										<option value="A" style={optionStyle}>Active</option>
										<option value="D" style={optionStyle}>Non Active</option>
									</select>
								</div>

								{mode === 'Edit' && (
									<div>
										<label className={labelClass}>Resign Date</label>
										<AsOfDatePickerComponent
											value={resignDate}
											onChange={(d: Date | null) => setResignDate(d)}
										/>
									</div>
								)}
							</div>

							<div className="mt-6 flex items-center gap-4">
								{canSave && (
									<button
										onClick={handleSave}
										disabled={saving}
										className={`bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-2 rounded-lg font-medium shadow-md transition-all ${saving ? "opacity-75 cursor-not-allowed" : ""}`}
									>
										{saving ? "Saving..." : "Save"}
									</button>
								)}

								<button
									onClick={goToList}
									disabled={saving}
									className="bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text)] px-6 py-2 rounded-lg font-medium transition-colors hover:bg-[var(--app-surface-alt)]"
								>
									{isView ? "Back" : "Cancel"}
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

export default UserEntryPage;
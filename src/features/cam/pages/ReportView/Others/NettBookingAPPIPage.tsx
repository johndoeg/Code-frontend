import { useState } from "react";
import api from '@/shared/api/axiosInstance';
import DatePicker, { registerLocale } from "react-datepicker";
import { id } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("id", id);

function dateToParam(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	return `${y}-${m}-01`;
}

interface MonthYearPickerProps {
	value: Date | null;
	onChange: (d: Date | null) => void;
	label?: string;
	required?: boolean;
	disabled?: boolean;
}

function MonthYearPicker({
	value,
	onChange,
	label = "Periode (Bulan)",
	required = false,
	disabled = false,
}: MonthYearPickerProps) {
	return (
		<div className="flex-1 min-w-[180px] max-w-xs">
			{label && (
				<label className="block text-xs font-medium text-[var(--app-text)] mb-1">
					{label}
					{required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
				</label>
			)}
			<DatePicker
				selected={value}
				onChange={onChange}
				locale="id"
				dateFormat="MMMM yyyy"
				showMonthYearPicker
				showFourColumnMonthYearPicker
				disabled={disabled}
				placeholderText="Pilih bulan…"
				className={[
					"w-full px-3 py-2 border border-[var(--app-border)] rounded-lg text-sm",
					"focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
					"bg-white text-slate-900",
					disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
				].join(" ")}
				wrapperClassName="w-full"
				calendarClassName="shadow-xl border border-[var(--app-border)] rounded-xl overflow-hidden"
				renderCustomHeader={({ date, increaseYear, decreaseYear }) => (
					<div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-700">
						<button type="button" onClick={decreaseYear}
							className="text-white hover:text-blue-200 font-bold text-lg px-1 leading-none">
							‹
						</button>
						<span className="text-white text-sm font-semibold">{date.getFullYear()}</span>
						<button type="button" onClick={increaseYear}
							className="text-white hover:text-blue-200 font-bold text-lg px-1 leading-none">
							›
						</button>
					</div>
				)}
			/>
			<style>{`
				.react-datepicker { font-family: inherit; border: none; border-radius: 0.75rem; }
				.react-datepicker__month-container { float: none; }
				.react-datepicker__header { background: transparent; border-bottom: 1px solid #e5e7eb; padding: 0; }
				.react-datepicker__month .react-datepicker__month-text,
				.react-datepicker__month .react-datepicker__quarter-text {
					display: inline-flex; align-items: center; justify-content: center;
					width: 5rem; padding: 0.4rem 0; margin: 2px;
					font-size: 0.8rem; color: #374151; border-radius: 0.375rem;
				}
				.react-datepicker__month-text--keyboard-selected,
				.react-datepicker__month--selected,
				.react-datepicker__month-text:hover {
					background: linear-gradient(to right, #2563eb, #4338ca) !important;
					color: white !important; border-radius: 0.375rem;
				}
				.react-datepicker-popper { z-index: 50; }
			`}</style>
		</div>
	);
}

const NettBookingAPPIPage: React.FC = () => {
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const handleExport = async () => {
		if (!selectedDate) return;
		setLoading(true);
		setError(null);
		try {
			const res = await api.get("/CAM/Others/NetBookingAPPI/nett-booking/excel", {
				params: { date_from: dateToParam(selectedDate) },
				responseType: "blob",
			});
			const blob = new Blob([res.data], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = "NettBookingAPPI.xlsx";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);
		} catch {
			setError("Gagal mengekspor data. Silakan coba lagi.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-[var(--app-surface)] p-4 md:p-6">
			<div className="max-w-full mx-auto">
				<div className="mb-6">
					<h1 className="text-2xl font-semibold text-[var(--app-text)]">Nett Booking APPI</h1>
				</div>

				<div className="bg-[var(--app-card)] rounded-xl border border-[var(--app-border)] p-4 flex flex-wrap gap-3 items-end">
					<MonthYearPicker
						value={selectedDate}
						onChange={(d) => { setSelectedDate(d); setError(null); }}
						required
					/>
					<button
						onClick={handleExport}
						disabled={!selectedDate || loading}
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
							bg-green-600 text-white border border-green-700
							hover:bg-green-700 disabled:bg-gray-500 disabled:border-gray-500 disabled:cursor-not-allowed"
					>
						{loading ? "Memuat…" : "Export to Excel"}
					</button>
				</div>

				{error && (
					<div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
						{error}
					</div>
				)}

			</div>
		</div>
	);
};

export default NettBookingAPPIPage;
import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { id } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('id', id);

function toDateFnsFormat(fmt: string): string {
	let out = fmt;
	out = out.replace(/YYYY/g, 'yyyy');
	out = out.replace(/DD/g, 'dd');

	return out;
}

function hasTime(fmt: string): boolean {
	return /HH|hh|mm|ss/.test(fmt.replace(/MM/g, ''));
}

interface AsOfDatePickerComponentProps {
	value: Date | null;
	onChange: (date: Date | null) => void;
	format?: string;
	timeIntervals?: number;
	label?: string;
	required?: boolean;
	placeholder?: string;
	minDate?: Date;
	maxDate?: Date;
	disabled?: boolean;
	className?: string;
}

const AsOfDatePickerComponent: React.FC<AsOfDatePickerComponentProps> = ({
	value,
	onChange,
	format = 'dd MMMM yyyy',
	timeIntervals = 30,
	label = 'As Of',
	required = false,
	placeholder = 'Pilih tanggal…',
	minDate,
	maxDate,
	disabled = false,
	className = '',
}) => {
	const dfFormat = toDateFnsFormat(format);
	const includeTime = hasTime(format);

	return (
		<div className={className} style={{ display: 'block', width: '100%' }}>
			{label && (
				<label className="block text-sm font-medium text-[var(--app-text)] mb-1">
					{label}
					{required && (
						<span className="text-red-500 ml-1" aria-hidden="true">*</span>
					)}
				</label>
			)}

			<DatePicker
				selected={value}
				onChange={onChange}
				locale="id"
				dateFormat={dfFormat}
				showTimeSelect={includeTime}
				showTimeSelectOnly={false}
				timeFormat="HH:mm"
				timeIntervals={timeIntervals}
				timeCaption="Waktu"
				showMonthDropdown
				showYearDropdown
				dropdownMode="select"
				yearDropdownItemNumber={10}
				minDate={minDate}
				maxDate={maxDate}
				disabled={disabled}
				placeholderText={placeholder}
				className="asof-datepicker-input"
				wrapperClassName="asof-datepicker-wrapper"
				calendarClassName="asof-datepicker-calendar"
				renderCustomHeader={({
					date,
					changeYear,
					changeMonth,
					decreaseMonth,
					increaseMonth,
					prevMonthButtonDisabled,
					nextMonthButtonDisabled,
				}) => (
					<div className="asof-datepicker-header">
						<button
							type="button"
							onClick={decreaseMonth}
							disabled={prevMonthButtonDisabled}
							className="asof-datepicker-nav-btn"
						>
							‹
						</button>

						<div className="asof-datepicker-header-selects">
							<select
								value={date.getMonth()}
								onChange={e => changeMonth(Number(e.target.value))}
								className="asof-datepicker-select"
							>
								{[
									'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
									'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
								].map((m, i) => (
									<option key={m} value={i}>{m}</option>
								))}
							</select>

							<select
								value={date.getFullYear()}
								onChange={e => changeYear(Number(e.target.value))}
								className="asof-datepicker-select"
							>
								{Array.from(
									{ length: new Date().getFullYear() - 1930 + 1 },
									(_, i) => 1930 + i
								).map(y => (
									<option key={y} value={y}>{y}</option>
								))}
							</select>
						</div>

						<button
							type="button"
							onClick={increaseMonth}
							disabled={nextMonthButtonDisabled}
							className="asof-datepicker-nav-btn"
						>
							›
						</button>
					</div>
				)}
			/>

			<style>{`
				.asof-datepicker-wrapper { display: block !important; width: 100% !important; }
				.asof-datepicker-input {
					display: block;
					box-sizing: border-box;
					width: 100%;
					padding: 0.75rem 1rem;
					border: 1px solid #d1d5db;
					border-radius: 0.5rem;
					font-size: 0.875rem;
					line-height: 1.25rem;
					background: #fff;
					box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
				}
				.asof-datepicker-input:focus {
					outline: none;
					border-color: #3b82f6;
					box-shadow: 0 0 0 2px rgba(59,130,246,0.5);
				}
				.asof-datepicker-input:disabled {
					opacity: 0.6;
					cursor: not-allowed;
					background: #f1f5f9;
				}
				.asof-datepicker-input:not(:disabled) { cursor: pointer; }
				.asof-datepicker-calendar {
					box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
					border: 1px solid #e5e7eb;
					border-radius: 0.75rem;
					overflow: hidden;
				}
				.asof-datepicker-header {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 0.5rem 0.75rem;
					background: linear-gradient(to right, #2563eb, #4338ca);
				}
				.asof-datepicker-nav-btn {
					color: #fff;
					font-weight: 700;
					font-size: 1.125rem;
					line-height: 1;
					padding: 0 0.25rem;
					background: none;
					border: none;
					cursor: pointer;
				}
				.asof-datepicker-nav-btn:disabled { opacity: 0.3; cursor: default; }
				.asof-datepicker-nav-btn:hover:not(:disabled) { color: #bfdbfe; }
				.asof-datepicker-header-selects { display: flex; align-items: center; gap: 0.5rem; }
				.asof-datepicker-select {
					background: rgba(255,255,255,0.2);
					color: #fff;
					font-size: 0.875rem;
					font-weight: 500;
					border-radius: 0.25rem;
					padding: 0.25rem 0.5rem;
					border: 1px solid rgba(255,255,255,0.3);
					cursor: pointer;
				}
				.asof-datepicker-select option { color: #1f2937; background: #fff; }
				.react-datepicker { font-family: inherit; border: none; border-radius: 0.75rem; }
				.react-datepicker__month-container { float: none; }
				.react-datepicker__header { background: transparent; border-bottom: 1px solid #e5e7eb; padding: 0; }
				.react-datepicker__day-names { background: #f9fafb; margin: 0; padding: 4px 0; }
				.react-datepicker__day-name { color: #6b7280; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
				.react-datepicker__day { font-size: 0.8rem; color: #374151; width: 2rem; line-height: 2rem; margin: 1px; }
				.react-datepicker__day--selected,
				.react-datepicker__day--keyboard-selected { background: linear-gradient(to right, #2563eb, #4338ca); border-radius: 0.375rem; color: white; }
				.react-datepicker__day--selected.react-datepicker__day--today { color: white; }
				.react-datepicker__day--today { font-weight: 700; color: #2563eb; }
				.react-datepicker__day:hover:not(.react-datepicker__day--selected) { background-color: #eff6ff; border-radius: 0.375rem; }
				.react-datepicker__day--outside-month { color: #d1d5db; }
				.react-datepicker__time-container { border-left: 1px solid #e5e7eb; }
				.react-datepicker__time-list-item--selected { background: linear-gradient(to right, #2563eb, #4338ca) !important; }
				.react-datepicker__time-list-item:hover:not(.react-datepicker__time-list-item--selected) { background-color: #eff6ff !important; }
				.react-datepicker-popper { z-index: 9999; }
			`}</style>
		</div>
	);
};

export default AsOfDatePickerComponent;
import React from 'react';

interface SimpleIdentityFieldsProps {
	name: string;
	idCardNo: string;
	nameLabel?: string;
	idLabel?: string;
	readOnly?: boolean;
	nameError?: string;
	idCardNoError?: string;
	onNameChange?: (v: string) => void;
	onIdCardNoChange?: (v: string) => void;
}

const inputCls =
	'w-full border border-[var(--app-border)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-[var(--app-surface)] disabled:text-[var(--app-muted)]';

const SimpleIdentityFields: React.FC<SimpleIdentityFieldsProps> = ({
	name,
	idCardNo,
	nameLabel = 'Name',
	idLabel = 'ID/Passport No.',
	readOnly = false,
	nameError,
	idCardNoError,
	onNameChange,
	onIdCardNoChange,
}) => (
	<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label className="block text-sm font-medium text-[var(--app-text)] mb-1">{nameLabel}</label>
			<input
				type="text"
				className={inputCls}
				value={name}
				disabled={readOnly}
				onChange={(e) => onNameChange?.(e.target.value)}
			/>
			{nameError && <p className="text-xs text-red-600 mt-1">{nameError}</p>}
		</div>
		<div>
			<label className="block text-sm font-medium text-[var(--app-text)] mb-1">{idLabel}</label>
			<input
				type="text"
				className={inputCls}
				value={idCardNo}
				disabled={readOnly}
				onChange={(e) => onIdCardNoChange?.(e.target.value)}
			/>
			{idCardNoError && <p className="text-xs text-red-600 mt-1">{idCardNoError}</p>}
		</div>
	</div>
);

export default SimpleIdentityFields;
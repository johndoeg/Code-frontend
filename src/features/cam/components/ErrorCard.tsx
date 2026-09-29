import React from 'react';

interface ErrorCardProps {
	message: string;
	bordered?: boolean;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ message, bordered = false }) => (
	<div
		className={
			bordered
				? 'rounded-2xl border border-[var(--app-border)] bg-white p-8 text-center text-sm text-red-500 shadow-sm'
				: 'rounded-2xl bg-white p-8 text-center text-sm text-red-500 shadow'
		}
	>
		{message}
	</div>
);

export default ErrorCard;
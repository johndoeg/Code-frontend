import React from 'react';

interface LoadingCardProps {
	message: string;
	bordered?: boolean;
}

const LoadingCard: React.FC<LoadingCardProps> = ({ message, bordered = false }) => (
	<div
		className={
			bordered
				? 'rounded-2xl border border-[var(--app-border)] bg-white p-8 text-center text-sm text-slate-500 shadow-sm'
				: 'rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow'
		}
	>
		{message}
	</div>
);

export default LoadingCard;
import React from 'react';

interface SectionHeaderProps {
	title: string;
	right?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, right }) => (
	<div className="flex items-center gap-3 mb-4">
		<span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
		<span className="text-xs font-bold uppercase tracking-widest text-blue-400">{title}</span>
		<hr className="flex-1 border-t-2 border-[var(--app-border)]" />
		{right}
	</div>
);

export default SectionHeader;
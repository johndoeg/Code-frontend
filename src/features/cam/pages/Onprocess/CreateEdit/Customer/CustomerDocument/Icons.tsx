import React from "react";

type IconProps = { className?: string };

export const EyeIcon: React.FC<IconProps> = ({ className }) => (
	<svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
		<path
			d="M1.5 10s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round"
		/>
		<circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
	</svg>
);

export const TrashIcon: React.FC<IconProps> = ({ className }) => (
	<svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
		<path
			d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M8.5 9v5M11.5 9v5M4.75 5.5l.6 9.2a1.5 1.5 0 0 0 1.5 1.4h6.3a1.5 1.5 0 0 0 1.5-1.4l.6-9.2"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const XIcon: React.FC<IconProps> = ({ className }) => (
	<svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
		<path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
	</svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ className }) => (
	<svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
		<path
			d="M10 3v9m0 0 3.5-3.5M10 12l-3.5-3.5M4 14.5v1a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-1"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export const PlusIcon: React.FC<IconProps> = ({ className }) => (
	<svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
		<path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
	</svg>
);

export const FileIcon: React.FC<IconProps> = ({ className }) => (
	<svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
		<path
			d="M5 2.5h6l4 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round"
		/>
		<path d="M11 2.5V6a1 1 0 0 0 1 1h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
	</svg>
);

export const ImageIcon: React.FC<IconProps> = ({ className }) => (
	<svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
		<rect x="2.5" y="3.5" width="15" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
		<circle cx="7" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5" />
		<path d="M4 15l4.5-4.5a1.5 1.5 0 0 1 2 0l1.5 1.5M12 12l1-1a1.5 1.5 0 0 1 2 0l1.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
	</svg>
);

export const PdfIcon: React.FC<IconProps> = ({ className }) => (
	<svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
		<path
			d="M5 2.5h6l4 4v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinejoin="round"
		/>
		<path d="M11 2.5V6a1 1 0 0 0 1 1h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
		<text x="10" y="15" textAnchor="middle" fontSize="5.5" fill="currentColor" stroke="none" fontWeight="700">
			PDF
		</text>
	</svg>
);
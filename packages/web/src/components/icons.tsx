/** Minimal inline SVG icons (stroke = currentColor). */
import type { SVGProps } from "react";

const base = {
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 1.8,
	strokeLinecap: "round" as const,
	strokeLinejoin: "round" as const,
};

export function CameraIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg {...base} {...props} aria-hidden="true">
			<path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
			<circle cx="12" cy="12.5" r="3.5" />
		</svg>
	);
}

export function ChartIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg {...base} {...props} aria-hidden="true">
			<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
		</svg>
	);
}

export function SettingsIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg {...base} {...props} aria-hidden="true">
			<circle cx="12" cy="12" r="3" />
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
		</svg>
	);
}

export function TrashIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg {...base} {...props} aria-hidden="true">
			<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
		</svg>
	);
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
	return (
		<svg {...base} {...props} aria-hidden="true">
			<path d="M20 6 9 17l-5-5" />
		</svg>
	);
}

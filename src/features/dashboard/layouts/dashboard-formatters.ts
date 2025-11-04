const updatedFormatter = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
});

function formatBytes(bytes: number): string {
	const absolute = Math.max(bytes, 0);
	if (!Number.isFinite(absolute) || absolute === 0) {
		return '0 B';
	}

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const exponent = Math.min(units.length - 1, Math.floor(Math.log(absolute) / Math.log(1024)));
	const value = absolute / 1024 ** exponent;
	const formatter = new Intl.NumberFormat('en-US', {
		maximumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : 2,
	});
	return `${formatter.format(value)} ${units[exponent]}`;
}

function formatBackendLabel(backend?: string): string | null {
	if (!backend) {
		return null;
	}

	return backend
		.split(/[-_]/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function formatUpdatedAt(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return updatedFormatter.format(parsed);
}

export { formatBackendLabel, formatBytes, formatUpdatedAt };

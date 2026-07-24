import { formatBackendLabel, formatBytes } from './dashboard-formatters.ts';
import type { StorageEstimate } from '@/storage/MediaStorage';

interface StorageUsageSummaryProps {
	estimate: StorageEstimate | null;
	refreshing: boolean;
	onRefresh: () => void;
}

function StorageUsageSummary({ estimate, refreshing, onRefresh }: StorageUsageSummaryProps) {
	const usageBytes = typeof estimate?.usageBytes === 'number' ? estimate.usageBytes : null;
	const quotaBytes = typeof estimate?.quotaBytes === 'number' && estimate.quotaBytes > 0 ? estimate.quotaBytes : null;
	const percentRaw = usageBytes !== null && quotaBytes ? (usageBytes / quotaBytes) * 100 : null;
	const percentCapped = percentRaw !== null ? Math.min(percentRaw, 100) : null;
	const percentLabel = percentCapped !== null
		? (percentCapped >= 10 ? `${Math.round(percentCapped)}%` : `${percentCapped.toFixed(1)}%`)
		: null;
	const usageLabel = usageBytes === null
		? 'Calculating...'
		: quotaBytes
			? `${formatBytes(usageBytes)} / ${formatBytes(quotaBytes)}`
			: `${formatBytes(usageBytes)} used`;
	const backendLabel = formatBackendLabel(estimate?.backend);
	const persistedState = estimate?.persisted;
	const progressWidth = percentCapped !== null ? `${percentCapped}%` : '0%';
	const ariaValueNow = percentRaw !== null ? Number(percentRaw.toFixed(1)) : undefined;

	return (
		<div className="flex items-center gap-3 text-xs text-slate-500">
			<span className="font-semibold uppercase tracking-wide text-slate-400">Storage</span>
			<div className="flex items-center gap-2 text-sm font-medium text-slate-700">
				<span>{usageLabel}</span>
				{percentLabel ? (
					<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
						{percentLabel}
					</span>
				) : null}
			</div>
			<div
				className="relative h-1.5 w-28 overflow-hidden rounded-full bg-slate-200"
				role="progressbar"
				aria-label="Storage usage"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={ariaValueNow}
			>
				<div
					className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 transition-[width]"
					style={{ width: progressWidth }}
				/>
			</div>
			{backendLabel ? (
				<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
					{backendLabel}
				</span>
			) : null}
			{persistedState !== undefined ? (
				<span
					className={
						persistedState
							? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
							: 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700'
					}
				>
					{persistedState ? 'Persistent' : 'Volatile'}
				</span>
			) : null}
			<button
				type="button"
				onClick={onRefresh}
				disabled={refreshing}
				title="Refresh storage usage"
				aria-label="Refresh storage usage"
				className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{refreshing ? (
					<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" aria-hidden />
				) : (
					<svg
						className="h-3.5 w-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={1.6}
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M21 2v6h-6" />
						<path d="M3 22v-6h6" />
						<path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 8" />
						<path d="M20.49 15A9 9 0 0 1 5.64 18.36L3 16" />
					</svg>
				)}
			</button>
		</div>
	);
}

export type { StorageUsageSummaryProps };
export default StorageUsageSummary;

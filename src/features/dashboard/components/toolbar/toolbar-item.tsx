/**
 * ToolbarItem renders the interactive control for each toolbar descriptor.
 */
import { memo } from 'react';
import type { MouseEvent } from 'react';

import type { ToolItemProps } from './types';

const ToolItem = memo(function ToolItem({
	descriptor,
	orientation,
	disabled = false,
	onSelect,
	compact = false,
}: ToolItemProps) {
	const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		if (disabled) {
			return;
		}

		onSelect?.(descriptor);
	};

	if (compact) {
		const compactClasses = [
			'group flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors duration-150',
			disabled
				? 'cursor-not-allowed opacity-50'
				: 'cursor-pointer hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600',
		]
			.filter(Boolean)
			.join(' ');

		return (
			<button
				type="button"
				onClick={handleClick}
				title={descriptor.hint}
				aria-disabled={disabled}
				disabled={disabled}
				data-orientation={orientation}
				className={`${compactClasses} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300`}
			>
				{descriptor.icon ? (
					<span className="h-6 w-6 text-sky-500">{descriptor.icon}</span>
				) : (
					<span className="h-2 w-2 rounded-full bg-slate-400" />
				)}
			</button>
		);
	}

	const baseClasses = [
		'group relative inline-flex select-none items-center rounded-lg border border-slate-200 bg-white text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.1)] transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
		disabled
			? 'cursor-not-allowed opacity-45'
			: 'cursor-pointer hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600',
		orientation === 'horizontal'
			? 'flex-row items-center gap-3 px-4 py-3'
			: 'w-full flex-row items-center justify-start gap-3 px-4 py-3',
	]
		.filter(Boolean)
		.join(' ');

	const shortcutClasses = orientation === 'horizontal'
		? 'text-[10px] uppercase tracking-[0.12em] text-slate-400'
		: 'ml-auto text-[10px] tracking-[0.18em] text-slate-400';

	return (
		<button
			type="button"
			onClick={handleClick}
			title={descriptor.hint}
			aria-disabled={disabled}
			disabled={disabled}
			data-orientation={orientation}
			className={baseClasses}
		>
			{descriptor.icon ? (
				<span className="grid h-6 w-6 place-items-center text-sky-500 transition-colors duration-200 group-hover:text-sky-600">
					{descriptor.icon}
				</span>
			) : null}
			<span className="text-left text-[13px] font-semibold tracking-[0.12em] text-slate-600 group-hover:text-sky-600">
				{descriptor.label}
			</span>
			{descriptor.shortcut ? <span className={shortcutClasses}>{descriptor.shortcut}</span> : null}
			{descriptor.badge ? descriptor.badge : null}
		</button>
	);
});

ToolItem.displayName = 'ToolItem';

export default ToolItem;

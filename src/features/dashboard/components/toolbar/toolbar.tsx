/**
 * Toolbar orchestrates layout and behavior for the dashboard tool controls.
 */
import { memo, useMemo, useState } from 'react';
/* eslint-disable react-refresh/only-export-components -- file exports constants/helpers alongside React components */
import type { CSSProperties } from 'react';

import ToolItem from './toolbar-item';
import ToolbarToggleRegion from './toolbar-toggle-region';
import type {
	ToolbarAttachment,
	ToolbarOrientation,
	ToolbarProps,
	ToolItemRenderProps,
} from './types';

const anchorRadiusClass: Record<ToolbarAttachment, string> = {
	top: 'rounded-none',
	bottom: 'rounded-none',
	left: 'rounded-none',
	right: 'rounded-none',
};

const floatingOffsetStyles: Record<ToolbarAttachment, (offset: number) => Partial<CSSProperties>> = {
	top: (offset) => ({ top: offset }),
	bottom: (offset) => ({ bottom: offset }),
	left: (offset) => ({ left: offset }),
	right: (offset) => ({ right: offset }),
};

const floatingTransformClasses: Record<ToolbarAttachment, string> = {
	top: 'top-0 left-1/2 -translate-x-1/2',
	bottom: 'bottom-0 left-1/2 -translate-x-1/2',
	left: 'left-0 top-1/2 -translate-y-1/2',
	right: 'right-0 top-1/2 -translate-y-1/2',
};

const orientationByAnchor: Record<ToolbarAttachment, ToolbarOrientation> = {
	top: 'horizontal',
	bottom: 'horizontal',
	left: 'vertical',
	right: 'vertical',
};

const Toolbar = memo(function Toolbar({
	items,
	anchor = 'top',
	disabledItemIds,
	onItemSelect,
	floating = true,
	offset = 24,
	dense = false,
	className,
	style,
	renderItem,
	initialExpanded,
}: ToolbarProps) {
	const orientation = orientationByAnchor[anchor];
	const disabledSet = useMemo(() => new Set(disabledItemIds ?? []), [disabledItemIds]);

	const [expanded, setExpanded] = useState<boolean>(Boolean(initialExpanded));
	const isVertical = anchor === 'left' || anchor === 'right';
	const collapsed = !expanded && isVertical;

	const containerStyle = useMemo(() => {
		if (!floating) {
			return style ?? {};
		}

		const dynamic: CSSProperties = { ...floatingOffsetStyles[anchor](offset) };
		return style ? { ...dynamic, ...style } : dynamic;
	}, [anchor, floating, offset, style]);

	const baseClasses = [
		'flex border border-slate-200 bg-white/95 text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-200 backdrop-blur-sm',
		collapsed ? 'w-16 flex-col items-center justify-start gap-2 px-2 py-4' : '',
		anchorRadiusClass[anchor],
		orientation === 'horizontal'
			? dense
				? 'flex-row items-center justify-center gap-2 min-w-[15rem] min-h-14 px-4 py-2'
				: 'flex-row items-center justify-center gap-3 min-w-[17rem] min-h-16 px-5 py-2.5'
			: collapsed
				? ''
				: dense
					? 'flex-col items-stretch justify-start gap-2 min-w-[3.75rem] min-h-[17rem] px-2.5 py-4'
					: 'flex-col items-stretch justify-start gap-3 min-w-[4.5rem] min-h-[20rem] px-3 py-5',
		!floating && isVertical ? 'h-screen' : '',
		floating ? `fixed z-40 ${floatingTransformClasses[anchor]}` : 'relative',
		!floating && (anchor === 'top' || anchor === 'bottom') ? 'w-full justify-between' : '',
		!floating && anchor === 'left' ? 'self-start' : '',
		!floating && anchor === 'right' ? 'self-end' : '',
		className ?? '',
	]
		.filter(Boolean)
		.join(' ');

	const renderCollection = (item: ToolItemRenderProps) => (
		<span
			key={item.descriptor.id}
			data-role="toolbar-item-wrapper"
			className={expanded ? 'inline-flex w-full' : 'inline-flex'}
		>
			{renderItem?.(item)}
		</span>
	);

	return (
		<div
			className={baseClasses}
			style={floating ? containerStyle : style}
			data-toolbar-anchor={anchor}
			data-toolbar-orientation={orientation}
		>
			<ToolbarToggleRegion
				anchor={anchor}
				collapsed={collapsed}
				onToggle={() => setExpanded((state) => !state)}
			/>
			{items.map((descriptor) => {
				const disabled = disabledSet.has(descriptor.id);

				const handleSelect = () => {
					if (disabled) {
						return;
					}
					onItemSelect?.(descriptor);
				};

				if (renderItem) {
					return renderCollection({
						descriptor,
						orientation,
						disabled,
						onSelect: handleSelect,
					});
				}

				return (
					<ToolItem
						key={descriptor.id}
						descriptor={descriptor}
						orientation={orientation}
						disabled={disabled}
						compact={collapsed}
						onSelect={handleSelect}
					/>
				);
			})}
		</div>
	);
});

Toolbar.displayName = 'Toolbar';

export default Toolbar;
export type { ToolbarProps };
export { orientationByAnchor };

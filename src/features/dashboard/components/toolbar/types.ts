/**
 * Shared toolbar type definitions used across dashboard toolbar building blocks.
 */
import type { CSSProperties, ReactNode } from 'react';

export type ToolbarAttachment = 'top' | 'bottom' | 'left' | 'right';
export type ToolbarOrientation = 'horizontal' | 'vertical';

export interface ToolItemDescriptor {
	id: string;
	label: string;
	icon?: ReactNode;
	hint?: string;
	shortcut?: string;
	badge?: ReactNode;
	/** Override the icon wrapper's Tailwind text-color class (default "text-sky-500"). */
	iconClassName?: string;
	/** Give this item a persistent soft glow + subtle pulse, for items that need to
	 * stand out from the rest of the toolbar (e.g. AI-agent-sourced actions). */
	glow?: boolean;
}

export interface ToolItemProps {
	descriptor: ToolItemDescriptor;
	orientation: ToolbarOrientation;
	disabled?: boolean;
	onSelect?: (descriptor: ToolItemDescriptor) => void;
	compact?: boolean;
}

export interface ToolItemRenderProps {
	descriptor: ToolItemDescriptor;
	orientation: ToolbarOrientation;
	disabled: boolean;
	onSelect: () => void;
}

export interface ToolbarProps {
	items: ToolItemDescriptor[];
	anchor?: ToolbarAttachment;
	disabledItemIds?: string[];
	onItemSelect?: (descriptor: ToolItemDescriptor) => void;
	floating?: boolean;
	offset?: number;
	dense?: boolean;
	className?: string;
	style?: CSSProperties;
	renderItem?: (item: ToolItemRenderProps) => ReactNode;
	initialExpanded?: boolean;
}

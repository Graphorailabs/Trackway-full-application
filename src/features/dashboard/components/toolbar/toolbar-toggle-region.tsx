/**
 * ToolbarToggleRegion renders the hamburger toggle affordance for vertical toolbars.
 */
import type { ToolbarAttachment } from './types';

interface ToolbarToggleRegionProps {
	anchor: ToolbarAttachment;
	collapsed: boolean;
	onToggle: () => void;
}

const ToolbarToggleRegion = ({ anchor, collapsed, onToggle }: ToolbarToggleRegionProps) => {
	if (anchor !== 'left' && anchor !== 'right') {
		return null;
	}

	const containerClass = collapsed
		? 'flex w-full justify-center p-2'
		: anchor === 'right'
			? 'flex w-full items-center justify-end gap-3 px-3 py-2'
			: 'flex w-full items-center gap-3 px-3 py-2';

	return (
		<div className={containerClass}>
			<button
				type="button"
				aria-label="Toggle toolbar"
				className="h-10 w-10 rounded-md border border-transparent bg-white text-slate-500 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600"
				onClick={onToggle}
			>
				<span className="block h-0.5 w-5 bg-current" />
				<span className="mt-1 block h-0.5 w-5 bg-current" />
				<span className="mt-1 block h-0.5 w-5 bg-current" />
			</button>
			{!collapsed && anchor === 'left' ? (
				<span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
					Tool Menu
				</span>
			) : null}
		</div>
	);
};

export default ToolbarToggleRegion;

/**
 * EditorCard displays a single editor entry and exposes a launch affordance for the selection.
 */
import type { DashboardEditorSummary } from '../constants';

interface EditorCardProps {
	editor: DashboardEditorSummary;
	disabled?: boolean;
	onLaunch: (editor: DashboardEditorSummary) => void;
}

const EditorCard = ({ editor, disabled = false, onLaunch }: EditorCardProps) => {
	const cardClasses = [
		'relative flex h-full flex-col rounded-xl border p-6 text-left shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
		disabled
			? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
			: 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-md text-slate-700',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<button
			type="button"
			disabled={disabled}
			onClick={() => onLaunch(editor)}
			className={cardClasses}
		>
			<div className="flex items-center justify-between">
				<span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
					{editor.icon}
				</span>
				<span className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
					Launch
				</span>
			</div>
			<h3 className="mt-4 text-lg font-semibold text-slate-900">{editor.title}</h3>
			<p className="mt-2 text-sm text-slate-500">{editor.description}</p>
			{disabled ? (
				<span className="pointer-events-none absolute inset-0 flex items-end justify-end p-4 text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
					Project required
				</span>
			) : null}
		</button>
	);
};

export type { EditorCardProps };
export default EditorCard;

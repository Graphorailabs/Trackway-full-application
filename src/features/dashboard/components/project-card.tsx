/**
 * ProjectCard renders a selectable summary for a project in the dashboard list.
 */
import type { KeyboardEvent } from 'react';
import type { DashboardProjectSummary } from '@/types/project';

interface ProjectCardProps {
	project: DashboardProjectSummary;
	selected: boolean;
	pending?: boolean;
	disabled?: boolean;
	onSelect: (projectId: string) => void;
	onDeleteRequest: () => void;
	formatUpdatedAt: (value: string) => string;
}

const ProjectCard = ({
	project,
	selected,
	pending = false,
	disabled = false,
	onSelect,
	onDeleteRequest,
	formatUpdatedAt,
}: ProjectCardProps) => {
	const projectClasses = [
		'flex h-full flex-col rounded-xl border p-5 text-left shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
		pending
			? 'border-sky-400 bg-sky-50 shadow-md animate-pulse pointer-events-none'
			: selected
				? 'border-sky-400 bg-sky-50 shadow-md cursor-pointer'
				: disabled
					? 'border-slate-200 bg-white opacity-60 cursor-not-allowed pointer-events-none'
					: 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-md cursor-pointer',
	]
		.filter(Boolean)
		.join(' ');

	const tabIndex = pending || disabled ? -1 : 0;
	const deleteDisabled = pending || disabled;

	const handleSelect = () => {
		if (pending || disabled) {
			return;
		}
		onSelect(project.id);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			if (!pending && !disabled) {
				handleSelect();
			}
		}
	};

	const statusLabel = pending
		? 'Selecting…'
		: selected
			? 'Selected'
			: 'Select';
	const statusClasses = pending
		? 'font-medium uppercase tracking-[0.18em] text-sky-500'
		: 'font-medium uppercase tracking-[0.18em] text-slate-500';

	return (
		<div
			role="button"
			tabIndex={tabIndex}
			onClick={handleSelect}
			onKeyDown={handleKeyDown}
			className={projectClasses}
			aria-pressed={selected}
			aria-disabled={pending || disabled}
			aria-busy={pending}
		>
			<div className="flex items-start justify-between gap-3">
				<h3 className="text-base font-semibold text-slate-900">{project.name}</h3>
				<button
					type="button"
					disabled={deleteDisabled}
					onClick={(event) => {
						event.stopPropagation();
						if (deleteDisabled) {
							return;
						}
						onDeleteRequest();
					}}
					onKeyDown={(event) => event.stopPropagation()}
					className="rounded-md border border-transparent px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-500 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:border-red-200 hover:bg-red-50"
				>
					Delete
				</button>
			</div>
			<p className="mt-2 text-sm text-slate-500">{project.description}</p>
			<div className="mt-4 flex items-center justify-between text-xs text-slate-400">
				<span>{`Updated ${formatUpdatedAt(project.updatedAt)}`}</span>
				<span className={statusClasses}>{statusLabel}</span>
			</div>
		</div>
	);
};

export type { ProjectCardProps };
export default ProjectCard;

/**
 * ProjectCard renders a selectable summary for a project in the dashboard list.
 */
import type { DashboardProjectSummary } from '@/types/project';

interface ProjectCardProps {
	project: DashboardProjectSummary;
	selected: boolean;
	onSelect: (projectId: string) => void;
	formatUpdatedAt: (value: string) => string;
}

const ProjectCard = ({ project, selected, onSelect, formatUpdatedAt }: ProjectCardProps) => {
	const projectClasses = [
		'flex h-full flex-col rounded-xl border p-5 text-left shadow-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
		selected
			? 'border-sky-400 bg-sky-50 shadow-md'
			: 'border-slate-200 bg-white hover:border-sky-300 hover:shadow-md',
	]
		.filter(Boolean)
		.join(' ');

	return (
		<button
			type="button"
			onClick={() => onSelect(project.id)}
			className={projectClasses}
			aria-pressed={selected}
		>
			<div className="flex items-start justify-between gap-3">
				<h3 className="text-base font-semibold text-slate-900">{project.name}</h3>
			</div>
			<p className="mt-2 text-sm text-slate-500">{project.description}</p>
			<div className="mt-4 flex items-center justify-between text-xs text-slate-400">
				<span>{`Updated ${formatUpdatedAt(project.updatedAt)}`}</span>
				<span className="font-medium uppercase tracking-[0.18em] text-slate-500">
					{selected ? 'Selected' : 'Select'}
				</span>
			</div>
		</button>
	);
};

export type { ProjectCardProps };
export default ProjectCard;

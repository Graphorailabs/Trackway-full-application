/**
 * ProjectSection presents the selectable project grid along with empty-state messaging.
 */
import type { DashboardProjectSummary } from '@/types/project';
import ProjectCard from './project-card';

interface ProjectSectionProps {
	projects: DashboardProjectSummary[];
	selectedProjectId?: string;
	onSelect: (projectId: string) => void;
	formatUpdatedAt: (value: string) => string;
}

const ProjectSection = ({ projects, selectedProjectId, onSelect, formatUpdatedAt }: ProjectSectionProps) => {
	return (
		<section aria-labelledby="dashboard-projects-heading" className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h2 id="dashboard-projects-heading" className="text-lg font-semibold text-slate-900">
					Projects
				</h2>
				<p className="text-sm text-slate-500">
					Browse the projects you have created and select one to continue working on it.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{projects.map((project) => (
					<ProjectCard
						key={project.id}
						project={project}
						selected={project.id === selectedProjectId}
						onSelect={onSelect}
						formatUpdatedAt={formatUpdatedAt}
					/>
				))}
			</div>

			{projects.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
					No projects yet. Create or import a project to get started.
				</div>
			) : null}
		</section>
	);
};

export type { ProjectSectionProps };
export default ProjectSection;

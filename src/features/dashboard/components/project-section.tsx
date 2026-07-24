/**
 * ProjectSection presents the selectable project grid along with empty-state messaging.
 */
import type { DashboardProjectSummary } from '@/types/project';
import ProjectCard from './project-card';

interface ProjectSectionProps {
	projects: DashboardProjectSummary[];
	selectedProjectId?: string;
	pendingProjectId?: string;
	selectionLocked?: boolean;
	onSelect: (projectId: string) => void;
	onDeselect: () => void;
	onDeleteRequest: (projectId: string, projectName: string) => void;
	formatUpdatedAt: (value: string) => string;
	loading?: boolean;
	errorMessage?: string;
	exporting?: boolean;
}

const ProjectSection = ({
	projects,
	selectedProjectId,
	pendingProjectId,
	selectionLocked = false,
	onSelect,
	onDeselect,
	onDeleteRequest,
	formatUpdatedAt,
	loading = false,
	errorMessage,
	exporting = false,
}: ProjectSectionProps) => {
	const showLoading = loading && projects.length === 0;
	const showError = Boolean(errorMessage);
	const showEmpty = !loading && projects.length === 0 && !showError;
	const showExporting = exporting;
	const activePendingId = pendingProjectId ?? undefined;

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
						pending={project.id === activePendingId}
						disabled={selectionLocked && project.id !== activePendingId}
						onSelect={(id) => {
							if (selectionLocked) {
								return;
							}
							if (project.id === selectedProjectId) {
								onDeselect();
								return;
							}
							onSelect(id);
						}}
						onDeleteRequest={() => onDeleteRequest(project.id, project.name)}
						formatUpdatedAt={formatUpdatedAt}
					/>
				))}
			</div>

			{showLoading ? (
				<div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
					Loading projects…
				</div>
			) : null}

			{showError ? (
				<div className="rounded-xl border border-dashed border-red-200 bg-white p-6 text-center text-sm text-red-500">
					{errorMessage}
				</div>
			) : null}

			{showEmpty ? (
				<div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
					No projects yet. Create or import a project to get started.
				</div>
			) : null}

			{showExporting ? (
				<div className="rounded-xl border border-dashed border-sky-200 bg-white p-6 text-center text-sm text-sky-600">
					Exporting selected project…
				</div>
			) : null}
		</section>
	);
};

export type { ProjectSectionProps };
export default ProjectSection;

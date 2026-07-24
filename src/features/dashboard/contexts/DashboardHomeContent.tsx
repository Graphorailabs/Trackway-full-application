import { memo } from 'react';

import EditorSection from '../components/editor-section.tsx';
import ProjectSection from '../components/project-section.tsx';
import { formatUpdatedAt } from '../layouts/dashboard-formatters.ts';
import type { DashboardEditorSummary } from '../constants.ts';
import type { DashboardProjectSummary } from '@/types/project';

interface DashboardHomeContentProps {
	editors: DashboardEditorSummary[];
	onEditorLaunch?: (editor: DashboardEditorSummary, project: DashboardProjectSummary) => void;
	projects: DashboardProjectSummary[];
	selectedProject?: DashboardProjectSummary;
	selectedProjectId?: string;
	pendingProjectId?: string;
	onSelectProject: (projectId: string) => void;
	onDeselectProject: () => void;
	onDeleteProject: (projectId: string, projectName: string) => void;
	projectsLoading: boolean;
	projectError?: string;
	projectsExporting: boolean;
}

const DashboardHomeContent = memo(function DashboardHomeContent({
	editors,
	onEditorLaunch,
	projects,
	selectedProject,
	selectedProjectId,
	pendingProjectId,
	onSelectProject,
	onDeselectProject,
	onDeleteProject,
	projectsLoading,
	projectError,
	projectsExporting,
}: DashboardHomeContentProps) {
	const hasSelection = Boolean(selectedProject);
	const selectionLocked = Boolean(pendingProjectId);

	const handleEditorLaunch = (editor: DashboardEditorSummary) => {
		if (!selectedProject) {
			return;
		}

		onEditorLaunch?.(editor, selectedProject);
	};

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
			<EditorSection
				editors={editors}
				projectSelected={hasSelection}
				onLaunch={handleEditorLaunch}
			/>

			<ProjectSection
				projects={projects}
				selectedProjectId={selectedProjectId}
				pendingProjectId={pendingProjectId}
				selectionLocked={selectionLocked}
				onSelect={onSelectProject}
				onDeselect={onDeselectProject}
				onDeleteRequest={onDeleteProject}
				formatUpdatedAt={formatUpdatedAt}
				loading={projectsLoading}
				errorMessage={projectError}
				exporting={projectsExporting}
			/>
		</div>
	);
});

DashboardHomeContent.displayName = 'DashboardHomeContent';

export type { DashboardHomeContentProps };
export default DashboardHomeContent;

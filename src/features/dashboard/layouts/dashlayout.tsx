import { memo, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { ToolbarAttachment, ToolItemDescriptor } from '../components/toolbat';
import { DASHBOARD_EDITOR_CARDS, DASHBOARD_TOOL_ITEMS } from '../constants';
import DashboardLayoutChrome from './DashboardLayoutChrome.tsx';
import type { DashboardEditorSummary } from '../constants';
import type { DashboardProjectSummary, ProjectRecord } from '@/types/project';
import { useProject } from '@/hooks/useProject';

interface DashboardLayoutProps {
	children?: ReactNode;
	toolbarAnchor?: ToolbarAttachment;
	toolbarItems?: ToolItemDescriptor[];
	toolbarDense?: boolean;
	projects?: DashboardProjectSummary[];
	editors?: DashboardEditorSummary[];
	onEditorLaunch?: (editor: DashboardEditorSummary, project: DashboardProjectSummary) => void;
	onToolbarAction?: (descriptor: ToolItemDescriptor) => void;
}

const DashboardLayout = memo(function DashboardLayout({
	children,
	toolbarAnchor = 'left',
	toolbarItems = DASHBOARD_TOOL_ITEMS,
	toolbarDense = false,
	projects,
	editors = DASHBOARD_EDITOR_CARDS,
	onEditorLaunch,
	onToolbarAction,
}: DashboardLayoutProps) {
	const {
		projects: projectRecords,
		currentProject,
		loadProject,
		exportProject,
		isLoading,
		isExporting,
		error,
		closeCurrent,
	} = useProject();
	const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);

	const projectSummaryMap = useMemo(() => {
		if (projects) {
			return new Map(projects.map((summary) => [summary.id, summary]));
		}

		return new Map(projectRecords.map((record) => [record.id, mapProjectRecordToSummary(record)]));
	}, [projects, projectRecords]);

	const resolvedProjects = useMemo<DashboardProjectSummary[]>(
		() => Array.from(projectSummaryMap.values()),
		[projectSummaryMap],
	);

	const selectedProjectSummary = useMemo<DashboardProjectSummary | undefined>(() => {
		if (!currentProject) {
			return undefined;
		}

		return projectSummaryMap.get(currentProject.id) ?? mapProjectRecordToSummary(currentProject);
	}, [currentProject, projectSummaryMap]);

	const handleProjectSelect = useCallback(
		(projectId: string) => {
			if (!projectId || pendingProjectId) {
				return;
			}

			setPendingProjectId(projectId);
			loadProject(projectId)
				.then((project) => {
					if (project) {
						console.info(`Project selected: ${project.name} (${project.id})`);
					} else {
						console.warn(`Project selection failed: ${projectId} not found.`);
					}
				})
				.catch(() => {
					// errors surface through the shared project context state
				})
				.finally(() => {
					setPendingProjectId((current) => (current === projectId ? null : current));
				});
		},
		[loadProject, pendingProjectId],
	);

	const handleProjectDeselect = useCallback(() => {
		closeCurrent();
		setPendingProjectId(null);
	}, [closeCurrent]);

	const handleProjectExport = useCallback(
		(projectId: string) => {
			console.info(`Export requested for project ${projectId}`);
			exportProject(projectId, 'zip', true).catch(() => {
				// errors surface via project context state
			});
		},
		[exportProject],
	);

	return (
		<DashboardLayoutChrome
			toolbarAnchor={toolbarAnchor}
			toolbarItems={toolbarItems}
			toolbarDense={toolbarDense}
			onToolbarItem={onToolbarAction}
			editors={editors}
			onEditorLaunch={onEditorLaunch}
			projects={resolvedProjects}
			selectedProject={selectedProjectSummary}
			selectedProjectId={selectedProjectSummary?.id}
			pendingProjectId={pendingProjectId}
			onProjectSelect={handleProjectSelect}
			onProjectDeselect={handleProjectDeselect}
			onProjectExport={handleProjectExport}
			projectsLoading={isLoading}
			projectsExporting={isExporting}
			projectError={error ?? undefined}
		>
			{children}
		</DashboardLayoutChrome>
	);
});

DashboardLayout.displayName = 'DashboardLayout';

const EMPTY_PROJECT_DESCRIPTION = 'Empty project · No design files yet.';

function mapProjectRecordToSummary(record: ProjectRecord): DashboardProjectSummary {
	const fileCount = Object.keys(record.files ?? {}).length;
	const description = fileCount
		? `${fileCount} file${fileCount === 1 ? '' : 's'} synced from storage.`
		: EMPTY_PROJECT_DESCRIPTION;

	return {
		id: record.id,
		name: record.name,
		description,
		updatedAt: record.updatedAt || record.createdAt,
	};
}

export type { DashboardLayoutProps };
export default DashboardLayout;

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import Toolbar from '../components/toolbat';
import type { ToolbarAttachment, ToolItemDescriptor } from '../components/toolbat';
import ConfirmDeleteProjectModal from '../components/confirm-delete-project-modal';
import CreateProjectModal from '../components/create-project-modal';
import { useProject } from '@/hooks/useProject';
import { pickProjectArchive } from '@/utils/file-picker';
import DashboardHomeContent from '../contexts/DashboardHomeContent.tsx';
import StorageUsageSummary from './StorageUsageSummary.tsx';
import type { DashboardEditorSummary } from '../constants';
import type { DashboardProjectSummary } from '@/types/project';

interface DashboardLayoutChromeProps {
	children?: ReactNode;
	toolbarAnchor: ToolbarAttachment;
	toolbarItems: ToolItemDescriptor[];
	toolbarDense: boolean;
	onToolbarItem?: (descriptor: ToolItemDescriptor) => void;
	editors: DashboardEditorSummary[];
	onEditorLaunch?: (editor: DashboardEditorSummary, project: DashboardProjectSummary) => void;
	projects: DashboardProjectSummary[];
	selectedProject?: DashboardProjectSummary;
	selectedProjectId?: string;
	pendingProjectId?: string | null;
	onProjectSelect: (projectId: string) => void;
	onProjectDeselect: () => void;
	onProjectExport: (projectId: string) => void;
	projectsLoading: boolean;
	projectsExporting: boolean;
	projectError?: string;
}

function DashboardLayoutChrome({
	children,
	toolbarAnchor,
	toolbarItems,
	toolbarDense,
	onToolbarItem,
	editors,
	onEditorLaunch,
	projects,
	selectedProject,
	selectedProjectId,
	pendingProjectId,
	onProjectSelect,
	onProjectDeselect,
	onProjectExport,
	projectsLoading,
	projectsExporting,
	projectError,
}: DashboardLayoutChromeProps) {
	const toolbarHint = toolbarItems[0]?.hint;
	const navigate = useNavigate();
	const { createProject, deleteProject, importProject, storageEstimate, getStorageEstimate } = useProject();
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [createBusy, setCreateBusy] = useState(false);
	const [createError, setCreateError] = useState<string | null>(null);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
	const [importBusy, setImportBusy] = useState(false);
	const [importError, setImportError] = useState<string | null>(null);
	const [estimateRefreshing, setEstimateRefreshing] = useState(false);

	const disabledToolbarItemIds = useMemo(() => {
		const disabled = new Set<string>();
		if (projectsExporting || pendingProjectId) {
			disabled.add('export-project');
		}
		if (importBusy) {
			disabled.add('import-project');
		}
		return Array.from(disabled);
	}, [importBusy, pendingProjectId, projectsExporting]);

	const handleToolbarSelect = useCallback(
		(descriptor: ToolItemDescriptor) => {
			onToolbarItem?.(descriptor);
			if (descriptor.id === 'new-project') {
				setCreateError(null);
				setCreateBusy(false);
				setCreateModalOpen(true);
				return;
			}
			if (descriptor.id === 'export-project') {
				const targetId = selectedProjectId ?? selectedProject?.id;
				if (!targetId) {
					console.error('Export failed: no project selected. Please select a project first.');
					return;
				}

				onProjectExport(targetId);
				return;
			}
			if (descriptor.id === 'import-project') {
				if (importBusy) {
					return;
				}

				setImportError(null);
				setImportBusy(true);
				pickProjectArchive()
					.then(async (file) => {
						if (!file) {
							return;
						}
						const imported = await importProject(file);
						console.info(`Project imported: ${imported.name} (${imported.id})`);
					})
					.catch((error) => {
						const message = error instanceof Error ? error.message : 'Failed to import project.';
						setImportError(message);
						if (error) {
							console.error('Project import failed:', error);
						}
					})
					.finally(() => {
						setImportBusy(false);
					});
			}
		},
		[importBusy, importProject, onProjectExport, onToolbarItem, selectedProject?.id, selectedProjectId],
	);

	const handleStorageRefresh = useCallback(() => {
		if (estimateRefreshing) {
			return;
		}

		setEstimateRefreshing(true);
		getStorageEstimate()
			.catch(() => {
				// project context surfaces errors globally
			})
			.finally(() => {
				setEstimateRefreshing(false);
			});
	}, [estimateRefreshing, getStorageEstimate]);

	const handleProjectDeleteRequest = useCallback((projectId: string, projectName: string) => {
		setDeleteError(null);
		setDeleteBusy(false);
		setDeleteTarget({ id: projectId, name: projectName });
		setDeleteModalOpen(true);
	}, []);

	const handleDeleteModalCancel = useCallback(() => {
		setDeleteModalOpen(false);
		setDeleteBusy(false);
		setDeleteError(null);
		setDeleteTarget(null);
	}, []);

	const handleDeleteModalConfirm = useCallback(async () => {
		if (!deleteTarget) {
			return;
		}

		setDeleteBusy(true);
		setDeleteError(null);
		try {
			await deleteProject(deleteTarget.id);
			if (selectedProjectId === deleteTarget.id) {
				onProjectDeselect();
			}
			setDeleteModalOpen(false);
			setDeleteTarget(null);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to delete project.';
			setDeleteError(message);
		} finally {
			setDeleteBusy(false);
		}
	}, [deleteProject, deleteTarget, onProjectDeselect, selectedProjectId]);

	const handleCreateModalCancel = useCallback(() => {
		setCreateError(null);
		setCreateBusy(false);
		setCreateModalOpen(false);
	}, []);

	const handleCreateModalSubmit = useCallback(
		async (name: string) => {
			setCreateBusy(true);
			setCreateError(null);
			try {
				await createProject(name);
				setCreateModalOpen(false);
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Failed to create project.';
				setCreateError(message);
			} finally {
				setCreateBusy(false);
			}
		},
		[createProject],
	);

	const handleEditorLaunch = (
		editor: DashboardEditorSummary,
		project: DashboardProjectSummary,
	) => {
		if (onEditorLaunch) {
			onEditorLaunch(editor, project);
			return;
		}

		if (editor.route) {
			const target = editor.route.startsWith('/') ? editor.route : `/${editor.route}`;
			navigate(target);
		}
	};

	return (
		<div className="relative flex min-h-screen bg-slate-100 text-slate-800">
			<Toolbar
				items={toolbarItems}
				anchor={toolbarAnchor}
				dense={toolbarDense}
				floating={false}
				initialExpanded={false}
				onItemSelect={handleToolbarSelect}
				disabledItemIds={disabledToolbarItemIds}
				className="bg-white"
			/>

			<div className="flex flex-1 flex-col">
				<header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-8 py-5 backdrop-blur-sm">
					<div>
						<h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
						<p className="text-sm text-slate-500">
							{selectedProject
								? 'Ready to continue where you left off. Choose an editor below to open it.'
								: toolbarHint ?? 'Select a project from the list to enable the editors.'}
						</p>
						{importError ? (
							<p className="mt-2 text-sm text-red-500" role="alert">
								{importError}
							</p>
						) : null}
					</div>
					<StorageUsageSummary
						estimate={storageEstimate}
						refreshing={estimateRefreshing}
						onRefresh={handleStorageRefresh}
					/>
				</header>

				<main className="flex-1 overflow-auto bg-slate-50 px-8 py-6">
					{children ?? (
						<DashboardHomeContent
							editors={editors}
							onEditorLaunch={handleEditorLaunch}
							projects={projects}
							selectedProject={selectedProject}
							selectedProjectId={selectedProjectId}
							pendingProjectId={pendingProjectId ?? undefined}
							onSelectProject={onProjectSelect}
							onDeselectProject={onProjectDeselect}
							onDeleteProject={handleProjectDeleteRequest}
							projectsLoading={projectsLoading}
							projectsExporting={projectsExporting}
							projectError={projectError}
						/>
					)}
				</main>
			</div>

			<CreateProjectModal
				open={createModalOpen}
				onCancel={handleCreateModalCancel}
				onCreate={handleCreateModalSubmit}
				isSubmitting={createBusy}
				submitError={createError ?? undefined}
			/>

			<ConfirmDeleteProjectModal
				open={deleteModalOpen}
				projectName={deleteTarget?.name}
				onCancel={handleDeleteModalCancel}
				onConfirm={handleDeleteModalConfirm}
				isDeleting={deleteBusy}
				errorMessage={deleteError ?? undefined}
			/>
		</div>
	);
}

export type { DashboardLayoutChromeProps };
export default DashboardLayoutChrome;

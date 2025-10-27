import { memo, useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import Toolbar from '../components/toolbat';
import type { ToolbarAttachment, ToolItemDescriptor } from '../components/toolbat';
import EditorSection from '../components/editor-section';
import ProjectSection from '../components/project-section';
import CreateProjectModal from '../components/create-project-modal';
import ConfirmDeleteProjectModal from '../components/confirm-delete-project-modal';
import { DASHBOARD_EDITOR_CARDS, DASHBOARD_TOOL_ITEMS } from '../constants';
import type { DashboardEditorSummary } from '../constants';
import type { DashboardProjectSummary, ProjectRecord } from '@/types/project';
import type { StorageEstimate } from '@/storage/MediaStorage';
import { useProject } from '@/hooks/useProject';
import { pickProjectArchive } from '@/utils/file-picker';

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

const updatedFormatter = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
});

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

	const resolvedProjects = useMemo<DashboardProjectSummary[]>(() => Array.from(projectSummaryMap.values()), [projectSummaryMap]);

	const selectedProjectSummary = useMemo<DashboardProjectSummary | undefined>(() => {
		if (!currentProject) {
			return undefined;
		}

		return projectSummaryMap.get(currentProject.id) ?? mapProjectRecordToSummary(currentProject);
	}, [currentProject, projectSummaryMap]);

	const handleProjectSelect = useCallback((projectId: string) => {
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
	}, [loadProject, pendingProjectId]);

	const handleProjectDeselect = useCallback(() => {
		closeCurrent();
		setPendingProjectId(null);
	}, [closeCurrent]);

	const handleProjectExport = useCallback((projectId: string) => {
		console.info(`Export requested for project ${projectId}`);
		exportProject(projectId, 'zip', true).catch(() => {
			// errors surface via project context state
		});
	}, [exportProject]);

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

	const handleToolbarSelect = useCallback((descriptor: ToolItemDescriptor) => {
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
	}, [importBusy, importProject, onProjectExport, onToolbarItem, selectedProject?.id, selectedProjectId]);

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

	const handleCreateModalSubmit = useCallback(async (name: string) => {
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
	}, [createProject]);

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

interface StorageUsageSummaryProps {
	estimate: StorageEstimate | null;
	refreshing: boolean;
	onRefresh: () => void;
}

function StorageUsageSummary({ estimate, refreshing, onRefresh }: StorageUsageSummaryProps) {
	const usageBytes = typeof estimate?.usageBytes === 'number' ? estimate.usageBytes : null;
	const quotaBytes = typeof estimate?.quotaBytes === 'number' && estimate.quotaBytes > 0 ? estimate.quotaBytes : null;
	const percentRaw = usageBytes !== null && quotaBytes ? (usageBytes / quotaBytes) * 100 : null;
	const percentCapped = percentRaw !== null ? Math.min(percentRaw, 100) : null;
	const percentLabel = percentCapped !== null
		? (percentCapped >= 10 ? `${Math.round(percentCapped)}%` : `${percentCapped.toFixed(1)}%`)
		: null;
	const usageLabel = usageBytes === null
		? 'Calculating...'
		: quotaBytes
			? `${formatBytes(usageBytes)} / ${formatBytes(quotaBytes)}`
			: `${formatBytes(usageBytes)} used`;
	const backendLabel = formatBackendLabel(estimate?.backend);
	const persistedState = estimate?.persisted;
	const progressWidth = percentCapped !== null ? `${percentCapped}%` : '0%';
	const ariaValueNow = percentRaw !== null ? Number(percentRaw.toFixed(1)) : undefined;

	return (
		<div className="flex items-center gap-3 text-xs text-slate-500">
			<span className="font-semibold uppercase tracking-wide text-slate-400">Storage</span>
			<div className="flex items-center gap-2 text-sm font-medium text-slate-700">
				<span>{usageLabel}</span>
				{percentLabel ? (
					<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
						{percentLabel}
					</span>
				) : null}
			</div>
			<div
				className="relative h-1.5 w-28 overflow-hidden rounded-full bg-slate-200"
				role="progressbar"
				aria-label="Storage usage"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={ariaValueNow}
			>
				<div
					className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 transition-[width]"
					style={{ width: progressWidth }}
				/>
			</div>
			{backendLabel ? (
				<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
					{backendLabel}
				</span>
			) : null}
			{persistedState !== undefined ? (
				<span
					className={
						persistedState
							? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700'
							: 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700'
					}
				>
					{persistedState ? 'Persistent' : 'Volatile'}
				</span>
			) : null}
			<button
				type="button"
				onClick={onRefresh}
				disabled={refreshing}
				title="Refresh storage usage"
				aria-label="Refresh storage usage"
				className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-indigo-200 hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{refreshing ? (
					<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" aria-hidden />
				) : (
					<svg
						className="h-3.5 w-3.5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth={1.6}
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M21 2v6h-6" />
						<path d="M3 22v-6h6" />
						<path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 8" />
						<path d="M20.49 15A9 9 0 0 1 5.64 18.36L3 16" />
					</svg>
				)}
			</button>
		</div>
	);
}

function formatBytes(bytes: number): string {
	const absolute = Math.max(bytes, 0);
	if (!Number.isFinite(absolute) || absolute === 0) {
		return '0 B';
	}

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const exponent = Math.min(units.length - 1, Math.floor(Math.log(absolute) / Math.log(1024)));
	const value = absolute / 1024 ** exponent;
	const formatter = new Intl.NumberFormat('en-US', {
		maximumFractionDigits: value >= 100 ? 0 : value >= 10 ? 1 : 2,
	});
	return `${formatter.format(value)} ${units[exponent]}`;
}

function formatBackendLabel(backend?: string): string | null {
	if (!backend) {
		return null;
	}

	return backend
		.split(/[-_]/)
		.filter(Boolean)
		.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
		.join(' ');
}

function formatUpdatedAt(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return updatedFormatter.format(parsed);
}

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

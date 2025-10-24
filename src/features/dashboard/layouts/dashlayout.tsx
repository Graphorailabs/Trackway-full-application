import { memo, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import Toolbar from '../components/toolbat';
import type { ToolbarAttachment, ToolItemDescriptor } from '../components/toolbat';
import EditorSection from '../components/editor-section';
import ProjectSection from '../components/project-section';
import CreateProjectModal from '../components/create-project-modal';
import {
	DASHBOARD_EDITOR_CARDS,
	DASHBOARD_SAMPLE_PROJECTS,
	DASHBOARD_TOOL_ITEMS,
} from '../constants';
import type { DashboardEditorSummary } from '../constants';
import type { DashboardProjectSummary } from '../../../types/project';
import {
	DashboardProjectProvider,
	useDashboardProject,
} from '../contexts/project-selection-context';

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
	projects = DASHBOARD_SAMPLE_PROJECTS,
	editors = DASHBOARD_EDITOR_CARDS,
	onEditorLaunch,
	onToolbarAction,
}: DashboardLayoutProps) {
	return (
		<DashboardProjectProvider projects={projects}>
			<DashboardLayoutChrome
				toolbarAnchor={toolbarAnchor}
				toolbarItems={toolbarItems}
				toolbarDense={toolbarDense}
				onToolbarItem={onToolbarAction}
				editors={editors}
				onEditorLaunch={onEditorLaunch}
			>
				{children}
			</DashboardLayoutChrome>
		</DashboardProjectProvider>
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
}

function DashboardLayoutChrome({
	children,
	toolbarAnchor,
	toolbarItems,
	toolbarDense,
	onToolbarItem,
	editors,
	onEditorLaunch,
}: DashboardLayoutChromeProps) {
	const { selectedProject } = useDashboardProject();
	const toolbarHint = toolbarItems[0]?.hint;
	const navigate = useNavigate();
	const [createModalOpen, setCreateModalOpen] = useState(false);

	const handleToolbarSelect = useCallback((descriptor: ToolItemDescriptor) => {
		onToolbarItem?.(descriptor);
		if (descriptor.id === 'new-project') {
			setCreateModalOpen(true);
		}
	}, [onToolbarItem]);

	const handleCreateModalCancel = useCallback(() => {
		setCreateModalOpen(false);
	}, []);

	const handleCreateModalSubmit = useCallback((_name: string) => {
		setCreateModalOpen(false);
	}, []);

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
					</div>
				</header>

				<main className="flex-1 overflow-auto bg-slate-50 px-8 py-6">
					{children ?? (
						<DashboardHomeContent editors={editors} onEditorLaunch={handleEditorLaunch} />
					)}
				</main>
			</div>

			<CreateProjectModal
				open={createModalOpen}
				onCancel={handleCreateModalCancel}
				onCreate={handleCreateModalSubmit}
			/>
		</div>
	);
}

interface DashboardHomeContentProps {
	editors: DashboardEditorSummary[];
	onEditorLaunch?: (editor: DashboardEditorSummary, project: DashboardProjectSummary) => void;
}

const DashboardHomeContent = memo(function DashboardHomeContent({
	editors,
	onEditorLaunch,
}: DashboardHomeContentProps) {
	const { projects, selectedProject, selectedProjectId, selectProject } = useDashboardProject();
	const hasSelection = Boolean(selectedProject);

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
				onSelect={selectProject}
				formatUpdatedAt={formatUpdatedAt}
			/>
		</div>
	);
});

function formatUpdatedAt(value: string): string {
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return updatedFormatter.format(parsed);
}

export type { DashboardLayoutProps };
export default DashboardLayout;

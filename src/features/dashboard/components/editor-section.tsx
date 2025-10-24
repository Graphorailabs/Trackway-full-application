/**
 * EditorSection groups the available editor cards and handles disabled state messaging.
 */
import type { DashboardEditorSummary } from '../constants';
import EditorCard from './editor-card';

interface EditorSectionProps {
	editors: DashboardEditorSummary[];
	projectSelected: boolean;
	onLaunch: (editor: DashboardEditorSummary) => void;
}

const EditorSection = ({ editors, projectSelected, onLaunch }: EditorSectionProps) => {
	return (
		<section aria-labelledby="dashboard-editors-heading" className="flex flex-col gap-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 id="dashboard-editors-heading" className="text-lg font-semibold text-slate-900">
						Editors
					</h2>
					<p className="text-sm text-slate-500">
						Launch an editor for the currently selected project.
					</p>
				</div>
				<div className="text-sm text-slate-500">
					{projectSelected ? (
						<span className="font-medium text-slate-600">Project selected · Editors ready</span>
					) : (
						<span className="font-medium text-slate-400">Select a project to enable editors</span>
					)}
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{editors.map((editor) => (
					<EditorCard
						key={editor.id}
						editor={editor}
						disabled={!projectSelected}
						onLaunch={onLaunch}
					/>
				))}
			</div>
		</section>
	);
};

export type { EditorSectionProps };
export default EditorSection;

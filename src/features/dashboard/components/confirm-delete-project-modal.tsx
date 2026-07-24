import { useEffect, useRef } from 'react';

interface ConfirmDeleteProjectModalProps {
	open: boolean;
	projectName?: string;
	onConfirm: () => void | Promise<void>;
	onCancel: () => void;
	isDeleting?: boolean;
	errorMessage?: string;
}

const ConfirmDeleteProjectModal = ({
	open,
	projectName,
	onConfirm,
	onCancel,
	isDeleting = false,
	errorMessage,
}: ConfirmDeleteProjectModalProps) => {
	const cancelButtonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		if (open) {
			requestAnimationFrame(() => cancelButtonRef.current?.focus());
		}
	}, [open]);

	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="confirm-delete-project-title"
		>
			<div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
				<h2
					id="confirm-delete-project-title"
					className="text-lg font-semibold text-slate-900"
				>
					Delete project
				</h2>
				<p className="mt-2 text-sm text-slate-600">
					Are you sure you want to permanently delete
					{' '}
					<span className="font-semibold text-slate-900">{projectName ?? 'this project'}</span>
					? This action cannot be undone.
				</p>
				{errorMessage ? (
					<p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
						{errorMessage}
					</p>
				) : null}
				<div className="mt-6 flex justify-end gap-3">
					<button
						type="button"
						ref={cancelButtonRef}
						onClick={onCancel}
						disabled={isDeleting}
						className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70 hover:border-slate-400 hover:text-slate-700"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => onConfirm()}
						disabled={isDeleting}
						className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-red-300 hover:bg-red-500"
					>
						{isDeleting ? 'Deleting…' : 'Delete'}
					</button>
				</div>
			</div>
		</div>
	);
};

export type { ConfirmDeleteProjectModalProps };
export default ConfirmDeleteProjectModal;

/**
 * CreateProjectModal provides the new project form shell with validation messaging.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

interface CreateProjectModalProps {
	open: boolean;
	onCreate?: (name: string) => void | Promise<void>;
	onCancel?: () => void;
	isSubmitting?: boolean;
	submitError?: string;
}

const MAX_NAME_LENGTH = 40;

const CreateProjectModal = ({
	open,
	onCreate,
	onCancel,
	isSubmitting = false,
	submitError,
}: CreateProjectModalProps) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [name, setName] = useState('');
	const [touched, setTouched] = useState(false);

	useEffect(() => {
		if (open) {
			setName('');
			setTouched(false);
			requestAnimationFrame(() => {
				inputRef.current?.focus();
			});
		}
	}, [open]);

	const error = useMemo(() => {
		if (!touched && !name) {
			return '';
		}

		const trimmed = name.trim();
		if (!trimmed) {
			return 'Project name cannot be empty or whitespace.';
		}

		if (trimmed.length > MAX_NAME_LENGTH) {
			return `Project name must be ${MAX_NAME_LENGTH} characters or fewer.`;
		}

		if (/[\s]/.test(trimmed)) {
			return 'Project name cannot contain spaces.';
		}

		return '';
	}, [name, touched]);

	const handleCancel = () => {
		onCancel?.();
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setTouched(true);

		if (error) {
			return;
		}

		const trimmed = name.trim();
		if (!trimmed) {
			return;
		}

		onCreate?.(trimmed);
	};

	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-project-title"
		>
			<div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
				<div className="mb-4">
					<h2 id="create-project-title" className="text-lg font-semibold text-slate-900">
						Create Project
					</h2>
					<p className="text-sm text-slate-500">
						Name your project without spaces; you can adjust other details later.
					</p>
				</div>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
						<span>Project name</span>
						<input
							ref={inputRef}
							type="text"
							value={name}
							onChange={(event) => setName(event.target.value)}
							onBlur={() => setTouched(true)}
							placeholder="e.g. neo-controller"
							maxLength={MAX_NAME_LENGTH + 5}
							className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-300"
							autoComplete="off"
							spellCheck={false}
						/>
					</label>
					{error ? <p className="text-sm text-red-500">{error}</p> : null}
					{!error && submitError ? (
						<p className="text-sm text-red-500">{submitError}</p>
					) : null}
					<div className="flex justify-end gap-3">
						<button
							type="button"
							onClick={handleCancel}
							disabled={isSubmitting}
							className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70 hover:border-slate-400 hover:text-slate-700"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || Boolean(error) || !name.trim()}
							className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-sky-300 hover:bg-sky-500"
						>
							{isSubmitting ? 'Creating…' : 'Create'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export type { CreateProjectModalProps };
export default CreateProjectModal;

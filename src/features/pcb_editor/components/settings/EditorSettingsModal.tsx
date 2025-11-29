import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";

import { PAPER_SIZE_OPTIONS } from "@/features/pcb_editor/constants";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import type { Paper } from "pkg/trackway_parser_wasm";
type SettingsCategory = "sheet";

const SETTINGS_CATEGORIES: Array<{ id: SettingsCategory; label: string; description: string }> = [
	{
		id: "sheet",
		label: "Sheet layer",
		description: "Title block metadata and paper size",
	},
];

type EditorSettingsModalProps = {
	open: boolean;
	onClose: () => void;
};

export function EditorSettingsModal({ open, onClose }: EditorSettingsModalProps) {
	const [activeCategory, setActiveCategory] = useState<SettingsCategory>("sheet");

	useEffect(() => {
		if (open) {
			setActiveCategory("sheet");
		}
	}, [open]);

	if (!open) {
		return null;
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur"
			role="dialog"
			aria-modal="true"
			aria-labelledby="pcb-settings-title"
			onClick={onClose}
		>
			<div
				className="flex h-[80vh] w-[min(92vw,1040px)] overflow-hidden rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl"
				onClick={(event) => event.stopPropagation()}
			>
				<aside className="flex w-64 flex-col border-r border-white/10 bg-slate-950/85">
					<header className="px-6 pb-4 pt-6">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">Settings</p>
						<h2 id="pcb-settings-title" className="mt-2 text-lg font-semibold text-white">
							PCB layout
						</h2>
					</header>
					<nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-6">
						{SETTINGS_CATEGORIES.map((category) => {
							const isActive = category.id === activeCategory;
							return (
								<button
									key={category.id}
									type="button"
									className={
										"flex w-full flex-col rounded-xl px-4 py-3 text-left transition " +
										(isActive
											? "bg-emerald-500/10 text-white"
											: "text-white/70 hover:bg-white/5 hover:text-white")
									}
									onClick={() => setActiveCategory(category.id)}
								>
									<span className="text-sm font-semibold">{category.label}</span>
									<span className="text-xs text-white/50">{category.description}</span>
								</button>
							);
						})}
					</nav>
				</aside>
				<section className="flex flex-1 flex-col">
					<div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Category</p>
							<p className="text-lg font-semibold text-white">
								{SETTINGS_CATEGORIES.find((category) => category.id === activeCategory)?.label}
							</p>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:text-white"
							aria-label="Close settings"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
					<div className="flex-1 overflow-hidden">
						{activeCategory === "sheet" ? <SheetLayerSettingsPanel onClose={onClose} /> : null}
					</div>
				</section>
			</div>
		</div>
	);
}

type SheetLayerSettingsPanelProps = {
	onClose: () => void;
};

type SheetLayerFormState = {
	paperSize: string;
	portrait: boolean;
};

const FALLBACK_PAGE: Paper = { size: "A4", portrait: false };

function createInitialSheetState(page: Paper | null): SheetLayerFormState {
	const activePage = page ?? FALLBACK_PAGE;

	const resolvedSize = typeof activePage.size === "string" ? activePage.size.toLowerCase() : "a4";

	return {
		paperSize: resolvedSize,
		portrait: Boolean(activePage.portrait),
	};
}

function SheetLayerSettingsPanel({ onClose }: SheetLayerSettingsPanelProps) {
	const { page, updatePcb, pcb } = usePcb();
	const [formState, setFormState] = useState<SheetLayerFormState>(() => createInitialSheetState(page));

	useEffect(() => {
		setFormState(createInitialSheetState(page));
	}, [page, pcb.page?.size, pcb.page?.portrait]);

	const handlePaperSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setFormState((state) => ({
			...state,
			paperSize: event.target.value,
		}));
	};

	const handleOrientationToggle = (portrait: boolean) => {
		setFormState((state) => ({
			...state,
			portrait,
		}));
	};

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		updatePcb((current) => {
			const nextPage: Paper = {
				...(current.page ?? {}),
				size: formState.paperSize.toUpperCase(),
				portrait: formState.portrait,
			};

			return {
				...current,
				page: nextPage,
			};
		});
		onClose();
	};

	const orientationButtons = useMemo(
		() => [
			{ id: "landscape", label: "Landscape", value: false },
			{ id: "portrait", label: "Portrait", value: true },
		],
		[],
	);

	return (
		<form className="flex h-full flex-col" onSubmit={handleSubmit}>
			<div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
				<section>
					<div className="mb-4">
						<p className="text-sm font-semibold text-white">Paper</p>
						<p className="text-xs text-white/60">Select a preset size and orientation for the virtual sheet.</p>
					</div>
					<div className="grid gap-4 md:grid-cols-2">
						<label className="flex flex-col gap-2 text-sm">
							<span className="text-white/80">Preset size</span>
							<select
								value={formState.paperSize}
								onChange={handlePaperSizeChange}
								className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 outline-none transition focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-400/30"
							>
								{PAPER_SIZE_OPTIONS.map((option) => (
									<option key={option.id} value={option.id} className="bg-slate-900 text-white">
										{option.label}
									</option>
								))}
							</select>
						</label>
						<div className="flex flex-col gap-2 text-sm">
							<span className="text-white/80">Orientation</span>
							<div className="flex overflow-hidden rounded-xl border border-white/10">
								{orientationButtons.map((orientation) => {
									const isActive = formState.portrait === orientation.value;
									return (
										<button
											key={orientation.id}
											type="button"
											onClick={() => handleOrientationToggle(orientation.value)}
											className={
												"flex-1 px-3 py-2 text-sm font-medium transition " +
												(isActive
													? "bg-emerald-400/15 text-white"
													: "text-white/60 hover:bg-white/5 hover:text-white")
											}
										>
											<span className="flex items-center justify-center gap-2">
												{isActive ? <Check className="h-3.5 w-3.5" /> : null}
												{orientation.label}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</section>
			</div>
			<div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
				<button
					type="button"
					onClick={onClose}
					className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
				>
					Cancel
				</button>
				<button
					type="submit"
					className="rounded-full bg-emerald-400/80 px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300"
				>
					Save changes
				</button>
			</div>
		</form>
	);
}

export default EditorSettingsModal;

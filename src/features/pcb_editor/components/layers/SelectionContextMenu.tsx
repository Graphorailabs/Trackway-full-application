import { useSelection } from "@/features/pcb_editor/contexts/SelectionContext";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";

export function SelectionContextMenu() {
	const { contextMenuPos, selectedUuid, deleteSelected, openContextMenu } = useSelection();
	const { updateFootprint, pcb, flipFootprint } = usePcb();
	if (!contextMenuPos || !selectedUuid) return null;

	const isFootprintSelected = !!(pcb.footprints ?? []).find((f) => f.uuid === selectedUuid);

	const rotateSelectedFootprint = (degreesDelta: number) => {
		if (!isFootprintSelected) return;
		const radiansDelta = (degreesDelta * Math.PI) / 180;
		updateFootprint(selectedUuid, (fp) => {
			const at = fp.at ?? { x: 0, y: 0, angle: 0 } as { x?: number; y?: number; angle?: number };
			const current = at.angle ?? 0;
			// normalize into [0, 2PI)
			const twoPi = Math.PI * 2;
			const next = ((current + radiansDelta) % twoPi + twoPi) % twoPi;
			return { ...fp, at: { ...(fp.at ?? {}), angle: next } } as any;
		});
		openContextMenu(null);
	};

	const flipSelectedFootprint = () => {
		if (!isFootprintSelected) return;
		try {
			try {
				console.debug('[ui] flipSelectedFootprint clicked', { selectedUuid });
			} catch (e) {}
			flipFootprint(selectedUuid);
		} catch (err) {
			console.error('[ui] flipSelectedFootprint error', err);
		}
		openContextMenu(null);
	};
	return (
		<div
			style={{
				position: "absolute",
				left: contextMenuPos.x,
				top: contextMenuPos.y,
				zIndex: 300,
			}}
			className="rounded bg-slate-800/95 border border-white/10 p-1 text-white"
		>
				{isFootprintSelected ? (
					<>
						<button
							onClick={() => rotateSelectedFootprint(-90)}
							className="block w-full px-3 py-1 text-left text-sm hover:bg-slate-700/40"
						>
							Rotate Left
						</button>
						<button
							onClick={() => rotateSelectedFootprint(90)}
							className="block w-full px-3 py-1 text-left text-sm hover:bg-slate-700/40"
						>
							Rotate Right
						</button>
						<button
							onClick={() => flipSelectedFootprint()}
							className="block w-full px-3 py-1 text-left text-sm hover:bg-slate-700/40"
						>
							Flip Footprint
						</button>
					</>
				) : null}

				<button
					onClick={() => {
						deleteSelected();
						openContextMenu(null);
					}}
					className="block w-full px-3 py-1 text-left text-sm hover:bg-rose-600/40"
				>
					Delete
					</button>
				<button
					onClick={() => openContextMenu(null)}
					className="block w-full px-3 py-1 text-left text-sm hover:bg-slate-700/40"
				>
					Cancel
					</button>
		</div>
	);
}

export default SelectionContextMenu;

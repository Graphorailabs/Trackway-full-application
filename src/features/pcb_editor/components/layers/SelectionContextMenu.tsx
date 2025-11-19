import React from "react";
import { useSelection } from "@/features/pcb_editor/contexts/SelectionContext";

export function SelectionContextMenu() {
	const { contextMenuPos, selectedUuid, deleteSelected, openContextMenu } = useSelection();
	if (!contextMenuPos || !selectedUuid) return null;
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

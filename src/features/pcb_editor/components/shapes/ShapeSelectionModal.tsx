import { Circle, Square, Minus, Share2, Type } from "lucide-react";
import { useToolContext, type Tool } from "@/features/pcb_editor/contexts/ToolContext";

type ShapeSelectionModalProps = {
	open: boolean;
	onClose: () => void;
};

const tools: { name: Tool; icon: React.ReactNode }[] = [
	{ name: "rect", icon: <Square size={24} /> },
	{ name: "circle", icon: <Circle size={24} /> },
	{ name: "arc", icon: <Circle size={20} /> },
	{ name: "line", icon: <Minus size={24} /> },
	{ name: "polygon", icon: <Share2 size={24} /> },
	{ name: "text", icon: <Type size={24} /> },
];

export function ShapeSelectionModal({ open, onClose }: ShapeSelectionModalProps) {
	const { setTool, strokeWidth, setStrokeWidth } = useToolContext();

	if (!open) {
		return null;
	}

	const handleSelectTool = (tool: Tool) => {
		setTool(tool);
		onClose();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
		>
			<div
				className="grid grid-cols-3 gap-4 rounded-lg border border-slate-700 bg-slate-800 p-6 shadow-lg"
				onClick={(e) => e.stopPropagation()}
			>
				{tools.map((tool) => (
					<button
						key={tool.name}
						onClick={() => handleSelectTool(tool.name)}
						className="flex flex-col items-center gap-2 rounded-md bg-slate-700 p-4 text-white transition-colors hover:bg-slate-600"
					>
						{tool.icon}
						<span className="text-sm capitalize">{tool.name}</span>
					</button>
				))}

				<div className="col-span-3 mt-2 flex items-center gap-4">
					<label className="flex items-center gap-2 text-sm text-slate-200">
						<span className="text-xs">Thickness</span>
						<input
							type="range"
							min={0.1}
							max={5}
							step={0.1}
							value={strokeWidth}
							onChange={(e) => setStrokeWidth(Number(e.target.value))}
							className="w-36"
						/>
						<span className="text-xs">{strokeWidth.toFixed(1)}</span>
					</label>
				</div>
			</div>
		</div>
	);
}

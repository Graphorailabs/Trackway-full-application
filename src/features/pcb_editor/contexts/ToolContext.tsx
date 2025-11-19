import { createContext, useContext, useState } from "react";
import type { PcbGraphicItem, TextEffects } from "trackway-parser-wasm";

export type Tool = PcbGraphicItem["kind"] | "select";

type ToolContextState = {
	tool: Tool;
	setTool: (tool: Tool) => void;
	strokeColor: string;
	setStrokeColor: (c: string) => void;
	strokeWidth: number;
	setStrokeWidth: (w: number) => void;
	textEffects: TextEffects;
	setTextEffects: (e: TextEffects) => void;
};

const ToolContext = createContext<ToolContextState | null>(null);

export function useToolContext() {
	const context = useContext(ToolContext);
	if (!context) {
		throw new Error("useToolContext must be used within a ToolProvider");
	}
	return context;
}

export function ToolProvider({ children }: { children: React.ReactNode }) {
	const [tool, setTool] = useState<Tool>("select");
	const [strokeColor, setStrokeColor] = useState<string>("#ff0000");
	const [strokeWidth, setStrokeWidth] = useState<number>(0.5);
	const [textEffects, setTextEffects] = useState<TextEffects>({
		font: { size: [16, 0.0], bold: false, italic: false },
	});

	return (
		<ToolContext.Provider
			value={{
				tool,
				setTool,
				strokeColor,
				setStrokeColor,
				strokeWidth,
				setStrokeWidth,
				textEffects,
				setTextEffects,
			}}
		>
			{children}
		</ToolContext.Provider>
	);
}

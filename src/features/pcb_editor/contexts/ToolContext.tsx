import { createContext, useContext, useState } from "react";
import type { PcbGraphicItem, TextEffects } from "trackway-parser-wasm";

/* eslint-disable react-refresh/only-export-components -- context exports hooks/helpers */
export type Tool = PcbGraphicItem["kind"] | "select" | "route" | "via";

type ToolContextState = {
	tool: Tool;
	setTool: (tool: Tool) => void;
	strokeColor: string;
	setStrokeColor: (c: string) => void;
	strokeWidth: number;
	setStrokeWidth: (w: number) => void;
	textEffects: TextEffects;
	setTextEffects: (e: TextEffects) => void;
	// Via placement defaults
	viaSize: number;
	setViaSize: (s: number) => void;
	viaDrill: number;
	setViaDrill: (d: number) => void;
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
	// Default stroke color: light pinkish-red for better visibility on canvas
	const [strokeColor, setStrokeColor] = useState<string>("#ffd6d6");
	const [strokeWidth, setStrokeWidth] = useState<number>(0.5);
	const [textEffects, setTextEffects] = useState<TextEffects>({
		font: { size: [16, 0.0], bold: false, italic: false },
	});

	const [viaSize, setViaSize] = useState<number>(0.8);
	const [viaDrill, setViaDrill] = useState<number>(0.4);

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
				viaSize,
				setViaSize,
				viaDrill,
				setViaDrill,
			}}
		>
			{children}
		</ToolContext.Provider>
	);
}

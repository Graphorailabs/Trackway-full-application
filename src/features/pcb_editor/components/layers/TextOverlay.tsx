import React from "react";
import type { Xy, TextEffects } from "trackway-parser-wasm";

type Props = {
	showTextInput: boolean;
	textPos: Xy | null;
	inputScreenPos: { x: number; y: number };
	textInput: string;
	setTextInput: (s: string) => void;
	handleTextInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	overlayEffects: TextEffects | undefined;
	// Prefer React state setter typing for overlay effects
	setOverlayEffects: React.Dispatch<React.SetStateAction<TextEffects | undefined>>;
	overlayColor: string;
	setOverlayColor: (c: string) => void;
};

export function TextOverlay({
	showTextInput,
	textPos,
	inputScreenPos,
	textInput,
	setTextInput,
	handleTextInputKeyDown,
	overlayEffects,
	setOverlayEffects,
	overlayColor,
	setOverlayColor,
}: Props) {
	if (!showTextInput || !textPos) return null;
	return (
		<>
			<input
				type="text"
				autoFocus
				value={textInput}
				onChange={(e) => setTextInput(e.target.value)}
				onKeyDown={handleTextInputKeyDown}
				style={{
					position: "absolute",
					left: inputScreenPos.x,
					top: inputScreenPos.y,
					zIndex: 100,
					fontSize: `${overlayEffects?.font?.size?.[0] ?? 16}px`,
					padding: "2px 6px",
					background: "transparent",
					border: "none",
					color: "transparent",
					caretColor: overlayColor,
					outline: "none",
				}}
				placeholder="Enter text..."
			/>

			{/* small effects palette under the input */}
			<div
				style={{ position: "absolute", left: inputScreenPos.x, top: inputScreenPos.y + 28, zIndex: 101 }}
				className="flex items-center gap-2 rounded bg-slate-700 p-2 text-white"
			>
				<label className="text-xs">Size</label>
				<input
					type="number"
					min={6}
					max={72}
					value={overlayEffects?.font?.size?.[0] ?? 16}
					onChange={(e) => {
						const v = Number(e.target.value) || 16;
						setOverlayEffects((prev) => {
							const prevFont = (prev?.font as unknown as { size?: number[] }) ?? { size: [16, 0] };
							return ({ ...(prev ?? {}), font: { ...prevFont, size: [v, prevFont.size?.[1] ?? 0] } } as TextEffects);
						});
					}}
					className="w-16 text-sm"
				/>

				<label className="flex items-center gap-1 text-xs">
					<input
						type="checkbox"
						checked={!!overlayEffects?.font?.bold}
						onChange={(e) => setOverlayEffects((prev) => {
							const prevFont = (prev?.font as unknown as { size?: number[]; bold?: boolean }) ?? { size: [16, 0] };
							return ({ ...(prev ?? {}), font: { ...prevFont, bold: e.target.checked } } as TextEffects);
						})}
					/>
					<span>Bold</span>
				</label>

				<label className="flex items-center gap-1 text-xs">
					<input
						type="checkbox"
						checked={!!overlayEffects?.font?.italic}
						onChange={(e) => setOverlayEffects((prev) => {
							const prevFont = (prev?.font as unknown as { size?: number[]; italic?: boolean }) ?? { size: [16, 0] };
							return ({ ...(prev ?? {}), font: { ...prevFont, italic: e.target.checked } } as TextEffects);
						})}
					/>
					<span>Italic</span>
				</label>

				<label className="flex items-center gap-2 text-sm text-slate-200">
					<span className="text-xs">Color</span>
					<input
						type="color"
						value={overlayColor}
						onChange={(e) => setOverlayColor(e.target.value)}
						className="w-8 h-8 rounded"
					/>
				</label>
			</div>
		</>
	);
}

export default TextOverlay;

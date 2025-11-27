/**
 * TextKonvaPreview
 *
 * Renders a Konva `Text` node that mirrors the DOM text input while the
 * user is editing text in the editor. Keeping this in a small component
 * isolates text-preview concerns from the main canvas assembly.
 */
import { Layer, Text } from 'react-konva';
import type { Xy } from 'trackway-parser-wasm';

type FontEffects = {
    font?: { size?: [number]; bold?: boolean; italic?: boolean };
};

type Props = {
    showTextInput: boolean;
    textPos: Xy | null | undefined;
    textInput: string | undefined;
    overlayEffects: FontEffects | undefined;
    overlayColor: string | undefined;
    defaultTextEffects: FontEffects | undefined;
};

/**
 * TextKonvaPreview props:
 * - `showTextInput`: whether the DOM input is visible and we should render a Konva preview
 * - `textPos`: world coordinate for the preview text
 * - `textInput`: current input string
 * - `overlayEffects`, `defaultTextEffects`: font-related effects used to match style
 */
export default function TextKonvaPreview({
    showTextInput,
    textPos,
    textInput,
    overlayEffects,
    overlayColor,
    defaultTextEffects,
}: Props) {
    if (!showTextInput || !textPos) return null;
    return (
        <Layer>
            <Text
                x={textPos[0]}
                y={textPos[1]}
                text={textInput || ''}
                fontSize={(overlayEffects?.font?.size?.[0]) ?? (defaultTextEffects?.font?.size?.[0]) ?? 16}
                fontStyle={`${(overlayEffects?.font?.bold ?? defaultTextEffects?.font?.bold) ? 'bold' : 'normal'} ${(overlayEffects?.font?.italic ?? defaultTextEffects?.font?.italic) ? 'italic' : 'normal'}`}
                fill={overlayColor}
                listening={false}
            />
        </Layer>
    );
}

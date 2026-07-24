/**
 * PreviewLayer
 *
 * Renders transient preview visuals used during drawing and routing
 * (polygons, arcs, circles, line previews and the floating dimensions
 * label). This component accepts all preview-related props and keeps
 * rendering-local helpers (e.g. `computeArcPreviewProps`) nearby so the
 * main `ShapesCanvas` can remain focused on wiring event handlers.
 */
import { Arc, Layer, Text } from 'react-konva';
import { renderPreviewShape } from './ShapesRenderer';
import { computeArcPreviewProps } from './ShapesCanvasService';
import type { Xy } from 'trackway-parser-wasm';
import type { Tool } from '@/features/pcb_editor/contexts/ToolContext';

type Props = {
    isDrawing: boolean;
    tool: Tool;
    polygonPoints: Array<Xy> | null | undefined;
    startPoint: Xy | null | undefined;
    currentPoint: Xy | null | undefined;
    arcPhase: string | null | undefined;
    arcStartPoint: Xy | null | undefined;
    arcRadius: number | null | undefined;
    toolStrokeWidth: number;
    DEFAULT_STROKE: string;
    DEFAULT_WIDTH: number;
    zoom: number;
    measurement: any;
};

export default function PreviewLayer({
    isDrawing,
    tool,
    polygonPoints,
    startPoint,
    currentPoint,
    arcPhase,
    arcStartPoint,
    arcRadius,
    toolStrokeWidth,
    DEFAULT_STROKE,
    DEFAULT_WIDTH,
    zoom,
    measurement,
}: Props) {
    if (!isDrawing || !currentPoint) return null;

    return (
        <Layer>
            {(tool === 'polygon' && polygonPoints && polygonPoints.length > 0)
                ? renderPreviewShape(
                    tool,
                    polygonPoints[0],
                    currentPoint,
                    polygonPoints,
                    [],
                    DEFAULT_STROKE,
                    toolStrokeWidth,
                )
                : (tool === 'arc' && isDrawing)
                    ? (
                        arcPhase === 'circle' && startPoint
                            ? renderPreviewShape('circle' as any, startPoint, currentPoint, [], [], DEFAULT_STROKE, toolStrokeWidth ?? DEFAULT_WIDTH)
                        : (arcPhase === 'sweep' && arcStartPoint && arcRadius && startPoint)
                            ? (() => {
                                const props = computeArcPreviewProps(startPoint as Xy, arcStartPoint as Xy, currentPoint as Xy, arcRadius as number, toolStrokeWidth, DEFAULT_STROKE);
                                return <Arc {...props} />;
                            })()
                            : null
                    )
                : (startPoint && currentPoint)
                    ? renderPreviewShape(tool, startPoint, currentPoint, [], [], DEFAULT_STROKE, DEFAULT_WIDTH)
                    : null}

            {(startPoint && currentPoint)
                ? (() => {
                    let label = '';
                    if (tool === 'arc') {
                        if (arcPhase === 'circle') {
                            const dx = startPoint[0] - currentPoint[0];
                            const dy = startPoint[1] - currentPoint[1];
                            const mm = Math.sqrt(dx * dx + dy * dy);
                            label = `R: ${measurement.formatLength(mm)}`;
                        } else if (arcPhase === 'sweep') {
                            if (typeof arcRadius === 'number') {
                                label = `R: ${measurement.formatLength(arcRadius)}`;
                            } else if (arcStartPoint) {
                                const dx = startPoint[0] - arcStartPoint[0];
                                const dy = startPoint[1] - arcStartPoint[1];
                                const mm = Math.sqrt(dx * dx + dy * dy);
                                label = `R: ${measurement.formatLength(mm)}`;
                            }
                        }
                    } else {
                        const dx = Math.abs(startPoint[0] - currentPoint[0]);
                        const dy = Math.abs(startPoint[1] - currentPoint[1]);
                        switch (tool) {
                            case 'rect':
                                label = `W: ${measurement.formatLength(dx)} H: ${measurement.formatLength(dy)}`;
                                break;
                            case 'circle': {
                                const r = Math.sqrt(dx * dx + dy * dy);
                                label = `R: ${measurement.formatLength(r)}`;
                                break;
                            }
                            case 'line': {
                                const len = Math.sqrt(dx * dx + dy * dy);
                                label = `L: ${measurement.formatLength(len)}`;
                                break;
                            }
                            default:
                                label = '';
                        }
                    }
                    return label ? (
                        <Text
                            x={currentPoint[0]}
                            y={currentPoint[1]}
                            offsetX={-10}
                            offsetY={-10}
                            text={label}
                            fontSize={12 / zoom}
                            fill="white"
                        />
                    ) : null;
                })()
                : null}
        </Layer>
    );
}

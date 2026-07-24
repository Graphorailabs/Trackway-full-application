/**
 * ShapesCanvas
 *
 * Central assembly component for PCB shape rendering and interaction.
 *
 * Overview
 * - This module owns the top-level canvas area used by PCB editing tools.
 * - It assembles small, focused subcomponents (e.g. `CanvasStage`,
 *   `SelectionHighlight`, `SelectionContextMenu`, `TextOverlay`) and uses
 *   pure helper functions in `ShapesCanvasService` to keep logic testable
 *   and maintainable.
 *
 * Responsibilities
 * - Wire viewport transforms (provided by `useCameraViewport`) into the
 *   Konva `Stage` transform so stage coordinates map to PCB world coords.
 * - Convert pointer events into the drawing lifecycle exposed by
 *   `useShapeContext()` (startDrawing, updateDrawing, finishDrawing,
 *   advanceArcToSweep, addPolygonPoint, resetDrawing).
 * - Render persisted graphics (via `ShapesRenderer.renderShape`) and
 *   drawing previews (`renderPreviewShape`) that exactly match persisted
 *   render rules (important for arcs, text overlays and stroke widths).
 * - Handle selection interactions (select, drag/move, context menu) using
 *   `useSelection()` rather than packing selection into `ToolContext`.
 *
 * Key integration points
 * - Providers required: `useCameraViewport`, `useShapeContext`,
 *   `useToolContext`, `usePcb`, `useLayers`, `useSelection`.
 * - Persisted shape types are canonicalized against
 *   `pkg/trackway_parser_wasm.d.ts` (e.g. `GraphicArc` is persisted as
 *   `{ start, mid, end, layer, width, uuid }`). Renderer computes angles
 *   at render-time from this canonical representation.
 *
 * Extending the canvas
 * - Add a new tool: implement drawing lifecycle in `ShapeContext`, add
 *   render support in `ShapesRenderer.tsx`, and add any preview helpers
 *   here in `ShapesCanvas` (prefer small helper functions in
 *   `ShapesCanvasService.ts`).
 * - Keep interaction handlers small: move pure logic into
 *   `ShapesCanvasService` and keep `ShapesCanvas` focused on assembling
 *   subcomponents and passing handlers/props.
 */
// Konva elements are rendered inside extracted subcomponents
import type { KonvaEventObject } from "konva/lib/Node";
import { useCameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";
import { useMeasurementSafe } from "@/features/pcb_editor/contexts/MeasurementContext";
import { useShapeContext } from "../../contexts/ShapeContext";
import { useToolContext } from "../../contexts/ToolContext";
import { usePcb } from "../../contexts/PcbContext";
import { useLayers } from "../../contexts/LayerContext";
// footprint preview hook not needed here now
import { useState, useRef, useEffect } from "react";
import { useMouseHandlers } from "./hooks/useMouseHandlers";
// pad/via, routing and collision services moved to dedicated modules used by hooks
import { useSelection } from "@/features/pcb_editor/contexts/SelectionContext";
import type { Pt } from "../layers/routing/octilinearRouter";
import { useRouting } from "../../contexts/RoutingContext";
import { usePadHover } from "@/features/pcb_editor/contexts/PadHoverContext";
import { useViaHover } from "@/features/pcb_editor/contexts/ViaHoverContext";
// helper utilities moved into PreviewLayer
import GraphicsLayer from './GraphicsLayer';
import PreviewLayer from './PreviewLayer';
import TextKonvaPreview from './TextKonvaPreview';
import SelectionContextMenu from "./SelectionContextMenu";
import TextOverlay from "./TextOverlay";
import CanvasStage from "./CanvasStage";
import GridDebugOverlay from "../canvas/GridDebugOverlay";
// Footprint rendering moved to a dedicated canvas `FootprintCanvas`.
import { computeInputScreenPos } from "./ShapesCanvasService";
import useShapesCanvasLogic from "./hooks/useShapesCanvasLogic";
export default function ShapesCanvas() {

    const DEFAULT_STROKE = "#d32f2f";
	const DEFAULT_WIDTH = 0.25;
	const { camera, zoom, viewportCenter, screenToWorld } = useCameraViewport();
	const measurement = useMeasurementSafe();
	const {
		isDrawing,
		startPoint,
		currentPoint,
		polygonPoints,
		arcPhase,
		arcStartPoint,
		arcRadius,
	} = useShapeContext();
    const { pcb, addVia, addTrack, removeVia, updateViaPosition } = usePcb();
    const { tool, textEffects: defaultTextEffects, strokeWidth: toolStrokeWidth, viaSize } = useToolContext();
    const { visibility, selectedLayerId } = useLayers();
	const {
		containerRef,
		size,
		showTextInput,
		textPos,
		textInput,
		setTextInput,
		handleTextInputKeyDown,
		overlayEffects,
		setOverlayEffects,
		overlayColor,
		setOverlayColor,
		handleMouseDown: originalHandleMouseDown,
		handleMouseMove: originalHandleMouseMove,
		handleMouseUp: originalHandleMouseUp,
	} = useShapesCanvasLogic();

    // Selection helper (safe fallback if provider missing)
    const { select } = (() => {
        try {
            return useSelection();
        } catch (e) {
            return { select: (_: string | null) => {} } as const;
        }
    })();

    // Track via dragging state when user drags a via from the top canvas

    // Pad hover hook (safe fallback if provider missing)
    const padHoverApi = (() => {
        try {
            return usePadHover();
        } catch (e) {
            return { hovered: null as any, setHovered: (_: any) => {} } as const;
        }
    })();

    // Via hover hook (safe fallback if provider missing)
    const viaHoverApi = (() => {
        try {
            return useViaHover();
        } catch (e) {
            return { hovered: null as any, setHovered: (_: any) => {} } as const;
        }
    })();

    

    const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
        // delegate to centralized handlers
        try { mouseHandlers.handleMouseDown(e); } catch (err) { /* fallback noop */ }
    };

    const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
        try { mouseHandlers.handleMouseMove(e); } catch (err) { /* fallback noop */ }
    };

    const handleMouseUp = (_e: KonvaEventObject<MouseEvent>) => {
        try { mouseHandlers.handleMouseUp(_e); } catch (err) { /* fallback noop */ }
    };

    // Right-click handler on the canvas stage: when routing, place a via
    // at the click location and connect the current routing start to it.
    const handleCanvasContextMenu = (e: KonvaEventObject<MouseEvent>) => {
        try { mouseHandlers.handleCanvasContextMenu(e); } catch (err) { /* fallback noop */ }
    };

    // Routing state
    const [routingStart, setRoutingStart] = useState<Pt | null>(null);
    const [routingActive, setRoutingActive] = useState(false);
    const { previewTracks, setPreviewTracks, previewIncompatibleWithPad, setPreviewIncompatibleWithPad, currentTraceLayer, setCurrentTraceLayer, resetCurrentTraceLayer } = useRouting();
    const workerRef = useRef<Worker | null>(null);
    const routingActiveRef = useRef<boolean>(false);
    const workerRequestIdRef = useRef<number>(0);
    const routingOriginRef = useRef<Pt | null>(null);
    // Segments placed during the current continuous routing session.
    // Stored in a ref so we can include them in obstacle lists immediately
    // without waiting for `pcb` state to update.
    const placedSegmentsRef = useRef<Array<{ uuid?: string; start: Pt; end: Pt; width: number; layer?: string }>>([]);

    // Keep the routing session anchor consistent with PCB snapshot changes
    // (undo/redo). When the PCB rolls back, drop any locally recorded
    // segments that no longer exist and re-anchor `routingStart` to the last
    // remaining segment endpoint (or to the original session start).
    useEffect(() => {
        if (tool !== 'route') return;
        if (!routingActiveRef.current) return;

        const existingUuids = new Set<string>();
        for (const t of (pcb?.tracks || [])) {
            const data = (t as any)?.data;
            const uuid = data?.uuid;
            if (typeof uuid === 'string' && uuid.length) existingUuids.add(uuid);
        }

        const before = placedSegmentsRef.current || [];
        const after = before.filter(s => !s.uuid || existingUuids.has(s.uuid));
        if (after.length !== before.length) placedSegmentsRef.current = after;

        const lastEnd = after.length ? after[after.length - 1].end : null;
        const nextStart = lastEnd ?? routingOriginRef.current ?? null;

        if (nextStart) {
            if (!routingStart || routingStart.x !== nextStart.x || routingStart.y !== nextStart.y) {
                setRoutingStart({ x: nextStart.x, y: nextStart.y });
            }
        }
    }, [pcb, routingStart, tool]);

    // Instantiate centralized mouse handlers now that routing refs/state are declared
    //
    // Wiring notes:
    // - `ShapesCanvas` is intentionally lightweight: it manages viewport, stage
    //   sizing and renders subcomponents, then delegates pointer and context
    //   interactions to `useMouseHandlers`.
    // - The hook receives: the current `tool`, a `screenToWorld` coordinate
    //   conversion, selection callback, PCB mutation APIs (`addVia`,
    //   `addTrack`, `removeVia`, `updateViaPosition`), routing refs/state
    //   (`routingStart`, `routingActive`, `routingActiveRef`, `workerRef`,
    //   `workerRequestIdRef`, `placedSegmentsRef`) and routing preview state
    //   setters (`setPreviewTracks`, `setCurrentTraceLayer`, `resetCurrentTraceLayer`).
    // - It also receives `padHoverApi`/`viaHoverApi` so hover highlights are
    //   updated from inside the consolidated handlers, plus the original
    //   low-level mouse handlers from `useShapesCanvasLogic` for delegating
    //   non-routing interactions (selection, drag, text editing).
    // - Responsibilities moved into the hook/services: routing worker
    //   lifecycle, obstacle computation, via/pad detection, collision checks
    //   and the routing preview/finalize flow. `ShapesCanvas` only wires
    //   state refs and renders UI layers.
    const mouseHandlers = useMouseHandlers(
        tool,
        screenToWorld,
        select,
        updateViaPosition,
        addVia,
        addTrack,
        removeVia,
        viaSize,
        // routing refs/state
        routingStart,
        setRoutingStart,
        routingActive,
        setRoutingActive,
        routingActiveRef,
        workerRef,
        workerRequestIdRef,
        placedSegmentsRef,
        routingOriginRef,
        setPreviewTracks,
        previewTracks,
        previewIncompatibleWithPad,
        setPreviewIncompatibleWithPad,
        currentTraceLayer ?? undefined,
        setCurrentTraceLayer,
        resetCurrentTraceLayer,
        selectedLayerId,
        pcb,
        padHoverApi,
        viaHoverApi,
        originalHandleMouseDown,
        originalHandleMouseMove,
        originalHandleMouseUp
    );

    // Build worker obstacles excluding segments that end at via centers so
    // vias are not treated as blocking obstacles for continuation routing.
    // When `layer` is provided, only return obstacles on that layer so the
    // worker computes routes against the correct copper layer.
    // Use `buildWorkerObstacles` implementation from services/RoutingService
    // (keeps the same behavior but moves the logic into a testable module).

    useEffect(() => {
        // Initialize worker (module type so `import` inside worker works)
        workerRef.current = new Worker(new URL('./routing/RoutingWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current.onmessage = (e) => {
            if (e.data.type === 'routeResult') {
                // Ignore stale responses that don't match the last request id
                if (typeof e.data.id !== 'number' || e.data.id !== workerRequestIdRef.current) return;
                // Avoid applying worker results after routing was finalized.
                if (!routingActiveRef.current) return;
                if (e.data.result.success && e.data.result.path) {
                    setPreviewTracks(e.data.result.path);
                } else {
                    setPreviewTracks([]);
                }
            }
        };
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    // keep a ref in sync so worker message handler can check latest active state
    useEffect(() => {
        routingActiveRef.current = routingActive;
    }, [routingActive]);

    // Handle Escape to cancel routing
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setRoutingStart(null);
                setPreviewTracks([]);
                setRoutingActive(false);
                routingActiveRef.current = false;
                placedSegmentsRef.current = [];
                routingOriginRef.current = null;
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [setPreviewTracks]);

    // Clear routing preview and stop routing when the active tool changes
    // away from the route tool so preview doesn't persist across tools.
    useEffect(() => {
        if (tool !== "route") {
            setRoutingStart(null);
            setPreviewTracks([]);
            setRoutingActive(false);
            routingActiveRef.current = false;
            placedSegmentsRef.current = [];
            routingOriginRef.current = null;
            try { setPreviewIncompatibleWithPad(false); } catch (e) { /* noop */ }
            try { resetCurrentTraceLayer?.(); } catch (e) { /* noop */ }
        }
    }, [tool, setPreviewTracks, setRoutingStart, setRoutingActive, setPreviewIncompatibleWithPad, resetCurrentTraceLayer]);

    // routing constants moved to `constants/routingConstants.ts`
    // Routing, pad/via and collision helpers moved to dedicated services/hooks.
    // See `services/PadViaService.ts`, `services/CollisionService.ts`,
    // `services/RoutingService.ts` and `hooks/useMouseHandlers.ts` for
    // the relocated implementations.

    // Always allow pointer events on the shapes canvas so drawing tools work.
    // Footprint canvas will only accept pointer events during preview.
    const pointerEvents = "auto";
    const zIndex = 20;

	// pointer down/up/move handled by hook

	// Note: text input keydown handler is provided by the hook (`handleTextInputKeyDown`).

	// Mouse handlers are provided by the hook: `handleMouseDown`, `handleMouseMove`, `handleMouseUp`.

	// Mouse up handled by hook.

	// Keyboard and context menu behavior handled inside the hook.

	const inputScreenPos = textPos
		? computeInputScreenPos(textPos, camera, zoom, viewportCenter)
		: { x: 0, y: 0 };

	return (
        <div className="absolute inset-0" style={{ pointerEvents, zIndex }} ref={containerRef}>
            <GridDebugOverlay />
            <TextOverlay
                showTextInput={showTextInput}
                textPos={textPos}
                inputScreenPos={inputScreenPos}
                textInput={textInput}
                setTextInput={setTextInput}
                handleTextInputKeyDown={handleTextInputKeyDown}
                overlayEffects={overlayEffects}
                setOverlayEffects={setOverlayEffects}
                overlayColor={overlayColor}
                setOverlayColor={setOverlayColor}
            />
            <CanvasStage
                width={size.width}
                height={size.height}
                zoom={zoom}
                viewportCenter={viewportCenter}
                camera={camera}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={handleCanvasContextMenu}
            >
                    <GraphicsLayer pcb={pcb} visibility={visibility} />
                    <PreviewLayer
                        isDrawing={isDrawing}
                        tool={tool as any}
                        polygonPoints={polygonPoints}
                        startPoint={startPoint as any}
                        currentPoint={currentPoint as any}
                        arcPhase={arcPhase as any}
                        arcStartPoint={arcStartPoint as any}
                        arcRadius={arcRadius as any}
                        toolStrokeWidth={toolStrokeWidth}
                        DEFAULT_STROKE={DEFAULT_STROKE}
                        DEFAULT_WIDTH={DEFAULT_WIDTH}
                        zoom={zoom}
                        measurement={measurement}
                    />
                    <TextKonvaPreview
                        showTextInput={showTextInput}
                        textPos={textPos}
                        textInput={textInput}
                        overlayEffects={overlayEffects}
                        overlayColor={overlayColor}
                        defaultTextEffects={defaultTextEffects as any}
                    />
                {/* Footprint rendering moved to `FootprintCanvas` (separate Stage). */}
            </CanvasStage>
            <SelectionContextMenu />
        </div>
    );
}

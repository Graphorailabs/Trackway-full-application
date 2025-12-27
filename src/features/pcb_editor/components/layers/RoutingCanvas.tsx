/**
 * RoutingCanvas
 *
 * Renders PCB tracks (finalized and preview) using Konva.
 *
 * Responsibilities:
 * - Render finalized tracks from the PCB data.
 * - Render preview tracks during routing operations.
 * - Handle different layers and visibility.
 */

import { Layer, Line, Circle, Group } from "react-konva";
import { useSelection } from "@/features/pcb_editor/contexts/SelectionContext";
import { useLayoutEffect, useRef, useState } from "react";
import CanvasStage from "./CanvasStage";
import { useCameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";
import { usePcb } from "../../contexts/PcbContext";
import { useLayers } from "../../contexts/LayerContext";
import { useRouting } from "../../contexts/RoutingContext";
import { useViaHover } from "../../contexts/ViaHoverContext";
import type { TrackSegment } from "trackway-parser-wasm";

export function RoutingCanvas() {
  const pcbApi = usePcb();
  const { pcb } = pcbApi;
  const { visibility } = useLayers();
  const { previewTracks, previewIncompatibleWithPad } = useRouting();
  const { camera, zoom, viewportCenter } = useCameraViewport();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const viaHover = (() => {
    try {
      return useViaHover().hovered;
    } catch (e) {
      return null as any;
    }
  })();
  const { select, openContextMenu } = (() => {
    try {
      return useSelection();
    } catch (e) {
      return { select: (_: string | null) => {}, openContextMenu: (_: { x: number; y: number } | null) => {} } as any;
    }
  })();

  const segs = (pcb.tracks || []).filter((t) => t.kind === "segment").map((t: any) => t.data as TrackSegment);
  const backSegs = segs.filter(s => (s.layer === 'B.Cu') && visibility[s.layer]);
  const frontSegs = segs.filter(s => (s.layer !== 'B.Cu') && visibility[s.layer]);
  const renderLine = (segment: TrackSegment, idx: number) => {
    const layerStroke = segment.layer === 'B.Cu' ? '#4fc3f7' : 'red';
    const nodeId = segment.uuid || `__track:${segment.start[0]}:${segment.start[1]}:${segment.end[0]}:${segment.end[1]}:${segment.width}`;
    return (
      <Line
        id={nodeId}
        key={segment.uuid || `track-${idx}`}
        points={[segment.start[0], segment.start[1], segment.end[0], segment.end[1]]}
        stroke={layerStroke}
        strokeWidth={segment.width}
        strokeScaleEnabled={true}
        onContextMenu={(e) => {
          try {
            e.evt.preventDefault();
            const stage = e.target.getStage ? e.target.getStage() : null;
            if (!stage) return;
            const container = stage.container ? stage.container() : null;
            if (!container) return;
            const rect = container.getBoundingClientRect();
            const x = (e.evt.clientX || 0) - rect.left;
            const y = (e.evt.clientY || 0) - rect.top;
            if (segment.uuid) select(segment.uuid);
            else select(nodeId);
            openContextMenu({ x, y });
          } catch (err) {}
        }}
      />
    );
  };

  const renderBackSegments = () => backSegs.map((s, i) => renderLine(s, i));
  const renderFrontSegments = () => frontSegs.map((s, i) => renderLine(s, i + backSegs.length));

  const renderVias = () => {
    return (pcb.tracks || [])
      .filter((t) => t.kind === "via")
      .map((t: any, idx) => {
        const via = t.data as any;
        const viaLayers: string[] = via.layers ?? [];
        const anyVisible = viaLayers.length === 0 ? true : viaLayers.some((l) => visibility[l]);
        if (!anyVisible) return null;
        const at = via.at ?? [0, 0];
        const size = Number(via.size) || 0.8;
        const radius = size / 2;
        // increase display size for visibility
        // const displayRadius = Math.max(radius * 1.6, 0.8);
        const uuid = via.uuid as string | undefined;
        const isHovered = viaHover && viaHover.uuid === uuid;
        const nodeId = uuid || `via-${idx}`;
        return (
          <Group
            id={nodeId}
            key={uuid || `via-${idx}`}
            x={at[0]}
            y={at[1]}
            draggable={true}
            onDragEnd={(e) => {
              if (!uuid) return;
              const nx = e.target.x();
              const ny = e.target.y();
              try {
                pcbApi.updateViaPosition?.(uuid, { x: nx, y: ny });
              } catch (err) {
                // silent
              }
            }}
            onDblClick={() => {
              if (!uuid) return;
              try {
                pcbApi.removeVia?.(uuid);
              } catch (err) {
                // silent
              }
            }}
            onContextMenu={(e) => {
              try {
                e.evt.preventDefault();
                const stage = e.target.getStage ? e.target.getStage() : null;
                if (!stage) return;
                const container = stage.container ? stage.container() : null;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const x = (e.evt.clientX || 0) - rect.left;
                const y = (e.evt.clientY || 0) - rect.top;
                if (uuid) select(uuid);
                openContextMenu({ x, y });
              } catch (err) {}
            }}
          >
            {/* Outer yellow ring: render at true via radius (mm) */}
            <Circle
              x={0}
              y={0}
              radius={isHovered ? radius * 1.25 : radius}
              fill={"#ffeb3b"}
              stroke={isHovered ? "#f57f17" : "#f9a825"}
              strokeWidth={isHovered ? 0.12 : 0.08}
              strokeScaleEnabled={true}
              listening={false}
            />
            {/* Inner 'hole' painted white (approximate drill/hole) */}
              <Circle
                x={0}
                y={0}
                radius={Math.max(0.12, (Number(via.drill) ? Number(via.drill) / 2 : (size / 4)))}
                fill={"#ffffff"}
                stroke={"#e0e0e0"}
                strokeWidth={0.02}
                strokeScaleEnabled={true}
                listening={false}
              />
          </Group>
        );
      });
  };

  const previewLines = [];
  for (let i = 0; i < previewTracks.length - 1; i++) {
    previewLines.push({
      start: previewTracks[i],
      end: previewTracks[i + 1],
      width: 0.25,
    });
  }

  return (
    <div className="absolute inset-0" ref={containerRef} style={{ pointerEvents: "none" }}>
      <CanvasStage width={size.width} height={size.height} zoom={zoom} viewportCenter={viewportCenter} camera={camera}>
        <Layer>
          {/* If preview is incompatible with a pad, draw it under other geometry
              with a dimmed style so it appears to be 'passing under' the pad. */}
          {previewIncompatibleWithPad ? (
            // draw preview first (beneath tracks/vias) with dimmed gray style
            <>
              {previewLines.map((line, i) => (
                <Line
                  key={`preview-incompat-${i}`}
                  points={[line.start.x, line.start.y, line.end.x, line.end.y]}
                  stroke="#777"
                  strokeWidth={line.width}
                  strokeScaleEnabled={true}
                  opacity={0.45}
                  dash={[3, 4]}
                />
              ))}
              {renderBackSegments()}
              {renderFrontSegments()}
            </>
          ) : (
            // compatible preview: draw between back and front segments with highlight
            <>
              {renderBackSegments()}
              {previewLines.map((line, i) => (
                <Line
                  key={`preview-${i}`}
                  points={[line.start.x, line.start.y, line.end.x, line.end.y]}
                  stroke="yellow"
                  strokeWidth={line.width}
                  strokeScaleEnabled={true}
                  opacity={0.7}
                  dash={[5, 5]}
                />
              ))}
              {renderFrontSegments()}
            </>
          )}
          {renderVias()}
        </Layer>
      </CanvasStage>
    </div>
  );
}

export default RoutingCanvas;
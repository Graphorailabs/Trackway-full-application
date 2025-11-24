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

import { Layer, Line } from "react-konva";
import { useLayoutEffect, useRef, useState } from "react";
import CanvasStage from "./CanvasStage";
import { useCameraViewport } from "@/features/pcb_editor/components/canvas/CameraViewport";
import { usePcb } from "../../contexts/PcbContext";
import { useLayers } from "../../contexts/LayerContext";
import { useRouting } from "../../contexts/RoutingContext";
import type { Track, TrackSegment } from "trackway-parser-wasm";

export function RoutingCanvas() {
  const { pcb } = usePcb();
  const { visibility } = useLayers();
  const { previewTracks } = useRouting();
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

  const renderTrack = (track: Track, index: number) => {
    if (track.kind !== "segment") return null;

    const segment = track.data as TrackSegment;
    if (!visibility[segment.layer]) return null;

    return (
      <Line
        key={segment.uuid || `track-${index}`}
        points={[segment.start[0], segment.start[1], segment.end[0], segment.end[1]]}
        stroke="red"
        strokeWidth={segment.width}
      />
    );
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
          {(pcb.tracks || []).map(renderTrack)}
          {previewLines.map((line, i) => (
            <Line
              key={`preview-${i}`}
              points={[line.start.x, line.start.y, line.end.x, line.end.y]}
              stroke="yellow"
              strokeWidth={line.width}
              opacity={0.7}
              dash={[5, 5]}
            />
          ))}
        </Layer>
      </CanvasStage>
    </div>
  );
}

export default RoutingCanvas;
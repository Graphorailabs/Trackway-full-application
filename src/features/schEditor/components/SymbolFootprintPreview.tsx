import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Group } from 'react-konva';

interface Pad {
  x: number;
  y: number;
  w?: number;
  h?: number;
  drill?: number;
  shape?: 'rect' | 'circle';
  layer?: string;
  name?: string;
  number?: string;
  isSmd?: boolean;
}

interface Props {
  content: string | null;
}

// Very small/kickstart parser for common pad patterns in KiCad .kicad_mod S-expr
function parsePads(text: string): Pad[] {
  if (!text) return [];
  const pads: Pad[] = [];

  // Extract pad blocks using a simple approach: find '(pad' and capture until matching ')'
  // This is not a full S-expression parser but works for many footprints.
  const padBlocks: string[] = [];
  const rePadStart = /\(pad\b/ig;
  let m: RegExpExecArray | null;
  while ((m = rePadStart.exec(text))) {
    const start = m.index;
    // find matching closing paren by scanning
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) { end = i + 1; break; }
      }
    }
    if (end > start) padBlocks.push(text.slice(start, end));
  }

  const atRe = /\(at\s+([\-\d\.]+)\s+([\-\d\.]+)(?:\s+([\-\d\.]+))?\)/i;
  const sizeRe = /\(size\s+([\-\d\.]+)\s+([\-\d\.]+)\)/i;
  const drillRe = /\(drill\s+([\-\d\.]+)\)/i;
  const smdRe = /\bsmd\b/i;
  const shapeRe = /\b(circle|rect|oval)\b/i;
  const nameRe = /\(name\s+"?([^\s\)]+)"?\)/i;
  const numberRe = /\(number\s+"?([^\s\)]+)"?\)/i;

  for (const block of padBlocks) {
    const at = atRe.exec(block);
    const size = sizeRe.exec(block);
    const drill = drillRe.exec(block);
    const smd = smdRe.test(block);
    const shape = shapeRe.exec(block);
    const name = nameRe.exec(block);
    const number = numberRe.exec(block);

    const x = at ? parseFloat(at[1]) : 0;
    const y = at ? parseFloat(at[2]) : 0;
    const w = size ? parseFloat(size[1]) : (smd ? 1.5 : undefined);
    const h = size ? parseFloat(size[2]) : (smd ? 1.5 : undefined);
    const drillVal = drill ? parseFloat(drill[1]) : undefined;
    const shp = (shape ? (shape[1].toLowerCase() === 'rect' ? 'rect' : 'circle') : (smd ? 'rect' : 'circle')) as 'rect' | 'circle';

    pads.push({
      x,
      y,
      w,
      h,
      drill: drillVal,
      shape: shp,
      isSmd: smd,
      name: name ? name[1] : undefined,
      number: number ? number[1] : undefined,
    });
  }

  return pads;
}

export const FootprintPreview: React.FC<Props> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 300, height: 200 });
  const [pads, setPads] = useState<Pad[]>([]);
  const stageRef = useRef<any>(null);
  const [stageScale, setStageScale] = useState<number>(1);
  const [stagePos, setStagePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setPads(parsePads(content ?? ''));
  }, [content]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resize = () => {
      let r = el.getBoundingClientRect();
      // If the container seems too small (flex/min-h issues), check parent for available height
      if (r.height < 120 && el.parentElement) {
        const pr = el.parentElement.getBoundingClientRect();
        if (pr.height > r.height) r = pr;
      }
      setSize({ width: Math.max(120, Math.floor(r.width)), height: Math.max(120, Math.floor(r.height)) });
    };
    resize();
    let ro: ResizeObserver | null = null;
    if ((window as any).ResizeObserver) {
      ro = new ResizeObserver(resize);
      ro.observe(el);
    } else {
      window.addEventListener('resize', resize);
    }
    return () => {
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
    };
  }, []);

  // compute bbox from pads
  const bbox = (() => {
    if (!pads || pads.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pads) {
      const w = (p.w ?? 1) / 2;
      const h = (p.h ?? 1) / 2;
      const left = p.x - w;
      const right = p.x + w;
      const top = p.y - h;
      const bottom = p.y + h;
      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
      if (top < minY) minY = top;
      if (bottom > maxY) maxY = bottom;
    }
    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  })();

  // compute scale to fit
  const SCALE_FACTOR = 6; // rough pixel per mm

  let draw = null as any;

  // derive circle/layout heuristics
  const layout = (() => {
    if (!pads || pads.length === 0) return { isCircle: false, cx: 0, cy: 0, meanR: 0 };
    const cx = bbox ? (bbox.minX + bbox.maxX) / 2 : pads.reduce((s, p) => s + p.x, 0) / pads.length;
    const cy = bbox ? (bbox.minY + bbox.maxY) / 2 : pads.reduce((s, p) => s + p.y, 0) / pads.length;
    const dists = pads.map((p) => Math.hypot(p.x - cx, p.y - cy));
    const mean = dists.reduce((s, v) => s + v, 0) / dists.length;
    const variance = dists.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / dists.length;
    const stdev = Math.sqrt(variance);
    const isCircle = pads.length >= 6 && mean > 0 && (stdev / mean) < 0.22; // reasonably circular
    return { isCircle, cx, cy, meanR: mean };
  })();

  // initialize stage transform when content/size/bbox change (keep hooks top-level)
  useEffect(() => {
    if (!bbox) return;
    const bbW = (bbox.maxX - bbox.minX) * SCALE_FACTOR || 1;
    const bbH = (bbox.maxY - bbox.minY) * SCALE_FACTOR || 1;
    const availW = size.width - 16;
    const availH = size.height - 16;
    const fitScale = Math.min(availW / bbW, availH / bbH) * 0.9;
    // Reduce the automatic footprint fit so the footprint appears slightly smaller
    // and leaves room inside the preview pane for padding and labels.
    const REDUCE_FIT = 0.85;
    const appliedScale = (fitScale || 1) * REDUCE_FIT;
    const fitOffsetX = (size.width / 2) - ((bbox.minX + bbox.maxX) / 2) * SCALE_FACTOR * appliedScale;
    const fitOffsetY = (size.height / 2) - ((bbox.minY + bbox.maxY) / 2) * SCALE_FACTOR * appliedScale;
    setStageScale(appliedScale || 1);
    setStagePos({ x: fitOffsetX || 0, y: fitOffsetY || 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, size.width, size.height, bbox?.minX, bbox?.maxX, bbox?.minY, bbox?.maxY]);

  if (!content) {
    draw = (
      <div className="text-xs text-gray-400">No footprint content</div>
    );
  } else if (!bbox) {
    // show raw text fallback
    draw = (
      <pre className="text-xs text-gray-200 whitespace-pre-wrap break-words max-h-full overflow-auto">{content}</pre>
    );
  } else {
    // compute scale so bbox fits in size (initial fit values)
    const bbW = (bbox.maxX - bbox.minX) * SCALE_FACTOR || 1;
    const bbH = (bbox.maxY - bbox.minY) * SCALE_FACTOR || 1;
    const availW = size.width - 16;
    const availH = size.height - 16;
    const fitScale = Math.min(availW / bbW, availH / bbH) * 0.9;

    const fitOffsetX = (size.width / 2) - ((bbox.minX + bbox.maxX) / 2) * SCALE_FACTOR * fitScale;
    const fitOffsetY = (size.height / 2) - ((bbox.minY + bbox.maxY) / 2) * SCALE_FACTOR * fitScale;

    const padFill = '#d43d3d';
    const padStroke = '#4a0000';

    // stage handlers: wheel zoom and drag-pan
    const onWheel = (e: any) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const oldScale = stageScale || 1;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const mousePointTo = {
        x: (pointer.x - stagePos.x) / oldScale,
        y: (pointer.y - stagePos.y) / oldScale,
      };
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1 + direction * 0.12;
      const newScale = Math.max(0.1, Math.min(8, oldScale * factor));
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
      setStageScale(newScale);
      setStagePos(newPos);
    };

    const onDblClick = () => {
      // Reset to the reduced fit scale we applied earlier
      const REDUCE_FIT = 0.85;
      setStageScale((fitScale || 1) * REDUCE_FIT || 1);
      setStagePos({ x: fitOffsetX || 0, y: fitOffsetY || 0 });
    };

    const onDragMove = (e: any) => {
      const node = e.target;
      setStagePos({ x: node.x(), y: node.y() });
    };

    draw = (
      <Stage
        width={size.width}
        height={size.height}
        className="bg-[#071331]"
        ref={stageRef}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onDragMove={onDragMove}
        onWheel={onWheel}
        onDblClick={onDblClick}
      >
        <Layer>
          {/* if circular, draw guide rings */}
          {layout.isCircle && (
            <Group>
              <Circle
                x={layout.cx * SCALE_FACTOR}
                y={layout.cy * SCALE_FACTOR}
                radius={layout.meanR * SCALE_FACTOR}
                stroke="#F6E27A"
                strokeWidth={1 / (stageScale || 1)}
              />
              <Circle
                x={layout.cx * SCALE_FACTOR}
                y={layout.cy * SCALE_FACTOR}
                radius={(layout.meanR + 4) * SCALE_FACTOR}
                stroke="#F6E27A"
                strokeWidth={1 / (stageScale || 1)}
                opacity={0.6}
              />
            </Group>
          )}

          <Group>
            {/* render pads */}
            {pads.map((p, i) => {
              const px = p.x * SCALE_FACTOR;
              const py = p.y * SCALE_FACTOR;
              const w = (p.w ?? 1) * SCALE_FACTOR;
              const h = (p.h ?? p.w ?? 1) * SCALE_FACTOR;
              const displayNum = p.number || p.name || String(i + 1);
              const fontSize = Math.max(8, 12 / (stageScale || 1));

              if (p.shape === 'rect') {
                return (
                  <Group key={i} x={px} y={py}>
                    <Rect
                      x={-w / 2}
                      y={-h / 2}
                      width={w}
                      height={h}
                      fill={padFill}
                      stroke={padStroke}
                      strokeWidth={1 / (stageScale || 1)}
                      cornerRadius={2}
                    />
                    <Text
                      text={displayNum}
                      fontSize={fontSize}
                      fill="#fff"
                      x={-fontSize / 2}
                      y={-fontSize / 2}
                    />
                  </Group>
                );
              }

              // circle pad
              const r = Math.max(1, (p.drill ?? Math.min(w, h) / 2) * SCALE_FACTOR / 2);
              return (
                <Group key={i} x={px} y={py}>
                  <Circle
                    x={0}
                    y={0}
                    radius={Math.max(2, r)}
                    fill={padFill}
                    stroke={padStroke}
                    strokeWidth={1 / (stageScale || 1)}
                  />
                  <Text
                    text={displayNum}
                    fontSize={fontSize}
                    fill="#fff"
                    x={-fontSize / 2}
                    y={-fontSize / 2}
                  />
                </Group>
              );
            })}
          </Group>
        </Layer>
      </Stage>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {draw}
    </div>
  );
};

export default FootprintPreview;

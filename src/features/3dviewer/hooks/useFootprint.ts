import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Footprint, FootprintGraphic, FootprintPad, GraphicAt } from "trackway-parser-wasm";
import { FOOTPRINT_PREVIEW_FLIP_ARC_POINTS as DEFAULT_FLIP_ARC_POINTS } from "@/features/footprint_manager/constants";
import {
  FOOTPRINT_BBOX_PADDING,
  FOOTPRINT_CANVAS_DIMENSION_MAX,
  FOOTPRINT_CANVAS_DIMENSION_MIN,
  FOOTPRINT_CANVAS_PPU_MAX,
  FOOTPRINT_CANVAS_PPU_MIN,
  FOOTPRINT_CANVAS_TEXTURE_MAX_PX,
  FOOTPRINT_GRAPHIC_FILL_COLOR,
  FOOTPRINT_GRAPHIC_STROKE_COLOR,
  FOOTPRINT_LINE_WIDTH_MIN,
  FOOTPRINT_LINE_WIDTH_SCALE,
  FOOTPRINT_PAD_FILL_COLOR,
  FOOTPRINT_PAD_ROUNDING_RATIO,
  FOOTPRINT_PAD_STROKE_COLOR,
  FOOTPRINT_SHADOW_COLOR,
  FOOTPRINT_SHADOW_GLOW_SCALE,
  FOOTPRINT_SHADOW_MIN_BLUR,
  FOOTPRINT_ZERO_AT,
} from "@/features/3dviewer/constants";
import {
  type FootprintPoint,
  extractLayerName,
  extendBoundsWithGraphic,
  getArcPolyline,
  getPadCenter,
  getPadDrillValue,
  getPadShapeName,
  getPadSize,
  parsePoint,
  pointsFromAny,
} from "./useFootprint.helpers";

export default function useFootprint(fp?: Footprint | null) {
  const at: GraphicAt = fp?.at ?? FOOTPRINT_ZERO_AT;
  const x = at.x ?? 0;
  const y = at.y ?? 0;

  const canonicalLayer = useMemo(() => extractLayerName(fp?.layer), [fp]);

  const graphics = useMemo<FootprintGraphic[]>(() => {
    if (!Array.isArray(fp?.graphics)) return [];
    return fp.graphics.filter((g): g is FootprintGraphic => Boolean(g));
  }, [fp]);

  const pads: FootprintPad[] = fp?.pads ?? [];

  const hasBackIndicators = useMemo(() => {
    if (!fp) return false;
    const checkLayer = (layer: any) => {
      if (!layer) return false;
      if (typeof layer === "string") return layer.startsWith("B.");
      if (typeof layer === "object" && typeof layer.canonical_name === "string") return layer.canonical_name.startsWith("B.");
      return false;
    };
    if (pads.length) {
      for (const p of pads) {
        if (Array.isArray(p.layers) && p.layers.some(checkLayer)) return true;
      }
    }
    if (graphics.length) {
      for (const g of graphics) {
        if (checkLayer(g.data.layer)) return true;
      }
    }
    return false;
  }, [fp, graphics]);

  const isBackSide = useMemo(() => {
    if (canonicalLayer) {
      const upper = canonicalLayer.toUpperCase();
      if (upper.startsWith("B.")) return true;
      if (upper.startsWith("F.")) return false;
    }
    return hasBackIndicators;
  }, [canonicalLayer, hasBackIndicators]);

  const bbox = useMemo(() => {
    let minx = Infinity,
      miny = Infinity,
      maxx = -Infinity,
      maxy = -Infinity;
    const flipArcPointsForBbox = typeof window !== "undefined" && typeof (window as any).FOOTPRINT_PREVIEW_FLIP_ARC_POINTS === "boolean"
      ? Boolean((window as any).FOOTPRINT_PREVIEW_FLIP_ARC_POINTS)
      : DEFAULT_FLIP_ARC_POINTS;
    const addPoint = (px: number, py: number) => {
      if (!isFinite(px) || !isFinite(py)) return;
      minx = Math.min(minx, px);
      miny = Math.min(miny, py);
      maxx = Math.max(maxx, px);
      maxy = Math.max(maxy, py);
    };
    if (pads.length) {
      for (const p of pads) {
        const center = getPadCenter(p);
        const [padWidth, padHeight] = getPadSize(p);
        const half = Math.max(padWidth, padHeight) / 2;
        addPoint(center.x - half, center.y - half);
        addPoint(center.x + half, center.y + half);
      }
    }
    if (graphics.length) {
      graphics.forEach((graphic) => extendBoundsWithGraphic(graphic, addPoint, flipArcPointsForBbox));
    }
    if (!isFinite(minx)) {
      minx = -5;
      miny = -5;
      maxx = 5;
      maxy = 5;
    }
    return {
      minx: minx - FOOTPRINT_BBOX_PADDING,
      miny: miny - FOOTPRINT_BBOX_PADDING,
      maxx: maxx + FOOTPRINT_BBOX_PADDING,
      maxy: maxy + FOOTPRINT_BBOX_PADDING,
    };
  }, [fp, graphics]);

  const widthUnits = Math.max(0.0001, bbox.maxx - bbox.minx);
  const heightUnits = Math.max(0.0001, bbox.maxy - bbox.miny);
  const bboxCenterX = bbox.minx + widthUnits / 2;
  const bboxCenterY = bbox.miny + heightUnits / 2;

  const rawAngle = at.angle ?? 0;
  const angleRad = Math.abs(rawAngle) > Math.PI * 2 ? ((rawAngle as number) * Math.PI) / 180 : (rawAngle as number);

  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const wUnits = widthUnits;
    const hUnits = heightUnits;
    const maxPx = FOOTPRINT_CANVAS_TEXTURE_MAX_PX;
    const pxPerUnit = Math.max(
      FOOTPRINT_CANVAS_PPU_MIN,
      Math.min(maxPx / Math.max(wUnits, hUnits), FOOTPRINT_CANVAS_PPU_MAX),
    );
    const cw = Math.max(
      FOOTPRINT_CANVAS_DIMENSION_MIN,
      Math.min(FOOTPRINT_CANVAS_DIMENSION_MAX, Math.ceil(wUnits * pxPerUnit)),
    );
    const ch = Math.max(
      FOOTPRINT_CANVAS_DIMENSION_MIN,
      Math.min(FOOTPRINT_CANVAS_DIMENSION_MAX, Math.ceil(hUnits * pxPerUnit)),
    );

    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, cw, ch);

    const pxScaleX = cw / wUnits;
    const pxScaleY = ch / hUnits;
    const toCanvasX = (vx: number) => Math.round((vx - bbox.minx) * pxScaleX);
    const toCanvasY = (vy: number) => Math.round(ch - (vy - bbox.miny) * pxScaleY);
    const maxUnitToPx = Math.max(pxScaleX, pxScaleY);

    const flipArcPoints = typeof window !== "undefined" && typeof (window as any).FOOTPRINT_PREVIEW_FLIP_ARC_POINTS === "boolean"
      ? Boolean((window as any).FOOTPRINT_PREVIEW_FLIP_ARC_POINTS)
      : DEFAULT_FLIP_ARC_POINTS;

    const glow = Math.max(
      FOOTPRINT_SHADOW_MIN_BLUR,
      Math.round(Math.min(cw, ch) * FOOTPRINT_SHADOW_GLOW_SCALE),
    );
    ctx.lineWidth = Math.max(
      FOOTPRINT_LINE_WIDTH_MIN,
      Math.round(Math.min(cw, ch) * FOOTPRINT_LINE_WIDTH_SCALE),
    );
    ctx.strokeStyle = FOOTPRINT_GRAPHIC_STROKE_COLOR;
    ctx.fillStyle = FOOTPRINT_GRAPHIC_FILL_COLOR;
    ctx.shadowColor = FOOTPRINT_SHADOW_COLOR;
    ctx.shadowBlur = glow;
    if (pads.length) {
      for (const p of pads) {
        ctx.save();
        ctx.strokeStyle = FOOTPRINT_PAD_STROKE_COLOR;
        ctx.fillStyle = FOOTPRINT_PAD_FILL_COLOR;
        const center = getPadCenter(p);
        const [wUnitsPad, hUnitsPad] = getPadSize(p);
        const shape = getPadShapeName(p);
        const padTypeStr = String(p.pad_type ?? "").toLowerCase();
        const drillVal = getPadDrillValue(p);
        const drillDiameter = (() => {
          if (drillVal === null || typeof drillVal === "undefined") return null;
          if (typeof drillVal === "number") return drillVal;
          if (typeof drillVal === "object") {
            const drillObj = drillVal as Record<string, any>;
            if (typeof drillObj.diameter === "number") return drillObj.diameter;
            if (typeof drillObj.r === "number") return drillObj.r * 2;
            if (typeof drillObj.size === "number") return drillObj.size;
            if (typeof drillObj.x === "number" && typeof drillObj.y === "number") return Math.max(drillObj.x, drillObj.y);
          }
          return null;
        })();
        const hasDrill = drillDiameter !== null;
        const isThroughHole = hasDrill || (padTypeStr && padTypeStr !== "smd");
        const showHole = isThroughHole;

        // drilled/through-hole pads now have dedicated 3D meshes, so skip painting them
        if (showHole) {
          ctx.restore();
          continue;
        }

        const cx = toCanvasX(center.x);
        const cy = toCanvasY(center.y);
        const pw = Math.max(1, Math.round(wUnitsPad * (cw / wUnits)));
        const ph = Math.max(1, Math.round(hUnitsPad * (ch / hUnits)));

        const normalizedShape = shape.toLowerCase();
        if (normalizedShape === "circle" || normalizedShape === "round" || Math.abs(pw - ph) <= 1) {
          const rpx = Math.max(1, Math.round(Math.max(pw, ph) / 2));
          ctx.beginPath();
          ctx.arc(cx, cy, rpx, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // rectangle/oval
          const rx = Math.max(1, Math.round(pw));
          const ry = Math.max(1, Math.round(ph));
          const left = cx - rx / 2;
          const top = cy - ry / 2;
          // if pad looks like an oblong (rounded), draw rounded rect
          const radius = Math.min(rx, ry) * FOOTPRINT_PAD_ROUNDING_RATIO;
          // rounded rect path
          ctx.beginPath();
          ctx.moveTo(left + radius, top);
          ctx.lineTo(left + rx - radius, top);
          ctx.quadraticCurveTo(left + rx, top, left + rx, top + radius);
          ctx.lineTo(left + rx, top + ry - radius);
          ctx.quadraticCurveTo(left + rx, top + ry, left + rx - radius, top + ry);
          ctx.lineTo(left + radius, top + ry);
          ctx.quadraticCurveTo(left, top + ry, left, top + ry - radius);
          ctx.lineTo(left, top + radius);
          ctx.quadraticCurveTo(left, top, left + radius, top);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Reset styles for non-pad graphics so they stay white
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = FOOTPRINT_GRAPHIC_STROKE_COLOR;
    ctx.fillStyle = FOOTPRINT_GRAPHIC_FILL_COLOR;

    if (graphics.length) {
      const drawPolyline = (points: FootprintPoint[], closePath = false) => {
        if (points.length < 2) return false;
        ctx.beginPath();
        ctx.moveTo(toCanvasX(points[0].x), toCanvasY(points[0].y));
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(toCanvasX(points[i].x), toCanvasY(points[i].y));
        }
        if (closePath) ctx.closePath();
        ctx.stroke();
        return true;
      };

      const drawDot = (point: FootprintPoint | null, radiusScale = 0.003) => {
        if (!point) return;
        const ccx = toCanvasX(point.x);
        const ccy = toCanvasY(point.y);
        ctx.beginPath();
        ctx.arc(ccx, ccy, Math.max(1, Math.round(Math.min(cw, ch) * radiusScale)), 0, Math.PI * 2);
        ctx.fill();
      };

      const rectFromPoints = (
        start: FootprintPoint | null,
        end: FootprintPoint | null,
      ): FootprintPoint[] | null => {
        if (!start || !end) return null;
        const left = Math.min(start.x, end.x);
        const right = Math.max(start.x, end.x);
        const top = Math.min(start.y, end.y);
        const bottom = Math.max(start.y, end.y);
        return [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ];
      };

      for (const g of graphics) {
        if (g.kind === "arc") {
          const polyline = getArcPolyline(g.data, flipArcPoints);
          if (polyline && polyline.length >= 2) {
            drawPolyline(polyline);
            continue;
          }
        } else if (g.kind === "line") {
          const start = parsePoint(g.data.start);
          const end = parsePoint(g.data.end);
          if (start && end) {
            ctx.beginPath();
            ctx.moveTo(toCanvasX(start.x), toCanvasY(start.y));
            ctx.lineTo(toCanvasX(end.x), toCanvasY(end.y));
            ctx.stroke();
            continue;
          }
        } else if (g.kind === "polygon") {
          const pts = pointsFromAny(g.data.pts);
          if (pts.length && drawPolyline(pts, true)) continue;
        } else if (g.kind === "rect") {
          const start = parsePoint(g.data.start);
          const end = parsePoint(g.data.end);
          const rectPoints = rectFromPoints(start, end);
          if (rectPoints && drawPolyline(rectPoints, true)) continue;
        } else if (g.kind === "circle") {
          const center = parsePoint(g.data.center);
          const edge = parsePoint(g.data.end);
          if (center && edge) {
            const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
            if (radius > 0) {
              ctx.beginPath();
              ctx.arc(toCanvasX(center.x), toCanvasY(center.y), Math.max(1, Math.round(radius * maxUnitToPx)), 0, Math.PI * 2);
              ctx.stroke();
              continue;
            }
          }
        } else if (g.kind === "curve") {
          const pts = pointsFromAny(g.data.pts);
          if (pts.length && drawPolyline(pts)) continue;
        } else if (g.kind === "text") {
          const anchor = parsePoint(g.data.at);
          if (anchor) {
            drawDot(anchor);
            continue;
          }
        } else if (g.kind === "text_box") {
          const pts = pointsFromAny(g.data.pts);
          if (pts.length && drawPolyline(pts, true)) continue;
          const start = parsePoint(g.data.start);
          const end = parsePoint(g.data.end);
          const rectPoints = rectFromPoints(start, end);
          if (rectPoints && drawPolyline(rectPoints, true)) continue;
        } else if (g.kind === "dimension") {
          const pts = pointsFromAny(g.data.pts);
          if (pts.length && drawPolyline(pts)) {
            const textPoint = parsePoint(g.data.gr_text?.at);
            if (textPoint) drawDot(textPoint, 0.004);
            continue;
          }
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    if (isBackSide) {
      tex.wrapS = THREE.MirroredRepeatWrapping;
      tex.repeat.x = -1;
      tex.offset.x = 1;
    }
    tex.flipY = true;
    tex.needsUpdate = true;

    if (textureRef.current) {
      textureRef.current.dispose();
    }
    textureRef.current = tex;
    setTexture(tex);

    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      setTexture(null);
    };
  }, [fp, bbox, widthUnits, heightUnits, isBackSide, graphics]);

  return {
    texture,
    widthUnits,
    heightUnits,
    bboxCenterX,
    bboxCenterY,
    x,
    y,
    angleRad,
    isBackSide,
    layerName: canonicalLayer,
  };
}

import { useMemo } from "react";
import * as THREE from "three";
import useFootprint from "../hooks/useFootprint";
import ModelRenderer from "./ModelRenderer";
import type { BoardBounds } from "../hooks/useEdgeCuts";
import type { Footprint, FootprintPad } from "../../../../pkg/trackway_parser_wasm";
import { BOARD_THICKNESS, PAD_SURFACE_EPS, SHOW_FOOTPRINT_CENTER_POINT } from "../constants";

type FootprintMeshProps = {
  fp?: Footprint | null;
  idx: number;
  boardBounds?: BoardBounds;
  onModelReady?: (worldPosition: THREE.Vector3, ctx: { footprintUuid: string | null }) => void;
};

const PAD_COLOR = 0xffdc73;
const HOLE_COLOR = 0x111111;
const PAD_SEGMENTS_MIN = 32;
const HOLE_SEGMENTS = 32;
const CENTER_MARKER_RADIUS = 0.12;
const CENTER_MARKER_SEGMENTS = 12;
const CENTER_MARKER_OFFSET = 0.05;
const CENTER_MARKER_COLOR = 0x00d4ff;

type PadRenderData = {
  id: string;
  localX: number;
  localY: number;
  rotationRad: number;
  shape: THREE.Shape;
  segments: number;
  holeRadius: number;
  holeOffsetX: number;
  holeOffsetY: number;
};

function toNumber(value: any, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toRadians(value: any) {
  const num = Number(value) || 0;
  return Math.abs(num) > Math.PI * 2 ? (num * Math.PI) / 180 : num;
}

function normalizePadSize(pad: FootprintPad) {
  const raw = (pad.size as any) ?? (pad as any).data?.size ?? null;
  if (Array.isArray(raw)) {
    const width = Math.abs(toNumber(raw[0], 0));
    const height = Math.abs(toNumber(raw[1] ?? raw[0], raw[0] ?? 0));
    return { width: Math.max(width, 0.01), height: Math.max(height, 0.01) };
  }
  if (raw && typeof raw === "object") {
    const width = Math.abs(toNumber(raw.x ?? raw.width ?? 0, 0));
    const height = Math.abs(toNumber(raw.y ?? raw.height ?? width, width));
    return { width: Math.max(width, 0.01), height: Math.max(height, 0.01) };
  }
  const fallback = Math.max(0.01, Math.abs(Number((pad as any).size) || 1));
  return { width: fallback, height: fallback };
}

function normalizePadAt(pad: FootprintPad) {
  const rawAt = (pad.at as any) ?? (pad as any).data?.at ?? null;
  let posX = 0;
  let posY = 0;
  let angle = 0;
  if (Array.isArray(rawAt)) {
    posX = toNumber(rawAt[0], 0);
    posY = toNumber(rawAt[1], 0);
    angle = toRadians(rawAt[2] ?? 0);
  } else if (rawAt && typeof rawAt === "object") {
    posX = toNumber(rawAt.x, 0);
    posY = toNumber(rawAt.y, 0);
    angle = toRadians(rawAt.angle ?? 0);
  } else {
    posX = toNumber((pad as any).x, 0);
    posY = toNumber((pad as any).y, 0);
  }
  const padRotation = (pad as any)?.rotation;
  if (padRotation !== null && typeof padRotation !== "undefined") {
    angle += toRadians(padRotation);
  }
  return { x: posX, y: posY, angleRad: angle };
}

function normalizeDrill(pad: FootprintPad) {
  const raw = (pad.drill as any) ?? (pad as any).data?.drill ?? null;
  if (raw === null || typeof raw === "undefined") return null;
  if (typeof raw === "number") {
    const radius = Math.max(0, raw / 2);
    return radius > 0 ? { radius, offsetX: 0, offsetY: 0 } : null;
  }
  if (typeof raw === "object") {
    const diameter = toNumber(raw.diameter ?? raw.size ?? raw.width ?? 0, 0);
    const radius = Math.max(0, diameter / 2);
    if (!radius) return null;
    let offsetX = 0;
    let offsetY = 0;
    if (Array.isArray(raw.offset)) {
      offsetX = toNumber(raw.offset[0], 0);
      offsetY = toNumber(raw.offset[1], 0);
    } else if (raw.offset && typeof raw.offset === "object") {
      offsetX = toNumber(raw.offset.x, 0);
      offsetY = toNumber(raw.offset.y, 0);
    }
    return { radius, offsetX, offsetY };
  }
  return null;
}

function createRoundedRect(shape: THREE.Shape, hw: number, hh: number, radius: number) {
  const r = Math.min(radius, hw, hh);
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  shape.closePath();
}

function buildPadShape(width: number, height: number, shapeName: string, roundRatio: number, holeRadius: number, holeOffsetX: number, holeOffsetY: number) {
  const shape = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const normalized = (shapeName || "rect").toLowerCase();

  if (normalized === "circle" || normalized === "round") {
    const radius = Math.max(hw, hh);
    shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  } else {
    let cornerRadius = 0;
    if (normalized === "oval") cornerRadius = Math.min(hw, hh);
    else if (normalized === "roundrect") cornerRadius = Math.min(hw, hh) * Math.min(Math.max(roundRatio, 0), 1);
    createRoundedRect(shape, hw, hh, cornerRadius);
  }

  if (holeRadius > 0) {
    const hole = new THREE.Path();
    hole.absarc(holeOffsetX, holeOffsetY, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }

  const segments = Math.max(PAD_SEGMENTS_MIN, Math.ceil(Math.max(width, height) * 6));
  return { shape, segments };
}

export default function FootprintMesh({ fp, idx, boardBounds, onModelReady }: FootprintMeshProps) {
  const {
    texture,
    widthUnits,
    heightUnits,
    bboxCenterX,
    bboxCenterY,
    x,
    y,
    angleRad,
    isBackSide,
  } = useFootprint(fp);

  const padRenderData = useMemo<PadRenderData[]>(() => {
    const pads = Array.isArray(fp?.pads) ? (fp.pads as FootprintPad[]) : [];
    return pads
      .map((pad, idx) => {
        const drill = normalizeDrill(pad);
        if (!drill || drill.radius <= 0) return null;

        const size = normalizePadSize(pad);
        const { x: padX, y: padY, angleRad: padAngle } = normalizePadAt(pad);
        const smallestHalf = Math.min(size.width, size.height) / 2;
        if (drill.radius >= smallestHalf) return null;

        const shapeName = typeof pad.shape === "string" ? pad.shape : String(pad.shape ?? "rect");
        const roundRatio = typeof pad.roundrect_rratio === "number"
          ? pad.roundrect_rratio
          : typeof (pad as any).data?.roundrect_rratio === "number"
            ? (pad as any).data.roundrect_rratio
            : 0.25;
        const { shape, segments } = buildPadShape(size.width, size.height, shapeName, roundRatio, drill.radius, drill.offsetX, drill.offsetY);

        return {
          id: pad.uuid ?? `${pad.number ?? idx}-${idx}`,
          localX: padX - bboxCenterX,
          localY: padY - bboxCenterY,
          rotationRad: padAngle,
          shape,
          segments,
          holeRadius: drill.radius,
          holeOffsetX: drill.offsetX,
          holeOffsetY: drill.offsetY,
        } satisfies PadRenderData;
      })
      .filter((pad): pad is PadRenderData => Boolean(pad));
  }, [fp, bboxCenterX, bboxCenterY]);

  const flipY = (value: number) => (boardBounds ? boardBounds.minY + boardBounds.maxY - value : value);
  const zOffsetTop = 1 + 0.001 + (idx % 5) * 0.0001;
  const zOffsetBottom = -0.001 - (idx % 5) * 0.0001;
  const z = isBackSide ? zOffsetBottom : zOffsetTop;
  const groupPosition: [number, number, number] = [x, flipY(y), z];
  const groupScale: [number, number, number] = isBackSide ? [-1, -1, 1] : [1, -1, 1];
  const contentPosition: [number, number, number] = [isBackSide ? -bboxCenterX : bboxCenterX, bboxCenterY, 0];
  const topPadOffsetZ = isBackSide ? BOARD_THICKNESS + PAD_SURFACE_EPS : PAD_SURFACE_EPS;
  const bottomPadOffsetZ = isBackSide ? -PAD_SURFACE_EPS - 0.03 : -(BOARD_THICKNESS + PAD_SURFACE_EPS);
  const holeCenterZ = (topPadOffsetZ + bottomPadOffsetZ) / 2;
  const holeHeight = Math.abs(topPadOffsetZ - bottomPadOffsetZ) + PAD_SURFACE_EPS;

  return (
    <group position={groupPosition} rotation={[0, 0, -angleRad]} scale={groupScale}>
      <group position={contentPosition}>
        <mesh renderOrder={900}>
          <planeGeometry args={[Math.max(0.0001, widthUnits), Math.max(0.0001, heightUnits)]} />
          <meshBasicMaterial map={texture ?? undefined} side={THREE.DoubleSide} transparent depthTest color={0xffffff} />
        </mesh>

        {padRenderData.map((pad) => {
          const holeSegments = Math.max(HOLE_SEGMENTS, Math.ceil(pad.holeRadius * 20));
          return (
            <group key={pad.id} position={[pad.localX, pad.localY, 0]} rotation={[0, 0, -pad.rotationRad]}>
              <mesh position={[0, 0, topPadOffsetZ]} renderOrder={950}>
                <shapeGeometry args={[pad.shape, pad.segments]} />
                <meshBasicMaterial
                  color={PAD_COLOR}
                  side={THREE.DoubleSide}
                  depthTest
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  polygonOffsetUnits={-2}
                />
              </mesh>

              <mesh position={[0, 0, bottomPadOffsetZ]} rotation={[Math.PI, 0, 0]} renderOrder={950}>
                <shapeGeometry args={[pad.shape, pad.segments]} />
                <meshBasicMaterial
                  color={PAD_COLOR}
                  side={THREE.DoubleSide}
                  depthTest
                  depthWrite={false}
                  polygonOffset
                  polygonOffsetFactor={-2}
                  polygonOffsetUnits={-2}
                />
              </mesh>

              <mesh rotation={[Math.PI / 2, 0, 0]} position={[pad.holeOffsetX, pad.holeOffsetY, holeCenterZ]}>
                <cylinderGeometry args={[pad.holeRadius, pad.holeRadius, holeHeight, holeSegments]} />
                <meshStandardMaterial color={HOLE_COLOR} roughness={0.9} metalness={0.1} />
              </mesh>
            </group>
          );
        })}

        {SHOW_FOOTPRINT_CENTER_POINT && (
          <mesh
            position={[0, 0, isBackSide ? bottomPadOffsetZ - CENTER_MARKER_OFFSET : topPadOffsetZ + CENTER_MARKER_OFFSET]}
            renderOrder={980}
          >
            <sphereGeometry args={[CENTER_MARKER_RADIUS, CENTER_MARKER_SEGMENTS, CENTER_MARKER_SEGMENTS]} />
            <meshStandardMaterial
              color={CENTER_MARKER_COLOR}
              emissive={CENTER_MARKER_COLOR}
              emissiveIntensity={0.7}
              metalness={0.2}
              roughness={0.25}
            />
          </mesh>
        )}

        <ModelRenderer
          fp={fp}
          bboxCenterX={bboxCenterX}
          bboxCenterY={bboxCenterY}
          isBackSide={isBackSide}
          idx={idx}
          onModelReady={onModelReady}
        />
      </group>
    </group>
  );
}

import * as THREE from "three";
import useFrontCopper from "../hooks/useFrontCopper";

export default function FrontCopperRenderer({ pcb }: { pcb: any }) {
  const { visibleSegments, boardDepth, copperThickness, boardBounds } = useFrontCopper(pcb);

  // position trace center so the trace top aligns with board top (match via pad top)
  const traceCenterZ = boardDepth - copperThickness / 2 + 0.001;
  const flipY = (y: number) => (boardBounds ? boardBounds.minY + boardBounds.maxY - y : y);

  return (
    <group name="front-copper">
      {visibleSegments.map((s: any, i: number) => {
        const sx = s.start[0], sy = flipY(s.start[1]);
        const ex = s.end[0], ey = flipY(s.end[1]);
        const mx = (sx + ex) / 2, my = (sy + ey) / 2;

        const dir = new THREE.Vector3(ex - sx, ey - sy, 0);
        const length = dir.length();
        if (length <= 0) return null;
        const mid = new THREE.Vector3(mx, my, traceCenterZ);
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
        const halfWidth = (Number(s.width) || 0.6) / 2;

        // Slightly extend each segment so adjacent segments overlap and appear connected.
        const overlap = Math.max(0.02, halfWidth);
        const renderLength = length + overlap;

        // Use a thin box (width x height x depth) where:
        // - height (Y) aligns with the segment length via the existing quaternion
        // - width (X) is the track cross-section (2 * halfWidth)
        // - depth (Z) is the copper thickness so traces sit flush with the board
        return (
          <mesh key={s.uuid || `seg-${i}`} position={mid.toArray()} quaternion={quat}>
            <boxGeometry args={[halfWidth * 2, renderLength, copperThickness]} />
            <meshStandardMaterial flatShading={true} color={0x00ff66} metalness={0.8} roughness={0.2} emissive={0x00ff44} emissiveIntensity={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

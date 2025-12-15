import * as THREE from "three";
import useBackCopper from "../hooks/useBackCopper";

export default function BackCopperRenderer({ pcb }: { pcb: any }) {
  const { visibleSegments, copperThickness, boardBounds } = useBackCopper(pcb);

  // position trace center so trace top sits at z=0.001 (just above board bottom)
  const traceCenterZ = 0.001 - copperThickness / 2;
  const flipY = (y: number) => (boardBounds ? boardBounds.minY + boardBounds.maxY - y : y);

  return (
    <group name="back-copper">
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

        const overlap = Math.max(0.02, halfWidth);
        const renderLength = length + overlap;

        return (
          <mesh key={s.uuid || `seg-back-${i}`} position={mid.toArray()} quaternion={quat}>
            <boxGeometry args={[halfWidth * 2, renderLength, copperThickness]} />
            <meshStandardMaterial flatShading={true} color={0x00ff66} metalness={0.8} roughness={0.2} emissive={0x00ff44} emissiveIntensity={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

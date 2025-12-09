import * as THREE from "three";
import useFootprint from "../hooks/useFootprint";
import type { BoardBounds } from "../hooks/useEdgeCuts";

type FootprintMeshProps = {
  fp: any;
  idx: number;
  boardBounds?: BoardBounds;
};

export default function FootprintMesh({ fp, idx, boardBounds }: FootprintMeshProps) {
  const { texture, widthUnits, heightUnits, bboxCenterX, bboxCenterY, x, y, angleRad, isFlipped } = useFootprint(fp);

  const flipY = (value: number) => (boardBounds ? boardBounds.minY + boardBounds.maxY - value : value);
  const z = isFlipped ? -0.001 - (idx % 5) * 0.0001 : 1 + 0.001 + (idx % 5) * 0.0001;
  const groupPosition: [number, number, number] = [x, flipY(y), z];
  const groupScale: [number, number, number] = isFlipped ? [-1, -1, 1] : [1, -1, 1];

  return (
    <group position={groupPosition} rotation={[0, 0, -angleRad]} scale={groupScale}>
      <mesh position={[bboxCenterX, bboxCenterY, 0]} renderOrder={900}>
        <planeGeometry args={[Math.max(0.0001, widthUnits), Math.max(0.0001, heightUnits)]} />
        <meshBasicMaterial map={texture ?? undefined} side={THREE.DoubleSide} transparent depthTest color={0xffffff} />
      </mesh>
    </group>
  );
}

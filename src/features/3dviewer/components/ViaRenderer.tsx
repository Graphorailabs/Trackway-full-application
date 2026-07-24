import * as THREE from "three";
import useVias from "../hooks/useVias";

export default function ViaRenderer({ pcb }: { pcb: any }) {
  const { visibleVias, boardDepth, boardBounds } = useVias(pcb);
  const flipY = (y: number) => (boardBounds ? boardBounds.minY + boardBounds.maxY - y : y);

  return (
    <group name="vias">
      {visibleVias.map((v: any, i: number) => {
        const at = v.at ?? [0, 0];
        const padR = v.padR;
        const drillR = v.drillR;

        // make the barrel span exactly the board thickness
        const barrelHeight = boardDepth;

        // position group at world XY and z=0 (board bottom)
        const pos = [at[0], flipY(at[1]), 0] as [number, number, number];

        return (
          <group key={v.uuid || `via-${i}`} position={pos}>
            {/* barrel (aligned along Z) */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, boardDepth / 2]}>
              <cylinderGeometry args={[drillR * 0.6, drillR * 0.6, barrelHeight, 20]} />
              <meshStandardMaterial color={0xcc7700} metalness={0.8} roughness={0.25} />
            </mesh>

            {/* top pad (flat disc) - positioned so its plane is just above the board top */}
            <mesh position={[0, 0, boardDepth + 0.001]} renderOrder={100}>
              <circleGeometry args={[padR, 32]} />
              <meshStandardMaterial flatShading={true} color={0x00ff66} metalness={0.8} roughness={0.2} emissive={0x00ff44} emissiveIntensity={0.4} side={THREE.DoubleSide} />
            </mesh>

            {/* bottom pad (flat disc) - positioned just below the board bottom so it's visible from the underside */}
            <mesh rotation={[Math.PI, 0, 0]} position={[0, 0, -0.001]} renderOrder={100}>
              <circleGeometry args={[padR, 32]} />
              <meshStandardMaterial flatShading={true} color={0x00ff66} metalness={0.8} roughness={0.2} emissive={0x00ff44} emissiveIntensity={0.4} side={THREE.DoubleSide} />
            </mesh>

            {/* drill/hole visualization: dark cylinder inset and kept within barrel height */}
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, boardDepth / 2]}>
              <cylinderGeometry args={[drillR / 2, drillR / 2, Math.max(0.001, barrelHeight - 0.002), 20]} />
              <meshStandardMaterial color={0x000000} metalness={0.1} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

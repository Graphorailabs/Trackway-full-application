import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import FootprintMesh from "./FootprintMesh";
import EdgeCutsRenderer from "./EdgeCutsRenderer";

export function Viewer3D() {
    const { pcb } = usePcb();

    const footprints = useMemo(() => pcb?.footprints ?? [], [pcb]);

    return (
        <Canvas camera={{ position: [0, 0, 50], fov: 45 }}>
            <ambientLight intensity={0.6} />
            <pointLight position={[10, 10, 10]} />

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <planeGeometry args={[1000, 1000]} />
                <meshStandardMaterial color="#0F172A" metalness={0.1} roughness={0.9} />
            </mesh>

            <EdgeCutsRenderer pcb={pcb} />
            {footprints.map((fp: any, idx: number) => (
                <FootprintMesh key={fp.uuid ?? idx} fp={fp} idx={idx} />
            ))}

            <OrbitControls />
        </Canvas>
    );
}
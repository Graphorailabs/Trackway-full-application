import { Canvas } from "@react-three/fiber";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import SceneContents from "./SceneContents";

export function Viewer3D() {
    const { pcb } = usePcb();

    return (
        <Canvas camera={{ position: [0, 0, 50], fov: 45 }}>
            <SceneContents pcb={pcb} />
        </Canvas>
    );
}
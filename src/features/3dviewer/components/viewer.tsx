import { useState } from "react";
import { Axis3D } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { usePcb } from "@/features/pcb_editor/contexts/PcbContext";
import SceneContents from "./SceneContents";

export function Viewer3D() {
    const { pcb } = usePcb();
    const [showAxes, setShowAxes] = useState(false);

    return (
        <div className="relative h-full w-full">
            <Canvas camera={{ position: [0, 0, 50], fov: 45 }}>
                <SceneContents pcb={pcb} showAxes={showAxes} />
            </Canvas>

            <div className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 gap-2 md:left-auto md:right-4 md:translate-x-0">
                <button
                    type="button"
                    aria-pressed={showAxes}
                    onClick={() => setShowAxes((prev) => !prev)}
                    className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-900/80 px-4 py-2 text-xs font-medium uppercase tracking-wide text-white shadow-md backdrop-blur transition hover:border-white/40 hover:bg-slate-900"
                >
                    <Axis3D className="h-4 w-4" />
                    {showAxes ? "Hide Axes" : "Show Axes"}
                </button>
            </div>
        </div>
    );
}
import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, Html, OrbitControls as DreiOrbitControls } from "@react-three/drei";
import { type SupportedFormat } from "./constants";
import { ModelPreviewCanvasErrorBoundary } from "./components/ModelPreviewCanvasErrorBoundary";
import { ModelScene } from "./components/ModelScene";

export function ModelPreviewCanvas({
  objectUrl,
  format,
  failureMessage,
}: {
  objectUrl: string;
  format: SupportedFormat;
  failureMessage: string;
}) {
  return (
    <ModelPreviewCanvasErrorBoundary fallbackMessage={failureMessage}>
      <Canvas camera={{ position: [4, 3, 4], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }} className="absolute inset-0">
        <color attach="background" args={["#0f172a"]} />
        <hemisphereLight args={["#f1f5f9", "#0f172a", 0.75]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 6]} intensity={0.9} />
        <Suspense
          fallback={
            <Html center>
              <div className="px-3 py-2 rounded bg-slate-900/80 text-xs text-slate-200">Preparing mesh…</div>
            </Html>
          }
        >
          <ModelScene url={objectUrl} format={format} />
        </Suspense>
        <Grid
          args={[20, 20]}
          cellSize={0.4}
          cellThickness={0.6}
          sectionSize={2}
          sectionThickness={1.25}
          fadeDistance={20}
          fadeStrength={1}
          infiniteGrid
          position={[0, -0.001, 0]}
        />
        <DreiOrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>
    </ModelPreviewCanvasErrorBoundary>
  );
}

export { ModelFailureDisplay } from "./components/ModelFailureDisplay";

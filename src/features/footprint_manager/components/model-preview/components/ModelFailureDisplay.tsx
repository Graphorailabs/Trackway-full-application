import { Canvas } from "@react-three/fiber";
import { Grid, Line, OrbitControls as DreiOrbitControls } from "@react-three/drei";

export function ModelFailureDisplay({ message }: { message: string }) {
  return (
    <>
      <Canvas
        camera={{ position: [2.5, 2.4, 2.5], fov: 32 }}
        dpr={[1, 2]}
        className="absolute inset-0"
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#160808"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 5]} intensity={1} color="#f87171" />
        <FailureCube />
        <Grid args={[10, 10]} cellSize={0.4} cellColor="#4c1d1d" sectionSize={2} sectionColor="#7f1d1d" position={[0, -0.8, 0]} />
        <DreiOrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
      <div className="absolute inset-x-0 bottom-3 px-4 text-center text-xs font-semibold text-rose-100 drop-shadow">
        {message || "This model cannot be rendered in-browser."}
      </div>
    </>
  );
}

function FailureCube() {
  const size = 1.3;
  const faceOffset = size / 2 + 0.01;
  return (
    <group>
      <mesh scale={[size, size, size]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.45} metalness={0.1} />
      </mesh>
      <FaceCross axis="x" offset={faceOffset} />
      <FaceCross axis="x" offset={-faceOffset} />
      <FaceCross axis="y" offset={faceOffset} />
      <FaceCross axis="y" offset={-faceOffset} />
      <FaceCross axis="z" offset={faceOffset} />
      <FaceCross axis="z" offset={-faceOffset} />
    </group>
  );
}

type Axis = "x" | "y" | "z";

function FaceCross({ axis, offset }: { axis: Axis; offset: number }) {
  const span = 0.9;
  const half = span / 2;

  const mapPoint = (x: number, y: number): [number, number, number] => {
    if (axis === "x") return [offset, x, y];
    if (axis === "y") return [x, offset, y];
    return [x, y, offset];
  };

  const diagonals: [number, number, number][][] = [
    [mapPoint(-half, -half), mapPoint(half, half)],
    [mapPoint(-half, half), mapPoint(half, -half)],
  ];

  return (
    <>
      {diagonals.map((points, idx) => (
        <Line key={`${axis}-${offset}-${idx}`} points={points} color="#ffe4e6" lineWidth={2} />
      ))}
    </>
  );
}

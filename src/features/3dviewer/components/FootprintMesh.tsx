export default function FootprintMesh({ fp, idx }: { fp: any; idx: number }) {
  const x = (fp?.at?.x ?? 0) as number;
  const y = (fp?.at?.y ?? 0) as number;
  const z = 0 + (idx % 5) * 0.001;
  return (
    <mesh position={[x, y, z]}>
      <boxGeometry args={[0.5, 0.5, 0.1]} />
      <meshStandardMaterial color={fp?.placed ? "#34D399" : "#F97316"} />
    </mesh>
  );
}

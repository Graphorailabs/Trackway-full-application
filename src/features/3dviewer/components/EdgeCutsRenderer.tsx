import { useMemo } from "react";
import * as THREE from "three";
import useEdgeCuts from "../hooks/useEdgeCuts";

export default function EdgeCutsRenderer({ pcb }: { pcb: any }) {
	const shapes = useEdgeCuts(pcb);

	const extrudeSettings = useMemo(() => ({ depth: 1, bevelEnabled: false, steps: 1 }), []);

	const shapeObjects = useMemo(() => {
		return shapes.map((s) => {
			const outer = s.outer || [];
			const sh = new THREE.Shape(outer.map((p: [number, number]) => new THREE.Vector2(p[0], p[1])));
			if (Array.isArray(s.holes)) {
				for (const h of s.holes) {
					const path = new THREE.Path(h.map((p: [number, number]) => new THREE.Vector2(p[0], p[1])));
					sh.holes.push(path);
				}
			}
			return sh;
		});
	}, [shapes]);

	return (
		<group name="edgecuts">
			{shapeObjects.map((sh, i) => (
				<mesh key={i} position={[0, 0, 0]}>
					<extrudeGeometry args={[sh, extrudeSettings]} />
					<meshStandardMaterial color={0x2b7a3f} metalness={0.25} roughness={0.6} />
				</mesh>
			))}
		</group>
	);
}

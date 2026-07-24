import { memo } from "react";

type ModelDebugCubeProps = {
	position: [number, number, number];
	scale: [number, number, number];
	rotation: [number, number, number];
};

function ModelDebugCubeComponent({ position, scale, rotation }: ModelDebugCubeProps) {
	return (
		<mesh position={position} scale={scale} rotation={rotation}>
			<boxGeometry args={[4, 4, 2]} />
			<meshStandardMaterial color={0xff66aa} wireframe />
		</mesh>
	);
}

export const ModelDebugCube = memo(ModelDebugCubeComponent);

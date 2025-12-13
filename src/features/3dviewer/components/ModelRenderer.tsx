import { Suspense } from "react";
import type * as THREE from "three";
import type { Footprint } from "trackway-parser-wasm";
import { SHOW_MODEL_DEBUG_CUBE } from "../constants";
import { FootprintModelPrimitive } from "./ModelPrimitives";
import { ModelDebugCube } from "./ModelDebugCube";
import { useFootprintModelPlacement } from "./hooks/useFootprintModelPlacement";

type ModelRendererProps = {
	fp?: Footprint | null;
	bboxCenterX: number;
	bboxCenterY: number;
	isBackSide: boolean;
	idx: number;
	onModelReady?: (worldPosition: THREE.Vector3, ctx: { footprintUuid: string | null }) => void;
};
export default function ModelRenderer({ fp, bboxCenterX, bboxCenterY, isBackSide, idx, onModelReady }: ModelRendererProps) {
	const {
		groupRef,
		groupPosition,
		baseScale,
		scaledModelScale,
		cubePositionZ,
		modelPositionZ,
		alignmentOffset,
		modelRotationRad,
		debugCubeRotation,
		modelFormat,
		resolvedAsset,
		footprintUuid,
		handlePrimitiveReady,
	} = useFootprintModelPlacement({ fp, bboxCenterX, bboxCenterY, isBackSide, onModelReady });

	if (!resolvedAsset || !modelFormat) return null;

	return (
		<group ref={groupRef} position={groupPosition}>
			{SHOW_MODEL_DEBUG_CUBE ? (
				<ModelDebugCube position={[0, 0, cubePositionZ]} scale={baseScale} rotation={debugCubeRotation} />
			) : null}
			<Suspense fallback={null}>
				<group position={[alignmentOffset[0], alignmentOffset[1], modelPositionZ]}>
					<FootprintModelPrimitive
						key={`${footprintUuid ?? "fp"}-${idx}-${resolvedAsset.url}`}
						url={resolvedAsset.url}
						format={modelFormat}
						rotation={modelRotationRad}
						scale={scaledModelScale}
						doubleSided
						onObjectReady={handlePrimitiveReady}
					/>
				</group>
			</Suspense>
		</group>
	);
}

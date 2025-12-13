import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { Footprint } from "trackway-parser-wasm";
import {
	MODEL_CONTACT_OFFSET_BACK,
	MODEL_CONTACT_OFFSET_FRONT,
	MODEL_EXTRA_X_TILT_RAD,
	MODEL_SCALE_MULTIPLIER,
	MODEL_UNIT_VECTOR,
	MODEL_VERTICAL_OFFSET,
	MODEL_ZERO_VECTOR,
	BOARD_THICKNESS,
	FOOTPRINT_MODEL_SURFACE_OFFSET,
} from "../../constants";
import { useFootprintModelAsset, type FootprintModelAsset } from "./useFootprintModelAsset";
import type { FootprintModelFormat } from "../modelFormats";
import { sanitizeScale, selectRenderableModel, toNumber, toRadians, type RenderableModel } from "../utils/modelRendererUtils";

export type UseFootprintModelPlacementParams = {
	fp?: Footprint | null;
	bboxCenterX: number;
	bboxCenterY: number;
	isBackSide: boolean;
	onModelReady?: (worldPosition: THREE.Vector3, ctx: { footprintUuid: string | null }) => void;
};

export type UseFootprintModelPlacementResult = {
	groupRef: MutableRefObject<THREE.Group | null>;
	groupPosition: [number, number, number];
	baseScale: [number, number, number];
	scaledModelScale: [number, number, number];
	cubePositionZ: number;
	modelPositionZ: number;
	alignmentOffset: [number, number, number];
	modelRotationRad: [number, number, number];
	debugCubeRotation: [number, number, number];
	modelFormat: FootprintModelFormat | null;
	resolvedAsset: FootprintModelAsset;
	footprintUuid: string | null;
	handlePrimitiveReady: (object: THREE.Object3D) => void;
	modelScaleMultiplier: number;
};

export function useFootprintModelPlacement({ fp, bboxCenterX, bboxCenterY, isBackSide, onModelReady }: UseFootprintModelPlacementParams): UseFootprintModelPlacementResult {
	const targetModel = useMemo<RenderableModel | null>(() => selectRenderableModel(fp), [fp]);
	const resolvedAsset = useFootprintModelAsset(targetModel, fp?.library_link ?? null);
	const groupRef = useRef<THREE.Group>(null);
	const [modelLocalCenter, setModelLocalCenter] = useState<THREE.Vector3 | null>(null);
	const [modelScaleMultiplier, setModelScaleMultiplier] = useState(1);
	const [modelContactPlaneBase, setModelContactPlaneBase] = useState<number | null>(null);
	const scaleComputedRef = useRef<string | null>(null);

	const footprintUuid = fp?.uuid ?? null;
	const libraryLink = fp?.library_link ?? null;
	const modelFormat = resolvedAsset?.format ?? targetModel?.format ?? null;
	const translation = targetModel?.entry.translation ?? null;
	const rotation = targetModel?.entry.rotation ?? MODEL_ZERO_VECTOR;
	const scale = targetModel?.entry.scale ?? MODEL_UNIT_VECTOR;
	const scaleX = sanitizeScale(scale.x);
	const scaleY = sanitizeScale(scale.y);
	const scaleZ = sanitizeScale(scale.z);
	const rotationRad: [number, number, number] = [toRadians(rotation.x), toRadians(rotation.y), toRadians(rotation.z)];
	const footprintAngleRad = toRadians(fp?.at?.angle ?? 0);
	const footprintYRotation = isBackSide ? -footprintAngleRad : footprintAngleRad;
	const modelExtraTilt = isBackSide ? -MODEL_EXTRA_X_TILT_RAD : MODEL_EXTRA_X_TILT_RAD;
	const modelRotationRad: [number, number, number] = [rotationRad[0] + modelExtraTilt, rotationRad[1] + footprintYRotation, rotationRad[2]];
	const translationX = toNumber(translation?.x, MODEL_ZERO_VECTOR.x);
	const translationY = toNumber(translation?.y, MODEL_ZERO_VECTOR.y);
	const translationZ = toNumber(translation?.z, MODEL_ZERO_VECTOR.z);
	const offsetX = translationX;
	const offsetY = translationY;
	const offsetZ = translationZ;
	const baseZ = isBackSide ? -(BOARD_THICKNESS + FOOTPRINT_MODEL_SURFACE_OFFSET) : FOOTPRINT_MODEL_SURFACE_OFFSET;
	const localZ = baseZ + offsetZ;
	const cubePositionZ = scaleZ + MODEL_VERTICAL_OFFSET;
	const modelPositionZ = MODEL_VERTICAL_OFFSET - (isBackSide ? MODEL_CONTACT_OFFSET_BACK : MODEL_CONTACT_OFFSET_FRONT);
	const alignmentOffset = useMemo<[number, number, number]>(() => {
		if (!modelLocalCenter) return [0, 0, 0];
		const contactPlane = modelContactPlaneBase ?? modelLocalCenter.z;
		return [
			-modelLocalCenter.x * modelScaleMultiplier,
			-modelLocalCenter.y * modelScaleMultiplier,
			-contactPlane * modelScaleMultiplier,
		];
	}, [modelLocalCenter, modelScaleMultiplier, modelContactPlaneBase]);

	const handlePrimitiveReady = useCallback(
		(object: THREE.Object3D) => {
			if (!groupRef.current) return;
			object.updateWorldMatrix?.(true, true);
			const bbox = new THREE.Box3().setFromObject(object);
			if (!bbox || !isFinite(bbox.min.x) || !isFinite(bbox.min.y) || !isFinite(bbox.min.z)) return;
			const worldCenter = bbox.getCenter(new THREE.Vector3());
			const localCenter = worldCenter.clone();
			groupRef.current.worldToLocal(localCenter);
			setModelLocalCenter(localCenter.clone());
			const size = bbox.getSize(new THREE.Vector3());
			const minLocal = bbox.min.clone();
			const maxLocal = bbox.max.clone();
			groupRef.current.worldToLocal(minLocal);
			groupRef.current.worldToLocal(maxLocal);
			const boardFacingZ = Math.abs(minLocal.z) <= Math.abs(maxLocal.z) ? minLocal.z : maxLocal.z;
			setModelContactPlaneBase(boardFacingZ);
			const cubeSizeMax = Math.max(4 * scaleX, 4 * scaleY, 2 * scaleZ);
			const modelSizeMax = Math.max(size.x || 0, size.y || 0, size.z || 0);
			if (resolvedAsset?.url && modelSizeMax > 0 && cubeSizeMax > 0) {
				const multiplier = (cubeSizeMax / modelSizeMax) * MODEL_SCALE_MULTIPLIER;
				if (multiplier > 0 && scaleComputedRef.current !== resolvedAsset.url) {
					scaleComputedRef.current = resolvedAsset.url;
					setModelScaleMultiplier(multiplier);
				}
			}
			console.log("[3DViewer] Footprint model bounds", {
				footprintUuid,
				size: size.toArray(),
				centerLocal: localCenter.toArray(),
				modelSizeMax,
				cubeSizeMax,
				modelScaleMultiplierEstimate: resolvedAsset?.url && modelSizeMax > 0 ? cubeSizeMax / modelSizeMax : null,
			});
		},
		[footprintUuid, resolvedAsset?.url, scaleX, scaleY, scaleZ],
	);

	useEffect(() => {
		console.log("[3DViewer] Footprint model candidate", {
			footprintUuid,
			libraryLink,
			path: targetModel?.path ?? null,
			format: targetModel?.format ?? null,
			assetResolved: Boolean(resolvedAsset),
		});
	}, [footprintUuid, libraryLink, targetModel?.path, targetModel?.format, resolvedAsset]);

	useEffect(() => {
		if (!targetModel && libraryLink) {
			console.log("[3DViewer] Missing explicit footprint model, falling back to library link", {
				footprintUuid,
				libraryLink,
			});
		}
	}, [targetModel, footprintUuid, libraryLink]);

	useEffect(() => {
		if (!resolvedAsset) return;
		console.log("[3DViewer] Rendering footprint model", {
			footprintUuid,
			libraryLink,
			path: targetModel?.path ?? null,
			format: modelFormat,
			resolvedUrl: resolvedAsset.url,
			resolvedSourceName: resolvedAsset.sourceName ?? null,
			offsetX,
			offsetY,
			translation,
			resolvedTranslation: { x: translationX, y: translationY, z: translationZ },
			rotation,
			scale,
			isBackSide,
		});
	}, [resolvedAsset, footprintUuid, libraryLink, targetModel?.path, modelFormat, offsetX, offsetY, translation, translationX, translationY, translationZ, rotation, scale, isBackSide]);

	useEffect(() => {
		if (!resolvedAsset || !onModelReady || !groupRef.current || !modelLocalCenter) return;
		groupRef.current.updateMatrixWorld(true);
		const scaledCenter = modelLocalCenter.clone().multiplyScalar(modelScaleMultiplier);
		const worldPos = groupRef.current.localToWorld(scaledCenter);
		onModelReady(worldPos, { footprintUuid });
	}, [resolvedAsset, onModelReady, footprintUuid, modelLocalCenter, modelScaleMultiplier, offsetX, offsetY, localZ]);

	useEffect(() => {
		setModelLocalCenter(null);
		scaleComputedRef.current = null;
		setModelScaleMultiplier(1);
		setModelContactPlaneBase(null);
	}, [resolvedAsset?.url]);

	const groupPosition: [number, number, number] = [offsetX, offsetY, localZ];
	const baseScale: [number, number, number] = [scaleX, scaleY, scaleZ];
	const scaledModelScale: [number, number, number] = [scaleX * modelScaleMultiplier, scaleY * modelScaleMultiplier, scaleZ * modelScaleMultiplier];

	return {
		groupRef,
		groupPosition,
		baseScale,
		scaledModelScale,
		cubePositionZ,
		modelPositionZ,
		alignmentOffset,
		modelRotationRad,
		debugCubeRotation: rotationRad,
		modelFormat,
		resolvedAsset,
		footprintUuid,
		handlePrimitiveReady,
		modelScaleMultiplier,
	};
}

import * as THREE from "three";

if ((THREE as any).ColorManagement) {
  (THREE as any).ColorManagement.enabled = true;
}

export const SUPPORTED_FORMATS = ["glb", "obj", "stl", "ply"] as const;

export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

export const DEFAULT_MATERIAL_PROPS: THREE.MeshStandardMaterialParameters = {
  color: 0x9cc3ff,
  metalness: 0.2,
  roughness: 0.55,
};

export const DEFAULT_MATERIAL_COLOR = new THREE.Color(DEFAULT_MATERIAL_PROPS.color as number);

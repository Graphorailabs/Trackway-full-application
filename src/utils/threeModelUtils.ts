import * as THREE from "three";

if ((THREE as any).ColorManagement) {
  (THREE as any).ColorManagement.enabled = true;
}

export const DEFAULT_MATERIAL_PROPS: THREE.MeshStandardMaterialParameters = {
  color: 0x9cc3ff,
  metalness: 0.2,
  roughness: 0.55,
};

export const DEFAULT_MATERIAL_COLOR = new THREE.Color(DEFAULT_MATERIAL_PROPS.color as number);

type MaterialOptions = {
  doubleSided?: boolean;
};

export function ensureFallbackMaterial(root: THREE.Object3D | null, options?: MaterialOptions) {
  if (!root) return;
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (!mesh.material) {
        mesh.material = new THREE.MeshStandardMaterial(DEFAULT_MATERIAL_PROPS);
      }
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((mat) => ensureReadableMaterial(mat, options));
      } else {
        mesh.material = ensureReadableMaterial(mesh.material, options);
      }
    }
  });
}

export function ensureReadableMaterial(material: THREE.Material, options?: MaterialOptions): THREE.MeshStandardMaterial {
  if (!("color" in material)) {
    material.dispose?.();
    const next = new THREE.MeshStandardMaterial(DEFAULT_MATERIAL_PROPS);
    if (options?.doubleSided) next.side = THREE.DoubleSide;
    return next;
  }

  const meshMaterial = material as THREE.MeshStandardMaterial;
  applySrgbTexture(meshMaterial.map);
  applySrgbTexture(meshMaterial.emissiveMap);
  applySrgbTexture(meshMaterial.roughnessMap);
  applySrgbTexture(meshMaterial.metalnessMap);
  meshMaterial.side = options?.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
  meshMaterial.toneMapped = true;

  // We trust the loaded material properties.
  // Overriding them causes loss of color/texture fidelity for valid models.
  // Lighting is handled by <Environment /> in the scene.
  
  /*
  const hasTexture = Boolean(
    meshMaterial.map || meshMaterial.emissiveMap || meshMaterial.metalnessMap || meshMaterial.vertexColors,
  );
  const colorIsDark = meshMaterial.color.r < 0.07 && meshMaterial.color.g < 0.07 && meshMaterial.color.b < 0.07;

  // Only override if the material has NO texture AND is extremely dark.
  // Previously this was an OR, which caused textured models with black base color to be overridden.
  if (!hasTexture && colorIsDark) {
    meshMaterial.color.copy(DEFAULT_MATERIAL_COLOR);
    meshMaterial.metalness = DEFAULT_MATERIAL_PROPS.metalness ?? meshMaterial.metalness;
    meshMaterial.roughness = DEFAULT_MATERIAL_PROPS.roughness ?? meshMaterial.roughness;
    meshMaterial.vertexColors = false;
    meshMaterial.emissive.set(0x0);
    meshMaterial.opacity = 1;
    meshMaterial.transparent = false;
  }
  */

  meshMaterial.needsUpdate = true;
  return meshMaterial;
}

export function applySrgbTexture(texture?: THREE.Texture | null) {
  if (!texture) return;
  const tex = texture as THREE.Texture & { colorSpace?: string; encoding?: number };
  if ("colorSpace" in tex && tex.colorSpace !== THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return;
  }
  const srgbEncoding = (THREE as any).sRGBEncoding;
  if (srgbEncoding && "encoding" in tex && tex.encoding !== srgbEncoding) {
    tex.encoding = srgbEncoding;
    tex.needsUpdate = true;
  }
}

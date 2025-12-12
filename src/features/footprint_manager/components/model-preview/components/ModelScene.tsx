import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader, OBJLoader, PLYLoader, STLLoader } from "three-stdlib";
import { DEFAULT_MATERIAL_COLOR, DEFAULT_MATERIAL_PROPS, type SupportedFormat } from "../constants";
import { useAutoFit } from "../hooks/useAutoFit";
import { useDisposableMesh } from "../hooks/useDisposableMesh";

export function ModelScene({ url, format }: { url: string; format: SupportedFormat }) {
  if (format === "glb") return <GltfModel url={url} />;
  if (format === "obj") return <ObjModel url={url} />;
  if (format === "stl") return <StlModel url={url} />;
  if (format === "ply") return <PlyModel url={url} />;
  return null;
}

function GltfModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  const object = useMemo(() => gltf.scene.clone(true), [gltf]);
  useEffect(() => {
    ensureFallbackMaterial(object);
  }, [object]);
  useAutoFit(object);
  return object ? <primitive object={object} /> : null;
}

function ObjModel({ url }: { url: string }) {
  const group = useLoader(OBJLoader, url);
  const object = useMemo(() => group.clone(true), [group]);
  useEffect(() => {
    ensureFallbackMaterial(object);
  }, [object]);
  useAutoFit(object);
  return object ? <primitive object={object} /> : null;
}

function StlModel({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url);
  const mesh = useMemo(() => {
    const geom = geometry.clone();
    geom.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial(DEFAULT_MATERIAL_PROPS);
    return new THREE.Mesh(geom, material);
  }, [geometry]);
  useAutoFit(mesh);
  useDisposableMesh(mesh);
  return mesh ? <primitive object={mesh} /> : null;
}

function PlyModel({ url }: { url: string }) {
  const geometry = useLoader(PLYLoader, url);
  const mesh = useMemo(() => {
    const geom = geometry.clone();
    geom.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial(DEFAULT_MATERIAL_PROPS);
    return new THREE.Mesh(geom, material);
  }, [geometry]);
  useAutoFit(mesh);
  useDisposableMesh(mesh);
  return mesh ? <primitive object={mesh} /> : null;
}

function ensureFallbackMaterial(root: THREE.Object3D | null) {
  if (!root) return;
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (!mesh.material) {
        mesh.material = new THREE.MeshStandardMaterial(DEFAULT_MATERIAL_PROPS);
        return;
      }
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((mat) => ensureReadableMaterial(mat));
      } else {
        mesh.material = ensureReadableMaterial(mesh.material);
      }
    }
  });
}

function ensureReadableMaterial(material: THREE.Material): THREE.Material {
  if (!("color" in material)) {
    material.dispose?.();
    return new THREE.MeshStandardMaterial(DEFAULT_MATERIAL_PROPS);
  }

  const meshMaterial = material as THREE.MeshStandardMaterial;
  applySrgbTexture(meshMaterial.map);
  applySrgbTexture(meshMaterial.emissiveMap);
  applySrgbTexture(meshMaterial.roughnessMap);
  applySrgbTexture(meshMaterial.metalnessMap);
  meshMaterial.side = THREE.FrontSide;
  meshMaterial.toneMapped = true;

  const hasTexture = Boolean(
    meshMaterial.map || meshMaterial.emissiveMap || meshMaterial.metalnessMap || meshMaterial.vertexColors
  );
  const colorIsDark = meshMaterial.color.r < 0.07 && meshMaterial.color.g < 0.07 && meshMaterial.color.b < 0.07;

  if (!hasTexture || colorIsDark) {
    meshMaterial.color.copy(DEFAULT_MATERIAL_COLOR);
    meshMaterial.metalness = DEFAULT_MATERIAL_PROPS.metalness ?? meshMaterial.metalness;
    meshMaterial.roughness = DEFAULT_MATERIAL_PROPS.roughness ?? meshMaterial.roughness;
    meshMaterial.vertexColors = false;
    meshMaterial.emissive.set(0x0);
    meshMaterial.opacity = 1;
    meshMaterial.transparent = false;
  }

  meshMaterial.needsUpdate = true;
  return meshMaterial;
}

function applySrgbTexture(texture?: THREE.Texture | null) {
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

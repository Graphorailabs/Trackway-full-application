import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader, OBJLoader, PLYLoader, STLLoader } from "three-stdlib";
import { DEFAULT_MATERIAL_PROPS, ensureFallbackMaterial } from "@/utils/threeModelUtils";
import type { FootprintModelFormat } from "./modelFormats";

type FootprintModelPrimitiveProps = {
  url: string;
  format: FootprintModelFormat;
  rotation: [number, number, number];
  scale: [number, number, number];
  doubleSided: boolean;
  onObjectReady?: (object: THREE.Object3D) => void;
};

export function FootprintModelPrimitive({ url, format, rotation, scale, doubleSided, onObjectReady }: FootprintModelPrimitiveProps) {
  if (format === "glb") return <GltfPrimitive url={url} rotation={rotation} scale={scale} doubleSided={doubleSided} onObjectReady={onObjectReady} />;
  if (format === "obj") return <ObjPrimitive url={url} rotation={rotation} scale={scale} doubleSided={doubleSided} onObjectReady={onObjectReady} />;
  if (format === "stl") return <StlPrimitive url={url} rotation={rotation} scale={scale} doubleSided={doubleSided} onObjectReady={onObjectReady} />;
  if (format === "ply") return <PlyPrimitive url={url} rotation={rotation} scale={scale} doubleSided={doubleSided} onObjectReady={onObjectReady} />;
  return null;
}

function GltfPrimitive({ url, rotation, scale, doubleSided, onObjectReady }: Omit<FootprintModelPrimitiveProps, "format">) {
  const gltf = useLoader(GLTFLoader, url);
  const object = useMemo(() => gltf.scene.clone(true), [gltf]);

  useEffect(() => {
    ensureFallbackMaterial(object, { doubleSided });
    disableFrustumCulling(object);
    if (object) onObjectReady?.(object);
  }, [object, doubleSided, onObjectReady]);

  return object ? <primitive object={object} rotation={rotation} scale={scale} frustumCulled={false} /> : null;
}

function ObjPrimitive({ url, rotation, scale, doubleSided, onObjectReady }: Omit<FootprintModelPrimitiveProps, "format">) {
  const group = useLoader(OBJLoader, url);
  const object = useMemo(() => group.clone(true), [group]);

  useEffect(() => {
    ensureFallbackMaterial(object, { doubleSided });
    disableFrustumCulling(object);
    if (object) onObjectReady?.(object);
  }, [object, doubleSided, onObjectReady]);

  return object ? <primitive object={object} rotation={rotation} scale={scale} frustumCulled={false} /> : null;
}

function StlPrimitive({ url, rotation, scale, doubleSided, onObjectReady }: Omit<FootprintModelPrimitiveProps, "format">) {
  const geometry = useLoader(STLLoader, url);
  const mesh = useMemo(() => {
    const geom = geometry.clone();
    geom.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial(DEFAULT_MATERIAL_PROPS);
    return new THREE.Mesh(geom, material);
  }, [geometry]);

  useEffect(() => {
    ensureFallbackMaterial(mesh, { doubleSided });
    disableFrustumCulling(mesh);
    if (mesh) onObjectReady?.(mesh);
    return () => {
      mesh.geometry?.dispose?.();
      if (Array.isArray(mesh.material)) mesh.material.forEach((mat) => mat?.dispose?.());
      else mesh.material?.dispose?.();
    };
  }, [mesh, doubleSided, onObjectReady]);

  return mesh ? <primitive object={mesh} rotation={rotation} scale={scale} frustumCulled={false} /> : null;
}

function PlyPrimitive({ url, rotation, scale, doubleSided, onObjectReady }: Omit<FootprintModelPrimitiveProps, "format">) {
  const geometry = useLoader(PLYLoader, url);
  const mesh = useMemo(() => {
    const geom = geometry.clone();
    geom.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial(DEFAULT_MATERIAL_PROPS);
    return new THREE.Mesh(geom, material);
  }, [geometry]);

  useEffect(() => {
    ensureFallbackMaterial(mesh, { doubleSided });
    disableFrustumCulling(mesh);
    if (mesh) onObjectReady?.(mesh);
    return () => {
      mesh.geometry?.dispose?.();
      if (Array.isArray(mesh.material)) mesh.material.forEach((mat) => mat?.dispose?.());
      else mesh.material?.dispose?.();
    };
  }, [mesh, doubleSided, onObjectReady]);

  return mesh ? <primitive object={mesh} rotation={rotation} scale={scale} frustumCulled={false} /> : null;
}

function disableFrustumCulling(object: THREE.Object3D | null) {
  object?.traverse((child) => {
    child.frustumCulled = false;
  });
}

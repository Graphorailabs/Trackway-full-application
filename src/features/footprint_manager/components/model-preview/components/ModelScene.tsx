import { useEffect, useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader, OBJLoader, PLYLoader, STLLoader } from "three-stdlib";
import { DEFAULT_MATERIAL_PROPS, type SupportedFormat } from "../constants";
import { ensureFallbackMaterial } from "@/utils/threeModelUtils";
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


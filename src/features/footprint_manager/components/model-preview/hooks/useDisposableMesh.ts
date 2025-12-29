import { useEffect } from "react";
import * as THREE from "three";

export function useDisposableMesh(mesh: THREE.Mesh | null) {
  useEffect(() => {
    if (!mesh) return;
    return () => {
      mesh.geometry?.dispose?.();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat?.dispose?.());
      } else {
        mesh.material?.dispose?.();
      }
    };
  }, [mesh]);
}

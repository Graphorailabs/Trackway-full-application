import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export function useAutoFit(object: THREE.Object3D | null) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | undefined;

  useEffect(() => {
    if (!object || !(camera instanceof THREE.PerspectiveCamera)) return;
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    if (!isFinite(size.x + size.y + size.z)) return;

    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.01);
    const fitHeightDistance = maxDim / (2 * Math.tan((camera.fov * Math.PI) / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = 1.2 * Math.max(fitHeightDistance, fitWidthDistance);

    const direction = new THREE.Vector3(1, 0.8, 1).normalize();
    const newPos = center.clone().add(direction.multiplyScalar(distance));

    camera.position.copy(newPos);
    camera.near = Math.max(0.01, distance / 100);
    camera.far = Math.max(distance * 20, camera.near + 1);
    camera.updateProjectionMatrix();

    controls?.target.copy(center);
    controls?.update();
  }, [object, camera, controls]);
}

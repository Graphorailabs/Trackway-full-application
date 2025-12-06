import { useMemo, useRef, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import FootprintMesh from "./FootprintMesh";
import EdgeCutsRenderer from "./EdgeCutsRenderer";
import FrontCopperRenderer from "./FrontCopperRenderer";
import ViaRenderer from "./ViaRenderer";
import BackCopperRenderer from "./BackCopperRenderer";

export default function SceneContents({ pcb }: { pcb: any }) {
  const { camera, gl, scene } = useThree();
  const controlsRef = useRef<any>(null);
  const ray = useRef(new THREE.Raycaster());

  const footprints = useMemo(() => pcb?.footprints ?? [], [pcb]);

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: Event) => {
      const ev = e as WheelEvent;
      if (!camera || !controlsRef.current) return;
      ev.preventDefault();
      const rect = el.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ray.current.setFromCamera(new THREE.Vector2(x, y), camera);

      const intersects = ray.current.intersectObjects(scene.children, true);
      let point: THREE.Vector3 | null = null;
      if (intersects.length) point = intersects[0].point.clone();
      else {
        const origin = ray.current.ray.origin.clone();
        const dir = ray.current.ray.direction.clone();
        if (Math.abs(dir.z) > 1e-6) {
          const t = (0 - origin.z) / dir.z;
          point = origin.add(dir.multiplyScalar(t));
        } else {
          point = origin;
        }
      }

      const zoomSpeed = 0.0015;
      const factor = Math.exp(ev.deltaY * zoomSpeed);

      const camPos = camera.position.clone();
      const newCamPos = point.clone().add(camPos.sub(point).multiplyScalar(factor));
      camera.position.copy(newCamPos);

      const tgt = controlsRef.current.target.clone();
      const newTgt = point.clone().add(tgt.sub(point).multiplyScalar(factor));
      controlsRef.current.target.copy(newTgt);

      controlsRef.current.update();
    };
    el.addEventListener("wheel", onWheel as EventListener, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as EventListener);
  }, [gl, camera, scene]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />

      <EdgeCutsRenderer pcb={pcb} />
      <BackCopperRenderer pcb={pcb} />
      <FrontCopperRenderer pcb={pcb} />
      <ViaRenderer pcb={pcb} />
      {footprints.map((fp: any, idx: number) => (
        <FootprintMesh key={fp.uuid ?? idx} fp={fp} idx={idx} />
      ))}

      <OrbitControls ref={controlsRef} />
    </>
  );
}

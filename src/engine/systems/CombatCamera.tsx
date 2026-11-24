import { useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useGameStore } from '../../store/gameStore';

export interface LiveVec3 {
  x: number;
  y: number;
  z: number;
}

interface CombatCameraProps {
  janePosRef: MutableRefObject<LiveVec3>;
  henryPosRef: MutableRefObject<LiveVec3>;
  shakeRef: MutableRefObject<number>;
  threatPointerRef: MutableRefObject<HTMLDivElement | null>;
}

const desiredPos = new Vector3();
const desiredLook = new Vector3();
const projectedHenry = new Vector3();

export function CombatCamera({
  janePosRef,
  henryPosRef,
  shakeRef,
  threatPointerRef,
}: CombatCameraProps) {
  const { camera } = useThree();
  const initializedRef = useRef(false);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const state = useGameStore.getState();
    const jPos = janePosRef.current;
    const hPos = henryPosRef.current;

    const overdrivePull = state.phase === 'overdrive' ? -1.4 : 0;
    const heightBoost = Math.max(0, (jPos.y - 1.2) * 0.65);

    let shakeX = 0;
    let shakeY = 0;
    if (shakeRef.current > 0.001) {
      const mag = shakeRef.current;
      shakeX = Math.sin(performance.now() * 0.055) * mag;
      shakeY = Math.cos(performance.now() * 0.072) * mag * 0.7;
      shakeRef.current = Math.max(0, shakeRef.current - dt * 1.8);
    }

    desiredPos.set(
      jPos.x + shakeX,
      10.8 + heightBoost + shakeY,
      jPos.z + 15.2 + overdrivePull
    );
    desiredLook.set(jPos.x, jPos.y + 0.6, jPos.z - 5.5);

    if (!initializedRef.current) {
      camera.position.copy(desiredPos);
      camera.lookAt(desiredLook);
      initializedRef.current = true;
    } else {
      const alpha = 1 - Math.exp(-dt * 6.5);
      camera.position.lerp(desiredPos, alpha);
      camera.lookAt(desiredLook);
    }

    const pointerEl = threatPointerRef.current;
    if (pointerEl) {
      const distSq =
        (hPos.x - jPos.x) * (hPos.x - jPos.x) + (hPos.z - jPos.z) * (hPos.z - jPos.z);

      if (distSq < 110 || state.phase === 'victory' || state.phase === 'defeat') {
        pointerEl.style.opacity = '0';
      } else {
        projectedHenry.set(hPos.x, hPos.y + 0.6, hPos.z).project(camera);

        let sx = projectedHenry.x;
        let sy = projectedHenry.y;

        if (projectedHenry.z > 1) {
          sx = -sx;
          sy = -sy;
        }

        const angleRad = Math.atan2(sy, sx);
        const angleDeg = (angleRad * 180) / Math.PI;
        const radiusX = Math.min(window.innerWidth * 0.38, 420);
        const radiusY = Math.min(window.innerHeight * 0.34, 280);

        const px = Math.cos(angleRad) * radiusX;
        const py = -Math.sin(angleRad) * radiusY;

        pointerEl.style.opacity = state.phase === 'overdrive' ? '0.95' : '0.72';
        pointerEl.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) rotate(${(90 - angleDeg).toFixed(1)}deg)`;
      }
    }
  });

  return null;
}

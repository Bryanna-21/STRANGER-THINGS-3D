import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Object3D, type InstancedMesh } from 'three';
import { useGameStore } from '../../store/gameStore';

const SPORE_COUNT = 320;
const dummy = new Object3D();

export function SporeField() {
  const meshRef = useRef<InstancedMesh | null>(null);
  const clockRef = useRef(0);
  const upsideDown = useGameStore((s) => s.upsideDown);

  const seeds = useMemo(() => {
    const baseX = new Float32Array(SPORE_COUNT);
    const baseY = new Float32Array(SPORE_COUNT);
    const baseZ = new Float32Array(SPORE_COUNT);
    const phase = new Float32Array(SPORE_COUNT);
    const scale = new Float32Array(SPORE_COUNT);

    for (let i = 0; i < SPORE_COUNT; i++) {
      const s1 = Math.sin(i * 12.9898) * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const s2 = Math.sin(i * 78.233) * 43758.5453;
      const r2 = s2 - Math.floor(s2);
      const s3 = Math.sin(i * 39.425) * 43758.5453;
      const r3 = s3 - Math.floor(s3);

      baseX[i] = (r1 - 0.5) * 120;
      baseY[i] = 0.6 + r2 * 18;
      baseZ[i] = (r3 - 0.5) * 120;
      phase[i] = r1 * Math.PI * 2;
      scale[i] = 0.04 + r2 * 0.065;
    }

    return { baseX, baseY, baseZ, phase, scale };
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    return () => {
      mesh?.geometry.dispose();
      if (Array.isArray(mesh?.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh?.material.dispose();
      }
    };
  }, []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dt = Math.min(delta, 0.05);
    const state = useGameStore.getState();
    const surgeActive = state.phase === 'overdrive' || state.upsideDown;
    clockRef.current += dt * (surgeActive ? 2.5 : 1.0);
    const t = clockRef.current;
    const scaleBoost = surgeActive ? (state.level >= 4 ? 1.9 : state.level >= 3 ? 1.65 : 1.45) : 1.0;

    for (let i = 0; i < SPORE_COUNT; i++) {
      const p = seeds.phase[i];
      const x = seeds.baseX[i] + Math.sin(t * 0.55 + p) * 0.95;
      const y = seeds.baseY[i] + Math.cos(t * 0.75 + p * 1.3) * 0.65;
      const z = seeds.baseZ[i] + Math.cos(t * 0.45 + p * 0.7) * 0.95;

      dummy.position.set(x, y, z);
      dummy.scale.setScalar(seeds.scale[i] * scaleBoost);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, SPORE_COUNT]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial
        color={upsideDown ? '#ff5c8a' : '#d98aff'}
        transparent
        opacity={upsideDown ? 0.62 : 0.45}
      />
    </instancedMesh>
  );
}

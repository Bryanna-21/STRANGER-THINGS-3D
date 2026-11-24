import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Fog, type DirectionalLight, type PointLight } from 'three';
import { useGameStore } from '../../store/gameStore';

const duskBg = new Color('#1c2438');
const level2Bg = new Color('#261830');
const upsideDownBg = new Color('#19070f');
const finalLevelBg = new Color('#110308');

const normalRiftColor = new Color('#9d4edd');
const overdriveRiftColor = new Color('#ff2a55');

const warmKeyColor = new Color('#ffe5b4');
const upsideKeyColor = new Color('#ff5c77');

export function ArenaLighting() {
  const { scene } = useThree();
  const riftLightRef = useRef<PointLight | null>(null);
  const dirLightRef = useRef<DirectionalLight | null>(null);
  const pulseClockRef = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const state = useGameStore.getState();
    const isOverdrive = state.phase === 'overdrive';
    const isUpsideDown = state.upsideDown || state.level >= 3 || isOverdrive;

    const targetBg = state.level >= 4
      ? finalLevelBg
      : isUpsideDown
        ? upsideDownBg
        : state.level === 2
          ? level2Bg
          : duskBg;

    const alpha = 1 - Math.exp(-dt * 3.5);
    if (scene.background instanceof Color) {
      scene.background.lerp(targetBg, alpha);
    }
    if (scene.fog instanceof Fog) {
      scene.fog.color.lerp(targetBg, alpha);
      const targetNear = isUpsideDown ? 26 : 34;
      const targetFar = isUpsideDown ? 90 : 108;
      scene.fog.near += (targetNear - scene.fog.near) * alpha;
      scene.fog.far += (targetFar - scene.fog.far) * alpha;
    }

    pulseClockRef.current += dt * (state.level >= 4 ? 9.5 : isUpsideDown ? 7.2 : state.level === 2 ? 4.8 : 3.0);

    if (riftLightRef.current) {
      riftLightRef.current.color.copy(isUpsideDown ? overdriveRiftColor : normalRiftColor);
      const baseIntensity = state.level >= 4 ? 9.4 : isUpsideDown ? 7.6 : state.level === 2 ? 5.8 : 4.5;
      const wave = Math.sin(pulseClockRef.current) * (isUpsideDown ? 1.9 : 0.65);
      riftLightRef.current.intensity = Math.max(1.5, baseIntensity + wave);
    }

    if (dirLightRef.current) {
      dirLightRef.current.color.lerp(isUpsideDown ? upsideKeyColor : warmKeyColor, alpha);
      dirLightRef.current.intensity = isUpsideDown ? 1.55 : 1.85;
    }
  });

  return (
    <>
      <hemisphereLight args={['#7d94cc', '#273b2a', 1.0]} />
      <ambientLight intensity={0.42} />
      <directionalLight
        ref={dirLightRef}
        position={[20, 32, 18]}
        intensity={1.85}
        color="#ffe5b4"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={2}
        shadow-camera-far={110}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-bias={-0.0004}
      />
      <pointLight
        ref={riftLightRef}
        position={[0, 4.5, -12]}
        color="#9d4edd"
        intensity={4.5}
        distance={28}
        decay={2}
      />
    </>
  );
}

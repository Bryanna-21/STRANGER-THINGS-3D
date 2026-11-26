import { useGameStore } from './store/gameStore';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { HawkinsWorld } from './engine/entities/HawkinsWorld';
import { Combatants } from './engine/entities/Combatants';
import { SporeField } from './engine/entities/SporeField';
import { InvestigationNodes } from './engine/entities/InvestigationNodes';
import { InputController } from './engine/systems/inputController';
import { CombatCamera, type LiveVec3 } from './engine/systems/CombatCamera';
import { ArenaLighting } from './engine/systems/ArenaLighting';
import { CombatAudio } from './engine/systems/combatAudio';
import { CombatHud } from './ui/hud/CombatHud';

export function App() {
  const level = useGameStore((s) => s.level);
  const [input] = useState(() => new InputController());
  const [audio] = useState(() => new CombatAudio());
  const janePosRef = useRef<LiveVec3>({ x: 0, y: 1.2, z: 6 });
  const henryPosRef = useRef<LiveVec3>({ x: 0, y: 1.2, z: -6 });
  const shakeRef = useRef(0);
  const threatPointerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      input.dispose();
      audio.dispose();
    };
  }, [input, audio]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#1c2438',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 10.8, 21.2], fov: 52, near: 0.2, far: 260 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.06,
        }}
      >
        <color attach="background" args={['#1c2438']} />
        <fog attach="fog" args={['#1c2438', 34, 108]} />

        <Environment resolution={256} frames={1}>
          <Lightformer
            form="rect"
            intensity={1.6}
            color="#ffe5b4"
            position={[0, 18, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[40, 40, 1]}
          />
          <Lightformer
            form="ring"
            intensity={1.2}
            color="#9d4edd"
            position={[-18, 10, -18]}
            scale={18}
          />
          <Lightformer
            form="rect"
            intensity={0.9}
            color="#4cc9f0"
            position={[22, 8, 16]}
            scale={[22, 10, 1]}
          />
        </Environment>

        <ArenaLighting />
        <SporeField />
        <InvestigationNodes key={level} janePosRef={janePosRef} />

        <Physics gravity={[0, -9.81, 0]}>
          <HawkinsWorld />
          <Combatants
            input={input}
            janePosRef={janePosRef}
            henryPosRef={henryPosRef}
            shakeRef={shakeRef}
            audio={audio}
          />
        </Physics>

        <CombatCamera
          janePosRef={janePosRef}
          henryPosRef={henryPosRef}
          shakeRef={shakeRef}
          threatPointerRef={threatPointerRef}
        />
      </Canvas>

      <CombatHud input={input} audio={audio} threatPointerRef={threatPointerRef} />
    </div>
  );
}

export default App;

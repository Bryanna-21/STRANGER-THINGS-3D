import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { useGameStore } from '../../store/gameStore';
import type { LiveVec3 } from '../systems/CombatCamera';

interface InvestigationNodesProps {
  janePosRef: { current: LiveVec3 };
}

const NODE_POSITIONS: [number, number, number][] = [
  [-22, 0.95, 20],
  [24, 0.95, -22],
  [-24, 0.95, -24],
  [22, 0.95, 20],
];

const COLLECT_RADIUS = 2.75;

export function InvestigationNodes({ janePosRef }: InvestigationNodesProps) {
  const level = useGameStore((s) => s.level);
  const cluesRequired = useGameStore((s) => s.cluesRequired);
  const cluesCollected = useGameStore((s) => s.cluesCollected);
  const collectClue = useGameStore((s) => s.collectClue);

  const [collectedMask, setCollectedMask] = useState<boolean[]>([false, false, false, false]);
  const meshRefs = useRef<(Mesh | null)[]>([]);
  const spinRef = useRef(0);

  const activeNodes = useMemo(
    () => NODE_POSITIONS.slice(0, Math.min(NODE_POSITIONS.length, cluesRequired)),
    [cluesRequired]
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    spinRef.current += dt * 2.2;

    const jx = janePosRef.current.x;
    const jz = janePosRef.current.z;

    for (let i = 0; i < activeNodes.length; i++) {
      const m = meshRefs.current[i];
      const [nx, ny, nz] = activeNodes[i];

      if (m) {
        m.rotation.y = spinRef.current + i;
        m.position.y = ny + Math.sin(spinRef.current * 1.4 + i) * 0.14;
      }

      if (!collectedMask[i] && cluesCollected < cluesRequired) {
        const dist = Math.hypot(jx - nx, jz - nz);
        if (dist <= COLLECT_RADIUS) {
          setCollectedMask((prev) => {
            if (prev[i]) return prev;
            const next = [...prev];
            next[i] = true;
            return next;
          });
          collectClue();
        }
      }
    }
  });

  return (
    <group name="investigation-nodes">
      {activeNodes.map((pos, idx) => {
        if (collectedMask[idx]) return null;
        return (
          <mesh
            key={`clue-${level}-${idx}`}
            ref={(el) => {
              meshRefs.current[idx] = el;
            }}
            position={pos}
            castShadow
          >
            <octahedronGeometry args={[0.52, 0]} />
            <meshStandardMaterial
              color="#4cc9f0"
              emissive="#4cc9f0"
              emissiveIntensity={0.85}
              roughness={0.25}
              metalness={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

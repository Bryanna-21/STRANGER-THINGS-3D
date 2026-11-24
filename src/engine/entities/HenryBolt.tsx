import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';

interface HenryBoltProps {
  id: number;
  startPos: [number, number, number];
  velocity: [number, number, number];
  onHitJane: (id: number) => void;
  onExpire: (id: number) => void;
}

export function HenryBolt({
  id,
  startPos,
  velocity,
  onHitJane,
  onExpire,
}: HenryBoltProps) {
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const ageRef = useRef(0);
  const resolvedRef = useRef(false);

  useEffect(() => {
    bodyRef.current?.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
  }, [velocity]);

  useFrame((_, delta) => {
    if (resolvedRef.current) return;
    ageRef.current += Math.min(delta, 0.05);
    if (ageRef.current >= 2.6) {
      resolvedRef.current = true;
      onExpire(id);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      name={`henry-bolt-${id}`}
      position={startPos}
      gravityScale={0}
      ccd
      onCollisionEnter={({ other }) => {
        if (resolvedRef.current) return;
        const targetName = other.rigidBodyObject?.name ?? '';
        if (targetName === 'jane') {
          resolvedRef.current = true;
          onHitJane(id);
        } else if (targetName === 'pillar' || targetName.startsWith('wall-')) {
          resolvedRef.current = true;
          onExpire(id);
        }
      }}
    >
      <mesh>
        <icosahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial color="#9d4edd" emissive="#5a189a" emissiveIntensity={1.5} />
      </mesh>
    </RigidBody>
  );
}

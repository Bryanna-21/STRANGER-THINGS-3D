import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, type RapierRigidBody } from '@react-three/rapier';

interface TelekinesisBoltProps {
  id: number;
  startPos: [number, number, number];
  velocity: [number, number, number];
  onHitHenry: (id: number) => void;
  onExpire: (id: number) => void;
}

export function TelekinesisBolt({
  id,
  startPos,
  velocity,
  onHitHenry,
  onExpire,
}: TelekinesisBoltProps) {
  const bodyRef = useRef<RapierRigidBody | null>(null);
  const ageRef = useRef(0);
  const hasHitRef = useRef(false);

  useEffect(() => {
    bodyRef.current?.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
  }, [velocity]);

  useFrame((_, delta) => {
    if (hasHitRef.current) return;
    ageRef.current += Math.min(delta, 0.05);
    if (ageRef.current >= 2.2) {
      onExpire(id);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      name={`bolt-${id}`}
      position={startPos}
      gravityScale={0}
      ccd
      onCollisionEnter={({ other }) => {
        if (hasHitRef.current) return;
        if (other.rigidBodyObject?.name === 'henry') {
          hasHitRef.current = true;
          onHitHenry(id);
        }
      }}
    >
      <mesh>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color="#ff4d6d" emissive="#ff0a54" emissiveIntensity={1.2} />
      </mesh>
    </RigidBody>
  );
}

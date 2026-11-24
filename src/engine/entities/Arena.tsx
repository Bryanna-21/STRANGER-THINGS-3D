import { RigidBody } from '@react-three/rapier';

const PILLAR_POSITIONS: [number, number, number][] = [
  [-5.5, 1.75, -1.5],
  [5.5, 1.75, -1.5],
  [-5.5, 1.75, 4.5],
  [5.5, 1.75, 4.5],
];

const DEBRIS_POSITIONS: [number, number, number][] = [
  [-2.5, 0.6, 0.5],
  [2.5, 0.6, 0.5],
  [0, 0.6, -2.5],
  [-3.2, 0.6, -4.0],
  [3.2, 0.6, -4.0],
];

export function Arena() {
  return (
    <group name="arena">
      <RigidBody type="fixed" name="floor" restitution={0.1} friction={0.85}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[28, 28]} />
          <meshStandardMaterial color="#14131a" roughness={0.85} metalness={0.15} />
        </mesh>
      </RigidBody>

      {/* Perimeter Walls */}
      <RigidBody type="fixed" name="wall-north" position={[0, 1.5, -14]}>
        <mesh>
          <boxGeometry args={[28, 3, 0.5]} />
          <meshStandardMaterial color="#1e1b29" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" name="wall-south" position={[0, 1.5, 14]}>
        <mesh>
          <boxGeometry args={[28, 3, 0.5]} />
          <meshStandardMaterial color="#1e1b29" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" name="wall-west" position={[-14, 1.5, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 3, 28]} />
          <meshStandardMaterial color="#1e1b29" />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" name="wall-east" position={[14, 1.5, 0]}>
        <mesh>
          <boxGeometry args={[0.5, 3, 28]} />
          <meshStandardMaterial color="#1e1b29" />
        </mesh>
      </RigidBody>

      {/* Static Cover Pillars */}
      {PILLAR_POSITIONS.map((pos, idx) => (
        <RigidBody key={`pillar-${idx}`} type="fixed" name="pillar" position={pos}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.3, 3.5, 1.3]} />
            <meshStandardMaterial color="#252136" roughness={0.75} />
          </mesh>
        </RigidBody>
      ))}

      {/* Dynamic Physics Debris */}
      {DEBRIS_POSITIONS.map((pos, idx) => (
        <RigidBody
          key={`debris-${idx}`}
          name="debris"
          position={pos}
          mass={1.5}
          linearDamping={1.4}
          angularDamping={1.4}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.9, 0.9]} />
            <meshStandardMaterial color="#3c2a4d" emissive="#1b0e26" emissiveIntensity={0.35} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  );
}

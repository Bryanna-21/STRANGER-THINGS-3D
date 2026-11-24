import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

export type RigVariant = 'jane' | 'henry';

interface CharacterMeshProps {
  variant: RigVariant;
  isMovingRef: { current: boolean };
  isCastingRef: { current: boolean };
  isWardedRef: { current: boolean };
}

export function CharacterMesh({
  variant,
  isMovingRef,
  isCastingRef,
  isWardedRef,
}: CharacterMeshProps) {
  const rootRef = useRef<Group | null>(null);
  const torsoRef = useRef<Group | null>(null);
  const leftArmRef = useRef<Group | null>(null);
  const rightArmRef = useRef<Group | null>(null);
  const leftElbowRef = useRef<Group | null>(null);
  const rightElbowRef = useRef<Group | null>(null);
  const leftLegRef = useRef<Group | null>(null);
  const rightLegRef = useRef<Group | null>(null);
  const leftKneeRef = useRef<Group | null>(null);
  const rightKneeRef = useRef<Group | null>(null);
  const clockRef = useRef(0);

  const isJane = variant === 'jane';

  // Human skin & outfit palette (distinct Jane vs. Henry silhouette)
  const skinColor = isJane ? '#f1c29b' : '#e5c3a6';
  const outfitMain = isJane ? '#d62839' : '#3a2459';
  const outfitTrim = isJane ? '#4ea8de' : '#9d4edd';
  const pantsColor = isJane ? '#243b55' : '#1b1824';
  const shoeColor = isJane ? '#f4f1de' : '#111017';
  const hairColor = isJane ? '#4a2c1d' : '#2b1e19';
  const auraColor = isJane ? '#ff758f' : '#c77dff';
  const emissiveTone = isJane ? '#590d22' : '#240046';

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const moving = isMovingRef.current;
    const casting = isCastingRef.current;
    const warded = isWardedRef.current;

    clockRef.current += dt * (moving ? 10.5 : 3.0);
    const t = clockRef.current;

    if (rootRef.current) {
      const strideBob = moving ? Math.abs(Math.sin(t)) * 0.06 : 0;
      const hoverLift = isJane ? -0.06 : 0.06 + Math.sin(t * 0.75) * 0.06;
      rootRef.current.position.y = hoverLift + strideBob;
      rootRef.current.rotation.x = moving ? 0.1 : casting ? -0.06 : 0;
    }

    if (torsoRef.current) {
      torsoRef.current.rotation.y = moving ? Math.sin(t) * 0.12 : Math.sin(t * 0.5) * 0.04;
    }

    // Natural hip & knee stride cycle
    const hipSwing = moving ? Math.sin(t) * 0.52 : 0;
    const kneeBend = moving
      ? Math.max(0, Math.sin(t - 0.6)) * 0.65
      : 0.05;

    if (leftLegRef.current) {
      leftLegRef.current.rotation.x = hipSwing;
      leftLegRef.current.rotation.z = 0.04;
    }
    if (rightLegRef.current) {
      rightLegRef.current.rotation.x = -hipSwing;
      rightLegRef.current.rotation.z = -0.04;
    }

    const oppHipSwing = moving ? Math.sin(t + Math.PI) * 0.52 : 0;
    const oppKneeBend = moving
      ? Math.max(0, Math.sin(t + Math.PI - 0.6)) * 0.65
      : 0.05;

    if (leftKneeRef.current) {
      leftKneeRef.current.rotation.x = -kneeBend;
    }
    if (rightKneeRef.current) {
      rightKneeRef.current.rotation.x = -oppKneeBend;
    }

    // Shoulder & elbow articulation (telekinesis reach vs. run counter-swing)
    const reaching = casting || warded;
    const castPulse = casting ? Math.sin(t * 2.4) * 0.12 : Math.sin(t * 0.8) * 0.04;
    const runArmSwing = moving ? -hipSwing * 0.7 : 0;
    const oppRunArmSwing = moving ? -oppHipSwing * 0.7 : 0;

    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = reaching ? -1.35 + castPulse : -0.14 + runArmSwing;
      leftArmRef.current.rotation.z = reaching ? 0.24 : 0.12;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = reaching ? -1.35 - castPulse : -0.14 + oppRunArmSwing;
      rightArmRef.current.rotation.z = reaching ? -0.24 : -0.12;
    }

    if (leftElbowRef.current) {
      leftElbowRef.current.rotation.x = reaching ? -0.22 : -0.35;
    }
    if (rightElbowRef.current) {
      rightElbowRef.current.rotation.x = reaching ? -0.22 : -0.35;
    }

    void oppHipSwing;
  });

  const heightScale = isJane ? 0.96 : 1.06;

  return (
    <group ref={rootRef} name={`${variant}-rig`} scale={[heightScale, heightScale, heightScale]}>
      {/* Upper Body & Head */}
      <group ref={torsoRef}>
        {/* Pelvis / Hip Base */}
        <mesh position={[0, -0.06, 0]} castShadow>
          <cylinderGeometry args={[0.21, 0.19, 0.2, 16]} />
          <meshStandardMaterial color={pantsColor} roughness={0.82} />
        </mesh>

        {/* Tapered Torso (Broad Shoulders to Narrower Waist) */}
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.19, 0.52, 18]} />
          <meshStandardMaterial
            color={outfitMain}
            emissive={emissiveTone}
            emissiveIntensity={isJane ? 0.25 : 0.55}
            roughness={0.62}
          />
        </mesh>

        {/* Jacket Trim / Sash */}
        <mesh position={[0, 0.05, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.21, 0.08, 16]} />
          <meshStandardMaterial color={outfitTrim} roughness={0.5} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.55, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.095, 0.14, 14]} />
          <meshStandardMaterial color={skinColor} roughness={0.65} />
        </mesh>

        {/* Sculpted Head */}
        <mesh position={[0, 0.76, 0.02]} scale={[0.92, 1.06, 0.98]} castShadow>
          <sphereGeometry args={[0.21, 20, 20]} />
          <meshStandardMaterial color={skinColor} roughness={0.62} />
        </mesh>

        {/* Hair Crown & Back Volume */}
        <mesh
          position={[0, isJane ? 0.83 : 0.85, isJane ? -0.02 : -0.03]}
          scale={isJane ? [0.96, 0.92, 1.02] : [0.98, 1.04, 1.06]}
          castShadow
        >
          <sphereGeometry args={[0.218, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color={hairColor} roughness={0.78} />
        </mesh>

        {/* Subtle Telekinetic Focus Glow on Forehead/Chest When Active */}
        {(isCastingRef.current || isWardedRef.current) && (
          <mesh position={[0, 0.34, 0.22]}>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshBasicMaterial color={auraColor} />
          </mesh>
        )}

        {/* Left Shoulder & Articulated Arm */}
        <group ref={leftArmRef} position={[-0.29, 0.45, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.085, 14, 14]} />
            <meshStandardMaterial color={outfitMain} roughness={0.6} />
          </mesh>
          {/* Upper Arm */}
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.068, 0.058, 0.26, 14]} />
            <meshStandardMaterial color={outfitMain} roughness={0.62} />
          </mesh>
          {/* Elbow Joint + Forearm + Hand */}
          <group ref={leftElbowRef} position={[0, -0.29, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.056, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.65} />
            </mesh>
            <mesh position={[0, -0.13, 0]} castShadow>
              <cylinderGeometry args={[0.054, 0.044, 0.24, 14]} />
              <meshStandardMaterial color={skinColor} roughness={0.65} />
            </mesh>
            <mesh position={[0, -0.27, 0.01]} scale={[0.85, 1.05, 0.65]} castShadow>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.65} />
            </mesh>
          </group>
        </group>

        {/* Right Shoulder & Articulated Arm */}
        <group ref={rightArmRef} position={[0.29, 0.45, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.085, 14, 14]} />
            <meshStandardMaterial color={outfitMain} roughness={0.6} />
          </mesh>
          {/* Upper Arm */}
          <mesh position={[0, -0.15, 0]} castShadow>
            <cylinderGeometry args={[0.068, 0.058, 0.26, 14]} />
            <meshStandardMaterial color={outfitMain} roughness={0.62} />
          </mesh>
          {/* Elbow Joint + Forearm + Hand */}
          <group ref={rightElbowRef} position={[0, -0.29, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.056, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.65} />
            </mesh>
            <mesh position={[0, -0.13, 0]} castShadow>
              <cylinderGeometry args={[0.054, 0.044, 0.24, 14]} />
              <meshStandardMaterial color={skinColor} roughness={0.65} />
            </mesh>
            <mesh position={[0, -0.27, 0.01]} scale={[0.85, 1.05, 0.65]} castShadow>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.65} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Left Hip & Articulated Leg */}
      <group ref={leftLegRef} position={[-0.11, -0.14, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.085, 14, 14]} />
          <meshStandardMaterial color={pantsColor} roughness={0.82} />
        </mesh>
        {/* Thigh */}
        <mesh position={[0, -0.17, 0]} castShadow>
          <cylinderGeometry args={[0.082, 0.065, 0.3, 14]} />
          <meshStandardMaterial color={pantsColor} roughness={0.82} />
        </mesh>
        {/* Knee Joint + Shin + Shoe */}
        <group ref={leftKneeRef} position={[0, -0.33, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.064, 12, 12]} />
            <meshStandardMaterial color={pantsColor} roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.062, 0.048, 0.29, 14]} />
            <meshStandardMaterial color={pantsColor} roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.32, 0.04]} castShadow>
            <boxGeometry args={[0.12, 0.09, 0.22]} />
            <meshStandardMaterial color={shoeColor} roughness={0.72} />
          </mesh>
        </group>
      </group>

      {/* Right Hip & Articulated Leg */}
      <group ref={rightLegRef} position={[0.11, -0.14, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.085, 14, 14]} />
          <meshStandardMaterial color={pantsColor} roughness={0.82} />
        </mesh>
        {/* Thigh */}
        <mesh position={[0, -0.17, 0]} castShadow>
          <cylinderGeometry args={[0.082, 0.065, 0.3, 14]} />
          <meshStandardMaterial color={pantsColor} roughness={0.82} />
        </mesh>
        {/* Knee Joint + Shin + Shoe */}
        <group ref={rightKneeRef} position={[0, -0.33, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.064, 12, 12]} />
            <meshStandardMaterial color={pantsColor} roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.062, 0.048, 0.29, 14]} />
            <meshStandardMaterial color={pantsColor} roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.32, 0.04]} castShadow>
            <boxGeometry args={[0.12, 0.09, 0.22]} />
            <meshStandardMaterial color={shoeColor} roughness={0.72} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

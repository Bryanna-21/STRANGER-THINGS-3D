import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { interactionGroups, RigidBody } from '@react-three/rapier';
import type { Group } from 'three';
import { useGameStore } from '../../store/gameStore';
import {
  createAsphaltTextures,
  createConcreteTextures,
  createGroundTextures,
  createSidingTextures,
  disposeTextureSet,
} from '../systems/pbrTextures';

const FLOOR_GROUPS = interactionGroups(0, [2, 3]);
const OBSTACLE_GROUPS = interactionGroups(1, [3]);

interface BuildingSpec {
  name: string;
  pos: [number, number, number];
  size: [number, number, number];
  wallColor: string;
  roofColor: string;
  style: 'lab' | 'mall' | 'house' | 'creel';
  accent?: string;
}

interface LandmarkBeacon {
  name: string;
  pos: [number, number, number];
  height: number;
  radius: number;
  color: string;
}

interface CarSpec {
  id: string;
  axis: 'x' | 'z';
  laneOffset: number;
  dir: 1 | -1;
  speed: number;
  startOffset: number;
  bodyColor: string;
}

interface PedestrianSpec {
  id: string;
  x: number;
  z: number;
  axis: 'x' | 'z';
  span: number;
  speed: number;
  shirtColor: string;
  pantsColor: string;
}

const BUILDINGS: BuildingSpec[] = [
  {
    name: 'hawkins-lab',
    pos: [-34, 10, -36],
    size: [18, 20, 16],
    wallColor: '#b7c0ce',
    roofColor: '#3a4152',
    style: 'lab',
    accent: '#4cc9f0',
  },
  {
    name: 'lab-wing',
    pos: [-20, 5, -36],
    size: [8, 10, 12],
    wallColor: '#9aa4b5',
    roofColor: '#323845',
    style: 'lab',
  },
  {
    name: 'starcourt-main',
    pos: [34, 6.5, -34],
    size: [24, 13, 18],
    wallColor: '#d8b4d5',
    roofColor: '#493748',
    style: 'mall',
    accent: '#ff4d6d',
  },
  {
    name: 'starcourt-atrium',
    pos: [34, 14.2, -34],
    size: [10, 2.4, 8],
    wallColor: '#e4c8e2',
    roofColor: '#4cc9f0',
    style: 'mall',
  },
  {
    name: 'byers-house',
    pos: [-28, 3.2, 26],
    size: [9, 6.4, 8],
    wallColor: '#f3e5c8',
    roofColor: '#8c3b2b',
    style: 'house',
    accent: '#f4a261',
  },
  {
    name: 'wheeler-house',
    pos: [-14, 3.5, 28],
    size: [10, 7, 9],
    wallColor: '#e1ecf4',
    roofColor: '#3d5a80',
    style: 'house',
  },
  {
    name: 'melvalds-shop',
    pos: [-42, 4, 24],
    size: [10, 8, 9],
    wallColor: '#e2a3b2',
    roofColor: '#5c374c',
    style: 'mall',
    accent: '#ffd166',
  },
  {
    name: 'creel-house',
    pos: [32, 7.5, 30],
    size: [13, 15, 13],
    wallColor: '#c7b5d4',
    roofColor: '#352242',
    style: 'creel',
    accent: '#c77dff',
  },
  {
    name: 'east-cottage',
    pos: [18, 3.2, 26],
    size: [8.5, 6.4, 8],
    wallColor: '#f4d3c8',
    roofColor: '#6b3e26',
    style: 'house',
  },
  {
    name: 'mid-west-roof',
    pos: [-28, 4.5, -2],
    size: [11, 9, 11],
    wallColor: '#bcc4ce',
    roofColor: '#495057',
    style: 'house',
  },
  {
    name: 'mid-east-roof',
    pos: [28, 5, -2],
    size: [11, 10, 11],
    wallColor: '#d0c2de',
    roofColor: '#4a3b5c',
    style: 'house',
  },
];

const LANDMARK_BEACONS: LandmarkBeacon[] = [
  { name: 'beacon-lab', pos: [-34, 30, -36], height: 18, radius: 0.35, color: '#4cc9f0' },
  { name: 'beacon-starcourt', pos: [34, 23, -34], height: 16, radius: 0.35, color: '#ff4d6d' },
  { name: 'beacon-downtown', pos: [-22, 16, 28], height: 14, radius: 0.3, color: '#ffd166' },
  { name: 'beacon-creel', pos: [32, 27, 30], height: 18, radius: 0.35, color: '#c77dff' },
];

const TREES: { pos: [number, number, number]; scale: number; crownColor: string }[] = [
  { pos: [-9, 0, -24], scale: 1.15, crownColor: '#2d6a4f' },
  { pos: [9, 0, -24], scale: 1.05, crownColor: '#40916c' },
  { pos: [-9, 0, -4], scale: 1.2, crownColor: '#2d6a4f' },
  { pos: [9, 0, -4], scale: 1.1, crownColor: '#52b788' },
  { pos: [-9, 0, 19], scale: 1.15, crownColor: '#2d6a4f' },
  { pos: [9, 0, 19], scale: 1.25, crownColor: '#40916c' },
  { pos: [-21, 0, 19], scale: 1.0, crownColor: '#52b788' },
  { pos: [21, 0, 19], scale: 1.15, crownColor: '#2d6a4f' },
  { pos: [-24, 0, -10], scale: 1.25, crownColor: '#40916c' },
  { pos: [24, 0, -10], scale: 1.1, crownColor: '#2d6a4f' },
  { pos: [-38, 0, 18], scale: 1.2, crownColor: '#40916c' },
  { pos: [24, 0, 22], scale: 1.1, crownColor: '#52b788' },
];

const CARS: CarSpec[] = [
  { id: 'car-1', axis: 'z', laneOffset: 3.2, dir: 1, speed: 11, startOffset: -30, bodyColor: '#e63946' },
  { id: 'car-2', axis: 'z', laneOffset: -3.2, dir: -1, speed: 9.5, startOffset: 24, bodyColor: '#4cc9f0' },
  { id: 'car-3', axis: 'x', laneOffset: 14.5, dir: 1, speed: 10.5, startOffset: -26, bodyColor: '#f4a261' },
  { id: 'car-4', axis: 'x', laneOffset: 9.5, dir: -1, speed: 12, startOffset: 32, bodyColor: '#90be6d' },
  { id: 'car-5', axis: 'x', laneOffset: -13.5, dir: 1, speed: 10, startOffset: -18, bodyColor: '#f9c74f' },
];

const PEDESTRIANS: PedestrianSpec[] = [
  { id: 'ped-1', x: -8.5, z: 4, axis: 'z', span: 12, speed: 2.1, shirtColor: '#f72585', pantsColor: '#2b2d42' },
  { id: 'ped-2', x: 8.5, z: -8, axis: 'z', span: 14, speed: 1.9, shirtColor: '#4cc9f0', pantsColor: '#1d3557' },
  { id: 'ped-3', x: -12, z: 18.5, axis: 'x', span: 15, speed: 2.3, shirtColor: '#ffb703', pantsColor: '#3d405b' },
  { id: 'ped-4', x: 14, z: 18.5, axis: 'x', span: 14, speed: 1.8, shirtColor: '#80ed99', pantsColor: '#22223b' },
  { id: 'ped-5', x: -16, z: -10, axis: 'x', span: 12, speed: 2.0, shirtColor: '#ff758f', pantsColor: '#2b2d42' },
];

const STREETLAMPS: [number, number, number][] = [
  [-9, 3.2, -22],
  [9, 3.2, -22],
  [-9, 3.2, 0],
  [9, 3.2, 0],
  [-9, 3.2, 22],
  [9, 3.2, 22],
];

const RIFT_FISSURES: { pos: [number, number, number]; size: [number, number]; rotY: number }[] = [
  { pos: [0, 0.03, -12], size: [1.1, 16], rotY: 0.15 },
  { pos: [-14, 0.03, 8], size: [0.9, 14], rotY: 1.25 },
  { pos: [16, 0.03, -8], size: [0.95, 15], rotY: -0.95 },
  { pos: [0, 0.03, 18], size: [0.85, 12], rotY: 0.45 },
];

const DEBRIS_PROPS: [number, number, number][] = [
  [-5, 0.6, -4],
  [5, 0.6, -4],
  [-4, 0.6, 10],
  [4, 0.6, 10],
  [-16, 0.6, -16],
  [16, 0.6, 16],
  [0, 0.6, -24],
];

export function HawkinsWorld() {
  const carRefs = useRef<(Group | null)[]>([]);
  const pedRefs = useRef<(Group | null)[]>([]);
  const vineGroupRef = useRef<Group | null>(null);
  const clockRef = useRef(0);
  const upsideDown = useGameStore((s) => s.upsideDown);

  const pbr = useMemo(() => {
    return {
      ground: createGroundTextures(28, 28),
      asphalt: createAsphaltTextures(2, 24),
      siding: createSidingTextures(2, 2),
      concrete: createConcreteTextures(3, 3),
    };
  }, []);

  useEffect(() => {
    clockRef.current = 0;
    return () => {
      disposeTextureSet(pbr.ground);
      disposeTextureSet(pbr.asphalt);
      disposeTextureSet(pbr.siding);
      disposeTextureSet(pbr.concrete);
    };
  }, [pbr]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const state = useGameStore.getState();
    const panicMult =
      (state.phase === 'overdrive' ? 1.55 : 1.0) * (1 + (state.level - 1) * 0.15);

    clockRef.current += dt * panicMult;
    const t = clockRef.current;

    if (vineGroupRef.current) {
      const targetScale = state.upsideDown ? (state.level >= 4 ? 1.45 : 1.25) : state.level === 2 ? 0.55 : 0.22;
      const curScale = vineGroupRef.current.scale.y;
      const nextScale = curScale + (targetScale - curScale) * Math.min(1, dt * 3.0);
      vineGroupRef.current.scale.set(1, nextScale, 1);
      vineGroupRef.current.rotation.y = Math.sin(t * 0.4) * 0.03;
    }

    for (let i = 0; i < CARS.length; i++) {
      const carEl = carRefs.current[i];
      if (!carEl) continue;
      const spec = CARS[i];
      const travel = ((spec.startOffset + t * spec.speed * spec.dir + 140) % 140) - 70;

      if (spec.axis === 'z') {
        carEl.position.set(spec.laneOffset, 0.55, travel);
        carEl.rotation.y = spec.dir > 0 ? 0 : Math.PI;
      } else {
        carEl.position.set(travel, 0.55, spec.laneOffset);
        carEl.rotation.y = spec.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }

    for (let i = 0; i < PEDESTRIANS.length; i++) {
      const pedEl = pedRefs.current[i];
      if (!pedEl) continue;
      const spec = PEDESTRIANS[i];
      const wave = Math.sin(t * spec.speed + i * 1.4);
      const offset = wave * spec.span;
      const bob = Math.abs(Math.cos(t * spec.speed * 2 + i)) * 0.12;

      if (spec.axis === 'z') {
        pedEl.position.set(spec.x, 0.85 + bob, spec.z + offset);
        pedEl.rotation.y = Math.cos(t * spec.speed + i * 1.4) >= 0 ? 0 : Math.PI;
      } else {
        pedEl.position.set(spec.x + offset, 0.85 + bob, spec.z);
        pedEl.rotation.y = Math.cos(t * spec.speed + i * 1.4) >= 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
  });

  const groundTint = upsideDown ? '#8c4358' : '#7ea876';
  const roadTint = upsideDown ? '#6e5866' : '#9aa0ad';
  const foliageColorOverride = upsideDown ? '#4a1c2a' : undefined;

  return (
    <group name="hawkins-world">
      {/* Main Town Ground With 4K-Grade PBR Texture */}
      <RigidBody
        type="fixed"
        name="floor"
        restitution={0.1}
        friction={0.9}
        collisionGroups={FLOOR_GROUPS}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[170, 170]} />
          <meshStandardMaterial
            map={pbr.ground.map}
            bumpMap={pbr.ground.bumpMap}
            bumpScale={0.12}
            roughnessMap={pbr.ground.roughnessMap}
            color={groundTint}
            roughness={0.9}
            metalness={0.05}
          />
        </mesh>
      </RigidBody>

      {/* Main North-South & East-West Asphalt Avenues */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[14, 156]} />
        <meshStandardMaterial
          map={pbr.asphalt.map}
          bumpMap={pbr.asphalt.bumpMap}
          bumpScale={0.08}
          roughnessMap={pbr.asphalt.roughnessMap}
          color={roadTint}
          roughness={0.78}
          metalness={0.12}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 12]} receiveShadow>
        <planeGeometry args={[156, 12]} />
        <meshStandardMaterial
          map={pbr.asphalt.map}
          bumpMap={pbr.asphalt.bumpMap}
          bumpScale={0.08}
          roughnessMap={pbr.asphalt.roughnessMap}
          color={roadTint}
          roughness={0.78}
          metalness={0.12}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -16]} receiveShadow>
        <planeGeometry args={[156, 12]} />
        <meshStandardMaterial
          map={pbr.asphalt.map}
          bumpMap={pbr.asphalt.bumpMap}
          bumpScale={0.08}
          roughnessMap={pbr.asphalt.roughnessMap}
          color={roadTint}
          roughness={0.78}
          metalness={0.12}
        />
      </mesh>

      {/* Center Road Stripes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <planeGeometry args={[0.22, 148]} />
        <meshBasicMaterial color={upsideDown ? '#ff4d6d' : '#e9c46a'} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 12]}>
        <planeGeometry args={[148, 0.22]} />
        <meshBasicMaterial color={upsideDown ? '#ff4d6d' : '#e9c46a'} />
      </mesh>

      {/* Textured Concrete Sidewalk Borders */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-8.2, 0.015, 0]} receiveShadow>
        <planeGeometry args={[2.4, 140]} />
        <meshStandardMaterial
          map={pbr.concrete.map}
          bumpMap={pbr.concrete.bumpMap}
          bumpScale={0.06}
          color={upsideDown ? '#7d5b68' : '#b4bac6'}
          roughness={0.86}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8.2, 0.015, 0]} receiveShadow>
        <planeGeometry args={[2.4, 140]} />
        <meshStandardMaterial
          map={pbr.concrete.map}
          bumpMap={pbr.concrete.bumpMap}
          bumpScale={0.06}
          color={upsideDown ? '#7d5b68' : '#b4bac6'}
          roughness={0.86}
        />
      </mesh>

      {/* Glowing Upside Down Rift Cracks */}
      {RIFT_FISSURES.map((rift, idx) => (
        <mesh
          key={`rift-${idx}`}
          position={rift.pos}
          rotation={[-Math.PI / 2, 0, rift.rotY]}
        >
          <planeGeometry args={rift.size} />
          <meshBasicMaterial color="#ff1e42" transparent opacity={upsideDown ? 0.92 : 0.72} />
        </mesh>
      ))}

      {/* Creeping Upside Down Vines & Organic Tendrils */}
      <group ref={vineGroupRef} name="upside-down-vines" scale={[1, 0.22, 1]}>
        {RIFT_FISSURES.map((rift, rIdx) =>
          [0, 1, 2, 3].map((vIdx) => {
            const angle = rift.rotY + vIdx * (Math.PI / 2);
            const dist = 3.2 + vIdx * 1.1;
            const vx = rift.pos[0] + Math.cos(angle) * dist;
            const vz = rift.pos[2] + Math.sin(angle) * dist;
            return (
              <group key={`vine-${rIdx}-${vIdx}`} position={[vx, 0, vz]} rotation={[0, angle, 0]}>
                <mesh position={[1.4, 0.14, 0]} rotation={[0, 0, Math.PI / 2 - 0.12]}>
                  <cylinderGeometry args={[0.07, 0.14, 2.8, 7]} />
                  <meshStandardMaterial
                    color="#3d0e1e"
                    emissive="#590d22"
                    emissiveIntensity={upsideDown ? 0.85 : 0.35}
                    roughness={0.85}
                  />
                </mesh>
                <mesh position={[0, 1.15, 0]} rotation={[0.14, 0, -0.18]}>
                  <cylinderGeometry args={[0.04, 0.13, 2.3, 7]} />
                  <meshStandardMaterial
                    color="#4a1226"
                    emissive="#800f2f"
                    emissiveIntensity={upsideDown ? 0.75 : 0.12}
                    roughness={0.85}
                  />
                </mesh>
              </group>
            );
          })
        )}
      </group>

      {/* Multi-Part Architectural Buildings With PBR Siding & Concrete */}
      {BUILDINGS.map((b) => {
        const useConcrete = b.style === 'lab' || b.style === 'mall';
        const texSet = useConcrete ? pbr.concrete : pbr.siding;
        const halfH = b.size[1] / 2;

        return (
          <RigidBody
            key={b.name}
            type="fixed"
            name={b.name}
            position={b.pos}
            friction={0.85}
            collisionGroups={OBSTACLE_GROUPS}
          >
            {/* Foundation Plinth */}
            <mesh position={[0, -halfH + 0.18, 0]} castShadow receiveShadow>
              <boxGeometry args={[b.size[0] + 0.5, 0.36, b.size[2] + 0.5]} />
              <meshStandardMaterial
                map={pbr.concrete.map}
                bumpMap={pbr.concrete.bumpMap}
                bumpScale={0.05}
                color="#495057"
                roughness={0.88}
              />
            </mesh>

            {/* Main Structure Body */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={b.size} />
              <meshStandardMaterial
                map={texSet.map}
                bumpMap={texSet.bumpMap}
                bumpScale={useConcrete ? 0.07 : 0.05}
                roughnessMap={texSet.roughnessMap}
                color={b.wallColor}
                roughness={0.72}
                metalness={useConcrete ? 0.14 : 0.05}
              />
            </mesh>

            {/* Corner Pilasters / Trim */}
            <mesh position={[-b.size[0] / 2 + 0.12, 0, b.size[2] / 2 - 0.12]} castShadow>
              <boxGeometry args={[0.28, b.size[1], 0.28]} />
              <meshStandardMaterial color={b.roofColor} roughness={0.78} />
            </mesh>
            <mesh position={[b.size[0] / 2 - 0.12, 0, b.size[2] / 2 - 0.12]} castShadow>
              <boxGeometry args={[0.28, b.size[1], 0.28]} />
              <meshStandardMaterial color={b.roofColor} roughness={0.78} />
            </mesh>

            {/* Roof & Architectural Crown */}
            {b.style === 'house' || b.style === 'creel' ? (
              <>
                <mesh
                  position={[0, halfH + 1.35, 0]}
                  rotation={[0, Math.PI / 4, 0]}
                  castShadow
                >
                  <coneGeometry args={[Math.max(b.size[0], b.size[2]) * 0.78, 2.7, 4]} />
                  <meshStandardMaterial
                    map={pbr.siding.map}
                    bumpMap={pbr.siding.bumpMap}
                    bumpScale={0.05}
                    color={b.roofColor}
                    roughness={0.78}
                  />
                </mesh>
                {/* Chimney Stack */}
                <mesh position={[b.size[0] * 0.26, halfH + 1.8, -b.size[2] * 0.15]} castShadow>
                  <boxGeometry args={[0.85, 2.2, 0.85]} />
                  <meshStandardMaterial
                    map={pbr.concrete.map}
                    bumpMap={pbr.concrete.bumpMap}
                    bumpScale={0.05}
                    color="#5c3b35"
                    roughness={0.85}
                  />
                </mesh>
              </>
            ) : (
              <>
                <mesh position={[0, halfH + 0.25, 0]} castShadow>
                  <boxGeometry args={[b.size[0] + 0.55, 0.5, b.size[2] + 0.55]} />
                  <meshStandardMaterial
                    map={pbr.concrete.map}
                    color={b.roofColor}
                    roughness={0.8}
                  />
                </mesh>
                {/* Rooftop Mechanical / Vent Unit */}
                <mesh position={[-b.size[0] * 0.2, halfH + 0.85, 0]} castShadow>
                  <boxGeometry args={[2.2, 0.7, 1.8]} />
                  <meshStandardMaterial color="#6c757d" metalness={0.45} roughness={0.5} />
                </mesh>
              </>
            )}

            {/* Front Windows With Frames */}
            <mesh position={[-b.size[0] * 0.22, 0.3, b.size[2] / 2 + 0.05]}>
              <boxGeometry args={[1.3, 1.4, 0.1]} />
              <meshStandardMaterial
                color={upsideDown ? '#ff4d6d' : '#fff3b0'}
                emissive={upsideDown ? '#ff1e42' : '#ffd166'}
                emissiveIntensity={0.55}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[b.size[0] * 0.22, 0.3, b.size[2] / 2 + 0.05]}>
              <boxGeometry args={[1.3, 1.4, 0.1]} />
              <meshStandardMaterial
                color={upsideDown ? '#ff4d6d' : '#fff3b0'}
                emissive={upsideDown ? '#ff1e42' : '#ffd166'}
                emissiveIntensity={0.55}
                roughness={0.2}
              />
            </mesh>

            {/* Front Entrance Door / Canopy */}
            <mesh position={[0, -halfH + 1.15, b.size[2] / 2 + 0.06]} castShadow>
              <boxGeometry args={[1.2, 2.1, 0.12]} />
              <meshStandardMaterial color="#3b261d" roughness={0.75} />
            </mesh>
            <mesh position={[0, -halfH + 2.3, b.size[2] / 2 + 0.42]} castShadow>
              <boxGeometry args={[2.1, 0.12, 0.9]} />
              <meshStandardMaterial color={b.roofColor} roughness={0.7} />
            </mesh>

            {b.accent && (
              <mesh position={[0, halfH - 0.55, b.size[2] / 2 + 0.07]}>
                <boxGeometry args={[b.size[0] * 0.68, 0.34, 0.12]} />
                <meshStandardMaterial
                  color={b.accent}
                  emissive={b.accent}
                  emissiveIntensity={0.4}
                  roughness={0.35}
                />
              </mesh>
            )}
          </RigidBody>
        );
      })}

      {/* District Landmark Sightline Beacons */}
      {LANDMARK_BEACONS.map((beacon) => (
        <mesh key={beacon.name} name={beacon.name} position={beacon.pos}>
          <cylinderGeometry args={[beacon.radius, beacon.radius, beacon.height, 10, 1, true]} />
          <meshBasicMaterial color={beacon.color} transparent opacity={0.28} side={2} />
        </mesh>
      ))}

      {/* Multi-Tier Trees & Vegetation */}
      {TREES.map((tree, idx) => {
        const crown = foliageColorOverride ?? tree.crownColor;
        return (
          <group key={`tree-${idx}`} position={tree.pos} scale={tree.scale}>
            <mesh position={[0, 1.1, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.3, 2.2, 8]} />
              <meshStandardMaterial color={upsideDown ? '#3b2329' : '#6f4e37'} roughness={0.9} />
            </mesh>
            <mesh position={[0, 3.0, 0]} castShadow>
              <dodecahedronGeometry args={[1.45, 0]} />
              <meshStandardMaterial color={crown} roughness={0.82} />
            </mesh>
            <mesh position={[0.55, 2.5, 0.3]} castShadow>
              <dodecahedronGeometry args={[0.95, 0]} />
              <meshStandardMaterial color={crown} roughness={0.82} />
            </mesh>
          </group>
        );
      })}

      {/* Moving Cars With Wheels, Windshield & Headlights */}
      {CARS.map((car, idx) => (
        <group
          key={car.id}
          ref={(el) => {
            carRefs.current[idx] = el;
          }}
          name={car.id}
          position={[0, 0.55, 0]}
        >
          <mesh castShadow>
            <boxGeometry args={[1.8, 0.72, 3.6]} />
            <meshStandardMaterial color={car.bodyColor} roughness={0.28} metalness={0.55} />
          </mesh>
          <mesh position={[0, 0.58, -0.15]} castShadow>
            <boxGeometry args={[1.5, 0.55, 1.85]} />
            <meshStandardMaterial color="#caf0f8" roughness={0.14} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.04, 1.82]}>
            <boxGeometry args={[1.4, 0.2, 0.08]} />
            <meshBasicMaterial color="#fff3b0" />
          </mesh>
          <mesh position={[-0.92, -0.25, 1.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.16, 10]} />
            <meshStandardMaterial color="#18181b" roughness={0.85} />
          </mesh>
          <mesh position={[0.92, -0.25, 1.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.16, 10]} />
            <meshStandardMaterial color="#18181b" roughness={0.85} />
          </mesh>
          <mesh position={[-0.92, -0.25, -1.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.16, 10]} />
            <meshStandardMaterial color="#18181b" roughness={0.85} />
          </mesh>
          <mesh position={[0.92, -0.25, -1.05]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.32, 0.32, 0.16, 10]} />
            <meshStandardMaterial color="#18181b" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Walking Townsfolk on Sidewalks */}
      {PEDESTRIANS.map((ped, idx) => (
        <group
          key={ped.id}
          ref={(el) => {
            pedRefs.current[idx] = el;
          }}
          name={ped.id}
          position={[ped.x, 0.85, ped.z]}
        >
          <mesh position={[0, 0.52, 0]} castShadow>
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshStandardMaterial color="#ffd6ba" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[0.44, 0.58, 0.26]} />
            <meshStandardMaterial color={ped.shirtColor} roughness={0.75} />
          </mesh>
          <mesh position={[-0.11, -0.45, 0]} castShadow>
            <boxGeometry args={[0.15, 0.52, 0.16]} />
            <meshStandardMaterial color={ped.pantsColor} roughness={0.85} />
          </mesh>
          <mesh position={[0.11, -0.45, 0]} castShadow>
            <boxGeometry args={[0.15, 0.52, 0.16]} />
            <meshStandardMaterial color={ped.pantsColor} roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Hawkins Streetlamps */}
      {STREETLAMPS.map((pos, idx) => (
        <RigidBody
          key={`lamp-${idx}`}
          type="fixed"
          name="streetlamp"
          position={pos}
          collisionGroups={OBSTACLE_GROUPS}
        >
          <mesh castShadow>
            <cylinderGeometry args={[0.12, 0.16, 6.4, 8]} />
            <meshStandardMaterial color="#3a3d4a" metalness={0.5} roughness={0.45} />
          </mesh>
          <mesh position={[0, 3.25, 0]}>
            <sphereGeometry args={[0.28, 10, 10]} />
            <meshBasicMaterial color={upsideDown ? '#ff4d6d' : '#ffd166'} />
          </mesh>
        </RigidBody>
      ))}

      {/* Telekinetic Debris Props */}
      {DEBRIS_PROPS.map((pos, idx) => (
        <RigidBody
          key={`debris-${idx}`}
          name="debris"
          position={pos}
          mass={1.4}
          linearDamping={1.3}
          angularDamping={1.3}
          collisionGroups={OBSTACLE_GROUPS}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.05, 1.05, 1.05]} />
            <meshStandardMaterial color="#5e3a78" emissive="#2a113b" emissiveIntensity={0.35} />
          </mesh>
        </RigidBody>
      ))}

      {/* Outer District Containment */}
      <RigidBody type="fixed" name="wall-north" position={[0, 4, -80]} collisionGroups={FLOOR_GROUPS}>
        <mesh visible={false}>
          <boxGeometry args={[160, 8, 1]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" name="wall-south" position={[0, 4, 80]} collisionGroups={FLOOR_GROUPS}>
        <mesh visible={false}>
          <boxGeometry args={[160, 8, 1]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" name="wall-west" position={[-80, 4, 0]} collisionGroups={FLOOR_GROUPS}>
        <mesh visible={false}>
          <boxGeometry args={[1, 8, 160]} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" name="wall-east" position={[80, 4, 0]} collisionGroups={FLOOR_GROUPS}>
        <mesh visible={false}>
          <boxGeometry args={[1, 8, 160]} />
        </mesh>
      </RigidBody>
    </group>
  );
}

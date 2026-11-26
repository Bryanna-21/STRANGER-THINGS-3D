import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CapsuleCollider,
  interactionGroups,
  RigidBody,
  useRapier,
  type RapierRigidBody,
} from '@react-three/rapier';
import type { Group, Mesh } from 'three';
import type { InputController } from '../systems/inputController';
import type { LiveVec3 } from '../systems/CombatCamera';
import type { CombatAudio } from '../systems/combatAudio';
import { useGameStore } from '../../store/gameStore';
import { getMissionConfig } from '../../game/missions';
import { TelekinesisBolt } from './TelekinesisBolt';
import { HenryBolt } from './HenryBolt';
import { CharacterMesh } from './CharacterMesh';

interface CombatantsProps {
  input: InputController;
  janePosRef: MutableRefObject<LiveVec3>;
  henryPosRef: MutableRefObject<LiveVec3>;
  shakeRef: MutableRefObject<number>;
  audio: CombatAudio;
}

interface ActiveBolt {
  id: number;
  startPos: [number, number, number];
  velocity: [number, number, number];
}

const JANE_PHASE_GROUPS = interactionGroups(2, [0, 3]);
const COMBAT_GROUPS = interactionGroups(3, [0, 1, 2, 3]);

const RIFT_ZONES: { x: number; z: number; radius: number }[] = [
  { x: 0, z: -12, radius: 11 },
  { x: -14, z: 8, radius: 11 },
  { x: 16, z: -8, radius: 11 },
  { x: 0, z: 18, radius: 11 },
];

const MOVE_SPEED = 9.5;
const LEAP_UP_SPEED = 10.5;
const LEAP_SURGE_SPEED = 14.0;
const JANE_BOLT_SPEED = 22;
const HENRY_BOLT_SPEED = 15.5;
const WARD_ACTIVE_THRESHOLD = 1.5;

export function Combatants({
  input,
  janePosRef,
  henryPosRef,
  shakeRef,
  audio,
}: CombatantsProps) {
  const { world } = useRapier();

  const janeBodyRef = useRef<RapierRigidBody | null>(null);
  const henryBodyRef = useRef<RapierRigidBody | null>(null);
  const janeFacingRef = useRef<Group | null>(null);
  const henryFacingRef = useRef<Group | null>(null);
  const pulseMeshRef = useRef<Mesh | null>(null);
  const wardMeshRef = useRef<Mesh | null>(null);
  const riftRingRefs = useRef<(Mesh | null)[]>([]);
  const riftPulseTimersRef = useRef<number[]>(RIFT_ZONES.map(() => 0));

  const janeMovingRef = useRef(false);
  const janeCastingRef = useRef(false);
  const janeWardedRef = useRef(false);
  const henryMovingRef = useRef(true);
  const henryCastingRef = useRef(false);
  const henryWardedRef = useRef(false);

  const riftAlertedRef = useRef(false);
  const breachedRiftsRef = useRef<Set<number>>(new Set());
  const pulseTimerRef = useRef(0);
  const castAnimTimerRef = useRef(0);
  const leapCooldownRef = useRef(0);
  const henryFireTimerRef = useRef(1.4);
  const henryClockRef = useRef(0);
  const henryXRef = useRef(0);
  const henryZRef = useRef(-6);
  const nextBoltIdRef = useRef(1);

  const [janeBolts, setJaneBolts] = useState<ActiveBolt[]>([]);
  const [henryBolts, setHenryBolts] = useState<ActiveBolt[]>([]);

  const phase = useGameStore((s) => s.phase);
  const tickCooldowns = useGameStore((s) => s.tickCooldowns);
  const triggerCooldown = useGameStore((s) => s.triggerCooldown);
  const applyDamage = useGameStore((s) => s.applyDamage);
  const setPhase = useGameStore((s) => s.setPhase);

  useEffect(() => {
    if (phase === 'engagement') {
      setJaneBolts([]);
      setHenryBolts([]);
      breachedRiftsRef.current.clear();
      riftAlertedRef.current = false;
      riftPulseTimersRef.current = RIFT_ZONES.map(() => 0);
      for (let i = 0; i < riftRingRefs.current.length; i++) {
        const ring = riftRingRefs.current[i];
        if (ring) {
          ring.visible = false;
          ring.scale.set(1, 1, 1);
        }
      }
      henryFireTimerRef.current = 1.2;
      henryClockRef.current = 0;
      henryXRef.current = 0;
      henryZRef.current = -6;
      leapCooldownRef.current = 0;
      janePosRef.current.x = 0;
      janePosRef.current.y = 1.2;
      janePosRef.current.z = 6;
      henryPosRef.current.x = 0;
      henryPosRef.current.y = 1.2;
      henryPosRef.current.z = -6;
      janeBodyRef.current?.setTranslation({ x: 0, y: 1.2, z: 6 }, true);
      janeBodyRef.current?.setLinvel({ x: 0, y: 0, z: 0 }, true);
      henryBodyRef.current?.setNextKinematicTranslation({ x: 0, y: 1.2, z: -6 });
    }
  }, [phase, janePosRef, henryPosRef]);

  const removeJaneBolt = useCallback((id: number) => {
    setJaneBolts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleJaneBoltHitHenry = useCallback(
    (id: number) => {
      const tkRank = useGameStore.getState().telekinesisRank;
      applyDamage('henry', 10 + (tkRank - 1) * 3);
      shakeRef.current = Math.max(shakeRef.current, 0.16);
      audio.play('hitEnemy');
      setJaneBolts((prev) => prev.filter((b) => b.id !== id));
    },
    [applyDamage, shakeRef, audio]
  );

  const removeHenryBolt = useCallback((id: number) => {
    setHenryBolts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleHenryBoltHitJane = useCallback(
    (id: number) => {
      const st = useGameStore.getState();
      const mission = getMissionConfig(st.level);
      const wardActive = st.cooldowns.ward > WARD_ACTIVE_THRESHOLD;
      const wardMitigated = Math.max(1, 4 - st.wardRank);
      const rawDmg = (wardActive ? wardMitigated : 14) * mission.bossDamageScale;
      applyDamage('jane', Math.max(1, Math.round(rawDmg)));
      shakeRef.current = Math.max(shakeRef.current, wardActive ? 0.08 : 0.32);
      audio.play('hitPlayer');
      setHenryBolts((prev) => prev.filter((b) => b.id !== id));
    },
    [applyDamage, shakeRef, audio]
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const state = useGameStore.getState();

    if (state.isPaused || state.phase === 'victory' || state.phase === 'defeat') {
      janeMovingRef.current = false;
      janeCastingRef.current = false;
      return;
    }

    if (state.phase === 'engagement' && state.henryHealth <= 50) {
      setPhase('overdrive');
      audio.play('overdrive');
    }

    tickCooldowns(dt);
    if (leapCooldownRef.current > 0) {
      leapCooldownRef.current = Math.max(0, leapCooldownRef.current - dt);
    }

    const snap = input.read();
    const janeBody = janeBodyRef.current;
    const henryBody = henryBodyRef.current;

    const speedMag = Math.hypot(snap.moveX, snap.moveZ);
    janeMovingRef.current = speedMag > 0.08;

    if (janeBody) {
      const currentVel = janeBody.linvel();
      let vx = snap.moveX * MOVE_SPEED;
      let vz = snap.moveZ * MOVE_SPEED;
      let vy = currentVel.y;

      if (snap.leapPressed && leapCooldownRef.current <= 0) {
        leapCooldownRef.current = 0.85;
        castAnimTimerRef.current = 0.35;
        audio.play('telekinesis');
        vy = LEAP_UP_SPEED;

        const dirX =
          speedMag > 0.08 ? snap.moveX / speedMag : Math.sin(janeFacingRef.current?.rotation.y ?? 0);
        const dirZ =
          speedMag > 0.08 ? snap.moveZ / speedMag : Math.cos(janeFacingRef.current?.rotation.y ?? 0);
        vx = dirX * LEAP_SURGE_SPEED;
        vz = dirZ * LEAP_SURGE_SPEED;
      }

      const livePos = janeBody.translation();
      const clampedX = Math.max(-76, Math.min(76, livePos.x));
      const clampedZ = Math.max(-76, Math.min(76, livePos.z));
      let nextY = livePos.y;

      if (nextY < 1.15 && vy < 0) {
        nextY = 1.15;
        vy = 0;
        janeBody.setTranslation({ x: clampedX, y: nextY, z: clampedZ }, true);
      } else if (clampedX !== livePos.x || clampedZ !== livePos.z) {
        janeBody.setTranslation({ x: clampedX, y: nextY, z: clampedZ }, true);
      }

      janeBody.setLinvel({ x: vx, y: vy, z: vz }, true);
      janePosRef.current.x = clampedX;
      janePosRef.current.y = nextY;
      janePosRef.current.z = clampedZ;

      for (let i = 0; i < RIFT_ZONES.length; i++) {
        if (breachedRiftsRef.current.has(i)) continue;
        const rz = RIFT_ZONES[i];
        const dRift = Math.hypot(clampedX - rz.x, clampedZ - rz.z);
        if (dRift <= rz.radius) {
          breachedRiftsRef.current.add(i);
          riftAlertedRef.current = true;
          riftPulseTimersRef.current[i] = 1.4;
          shakeRef.current = Math.max(shakeRef.current, 0.24);
          audio.play('pulse');
          henryFireTimerRef.current = Math.min(henryFireTimerRef.current, 0.35);
        }
      }
    }

    for (let i = 0; i < RIFT_ZONES.length; i++) {
      const ring = riftRingRefs.current[i];
      if (!ring) continue;
      const timer = riftPulseTimersRef.current[i];
      if (timer > 0) {
        const nextTimer = Math.max(0, timer - dt);
        riftPulseTimersRef.current[i] = nextTimer;
        const progress = 1 - nextTimer / 1.4;
        const ringScale = 1 + progress * 6.5;
        ring.visible = true;
        ring.scale.set(ringScale, ringScale, 1);
      } else if (breachedRiftsRef.current.has(i)) {
        const idlePulse = 1 + Math.sin(performance.now() * 0.005 + i) * 0.25;
        ring.visible = true;
        ring.scale.set(idlePulse, idlePulse, 1);
      } else {
        ring.visible = false;
      }
    }

    if (janeFacingRef.current && janeMovingRef.current) {
      janeFacingRef.current.rotation.y = Math.atan2(snap.moveX, snap.moveZ);
    }

    if (snap.telekinesisPressed && state.cooldowns.telekinesis <= 0 && janeBody && henryBody) {
      triggerCooldown('telekinesis', 0.95);
      castAnimTimerRef.current = 0.35;
      audio.play('telekinesis');
      const jPos = janeBody.translation();
      const hPos = henryBody.translation();
      const dx = hPos.x - jPos.x;
      const dy = hPos.y - jPos.y;
      const dz = hPos.z - jPos.z;
      const dist = Math.hypot(dx, dy, dz) || 1;

      if (janeFacingRef.current) {
        janeFacingRef.current.rotation.y = Math.atan2(dx, dz);
      }

      const boltId = nextBoltIdRef.current++;
      setJaneBolts((prev) => [
        ...prev.slice(-7),
        {
          id: boltId,
          startPos: [jPos.x + (dx / dist) * 0.9, jPos.y + 0.2, jPos.z + (dz / dist) * 0.9],
          velocity: [
            (dx / dist) * JANE_BOLT_SPEED,
            (dy / dist) * JANE_BOLT_SPEED,
            (dz / dist) * JANE_BOLT_SPEED,
          ],
        },
      ]);
    }

    if (snap.pulsePressed && state.cooldowns.pulse <= 0 && janeBody) {
      triggerCooldown('pulse', 3.0);
      pulseTimerRef.current = 0.35;
      castAnimTimerRef.current = 0.35;
      audio.play('pulse');
      const jPos = janeBody.translation();

      if (henryBody) {
        const hPos = henryBody.translation();
        if (Math.hypot(hPos.x - jPos.x, hPos.z - jPos.z) <= 9.5) {
          applyDamage('henry', 14);
          shakeRef.current = Math.max(shakeRef.current, 0.22);
          audio.play('hitEnemy');
        }
      }

      world.forEachRigidBody((body) => {
        if (!body.isDynamic()) return;
        const bPos = body.translation();
        const dx = bPos.x - jPos.x;
        const dz = bPos.z - jPos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.2 && dist <= 9.5) {
          const force = ((9.5 - dist) / 9.5) * 20;
          body.applyImpulse({ x: (dx / dist) * force, y: 4.0, z: (dz / dist) * force }, true);
        }
      });
    }

    if (snap.wardPressed && state.cooldowns.ward <= 0) {
      triggerCooldown('ward', 4.0);
      audio.play('ward');
    }

    if (castAnimTimerRef.current > 0) {
      castAnimTimerRef.current = Math.max(0, castAnimTimerRef.current - dt);
    }
    janeCastingRef.current = castAnimTimerRef.current > 0;
    janeWardedRef.current = state.cooldowns.ward > WARD_ACTIVE_THRESHOLD;

    if (pulseMeshRef.current) {
      if (pulseTimerRef.current > 0) {
        pulseTimerRef.current = Math.max(0, pulseTimerRef.current - dt);
        const progress = 1 - pulseTimerRef.current / 0.35;
        const scale = 1 + progress * 6.5;
        pulseMeshRef.current.visible = true;
        pulseMeshRef.current.scale.set(scale, 1, scale);
      } else {
        pulseMeshRef.current.visible = false;
      }
    }

    if (wardMeshRef.current) {
      wardMeshRef.current.visible = janeWardedRef.current;
    }

    if (henryBody && janeBody) {
      const isOverdrive = state.phase === 'overdrive' || state.upsideDown;
      const levelScale = 1 + (state.level - 1) * 0.16;
      const activePursuit = isOverdrive || riftAlertedRef.current;
      henryClockRef.current += dt * (activePursuit ? 2.4 : 1.1);
      henryMovingRef.current = true;

      const jPos = janeBody.translation();
      const hPos = henryBody.translation();
      const toJaneX = jPos.x - henryXRef.current;
      const toJaneZ = jPos.z - henryZRef.current;
      const distToJane = Math.hypot(toJaneX, toJaneZ) || 1;
      const dirX = toJaneX / distToJane;
      const dirZ = toJaneZ / distToJane;
      const strafeX = -dirZ;
      const strafeZ = dirX;

      let pursuitSpeed = 0;
      if (activePursuit) {
        if (distToJane > 12) {
          pursuitSpeed = (isOverdrive ? 7.8 : 6.0) * levelScale;
        } else if (distToJane < 5.5) {
          pursuitSpeed = -(isOverdrive ? 5.2 : 3.6);
        }
      }

      const strafeSpeed =
        Math.sin(henryClockRef.current * 1.4) * (activePursuit ? (isOverdrive ? 6.0 : 4.2) : 2.2);
      const nextX = Math.max(
        -72,
        Math.min(72, henryXRef.current + (dirX * pursuitSpeed + strafeX * strafeSpeed) * dt)
      );
      const nextZ = Math.max(
        -72,
        Math.min(72, henryZRef.current + (dirZ * pursuitSpeed + strafeZ * strafeSpeed) * dt)
      );

      henryXRef.current = nextX;
      henryZRef.current = nextZ;
      henryPosRef.current.x = nextX;
      henryPosRef.current.y = hPos.y;
      henryPosRef.current.z = nextZ;
      henryBody.setNextKinematicTranslation({ x: nextX, y: hPos.y, z: nextZ });

      if (henryFacingRef.current) {
        henryFacingRef.current.rotation.y = Math.atan2(jPos.x - nextX, jPos.z - nextZ);
      }

      henryFireTimerRef.current -= dt;
      henryCastingRef.current = henryFireTimerRef.current < 0.25;

      const fireRange = activePursuit ? 48 : 18;
      if (henryFireTimerRef.current <= 0 && distToJane < fireRange) {
        henryFireTimerRef.current = Math.max(0.55, (isOverdrive ? 0.9 : activePursuit ? 1.35 : 2.1) / levelScale);
        const dx = jPos.x - nextX;
        const dy = jPos.y - hPos.y;
        const dz = jPos.z - nextZ;
        const dist = Math.hypot(dx, dy, dz) || 1;
        const speed = isOverdrive ? HENRY_BOLT_SPEED * 1.25 : HENRY_BOLT_SPEED;

        const boltId = nextBoltIdRef.current++;
        setHenryBolts((prev) => [
          ...prev.slice(-7),
          {
            id: boltId,
            startPos: [nextX + (dx / dist) * 1.0, hPos.y + 0.25, nextZ + (dz / dist) * 1.0],
            velocity: [(dx / dist) * speed, (dy / dist) * speed, (dz / dist) * speed],
          },
        ]);
      }
    }
  });

  return (
    <group name="combatants">
      {RIFT_ZONES.map((rz, idx) => (
        <mesh
          key={`rift-ring-${idx}`}
          ref={(el) => {
            riftRingRefs.current[idx] = el;
          }}
          position={[rz.x, 0.08, rz.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <ringGeometry args={[1.1, 1.45, 32]} />
          <meshBasicMaterial color="#ff2a55" transparent opacity={0.78} side={2} />
        </mesh>
      ))}

      <RigidBody
        ref={janeBodyRef}
        name="jane"
        position={[0, 1.2, 6]}
        enabledRotations={[false, false, false]}
        linearDamping={2}
      >
        <CapsuleCollider args={[0.6, 0.4]} collisionGroups={JANE_PHASE_GROUPS} />
        <group ref={janeFacingRef}>
          <CharacterMesh
            variant="jane"
            isMovingRef={janeMovingRef}
            isCastingRef={janeCastingRef}
            isWardedRef={janeWardedRef}
          />
        </group>

        <mesh ref={pulseMeshRef} position={[0, -0.7, 0]} visible={false}>
          <ringGeometry args={[0.8, 1.05, 32]} />
          <meshBasicMaterial color="#ff758f" transparent opacity={0.7} side={2} />
        </mesh>

        <mesh ref={wardMeshRef} visible={false}>
          <sphereGeometry args={[1.25, 24, 24]} />
          <meshBasicMaterial color="#4cc9f0" wireframe transparent opacity={0.35} />
        </mesh>
      </RigidBody>

      <RigidBody
        ref={henryBodyRef}
        name="henry"
        type="kinematicPosition"
        position={[0, 1.2, -6]}
        enabledRotations={[false, false, false]}
      >
        <CapsuleCollider args={[0.65, 0.45]} collisionGroups={COMBAT_GROUPS} />
        <group ref={henryFacingRef}>
          <CharacterMesh
            variant="henry"
            isMovingRef={henryMovingRef}
            isCastingRef={henryCastingRef}
            isWardedRef={henryWardedRef}
          />
        </group>
      </RigidBody>

      {janeBolts.map((bolt) => (
        <TelekinesisBolt
          key={bolt.id}
          id={bolt.id}
          startPos={bolt.startPos}
          velocity={bolt.velocity}
          onHitHenry={handleJaneBoltHitHenry}
          onExpire={removeJaneBolt}
        />
      ))}

      {henryBolts.map((bolt) => (
        <HenryBolt
          key={bolt.id}
          id={bolt.id}
          startPos={bolt.startPos}
          velocity={bolt.velocity}
          onHitJane={handleHenryBoltHitJane}
          onExpire={removeHenryBolt}
        />
      ))}
    </group>
  );
}

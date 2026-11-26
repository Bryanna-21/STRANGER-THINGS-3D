import { useRef, useState, type MutableRefObject, type PointerEvent as ReactPointerEvent } from 'react';
import {
  CHAPTER_TITLES,
  MAX_ABILITY_RANK,
  UPGRADE_COST_XP,
  useGameStore,
} from '../../store/gameStore';
import { CAMPAIGN_MISSIONS, getMissionConfig } from '../../game/missions';
import { resolveLevel1Beat } from '../../game/level1Story';
import type { InputController, VirtualAbilityKey } from '../../engine/systems/inputController';
import type { CombatAudio } from '../../engine/systems/combatAudio';

interface CombatHudProps {
  input: InputController;
  audio: CombatAudio;
  threatPointerRef: MutableRefObject<HTMLDivElement | null>;
}

const STICK_RADIUS = 38;
const DEADZONE = 0.12;

export function CombatHud({ input, audio, threatPointerRef }: CombatHudProps) {
  const level = useGameStore((s) => s.level);
  const maxLevel = useGameStore((s) => s.maxLevel);
  const upsideDown = useGameStore((s) => s.upsideDown);
  const dimensionShiftCooldown = useGameStore((s) => s.dimensionShiftCooldown);
  const cluesCollected = useGameStore((s) => s.cluesCollected);
  const cluesRequired = useGameStore((s) => s.cluesRequired);
  const xp = useGameStore((s) => s.xp);
  const telekinesisRank = useGameStore((s) => s.telekinesisRank);
  const wardRank = useGameStore((s) => s.wardRank);
  const highestUnlockedLevel = useGameStore((s) => s.highestUnlockedLevel);
  const janeHealth = useGameStore((s) => s.janeHealth);
  const henryHealth = useGameStore((s) => s.henryHealth);
  const phase = useGameStore((s) => s.phase);
  const isPaused = useGameStore((s) => s.isPaused);
  const cooldowns = useGameStore((s) => s.cooldowns);
  const toggleDimension = useGameStore((s) => s.toggleDimension);
  const togglePaused = useGameStore((s) => s.togglePaused);
  const upgradeAbility = useGameStore((s) => s.upgradeAbility);
  const selectChapter = useGameStore((s) => s.selectChapter);
  const resetMatch = useGameStore((s) => s.resetMatch);

  const [muted, setMuted] = useState<boolean>(() => audio.isMuted());
  const completedLevels = useGameStore((s) => s.completedLevels);
  const [revealDismissed, setRevealDismissed] = useState<boolean>(false);

  const stickZoneRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const wardActive = cooldowns.ward > 1.5;
  const chapterLabel = CHAPTER_TITLES[level] ?? `CHAPTER ${level}`;
  const currentMission = getMissionConfig(level);
  const activeBeat = resolveLevel1Beat({ level, cluesCollected, cluesRequired, henryHealth, phase });
  const shiftLocked = level >= 5 && upsideDown;
  const shiftReady = !shiftLocked && dimensionShiftCooldown <= 0;

  const handleToggleMute = () => {
    const nextMuted = audio.toggleMute();
    setMuted(nextMuted);
  };

  const updateStickFromClient = (clientX: number, clientY: number) => {
    const zone = stickZoneRef.current;
    if (!zone) return;

    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rawDx = clientX - centerX;
    const rawDy = clientY - centerY;
    const dist = Math.hypot(rawDx, rawDy);
    const clampedDist = Math.min(dist, STICK_RADIUS);
    const angle = Math.atan2(rawDy, rawDx);

    const offsetX = Math.cos(angle) * clampedDist;
    const offsetY = Math.sin(angle) * clampedDist;

    if (thumbRef.current) {
      thumbRef.current.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
    }

    const norm = clampedDist / STICK_RADIUS;
    if (norm < DEADZONE) {
      input.setVirtualStick(0, 0);
    } else {
      input.setVirtualStick(offsetX / STICK_RADIUS, offsetY / STICK_RADIUS);
    }
  };

  const resetStick = () => {
    activePointerIdRef.current = null;
    input.setVirtualStick(0, 0);
    if (thumbRef.current) {
      thumbRef.current.style.transform = 'translate3d(0px, 0px, 0)';
    }
  };

  const handleStickPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== null) return;
    activePointerIdRef.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateStickFromClient(e.clientX, e.clientY);
  };

  const handleStickPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerIdRef.current) return;
    updateStickFromClient(e.clientX, e.clientY);
  };

  const handleStickPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activePointerIdRef.current) return;
    resetStick();
  };

  const bindAbility = (ability: VirtualAbilityKey) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      input.setVirtualAbility(ability, true);
    },
    onPointerUp: () => {
      input.setVirtualAbility(ability, false);
    },
    onPointerCancel: () => {
      input.setVirtualAbility(ability, false);
    },
  });

  const abilities: {
    id: VirtualAbilityKey;
    cd: number;
    active: boolean;
    symbol: string;
  }[] = [
    { id: 'leap', cd: 0, active: false, symbol: '⇪' },
    { id: 'telekinesis', cd: cooldowns.telekinesis, active: false, symbol: '✦' },
    { id: 'pulse', cd: cooldowns.pulse, active: false, symbol: '◎' },
    { id: 'ward', cd: cooldowns.ward, active: wardActive, symbol: '◈' },
  ];

  return (
    <>
      {/* Top Health, Chapter, Dimension Toggle, Pause & Audio Mute Controls */}
      <div
        style={{
          position: 'fixed',
          top: 18,
          left: 20,
          right: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'none',
          fontFamily: 'monospace',
          userSelect: 'none',
          zIndex: 12,
        }}
      >
        <div style={{ width: 'min(210px, 31vw)' }}>
          <div style={{ color: '#f1faee', fontSize: 12, marginBottom: 4 }}>JANE {janeHealth}</div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 3 }}>
            <div
              style={{
                width: `${janeHealth}%`,
                height: '100%',
                background: '#e63946',
                borderRadius: 3,
                transition: 'width 120ms ease-out',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                color: upsideDown ? '#ff4d6d' : phase === 'overdrive' ? '#c77dff' : '#a8dadc',
                fontSize: 12,
                letterSpacing: 1.5,
              }}
            >
              L{level}/{maxLevel} · {upsideDown ? 'UPSIDE DOWN' : 'HAWKINS'}
            </div>

            <button
              type="button"
              aria-label="Toggle dimension"
              disabled={!shiftReady}
              onClick={toggleDimension}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: `1px solid ${
                  upsideDown
                    ? 'rgba(255, 77, 109, 0.7)'
                    : shiftReady
                      ? 'rgba(199, 125, 255, 0.65)'
                      : 'rgba(255, 255, 255, 0.18)'
                }`,
                background: upsideDown ? 'rgba(128, 15, 47, 0.55)' : 'rgba(20, 19, 26, 0.72)',
                color: shiftReady ? '#f1faee' : 'rgba(241, 250, 238, 0.35)',
                fontSize: 13,
                lineHeight: 1,
                padding: 0,
                cursor: shiftReady ? 'pointer' : 'default',
                pointerEvents: 'auto',
                touchAction: 'manipulation',
              }}
            >
              ⇄
            </button>

            <button
              type="button"
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              onClick={handleToggleMute}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: `1px solid ${muted ? 'rgba(255, 255, 255, 0.24)' : 'rgba(168, 218, 220, 0.55)'}`,
                background: 'rgba(20, 19, 26, 0.72)',
                color: muted ? 'rgba(241, 250, 238, 0.45)' : '#f1faee',
                fontSize: 13,
                lineHeight: 1,
                padding: 0,
                cursor: 'pointer',
                pointerEvents: 'auto',
                touchAction: 'manipulation',
              }}
            >
              {muted ? '✕' : '♪'}
            </button>

            <button
              type="button"
              aria-label="Campaign & Upgrades"
              onClick={togglePaused}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: '1px solid rgba(168, 218, 220, 0.55)',
                background: 'rgba(20, 19, 26, 0.72)',
                color: '#f1faee',
                fontSize: 13,
                lineHeight: 1,
                padding: 0,
                cursor: 'pointer',
                pointerEvents: 'auto',
                touchAction: 'manipulation',
              }}
            >
              ☰
            </button>
          </div>

          <div
            style={{
              color: 'rgba(241, 250, 238, 0.68)',
              fontSize: 10,
              letterSpacing: 1.8,
            }}
          >
            {chapterLabel}
          </div>
          <div
            style={{
              color: cluesCollected >= cluesRequired ? '#80ed99' : '#ffd166',
              fontSize: 10,
              letterSpacing: 1.2,
            }}
          >
            CLUES {cluesCollected}/{cluesRequired} · XP {xp}
          </div>
          {activeBeat && (
            <div
              style={{
                maxWidth: 420,
                textAlign: 'center',
                color: 'rgba(241, 250, 238, 0.82)',
                fontSize: 10,
                lineHeight: 1.35,
                background: 'rgba(12, 11, 18, 0.65)',
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid rgba(168, 218, 220, 0.22)',
              }}
            >
              <span style={{ color: '#ff4d6d' }}>{activeBeat.title}</span> · {activeBeat.speaker}: {activeBeat.transmission}
            </div>
          )}
        </div>

        <div style={{ width: 'min(210px, 31vw)', textAlign: 'right' }}>
          <div style={{ color: '#f1faee', fontSize: 12, marginBottom: 4 }}>
            {currentMission.bossName} {henryHealth}
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 3 }}>
            <div
              style={{
                width: `${henryHealth}%`,
                height: '100%',
                marginLeft: 'auto',
                background: '#9d4edd',
                borderRadius: 3,
                transition: 'width 120ms ease-out',
              }}
            />
          </div>
        </div>
      </div>

      {/* Center-Anchored Off-Frame Threat Pointer */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 8,
        }}
      >
        <div
          ref={threatPointerRef}
          style={{
            opacity: 0,
            color: upsideDown || phase === 'overdrive' ? '#ff2a55' : '#c77dff',
            fontSize: 16,
            lineHeight: 1,
            willChange: 'transform, opacity',
            transition: 'opacity 140ms ease-out',
          }}
        >
          ▲
        </div>
      </div>

      {/* Level 1 Ending Reveal: The Signal Was Only The Beginning */}
      {level === 2 && completedLevels.includes(1) && !revealDismissed && !isPaused && (
        <div
          style={{
            position: "fixed",
            top: 92,
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: 440,
            width: "calc(100% - 32px)",
            background: "rgba(15, 10, 22, 0.9)",
            border: "1px solid rgba(255, 77, 109, 0.65)",
            borderRadius: 6,
            padding: "12px 16px",
            color: "#f1faee",
            fontFamily: "monospace",
            zIndex: 18,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: 2, color: "#ff4d6d" }}>
            THE SIGNAL WAS ONLY THE BEGINNING
          </div>
          <div style={{ fontSize: 11, color: "#a8dadc", lineHeight: 1.45 }}>
            Chapter 1 complete. The frequency leads deeper into Hawkins woods—Chapter 2 is unlocked.
          </div>
          <button
            type="button"
            onClick={() => setRevealDismissed(true)}
            style={{
              alignSelf: "flex-end",
              padding: "5px 12px",
              background: "#e63946",
              color: "#f1faee",
              border: "none",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            CONTINUE
          </button>
        </div>
      )}

      {/* Campaign & Upgrade Overlay (ESC / ☰) */}
      {isPaused && phase !== 'victory' && phase !== 'defeat' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(9, 8, 13, 0.84)',
            color: '#f1faee',
            fontFamily: 'monospace',
            padding: 20,
            gap: 14,
            zIndex: 22,
          }}
        >
          <div style={{ fontSize: 18, letterSpacing: 3, color: '#ff4d6d' }}>
            {currentMission.codeName}: {currentMission.title}
          </div>
          <div style={{ maxWidth: 460, textAlign: 'center', fontSize: 12, color: '#a8dadc', lineHeight: 1.5 }}>
            {currentMission.briefing}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              disabled={xp < UPGRADE_COST_XP || telekinesisRank >= MAX_ABILITY_RANK}
              onClick={() => upgradeAbility('telekinesis')}
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.08)',
                color: '#f1faee',
                border: '1px solid rgba(168, 218, 220, 0.45)',
                borderRadius: 4,
                fontFamily: 'monospace',
                cursor: xp >= UPGRADE_COST_XP && telekinesisRank < MAX_ABILITY_RANK ? 'pointer' : 'default',
              }}
            >
              TELEKINESIS R{telekinesisRank}/{MAX_ABILITY_RANK} ({UPGRADE_COST_XP} XP)
            </button>

            <button
              type="button"
              disabled={xp < UPGRADE_COST_XP || wardRank >= MAX_ABILITY_RANK}
              onClick={() => upgradeAbility('ward')}
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.08)',
                color: '#f1faee',
                border: '1px solid rgba(168, 218, 220, 0.45)',
                borderRadius: 4,
                fontFamily: 'monospace',
                cursor: xp >= UPGRADE_COST_XP && wardRank < MAX_ABILITY_RANK ? 'pointer' : 'default',
              }}
            >
              WARD R{wardRank}/{MAX_ABILITY_RANK} ({UPGRADE_COST_XP} XP)
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 500 }}>
            {Object.values(CAMPAIGN_MISSIONS).map((m) => {
              const unlocked = m.level <= highestUnlockedLevel;
              return (
                <button
                  key={m.level}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => selectChapter(m.level)}
                  style={{
                    padding: '6px 10px',
                    background: m.level === level ? '#e63946' : 'rgba(255,255,255,0.07)',
                    color: unlocked ? '#f1faee' : 'rgba(241, 250, 238, 0.3)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 4,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    cursor: unlocked ? 'pointer' : 'default',
                  }}
                >
                  CH {m.level}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={togglePaused}
            style={{
              padding: '9px 24px',
              background: '#e63946',
              color: '#f1faee',
              border: 'none',
              borderRadius: 4,
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            RESUME
          </button>
        </div>
      )}

      {/* Victory / Defeat Overlay */}
      {(phase === 'victory' || phase === 'defeat') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(9, 8, 13, 0.72)',
            color: '#f1faee',
            fontFamily: 'monospace',
            gap: 14,
            zIndex: 20,
          }}
        >
          <div style={{ fontSize: 28, letterSpacing: 4 }}>{phase.toUpperCase()}</div>
          <button
            type="button"
            onClick={resetMatch}
            style={{
              padding: '10px 24px',
              background: '#e63946',
              color: '#f1faee',
              border: 'none',
              borderRadius: 4,
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            REMATCH
          </button>
        </div>
      )}

      {/* Bottom-Left Circular Directional Control (Touch + Mouse Drag) */}
      <div
        ref={stickZoneRef}
        onPointerDown={handleStickPointerDown}
        onPointerMove={handleStickPointerMove}
        onPointerUp={handleStickPointerUp}
        onPointerCancel={handleStickPointerUp}
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          width: 92,
          height: 92,
          borderRadius: '50%',
          border: '1px solid rgba(168, 218, 220, 0.42)',
          background: 'rgba(20, 19, 26, 0.58)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
          userSelect: 'none',
          zIndex: 10,
        }}
      >
        <div
          ref={thumbRef}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: '1px solid rgba(241, 250, 238, 0.7)',
            background: 'rgba(230, 57, 70, 0.35)',
            pointerEvents: 'none',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Bottom-Right Icon-Only Action Buttons (Multi-Touch) */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          gap: 12,
          touchAction: 'none',
          userSelect: 'none',
          zIndex: 10,
        }}
      >
        {abilities.map((item) => {
          const ready = item.cd <= 0;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.id}
              {...bindAbility(item.id)}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: `1px solid ${
                  item.active
                    ? '#4cc9f0'
                    : ready
                      ? 'rgba(230, 57, 70, 0.85)'
                      : 'rgba(255, 255, 255, 0.18)'
                }`,
                background: item.active ? 'rgba(76, 201, 240, 0.24)' : 'rgba(20, 19, 26, 0.7)',
                color: ready || item.active ? '#f1faee' : 'rgba(241, 250, 238, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 19,
                padding: 0,
                cursor: 'pointer',
                touchAction: 'none',
              }}
            >
              {item.symbol}
            </button>
          );
        })}
      </div>
    </>
  );
}

import { create } from 'zustand';

export type CombatPhase = 'intro' | 'engagement' | 'overdrive' | 'victory' | 'defeat';
export type InputMode = 'desktop' | 'mobile';

export interface AbilityCooldowns {
  telekinesis: number;
  pulse: number;
  ward: number;
}

export interface GameState {
  level: number;
  maxLevel: number;
  upsideDown: boolean;
  janeHealth: number;
  henryHealth: number;
  phase: CombatPhase;
  inputMode: InputMode;
  isPaused: boolean;
  cooldowns: AbilityCooldowns;
  setPhase: (phase: CombatPhase) => void;
  setInputMode: (mode: InputMode) => void;
  setPaused: (paused: boolean) => void;
  setUpsideDown: (active: boolean) => void;
  applyDamage: (target: 'jane' | 'henry', amount: number) => void;
  triggerCooldown: (ability: keyof AbilityCooldowns, durationSec: number) => void;
  tickCooldowns: (deltaSec: number) => void;
  resetMatch: () => void;
}

const INITIAL_COOLDOWNS: AbilityCooldowns = {
  telekinesis: 0,
  pulse: 0,
  ward: 0,
};

const MAX_LEVEL = 4;

export const useGameStore = create<GameState>((set, get) => ({
  level: 1,
  maxLevel: MAX_LEVEL,
  upsideDown: false,
  janeHealth: 100,
  henryHealth: 100,
  phase: 'engagement',
  inputMode: 'desktop',
  isPaused: false,
  cooldowns: { ...INITIAL_COOLDOWNS },

  setPhase: (phase) =>
    set((state) => ({
      phase,
      upsideDown: state.level >= MAX_LEVEL || phase === 'overdrive',
    })),

  setInputMode: (inputMode) => set({ inputMode }),
  setPaused: (isPaused) => set({ isPaused }),
  setUpsideDown: (upsideDown) => set({ upsideDown }),

  applyDamage: (target, amount) => {
    const cleanAmount = Math.max(0, amount);
    if (target === 'jane') {
      const nextHealth = Math.max(0, get().janeHealth - cleanAmount);
      set({
        janeHealth: nextHealth,
        phase: nextHealth <= 0 ? 'defeat' : get().phase,
      });
    } else {
      const nextHealth = Math.max(0, get().henryHealth - cleanAmount);
      if (nextHealth <= 0) {
        const currentLevel = get().level;
        if (currentLevel < MAX_LEVEL) {
          const nextLevel = currentLevel + 1;
          set((state) => ({
            level: nextLevel,
        upsideDown: nextLevel >= 3,
            janeHealth: Math.min(100, state.janeHealth + 35),
            henryHealth: 100,
            phase: 'engagement',
          }));
        } else {
          set({
            henryHealth: 0,
            phase: 'victory',
          });
        }
      } else {
        set({ henryHealth: nextHealth });
      }
    }
  },

  triggerCooldown: (ability, durationSec) =>
    set((state) => ({
      cooldowns: {
        ...state.cooldowns,
        [ability]: Math.max(state.cooldowns[ability], durationSec),
      },
    })),

  tickCooldowns: (deltaSec) =>
    set((state) => {
      const dt = Math.max(0, deltaSec);
      return {
        cooldowns: {
          telekinesis: Math.max(0, state.cooldowns.telekinesis - dt),
          pulse: Math.max(0, state.cooldowns.pulse - dt),
          ward: Math.max(0, state.cooldowns.ward - dt),
        },
      };
    }),

  resetMatch: () =>
    set({
      level: 1,
      maxLevel: MAX_LEVEL,
      upsideDown: false,
      janeHealth: 100,
      henryHealth: 100,
      phase: 'engagement',
      isPaused: false,
      cooldowns: { ...INITIAL_COOLDOWNS },
    }),
}));

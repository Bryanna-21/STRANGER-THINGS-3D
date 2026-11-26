import { create } from 'zustand';
import { getMissionConfig } from '../game/missions';

export type CombatPhase = 'intro' | 'engagement' | 'overdrive' | 'victory' | 'defeat';
export type InputMode = 'desktop' | 'mobile';

export interface AbilityCooldowns {
  telekinesis: number;
  pulse: number;
  ward: number;
}

export interface PersistedCampaignSave {
  highestUnlockedLevel: number;
  xp: number;
  completedLevels: number[];
  telekinesisRank: number;
  wardRank: number;
}

export const CHAPTER_TITLES: Record<number, string> = {
  1: 'THE DISAPPEARANCE',
  2: 'THE FOREST',
  3: 'THE LABORATORY',
  4: 'THE UNDERGROUND',
  5: 'THE OTHER SIDE',
  6: 'THE MIND',
  7: 'THE FINAL BREACH',
};

const SAVE_STORAGE_KEY = 'stranger_things_3d_save_v1';
const MAX_LEVEL = 7;
export const UPGRADE_COST_XP = 100;
export const MAX_ABILITY_RANK = 3;

const INITIAL_COOLDOWNS: AbilityCooldowns = {
  telekinesis: 0,
  pulse: 0,
  ward: 0,
};

function loadSavedProgress(): PersistedCampaignSave {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { highestUnlockedLevel: 1, xp: 0, completedLevels: [], telekinesisRank: 1, wardRank: 1 };
    }
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      return { highestUnlockedLevel: 1, xp: 0, completedLevels: [], telekinesisRank: 1, wardRank: 1 };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedCampaignSave>;
    const highest = Math.max(1, Math.min(MAX_LEVEL, Number(parsed.highestUnlockedLevel) || 1));
    const xp = Math.max(0, Number(parsed.xp) || 0);
    const completed = Array.isArray(parsed.completedLevels)
      ? parsed.completedLevels.filter((n): n is number => typeof n === 'number' && n >= 1 && n <= MAX_LEVEL)
      : [];
    const telekinesisRank = Math.max(1, Math.min(MAX_ABILITY_RANK, Number(parsed.telekinesisRank) || 1));
    const wardRank = Math.max(1, Math.min(MAX_ABILITY_RANK, Number(parsed.wardRank) || 1));
    return { highestUnlockedLevel: highest, xp, completedLevels: completed, telekinesisRank, wardRank };
  } catch {
    return { highestUnlockedLevel: 1, xp: 0, completedLevels: [], telekinesisRank: 1, wardRank: 1 };
  }
}

function writeSavedProgress(save: PersistedCampaignSave): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export interface GameState {
  level: number;
  maxLevel: number;
  upsideDown: boolean;
  dimensionShiftCooldown: number;
  cluesCollected: number;
  cluesRequired: number;
  xp: number;
  telekinesisRank: number;
  wardRank: number;
  highestUnlockedLevel: number;
  completedLevels: number[];
  janeHealth: number;
  henryHealth: number;
  phase: CombatPhase;
  inputMode: InputMode;
  isPaused: boolean;
  cooldowns: AbilityCooldowns;
  setPhase: (phase: CombatPhase) => void;
  setInputMode: (mode: InputMode) => void;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  setUpsideDown: (active: boolean) => void;
  toggleDimension: () => void;
  collectClue: () => void;
  upgradeAbility: (ability: 'telekinesis' | 'ward') => void;
  selectChapter: (targetLevel: number) => void;
  applyDamage: (target: 'jane' | 'henry', amount: number) => void;
  triggerCooldown: (ability: keyof AbilityCooldowns, durationSec: number) => void;
  tickCooldowns: (deltaSec: number) => void;
  resetMatch: () => void;
}

const initialSave = loadSavedProgress();
const level1Mission = getMissionConfig(1);

export const useGameStore = create<GameState>((set, get) => ({
  level: 1,
  maxLevel: MAX_LEVEL,
  upsideDown: false,
  dimensionShiftCooldown: 0,
  cluesCollected: 0,
  cluesRequired: level1Mission.cluesRequired,
  xp: initialSave.xp,
  telekinesisRank: initialSave.telekinesisRank,
  wardRank: initialSave.wardRank,
  highestUnlockedLevel: initialSave.highestUnlockedLevel,
  completedLevels: initialSave.completedLevels,
  janeHealth: 100,
  henryHealth: 100,
  phase: 'engagement',
  inputMode: 'desktop',
  isPaused: false,
  cooldowns: { ...INITIAL_COOLDOWNS },

  setPhase: (phase) =>
    set((state) => ({
      phase,
      upsideDown: state.level >= 5 || phase === 'overdrive' ? true : state.upsideDown,
    })),

  setInputMode: (inputMode) => set({ inputMode }),
  setPaused: (isPaused) => set({ isPaused }),
  togglePaused: () => set((state) => ({ isPaused: !state.isPaused })),
  setUpsideDown: (upsideDown) => set({ upsideDown }),

  toggleDimension: () => {
    const state = get();
    if (state.isPaused || state.dimensionShiftCooldown > 0) return;
    if (state.level >= 5 && state.upsideDown) return;
    set({
      upsideDown: !state.upsideDown,
      dimensionShiftCooldown: 1.2,
    });
  },

  collectClue: () =>
    set((state) => {
      if (state.cluesCollected >= state.cluesRequired) return state;
      const nextClues = state.cluesCollected + 1;
      const nextXp = state.xp + 50;
      writeSavedProgress({
        highestUnlockedLevel: state.highestUnlockedLevel,
        xp: nextXp,
        completedLevels: state.completedLevels,
        telekinesisRank: state.telekinesisRank,
        wardRank: state.wardRank,
      });
      return {
        cluesCollected: nextClues,
        xp: nextXp,
      };
    }),

  upgradeAbility: (ability) =>
    set((state) => {
      if (state.xp < UPGRADE_COST_XP) return state;
      if (ability === 'telekinesis') {
        if (state.telekinesisRank >= MAX_ABILITY_RANK) return state;
        const nextRank = state.telekinesisRank + 1;
        const nextXp = state.xp - UPGRADE_COST_XP;
        writeSavedProgress({
          highestUnlockedLevel: state.highestUnlockedLevel,
          xp: nextXp,
          completedLevels: state.completedLevels,
          telekinesisRank: nextRank,
          wardRank: state.wardRank,
        });
        return { telekinesisRank: nextRank, xp: nextXp };
      }
      if (state.wardRank >= MAX_ABILITY_RANK) return state;
      const nextRank = state.wardRank + 1;
      const nextXp = state.xp - UPGRADE_COST_XP;
      writeSavedProgress({
        highestUnlockedLevel: state.highestUnlockedLevel,
        xp: nextXp,
        completedLevels: state.completedLevels,
        telekinesisRank: state.telekinesisRank,
        wardRank: nextRank,
      });
      return { wardRank: nextRank, xp: nextXp };
    }),

  selectChapter: (targetLevel) => {
    const state = get();
    const clamped = Math.max(1, Math.min(state.highestUnlockedLevel, targetLevel));
    const mission = getMissionConfig(clamped);
    set({
      level: clamped,
      upsideDown: clamped >= 5,
      dimensionShiftCooldown: 0,
      cluesCollected: 0,
      cluesRequired: mission.cluesRequired,
      janeHealth: 100,
      henryHealth: 100,
      phase: clamped >= 6 ? 'overdrive' : 'engagement',
      isPaused: false,
      cooldowns: { ...INITIAL_COOLDOWNS },
    });
  },

  applyDamage: (target, amount) => {
    const cleanAmount = Math.max(0, amount);
    if (target === 'jane') {
      const nextHealth = Math.max(0, get().janeHealth - cleanAmount);
      set({
        janeHealth: nextHealth,
        phase: nextHealth <= 0 ? 'defeat' : get().phase,
      });
    } else {
      const state = get();
      const canFinishBoss = state.cluesCollected >= state.cluesRequired;
      const rawNext = state.henryHealth - cleanAmount;
      const nextHealth = canFinishBoss ? Math.max(0, rawNext) : Math.max(15, rawNext);

      if (nextHealth <= 0 && canFinishBoss) {
        const currentLevel = state.level;
        const completedSet = new Set(state.completedLevels);
        completedSet.add(currentLevel);
        const updatedCompleted = Array.from(completedSet).sort((a, b) => a - b);
        const updatedXp = state.xp + 150 * currentLevel;

        if (currentLevel < MAX_LEVEL) {
          const nextLevel = currentLevel + 1;
          const nextMission = getMissionConfig(nextLevel);
          const nextHighest = Math.max(state.highestUnlockedLevel, nextLevel);
          writeSavedProgress({
            highestUnlockedLevel: nextHighest,
            xp: updatedXp,
            completedLevels: updatedCompleted,
            telekinesisRank: state.telekinesisRank,
            wardRank: state.wardRank,
          });
          set({
            level: nextLevel,
            upsideDown: nextLevel >= 5 ? true : state.upsideDown,
            dimensionShiftCooldown: 0,
            cluesCollected: 0,
            cluesRequired: nextMission.cluesRequired,
            xp: updatedXp,
            highestUnlockedLevel: nextHighest,
            completedLevels: updatedCompleted,
            janeHealth: Math.min(100, state.janeHealth + 35),
            henryHealth: 100,
            phase: nextLevel >= 6 ? 'overdrive' : 'engagement',
          });
        } else {
          writeSavedProgress({
            highestUnlockedLevel: MAX_LEVEL,
            xp: updatedXp,
            completedLevels: updatedCompleted,
            telekinesisRank: state.telekinesisRank,
            wardRank: state.wardRank,
          });
          set({
            henryHealth: 0,
            xp: updatedXp,
            completedLevels: updatedCompleted,
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
      if (state.isPaused) return state;
      const dt = Math.max(0, deltaSec);
      return {
        dimensionShiftCooldown: Math.max(0, state.dimensionShiftCooldown - dt),
        cooldowns: {
          telekinesis: Math.max(0, state.cooldowns.telekinesis - dt),
          pulse: Math.max(0, state.cooldowns.pulse - dt),
          ward: Math.max(0, state.cooldowns.ward - dt),
        },
      };
    }),

  resetMatch: () => {
    const saved = loadSavedProgress();
    const m1 = getMissionConfig(1);
    set({
      level: 1,
      maxLevel: MAX_LEVEL,
      upsideDown: false,
      dimensionShiftCooldown: 0,
      cluesCollected: 0,
      cluesRequired: m1.cluesRequired,
      xp: saved.xp,
      telekinesisRank: saved.telekinesisRank,
      wardRank: saved.wardRank,
      highestUnlockedLevel: saved.highestUnlockedLevel,
      completedLevels: saved.completedLevels,
      janeHealth: 100,
      henryHealth: 100,
      phase: 'engagement',
      isPaused: false,
      cooldowns: { ...INITIAL_COOLDOWNS },
    });
  },
}));

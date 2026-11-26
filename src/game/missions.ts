export type MissionArchetype =
  | 'investigation'
  | 'tracking'
  | 'infiltration'
  | 'underground'
  | 'alternate_realm'
  | 'psychic_domain'
  | 'final_breach';

export interface MissionConfig {
  level: number;
  codeName: string;
  title: string;
  location: string;
  bossName: string;
  archetype: MissionArchetype;
  cluesRequired: number;
  unlockAbilityLabel: string;
  briefing: string;
  bossDamageScale: number;
  bossSpeedScale: number;
}

export const CAMPAIGN_MISSIONS: Record<number, MissionConfig> = {
  1: {
    level: 1,
    codeName: 'CH-01',
    title: 'THE DISAPPEARANCE',
    location: 'Hawkins Residential District',
    bossName: 'THE LOST EXPERIMENT',
    archetype: 'investigation',
    cluesRequired: 2,
    unlockAbilityLabel: 'Telekinetic Surge & Rift Sense',
    briefing: 'Investigate Hawkins disturbances, trace energy anomalies, and confront The Lost Experiment.',
    bossDamageScale: 0.85,
    bossSpeedScale: 0.95,
  },
  2: {
    level: 2,
    codeName: 'CH-02',
    title: 'THE FOREST',
    location: 'Hawkins Woods & Outskirts',
    bossName: 'THE FOREST STALKER',
    archetype: 'tracking',
    cluesRequired: 2,
    unlockAbilityLabel: 'Ambush Ward & Pursuit Evasion',
    briefing: 'Track signal distortion through the tree line and hunt down The Forest Stalker.',
    bossDamageScale: 1.0,
    bossSpeedScale: 1.12,
  },
  3: {
    level: 3,
    codeName: 'CH-03',
    title: 'THE LABORATORY',
    location: 'Hawkins National Laboratory Sector',
    bossName: 'THE CONTAINMENT SUBJECT',
    archetype: 'infiltration',
    cluesRequired: 3,
    unlockAbilityLabel: 'Overcharged Pulse',
    briefing: 'Recover breach logs around the lab perimeter and subdue The Containment Subject.',
    bossDamageScale: 1.12,
    bossSpeedScale: 1.2,
  },
  4: {
    level: 4,
    codeName: 'CH-04',
    title: 'THE UNDERGROUND',
    location: 'Subterranean Root Network',
    bossName: 'THE ROOT GUARDIAN',
    archetype: 'underground',
    cluesRequired: 3,
    unlockAbilityLabel: 'Root-Shock Resilience',
    briefing: 'Navigate the infected fissures and sever The Root Guardian.',
    bossDamageScale: 1.22,
    bossSpeedScale: 1.28,
  },
  5: {
    level: 5,
    codeName: 'CH-05',
    title: 'THE OTHER SIDE',
    location: 'The Upside Down',
    bossName: 'THE SHADOW PREDATOR',
    archetype: 'alternate_realm',
    cluesRequired: 3,
    unlockAbilityLabel: 'Void Rift Mastery',
    briefing: 'Survive corrupted Hawkins in the Upside Down and hunt The Shadow Predator.',
    bossDamageScale: 1.32,
    bossSpeedScale: 1.36,
  },
  6: {
    level: 6,
    codeName: 'CH-06',
    title: 'THE MIND',
    location: 'Psychic Nexus',
    bossName: "THE MIND'S CHOSEN",
    archetype: 'psychic_domain',
    cluesRequired: 4,
    unlockAbilityLabel: 'Mind-Break Resonance',
    briefing: 'Shatter psychic control anchors and confront The Mind’s Chosen.',
    bossDamageScale: 1.42,
    bossSpeedScale: 1.44,
  },
  7: {
    level: 7,
    codeName: 'CH-07',
    title: 'THE FINAL BREACH',
    location: 'Hawkins / Upside Down Convergence',
    bossName: 'THE INTELLIGENCE BEHIND THE UPSIDE DOWN',
    archetype: 'final_breach',
    cluesRequired: 4,
    unlockAbilityLabel: 'Breach Seal',
    briefing: 'Close the dimensional breach and defeat The Intelligence Behind the Upside Down.',
    bossDamageScale: 1.55,
    bossSpeedScale: 1.52,
  },
};

export function getMissionConfig(level: number): MissionConfig {
  return CAMPAIGN_MISSIONS[level] ?? CAMPAIGN_MISSIONS[1];
}

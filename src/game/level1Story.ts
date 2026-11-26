export type Level1BeatId =
  | 'strange_night'
  | 'disappearance'
  | 'something_in_woods'
  | 'first_encounter'
  | 'the_signal';

export interface Level1CharacterProfile {
  role: 'protagonist' | 'friend' | 'investigator' | 'subject' | 'victim';
  codename: string;
  personality: string;
  storyFunction: string;
  rightsNote: string;
}

export interface Level1MissionBeat {
  id: Level1BeatId;
  stepNumber: number;
  title: string;
  zoneLabel: string;
  speaker: string;
  transmission: string;
  objectiveText: string;
}

export const LEVEL_1_CAST: Level1CharacterProfile[] = [
  {
    role: 'protagonist',
    codename: 'Jane (Subject Eleven)',
    personality: 'Quiet, determined, protective; sharp focus under supernatural strain.',
    storyFunction: 'Investigates disturbances, channels telekinesis, and resists dimensional pull.',
    rightsNote: 'Fan-tribute character reference; keep abstractable for independent IP mode.',
  },
  {
    role: 'friend',
    codename: 'Mike / Radio Relay',
    personality: 'Curious, slightly sarcastic, brave despite the static.',
    storyFunction: 'Tracks anomalous radio frequencies and points toward missing-person leads.',
    rightsNote: 'Fan-tribute role; procedural/stylized rig planned.',
  },
  {
    role: 'investigator',
    codename: 'Chief Hopper (Local Investigator)',
    personality: 'Suspicious, hardened, protective of Hawkins residents.',
    storyFunction: 'Flags unusual grid failures and missing-person reports around town.',
    rightsNote: 'Fan-tribute role.',
  },
  {
    role: 'subject',
    codename: 'The Mysterious Subject',
    personality: 'Cold, calculating, eerily calm amid electrical surges.',
    storyFunction: 'Links lab experiments to the widening rift beneath Hawkins.',
    rightsNote: 'Fan-tribute role.',
  },
  {
    role: 'victim',
    codename: 'Will (First Missing Resident)',
    personality: 'Gentle, observant artist whose trail leads into the dark.',
    storyFunction: 'Establishes emotional stakes and leaves early anomaly clues.',
    rightsNote: 'Fan-tribute role.',
  },
];

export const LEVEL_1_BEATS: Level1MissionBeat[] = [
  {
    id: 'strange_night',
    stepNumber: 1,
    title: 'THE STRANGE NIGHT',
    zoneLabel: 'Hawkins Residential Grid',
    speaker: 'RADIO RELAY',
    transmission: 'Static breaking over 1480 kHz... streetlamps flickered twice before the hum started.',
    objectiveText: 'Search Hawkins for anomalous energy clues or engage the threat.',
  },
  {
    id: 'disappearance',
    stepNumber: 2,
    title: 'THE DISAPPEARANCE',
    zoneLabel: 'Hawkins Streets & Outskirts',
    speaker: 'LOCAL INVESTIGATOR',
    transmission: 'A resident vanished near the tree line and power tripped. Watch your step out there.',
    objectiveText: 'Recover remaining signal clues to expose the creature’s weakness.',
  },
  {
    id: 'something_in_woods',
    stepNumber: 3,
    title: 'SOMETHING IN THE WOODS',
    zoneLabel: 'Forest Edge & Rift Line',
    speaker: 'MYSTERIOUS SUBJECT',
    transmission: 'Something crossed from the other side. It hears every pulse you throw.',
    objectiveText: 'Clues secured—strike The Lost Experiment to sever the signal.',
  },
  {
    id: 'first_encounter',
    stepNumber: 4,
    title: 'THE FIRST ENCOUNTER',
    zoneLabel: 'Rift Threshold',
    speaker: 'JANE',
    transmission: 'Hold the ward steady and push back—the barrier is thin here.',
    objectiveText: 'Defeat The Lost Experiment to trace the source signal.',
  },
  {
    id: 'the_signal',
    stepNumber: 5,
    title: 'THE SIGNAL',
    zoneLabel: 'Upside Down Echo',
    speaker: 'SYSTEM LOG',
    transmission: 'Signal locked beneath Hawkins—the distortion is only beginning.',
    objectiveText: 'Advance to Chapter 2: The Forest.',
  },
];

export function resolveLevel1Beat(params: {
  level: number;
  cluesCollected: number;
  cluesRequired: number;
  henryHealth: number;
  phase: string;
}): Level1MissionBeat | null {
  if (params.level !== 1) return null;
  if (params.phase === 'victory' || params.henryHealth <= 0) {
    return LEVEL_1_BEATS[4];
  }
  if (params.cluesCollected >= params.cluesRequired) {
    return params.henryHealth < 75 ? LEVEL_1_BEATS[3] : LEVEL_1_BEATS[2];
  }
  if (params.cluesCollected > 0) {
    return LEVEL_1_BEATS[1];
  }
  return LEVEL_1_BEATS[0];
}

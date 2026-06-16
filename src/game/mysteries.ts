import type { SeededRNG } from './rng';
import type { StarSystem, SystemAnomaly } from './types';

export interface GalaxyMystery {
  id: string;
  name: string;
  discoveryText: string;
  lore: string;
}

export const GALAXY_MYSTERIES: GalaxyMystery[] = [
  {
    id: 'echo-architects',
    name: 'Echo of the Architects',
    discoveryText: 'Harmonic ruins pulse beneath the crust — a civilization that mapped gravity itself.',
    lore: 'The Architects folded spacetime to seed worlds. Their echo still bends local physics, granting +science when explored.',
  },
  {
    id: 'singularity-spire',
    name: 'Singularity Spire',
    discoveryText: 'A needle of compressed dark matter pierces the void, humming with forbidden equations.',
    lore: 'Precursor navigators used the Spire as a beacon. Those who decode its signal gain strategic antimatter.',
  },
  {
    id: 'void-cathedral',
    name: 'Void Cathedral',
    discoveryText: 'Crystalline arches orbit a dead star, singing in frequencies no living ear should hear.',
    lore: 'The Cathedral was a temple of influence. Pilgrims left offerings of titanium; explorers find caches of credits.',
  },
];

export function placeMysterySites(systems: StarSystem[], rng: SeededRNG): void {
  const candidates = systems.filter(s => s.systemType !== 'black_hole' && !s.anomaly);
  const picked = rng.shuffle([...candidates]).slice(0, 3);

  for (let i = 0; i < picked.length && i < GALAXY_MYSTERIES.length; i++) {
    const mystery = GALAXY_MYSTERIES[i];
    const system = picked[i];
    const anomaly: SystemAnomaly = {
      id: `mystery-${mystery.id}`,
      type: 'precursor',
      name: mystery.name,
      description: mystery.discoveryText,
      explored: false,
      rewardClaimed: false,
      loreSnippet: mystery.lore,
    };
    system.anomaly = anomaly;
    system.name = mystery.name;
  }
}

export function getMysteryById(id: string): GalaxyMystery | undefined {
  return GALAXY_MYSTERIES.find(m => m.id === id || `mystery-${m.id}` === id);
}
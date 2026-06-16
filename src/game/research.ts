import type { Technology } from './types';

export const TECH_BRANCHES = {
  military: 'Military Branch',
  economy: 'Economy Branch',
  exploration: 'Exploration Branch',
  science: 'Science Branch',
} as const;

export const TECHNOLOGIES: Technology[] = [
  { id: 'basic_propulsion', name: 'Basic Propulsion', description: 'Unlock scout ships and +1 fleet move', cost: 50, prerequisites: [], unlocks: ['scout'], category: 'exploration', branch: 'exploration' },
  { id: 'agriculture', name: 'Agriculture', description: '+20% food production empire-wide', cost: 40, prerequisites: [], unlocks: ['food_boost'], category: 'economy', branch: 'economy' },
  { id: 'mining', name: 'Mining', description: '+20% industry production, unlock mining complexes', cost: 40, prerequisites: [], unlocks: ['industry_boost'], category: 'economy', branch: 'economy' },
  { id: 'advanced_sensors', name: 'Advanced Sensors', description: 'Reveal adjacent systems on explore', cost: 60, prerequisites: ['basic_propulsion'], unlocks: ['sensor_boost'], category: 'exploration', branch: 'exploration' },
  { id: 'frigate_design', name: 'Frigate Design', description: 'Unlock frigate warships', cost: 80, prerequisites: ['basic_propulsion'], unlocks: ['frigate'], category: 'military', branch: 'military' },
  { id: 'terraforming', name: 'Terraforming', description: 'Colonize desert and ice planets', cost: 70, prerequisites: ['agriculture'], unlocks: ['terraform'], category: 'economy', branch: 'economy' },
  { id: 'trade_networks', name: 'Trade Networks', description: '+2 credits per colonized planet per turn', cost: 60, prerequisites: ['mining'], unlocks: ['trade'], category: 'economy', branch: 'economy' },
  { id: 'orbital_construction', name: 'Orbital Construction', description: 'Unlock spaceport buildings for production queues', cost: 75, prerequisites: ['mining'], unlocks: ['spaceport'], category: 'economy', branch: 'economy' },
  { id: 'cruiser_design', name: 'Cruiser Design', description: 'Unlock heavy cruiser warships', cost: 120, prerequisites: ['frigate_design'], unlocks: ['cruiser'], category: 'military', branch: 'military' },
  { id: 'shield_tech', name: 'Shield Technology', description: '+15% fleet defense, unlock defense grids', cost: 90, prerequisites: ['frigate_design'], unlocks: ['shields'], category: 'military', branch: 'military' },
  { id: 'laser_weapons', name: 'Laser Weapons', description: '+15% fleet attack', cost: 90, prerequisites: ['frigate_design'], unlocks: ['lasers'], category: 'military', branch: 'military' },
  { id: 'destroyer_design', name: 'Destroyer Design', description: 'Unlock destroyer-class warships', cost: 140, prerequisites: ['cruiser_design'], unlocks: ['destroyer'], category: 'military', branch: 'military' },
  { id: 'carrier_design', name: 'Carrier Design', description: 'Unlock carrier warships with fighter wings', cost: 160, prerequisites: ['destroyer_design'], unlocks: ['carrier'], category: 'military', branch: 'military' },
  { id: 'deep_space_scan', name: 'Deep Space Scan', description: 'Reveal all systems within 2 hops', cost: 100, prerequisites: ['advanced_sensors'], unlocks: ['deep_scan'], category: 'exploration', branch: 'exploration' },
  { id: 'xenology', name: 'Xenology', description: '+50% anomaly exploration rewards', cost: 80, prerequisites: ['advanced_sensors'], unlocks: ['xenology_boost'], category: 'exploration', branch: 'exploration' },
  { id: 'planetary_engineering', name: 'Planetary Engineering', description: 'Colonize toxic/barren worlds, unlock hospitals', cost: 100, prerequisites: ['terraforming'], unlocks: ['hospital'], category: 'economy', branch: 'economy' },
  { id: 'advanced_manufacturing', name: 'Advanced Manufacturing', description: '-1 turn on all ship production', cost: 110, prerequisites: ['orbital_construction'], unlocks: ['advanced_manufacturing'], category: 'economy', branch: 'economy' },
  { id: 'quantum_computing', name: 'Quantum Computing', description: '+30% science output — Science Victory tech', cost: 150, prerequisites: ['trade_networks', 'deep_space_scan'], unlocks: ['science_victory'], category: 'science', branch: 'science' },
  { id: 'dreadnought_design', name: 'Dreadnought Design', description: 'Unlock ultimate dreadnought warships', cost: 200, prerequisites: ['carrier_design', 'advanced_manufacturing'], unlocks: ['dreadnought'], category: 'military', branch: 'military' },
  { id: 'strategic_resources', name: 'Strategic Resource Extraction', description: 'Extract rare resources from planets', cost: 90, prerequisites: ['mining'], unlocks: ['strategic_resources'], category: 'economy', branch: 'economy' },
  { id: 'influence_projection', name: 'Influence Projection', description: '+3 influence per turn empire-wide', cost: 100, prerequisites: ['trade_networks'], unlocks: ['influence_boost'], category: 'science', branch: 'science' },
  { id: 'siege_tactics', name: 'Siege Tactics', description: 'Blockading fleets reduce enemy output by 50%', cost: 110, prerequisites: ['destroyer_design'], unlocks: ['siege'], category: 'military', branch: 'military' },
  { id: 'fleet_command', name: 'Fleet Command', description: '+4 fleet command limit', cost: 100, prerequisites: ['cruiser_design'], unlocks: ['fleet_command'], category: 'military', branch: 'military' },
  { id: 'singularity_drive', name: 'Singularity Drive', description: '+2 fleet moves for scouts, unlock late-game mobility', cost: 180, prerequisites: ['quantum_computing', 'dreadnought_design'], unlocks: ['singularity_drive'], category: 'science', branch: 'science' },
  { id: 'galactic_market', name: 'Galactic Market', description: '+5 credits per planet and trade route bonus', cost: 160, prerequisites: ['trade_networks', 'influence_projection'], unlocks: ['galactic_market'], category: 'economy', branch: 'economy' },
  { id: 'planetary_shield', name: 'Planetary Shield', description: '+25% planetary defense in combat', cost: 170, prerequisites: ['shield_tech', 'planetary_engineering'], unlocks: ['planetary_shield'], category: 'military', branch: 'military' },
  { id: 'economic_efficiency', name: 'Economic Efficiency', description: '+5% credits per repeat (max 3)', cost: 80, prerequisites: ['trade_networks'], unlocks: ['economic_efficiency'], category: 'economy', branch: 'economy', repeatable: true, maxRepeats: 3 },
  { id: 'archive_syntax', name: 'Archive Syntax', description: 'Decode stellar archive traces into research data', cost: 120, prerequisites: ['deep_space_scan'], unlocks: ['archive_syntax'], category: 'science', branch: 'science' },
  { id: 'starsilk_extraction', name: 'Starsilk Extraction', description: 'Harvest dangerous reality-code from deposits', cost: 100, prerequisites: ['strategic_resources'], unlocks: ['starsilk_extraction'], category: 'science', branch: 'science' },
  { id: 'forbidden_starbinding', name: 'Forbidden Starbinding Theory', description: 'Catalogue catastrophic Partition macro theory — Stage 0→1', cost: 200, prerequisites: ['quantum_computing', 'singularity_drive'], unlocks: ['forbidden_starbinding'], category: 'science', branch: 'science' },
  { id: 'partition_mathematics', name: 'Partition Mathematics', description: 'Derive geometry to sever reality infrastructure', cost: 180, prerequisites: ['forbidden_starbinding'], unlocks: ['partition_mathematics'], category: 'science', branch: 'science' },
  { id: 'syrin_inerting_method', name: 'Syrin Inerting Method', description: 'Stabilize Starsilk Thread with Syrin Reagent', cost: 150, prerequisites: ['partition_mathematics'], unlocks: ['syrin_inerting_method'], category: 'science', branch: 'science' },
  { id: 'macro_execution', name: 'Macro Execution', description: 'Execute repeatable reality action-loops empire-wide', cost: 160, prerequisites: ['partition_mathematics', 'archive_syntax'], unlocks: ['macro_execution'], category: 'science', branch: 'science' },
];

export function getTechnology(id: string): Technology | undefined {
  return TECHNOLOGIES.find(t => t.id === id);
}

export function getAvailableTechs(researched: string[], repeatableCounts: Record<string, number> = {}): Technology[] {
  return TECHNOLOGIES.filter(t => {
    if (t.repeatable) {
      const count = repeatableCounts[t.id] ?? 0;
      return count < (t.maxRepeats ?? 1) && t.prerequisites.every(p => researched.includes(p));
    }
    return !researched.includes(t.id) && t.prerequisites.every(p => researched.includes(p));
  });
}

export function hasUnlock(researched: string[], unlock: string): boolean {
  return researched.some(id => getTechnology(id)?.unlocks.includes(unlock));
}

export function getTechUnlockPreview(techId: string): string[] {
  const tech = getTechnology(techId);
  return tech?.unlocks ?? [];
}

export function getTechBranchLabel(branch: string): string {
  return TECH_BRANCHES[branch as keyof typeof TECH_BRANCHES] ?? branch;
}

export function getTechCategoryCounts(researched: string[]): Record<Technology['category'], number> {
  const counts: Record<Technology['category'], number> = {
    military: 0,
    economy: 0,
    exploration: 0,
    science: 0,
  };
  for (const id of researched) {
    const tech = getTechnology(id);
    if (tech) counts[tech.category]++;
  }
  return counts;
}

export function getEconomicEfficiencyBonus(repeatableCounts: Record<string, number> = {}): number {
  const count = repeatableCounts['economic_efficiency'] ?? 0;
  return 1 + count * 0.05;
}

export function getTechTreeLayout(): { row: number; col: number; tech: Technology }[] {
  const positions: Record<string, { row: number; col: number }> = {
    basic_propulsion: { row: 0, col: 2 },
    agriculture: { row: 0, col: 0 },
    mining: { row: 0, col: 4 },
    advanced_sensors: { row: 1, col: 2 },
    frigate_design: { row: 1, col: 3 },
    terraforming: { row: 1, col: 0 },
    trade_networks: { row: 1, col: 4 },
    orbital_construction: { row: 2, col: 4 },
    cruiser_design: { row: 2, col: 3 },
    shield_tech: { row: 2, col: 2 },
    laser_weapons: { row: 2, col: 1 },
    destroyer_design: { row: 3, col: 3 },
    carrier_design: { row: 4, col: 3 },
    deep_space_scan: { row: 2, col: 0 },
    xenology: { row: 2, col: 5 },
    planetary_engineering: { row: 2, col: -1 },
    advanced_manufacturing: { row: 3, col: 4 },
    quantum_computing: { row: 3, col: 1 },
    fleet_command: { row: 3, col: 2 },
    singularity_drive: { row: 5, col: 1 },
    galactic_market: { row: 3, col: 5 },
    planetary_shield: { row: 3, col: 0 },
    economic_efficiency: { row: 2, col: 6 },
  };
  return TECHNOLOGIES.map(tech => ({
    row: positions[tech.id]?.row ?? 0,
    col: positions[tech.id]?.col ?? 0,
    tech,
  }));
}
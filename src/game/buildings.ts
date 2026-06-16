import { BUILDING_COSTS, MAX_PLANET_BUILDING_SLOTS } from './constants';
import type { BuildingType, Empire, Planet, Resources } from './types';

export interface BuildingDefinition {
  type: BuildingType;
  name: string;
  description: string;
  techRequired?: string;
  maxPerPlanet: number;
  effects: {
    food?: number;
    industry?: number;
    science?: number;
    credits?: number;
    happiness?: number;
    approval?: number;
    defense?: number;
  };
}

export const BUILDING_DEFINITIONS: BuildingDefinition[] = [
  {
    type: 'farm',
    name: 'Farm Complex',
    description: '+2 food output',
    maxPerPlanet: 3,
    effects: { food: 2, happiness: 2 },
  },
  {
    type: 'factory',
    name: 'Factory',
    description: '+2 industry output',
    maxPerPlanet: 3,
    effects: { industry: 2, approval: 1 },
  },
  {
    type: 'lab',
    name: 'Research Lab',
    description: '+2 science output',
    maxPerPlanet: 2,
    effects: { science: 2, approval: 2 },
  },
  {
    type: 'spaceport',
    name: 'Spaceport',
    description: 'Enables ship production queue',
    techRequired: 'orbital_construction',
    maxPerPlanet: 1,
    effects: { industry: 1, credits: 2 },
  },
  {
    type: 'defense_grid',
    name: 'Defense Grid',
    description: '+5 defense in system combat',
    techRequired: 'shield_tech',
    maxPerPlanet: 1,
    effects: { defense: 5, approval: 3 },
  },
  {
    type: 'hospital',
    name: 'Hospital',
    description: '+5 happiness, +3 approval',
    techRequired: 'planetary_engineering',
    maxPerPlanet: 2,
    effects: { happiness: 5, approval: 3 },
  },
  {
    type: 'mining_complex',
    name: 'Mining Complex',
    description: '+3 credits, +1 industry',
    techRequired: 'mining',
    maxPerPlanet: 2,
    effects: { credits: 3, industry: 1 },
  },
  {
    type: 'market',
    name: 'Trade Market',
    description: '+4 credits per turn',
    techRequired: 'trade_networks',
    maxPerPlanet: 2,
    effects: { credits: 4, approval: 2 },
  },
  {
    type: 'academy',
    name: 'Science Academy',
    description: '+3 science output',
    techRequired: 'xenology',
    maxPerPlanet: 2,
    effects: { science: 3, approval: 2 },
  },
  {
    type: 'fortress',
    name: 'Planetary Fortress',
    description: '+10 defense, +2 approval',
    techRequired: 'shield_tech',
    maxPerPlanet: 1,
    effects: { defense: 10, approval: 2 },
  },
  {
    type: 'orbital_station',
    name: 'Orbital Station',
    description: 'System-wide +10 defense bonus',
    techRequired: 'orbital_construction',
    maxPerPlanet: 1,
    effects: { defense: 5, industry: 1 },
  },
];

export function getBuildingDefinition(type: BuildingType): BuildingDefinition | undefined {
  return BUILDING_DEFINITIONS.find(b => b.type === type);
}

export function getAvailableBuildings(empire: Empire): BuildingDefinition[] {
  return BUILDING_DEFINITIONS.filter(b => {
    if (!b.techRequired) return true;
    return empire.researchedTechs.includes(b.techRequired);
  });
}

export function canBuildOnPlanet(planet: Planet, buildingType: BuildingType, empire: Empire): string | null {
  if (!planet.isColonized || planet.ownerId !== empire.id) return 'Planet not owned';
  const def = getBuildingDefinition(buildingType);
  if (!def) return 'Unknown building';
  if (def.techRequired && !empire.researchedTechs.includes(def.techRequired)) {
    return `Requires ${def.techRequired}`;
  }
  const count = planet.buildings.filter(b => b === buildingType).length;
  if (count >= def.maxPerPlanet) return `Max ${def.maxPerPlanet} per planet`;
  const slots = getPlanetBuildingSlots(planet);
  if (slots.remaining <= 0) return 'No building slots remaining';
  const cost = BUILDING_COSTS[buildingType];
  if (empire.resources.credits < cost.credits) return 'Not enough credits';
  if (empire.resources.industry < cost.industry) return 'Not enough industry';
  return null;
}

const ADJACENCY_SYNERGIES: { pair: [BuildingType, BuildingType]; bonus: Partial<Resources & { happiness: number; approval: number }> }[] = [
  { pair: ['farm', 'hospital'], bonus: { food: 1, happiness: 2 } },
  { pair: ['factory', 'mining_complex'], bonus: { industry: 2, credits: 1 } },
  { pair: ['lab', 'academy'], bonus: { science: 2, approval: 1 } },
];

function getAdjacencyBonuses(buildings: BuildingType[]): Partial<Resources & { happiness: number; approval: number }> {
  const bonus = { credits: 0, food: 0, industry: 0, science: 0, happiness: 0, approval: 0 };
  for (const synergy of ADJACENCY_SYNERGIES) {
    const [a, b] = synergy.pair;
    if (buildings.includes(a) && buildings.includes(b)) {
      bonus.food += synergy.bonus.food ?? 0;
      bonus.industry += synergy.bonus.industry ?? 0;
      bonus.science += synergy.bonus.science ?? 0;
      bonus.credits += synergy.bonus.credits ?? 0;
      bonus.happiness += synergy.bonus.happiness ?? 0;
      bonus.approval += synergy.bonus.approval ?? 0;
    }
  }
  return bonus;
}

export function applyBuildingEffects(planet: Planet): Resources & { happiness: number; approval: number; defense: number } {
  const totals = { credits: 0, food: 0, industry: 0, science: 0, happiness: 0, approval: 0, defense: 0 };
  for (const buildingType of planet.buildings) {
    const def = getBuildingDefinition(buildingType);
    if (!def) continue;
    totals.food += def.effects.food ?? 0;
    totals.industry += def.effects.industry ?? 0;
    totals.science += def.effects.science ?? 0;
    totals.credits += def.effects.credits ?? 0;
    totals.happiness += def.effects.happiness ?? 0;
    totals.approval += def.effects.approval ?? 0;
    totals.defense += def.effects.defense ?? 0;
  }
  const adjacency = getAdjacencyBonuses(planet.buildings);
  totals.food += adjacency.food ?? 0;
  totals.industry += adjacency.industry ?? 0;
  totals.science += adjacency.science ?? 0;
  totals.credits += adjacency.credits ?? 0;
  totals.happiness += adjacency.happiness ?? 0;
  totals.approval += adjacency.approval ?? 0;
  return totals;
}

export function hasSpaceport(planet: Planet): boolean {
  return planet.buildings.includes('spaceport');
}

export function getSystemDefenseBonus(systemPlanets: Planet[], hasOrbitalStation = false): number {
  let bonus = 0;
  for (const planet of systemPlanets) {
    if (!planet.isColonized) continue;
    bonus += applyBuildingEffects(planet).defense;
  }
  if (hasOrbitalStation) {
    bonus += 10;
  }
  return bonus;
}

export function systemHasOrbitalStation(systemPlanets: Planet[]): boolean {
  return systemPlanets.some(p => p.buildings.includes('orbital_station'));
}

export function getPlanetBuildingSlots(planet: Planet): { used: number; max: number; remaining: number } {
  const devBonus = Math.min(2, (planet.developmentLevel ?? 1) - 1);
  const max = Math.min(MAX_PLANET_BUILDING_SLOTS, 4 + devBonus);
  const used = planet.buildings.length;
  return { used, max, remaining: Math.max(0, max - used) };
}
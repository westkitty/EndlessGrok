import type {
  GameEvent,
  GameState,
  Resources,
  StarState,
  StarSystem,
} from './types';

export const COLLAPSE_TURNS = 2;
export const SINGULARITY_FLEET_HAZARD_CHANCE = 0.35;

export function getStarState(system: StarSystem): StarState {
  if (system.systemType === 'black_hole' || system.starState === 'collapsed_black_hole') {
    return 'collapsed_black_hole';
  }
  return system.starState ?? 'stable';
}

export function isCollapsedSystem(system: StarSystem): boolean {
  const state = getStarState(system);
  return state === 'collapsed_black_hole' || state === 'inert_partition_anchor';
}

export function canTargetStarForDive(
  state: GameState,
  systemId: string,
  empireId: string,
): string | null {
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return 'System not found';
  if (system.systemType === 'black_hole' || isCollapsedSystem(system)) {
    return 'Star already collapsed';
  }
  if (system.starState === 'collapsing') return 'Star collapse in progress';
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return 'Empire not found';
  const owns = system.planets.some(p => p.ownerId === empireId && p.isColonized);
  const hasFleet = state.fleets.some(f => f.empireId === empireId && f.systemId === systemId);
  if (!owns && !hasFleet) return 'Requires control or fleet presence at system';
  if (system.id === empire.capitalSystemId) return 'Cannot dive your capital star';
  return null;
}

export function getStarCollapseConsequences(system: StarSystem): {
  populationLoss: number;
  fleetsAtRisk: boolean;
  yieldsLost: Resources;
} {
  let populationLoss = 0;
  const yieldsLost: Resources = { credits: 0, food: 0, industry: 0, science: 0 };
  for (const planet of system.planets) {
    if (planet.isColonized) {
      populationLoss += Math.floor(planet.population * 0.8);
      yieldsLost.food += planet.foodOutput;
      yieldsLost.industry += planet.industryOutput;
      yieldsLost.science += planet.scienceOutput;
      yieldsLost.credits += Math.floor(planet.minerals * 0.5);
    }
  }
  return { populationLoss, fleetsAtRisk: true, yieldsLost };
}

export function getCollapsedSystemYieldChanges(): { food: number; industry: number; science: number } {
  return { food: 0, industry: 0, science: 0 };
}

export function beginStarDive(state: GameState, systemId: string, empireId: string): boolean {
  const err = canTargetStarForDive(state, systemId, empireId);
  if (err) return false;
  const system = state.systems.find(s => s.id === systemId)!;
  system.starState = 'collapsing';
  return true;
}

export function collapseStar(
  state: GameState,
  systemId: string,
  empireId: string,
): GameEvent | null {
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return null;

  for (const planet of system.planets) {
    if (planet.isColonized) {
      planet.population = Math.max(0, planet.population - Math.floor(planet.population * 0.8));
      planet.foodOutput = 0;
      planet.industryOutput = 0;
      planet.scienceOutput = Math.floor(planet.scienceOutput * 0.1);
      planet.happiness = Math.max(0, planet.happiness - 30);
      planet.approval = Math.max(0, planet.approval - 25);
      if (planet.population <= 0) {
        planet.isColonized = false;
        planet.ownerId = null;
      }
    }
    planet.starsilkDeposit = planet.starsilkDeposit === 'none' ? 'siege_lattice_shard' : planet.starsilkDeposit;
  }

  system.starState = 'collapsed_black_hole';
  system.systemType = 'black_hole';
  system.richness = 0;
  system.isArchiveStar = false;

  const hazardFleets = state.fleets.filter(f => f.systemId === systemId);
  for (const fleet of hazardFleets) {
    if (fleet.empireId !== empireId && Math.random() < SINGULARITY_FLEET_HAZARD_CHANCE) {
      fleet.ships = fleet.ships.slice(0, Math.max(1, Math.floor(fleet.ships.length * 0.5)));
    }
  }

  return {
    turn: state.turn,
    type: 'heliocide',
    message: `Heliocide confirmed at ${system.name}. Archive yield terminated. Ledgered singularity registered.`,
  };
}

export function getStarbindingWarnings(system: StarSystem): string[] {
  const warnings: string[] = [];
  if (system.starState === 'starbinding_targeted') {
    warnings.push('Starbinding target — dive irreversible');
  }
  if (system.starState === 'collapsing') {
    warnings.push('Star collapse in progress');
  }
  if (isCollapsedSystem(system)) {
    warnings.push('Singularity hazard — fleet movement risky');
  }
  if (system.isArchiveStar) {
    warnings.push('Archive star — high research syntax value');
  }
  return warnings;
}

export function markPartitionAnchor(system: StarSystem): void {
  system.starState = 'inert_partition_anchor';
  system.systemType = 'black_hole';
}
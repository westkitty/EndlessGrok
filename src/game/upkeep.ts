import {
  BUILDING_MAINTENANCE,
  COLONY_DEVELOPMENT_COST,
  COLONY_DEVELOPMENT_MAX,
  FLEET_UPKEEP,
  OVEREXPANSION_APPROVAL_PENALTY,
  OVEREXPANSION_PLANET_THRESHOLD,
  TRADE_ROUTE_CREDITS_PER_PAIR,
} from './constants';
import type { Empire, Fleet, GameEvent, GameState, Resources, StarSystem } from './types';

export interface UpkeepResult {
  fleetUpkeep: number;
  maintenance: number;
  totalExpenses: Resources;
}

export function calculateFleetUpkeep(fleets: Fleet[]): number {
  let total = 0;
  for (const fleet of fleets) {
    for (const ship of fleet.ships) {
      total += FLEET_UPKEEP[ship.type] ?? 2;
    }
  }
  return total;
}

export function calculateBuildingMaintenance(systems: StarSystem[], empireId: string): number {
  let total = 0;
  for (const system of systems) {
    for (const planet of system.planets) {
      if (planet.ownerId !== empireId || !planet.isColonized) continue;
      for (const building of planet.buildings) {
        total += BUILDING_MAINTENANCE[building] ?? 1;
      }
      total += (planet.developmentLevel ?? 1) - 1;
    }
  }
  return total;
}

export function calculateUpkeep(empire: Empire, systems: StarSystem[], fleets: Fleet[]): UpkeepResult {
  const fleetUpkeep = calculateFleetUpkeep(fleets.filter(f => f.empireId === empire.id));
  const maintenance = calculateBuildingMaintenance(systems, empire.id);
  return {
    fleetUpkeep,
    maintenance,
    totalExpenses: {
      credits: fleetUpkeep + maintenance,
      food: 0,
      industry: 0,
      science: 0,
    },
  };
}

export function applyUpkeep(empire: Empire, systems: StarSystem[], fleets: Fleet[]): UpkeepResult {
  const upkeep = calculateUpkeep(empire, systems, fleets);
  empire.resources.credits = Math.max(0, empire.resources.credits - upkeep.totalExpenses.credits);
  return upkeep;
}

export function applyOverexpansionPenalty(empire: Empire, systems: StarSystem[]): void {
  if (empire.totalPlanets <= OVEREXPANSION_PLANET_THRESHOLD) return;
  const excess = empire.totalPlanets - OVEREXPANSION_PLANET_THRESHOLD;
  const penalty = excess * OVEREXPANSION_APPROVAL_PENALTY;
  for (const system of systems) {
    for (const planet of system.planets) {
      if (planet.ownerId === empire.id && planet.isColonized) {
        planet.approval = Math.max(0, planet.approval - penalty);
      }
    }
  }
}

export function createFoodDeficitEvent(empire: Empire, turn: number): GameEvent {
  return {
    turn,
    type: 'event',
    message: `${empire.name}: food deficit — population starving, growth halted`,
  };
}

export function applyResourceDeficits(
  empire: Empire,
  systems: StarSystem[],
  events?: GameEvent[],
  turn?: number
): void {
  if (empire.resources.food < 0) {
    const deficit = Math.abs(empire.resources.food);
    empire.resources.food = 0;
    for (const system of systems) {
      for (const planet of system.planets) {
        if (planet.ownerId === empire.id && planet.isColonized && planet.population > 1) {
          const loss = Math.min(planet.population - 1, Math.ceil(deficit / 5));
          planet.population -= loss;
          planet.happiness = Math.max(0, planet.happiness - 5);
        }
      }
    }
    if (events && turn !== undefined) {
      events.push(createFoodDeficitEvent(empire, turn));
    }
  }

  if (empire.resources.industry < 0) {
    empire.resources.industry = 0;
    for (const system of systems) {
      for (const planet of system.planets) {
        if (planet.ownerId === empire.id && planet.isColonized) {
          for (const item of planet.productionQueue) {
            item.turnsRemaining += 1;
          }
        }
      }
    }
  }
}

export function processTradeRoutes(state: GameState): number {
  let totalCredits = 0;
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;
    for (const [otherId, dip] of Object.entries(empire.diplomacy)) {
      if (dip !== 'trade') continue;
      const other = state.empires.find(e => e.id === otherId);
      if (other?.isAlive) {
        totalCredits += TRADE_ROUTE_CREDITS_PER_PAIR;
        empire.resources.credits += TRADE_ROUTE_CREDITS_PER_PAIR;
      }
    }
  }
  return totalCredits;
}

export function canUpgradeColony(planet: import('./types').Planet, empire: Empire): string | null {
  if (!planet.isColonized || planet.ownerId !== empire.id) return 'Planet not owned';
  const level = planet.developmentLevel ?? 1;
  if (level >= COLONY_DEVELOPMENT_MAX) return 'Max development reached';
  if (empire.resources.credits < COLONY_DEVELOPMENT_COST.credits) return 'Not enough credits';
  if (empire.resources.industry < COLONY_DEVELOPMENT_COST.industry) return 'Not enough industry';
  return null;
}

export function upgradeColonyDevelopment(planet: import('./types').Planet, empire: Empire): boolean {
  const err = canUpgradeColony(planet, empire);
  if (err) return false;
  empire.resources.credits -= COLONY_DEVELOPMENT_COST.credits;
  empire.resources.industry -= COLONY_DEVELOPMENT_COST.industry;
  planet.developmentLevel = (planet.developmentLevel ?? 1) + 1;
  planet.foodOutput += 1;
  planet.industryOutput += 1;
  planet.scienceOutput += 1;
  planet.maxPopulation += 2;
  return true;
}

export function getSystemSpecializationBonus(
  specialization: import('./types').SystemSpecialization | null | undefined,
  resource: keyof Resources
): number {
  if (!specialization) return 1;
  const bonuses: Record<string, Partial<Record<keyof Resources, number>>> = {
    science: { science: 1.2 },
    industry: { industry: 1.2 },
    economy: { credits: 1.2 },
    military: { industry: 1.1 },
    frontier: { food: 1.15 },
  };
  return bonuses[specialization]?.[resource] ?? 1;
}
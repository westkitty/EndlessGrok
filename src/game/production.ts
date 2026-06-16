import { BUILDING_COSTS, COLONY_SHIP_COST, CRUISER_COST, DESTROYER_COST, DREADNOUGHT_COST, FRIGATE_COST, CARRIER_COST, SCOUT_COST } from './constants';
import { getBuildingDefinition } from './buildings';
import { getFleetCommandLimit } from './combat';
import { hasUnlock } from './research';
import {
  formatMissingStrategicResources,
  getShipStrategicCost,
  spendStrategicCost,
} from './strategicResources';
import { createShip } from './ships';
import type { BuildingType, Empire, Fleet, GameState, Planet, ProductionItem, ShipType } from './types';

export { getShipStrategicCost };

let productionCounter = 0;

export function createProductionId(): string {
  return `prod-${productionCounter++}`;
}

export function resetProductionCounter(): void {
  productionCounter = 0;
}

const SHIP_TURNS: Record<ShipType, number> = {
  scout: 1,
  frigate: 2,
  cruiser: 3,
  destroyer: 4,
  carrier: 5,
  colony: 2,
  dreadnought: 6,
};

const SHIP_COSTS: Record<ShipType, { credits: number; industry: number; tech?: string }> = {
  scout: { ...SCOUT_COST, tech: 'scout' },
  frigate: { ...FRIGATE_COST, tech: 'frigate' },
  cruiser: { ...CRUISER_COST, tech: 'cruiser' },
  destroyer: { ...DESTROYER_COST, tech: 'destroyer' },
  carrier: { ...CARRIER_COST, tech: 'carrier' },
  colony: { ...COLONY_SHIP_COST, tech: 'scout' },
  dreadnought: { ...DREADNOUGHT_COST, tech: 'dreadnought' },
};

export function getProductionQueueEta(item: ProductionItem): { turnsRemaining: number; totalTurns: number; percentComplete: number } {
  const percentComplete = item.totalTurns > 0
    ? ((item.totalTurns - item.turnsRemaining) / item.totalTurns) * 100
    : 0;
  return {
    turnsRemaining: item.turnsRemaining,
    totalTurns: item.totalTurns,
    percentComplete,
  };
}

export function getShipProductionTurns(type: ShipType, empire: Empire): number {
  let turns = SHIP_TURNS[type];
  if (hasUnlock(empire.researchedTechs, 'advanced_manufacturing')) {
    turns = Math.max(1, turns - 1);
  }
  return turns;
}

export function canQueueShip(
  planet: Planet,
  type: ShipType,
  empire: Empire,
  state?: GameState
): string | null {
  if (!planet.isColonized || planet.ownerId !== empire.id) return 'Planet not owned';
  if (!planet.buildings.includes('spaceport')) return 'Requires spaceport — build one first';
  const cost = SHIP_COSTS[type];
  if (cost.tech && !hasUnlock(empire.researchedTechs, cost.tech)) return `Requires ${cost.tech} technology`;
  if (empire.resources.credits < cost.credits) return 'Not enough credits';
  if (empire.resources.industry < cost.industry) return 'Not enough industry';
  const strategicCost = getShipStrategicCost(type);
  const missingStrategic = formatMissingStrategicResources(empire, strategicCost);
  if (missingStrategic) return missingStrategic;
  if (planet.productionQueue.length >= 3) return 'Queue full (max 3 items)';
  if (state) {
    const shipCount = state.fleets
      .filter(f => f.empireId === empire.id)
      .reduce((sum, f) => sum + f.ships.length, 0);
    const queuedShips = state.systems
      .flatMap(s => s.planets)
      .filter(p => p.ownerId === empire.id)
      .flatMap(p => p.productionQueue)
      .filter(q => q.kind === 'ship').length;
    const limit = getFleetCommandLimit(empire);
    if (shipCount + queuedShips >= limit) return `Fleet command limit reached (${limit} ships)`;
  }
  return null;
}

export function canQueueBuilding(planet: Planet, type: BuildingType, empire: Empire): string | null {
  const def = getBuildingDefinition(type);
  if (!def) return 'Unknown building';
  if (!planet.isColonized || planet.ownerId !== empire.id) return 'Planet not owned';
  if (def.techRequired && !empire.researchedTechs.includes(def.techRequired)) {
    return `Requires ${def.techRequired}`;
  }
  const count = planet.buildings.filter(b => b === type).length;
  if (count >= def.maxPerPlanet) return `Max ${def.maxPerPlanet} per planet`;
  const cost = BUILDING_COSTS[type];
  if (empire.resources.credits < cost.credits) return 'Not enough credits';
  if (empire.resources.industry < cost.industry) return 'Not enough industry';
  if (planet.productionQueue.length >= 3) return 'Queue full';
  return null;
}

export function queueShipProduction(
  planet: Planet,
  type: ShipType,
  empire: Empire,
  systemId: string,
  state?: GameState
): ProductionItem | null {
  const err = canQueueShip(planet, type, empire, state);
  if (err) return null;
  const cost = SHIP_COSTS[type];
  const strategicCost = getShipStrategicCost(type);
  empire.resources.credits -= cost.credits;
  empire.resources.industry -= cost.industry;
  if (!spendStrategicCost(empire, strategicCost)) return null;
  const turns = getShipProductionTurns(type, empire);
  const item: ProductionItem = {
    id: createProductionId(),
    type,
    kind: 'ship',
    turnsRemaining: turns,
    totalTurns: turns,
    systemId,
    planetId: planet.id,
  };
  planet.productionQueue.push(item);
  return item;
}

export function queueBuildingProduction(
  planet: Planet,
  type: BuildingType,
  empire: Empire,
  systemId: string
): ProductionItem | null {
  const err = canQueueBuilding(planet, type, empire);
  if (err) return null;
  const cost = BUILDING_COSTS[type];
  empire.resources.credits -= cost.credits;
  empire.resources.industry -= cost.industry;
  const item: ProductionItem = {
    id: createProductionId(),
    type,
    kind: 'building',
    turnsRemaining: cost.turns,
    totalTurns: cost.turns,
    systemId,
    planetId: planet.id,
  };
  planet.productionQueue.push(item);
  return item;
}

function completeShipProduction(
  state: GameState,
  item: ProductionItem,
  planet: Planet,
  empire: Empire
): void {
  const shipType = item.type as ShipType;
  const existingFleet = state.fleets.find(
    f => f.empireId === empire.id && f.systemId === item.systemId && f.movesRemaining > 0 && !f.hasColonyShip
  );
  if (existingFleet && shipType !== 'colony') {
    existingFleet.ships.push(createShip(shipType));
  } else {
    const baseMoves = hasUnlock(empire.researchedTechs, 'scout') ? 3 : 2;
    const fleet: Fleet = {
      id: `fleet-prod-${item.id}`,
      empireId: empire.id,
      systemId: item.systemId,
      ships: [createShip(shipType)],
      movesRemaining: shipType === 'colony' ? 1 : baseMoves,
      hasColonyShip: shipType === 'colony',
      destinationSystemId: null,
      travelPath: [],
      travelTurns: 0,
      stance: 'passive',
      autoExplore: false,
    };
    state.fleets.push(fleet);
  }
  state.events.push({
    turn: state.turn,
    type: 'production',
    message: `${empire.name} completed ${shipType} at ${planet.name}`,
  });
}

function completeBuildingProduction(
  state: GameState,
  item: ProductionItem,
  planet: Planet,
  empire: Empire
): void {
  planet.buildings.push(item.type as BuildingType);
  state.events.push({
    turn: state.turn,
    type: 'production',
    message: `${empire.name} completed ${item.type} at ${planet.name}`,
  });
}

export function processProductionQueues(state: GameState): void {
  for (const system of state.systems) {
    for (const planet of system.planets) {
      if (!planet.isColonized || !planet.ownerId) continue;
      const empire = state.empires.find(e => e.id === planet.ownerId);
      if (!empire || !empire.isAlive) continue;

      const completed: ProductionItem[] = [];
      for (const item of planet.productionQueue) {
        item.turnsRemaining--;
        if (item.turnsRemaining <= 0) {
          completed.push(item);
        }
      }

      for (const item of completed) {
        if (item.kind === 'ship') {
          completeShipProduction(state, item, planet, empire);
        } else {
          completeBuildingProduction(state, item, planet, empire);
        }
        planet.productionQueue = planet.productionQueue.filter(q => q.id !== item.id);
      }
    }
  }
}
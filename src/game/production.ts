import { BUILDING_COSTS } from './constants';
import { getBuildingDefinition } from './buildings';
import { getFleetCommandLimit } from './combat';
import { hasUnlock } from './research';
import {
  calculateShipDesignCost,
  canBuildShipDesign,
  createDefaultShipDesigns,
  createShipFromDesign,
  getBuildableDesigns,
  getDefaultDesignForHull,
  getDesignDisplayStats,
} from './shipDesigns';
import {
  formatMissingStrategicResources,
  getShipStrategicCost,
  spendStrategicCost,
} from './strategicResources';
import { createShip } from './ships';
import type { BuildingType, Empire, Fleet, GameState, Planet, ProductionItem, ShipDesign, ShipType } from './types';

export { getShipStrategicCost, getDesignDisplayStats };

let productionCounter = 0;

export function createProductionId(): string {
  return `prod-${productionCounter++}`;
}

export function resetProductionCounter(): void {
  productionCounter = 0;
}

const HULL_TURNS: Record<ShipType, number> = {
  scout: 1,
  frigate: 2,
  cruiser: 3,
  destroyer: 4,
  carrier: 5,
  colony: 2,
  dreadnought: 6,
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

export function getShipProductionTurns(type: ShipType, empire: Empire, design?: ShipDesign): number {
  let turns = design ? calculateShipDesignCost(design).turns : HULL_TURNS[type];
  if (hasUnlock(empire.researchedTechs, 'advanced_manufacturing')) {
    turns = Math.max(1, turns - 1);
  }
  return turns;
}

export function resolveShipDesign(empire: Empire, hull: ShipType, designId?: string): ShipDesign | null {
  const designs = empire.shipDesigns?.length ? empire.shipDesigns : createDefaultShipDesigns();
  if (designId) {
    const found = designs.find(d => d.id === designId);
    if (found) return found;
  }
  return getDefaultDesignForHull(designs, hull) ?? null;
}

export function canQueueShipDesign(
  planet: Planet,
  design: ShipDesign,
  empire: Empire,
  state?: GameState,
): string | null {
  if (!planet.isColonized || planet.ownerId !== empire.id) return 'Planet not owned';
  if (!planet.buildings.includes('spaceport')) return 'Requires spaceport — build one first';

  const buildErr = canBuildShipDesign(design, empire);
  if (buildErr) return buildErr;

  const cost = calculateShipDesignCost(design);
  const missingStrategic = formatMissingStrategicResources(empire, cost.strategic);
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

/** @deprecated Use canQueueShipDesign with a resolved design */
export function canQueueShip(
  planet: Planet,
  type: ShipType,
  empire: Empire,
  state?: GameState,
): string | null {
  const design = resolveShipDesign(empire, type);
  if (!design) return `No design available for ${type}`;
  return canQueueShipDesign(planet, design, empire, state);
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

export function queueShipDesignProduction(
  planet: Planet,
  design: ShipDesign,
  empire: Empire,
  systemId: string,
  state?: GameState,
): ProductionItem | null {
  const err = canQueueShipDesign(planet, design, empire, state);
  if (err) return null;

  const cost = calculateShipDesignCost(design);
  empire.resources.credits -= cost.credits;
  empire.resources.industry -= cost.industry;
  if (!spendStrategicCost(empire, cost.strategic)) return null;

  const turns = getShipProductionTurns(design.hull, empire, design);
  const item: ProductionItem = {
    id: createProductionId(),
    type: design.hull,
    designId: design.id,
    kind: 'ship',
    turnsRemaining: turns,
    totalTurns: turns,
    systemId,
    planetId: planet.id,
  };
  planet.productionQueue.push(item);
  return item;
}

export function queueShipProduction(
  planet: Planet,
  type: ShipType,
  empire: Empire,
  systemId: string,
  state?: GameState,
  designId?: string,
): ProductionItem | null {
  const design = resolveShipDesign(empire, type, designId);
  if (!design) return null;
  return queueShipDesignProduction(planet, design, empire, systemId, state);
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
  const design = resolveShipDesign(empire, shipType, item.designId);
  const ship = design ? createShipFromDesign(design) : createShip(shipType);
  const designName = design?.name ?? shipType;

  const existingFleet = state.fleets.find(
    f => f.empireId === empire.id && f.systemId === item.systemId && f.movesRemaining > 0 && !f.hasColonyShip
  );
  if (existingFleet && shipType !== 'colony') {
    existingFleet.ships.push(ship);
  } else {
    const baseMoves = hasUnlock(empire.researchedTechs, 'scout') ? 3 : 2;
    const fleet: Fleet = {
      id: `fleet-prod-${item.id}`,
      empireId: empire.id,
      systemId: item.systemId,
      ships: [ship],
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
    message: `${empire.name} completed ${designName} at ${planet.name}`,
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

export function getEmpireBuildableDesigns(empire: Empire): ShipDesign[] {
  return getBuildableDesigns(empire);
}
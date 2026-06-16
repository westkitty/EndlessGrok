import { EMPIRE_COLORS, EMPIRE_EMBLEMS, EMPIRE_NAMES, EMPIRE_TRAITS, STARTING_INFLUENCE } from './constants';
import { createDefaultShipDesigns } from './shipDesigns';
import type {
  EmblemId,
  Empire,
  EmpireTrait,
  Fleet,
  FleetStance,
  Planet,
  SerializedEmpire,
  Ship,
  StarSystem,
} from './types';

export function createFleet(
  id: string,
  empireId: string,
  systemId: string,
  ships: Ship[],
  movesRemaining: number,
  hasColonyShip: boolean,
  overrides?: Partial<Fleet>,
): Fleet {
  return {
    id,
    empireId,
    systemId,
    ships,
    movesRemaining,
    hasColonyShip,
    destinationSystemId: null,
    travelPath: [],
    travelTurns: 0,
    stance: 'passive' as FleetStance,
    autoExplore: false,
    ...overrides,
  };
}

export function createEmpire(
  id: string,
  name: string,
  color: string,
  isPlayer: boolean,
  emblem: EmblemId = 'terran',
  trait: EmpireTrait = 'expansionist',
): Empire {
  return {
    id,
    name,
    color,
    emblem,
    trait,
    isPlayer,
    isAlive: true,
    resources: { credits: 0, food: 0, industry: 0, science: 0 },
    strategicResources: { titanium: 0, antimatter: 0, darkmatter: 0 },
    researchedTechs: ['basic_propulsion'],
    currentResearch: null,
    researchProgress: 0,
    researchQueue: null,
    knownSystems: new Set(),
    visibleSystems: new Set(),
    diplomacy: {},
    totalPlanets: 0,
    influence: STARTING_INFLUENCE,
    influenceVictoryTurns: 0,
    warWeariness: 0,
    capitalSystemId: null,
    score: 0,
  };
}

export function createEmpireFromIndex(index: number, isPlayer: boolean): Empire {
  return createEmpire(
    `empire-${index}`,
    EMPIRE_NAMES[index] ?? `Empire ${index + 1}`,
    EMPIRE_COLORS[index] ?? '#4a9eff',
    isPlayer,
    EMPIRE_EMBLEMS[index] ?? 'terran',
    EMPIRE_TRAITS[index % EMPIRE_TRAITS.length],
  );
}

export function migratePlanet(planet: Planet): Planet {
  return {
    ...planet,
    happiness: planet.happiness ?? 50,
    approval: planet.approval ?? 50,
    buildings: planet.buildings ?? [],
    productionQueue: planet.productionQueue ?? [],
    rareResource: planet.rareResource ?? 'none',
    focus: planet.focus ?? 'balanced',
    isCapital: planet.isCapital ?? false,
  };
}

export function migrateSystem(system: StarSystem): StarSystem {
  return {
    ...system,
    starClass: system.starClass ?? 'G',
    richness: system.richness ?? 1.0,
    anomaly: system.anomaly ?? null,
    exploredBy: system.exploredBy ?? {},
    systemType: system.systemType ?? 'normal',
    orbitalStationOwnerId: system.orbitalStationOwnerId ?? null,
    siegeBlockaders: system.siegeBlockaders ?? [],
    planets: system.planets.map(migratePlanet),
  };
}

export function migrateFleet(fleet: Fleet): Fleet {
  return {
    ...fleet,
    destinationSystemId: fleet.destinationSystemId ?? null,
    travelPath: fleet.travelPath ?? [],
    travelTurns: fleet.travelTurns ?? 0,
    stance: fleet.stance ?? 'passive',
    autoExplore: fleet.autoExplore ?? false,
  };
}

export function migrateEmpire(empire: SerializedEmpire): Empire {
  const index = parseInt(empire.id.replace('empire-', ''), 10) || 0;
  return {
    ...empire,
    emblem: empire.emblem ?? EMPIRE_EMBLEMS[index] ?? 'terran',
    trait: empire.trait ?? EMPIRE_TRAITS[index % EMPIRE_TRAITS.length],
    strategicResources: empire.strategicResources ?? { titanium: 0, antimatter: 0, darkmatter: 0 },
    researchQueue: empire.researchQueue ?? null,
    shipDesigns: empire.shipDesigns ?? createDefaultShipDesigns(),
    activeResearchStrategicSpent: empire.activeResearchStrategicSpent,
    queuedResearchStrategicSpent: empire.queuedResearchStrategicSpent,
    influence: empire.influence ?? STARTING_INFLUENCE,
    influenceVictoryTurns: empire.influenceVictoryTurns ?? 0,
    warWeariness: empire.warWeariness ?? 0,
    capitalSystemId: empire.capitalSystemId ?? null,
    score: empire.score ?? 0,
    knownSystems: new Set(empire.knownSystems),
    visibleSystems: new Set(empire.visibleSystems),
  };
}
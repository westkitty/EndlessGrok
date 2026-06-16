import { describe, it, expect } from 'vitest';
import { createNewGame } from '../game';
import { canStartResearch, startResearch } from '../actions';
import { canQueueShip, queueShipProduction } from '../production';
import {
  canAffordStrategicCost,
  getMissingStrategicResources,
  spendStrategicCost,
} from '../strategicResources';
import { exportSaveToJson, importSaveFromJson } from '../save';
import type { Empire, Planet } from '../types';

function makeEmpire(): Empire {
  return {
    id: 'empire-0',
    name: 'Test',
    color: '#fff',
    emblem: 'terran',
    trait: 'expansionist',
    isPlayer: true,
    isAlive: true,
    resources: { credits: 500, food: 200, industry: 200, science: 100 },
    strategicResources: { titanium: 2, antimatter: 1, darkmatter: 0 },
    researchedTechs: ['basic_propulsion', 'frigate_design', 'cruiser_design'],
    currentResearch: null,
    researchProgress: 0,
    researchQueue: null,
    knownSystems: new Set(),
    visibleSystems: new Set(),
    diplomacy: {},
    totalPlanets: 1,
    influence: 50,
    influenceVictoryTurns: 0,
    warWeariness: 0,
    capitalSystemId: null,
    score: 0,
  };
}

function makePlanet(): Planet {
  return {
    id: 'p-0-0',
    name: 'Test',
    type: 'terran',
    systemId: 's-0',
    ownerId: 'empire-0',
    population: 5,
    maxPopulation: 10,
    foodOutput: 5,
    industryOutput: 5,
    scienceOutput: 2,
    minerals: 2,
    energy: 1,
    isColonized: true,
    happiness: 60,
    approval: 60,
    buildings: ['spaceport'],
    productionQueue: [],
    rareResource: 'none',
    focus: 'balanced',
    isCapital: true,
  };
}

describe('strategic resource gating', () => {
  it('canAffordStrategicCost passes when resources are sufficient', () => {
    const empire = makeEmpire();
    expect(canAffordStrategicCost(empire, { titanium: 1 })).toBe(true);
  });

  it('getMissingStrategicResources reports shortfalls', () => {
    const empire = makeEmpire();
    const missing = getMissingStrategicResources(empire, { titanium: 5, antimatter: 2 });
    expect(missing).toHaveLength(2);
    expect(missing[0].resource).toBe('titanium');
  });

  it('spendStrategicCost reduces empire stockpiles', () => {
    const empire = makeEmpire();
    expect(spendStrategicCost(empire, { titanium: 1, antimatter: 1 })).toBe(true);
    expect(empire.strategicResources.titanium).toBe(1);
    expect(empire.strategicResources.antimatter).toBe(0);
  });

  it('blocks cruiser queue without titanium', () => {
    const empire = makeEmpire();
    empire.strategicResources.titanium = 0;
    const planet = makePlanet();
    const err = canQueueShip(planet, 'cruiser', empire);
    expect(err).toContain('titanium');
  });

  it('queues cruiser and spends titanium upfront', () => {
    const empire = makeEmpire();
    const planet = makePlanet();
    const item = queueShipProduction(planet, 'cruiser', empire, 's-0');
    expect(item).not.toBeNull();
    expect(empire.strategicResources.titanium).toBe(1);
  });

  it('blocks research without strategic resources', () => {
    const game = createNewGame(42, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    player.researchedTechs.push('frigate_design', 'cruiser_design', 'destroyer_design', 'carrier_design', 'advanced_manufacturing', 'orbital_construction', 'mining', 'trade_networks', 'deep_space_scan');
    player.strategicResources = { titanium: 0, antimatter: 0, darkmatter: 0 };
    const err = canStartResearch(game, 'dreadnought_design');
    expect(err).toContain('titanium');
  });

  it('starts research and spends strategic resources upfront', () => {
    const game = createNewGame(42, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    player.researchedTechs.push(
      'frigate_design', 'cruiser_design', 'destroyer_design', 'carrier_design',
      'advanced_manufacturing', 'orbital_construction', 'mining', 'trade_networks', 'deep_space_scan',
    );
    player.strategicResources = { titanium: 5, antimatter: 5, darkmatter: 1 };
    expect(startResearch(game, 'dreadnought_design')).toBe(true);
    expect(player.currentResearch).toBe('dreadnought_design');
    expect(player.strategicResources.titanium).toBe(2);
    expect(player.strategicResources.antimatter).toBe(3);
  });

  it('preserves strategic resources through save/export/import', () => {
    const game = createNewGame(99);
    const player = game.empires.find(e => e.isPlayer)!;
    player.strategicResources = { titanium: 4, antimatter: 2, darkmatter: 1 };
    const result = importSaveFromJson(exportSaveToJson(game));
    expect(result.error).toBeNull();
    const loaded = result.state!.empires.find(e => e.isPlayer)!;
    expect(loaded.strategicResources.titanium).toBe(4);
    expect(loaded.strategicResources.antimatter).toBe(2);
    expect(loaded.strategicResources.darkmatter).toBe(1);
  });
});
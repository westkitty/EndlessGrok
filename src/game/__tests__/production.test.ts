import { describe, it, expect } from 'vitest';
import { canQueueShip, getShipProductionTurns, queueShipProduction } from '../production';
import type { Empire, Planet } from '../types';

function makePlanet(overrides: Partial<Planet> = {}): Planet {
  return {
    id: 'p-0-0', name: 'Test', type: 'terran', systemId: 's-0',
    ownerId: 'empire-0', population: 5, maxPopulation: 50,
    foodOutput: 4, industryOutput: 3, scienceOutput: 2,
    minerals: 5, energy: 3, isColonized: true,
    happiness: 50, approval: 50, buildings: ['spaceport'], productionQueue: [],
    rareResource: 'none', focus: 'balanced', isCapital: false,
    ...overrides,
  };
}

function makeEmpire(overrides: Partial<Empire> = {}): Empire {
  return {
    id: 'empire-0', name: 'Test', color: '#fff', emblem: 'terran', trait: 'expansionist',
    isPlayer: true, isAlive: true,
    resources: { credits: 200, food: 100, industry: 100, science: 50 },
    strategicResources: { titanium: 0, antimatter: 0, darkmatter: 0 },
    researchedTechs: ['basic_propulsion', 'frigate_design', 'orbital_construction'],
    currentResearch: null, researchProgress: 0, researchQueue: null,
    knownSystems: new Set(), visibleSystems: new Set(),
    diplomacy: {}, totalPlanets: 1, influence: 20,
    influenceVictoryTurns: 0, warWeariness: 0, capitalSystemId: null, score: 0,
    ...overrides,
  };
}

describe('Production', () => {
  it('requires spaceport for ship queue', () => {
    const planet = makePlanet({ buildings: [] });
    const empire = makeEmpire();
    expect(canQueueShip(planet, 'scout', empire)).toBe('Requires spaceport — build one first');
  });

  it('queues ship production', () => {
    const planet = makePlanet();
    const empire = makeEmpire();
    const item = queueShipProduction(planet, 'scout', empire, 's-0');
    expect(item).not.toBeNull();
    expect(planet.productionQueue).toHaveLength(1);
    expect(item!.turnsRemaining).toBeGreaterThan(0);
  });

  it('reduces turns with advanced manufacturing', () => {
    const empire = makeEmpire({ researchedTechs: ['basic_propulsion', 'advanced_manufacturing'] });
    const normal = getShipProductionTurns('frigate', makeEmpire());
    const boosted = getShipProductionTurns('frigate', empire);
    expect(boosted).toBeLessThan(normal);
  });
});
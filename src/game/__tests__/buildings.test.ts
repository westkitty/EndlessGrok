import { describe, it, expect } from 'vitest';
import { canBuildOnPlanet, applyBuildingEffects, getAvailableBuildings } from '../buildings';
import type { Empire, Planet } from '../types';

function makePlanet(overrides: Partial<Planet> = {}): Planet {
  return {
    id: 'p-0-0', name: 'Test', type: 'terran', systemId: 's-0',
    ownerId: 'empire-0', population: 5, maxPopulation: 50,
    foodOutput: 4, industryOutput: 3, scienceOutput: 2,
    minerals: 5, energy: 3, isColonized: true,
    happiness: 50, approval: 50, buildings: [], productionQueue: [],
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
    researchedTechs: ['basic_propulsion', 'mining'],
    currentResearch: null, researchProgress: 0, researchQueue: null,
    knownSystems: new Set(), visibleSystems: new Set(),
    diplomacy: {}, totalPlanets: 1, influence: 20,
    influenceVictoryTurns: 0, warWeariness: 0, capitalSystemId: null, score: 0,
    ...overrides,
  };
}

describe('Buildings', () => {
  it('lists available buildings for empire', () => {
    const empire = makeEmpire();
    const available = getAvailableBuildings(empire);
    expect(available.some(b => b.type === 'farm')).toBe(true);
    expect(available.some(b => b.type === 'mining_complex')).toBe(true);
  });

  it('applies building effects', () => {
    const planet = makePlanet({ buildings: ['farm', 'factory'] });
    const effects = applyBuildingEffects(planet);
    expect(effects.food).toBe(2);
    expect(effects.industry).toBe(2);
  });

  it('prevents building when not owned', () => {
    const planet = makePlanet({ ownerId: null, isColonized: false });
    const empire = makeEmpire();
    expect(canBuildOnPlanet(planet, 'farm', empire)).toBe('Planet not owned');
  });

  it('enforces max per planet', () => {
    const planet = makePlanet({ buildings: ['farm', 'farm', 'farm'] });
    const empire = makeEmpire();
    expect(canBuildOnPlanet(planet, 'farm', empire)).toBe('Max 3 per planet');
  });
});
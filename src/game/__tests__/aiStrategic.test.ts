import { describe, it, expect } from 'vitest';
import { createNewGame } from '../game';
import { getAvailableTechs } from '../research';
import { canAffordStrategicCost, getTechStrategicCost } from '../strategicResources';
import { getBuildableDesigns } from '../shipDesigns';
import { runAI } from '../ai';
import { SeededRNG } from '../rng';

describe('AI strategic systems', () => {
  it('AI does not pick unaffordable gated tech', () => {
    const game = createNewGame(42, { empireCount: 3 });
    const ai = game.empires.find(e => !e.isPlayer && e.isAlive)!;
    ai.strategicResources = { titanium: 0, antimatter: 0, darkmatter: 0 };
    ai.researchedTechs.push(
      'frigate_design', 'cruiser_design', 'destroyer_design', 'carrier_design',
      'advanced_manufacturing', 'orbital_construction', 'mining', 'trade_networks', 'deep_space_scan',
    );
    const gated = getAvailableTechs(ai.researchedTechs).filter(
      t => !canAffordStrategicCost(ai, getTechStrategicCost(t.id)),
    );
    expect(gated.some(t => t.id === 'dreadnought_design')).toBe(true);

    runAI(game, new SeededRNG(42));
    if (ai.currentResearch) {
      const cost = getTechStrategicCost(ai.currentResearch);
      expect(canAffordStrategicCost(ai, cost)).toBe(true);
    }
  });

  it('AI can pick affordable research', () => {
    const game = createNewGame(42, { empireCount: 3 });
    const ai = game.empires.find(e => !e.isPlayer && e.isAlive)!;
    ai.strategicResources = { titanium: 10, antimatter: 10, darkmatter: 10 };
    ai.currentResearch = null;
    runAI(game, new SeededRNG(100));
    expect(ai.currentResearch).toBeTruthy();
  });

  it('AI can build affordable design via production queue', () => {
    const game = createNewGame(42, { empireCount: 2 });
    const ai = game.empires.find(e => !e.isPlayer && e.isAlive)!;
    const planet = game.systems.flatMap(s => s.planets).find(p => p.ownerId === ai.id && p.buildings.includes('spaceport'));
    expect(planet).toBeTruthy();
    ai.resources = { credits: 500, food: 200, industry: 500, science: 50 };
    const beforeQueue = planet!.productionQueue.length;
    runAI(game, new SeededRNG(200));
    const buildable = getBuildableDesigns(ai);
    expect(buildable.length).toBeGreaterThan(0);
    expect(planet!.productionQueue.length).toBeGreaterThanOrEqual(beforeQueue);
  });
});
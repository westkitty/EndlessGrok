import { describe, it, expect } from 'vitest';
import { createNewGame } from '../game';
import { getAvailableTechs } from '../research';
import { getBuildableDesigns } from '../shipDesigns';
import { endTurn } from '../game';
import { extractStrategicResources } from '../economy';

describe('strategic resource balance', () => {
  it('new game has at least one buildable ship design', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const buildable = getBuildableDesigns(player);
    expect(buildable.length).toBeGreaterThan(0);
    expect(buildable.some(d => d.hull === 'scout')).toBe(true);
  });

  it('early research has at least one available path', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const available = getAvailableTechs(player.researchedTechs);
    expect(available.length).toBeGreaterThan(0);
  });

  it('strategic deposits appear in generated galaxy', () => {
    const game = createNewGame(42);
    const withDeposit = game.systems.flatMap(s => s.planets).filter(p => p.rareResource !== 'none');
    expect(withDeposit.length).toBeGreaterThan(0);
  });

  it('player homeworld has titanium deposit for opening safety', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const capital = game.systems.find(s => s.id === player.capitalSystemId);
    const homeworld = capital?.planets.find(p => p.isCapital);
    expect(homeworld?.rareResource).toBe('titanium');
    expect(player.strategicResources.titanium).toBeGreaterThanOrEqual(1);
  });

  it('colonized deposit source contributes income after turn processing', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    player.researchedTechs.push('strategic_resources');
    const before = player.strategicResources.titanium;
    extractStrategicResources(player, game.systems);
    expect(player.strategicResources.titanium).toBeGreaterThan(before);
  });

  it('no negative resource stockpile after turn', () => {
    const game = createNewGame(42);
    for (let i = 0; i < 5; i++) {
      endTurn(game);
    }
    for (const empire of game.empires) {
      expect(empire.resources.credits).toBeGreaterThanOrEqual(0);
      expect(empire.strategicResources.titanium).toBeGreaterThanOrEqual(0);
      expect(empire.strategicResources.antimatter).toBeGreaterThanOrEqual(0);
      expect(empire.strategicResources.darkmatter).toBeGreaterThanOrEqual(0);
    }
  });
});
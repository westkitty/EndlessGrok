import { describe, it, expect } from 'vitest';
import { createNewGame } from '../game';
import { canCancelResearch, cancelResearch, startResearch } from '../actions';
import { exportSaveToJson, importSaveFromJson } from '../save';

describe('research cancel and refund', () => {
  it('cancel current research clears active research', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    player.researchedTechs.push('mining');
    expect(startResearch(game, 'agriculture')).toBe(true);
    expect(cancelResearch(game, 'primary')).toBe(true);
    expect(player.currentResearch).toBeNull();
    expect(player.researchProgress).toBe(0);
  });

  it('canceled research does not complete on later turns', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    player.researchedTechs.push('mining');
    startResearch(game, 'agriculture');
    player.researchProgress = 30;
    cancelResearch(game, 'primary');
    player.resources.science = 100;
    expect(player.researchedTechs).not.toContain('agriculture');
  });

  it('refunds strategic resources exactly once on cancel', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    player.researchedTechs.push(
      'frigate_design', 'cruiser_design', 'destroyer_design', 'carrier_design',
      'advanced_manufacturing', 'orbital_construction', 'mining', 'trade_networks', 'deep_space_scan',
    );
    player.strategicResources = { titanium: 5, antimatter: 5, darkmatter: 0 };
    const before = player.strategicResources.titanium;
    startResearch(game, 'dreadnought_design');
    expect(player.strategicResources.titanium).toBeLessThan(before);
    const afterStart = player.strategicResources.titanium;
    cancelResearch(game, 'primary');
    expect(player.strategicResources.titanium).toBe(before);
    cancelResearch(game, 'primary');
    expect(player.strategicResources.titanium).toBe(before);
    expect(afterStart).toBeLessThan(before);
  });

  it('canceling with no active research is safe', () => {
    const game = createNewGame(42);
    expect(canCancelResearch(game, 'primary')).toContain('No active');
    expect(cancelResearch(game, 'primary')).toBe(false);
  });

  it('save/load does not duplicate refund state', () => {
    const game = createNewGame(55);
    const player = game.empires.find(e => e.isPlayer)!;
    player.researchedTechs.push('cruiser_design', 'frigate_design');
    player.strategicResources.titanium = 3;
    startResearch(game, 'destroyer_design');
    const loaded = importSaveFromJson(exportSaveToJson(game)).state!;
    const loadedPlayer = loaded.empires.find(e => e.isPlayer)!;
    expect(loadedPlayer.currentResearch).toBe('destroyer_design');
    expect(loadedPlayer.activeResearchStrategicSpent?.titanium).toBe(2);
  });

  it('creates event log entry on cancel', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    player.researchedTechs.push('mining');
    player.strategicResources.titanium = 2;
    startResearch(game, 'trade_networks');
    const eventsBefore = game.events.length;
    cancelResearch(game, 'primary');
    expect(game.events.length).toBeGreaterThan(eventsBefore);
    expect(game.events[game.events.length - 1].type).toBe('research');
    expect(game.events[game.events.length - 1].message).toContain('canceled');
  });
});
import { describe, it, expect } from 'vitest';
import { getAllStarsilkResources, validateStarsilkResources } from '../resources/registry';
import { getAllStarsilkFactions, validateStarsilkFactions } from '../factions/registry';
import { getAllVictoryPaths, getIrreversibleStages, validateVictoryPaths } from '../victory/registry';
import { getAllStarsilkEvents, validateStarsilkEvents } from '../events/registry';

describe('Starsilk runtime data layers', () => {
  it('defines 10 Phase 4 resources with tooltips', () => {
    const resources = getAllStarsilkResources();
    expect(resources).toHaveLength(10);
    expect(resources.every(r => r.tooltip.mechanical && r.tooltip.lore)).toBe(true);
    expect(validateStarsilkResources()).toEqual([]);
  });

  it('defines 6 Starsilk factions', () => {
    const factions = getAllStarsilkFactions();
    expect(factions).toHaveLength(6);
    expect(validateStarsilkFactions()).toEqual([]);
  });

  it('defines victory paths with irreversible stage warnings', () => {
    const paths = getAllVictoryPaths();
    expect(paths).toHaveLength(4);
    const irreversible = getIrreversibleStages();
    expect(irreversible.length).toBeGreaterThan(0);
    expect(irreversible.every(stage => stage.warning)).toBe(true);
    expect(validateVictoryPaths()).toEqual([]);
  });

  it('defines 12 structured events', () => {
    const events = getAllStarsilkEvents();
    expect(events).toHaveLength(12);
    expect(events.every(e => e.options.length > 0)).toBe(true);
    expect(validateStarsilkEvents()).toEqual([]);
  });
});
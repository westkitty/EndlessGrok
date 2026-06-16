import { describe, it, expect, beforeEach } from 'vitest';
import { createNewGame } from '../game';

function playerCapitalSystem(state: ReturnType<typeof createNewGame>) {
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  return state.systems.find(s => s.id === player.capitalSystemId)
    ?? state.systems.find(s => s.planets.some(p => p.ownerId === player.id && p.isColonized))!;
}
import { executeMacro, getMacroCooldown } from '../macros';
import { unlockStarbindingTestFixture } from '../testFixtures';
import { exportSaveToJson } from '../save';
import { parseAndHydrateSave } from '../saveFormat';
import {
  addOrRefreshMacroEffect,
  applyRecurringMacroEffects,
  getActiveMacroEffectsForEmpire,
  getSystemMacroDefenseBonusPct,
  processMacroEffectDurations,
  resetMacroEffectCounter,
  scrubMacroEffectsInSystem,
} from '../macroEffects';
import { getSystemDefenseRating } from '../combat';
import { processMacroTurn } from '../macros';

describe('Timed macro effects', () => {
  beforeEach(() => {
    resetMacroEffectCounter();
  });

  it('persists active effect across turns', () => {
    const state = createNewGame(11);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    player.starsilkResources!.archiveData = 5;
    const system = playerCapitalSystem(state);

    executeMacro(state, player.id, 'local_checksum_audit', system.id);
    expect(getActiveMacroEffectsForEmpire(player)).toHaveLength(1);
    expect(getActiveMacroEffectsForEmpire(player)[0].turnsRemaining).toBe(3);
  });

  it('decrements duration each turn', () => {
    const state = createNewGame(201);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    addOrRefreshMacroEffect(player, 'local_checksum_audit', player.capitalSystemId!, 'system', 3, 1);

    processMacroEffectDurations(state, player);
    expect(getActiveMacroEffectsForEmpire(player)[0].turnsRemaining).toBe(2);
  });

  it('expires effect and emits event', () => {
    const state = createNewGame(202);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    addOrRefreshMacroEffect(player, 'local_checksum_audit', player.capitalSystemId!, 'system', 1, 1);

    processMacroEffectDurations(state, player);
    expect(getActiveMacroEffectsForEmpire(player)).toHaveLength(0);
    expect(state.events.some(e => e.message.includes('Macro expired'))).toBe(true);
  });

  it('applies recurring archive data gain', () => {
    const state = createNewGame(203);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const planet = state.systems.find(s => s.id === player.capitalSystemId)!.planets[0];
    planet.starsilkDeposit = 'archive_light_field';
    player.starsilkResources!.starsilkThread = 5;
    executeMacro(state, player.id, 'archive_extraction_loop', planet.id);

    const before = player.starsilkResources!.archiveData;
    applyRecurringMacroEffects(state, player);
    expect(player.starsilkResources!.archiveData).toBeGreaterThan(before);
  });

  it('save/load preserves remaining duration', () => {
    const state = createNewGame(204);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    player.starsilkResources!.archiveData = 5;
    const system = state.systems.find(s => s.id === player.capitalSystemId)!;
    executeMacro(state, player.id, 'local_checksum_audit', system.id);

    const loaded = parseAndHydrateSave(JSON.parse(exportSaveToJson(state)));
    const p = loaded.state!.empires.find(e => e.id === player.id)!;
    const effect = getActiveMacroEffectsForEmpire(p)[0];
    expect(effect.turnsRemaining).toBe(3);
    expect(effect.id).toBeTruthy();
    expect(effect.modifiers.defenseBonusPct).toBeGreaterThan(0);
  });

  it('reloading does not double-apply cooldown cost', () => {
    const state = createNewGame(205);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    player.starsilkResources!.archiveData = 5;
    const system = state.systems.find(s => s.id === player.capitalSystemId)!;
    executeMacro(state, player.id, 'local_checksum_audit', system.id);
    const archiveAfter = player.starsilkResources!.archiveData;

    const loaded = parseAndHydrateSave(JSON.parse(exportSaveToJson(state)));
    const p = loaded.state!.empires.find(e => e.id === player.id)!;
    expect(p.starsilkResources!.archiveData).toBe(archiveAfter);
    expect(getMacroCooldown(p, 'local_checksum_audit')).toBe(4);
  });

  it('defense bonus affects combat rating', () => {
    const state = createNewGame(206);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const system = playerCapitalSystem(state);
    const homeworld = system.planets.find(p => p.ownerId === player.id && p.isColonized);
    if (homeworld) homeworld.buildings = [...(homeworld.buildings ?? []), 'defense_grid', 'fortress'];
    const base = getSystemDefenseRating(state, system, player.id);
    addOrRefreshMacroEffect(player, 'siege_lattice_anchor', system.id, 'system', 6, 1);
    const bonus = getSystemMacroDefenseBonusPct(state, system.id, player.id);
    expect(bonus).toBe(0.25);
    expect(getSystemDefenseRating(state, system, player.id)).toBeGreaterThan(base);
  });

  it('counter-scrub removes hostile macro effects', () => {
    const state = createNewGame(207, { empireCount: 3 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const enemy = state.empires.find(e => e.id !== player.id)!;
    const system = state.systems.find(s => s.id === player.capitalSystemId)!;

    addOrRefreshMacroEffect(enemy, 'local_checksum_audit', system.id, 'system', 3, 1);
    const removed = scrubMacroEffectsInSystem(state, system.id, player.id);
    expect(removed).toBe(1);
    expect(getActiveMacroEffectsForEmpire(enemy)).toHaveLength(0);
  });

  it('processMacroTurn applies recurring then decrements', () => {
    const state = createNewGame(208);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    addOrRefreshMacroEffect(player, 'local_checksum_audit', player.capitalSystemId!, 'system', 2, 1);
    processMacroTurn(state, player);
    expect(getActiveMacroEffectsForEmpire(player)[0].turnsRemaining).toBe(1);
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import { createNewGame } from '../game';
import { addOrRefreshMacroEffect, resetMacroEffectCounter } from '../macroEffects';
import {
  getFleetSingularityHazardChance,
  getHazardProtectionLevel,
  isSingularityHazardSystem,
  MITIGATED_HAZARD_CHANCE,
  SEALED_HAZARD_CHANCE,
} from '../hazards';
import { collapseStar, SINGULARITY_FLEET_HAZARD_CHANCE as HELIO_CHANCE } from '../heliocide';
import { getStarbindingSafetyBonus } from '../hazards';
import { unlockStarbindingTestFixture } from '../testFixtures';
import { exportSaveToJson } from '../save';
import { parseAndHydrateSave } from '../saveFormat';
import { SeededRNG } from '../rng';

describe('Hazard suppression integration', () => {
  beforeEach(() => resetMacroEffectCounter());

  it('protected system reduces fleet hazard chance', () => {
    const state = createNewGame(300);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const system = state.systems.find(s => s.id === player.capitalSystemId)!;
    system.starState = 'collapsed_black_hole';
    system.systemType = 'black_hole';
    const fleet = state.fleets.find(f => f.empireId === player.id)!;

    const unprotected = getFleetSingularityHazardChance(state, fleet, system.id);
    expect(unprotected).toBe(HELIO_CHANCE);

    addOrRefreshMacroEffect(player, 'syrin_inerting_mist', system.id, 'system', 3, 1);
    expect(getFleetSingularityHazardChance(state, fleet, system.id)).toBe(MITIGATED_HAZARD_CHANCE);

    addOrRefreshMacroEffect(player, 'gravity_thread_seal', system.id, 'system', 4, 1);
    expect(getFleetSingularityHazardChance(state, fleet, system.id)).toBe(SEALED_HAZARD_CHANCE);
  });

  it('unprotected collapsed system remains hazardous', () => {
    const state = createNewGame(301);
    const system = state.systems[0];
    system.starState = 'collapsed_black_hole';
    expect(isSingularityHazardSystem(system)).toBe(true);
    expect(getHazardProtectionLevel(state, system.id, state.playerEmpireId)).toBe('none');
  });

  it('singularity seal modifies collapse messaging', () => {
    const state = createNewGame(302);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const system = state.systems.find(s => s.planets.some(p => p.ownerId === player.id))!;
    system.planets[0].isColonized = true;
    system.planets[0].ownerId = player.id;
    system.planets[0].population = 5;
    addOrRefreshMacroEffect(player, 'gravity_thread_seal', system.id, 'system', 3, 1);

    const event = collapseStar(state, system.id, player.id, new SeededRNG(302));
    expect(event?.message).toContain('seal');
  });

  it('starbinding safety bonus recognizes protection', () => {
    const state = createNewGame(303);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const systemId = player.capitalSystemId!;
    addOrRefreshMacroEffect(player, 'syrin_inerting_mist', systemId, 'system', 3, 1);
    expect(getStarbindingSafetyBonus(state, player.id, systemId)).toBeGreaterThan(0);
  });

  it('save/load preserves active protection effects', () => {
    const state = createNewGame(304);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const systemId = player.capitalSystemId!;
    addOrRefreshMacroEffect(player, 'gravity_thread_seal', systemId, 'system', 4, 1);

    const loaded = parseAndHydrateSave(JSON.parse(exportSaveToJson(state)));
    const p = loaded.state!.empires.find(e => e.id === player.id)!;
    expect(getHazardProtectionLevel(loaded.state!, systemId, player.id)).toBe('sealed');
    expect(p.activeMacroEffects?.[0].turnsRemaining).toBe(4);
  });
});
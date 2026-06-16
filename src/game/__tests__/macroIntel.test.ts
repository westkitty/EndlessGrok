import { describe, it, expect, beforeEach } from 'vitest';
import { createNewGame } from '../game';
import { addOrRefreshMacroEffect, resetMacroEffectCounter } from '../macroEffects';
import { getMacroIntelSummary, getVisibleMacroIntel } from '../macroIntel';
import { unlockStarbindingTestFixture } from '../testFixtures';
import { processMacroEffectDurations } from '../macroEffects';

describe('Macro intel', () => {
  beforeEach(() => resetMacroEffectCounter());

  it('lists active visible friendly effects', () => {
    const state = createNewGame(600);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const systemId = player.capitalSystemId!;
    addOrRefreshMacroEffect(player, 'local_checksum_audit', systemId, 'system', 3, 1);

    const intel = getVisibleMacroIntel(state, player.id);
    expect(intel.some(e => e.macroId === 'local_checksum_audit')).toBe(true);
    expect(intel.every(e => !e.isHostile || e.sourceEmpireId !== player.id)).toBe(true);
  });

  it('does not reveal hidden rival macros', () => {
    const state = createNewGame(601, { empireCount: 3 });
    const player = state.empires.find(e => e.isPlayer)!;
    const ai = state.empires.find(e => !e.isPlayer)!;
    const hiddenSystem = state.systems.find(s => !player.knownSystems.has(s.id))!;
    addOrRefreshMacroEffect(ai, 'syrin_inerting_mist', hiddenSystem.id, 'system', 3, 1);

    const intel = getVisibleMacroIntel(state, player.id);
    expect(intel.filter(e => e.sourceEmpireId === ai.id)).toHaveLength(0);
  });

  it('duration updates after turn processing', () => {
    const state = createNewGame(602);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    addOrRefreshMacroEffect(player, 'syrin_inerting_mist', player.capitalSystemId!, 'system', 2, 1);
    processMacroEffectDurations(state, player);

    const intel = getVisibleMacroIntel(state, player.id);
    expect(intel[0].turnsRemaining).toBe(1);
  });

  it('summary returns warning severity for expiring protection', () => {
    const state = createNewGame(603);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    addOrRefreshMacroEffect(player, 'gravity_thread_seal', player.capitalSystemId!, 'system', 1, 1);

    const summary = getMacroIntelSummary(state, player.id);
    expect(summary.warnings.some(w => w.testId.includes('expiry'))).toBe(true);
  });
});
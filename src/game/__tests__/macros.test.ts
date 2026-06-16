import { describe, it, expect } from 'vitest';
import { createNewGame } from '../game';
import { canExecuteMacro, executeMacro, getMacroCooldown } from '../macros';
import { unlockStarbindingTestFixture } from '../testFixtures';
import { exportSaveToJson } from '../save';
import { parseAndHydrateSave } from '../saveFormat';

describe('Macro strategic actions', () => {
  it('rejects locked macros', () => {
    const state = createNewGame(10);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const system = state.systems.find(s => s.id === player.capitalSystemId)!;
    const err = canExecuteMacro(state, player.id, 'local_checksum_audit', system.id);
    expect(err).toBe('Macro locked');
  });

  it('executes unlocked macro with valid target and cost', () => {
    const state = createNewGame(11);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    player.starsilkResources!.archiveData = 5;
    const system = state.systems.find(s => s.id === player.capitalSystemId)!;
    expect(executeMacro(state, player.id, 'local_checksum_audit', system.id)).toBe(true);
    expect(player.starsilkResources!.archiveData).toBe(4);
    expect(getMacroCooldown(player, 'local_checksum_audit')).toBe(4);
  });

  it('rejects invalid planet target', () => {
    const state = createNewGame(12);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    player.starsilkResources!.syrinReagent = 5;
    player.starsilkResources!.archiveData = 5;
    const unowned = state.systems.flatMap(s => s.planets).find(p => !p.ownerId)!;
    const err = canExecuteMacro(state, player.id, 'first_dirt_protocol', unowned.id);
    expect(err).toBe('Planet not owned');
  });

  it('persists cooldowns through save/load', () => {
    const state = createNewGame(13);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    player.starsilkResources!.archiveData = 5;
    const system = state.systems.find(s => s.id === player.capitalSystemId)!;
    executeMacro(state, player.id, 'local_checksum_audit', system.id);
    const loaded = parseAndHydrateSave(JSON.parse(exportSaveToJson(state)));
    const p = loaded.state!.empires.find(e => e.id === state.playerEmpireId)!;
    expect(getMacroCooldown(p, 'local_checksum_audit')).toBe(4);
  });
});
import { describe, it, expect } from 'vitest';
import { createNewGame } from '../game';
import { checkVictoryConditions } from '../victory';
import {
  canAchieveSyrinInertingVictory,
  checkSyrinInertingVictory,
  getSyrinInertingVictoryProgress,
  isSyrinInertingUnlocked,
} from '../syrinInertingVictory';
import { setupSyrinInertingVictoryFixture } from '../testFixtures';
import { exportSaveToJson } from '../save';
import { parseAndHydrateSave } from '../saveFormat';

describe('Syrin Inerting victory', () => {
  it('starts incomplete at new game', () => {
    const state = createNewGame(500);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    expect(isSyrinInertingUnlocked(player)).toBe(false);
    expect(checkSyrinInertingVictory(state, player.id)).toBe(false);
    expect(getSyrinInertingVictoryProgress(state, player.id)).toBe(0);
  });

  it('progress increases from real actions', () => {
    const state = createNewGame(501);
    setupSyrinInertingVictoryFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    expect(isSyrinInertingUnlocked(player)).toBe(true);
    expect(getSyrinInertingVictoryProgress(state, player.id)).toBeGreaterThan(0.8);
  });

  it('does not trigger before requirements', () => {
    const state = createNewGame(502);
    setupSyrinInertingVictoryFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    player.starsilkResources!.inertStarsilk = 2;
    expect(canAchieveSyrinInertingVictory(state, player.id)).toContain('Inert Starsilk');
    expect(checkVictoryConditions(state).type).toBeNull();
  });

  it('triggers when requirements met', () => {
    const state = createNewGame(503);
    setupSyrinInertingVictoryFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    expect(checkSyrinInertingVictory(state, player.id)).toBe(true);
    const result = checkVictoryConditions(state);
    expect(result.type).toBe('syrin_inerting');
    expect(result.winnerId).toBe(player.id);
  });

  it('heliocide disqualifies victory', () => {
    const state = createNewGame(504);
    setupSyrinInertingVictoryFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    player.starbinding!.completedDiveSystemIds = ['arch-1'];
    expect(checkSyrinInertingVictory(state, player.id)).toBe(false);
  });

  it('persists through save/load', () => {
    const state = createNewGame(505);
    setupSyrinInertingVictoryFixture(state);
    const loaded = parseAndHydrateSave(JSON.parse(exportSaveToJson(state)));
    const player = loaded.state!.empires.find(e => e.id === state.playerEmpireId)!;
    expect(player.syrinInertingProgress?.systemsProtected.length).toBeGreaterThanOrEqual(3);
    expect(checkSyrinInertingVictory(loaded.state!, player.id)).toBe(true);
  });
});
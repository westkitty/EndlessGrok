import { describe, it, expect } from 'vitest';
import { createNewGame } from '../game';
import {
  beginStarbindingDive,
  buildStarbindingArray,
  checkStarbindingVictory,
  getRequiredStarDives,
  getStarbindingProgress,
  getStarbindingStage,
  isStarbindingUnlocked,
  selectStarbindingTarget,
  stabilizeInertStarsilk,
  beginFinalStarbindingExecution,
  processStarbindingTurn,
} from '../starbinding';
import { collapseStar, isCollapsedSystem } from '../heliocide';
import { unlockStarbindingTestFixture } from '../testFixtures';
import { parseAndHydrateSave } from '../saveFormat';
import { exportSaveToJson } from '../save';
import type { GameState } from '../types';

function setupReadyState(seed = 42): GameState {
  const state = createNewGame(seed, { empireCount: 2 });
  unlockStarbindingTestFixture(state);
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const ownedSystem = state.systems.find(s =>
    s.planets.some(p => p.ownerId === player.id && p.isColonized),
  )!;
  buildStarbindingArray(state, ownedSystem.id, player.id);
  return state;
}

describe('Starbinding victory path', () => {
  it('starts locked without forbidden theory', () => {
    const state = createNewGame(1);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    expect(isStarbindingUnlocked(player)).toBe(false);
    expect(getStarbindingProgress(state, player.id)).toBe(0);
  });

  it('unlocks after research prerequisites', () => {
    const state = createNewGame(2);
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    expect(isStarbindingUnlocked(player)).toBe(true);
  });

  it('rejects invalid star dive targets', () => {
    const state = setupReadyState();
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const capital = state.systems.find(s => s.id === player.capitalSystemId)!;
    expect(selectStarbindingTarget(state, capital.id, player.id)).toBe(false);
  });

  it('accepts valid archive star targets with fleet presence', () => {
    const state = setupReadyState();
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const archive = state.systems.find(s =>
      s.isArchiveStar && s.id !== player.capitalSystemId && s.systemType !== 'black_hole',
    )!;
    state.fleets.push({
      id: 'fleet-test',
      empireId: player.id,
      systemId: archive.id,
      ships: [],
      movesRemaining: 1,
      hasColonyShip: false,
      destinationSystemId: null,
      travelPath: [],
      travelTurns: 0,
      stance: 'passive',
      autoExplore: false,
    });
    expect(selectStarbindingTarget(state, archive.id, player.id)).toBe(true);
    expect(archive.starState).toBe('starbinding_targeted');
  });

  it('collapses star irreversibly on dive completion', () => {
    const state = setupReadyState();
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const archive = state.systems.find(s =>
      s.isArchiveStar && s.id !== player.capitalSystemId,
    )!;
    state.fleets[0].systemId = archive.id;
    selectStarbindingTarget(state, archive.id, player.id);
    expect(beginStarbindingDive(state, archive.id, player.id)).toBe(true);
    player.starbinding!.collapseTurnsRemaining = 1;
    processStarbindingTurn(state, player.id);
    expect(isCollapsedSystem(archive)).toBe(true);
    expect(archive.systemType).toBe('black_hole');
  });

  it('tracks progress from collapsed stars', () => {
    const state = setupReadyState();
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const before = getStarbindingProgress(state, player.id);
    const archive = state.systems.find(s => s.isArchiveStar && s.id !== player.capitalSystemId)!;
    collapseStar(state, archive.id, player.id);
    player.starbinding!.completedDiveSystemIds.push(archive.id);
    const after = getStarbindingProgress(state, player.id);
    expect(after).toBeGreaterThan(before);
  });

  it('persists collapsed systems through save/load', () => {
    const state = setupReadyState();
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const archive = state.systems.find(s => s.isArchiveStar && s.id !== player.capitalSystemId)!;
    collapseStar(state, archive.id, player.id);
    const json = exportSaveToJson(state);
    const loaded = parseAndHydrateSave(JSON.parse(json));
    const sys = loaded.state!.systems.find(s => s.id === archive.id)!;
    expect(isCollapsedSystem(sys)).toBe(true);
  });

  it('triggers victory only when requirements met', () => {
    const state = setupReadyState();
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    expect(checkStarbindingVictory(state, player.id)).toBe(false);

    const required = getRequiredStarDives(state);
    const targets = state.systems.filter(s =>
      !isCollapsedSystem(s) && s.id !== player.capitalSystemId && s.systemType !== 'black_hole',
    );
    expect(targets.length).toBeGreaterThanOrEqual(required);
    for (let i = 0; i < required; i++) {
      collapseStar(state, targets[i].id, player.id);
      player.starbinding!.completedDiveSystemIds.push(targets[i].id);
    }
    player.starsilkResources!.starsilkThread = 10;
    player.starsilkResources!.syrinReagent = 10;
    expect(stabilizeInertStarsilk(state, player.id, 5)).toBe(true);
    expect(player.starbinding!.inertStarsilkStabilized).toBeGreaterThanOrEqual(5);
    expect(beginFinalStarbindingExecution(state, player.id)).toBe(true);
    player.starbinding!.finalExecutionTurnsRemaining = 0;
    player.starbinding!.stage = 8;
    expect(getStarbindingStage(player)).toBeGreaterThanOrEqual(8);
    expect(checkStarbindingVictory(state, player.id)).toBe(true);
  });

  it('applies diplomatic penalties on heliocide', () => {
    const state = setupReadyState();
    const player = state.empires.find(e => e.id === state.playerEmpireId)!;
    const ai = state.empires.find(e => !e.isPlayer)!;
    const before = ai.relationScores?.[player.id] ?? 50;
    const archive = state.systems.find(s => s.isArchiveStar && s.id !== player.capitalSystemId)!;
    state.fleets[0].systemId = archive.id;
    selectStarbindingTarget(state, archive.id, player.id);
    beginStarbindingDive(state, archive.id, player.id);
    const after = ai.relationScores?.[player.id] ?? 50;
    expect(after).toBeLessThan(before);
  });
});

describe('Heliocide core mechanics', () => {
  it('collapsed star cannot be colonized normally', () => {
    const state = createNewGame(3);
    const system = state.systems[1];
    const planet = system.planets[0];
    planet.isColonized = true;
    planet.ownerId = state.playerEmpireId;
    collapseStar(state, system.id, state.playerEmpireId);
    expect(isCollapsedSystem(system)).toBe(true);
    if (planet.population <= 0) {
      expect(planet.isColonized).toBe(false);
    }
  });

  it('generates collapse event', () => {
    const state = createNewGame(4);
    const system = state.systems[2];
    const event = collapseStar(state, system.id, state.playerEmpireId);
    expect(event?.type).toBe('heliocide');
    expect(event?.message).toContain('Heliocide');
  });
});
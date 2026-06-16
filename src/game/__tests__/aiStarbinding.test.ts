import { describe, it, expect } from 'vitest';
import { createNewGame, endTurn } from '../game';
import {
  evaluateStarbindingThreat,
  chooseAIVictoryFocus,
  canAIPursueStarbinding,
  processAIStarbinding,
  aiRespondToStarbindingThreat,
  getAIStarbindingNextAction,
  broadcastRivalStarbindingIntel,
} from '../aiStarbinding';
import { unlockStarbindingTestFixture } from '../testFixtures';
import { SeededRNG } from '../rng';
import { getStarbindingStage } from '../starbinding';

describe('AI Starbinding reactions', () => {
  it('threat evaluation increases with starbinding progress', () => {
    const state = createNewGame(100, { empireCount: 3 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.isPlayer)!;
    const ai = state.empires.find(e => !e.isPlayer)!;
    ai.ideologyTags = ['solidarity'];

    const baseline = evaluateStarbindingThreat(state, ai.id, player.id);

    player.starbinding!.arraySystemId = player.capitalSystemId!;
    const archive = state.systems.find(s => s.isArchiveStar)!;
    player.starbinding!.completedDiveSystemIds = [archive.id];

    const elevated = evaluateStarbindingThreat(state, ai.id, player.id);
    expect(elevated.threatScore).toBeGreaterThan(baseline.threatScore);
    expect(elevated.shouldOppose).toBe(true);
  });

  it('ideology changes reaction severity', () => {
    const state = createNewGame(101, { empireCount: 3 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.isPlayer)!;
    const archive = state.systems.find(s => s.isArchiveStar)!;
    player.starbinding!.arraySystemId = player.capitalSystemId!;
    player.starbinding!.completedDiveSystemIds = [archive.id];

    const ais = state.empires.filter(e => !e.isPlayer);
    ais[0].ideologyTags = ['archive'];
    ais[1].ideologyTags = ['drakken'];

    const archiveEval = evaluateStarbindingThreat(state, ais[0].id, player.id);
    const drakkenEval = evaluateStarbindingThreat(state, ais[1].id, player.id);
    expect(archiveEval.threatScore).toBeGreaterThan(drakkenEval.threatScore);
  });

  it('does not ignore completed heliocides', () => {
    const state = createNewGame(102, { empireCount: 3 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.isPlayer)!;
    const ai = state.empires.find(e => !e.isPlayer)!;
    ai.ideologyTags = ['archive'];

    player.starbinding!.arraySystemId = player.capitalSystemId!;
    const noDive = evaluateStarbindingThreat(state, ai.id, player.id);

    const archive = state.systems.find(s => s.isArchiveStar)!;
    player.starbinding!.completedDiveSystemIds = [archive.id, archive.id];
    const withDives = evaluateStarbindingThreat(state, ai.id, player.id);

    expect(withDives.threatScore).toBeGreaterThan(noDive.threatScore);
  });

  it('generates diplomatic warning when threat is high', () => {
    const state = createNewGame(103, { empireCount: 3 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.isPlayer)!;
    const ai = state.empires.find(e => !e.isPlayer)!;
    ai.ideologyTags = ['archive'];
    player.starbinding!.arraySystemId = player.capitalSystemId!;
    const archive = state.systems.find(s => s.isArchiveStar)!;
    player.starbinding!.targetSystemIds = [archive.id];
    player.starbinding!.completedDiveSystemIds = [archive.id];
    state.turn = 1;

    const rng = new SeededRNG(103);
    const eventsBefore = state.events.length;
    aiRespondToStarbindingThreat(state, ai, rng);
    expect(state.events.length).toBeGreaterThan(eventsBefore);
    expect(state.events.some(e => e.type === 'diplomacy')).toBe(true);
  });

  it('non-hostile factions do not behave identically', () => {
    const state = createNewGame(104, { empireCount: 4 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.isPlayer)!;
    const archive = state.systems.find(s => s.isArchiveStar)!;
    player.starbinding!.arraySystemId = player.capitalSystemId!;
    player.starbinding!.completedDiveSystemIds = [archive.id];

    const ais = state.empires.filter(e => !e.isPlayer);
    ais[0].ideologyTags = ['archive'];
    ais[1].ideologyTags = ['drakken'];

    const scores = ais.map(ai => evaluateStarbindingThreat(state, ai.id, player.id).threatScore);
    expect(scores[0]).not.toBe(scores[1]);
  });
});

describe('AI Starbinding pursuit', () => {
  it('eligible AI can choose Starbinding focus', () => {
    const state = createNewGame(105, { empireCount: 3 });
    const ai = state.empires.find(e => !e.isPlayer)!;
    unlockStarbindingTestFixture(state, ai.id);
    ai.ideologyTags = ['frontier'];

    const focus = chooseAIVictoryFocus(state, ai.id);
    expect(focus).toBe('starbinding');
  });

  it('ineligible AI rejects Starbinding pursuit', () => {
    const state = createNewGame(106, { empireCount: 3 });
    const ai = state.empires.find(e => !e.isPlayer)!;
    ai.ideologyTags = ['archive'];
    const result = canAIPursueStarbinding(state, ai);
    expect(result.eligible).toBe(false);
  });

  it('respects missing prerequisites', () => {
    const state = createNewGame(107, { empireCount: 3 });
    const ai = state.empires.find(e => !e.isPlayer)!;
    ai.ideologyTags = ['frontier'];
    const result = canAIPursueStarbinding(state, ai);
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/Prerequisites|strategic need/i);
  });

  it('deterministic AI selects next action when requirements met', () => {
    const state = createNewGame(110, { empireCount: 3 });
    const ai = state.empires.find(e => !e.isPlayer)!;
    unlockStarbindingTestFixture(state, ai.id);
    ai.ideologyTags = ['frontier'];
    ai.aiVictoryFocus = 'starbinding';
    ai.starsilkResources!.starsilkThread = 5;
    ai.starsilkResources!.syrinReagent = 5;

    const action = getAIStarbindingNextAction(state, ai);
    expect(action).toBeTruthy();
    expect(['research', 'array', 'target', 'move', 'dive', 'stabilize', 'final']).toContain(action);
  });

  it('broadcasts rival intel to player with visibility', () => {
    const state = createNewGame(111, { empireCount: 3 });
    const ai = state.empires.find(e => !e.isPlayer)!;
    const player = state.empires.find(e => e.isPlayer)!;
    unlockStarbindingTestFixture(state, ai.id);
    ai.starbinding!.arraySystemId = ai.capitalSystemId!;
    player.knownSystems.add(ai.capitalSystemId!);

    const before = state.events.length;
    broadcastRivalStarbindingIntel(state, ai, 'array', ai.capitalSystemId!);
    expect(state.events.length).toBeGreaterThan(before);
    expect(state.events.some(e => e.message.includes('Starbinding Array'))).toBe(true);
  });

  it('processAIStarbinding surfaces rival progress when visible', () => {
    const state = createNewGame(108, { empireCount: 3 });
    unlockStarbindingTestFixture(state);
    const ai = state.empires.find(e => !e.isPlayer)!;
    ai.ideologyTags = ['frontier'];
    ai.aiVictoryFocus = 'starbinding';
    ai.aiVictoryFocusTurn = state.turn;
    ai.starbinding!.arraySystemId = ai.capitalSystemId!;

    const player = state.empires.find(e => e.isPlayer)!;
    player.knownSystems.add(ai.capitalSystemId!);

    const rng = new SeededRNG(108);
    processAIStarbinding(state, rng);
    expect(getStarbindingStage(ai)).toBeGreaterThanOrEqual(4);
  });

  it('end turn runs AI starbinding without error', () => {
    const state = createNewGame(109, { empireCount: 3 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.isPlayer)!;
    player.starbinding!.arraySystemId = player.capitalSystemId!;
    const next = endTurn(structuredClone(state));
    expect(next.turn).toBe(state.turn + 1);
  });
});
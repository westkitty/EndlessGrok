import { describe, it, expect } from 'vitest';
import { createNewGame, endTurn } from '../game';
import { applyStarbindingDiplomaticReactions } from '../starbindingDiplomacy';
import { unlockStarbindingTestFixture } from '../testFixtures';

describe('Starbinding diplomacy deduplication', () => {
  it('applies relation delta once per milestone', () => {
    const state = createNewGame(400, { empireCount: 3 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.isPlayer)!;
    const ai = state.empires.find(e => !e.isPlayer)!;
    ai.ideologyTags = ['archive'];
    player.starbinding!.arraySystemId = player.capitalSystemId!;
    player.starbinding!.completedDiveSystemIds = [state.systems.find(s => s.isArchiveStar)!.id];

    applyStarbindingDiplomaticReactions(state);
    const afterFirst = ai.relationScores?.[player.id] ?? 50;

    applyStarbindingDiplomaticReactions(state);
    const afterSecond = ai.relationScores?.[player.id] ?? 50;

    expect(afterSecond).toBe(afterFirst);
  });

  it('applies new delta when dive count increases', () => {
    const state = createNewGame(401, { empireCount: 3 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.isPlayer)!;
    const ai = state.empires.find(e => !e.isPlayer)!;
    player.starbinding!.arraySystemId = player.capitalSystemId!;

    applyStarbindingDiplomaticReactions(state);
    const baseline = ai.relationScores?.[player.id] ?? 50;

    player.starbinding!.completedDiveSystemIds = ['sys-1'];
    applyStarbindingDiplomaticReactions(state);
    const afterDive = ai.relationScores?.[player.id] ?? 50;

    expect(afterDive).toBeLessThan(baseline);
  });

  it('ideology-specific messages differ', () => {
    const state = createNewGame(402, { empireCount: 4 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.isPlayer)!;
    player.starbinding!.completedDiveSystemIds = [state.systems.find(s => s.isArchiveStar)!.id];
    player.starbinding!.arraySystemId = player.capitalSystemId!;

    const ais = state.empires.filter(e => !e.isPlayer);
    ais[0].ideologyTags = ['archive'];
    ais[1].ideologyTags = ['syrin'];

    applyStarbindingDiplomaticReactions(state);
    const messages = state.events.filter(e => e.type === 'diplomacy').map(e => e.message);
    expect(messages.some(m => m.includes('heliocide') || m.includes('memory'))).toBe(true);
    expect(messages.some(m => m.includes('weaponization') || m.includes('condemns'))).toBe(true);
  });

  it('end turn does not double-apply progress reactions', () => {
    const state = createNewGame(403, { empireCount: 3 });
    unlockStarbindingTestFixture(state);
    const player = state.empires.find(e => e.isPlayer)!;
    const ai = state.empires.find(e => !e.isPlayer)!;
    player.starbinding!.arraySystemId = player.capitalSystemId!;
    player.starbinding!.completedDiveSystemIds = [state.systems.find(s => s.isArchiveStar)!.id];

    const next = endTurn(structuredClone(state));
    const aiAfter = next.empires.find(e => e.id === ai.id)!;
    const score1 = aiAfter.relationScores?.[player.id] ?? 50;

    const next2 = endTurn(structuredClone(next));
    const aiAfter2 = next2.empires.find(e => e.id === ai.id)!;
    const score2 = aiAfter2.relationScores?.[player.id] ?? 50;

    expect(score2).toBe(score1);
  });
});
import { describe, it, expect } from 'vitest';
import { createNewGame } from '../game';
import {
  getFactionReactionToHeliocide,
  getFactionReactionToStarbindingProgress,
  getFactionReactionToBloodRingUse,
  getFactionIdeologyTags,
} from '../factionIdeology';

describe('Faction ideology reactions', () => {
  it('differs by ideology for heliocide', () => {
    const state = createNewGame(20, { empireCount: 3 });
    const player = state.empires[0];
    const archiveEmpire = { ...state.empires[1], ideologyTags: ['archive' as const] };
    const drakkenEmpire = { ...state.empires[2], ideologyTags: ['drakken' as const] };
    const archiveRx = getFactionReactionToHeliocide(archiveEmpire, player.id);
    const drakkenRx = getFactionReactionToHeliocide(drakkenEmpire, player.id);
    expect(archiveRx.relationDelta).toBeLessThan(drakkenRx.relationDelta);
  });

  it('increases threat with starbinding progress', () => {
    const observer = { id: 'e-1', name: 'Observer', ideologyTags: ['solidarity' as const] } as ReturnType<typeof createNewGame>['empires'][0];
    const low = getFactionReactionToStarbindingProgress(observer, 0.1);
    const high = getFactionReactionToStarbindingProgress(observer, 0.9);
    expect(high.threat).toBeGreaterThan(low.threat);
    expect(high.relationDelta).toBeLessThan(low.relationDelta);
  });

  it('blood ring use penalized more for syrin factions', () => {
    const syrin = getFactionReactionToBloodRingUse({ ideologyTags: ['syrin'] } as never);
    const drakken = getFactionReactionToBloodRingUse({ ideologyTags: ['drakken'] } as never);
    expect(syrin).toBeLessThan(drakken);
  });

  it('assigns default ideology tags', () => {
    const state = createNewGame(21);
    const tags = getFactionIdeologyTags(state.empires[0]);
    expect(tags.length).toBeGreaterThan(0);
  });
});
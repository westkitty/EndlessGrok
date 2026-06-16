import { describe, it, expect } from 'vitest';
import { createNewGame } from '../../../game/game';
import { getPrimaryMapBadge, getSystemMapStateBadges } from '../mapStateBadges';

describe('map state badges', () => {
  it('returns collapsed badge for singularity systems', () => {
    const state = createNewGame(501, { empireCount: 2 });
    const system = state.systems[0];
    system.starState = 'collapsed_black_hole';
    system.systemType = 'black_hole';

    const badges = getSystemMapStateBadges(system, state, state.playerEmpireId);
    expect(badges.some(b => b.mechanicalKey === 'map:collapsed_black_hole')).toBe(true);
    expect(getPrimaryMapBadge(system, state, state.playerEmpireId)?.mechanicalKey).toBe('map:collapsed_black_hole');
  });

  it('returns archive badge for archive stars', () => {
    const state = createNewGame(502, { empireCount: 2 });
    const archive = state.systems.find(s => s.isArchiveStar && s.systemType !== 'black_hole');
    expect(archive).toBeTruthy();
    const badges = getSystemMapStateBadges(archive!, state, state.playerEmpireId);
    expect(badges.some(b => b.mechanicalKey === 'map:archive_star')).toBe(true);
  });
});
import { describe, it, expect } from 'vitest';
import { createNewGame, endTurn } from '../game';
import { setFleetDestination } from '../actions';
import {
  filterFleetSummaries,
  getFleetStatus,
  getPlayerFleetSummaries,
} from '../fleetManager';

function cloneState<T>(state: T): T {
  return structuredClone(state);
}

describe('fleet manager', () => {
  it('lists player fleets', () => {
    const game = createNewGame(44, { empireCount: 2 });
    const summaries = getPlayerFleetSummaries(game);
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.every(s => s.fleet.empireId === game.playerEmpireId)).toBe(true);
  });

  it('shows moving status when fleet has destination', () => {
    const game = createNewGame(45, { empireCount: 2 });
    const fleet = game.fleets.find(f => f.empireId === game.playerEmpireId);
    if (!fleet) return;

    const dest = game.systems.find(s => s.id !== fleet.systemId && s.connections.includes(fleet.systemId));
    if (!dest) return;

    setFleetDestination(game, fleet.id, dest.id);
    expect(getFleetStatus(fleet)).toBe('moving');

    const summaries = getPlayerFleetSummaries(game);
    const moving = summaries.find(s => s.fleet.id === fleet.id);
    expect(moving?.status).toBe('moving');
    expect(moving?.destinationName).toBe(dest.name);
  });

  it('filters idle fleets', () => {
    const game = createNewGame(46, { empireCount: 2 });
    const all = getPlayerFleetSummaries(game);
    const idle = filterFleetSummaries(all, 'idle');
    expect(idle.every(s => s.status === 'idle')).toBe(true);
  });

  it('reflects state after end turn', () => {
    const game = createNewGame(47, { empireCount: 2 });
    const before = getPlayerFleetSummaries(game)[0]?.fleet.movesRemaining;
    const after = endTurn(cloneState(game));
    const fleet = after.fleets.find(f => f.empireId === after.playerEmpireId);
    if (before !== undefined && fleet) {
      expect(fleet.movesRemaining).toBeGreaterThanOrEqual(before);
    }
  });
});
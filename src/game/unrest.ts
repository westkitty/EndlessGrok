import { UNREST_APPROVAL_THRESHOLD } from './constants';
import { SeededRNG } from './rng';
import type { GameState } from './types';

export function processColonyUnrest(state: GameState, rng: SeededRNG): number {
  let unrestEvents = 0;

  for (const empire of state.empires) {
    if (!empire.isAlive) continue;

    for (const system of state.systems) {
      for (const planet of system.planets) {
        if (!planet.isColonized || planet.ownerId !== empire.id) continue;
        if (planet.approval >= UNREST_APPROVAL_THRESHOLD) continue;
        if (rng.next() > 0.12) continue;

        const popLoss = rng.nextInt(1, 2);
        planet.population = Math.max(1, planet.population - popLoss);
        planet.happiness = Math.max(0, planet.happiness - 5);
        unrestEvents++;

        state.events.push({
          turn: state.turn,
          type: 'event',
          message: `${empire.name}: Unrest on ${planet.name}! Population decreased by ${popLoss}.`,
        });
      }
    }
  }

  return unrestEvents;
}
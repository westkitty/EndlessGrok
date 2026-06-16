import { WAR_WEARINESS_PER_TURN } from './constants';
import type { Empire, GameState } from './types';

export function isEmpireAtWar(empire: Empire): boolean {
  return Object.values(empire.diplomacy).some(s => s === 'war' || s === 'hostile');
}

export function processWarWeariness(state: GameState): void {
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;

    if (isEmpireAtWar(empire)) {
      empire.warWeariness += WAR_WEARINESS_PER_TURN;
    } else {
      empire.warWeariness = Math.max(0, empire.warWeariness - 1);
    }

    if (empire.warWeariness > 0) {
      for (const system of state.systems) {
        for (const planet of system.planets) {
          if (planet.ownerId === empire.id && planet.isColonized) {
            const penalty = Math.floor(empire.warWeariness / 10);
            planet.happiness = Math.max(0, planet.happiness - penalty);
            planet.approval = Math.max(0, planet.approval - Math.floor(penalty / 2));
          }
        }
      }
    }
  }
}
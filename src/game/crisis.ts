import type { GameState } from './types';

const CRISIS_TURN = 80;

export function processLateGameCrisis(state: GameState): void {
  if (state.turn < CRISIS_TURN) return;
  if ((state as GameState & { crisisWarned?: boolean }).crisisWarned) return;

  (state as GameState & { crisisWarned?: boolean }).crisisWarned = true;
  state.events.push({
    turn: state.turn,
    type: 'event',
    message: '⚠ EMPIRE-WIDE CRISIS: Galactic instability detected! All empires suffer -5 approval. Prepare for escalating conflict.',
  });

  for (const empire of state.empires) {
    if (!empire.isAlive) continue;
    for (const system of state.systems) {
      for (const planet of system.planets) {
        if (planet.ownerId === empire.id && planet.isColonized) {
          planet.approval = Math.max(0, planet.approval - 5);
          planet.happiness = Math.max(0, planet.happiness - 3);
        }
      }
    }
    empire.warWeariness += 3;
  }
}
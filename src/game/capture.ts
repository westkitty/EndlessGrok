import { countEmpirePlanets } from './economy';
import type { BattleReport, GameState } from './types';

export function hasDefendingFleet(state: GameState, systemId: string, defenderId: string): boolean {
  return state.fleets.some(
    f => f.empireId === defenderId && f.systemId === systemId && f.ships.some(s => s.attack > 0)
  );
}

export function tryCapturePlanet(
  state: GameState,
  systemId: string,
  winnerId: string,
  loserId: string
): boolean {
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return false;

  if (hasDefendingFleet(state, systemId, loserId)) return false;

  const enemyPlanets = system.planets.filter(
    p => p.isColonized && p.ownerId === loserId
  );
  if (enemyPlanets.length === 0) return false;

  const planet = enemyPlanets[0];
  const winner = state.empires.find(e => e.id === winnerId)!;
  const loser = state.empires.find(e => e.id === loserId)!;

  planet.ownerId = winnerId;
  planet.happiness = 30;
  planet.approval = 25;
  planet.population = Math.max(1, Math.floor(planet.population * 0.5));

  winner.totalPlanets = countEmpirePlanets(winnerId, state.systems);
  loser.totalPlanets = countEmpirePlanets(loserId, state.systems);

  if (loser.capitalSystemId === systemId) {
    loser.capitalSystemId = null;
    planet.isCapital = false;
    const newCapital = state.systems.find(s =>
      s.planets.some(p => p.ownerId === loserId && p.isColonized)
    );
    if (newCapital) {
      loser.capitalSystemId = newCapital.id;
      for (const p of newCapital.planets) {
        if (p.ownerId === loserId) p.isCapital = true;
      }
    }
  }

  state.events.push({
    turn: state.turn,
    type: 'capture',
    message: `${winner.name} captured ${planet.name} in ${system.name}!`,
  });

  return true;
}

export function processCombatCaptures(state: GameState, battleResults: BattleReport[]): number {
  let captures = 0;
  const processed = new Set<string>();

  for (const result of battleResults) {
    const key = `${result.systemId}-${result.winnerId}`;
    if (processed.has(key)) continue;

    const loserId = result.attackerId === result.winnerId ? result.defenderId : result.attackerId;
    if (tryCapturePlanet(state, result.systemId, result.winnerId, loserId)) {
      captures++;
      processed.add(key);
    }
  }

  return captures;
}
import { getPlayerMilitaryPower } from './actions';
import type { Empire, GameState } from './types';

export function calculateEmpireScore(state: GameState, empireId: string): number {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return 0;

  const planetScore = empire.totalPlanets * 100;
  const techScore = empire.researchedTechs.length * 50;
  const fleetScore = getPlayerMilitaryPower(state, empireId);
  const influenceScore = empire.influence * 2;
  const resourceScore = Math.floor(
    empire.resources.credits * 0.1 +
    empire.resources.food * 0.05 +
    empire.resources.industry * 0.1 +
    empire.resources.science * 0.2
  );
  const strategicScore =
    empire.strategicResources.titanium * 30 +
    empire.strategicResources.antimatter * 50 +
    empire.strategicResources.darkmatter * 80;

  return planetScore + techScore + fleetScore + influenceScore + resourceScore + strategicScore;
}

export function updateAllEmpireScores(state: GameState): void {
  for (const empire of state.empires) {
    if (empire.isAlive) {
      empire.score = calculateEmpireScore(state, empire.id);
    }
  }
}

export function getEmpireRankings(state: GameState): { empire: Empire; score: number; rank: number }[] {
  const ranked = state.empires
    .filter(e => e.isAlive)
    .map(empire => ({ empire, score: calculateEmpireScore(state, empire.id) }))
    .sort((a, b) => b.score - a.score);

  return ranked.map((entry, i) => ({ ...entry, rank: i + 1 }));
}
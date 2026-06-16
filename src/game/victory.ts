import {
  DOMINATION_THRESHOLD,
  ECONOMY_VICTORY_CREDITS_THRESHOLD,
  ECONOMY_VICTORY_INCOME_THRESHOLD,
  ECONOMY_VICTORY_TURNS,
  INFLUENCE_VICTORY_THRESHOLD,
  INFLUENCE_VICTORY_TURNS,
  SCIENCE_VICTORY_TECH_COUNT,
} from './constants';
import { getColonizablePlanets } from './galaxy';
import type { Empire, GameState, VictoryProgress, VictoryType } from './types';

export function getVictoryProgress(state: GameState, empireId?: string): VictoryProgress {
  const empire = state.empires.find(e => e.id === (empireId ?? state.playerEmpireId));
  if (!empire) return { domination: 0, science: 0, survival: 0, influence: 0, economy: 0 };

  const colonizable = getColonizablePlanets(state.systems);
  const totalColonizable = colonizable.length;
  const owned = colonizable.filter(p => p.ownerId === empire.id && p.isColonized).length;
  const domination = totalColonizable > 0 ? (owned / totalColonizable) / DOMINATION_THRESHOLD : 0;

  const hasQuantum = empire.researchedTechs.includes('quantum_computing') ? 1 : 0;
  const techProgress = empire.researchedTechs.length / SCIENCE_VICTORY_TECH_COUNT;
  const science = Math.min(1, (hasQuantum + techProgress) / 2);

  const survival = state.maxTurns > 0 ? state.turn / state.maxTurns : 0;

  const influence = Math.min(1, empire.influence / INFLUENCE_VICTORY_THRESHOLD);

  const hasMarketTech = empire.researchedTechs.includes('galactic_market');
  const creditProgress = Math.min(1, empire.resources.credits / ECONOMY_VICTORY_CREDITS_THRESHOLD);
  const economy = hasMarketTech ? Math.min(1, creditProgress * 0.6 + (empire.economyVictoryTurns ?? 0) / ECONOMY_VICTORY_TURNS * 0.4) : creditProgress * 0.3;

  return {
    domination: Math.min(1, domination),
    science: Math.min(1, science),
    survival: Math.min(1, survival),
    influence: Math.min(1, influence),
    economy: Math.min(1, economy),
  };
}

export function updateInfluenceVictoryTracking(state: GameState): void {
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;
    if (empire.influence >= INFLUENCE_VICTORY_THRESHOLD) {
      empire.influenceVictoryTurns++;
    } else {
      empire.influenceVictoryTurns = 0;
    }
  }
}

export function updateEconomyVictoryTracking(state: GameState, creditIncome: Record<string, number>): void {
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;
    const income = creditIncome[empire.id] ?? 0;
    const qualifies =
      empire.researchedTechs.includes('galactic_market') &&
      empire.resources.credits >= ECONOMY_VICTORY_CREDITS_THRESHOLD &&
      income >= ECONOMY_VICTORY_INCOME_THRESHOLD;

    if (qualifies) {
      empire.economyVictoryTurns = (empire.economyVictoryTurns ?? 0) + 1;
    } else {
      empire.economyVictoryTurns = 0;
    }
  }
}

export function checkVictoryConditions(state: GameState): { winnerId: string | null; type: VictoryType } {
  const colonizable = getColonizablePlanets(state.systems);
  const totalColonizable = colonizable.length;

  updateInfluenceVictoryTracking(state);

  for (const empire of state.empires) {
    if (!empire.isAlive) continue;

    const owned = colonizable.filter(p => p.ownerId === empire.id && p.isColonized).length;
    if (totalColonizable > 0 && owned / totalColonizable >= DOMINATION_THRESHOLD) {
      return { winnerId: empire.id, type: 'domination' };
    }

    if (empire.researchedTechs.includes('quantum_computing') &&
        empire.researchedTechs.length >= SCIENCE_VICTORY_TECH_COUNT) {
      return { winnerId: empire.id, type: 'science' };
    }

    if (empire.influenceVictoryTurns >= INFLUENCE_VICTORY_TURNS) {
      return { winnerId: empire.id, type: 'influence' };
    }

    if ((empire.economyVictoryTurns ?? 0) >= ECONOMY_VICTORY_TURNS) {
      return { winnerId: empire.id, type: 'economy' };
    }
  }

  if (state.turn >= state.maxTurns) {
    const alive = state.empires.filter(e => e.isAlive);
    if (alive.length === 1) {
      return { winnerId: alive[0].id, type: 'survival' };
    }
    const sorted = [...alive].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.totalPlanets !== a.totalPlanets) return b.totalPlanets - a.totalPlanets;
      return b.influence - a.influence;
    });
    return { winnerId: sorted[0].id, type: 'survival' };
  }

  const player = state.empires.find(e => e.id === state.playerEmpireId);
  if (player && !player.isAlive) {
    const alive = state.empires.filter(e => e.isAlive && !e.isPlayer);
    return { winnerId: alive[0]?.id || null, type: 'domination' };
  }

  return { winnerId: null, type: null };
}

export function getVictoryMessage(type: VictoryType, empireName: string, maxTurns?: number): string {
  switch (type) {
    case 'domination': return `${empireName} achieves Domination Victory!`;
    case 'science': return `${empireName} achieves Science Victory!`;
    case 'survival': return `${empireName} survives until turn ${maxTurns ?? 100}!`;
    case 'influence': return `${empireName} achieves Influence Victory!`;
    case 'economy': return `${empireName} achieves Economic Hegemony Victory!`;
    default: return '';
  }
}

export function getVictoryProgressForEmpire(empire: Empire, state: GameState): VictoryProgress {
  return getVictoryProgress(state, empire.id);
}
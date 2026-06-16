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
import {
  checkStarbindingVictory,
  getRequiredStarDives,
  getStarbindingProgress,
  getStarbindingStage,
  isStarbindingUnlocked,
} from './starbinding';
import {
  checkSyrinInertingVictory,
  getSyrinInertingVictoryProgress,
  isSyrinInertingUnlocked,
} from './syrinInertingVictory';
import type { Empire, GameState, VictoryProgress, VictoryType } from './types';

export function getVictoryProgress(state: GameState, empireId?: string): VictoryProgress {
  const empire = state.empires.find(e => e.id === (empireId ?? state.playerEmpireId));
  if (!empire) {
    return {
      domination: 0, science: 0, survival: 0, influence: 0, economy: 0,
      starbinding: 0, ledgerDominion: 0, bloodEclipse: 0, archiveContinuity: 0, syrinInerting: 0,
    };
  }

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

  const starbinding = isStarbindingUnlocked(empire)
    ? getStarbindingProgress(state, empire.id)
    : 0;

  const hasArchiveSyntax = empire.researchedTechs.includes('archive_syntax');
  const archiveContinuity = hasArchiveSyntax
    ? Math.min(1, (empire.starsilkResources?.archiveData ?? 0) / 20 + techProgress * 0.5)
    : 0;

  const hasAdminTech = empire.researchedTechs.includes('influence_projection');
  const ledgerDominion = hasAdminTech ? Math.min(1, influence * 0.7 + domination * 0.3) : 0;

  const bloodEclipse = empire.researchedTechs.includes('planetary_engineering')
    ? Math.min(1, (empire.starsilkResources?.bloodRingGlass ?? 0) / 10 + domination * 0.2)
    : 0;

  const syrinInerting = isSyrinInertingUnlocked(empire)
    ? getSyrinInertingVictoryProgress(state, empire.id)
    : 0;

  return {
    domination: Math.min(1, domination),
    science: Math.min(1, science),
    survival: Math.min(1, survival),
    influence: Math.min(1, influence),
    economy: Math.min(1, economy),
    starbinding: Math.min(1, starbinding),
    ledgerDominion: Math.min(1, ledgerDominion),
    bloodEclipse: Math.min(1, bloodEclipse),
    archiveContinuity: Math.min(1, archiveContinuity),
    syrinInerting: Math.min(1, syrinInerting),
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

    if (checkStarbindingVictory(state, empire.id)) {
      return { winnerId: empire.id, type: 'starbinding' };
    }

    if (checkSyrinInertingVictory(state, empire.id)) {
      return { winnerId: empire.id, type: 'syrin_inerting' };
    }

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
    case 'starbinding': return `${empireName} executes The Starbinding. The sky is severed. No consensus was sought.`;
    case 'syrin_inerting': return `${empireName} achieves Syrin Inerting. The galaxy's Starsilk hazards are contained — not erased, not forgiven.`;
    default: return '';
  }
}

export function getVictoryProgressForEmpire(empire: Empire, state: GameState): VictoryProgress {
  return getVictoryProgress(state, empire.id);
}

export function getStarbindingVictoryDetails(state: GameState, empireId: string): {
  stage: number;
  requiredDives: number;
  completedDives: number;
  nextAction: string;
} {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) {
    return { stage: 0, requiredDives: 0, completedDives: 0, nextAction: '' };
  }
  const sb = empire.starbinding;
  return {
    stage: getStarbindingStage(empire),
    requiredDives: getRequiredStarDives(state),
    completedDives: sb?.completedDiveSystemIds.length ?? 0,
    nextAction: '',
  };
}
import { getFactionReactionToSyrinInertingProgress } from './factionIdeology';
import { hasUnlock } from './research';
import { ensureStarsilkResources } from './starsilkResources';
import type { Empire, GameState } from './types';

export const SYRIN_INERTING_MIN_INERT = 10;
export const SYRIN_INERTING_REQUIRED_SYSTEMS = 3;
export const SYRIN_INERTING_MIN_MIST_APPLICATIONS = 3;

export function ensureSyrinInertingProgress(empire: Empire): {
  systemsProtected: string[];
  mistApplications: number;
} {
  if (!empire.syrinInertingProgress) {
    empire.syrinInertingProgress = { systemsProtected: [], mistApplications: 0 };
  }
  return empire.syrinInertingProgress;
}

export function recordSyrinInertingMist(state: GameState, empireId: string, systemId: string): void {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return;
  const tracking = ensureSyrinInertingProgress(empire);
  tracking.mistApplications += 1;
  if (!tracking.systemsProtected.includes(systemId)) {
    tracking.systemsProtected.push(systemId);
  }
  state.events.push({
    turn: state.turn,
    type: 'macro',
    message: `Syrin inerting logged at ${state.systems.find(s => s.id === systemId)?.name ?? systemId}. Containment index updated.`,
  });

  const victoryProgress = getSyrinInertingVictoryProgress(state, empireId);
  const band = Math.floor(victoryProgress * 5);
  empire.syrinInertingDiplomacyBand = empire.syrinInertingDiplomacyBand ?? 0;
  if (band > empire.syrinInertingDiplomacyBand) {
    empire.syrinInertingDiplomacyBand = band;
    for (const other of state.empires) {
      if (!other.isAlive || other.id === empireId || other.isPirate) continue;
      const reaction = getFactionReactionToSyrinInertingProgress(other, victoryProgress);
      if (reaction.relationDelta !== 0) {
        other.relationScores = other.relationScores ?? {};
        other.relationScores[empireId] = (other.relationScores[empireId] ?? 50) + reaction.relationDelta;
      }
      if (reaction.message && band >= 2) {
        state.events.push({ turn: state.turn, type: 'diplomacy', message: reaction.message });
      }
    }
  }
}

export function recordGravityThreadSeal(state: GameState, empireId: string, systemId: string): void {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return;
  const progress = ensureSyrinInertingProgress(empire);
  if (!progress.systemsProtected.includes(systemId)) {
    progress.systemsProtected.push(systemId);
  }
}

export function isSyrinInertingUnlocked(empire: Empire): boolean {
  return (
    empire.researchedTechs.includes('syrin_inerting_method') &&
    hasUnlock(empire.researchedTechs, 'macro_execution')
  );
}

export function getSyrinInertingVictoryProgress(state: GameState, empireId: string): number {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire || !isSyrinInertingUnlocked(empire)) return 0;

  const pool = ensureStarsilkResources(empire);
  const progress = ensureSyrinInertingProgress(empire);
  const inertPart = Math.min(1, pool.inertStarsilk / SYRIN_INERTING_MIN_INERT);
  const systemsPart = Math.min(1, progress.systemsProtected.length / SYRIN_INERTING_REQUIRED_SYSTEMS);
  const mistPart = Math.min(1, progress.mistApplications / SYRIN_INERTING_MIN_MIST_APPLICATIONS);
  const noHeliocide = (empire.starbinding?.completedDiveSystemIds.length ?? 0) === 0 ? 1 : 0;

  return Math.min(1, inertPart * 0.35 + systemsPart * 0.35 + mistPart * 0.2 + noHeliocide * 0.1);
}

export function canAchieveSyrinInertingVictory(state: GameState, empireId: string): string | null {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire || !empire.isAlive) return 'Empire not found';
  if (!isSyrinInertingUnlocked(empire)) return 'Syrin inerting not unlocked';

  const pool = ensureStarsilkResources(empire);
  const progress = ensureSyrinInertingProgress(empire);

  if (pool.inertStarsilk < SYRIN_INERTING_MIN_INERT) {
    return `Need ${SYRIN_INERTING_MIN_INERT} Inert Starsilk (${pool.inertStarsilk}/${SYRIN_INERTING_MIN_INERT})`;
  }
  if (progress.systemsProtected.length < SYRIN_INERTING_REQUIRED_SYSTEMS) {
    return `Need ${SYRIN_INERTING_REQUIRED_SYSTEMS} protected systems (${progress.systemsProtected.length}/${SYRIN_INERTING_REQUIRED_SYSTEMS})`;
  }
  if (progress.mistApplications < SYRIN_INERTING_MIN_MIST_APPLICATIONS) {
    return `Need ${SYRIN_INERTING_MIN_MIST_APPLICATIONS} inerting mist applications`;
  }
  if ((empire.starbinding?.completedDiveSystemIds.length ?? 0) > 0) {
    return 'Heliocide disqualifies containment victory';
  }
  return null;
}

export function checkSyrinInertingVictory(state: GameState, empireId: string): boolean {
  return canAchieveSyrinInertingVictory(state, empireId) === null;
}

export function getSyrinInertingVictoryDetails(empire: Empire): {
  inertStarsilk: number;
  systemsProtected: number;
  mistApplications: number;
  heliocideDisqualified: boolean;
} {
  const pool = ensureStarsilkResources(empire);
  const progress = ensureSyrinInertingProgress(empire);
  return {
    inertStarsilk: pool.inertStarsilk,
    systemsProtected: progress.systemsProtected.length,
    mistApplications: progress.mistApplications,
    heliocideDisqualified: (empire.starbinding?.completedDiveSystemIds.length ?? 0) > 0,
  };
}
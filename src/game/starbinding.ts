import { getStarbindingSafetyBonus } from './hazards';
import { COLLAPSE_TURNS, beginStarDive, canTargetStarForDive, collapseStar, isCollapsedSystem } from './heliocide';
import { SeededRNG } from './rng';
import { applyHeliocideDiplomaticReactions } from './factionIdeology';
import { hasUnlock } from './research';
import { ensureStarsilkResources, inertStarsilkThread, spendStarsilkCost } from './starsilkResources';
import type { Empire, GameState, StarbindingState, StarSystem } from './types';

export const STARBINDING_REQUIRED_DIVES = 3;
export const STARBINDING_FINAL_TURNS = 3;
export const STARBINDING_MIN_INERT = 5;
export const STARBINDING_MAX_TARGETS = 5;

export const STARBINDING_STAGE_LABELS: Record<number, string> = {
  0: 'Locked — forbidden theory undiscovered',
  1: 'Forbidden theory catalogued',
  2: 'Partition mathematics derived',
  3: 'Syrin inerting method acquired',
  4: 'Starbinding Array required',
  5: 'Select archive stars for dive',
  6: 'Heliocide sequence active',
  7: 'Diplomatic crisis — final macro pending',
  8: 'Partition macro executing',
};

export function createStarbindingState(): StarbindingState {
  return {
    stage: 0,
    targetSystemIds: [],
    completedDiveSystemIds: [],
    activeCollapseSystemId: null,
    collapseTurnsRemaining: 0,
    inertStarsilkStabilized: 0,
    partitionAnchorsBuilt: 0,
    arraySystemId: null,
    finalExecutionTurnsRemaining: 0,
    failed: false,
    crisisTriggered: false,
  };
}

export function ensureStarbinding(empire: Empire): StarbindingState {
  if (!empire.starbinding) {
    empire.starbinding = createStarbindingState();
  }
  return empire.starbinding;
}

export function getStarbindingStage(empire: Empire): number {
  const sb = ensureStarbinding(empire);
  if (sb.failed) return sb.stage;
  if (hasUnlock(empire.researchedTechs, 'forbidden_starbinding')) sb.stage = Math.max(sb.stage, 1);
  if (empire.researchedTechs.includes('partition_mathematics')) sb.stage = Math.max(sb.stage, 2);
  if (empire.researchedTechs.includes('syrin_inerting_method')) sb.stage = Math.max(sb.stage, 3);
  if (sb.arraySystemId) sb.stage = Math.max(sb.stage, 4);
  if (sb.targetSystemIds.length >= STARBINDING_REQUIRED_DIVES) sb.stage = Math.max(sb.stage, 5);
  if (sb.completedDiveSystemIds.length > 0) sb.stage = Math.max(sb.stage, 6);
  if (sb.crisisTriggered) sb.stage = Math.max(sb.stage, 7);
  if (sb.finalExecutionTurnsRemaining > 0) sb.stage = Math.max(sb.stage, 8);
  return sb.stage;
}

export function isStarbindingUnlocked(empire: Empire): boolean {
  return getStarbindingStage(empire) >= 1;
}

export function getRequiredStarDives(state: GameState): number {
  const archiveStars = state.systems.filter(s => s.isArchiveStar && !isCollapsedSystem(s)).length;
  return Math.min(STARBINDING_REQUIRED_DIVES, Math.max(2, Math.floor(archiveStars * 0.15) + 2));
}

export function getStarbindingProgress(state: GameState, empireId: string): number {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return 0;
  const sb = ensureStarbinding(empire);
  if (sb.failed) return 0;
  const required = getRequiredStarDives(state);
  const diveProgress = sb.completedDiveSystemIds.length / required;
  const inertProgress = Math.min(1, sb.inertStarsilkStabilized / STARBINDING_MIN_INERT);
  const finalProgress = sb.finalExecutionTurnsRemaining > 0
    ? 1 - sb.finalExecutionTurnsRemaining / STARBINDING_FINAL_TURNS
    : sb.completedDiveSystemIds.length >= required ? 0.5 : 0;
  const stageProgress = getStarbindingStage(empire) / 8;
  return Math.min(1, diveProgress * 0.5 + inertProgress * 0.2 + finalProgress * 0.2 + stageProgress * 0.1);
}

export function getStarbindingNextAction(empire: Empire, state: GameState): string {
  const stage = getStarbindingStage(empire);
  const sb = ensureStarbinding(empire);
  switch (stage) {
    case 0: return 'Research Forbidden Starbinding Theory';
    case 1: return 'Research Partition Mathematics';
    case 2: return 'Research Syrin Inerting Method';
    case 3: return 'Build Starbinding Array at owned system';
    case 4: return `Select ${getRequiredStarDives(state)} archive stars for dive`;
    case 5: return 'Begin star dives on selected targets';
    case 6: return 'Complete heliocide sequence and stabilize inert Starsilk';
    case 7: return 'Execute final Partition macro';
    case 8: return `Partition macro executing (${sb.finalExecutionTurnsRemaining} turns)`;
    default: return 'Starbinding complete or failed';
  }
}

export function canBuildStarbindingArray(state: GameState, systemId: string, empireId: string): string | null {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return 'Empire not found';
  if (getStarbindingStage(empire) < 3) return 'Requires Syrin Inerting Method';
  if (!hasUnlock(empire.researchedTechs, 'macro_execution')) return 'Requires Macro Execution capability';
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return 'System not found';
  if (!system.planets.some(p => p.ownerId === empireId && p.isColonized)) return 'System not owned';
  if (ensureStarbinding(empire).arraySystemId) return 'Array already constructed';
  const pool = ensureStarsilkResources(empire);
  if (pool.starsilkThread < 3) return 'Need 3 Starsilk Thread';
  if (pool.syrinReagent < 2) return 'Need 2 Syrin Reagent';
  return null;
}

export function buildStarbindingArray(state: GameState, systemId: string, empireId: string): boolean {
  const err = canBuildStarbindingArray(state, systemId, empireId);
  if (err) return false;
  const empire = state.empires.find(e => e.id === empireId)!;
  if (!spendStarsilkCost(empire, { starsilkThread: 3, syrinReagent: 2 })) return false;
  const planet = state.systems.find(s => s.id === systemId)!.planets.find(p => p.ownerId === empireId && p.isColonized)!;
  planet.buildings.push('starbinding_array');
  ensureStarbinding(empire).arraySystemId = systemId;
  state.events.push({
    turn: state.turn,
    type: 'starbinding',
    message: `Starbinding Array constructed at ${state.systems.find(s => s.id === systemId)!.name}. The ledger accepts no appeal.`,
  });
  return true;
}

export function canSelectStarbindingTarget(
  state: GameState,
  systemId: string,
  empireId: string,
): string | null {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return 'Empire not found';
  const sb = ensureStarbinding(empire);
  if (getStarbindingStage(empire) < 4) return 'Starbinding Array not ready';
  if (sb.targetSystemIds.includes(systemId)) return 'Already targeted';
  if (sb.targetSystemIds.length >= STARBINDING_MAX_TARGETS) return 'Target list full';
  return canTargetStarForDive(state, systemId, empireId);
}

export function selectStarbindingTarget(state: GameState, systemId: string, empireId: string): boolean {
  const err = canSelectStarbindingTarget(state, systemId, empireId);
  if (err) return false;
  const empire = state.empires.find(e => e.id === empireId)!;
  const sb = ensureStarbinding(empire);
  sb.targetSystemIds.push(systemId);
  const system = state.systems.find(s => s.id === systemId)!;
  system.starState = 'starbinding_targeted';
  state.events.push({
    turn: state.turn,
    type: 'starbinding',
    message: `${system.name} marked for star dive. Coordinates filed. Reversal impossible.`,
  });
  return true;
}

export function canBeginStarDive(state: GameState, systemId: string, empireId: string): string | null {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return 'Empire not found';
  const sb = ensureStarbinding(empire);
  if (!sb.targetSystemIds.includes(systemId)) return 'System not on dive list';
  if (sb.completedDiveSystemIds.includes(systemId)) return 'Dive already completed';
  if (sb.activeCollapseSystemId) return 'Another collapse in progress';
  const pool = ensureStarsilkResources(empire);
  if (pool.starsilkThread < 1) return 'Need 1 Starsilk Thread per dive';
  return canTargetStarForDive(state, systemId, empireId);
}

export function beginStarbindingDive(state: GameState, systemId: string, empireId: string): boolean {
  const err = canBeginStarDive(state, systemId, empireId);
  if (err) return false;
  const empire = state.empires.find(e => e.id === empireId)!;
  if (!spendStarsilkCost(empire, { starsilkThread: 1 })) return false;
  if (!beginStarDive(state, systemId, empireId)) return false;
  const sb = ensureStarbinding(empire);
  sb.activeCollapseSystemId = systemId;
  const safety = getStarbindingSafetyBonus(state, empireId, systemId);
  sb.collapseTurnsRemaining = safety >= 0.35
    ? Math.max(1, COLLAPSE_TURNS - 1)
    : safety >= 0.2
      ? COLLAPSE_TURNS
      : COLLAPSE_TURNS;
  const systemName = state.systems.find(s => s.id === systemId)!.name;
  state.events.push({
    turn: state.turn,
    type: 'heliocide',
    message: safety >= 0.2
      ? `Star dive initiated at ${systemName}. Inerting/seal stabilized sequence — moral cost remains.`
      : `Star dive initiated at ${systemName}. The star did not burn. It was opened.`,
  });
  applyHeliocideDiplomaticReactions(state, empireId);
  return true;
}

export function stabilizeInertStarsilk(state: GameState, empireId: string, amount: number): boolean {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return false;
  if (!inertStarsilkThread(empire, amount)) return false;
  ensureStarbinding(empire).inertStarsilkStabilized += amount;
  state.events.push({
    turn: state.turn,
    type: 'starbinding',
    message: `Inert Starsilk stabilized (+${amount}). Partition checksum advanced.`,
  });
  return true;
}

export function canBeginFinalExecution(state: GameState, empireId: string): string | null {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return 'Empire not found';
  const sb = ensureStarbinding(empire);
  const required = getRequiredStarDives(state);
  if (sb.completedDiveSystemIds.length < required) {
    return `Need ${required} completed star dives (${sb.completedDiveSystemIds.length}/${required})`;
  }
  if (sb.inertStarsilkStabilized < STARBINDING_MIN_INERT) {
    return `Need ${STARBINDING_MIN_INERT} inert Starsilk stabilized`;
  }
  if (!hasUnlock(empire.researchedTechs, 'macro_execution')) return 'Requires Macro Execution';
  const pool = ensureStarsilkResources(empire);
  if (pool.inertStarsilk < 3) return 'Need 3 Inert Starsilk for final macro';
  if (pool.archiveData < 5) return 'Need 5 Archive Data for final macro';
  if (sb.finalExecutionTurnsRemaining > 0) return 'Final execution already running';
  return null;
}

export function beginFinalStarbindingExecution(state: GameState, empireId: string): boolean {
  const err = canBeginFinalExecution(state, empireId);
  if (err) return false;
  const empire = state.empires.find(e => e.id === empireId)!;
  if (!spendStarsilkCost(empire, { inertStarsilk: 3, archiveData: 5 })) return false;
  const sb = ensureStarbinding(empire);
  sb.finalExecutionTurnsRemaining = STARBINDING_FINAL_TURNS;
  sb.crisisTriggered = true;
  empire.stabilityPenalty = (empire.stabilityPenalty ?? 0) + 10;
  state.events.push({
    turn: state.turn,
    type: 'starbinding',
    message: 'Final Partition macro initiated. The sky is being rewritten. No consensus was sought.',
  });
  applyHeliocideDiplomaticReactions(state, empireId);
  return true;
}

export function processStarbindingTurn(state: GameState, empireId: string): void {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire || !empire.isAlive) return;
  const sb = ensureStarbinding(empire);
  if (sb.failed) return;

  if (sb.activeCollapseSystemId && sb.collapseTurnsRemaining > 0) {
    sb.collapseTurnsRemaining--;
    if (sb.collapseTurnsRemaining <= 0) {
      const systemId = sb.activeCollapseSystemId;
      const event = collapseStar(
        state,
        systemId,
        empireId,
        new SeededRNG(state.seed + state.turn * 7919 + systemId.length),
      );
      if (event) state.events.push(event);
      sb.completedDiveSystemIds.push(systemId);
      sb.targetSystemIds = sb.targetSystemIds.filter(id => id !== systemId);
      sb.activeCollapseSystemId = null;
      if (!sb.crisisTriggered) {
        sb.crisisTriggered = true;
        applyHeliocideDiplomaticReactions(state, empireId);
      }
      const pool = ensureStarsilkResources(empire);
      pool.siegeLatticeFragment += 1;
      pool.archiveData += 2;
    }
  }

  if (sb.finalExecutionTurnsRemaining > 0) {
    sb.finalExecutionTurnsRemaining--;
    if (sb.finalExecutionTurnsRemaining <= 0) {
      sb.stage = 8;
      state.events.push({
        turn: state.turn,
        type: 'starbinding',
        message: 'Partition macro checksum complete. The old sky is severed.',
      });
    }
  }
}

export function checkStarbindingVictory(state: GameState, empireId: string): boolean {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire || !empire.isAlive) return false;
  const sb = ensureStarbinding(empire);
  if (sb.failed) return false;
  const required = getRequiredStarDives(state);
  return (
    sb.completedDiveSystemIds.length >= required &&
    sb.inertStarsilkStabilized >= STARBINDING_MIN_INERT &&
    sb.finalExecutionTurnsRemaining === 0 &&
    getStarbindingStage(empire) >= 8 &&
    hasUnlock(empire.researchedTechs, 'forbidden_starbinding')
  );
}

export function interruptStarbinding(state: GameState, empireId: string): void {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return;
  const sb = ensureStarbinding(empire);
  sb.failed = true;
  empire.stabilityPenalty = (empire.stabilityPenalty ?? 0) + 15;
  const pool = ensureStarsilkResources(empire);
  pool.starsilkThread = Math.max(0, pool.starsilkThread - 2);
  if (sb.activeCollapseSystemId) {
    const system = state.systems.find(s => s.id === sb.activeCollapseSystemId);
    if (system && system.starState === 'collapsing') {
      collapseStar(state, system.id, empireId);
    }
    sb.activeCollapseSystemId = null;
  }
  state.events.push({
    turn: state.turn,
    type: 'starbinding',
    message: 'Starbinding interrupted. Partial catastrophe logged. No victory. No forgiveness.',
  });
}

export function markArchiveStars(systems: StarSystem[], rng: { next: () => number }): void {
  for (const system of systems) {
    if (system.systemType === 'black_hole') continue;
    if (rng.next() < 0.12 || system.richness >= 1.2) {
      system.isArchiveStar = true;
    }
  }
}
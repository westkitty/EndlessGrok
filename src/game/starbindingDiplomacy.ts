import {
  ensureFactionIdeology,
  getFactionIdeologyTags,
  getFactionReactionToStarbindingProgress,
} from './factionIdeology';
import { getStarbindingStage } from './starbinding';
import type { Empire, GameState } from './types';

export interface StarbindingDiplomacySnapshot {
  stage: number;
  dives: number;
  progressBand: number;
}

export interface StarbindingDiplomacyReaction {
  relationDelta: number;
  threat: number;
  message: string;
  isNewMilestone: boolean;
}

function getProgressBand(progress: number): number {
  return Math.floor(progress * 10);
}

export function getStarbindingDiplomacySnapshot(
  perpetrator: Empire,
  progress: number,
): StarbindingDiplomacySnapshot {
  return {
    stage: getStarbindingStage(perpetrator),
    dives: perpetrator.starbinding?.completedDiveSystemIds.length ?? 0,
    progressBand: getProgressBand(progress),
  };
}

export function evaluateStarbindingDiplomacyReaction(
  observer: Empire,
  perpetrator: Empire,
  progress: number,
  previous: StarbindingDiplomacySnapshot | undefined,
): StarbindingDiplomacyReaction {
  ensureFactionIdeology(observer);
  const tags = getFactionIdeologyTags(observer);
  const current = getStarbindingDiplomacySnapshot(perpetrator, progress);

  const base = getFactionReactionToStarbindingProgress(observer, progress);
  const isNewMilestone =
    !previous ||
    current.stage > previous.stage ||
    current.dives > previous.dives ||
    current.progressBand > previous.progressBand;

  let relationDelta = 0;
  if (isNewMilestone) {
    if (current.dives > (previous?.dives ?? -1)) {
      relationDelta = base.relationDelta - getFactionReactionToStarbindingProgress(observer, (previous?.dives ?? 0) / 3).relationDelta;
    } else if (current.progressBand > (previous?.progressBand ?? -1)) {
      const prevProgress = (previous?.progressBand ?? 0) / 10;
      relationDelta = base.relationDelta - getFactionReactionToStarbindingProgress(observer, prevProgress).relationDelta;
    } else if (current.stage > (previous?.stage ?? -1)) {
      relationDelta = -Math.floor((current.stage - (previous?.stage ?? 0)) * 3);
      if (tags.includes('archive')) relationDelta -= 2;
      if (tags.includes('syrin')) relationDelta -= 1;
    }
  }

  let message = '';
  if (isNewMilestone && current.dives > (previous?.dives ?? 0)) {
    if (tags.includes('archive')) {
      message = `${observer.name} records heliocide by ${perpetrator.name}. Archive continuity compromised.`;
    } else if (tags.includes('syrin')) {
      message = `${observer.name} condemns ${perpetrator.name}'s stellar weaponization.`;
    } else if (tags.includes('solidarity')) {
      message = `${observer.name} protests unilateral Partition advances by ${perpetrator.name}.`;
    } else if (tags.includes('administration')) {
      message = `${observer.name} files containment breach against ${perpetrator.name}'s Starbinding.`;
    }
  } else if (isNewMilestone && current.stage > (previous?.stage ?? 0) && current.stage >= 4) {
    message = `${observer.name} notes ${perpetrator.name} reached Starbinding stage ${current.stage}.`;
  }

  return {
    relationDelta,
    threat: base.threat,
    message,
    isNewMilestone,
  };
}

export function applyStarbindingDiplomaticReactions(state: GameState): void {
  for (const perpetrator of state.empires) {
    if (!perpetrator.isAlive || perpetrator.isPirate) continue;
    const progress =
      (perpetrator.starbinding?.completedDiveSystemIds.length ?? 0) / 3 +
      getStarbindingStage(perpetrator) * 0.05;
    if (progress < 0.05 && getStarbindingStage(perpetrator) < 3) continue;

    for (const observer of state.empires) {
      if (!observer.isAlive || observer.id === perpetrator.id || observer.isPirate) continue;

      observer.starbindingDiplomacyLedger = observer.starbindingDiplomacyLedger ?? {};
      const ledgerKey = perpetrator.id;
      const previous = observer.starbindingDiplomacyLedger[ledgerKey];
      const reaction = evaluateStarbindingDiplomacyReaction(observer, perpetrator, Math.min(1, progress), previous);

      if (reaction.isNewMilestone && reaction.relationDelta !== 0) {
        observer.relationScores = observer.relationScores ?? {};
        observer.relationScores[perpetrator.id] =
          (observer.relationScores[perpetrator.id] ?? 50) + reaction.relationDelta;
      }

      if (reaction.message) {
        const warnKey = `${reaction.message}`;
        observer.starbindingDiplomacyMessages = observer.starbindingDiplomacyMessages ?? {};
        if (observer.starbindingDiplomacyMessages[warnKey] !== state.turn) {
          observer.starbindingDiplomacyMessages[warnKey] = state.turn;
          state.events.push({
            turn: state.turn,
            type: 'diplomacy',
            message: reaction.message,
          });
        }
      }

      observer.starbindingDiplomacyLedger[ledgerKey] = getStarbindingDiplomacySnapshot(
        perpetrator,
        Math.min(1, progress),
      );
    }
  }
}

export function getIncrementalThreatDelta(
  evaluation: { threatScore: number },
  previousThreat: number | undefined,
): number {
  const prev = previousThreat ?? 0;
  const delta = -Math.floor((evaluation.threatScore - prev) / 8);
  return delta < 0 ? delta : 0;
}
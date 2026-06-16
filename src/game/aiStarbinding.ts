import { getEmpireMilitaryPower } from './combat';
import {
  ensureFactionIdeology,
  getFactionIdeologyTags,
  getFactionVictoryPreference,
} from './factionIdeology';
import { areSystemsConnected, getAdjacentSystems } from './galaxy';
import { isCollapsedSystem } from './heliocide';
import { executeMacro, getAvailableMacros } from './macros';
import {
  buildStarbindingArray,
  canBeginFinalExecution,
  canBeginStarDive,
  canBuildStarbindingArray,
  canSelectStarbindingTarget,
  beginFinalStarbindingExecution,
  beginStarbindingDive,
  getStarbindingProgress,
  getStarbindingStage,
  isStarbindingUnlocked,
  selectStarbindingTarget,
  stabilizeInertStarsilk,
} from './starbinding';
import { ensureStarsilkResources } from './starsilkResources';
import { hasUnlock, getAvailableTechs } from './research';
import {
  canDeclareWar,
  declareWar,
  getDiplomacy,
  getRelationScore,
  makeHostile,
} from './diplomacy';
import { setFleetTravelPath } from './travel';
import { SeededRNG } from './rng';
import type { AIVictoryFocus, Empire, Fleet, GameState } from './types';

const STARBINDING_TECH_CHAIN = [
  'forbidden_starbinding',
  'partition_mathematics',
  'syrin_inerting_method',
  'archive_syntax',
  'macro_execution',
];

export interface StarbindingThreatEvaluation {
  threatScore: number;
  oppositionSeverity: number;
  proximityRisk: number;
  shouldOppose: boolean;
  shouldWarn: boolean;
  shouldDeclareWar: boolean;
  reactionMessage: string;
}

function getPerpetratorStarbindingProgress(state: GameState, perpetratorId: string): number {
  return getStarbindingProgress(state, perpetratorId);
}

function getProximityToEmpire(state: GameState, observer: Empire, perpetratorId: string): number {
  const perpetrator = state.empires.find(e => e.id === perpetratorId);
  if (!perpetrator?.starbinding) return 0;

  const ownedIds = new Set(
    state.systems.filter(s => s.planets.some(p => p.ownerId === observer.id)).map(s => s.id),
  );
  let risk = 0;
  const watched = [
    ...perpetrator.starbinding.targetSystemIds,
    ...perpetrator.starbinding.completedDiveSystemIds,
    perpetrator.starbinding.activeCollapseSystemId ?? '',
  ].filter(Boolean);

  for (const systemId of watched) {
    const system = state.systems.find(s => s.id === systemId);
    if (!system) continue;
    if (ownedIds.has(systemId)) risk += 0.4;
    for (const owned of ownedIds) {
      if (areSystemsConnected(state.systems, owned, systemId)) risk += 0.15;
    }
    if (system.isArchiveStar) risk += 0.1;
  }
  return Math.min(1, risk);
}

function getIdeologyOppositionModifier(tags: ReturnType<typeof getFactionIdeologyTags>): number {
  if (tags.includes('archive')) return 1.3;
  if (tags.includes('syrin')) return 1.25;
  if (tags.includes('solidarity')) return 1.15;
  if (tags.includes('administration') || tags.includes('containment')) return 1.1;
  if (tags.includes('drakken')) return 0.7;
  if (tags.includes('frontier')) return 0.85;
  return 1;
}

export function evaluateStarbindingThreat(
  state: GameState,
  observerId: string,
  perpetratorId: string,
): StarbindingThreatEvaluation {
  const observer = state.empires.find(e => e.id === observerId);
  const perpetrator = state.empires.find(e => e.id === perpetratorId);
  if (!observer || !perpetrator || observerId === perpetratorId) {
    return {
      threatScore: 0,
      oppositionSeverity: 0,
      proximityRisk: 0,
      shouldOppose: false,
      shouldWarn: false,
      shouldDeclareWar: false,
      reactionMessage: '',
    };
  }

  ensureFactionIdeology(observer);
  const tags = getFactionIdeologyTags(observer);
  const progress = getPerpetratorStarbindingProgress(state, perpetratorId);
  const stage = getStarbindingStage(perpetrator);
  const dives = perpetrator.starbinding?.completedDiveSystemIds.length ?? 0;
  const proximityRisk = getProximityToEmpire(state, observer, perpetratorId);
  const ideologyMod = getIdeologyOppositionModifier(tags);

  const threatScore = Math.floor((progress * 40 + stage * 5 + dives * 8 + proximityRisk * 25) * ideologyMod);
  const oppositionSeverity = Math.min(100, Math.floor(threatScore * 1.2));

  const relation = getRelationScore(observer, perpetratorId);
  if (getDiplomacy(observer, perpetratorId) === 'war') {
    return {
      threatScore: Math.max(threatScore, 60),
      oppositionSeverity,
      proximityRisk,
      shouldOppose: true,
      shouldWarn: stage >= 4,
      shouldDeclareWar: false,
      reactionMessage: `${observer.name} already at war over ${perpetrator.name}'s Starbinding.`,
    };
  }
  const observerPower = getEmpireMilitaryPower(state, observerId);
  const perpetratorPower = getEmpireMilitaryPower(state, perpetratorId);

  const shouldOppose = threatScore >= 15 && tags.includes('archive') ? threatScore >= 10 : threatScore >= 20;
  const shouldWarn = threatScore >= 25 && stage >= 4;
  const shouldDeclareWar =
    threatScore >= 55 &&
    dives >= 1 &&
    relation < 35 &&
    observerPower >= perpetratorPower * 0.7 &&
    (tags.includes('archive') || tags.includes('syrin') || observer.aiPersonality === 'aggressive');

  let reactionMessage = '';
  if (shouldWarn) {
    if (tags.includes('archive')) {
      reactionMessage = `${observer.name} issues archive preservation ultimatum against ${perpetrator.name}'s Starbinding.`;
    } else if (tags.includes('syrin')) {
      reactionMessage = `${observer.name} demands cessation of Starsilk weaponization. Inerting protocol cited.`;
    } else if (tags.includes('solidarity')) {
      reactionMessage = `${observer.name} warns: unilateral Partition threatens all factions.`;
    } else if (tags.includes('administration')) {
      reactionMessage = `${observer.name} files containment breach notice against unauthorized Starbinding.`;
    } else {
      reactionMessage = `${observer.name} registers Starbinding threat at ${threatScore}%. Opposition logged.`;
    }
  }

  return {
    threatScore,
    oppositionSeverity,
    proximityRisk,
    shouldOppose,
    shouldWarn,
    shouldDeclareWar,
    reactionMessage,
  };
}

export function chooseAIVictoryFocus(state: GameState, empireId: string): AIVictoryFocus {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire) return 'expand';

  ensureFactionIdeology(empire);
  const tags = getFactionIdeologyTags(empire);
  const pref = getFactionVictoryPreference(tags);

  if (pref === 'starbinding' && canAIPursueStarbinding(state, empire).eligible) {
    return 'starbinding';
  }
  if (pref === 'ledger_dominion' && empire.researchedTechs.includes('influence_projection')) {
    return 'ledger_dominion';
  }
  if (pref === 'archive_continuity' && empire.researchedTechs.includes('archive_syntax')) {
    return 'archive_continuity';
  }
  if (pref === 'blood_eclipse' && tags.includes('drakken')) {
    return 'blood_eclipse';
  }
  if (pref === 'syrin_inerting' && empire.researchedTechs.includes('syrin_inerting_method')) {
    return 'syrin_inerting';
  }

  if (empire.researchedTechs.length >= 14) return 'science';
  if (empire.totalPlanets >= 4) return 'domination';
  return 'expand';
}

export function canAIPursueStarbinding(
  state: GameState,
  empire: Empire,
): { eligible: boolean; reason: string } {
  if (empire.starbinding?.failed) return { eligible: false, reason: 'Starbinding failed' };

  ensureFactionIdeology(empire);
  const tags = getFactionIdeologyTags(empire);
  const allowed =
    tags.includes('frontier') ||
    (tags.includes('administration') && tags.includes('containment')) ||
    getFactionVictoryPreference(tags) === 'starbinding';

  if (!allowed) return { eligible: false, reason: 'Ideology rejects Starbinding' };

  const hasTheory = hasUnlock(empire.researchedTechs, 'forbidden_starbinding') ||
    empire.researchedTechs.includes('forbidden_starbinding');
  const reachable = STARBINDING_TECH_CHAIN.some(t =>
    !empire.researchedTechs.includes(t) && getAvailableTechs(empire.researchedTechs).some(av => av.id === t),
  ) || hasTheory;

  if (!reachable && !hasTheory) return { eligible: false, reason: 'Prerequisites unreachable' };

  const pool = ensureStarsilkResources(empire);
  const behindMilitarily = state.empires.some(other =>
    other.id !== empire.id && other.isAlive &&
    getEmpireMilitaryPower(state, other.id) > getEmpireMilitaryPower(state, empire.id) * 1.4,
  );

  if (!behindMilitarily && !hasTheory && pool.starsilkThread < 1) {
    return { eligible: false, reason: 'No strategic need for catastrophic path' };
  }

  const archiveAccessible = state.systems.some(s =>
    s.isArchiveStar && !isCollapsedSystem(s) &&
    (s.planets.some(p => p.ownerId === empire.id) ||
      state.fleets.some(f => f.empireId === empire.id && f.systemId === s.id)),
  );

  if (getStarbindingStage(empire) >= 4 && !archiveAccessible) {
    return { eligible: false, reason: 'No archive access' };
  }

  return { eligible: true, reason: 'Eligible' };
}

function aiPrioritizeStarbindingResearch(empire: Empire): void {
  if (empire.currentResearch) return;
  const available = getAvailableTechs(empire.researchedTechs, empire.repeatableTechCounts ?? {});
  const next = STARBINDING_TECH_CHAIN.find(t => !empire.researchedTechs.includes(t) && available.some(a => a.id === t));
  if (next) {
    empire.currentResearch = next;
    empire.researchProgress = 0;
  }
}

function findAIArchiveTarget(state: GameState, empire: Empire): string | null {
  const candidates = state.systems.filter(s =>
    s.isArchiveStar && !isCollapsedSystem(s) && s.id !== empire.capitalSystemId &&
    (s.planets.some(p => p.ownerId === empire.id) ||
      state.fleets.some(f => f.empireId === empire.id && f.systemId === s.id)),
  );
  if (candidates.length === 0) {
    return state.systems.find(s =>
      s.isArchiveStar && !isCollapsedSystem(s) && s.id !== empire.capitalSystemId,
    )?.id ?? null;
  }
  return candidates[0].id;
}

export function aiPursueStarbinding(state: GameState, empire: Empire, rng: SeededRNG): void {
  if (empire.aiVictoryFocus !== 'starbinding') return;
  const pursuit = canAIPursueStarbinding(state, empire);
  if (!pursuit.eligible && !isStarbindingUnlocked(empire)) return;

  aiPrioritizeStarbindingResearch(empire);

  const stage = getStarbindingStage(empire);
  const ownedSystem = state.systems.find(s =>
    s.planets.some(p => p.ownerId === empire.id && p.isColonized),
  );

  if (stage >= 3 && !empire.starbinding?.arraySystemId && ownedSystem) {
    const err = canBuildStarbindingArray(state, ownedSystem.id, empire.id);
    if (!err && rng.next() > 0.3) {
      if (buildStarbindingArray(state, ownedSystem.id, empire.id)) {
        state.events.push({
          turn: state.turn,
          type: 'starbinding',
          message: `${empire.name} constructs a Starbinding Array. The ledger expands without appeal.`,
        });
      }
    }
  }

  const archiveId = findAIArchiveTarget(state, empire);
  if (!archiveId) return;

  if (stage >= 4 && !empire.starbinding?.targetSystemIds.includes(archiveId)) {
    const fleet = state.fleets.find(f => f.empireId === empire.id);
    if (fleet && fleet.systemId !== archiveId) {
      const neighbors = getAdjacentSystems(state.systems, fleet.systemId);
      if (!neighbors.some(n => n.id === archiveId) && fleet.movesRemaining > 0) {
        setFleetTravelPath(fleet, state.systems, archiveId);
      } else if (neighbors.some(n => n.id === archiveId) && fleet.movesRemaining > 0) {
        fleet.systemId = archiveId;
        fleet.movesRemaining--;
      }
    }
    const selectErr = canSelectStarbindingTarget(state, archiveId, empire.id);
    if (!selectErr && rng.next() > 0.5) {
      selectStarbindingTarget(state, archiveId, empire.id);
      const player = state.empires.find(e => e.isPlayer);
      if (player && (player.knownSystems.has(archiveId) || player.visibleSystems.has(archiveId))) {
        state.events.push({
          turn: state.turn,
          type: 'starbinding',
          message: `${empire.name} marks ${state.systems.find(s => s.id === archiveId)!.name} for star dive.`,
        });
      }
    }
  }

  if (empire.starbinding?.targetSystemIds.includes(archiveId)) {
    const diveErr = canBeginStarDive(state, archiveId, empire.id);
    if (!diveErr && rng.next() > 0.4) {
      beginStarbindingDive(state, archiveId, empire.id);
    }
  }

  const pool = ensureStarsilkResources(empire);
  if (stage >= 6 && (empire.starbinding?.inertStarsilkStabilized ?? 0) < 5 && pool.starsilkThread >= 1) {
    stabilizeInertStarsilk(state, empire.id, 1);
  }

  const finalErr = canBeginFinalExecution(state, empire.id);
  if (!finalErr && rng.next() > 0.4) {
    beginFinalStarbindingExecution(state, empire.id);
  }
}

function moveFleetTowardSystem(fleet: Fleet, state: GameState, targetId: string): void {
  if (fleet.movesRemaining <= 0) return;
  const neighbors = getAdjacentSystems(state.systems, fleet.systemId);
  if (neighbors.some(n => n.id === targetId)) {
    fleet.systemId = targetId;
    fleet.movesRemaining--;
    fleet.stance = 'aggressive';
    return;
  }
  setFleetTravelPath(fleet, state.systems, targetId);
}

export function aiRespondToStarbindingThreat(state: GameState, empire: Empire, rng: SeededRNG): void {
  const others = state.empires.filter(e => e.id !== empire.id && e.isAlive && !e.isPirate);

  for (const perpetrator of others) {
    const progress = getPerpetratorStarbindingProgress(state, perpetrator.id);
    if (progress < 0.05 && getStarbindingStage(perpetrator) < 3) continue;

    const evaluation = evaluateStarbindingThreat(state, empire.id, perpetrator.id);
    if (evaluation.threatScore < 10) continue;

    empire.relationScores = empire.relationScores ?? {};
    const delta = -Math.floor(evaluation.threatScore / 8);
    empire.relationScores[perpetrator.id] = (empire.relationScores[perpetrator.id] ?? 50) + delta;

    if (evaluation.shouldOppose && getDiplomacy(empire, perpetrator.id) === 'neutral') {
      if (rng.next() > 0.5) makeHostile(empire, perpetrator);
    }

    empire.starbindingThreatWarned = empire.starbindingThreatWarned ?? {};
    const lastWarn = empire.starbindingThreatWarned[perpetrator.id] ?? 0;
    if (evaluation.shouldWarn && (lastWarn === 0 || state.turn - lastWarn >= 5)) {
      empire.starbindingThreatWarned[perpetrator.id] = state.turn;
      state.events.push({
        turn: state.turn,
        type: 'diplomacy',
        message: evaluation.reactionMessage,
      });
    }

    if (evaluation.shouldDeclareWar && canDeclareWar(empire, perpetrator) && rng.next() > 0.55) {
      declareWar(empire, perpetrator);
      state.events.push({
        turn: state.turn,
        type: 'diplomacy',
        message: `${empire.name} declares war to halt ${perpetrator.name}'s Starbinding.`,
      });
    }

    if (evaluation.shouldOppose && rng.next() > 0.4) {
      const targetId =
        perpetrator.starbinding?.activeCollapseSystemId ??
        perpetrator.starbinding?.targetSystemIds[0] ??
        perpetrator.starbinding?.arraySystemId;
      if (targetId) {
        const military = state.fleets.filter(f =>
          f.empireId === empire.id && f.movesRemaining > 0 && f.ships.some(s => s.attack > 0),
        );
        if (military.length > 0) {
          moveFleetTowardSystem(military[0], state, targetId);
        }
      }
    }

    const tags = getFactionIdeologyTags(empire);
    if (tags.includes('syrin') && rng.next() > 0.7) {
      const macros = getAvailableMacros(empire);
      if (macros.some(m => m.id === 'syrin_inerting_mist')) {
        const pool = ensureStarsilkResources(empire);
        if (pool.syrinReagent >= 2) {
          const target = perpetrator.starbinding?.arraySystemId ?? empire.capitalSystemId;
          if (target) executeMacro(state, empire.id, 'syrin_inerting_mist', target);
        }
      }
    }
  }
}

export function rotateAIVictoryFocus(state: GameState, empire: Empire, rng: SeededRNG): void {
  if (!empire.aiVictoryFocusTurn || state.turn - empire.aiVictoryFocusTurn >= 20) {
    empire.aiVictoryFocus = chooseAIVictoryFocus(state, empire.id);
    empire.aiVictoryFocusTurn = state.turn;
    if (empire.aiVictoryFocus === 'starbinding' && rng.next() > 0.3) {
      state.events.push({
        turn: state.turn,
        type: 'ai',
        message: `${empire.name} reoriented strategy toward catastrophic Partition theory.`,
      });
    }
  }
}

export function processAIStarbinding(state: GameState, rng: SeededRNG): void {
  const aiEmpires = state.empires.filter(e => !e.isPlayer && e.isAlive && !e.isPirate);

  for (const empire of aiEmpires) {
    ensureFactionIdeology(empire);
    rotateAIVictoryFocus(state, empire, rng);
    aiRespondToStarbindingThreat(state, empire, rng);
    aiPursueStarbinding(state, empire, rng);
  }
}

export function getVisibleRivalStarbindingProgress(state: GameState, viewerId: string): {
  empireId: string;
  empireName: string;
  progress: number;
  stage: number;
}[] {
  const viewer = state.empires.find(e => e.id === viewerId);
  if (!viewer) return [];

  return state.empires
    .filter(e => e.id !== viewerId && e.isAlive && !e.isPirate)
    .filter(e => {
      const stage = getStarbindingStage(e);
      if (stage < 2) return false;
      const arrayId = e.starbinding?.arraySystemId;
      if (arrayId && (viewer.knownSystems.has(arrayId) || viewer.visibleSystems.has(arrayId))) return true;
      return (e.starbinding?.completedDiveSystemIds.length ?? 0) > 0;
    })
    .map(e => ({
      empireId: e.id,
      empireName: e.name,
      progress: getStarbindingProgress(state, e.id),
      stage: getStarbindingStage(e),
    }));
}
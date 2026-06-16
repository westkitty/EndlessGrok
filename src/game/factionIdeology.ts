import { makeHostile } from './diplomacy';
import type { Empire, FactionIdeologyTag, GameState } from './types';

const FACTION_IDEOLOGY_MAP: Record<number, FactionIdeologyTag[]> = {
  0: ['solidarity', 'frontier'],
  1: ['administration', 'containment'],
  2: ['archive', 'syrin'],
  3: ['drakken', 'frontier'],
  4: ['administration', 'archive'],
};

export function getFactionIdeologyTags(empire: Empire): FactionIdeologyTag[] {
  if (empire.ideologyTags?.length) return empire.ideologyTags;
  const index = empire.factionIndex ?? (parseInt(empire.id.replace('empire-', ''), 10) || 0);
  return FACTION_IDEOLOGY_MAP[index] ?? ['frontier'];
}

export function ensureFactionIdeology(empire: Empire): void {
  if (!empire.ideologyTags) {
    empire.ideologyTags = getFactionIdeologyTags(empire);
  }
}

export function getFactionReactionToHeliocide(
  observer: Empire,
  perpetratorId: string,
): { relationDelta: number; message: string } {
  const tags = getFactionIdeologyTags(observer);
  if (observer.id === perpetratorId) {
    return { relationDelta: 0, message: 'Your own heliocide is logged without comment.' };
  }
  if (tags.includes('archive')) {
    return { relationDelta: -25, message: `${observer.name} records memory destruction. Relations severed in all but name.` };
  }
  if (tags.includes('syrin')) {
    return { relationDelta: -20, message: `${observer.name} condemns Starsilk weaponization at stellar scale.` };
  }
  if (tags.includes('administration')) {
    return { relationDelta: -15, message: `${observer.name} files unauthorized heliocide under containment breach.` };
  }
  if (tags.includes('drakken')) {
    return { relationDelta: -5, message: `${observer.name} notes infrastructure loss. Containment preferred over erasure.` };
  }
  if (tags.includes('solidarity')) {
    return { relationDelta: -18, message: `${observer.name} fears unilateral Partition. The sky belongs to everyone.` };
  }
  return { relationDelta: -12, message: `${observer.name} registers heliocide with procedural outrage.` };
}

export function getFactionReactionToStarbindingProgress(
  observer: Empire,
  progress: number,
): { relationDelta: number; threat: number } {
  const tags = getFactionIdeologyTags(observer);
  let relationDelta = -Math.floor(progress * 20);
  let threat = Math.floor(progress * 30);
  if (tags.includes('containment')) threat += 10;
  if (tags.includes('archive')) relationDelta -= 5;
  if (tags.includes('drakken') && progress > 0.5) relationDelta += 3;
  return { relationDelta, threat };
}

export function getFactionReactionToBloodRingUse(observer: Empire): number {
  const tags = getFactionIdeologyTags(observer);
  if (tags.includes('drakken')) return -2;
  if (tags.includes('administration')) return -8;
  if (tags.includes('syrin')) return -12;
  return -10;
}

export function getFactionMacroPreference(tags: FactionIdeologyTag[]): string[] {
  if (tags.includes('administration')) return ['local_checksum_audit', 'siege_lattice_anchor'];
  if (tags.includes('drakken')) return ['drakken_biosphere_render', 'archive_extraction_loop'];
  if (tags.includes('syrin')) return ['syrin_inerting_mist', 'gravity_thread_seal'];
  if (tags.includes('archive')) return ['archive_extraction_loop', 'local_checksum_audit'];
  return ['first_dirt_protocol', 'gravity_thread_seal'];
}

export function getFactionVictoryPreference(tags: FactionIdeologyTag[]): string {
  if (tags.includes('administration')) return 'ledger_dominion';
  if (tags.includes('drakken')) return 'blood_eclipse';
  if (tags.includes('archive')) return 'archive_continuity';
  if (tags.includes('syrin')) return 'syrin_inerting';
  if (tags.includes('containment')) return 'ledger_dominion';
  return 'starbinding';
}

export function applyHeliocideDiplomaticReactions(
  state: GameState,
  perpetratorId: string,
): void {
  const perpetrator = state.empires.find(e => e.id === perpetratorId);
  if (!perpetrator) return;

  for (const other of state.empires) {
    if (!other.isAlive || other.id === perpetratorId || other.isPirate) continue;
    const reaction = getFactionReactionToHeliocide(other, perpetratorId);
    other.relationScores = other.relationScores ?? {};
    other.relationScores[perpetratorId] = (other.relationScores[perpetratorId] ?? 50) + reaction.relationDelta;
    perpetrator.relationScores = perpetrator.relationScores ?? {};
    perpetrator.relationScores[other.id] = (perpetrator.relationScores[other.id] ?? 50) + Math.floor(reaction.relationDelta / 2);

    if (reaction.relationDelta <= -20) {
      makeHostile(other, perpetrator);
    }

    state.events.push({
      turn: state.turn,
      type: 'diplomacy',
      message: reaction.message,
    });
  }
}

export function applyStarbindingProgressReactions(state: GameState, empireId: string): void {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire?.starbinding) return;
  const progress = empire.starbinding.completedDiveSystemIds.length / 3;

  for (const other of state.empires) {
    if (!other.isAlive || other.id === empireId || other.isPirate) continue;
    const reaction = getFactionReactionToStarbindingProgress(other, progress);
    other.relationScores = other.relationScores ?? {};
    other.relationScores[empireId] = (other.relationScores[empireId] ?? 50) + reaction.relationDelta;
  }
}
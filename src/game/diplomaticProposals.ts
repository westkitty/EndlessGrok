import { DIPLOMATIC_PROPOSAL_EXPIRY_TURNS } from './constants';
import {
  getDiplomacy,
  getRelationScore,
  makePeace,
  proposeNonAggressionPact,
  proposeResearchPact,
  proposeTradePact,
} from './diplomacy';
import type { DiplomaticProposal, DiplomaticProposalType, Empire, GameState } from './types';
import type { SeededRNG } from './rng';

let proposalCounter = 0;

export function resetProposalCounter(): void {
  proposalCounter = 0;
}

function createProposalId(): string {
  return `proposal-${proposalCounter++}`;
}

export function getPendingProposalsForEmpire(state: GameState, empireId: string): DiplomaticProposal[] {
  return (state.diplomaticProposals ?? []).filter(p => p.toEmpireId === empireId);
}

export function getOutgoingProposals(state: GameState, empireId: string): DiplomaticProposal[] {
  return (state.diplomaticProposals ?? []).filter(p => p.fromEmpireId === empireId);
}

function hasPendingProposal(
  state: GameState,
  fromId: string,
  toId: string,
  type: DiplomaticProposalType
): boolean {
  return (state.diplomaticProposals ?? []).some(
    p => p.fromEmpireId === fromId && p.toEmpireId === toId && p.type === type
  );
}

function applyProposal(state: GameState, proposal: DiplomaticProposal): boolean {
  const from = state.empires.find(e => e.id === proposal.fromEmpireId);
  const to = state.empires.find(e => e.id === proposal.toEmpireId);
  if (!from || !to || !from.isAlive || !to.isAlive) return false;

  switch (proposal.type) {
    case 'trade':
      return proposeTradePact(from, to);
    case 'pact':
      return proposeNonAggressionPact(from, to);
    case 'research_pact':
      return proposeResearchPact(from, to);
    case 'peace':
      if (getDiplomacy(from, to.id) === 'war') {
        makePeace(from, to);
        return true;
      }
      return false;
    default:
      return false;
  }
}

export function evaluateAIProposalAcceptance(
  state: GameState,
  proposal: DiplomaticProposal,
  rng: SeededRNG
): boolean {
  const from = state.empires.find(e => e.id === proposal.fromEmpireId);
  const to = state.empires.find(e => e.id === proposal.toEmpireId);
  if (!from || !to) return false;

  const relation = getRelationScore(to, from.id);
  const dip = getDiplomacy(to, from.id);

  if (dip === 'war' || dip === 'hostile') {
    return proposal.type === 'peace' && relation >= 35;
  }

  if (proposal.type === 'peace') return false;

  const threshold =
    proposal.type === 'research_pact' ? 55 :
    proposal.type === 'pact' ? 45 :
    40;

  const personalityBonus =
    to.aiPersonality === 'diplomatic' ? 15 :
    to.aiPersonality === 'isolationist' ? -10 :
    0;

  const roll = relation + personalityBonus + rng.next() * 20;
  return roll >= threshold;
}

export function createDiplomaticProposal(
  state: GameState,
  fromId: string,
  toId: string,
  type: DiplomaticProposalType
): DiplomaticProposal | null {
  const from = state.empires.find(e => e.id === fromId);
  const to = state.empires.find(e => e.id === toId);
  if (!from || !to || !from.isAlive || !to.isAlive) return null;
  if (fromId === toId) return null;
  if (hasPendingProposal(state, fromId, toId, type)) return null;

  const dip = getDiplomacy(from, toId);
  if (type !== 'peace' && (dip === 'war' || dip === 'hostile')) return null;
  if (type === 'peace' && dip !== 'war') return null;

  const proposal: DiplomaticProposal = {
    id: createProposalId(),
    fromEmpireId: fromId,
    toEmpireId: toId,
    type,
    turn: state.turn,
    expiresTurn: state.turn + DIPLOMATIC_PROPOSAL_EXPIRY_TURNS,
  };

  state.diplomaticProposals = [...(state.diplomaticProposals ?? []), proposal];
  return proposal;
}

export function acceptDiplomaticProposal(state: GameState, proposalId: string): boolean {
  const proposals = state.diplomaticProposals ?? [];
  const proposal = proposals.find(p => p.id === proposalId);
  if (!proposal) return false;

  const applied = applyProposal(state, proposal);
  if (!applied) return false;

  const from = state.empires.find(e => e.id === proposal.fromEmpireId)!;
  const to = state.empires.find(e => e.id === proposal.toEmpireId)!;
  state.diplomaticProposals = proposals.filter(p => p.id !== proposalId);

  state.events.push({
    turn: state.turn,
    type: 'diplomacy',
    message: `${to.name} accepted ${proposal.type.replace('_', ' ')} proposal from ${from.name}`,
  });
  return true;
}

export function rejectDiplomaticProposal(state: GameState, proposalId: string): boolean {
  const proposals = state.diplomaticProposals ?? [];
  const proposal = proposals.find(p => p.id === proposalId);
  if (!proposal) return false;

  const from = state.empires.find(e => e.id === proposal.fromEmpireId)!;
  const to = state.empires.find(e => e.id === proposal.toEmpireId)!;
  state.diplomaticProposals = proposals.filter(p => p.id !== proposalId);

  state.events.push({
    turn: state.turn,
    type: 'diplomacy',
    message: `${to.name} declined ${proposal.type.replace('_', ' ')} proposal from ${from.name}`,
  });
  return true;
}

export function submitDiplomaticProposal(
  state: GameState,
  fromId: string,
  toId: string,
  type: DiplomaticProposalType,
  rng?: SeededRNG
): 'accepted' | 'pending' | 'rejected' | 'failed' {
  const to = state.empires.find(e => e.id === toId);
  if (!to) return 'failed';

  const proposal = createDiplomaticProposal(state, fromId, toId, type);
  if (!proposal) return 'failed';

  if (to.isPlayer) {
    state.events.push({
      turn: state.turn,
      type: 'diplomacy',
      message: `${state.empires.find(e => e.id === fromId)?.name} proposed ${type.replace('_', ' ')} — awaiting your response`,
    });
    return 'pending';
  }

  const accept = rng ? evaluateAIProposalAcceptance(state, proposal, rng) : true;
  if (accept) {
    acceptDiplomaticProposal(state, proposal.id);
    return 'accepted';
  }

  rejectDiplomaticProposal(state, proposal.id);
  return 'rejected';
}

export function processDiplomaticProposals(state: GameState, rng: SeededRNG): void {
  const proposals = state.diplomaticProposals ?? [];
  if (proposals.length === 0) return;

  const remaining: DiplomaticProposal[] = [];
  for (const proposal of proposals) {
    if (proposal.expiresTurn < state.turn) {
      const from = state.empires.find(e => e.id === proposal.fromEmpireId);
      const to = state.empires.find(e => e.id === proposal.toEmpireId);
      if (from && to) {
        state.events.push({
          turn: state.turn,
          type: 'diplomacy',
          message: `${proposal.type.replace('_', ' ')} proposal between ${from.name} and ${to.name} expired`,
        });
      }
      continue;
    }

    const to = state.empires.find(e => e.id === proposal.toEmpireId);
    if (to && !to.isPlayer && proposal.fromEmpireId === state.playerEmpireId) {
      continue;
    }

    if (to && !to.isPlayer) {
      if (evaluateAIProposalAcceptance(state, proposal, rng)) {
        acceptDiplomaticProposal(state, proposal.id);
      } else {
        rejectDiplomaticProposal(state, proposal.id);
      }
      continue;
    }

    remaining.push(proposal);
  }

  state.diplomaticProposals = remaining;
}

export function maybeAIOfferProposal(state: GameState, empire: Empire, rng: SeededRNG): void {
  if (!empire.isAlive || empire.isPlayer || empire.isPirate) return;

  const player = state.empires.find(e => e.id === state.playerEmpireId);
  if (!player?.isAlive) return;

  if (rng.next() > 0.25) return;

  const dip = getDiplomacy(empire, player.id);
  if (dip !== 'neutral' && dip !== 'trade') return;

  const relation = getRelationScore(empire, player.id);
  if (relation < 50) return;

  const type: DiplomaticProposalType =
    empire.aiPersonality === 'diplomatic' && rng.next() > 0.5 ? 'research_pact' :
    rng.next() > 0.6 ? 'pact' : 'trade';

  if (hasPendingProposal(state, empire.id, player.id, type)) return;

  const proposal = createDiplomaticProposal(state, empire.id, player.id, type);
  if (!proposal) return;

  state.events.push({
    turn: state.turn,
    type: 'diplomacy',
    message: `${empire.name} proposes a ${type.replace('_', ' ')} — check Diplomacy tab`,
  });
}
import type { Empire, GameState, PlayerDecision } from './types';

export const DECISION_EXPIRY_TURNS = 5;
export const FRONTIER_SURVEY_SCIENCE_REWARD = 12;
export const FRONTIER_SURVEY_INFLUENCE_REWARD = 6;

let decisionCounter = 0;

export function resetDecisionCounter(): void {
  decisionCounter = 0;
}

function createDecisionId(): string {
  return `decision-${decisionCounter++}`;
}

export type DecisionType = 'frontier_survey';

export function createDecision(
  state: GameState,
  empireId: string,
  decisionType: DecisionType,
  title: string,
  description: string
): PlayerDecision | null {
  const empire = state.empires.find(e => e.id === empireId);
  if (!empire?.isAlive) return null;

  let choices: PlayerDecision['choices'];
  if (decisionType === 'frontier_survey') {
    choices = [
      { id: 'survey_science', label: 'Prioritize scientific survey', hint: `+${FRONTIER_SURVEY_SCIENCE_REWARD} science` },
      { id: 'survey_influence', label: 'Broadcast findings', hint: `+${FRONTIER_SURVEY_INFLUENCE_REWARD} influence` },
    ];
  } else {
    return null;
  }

  const decision: PlayerDecision = {
    id: createDecisionId(),
    empireId,
    decisionType,
    title,
    description,
    choices,
    turn: state.turn,
    expiresTurn: state.turn + DECISION_EXPIRY_TURNS,
  };

  state.pendingDecisions = [...(state.pendingDecisions ?? []), decision];
  return decision;
}

export function getPendingDecisionsForEmpire(state: GameState, empireId: string): PlayerDecision[] {
  return (state.pendingDecisions ?? []).filter(d => d.empireId === empireId);
}

function applyFrontierSurveyChoice(empire: Empire, choiceId: string): string {
  if (choiceId === 'survey_science') {
    empire.resources.science += FRONTIER_SURVEY_SCIENCE_REWARD;
    return `Scientific survey yields +${FRONTIER_SURVEY_SCIENCE_REWARD} science`;
  }
  if (choiceId === 'survey_influence') {
    empire.influence += FRONTIER_SURVEY_INFLUENCE_REWARD;
    return `Broadcast findings yield +${FRONTIER_SURVEY_INFLUENCE_REWARD} influence`;
  }
  return 'No effect';
}

export function resolveDecision(
  state: GameState,
  decisionId: string,
  choiceId: string
): boolean {
  const decisions = state.pendingDecisions ?? [];
  const index = decisions.findIndex(d => d.id === decisionId);
  if (index < 0) return false;

  const decision = decisions[index];
  const empire = state.empires.find(e => e.id === decision.empireId);
  if (!empire) return false;

  const validChoice = decision.choices.some(c => c.id === choiceId);
  if (!validChoice) return false;

  let outcome = '';
  if (decision.decisionType === 'frontier_survey') {
    outcome = applyFrontierSurveyChoice(empire, choiceId);
  }

  state.pendingDecisions = decisions.filter(d => d.id !== decisionId);
  state.events.push({
    turn: state.turn,
    type: 'event',
    message: `${empire.name}: ${decision.title} — ${outcome}`,
  });

  return true;
}

export function processExpiredDecisions(state: GameState): number {
  const decisions = state.pendingDecisions ?? [];
  if (decisions.length === 0) return 0;

  const expired = decisions.filter(d => d.expiresTurn <= state.turn);
  const remaining = decisions.filter(d => d.expiresTurn > state.turn);

  for (const decision of expired) {
    const empire = state.empires.find(e => e.id === decision.empireId);
    if (empire) {
      state.events.push({
        turn: state.turn,
        type: 'event',
        message: `${empire.name}: Decision expired — ${decision.title}`,
      });
    }
  }

  state.pendingDecisions = remaining;
  return expired.length;
}
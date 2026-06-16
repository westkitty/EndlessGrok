import type { EconomyBreakdown, Empire, GameState, Resources, TurnSummary } from './types';

export function createTurnSummary(
  turn: number,
  empires: Empire[],
  playerId: string,
  battles: number,
  captures: number,
  prevInfluence: number,
  economy?: EconomyBreakdown,
  colonizationsCompleted = 0,
  researchCompleted = 0
): TurnSummary {
  const player = empires.find(e => e.id === playerId)!;
  const production: Resources = {
    credits: player.resources.credits,
    food: player.resources.food,
    industry: player.resources.industry,
    science: player.resources.science,
  };

  return {
    turn,
    production,
    populationGrowth: 0,
    battles,
    captures,
    influenceGained: player.influence - prevInfluence,
    colonizationsCompleted,
    researchCompleted,
    economy,
  };
}

export function generateTurnSummary(
  state: GameState,
  battles: number,
  captures: number,
  prevPlayerInfluence: number,
  economy?: EconomyBreakdown,
  colonizationsCompleted = 0,
  researchCompleted = 0
): TurnSummary {
  return createTurnSummary(
    state.turn,
    state.empires,
    state.playerEmpireId,
    battles,
    captures,
    prevPlayerInfluence,
    economy,
    colonizationsCompleted,
    researchCompleted
  );
}
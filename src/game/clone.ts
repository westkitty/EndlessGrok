import type { GameState } from './types';

/** Deep clone game state for turn processing and safe UI updates. */
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    settings: { ...state.settings },
    systems: state.systems.map(s => ({
      ...s,
      planets: s.planets.map(p => ({
        ...p,
        buildings: [...p.buildings],
        productionQueue: p.productionQueue.map(q => ({ ...q })),
        blockers: [...(p.blockers ?? [])],
        modifiers: [...(p.modifiers ?? [])],
      })),
      exploredBy: { ...s.exploredBy },
      anomaly: s.anomaly ? { ...s.anomaly } : null,
      siegeBlockaders: [...(s.siegeBlockaders ?? [])],
    })),
    empires: state.empires.map(e => ({
      ...e,
      resources: { ...e.resources },
      strategicResources: { ...e.strategicResources },
      knownSystems: new Set(e.knownSystems),
      visibleSystems: new Set(e.visibleSystems),
      diplomacy: { ...e.diplomacy },
      researchedTechs: [...e.researchedTechs],
      relationScores: { ...(e.relationScores ?? {}) },
      warScores: { ...(e.warScores ?? {}) },
      repeatableTechCounts: { ...(e.repeatableTechCounts ?? {}) },
      lastSeenSystems: { ...(e.lastSeenSystems ?? {}) },
      factionIndex: e.factionIndex,
    })),
    fleets: state.fleets.map(f => ({
      ...f,
      ships: f.ships.map(s => ({ ...s })),
      travelPath: [...(f.travelPath ?? [])],
    })),
    events: [...state.events],
    combatResults: [...state.combatResults],
    turnSummaries: [...(state.turnSummaries ?? [])],
    activeEventChains: [...(state.activeEventChains ?? [])],
    diplomaticProposals: [...(state.diplomaticProposals ?? [])],
    colonizationProjects: [...(state.colonizationProjects ?? [])].map(p => ({ ...p })),
    pendingDecisions: [...(state.pendingDecisions ?? [])].map(d => ({
      ...d,
      choices: [...d.choices],
    })),
  };
}
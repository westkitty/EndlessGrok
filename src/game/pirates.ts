import { PIRATE_SPAWN_TURN } from './constants';
import { createShip } from './ships';
import { SeededRNG } from './rng';
import type { Empire, GameState } from './types';

export function shouldSpawnPirates(state: GameState): boolean {
  return state.turn >= PIRATE_SPAWN_TURN && !state.piratesSpawned;
}

export function spawnPirateFaction(state: GameState, rng: SeededRNG): void {
  if (state.piratesSpawned) return;

  const unownedSystems = state.systems.filter(s =>
    s.systemType !== 'black_hole' &&
    !s.planets.some(p => p.isColonized)
  );
  const fallbackSystems = state.systems.filter(s => s.systemType !== 'black_hole');
  if (unownedSystems.length === 0 && fallbackSystems.length === 0) return;

  const pirateSystem = unownedSystems.length > 0
    ? rng.pick(unownedSystems)
    : rng.pick(fallbackSystems);
  const pirateEmpire: Empire = {
    id: 'empire-pirates',
    name: 'Freebooter Cartel',
    color: '#aa6633',
    emblem: 'crimson',
    trait: 'militarist',
    isPlayer: false,
    isAlive: true,
    isPirate: true,
    resources: { credits: 50, food: 20, industry: 30, science: 5 },
    strategicResources: { titanium: 0, antimatter: 0, darkmatter: 0 },
    researchedTechs: ['basic_propulsion', 'frigate_design'],
    currentResearch: null,
    researchProgress: 0,
    researchQueue: null,
    knownSystems: new Set([pirateSystem.id]),
    visibleSystems: new Set([pirateSystem.id]),
    diplomacy: {},
    totalPlanets: 0,
    influence: 0,
    influenceVictoryTurns: 0,
    warWeariness: 0,
    capitalSystemId: pirateSystem.id,
    score: 0,
    aiPersonality: 'aggressive',
    aiGoal: 'militarize',
    relationScores: {},
    warScores: {},
  };

  for (const empire of state.empires) {
    if (empire.isAlive) {
      pirateEmpire.diplomacy[empire.id] = 'hostile';
      empire.diplomacy[pirateEmpire.id] = 'hostile';
      pirateEmpire.relationScores![empire.id] = -50;
      empire.relationScores = empire.relationScores ?? {};
      empire.relationScores[pirateEmpire.id] = -50;
    }
  }

  state.empires.push(pirateEmpire);
  state.fleets.push({
    id: 'fleet-pirates-1',
    empireId: pirateEmpire.id,
    systemId: pirateSystem.id,
    ships: [createShip('frigate'), createShip('scout')],
    movesRemaining: 2,
    hasColonyShip: false,
    destinationSystemId: null,
    travelPath: [],
    travelTurns: 0,
    stance: 'aggressive',
    autoExplore: false,
    battleCount: 0,
    isVeteran: false,
  });

  state.piratesSpawned = true;
  state.pirateEmpireId = pirateEmpire.id;
  state.events.push({
    turn: state.turn,
    type: 'event',
    message: 'Pirate fleets emerge from the outer rim! The Freebooter Cartel threatens trade routes.',
  });
}
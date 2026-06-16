import { describe, it, expect } from 'vitest';
import { createNewGame, endTurn, serializeGame, deserializeGame } from '../game';
import {
  moveFleet, colonizePlanet, canColonize, startResearch, buildShip, canBuildShip,
  buildBuilding, exploreAnomalyAction, setFleetDestination, mergeFleets,
} from '../actions';
import { findPath } from '../travel';
import { checkVictoryConditions } from '../victory';
import { factionToPlayerSetup, FACTION_DEFINITIONS } from '../factions';
import type { GameState } from '../types';

function cloneState(game: GameState): GameState {
  return {
    ...game,
    settings: { ...game.settings },
    systems: game.systems.map(s => ({
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
    empires: game.empires.map(e => ({
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
    })),
    fleets: game.fleets.map(f => ({
      ...f,
      ships: f.ships.map(s => ({ ...s })),
      travelPath: [...(f.travelPath ?? [])],
    })),
    events: [...game.events],
    combatResults: [...game.combatResults],
    turnSummaries: [...(game.turnSummaries ?? [])],
    activeEventChains: [...(game.activeEventChains ?? [])],
  };
}

describe('Full playthrough simulation', () => {
  it('enforces fleet command limit when building ships', () => {
    const game = createNewGame(42, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    const home = game.systems.find(s => s.planets.some(p => p.ownerId === player.id))!;
    player.resources.credits = 9999;
    player.resources.industry = 9999;

    let built = 0;
    while (built < 20) {
      const err = canBuildShip(game, 'scout', home.id);
      if (err?.includes('command limit')) break;
      if (!buildShip(game, 'scout', home.id)) break;
      built++;
    }
    expect(built).toBeLessThanOrEqual(6);
    expect(canBuildShip(game, 'scout', home.id)).toMatch(/command limit/i);
  });

  it('creates game with selected faction bonuses applied', () => {
    const faction = FACTION_DEFINITIONS[2];
    const game = createNewGame(42, { empireCount: 2 }, factionToPlayerSetup(faction), 2);
    const player = game.empires.find(e => e.isPlayer)!;
    expect(player.trait).toBe(faction.trait);
    expect(player.emblem).toBe(faction.emblem);
    // Verdant gets +science 8, +food 15 on top of difficulty-adjusted base
    expect(player.resources.science).toBeGreaterThanOrEqual(8);
    expect(player.resources.food).toBeGreaterThanOrEqual(15);
  });

  it('player can explore, colonize, research, and build over 30 turns', () => {
    let game = createNewGame(12345, { difficulty: 'easy', empireCount: 2, maxTurns: 200 }, undefined, 0);
    const player = () => game.empires.find(e => e.isPlayer)!;

    // Research agriculture turn 1
    expect(startResearch(game, 'agriculture')).toBe(true);

    for (let turn = 0; turn < 30 && game.phase === 'playing'; turn++) {
      const p = player();

      // Try to move scout to adjacent system
      const scout = game.fleets.find(f => f.empireId === p.id && f.ships.some(s => s.type === 'scout'));
      if (scout && scout.movesRemaining > 0) {
        const sys = game.systems.find(s => s.id === scout.systemId)!;
        for (const connId of sys.connections) {
          if (moveFleet(game, scout.id, connId)) break;
        }
      }

      // Try colonize if possible
      for (const system of game.systems) {
        if (!p.knownSystems.has(system.id)) continue;
        for (const planet of system.planets) {
          if (!canColonize(game, planet.id)) continue;
          colonizePlanet(game, planet.id);
          break;
        }
      }

      // Build farm on owned planet if affordable
      const owned = game.systems.flatMap(s => s.planets).find(pl => pl.ownerId === p.id && pl.isColonized);
      if (owned && p.resources.credits >= 30) {
        buildBuilding(game, owned.id, 'farm');
      }

      // Explore anomaly if fleet present
      const anomalySystem = game.systems.find(s => s.anomaly && !s.anomaly.rewardClaimed);
      if (anomalySystem) {
        const fleetThere = game.fleets.find(f => f.empireId === p.id && f.systemId === anomalySystem.id);
        if (fleetThere) exploreAnomalyAction(game, anomalySystem.id, 'safe');
      }

      game = endTurn(cloneState(game));
    }

    expect(game.turn).toBeGreaterThan(1);
    expect(player().researchedTechs.length + (player().currentResearch ? 1 : 0)).toBeGreaterThan(0);
    expect(game.events.length).toBeGreaterThan(5);
  });

  it('multi-hop fleet destination reaches target over multiple turns', () => {
    const game = createNewGame(777, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    const fleet = game.fleets.find(f => f.empireId === player.id && !f.hasColonyShip)!;
    const start = fleet!.systemId;

    // Find a system 3 hops away
    let target: string | null = null;
    for (const sys of game.systems) {
      const path = findPath(game.systems, start, sys.id);
      if (path && path.length >= 4) {
        target = sys.id;
        break;
      }
    }

    if (target) {
      let state = cloneState(game);
      expect(setFleetDestination(state, fleet!.id, target)).toBe(true);
      let arrived = false;
      for (let i = 0; i < 10 && state.phase === 'playing'; i++) {
        state = endTurn(cloneState(state));
        const f = state.fleets.find(x => x.id === fleet!.id);
        if (f?.systemId === target) {
          arrived = true;
          break;
        }
      }
      expect(arrived).toBe(true);
    }
  });

  it('save/load preserves playable state mid-game', () => {
    let game = createNewGame(99, { empireCount: 3 });
    for (let i = 0; i < 10; i++) game = endTurn(cloneState(game));

    const loaded = deserializeGame(serializeGame(game));
    expect(loaded.turn).toBe(game.turn);
    expect(loaded.empires.length).toBe(3);
    expect(loaded.fleets.length).toBe(game.fleets.length);
    expect(loaded.phase).toBe('playing');

    const after = endTurn(cloneState(loaded));
    expect(after.turn).toBe(loaded.turn + 1);
  });

  it('victory or defeat triggers without crash by turn 150', () => {
    let game = createNewGame(42, { difficulty: 'easy', empireCount: 2, maxTurns: 150 });
    for (let i = 0; i < 150 && game.phase === 'playing'; i++) {
      game = endTurn(cloneState(game));
    }
    expect(['playing', 'victory', 'defeat']).toContain(game.phase);
    if (game.phase !== 'playing') {
      expect(game.winnerId).toBeTruthy();
      expect(game.victoryType).toBeTruthy();
    } else {
      expect(checkVictoryConditions(game).winnerId).toBeNull();
    }
  });

  it('merge fleets works when two fleets in same system', () => {
    const game = createNewGame(55, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    const home = game.systems.find(s => s.planets.some(p => p.ownerId === player.id))!;

    let state = cloneState(game);
    buildShip(state, 'scout', home.id);
    buildShip(state, 'scout', home.id);

    const fleets = state.fleets.filter(f => f.empireId === player.id && f.systemId === home.id && !f.hasColonyShip);
    if (fleets.length >= 2) {
      const ok = mergeFleets(state, fleets[0].id, fleets[1].id);
      expect(ok).toBe(true);
      expect(state.fleets.filter(f => f.empireId === player.id && f.systemId === home.id && !f.hasColonyShip).length).toBe(1);
    }
  });
});
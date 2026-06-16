import { describe, it, expect } from 'vitest';
import { createNewGame, endTurn } from '../game';
import {
  mergeFleets, splitFleet, setFleetDestination, getFleetPath,
  createFleetId, resetFleetCounter,
} from '../actions';
import { findPath, setFleetTravelPath } from '../travel';
import { tryCapturePlanet, hasDefendingFleet } from '../capture';
import { getVictoryProgress } from '../victory';
import { calculateEmpireScore } from '../scoring';
import type { GameState } from '../types';

function cloneState(game: ReturnType<typeof createNewGame>): GameState {
  return {
    ...game,
    settings: { ...game.settings },
    systems: game.systems.map(s => ({
      ...s,
      planets: s.planets.map(p => ({
        ...p,
        buildings: [...p.buildings],
        productionQueue: p.productionQueue.map(q => ({ ...q })),
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
    })),
    fleets: game.fleets.map(f => ({ ...f, ships: f.ships.map(s => ({ ...s })), travelPath: [...(f.travelPath ?? [])] })),
    events: [...game.events],
    combatResults: [...game.combatResults],
    turnSummaries: [...(game.turnSummaries ?? [])],
  };
}

describe('Multi-Empire Creation', () => {
  it('creates 2 empires by default', () => {
    const game = createNewGame(42);
    expect(game.empires).toHaveLength(2);
  });

  it('creates 4 empires with empireCount=4', () => {
    const game = createNewGame(42, { empireCount: 4 });
    expect(game.empires).toHaveLength(4);
    expect(game.empires.filter(e => !e.isPlayer)).toHaveLength(3);
  });

  it('applies player setup', () => {
    const game = createNewGame(42, {}, {
      name: 'Custom Empire',
      color: '#ff00ff',
      emblem: 'void',
      trait: 'militarist',
    });
    const player = game.empires.find(e => e.isPlayer)!;
    expect(player.name).toBe('Custom Empire');
    expect(player.color).toBe('#ff00ff');
    expect(player.trait).toBe('militarist');
    expect(player.emblem).toBe('void');
  });

  it('assigns unique starting positions', () => {
    const game = createNewGame(42, { empireCount: 3 });
    const homeSystems = game.empires.map(e =>
      game.systems.find(s => s.planets.some(p => p.ownerId === e.id))!.id
    );
    const unique = new Set(homeSystems);
    expect(unique.size).toBe(3);
  });
});

describe('Travel and Pathfinding', () => {
  it('finds path between connected systems', () => {
    const game = createNewGame(42);
    const start = game.fleets[0].systemId;
    const target = game.systems.find(s => s.id !== start && game.systems.find(x => x.id === start)?.connections.includes(s.id))!;
    const path = findPath(game.systems, start, target.id);
    expect(path).not.toBeNull();
    expect(path![0]).toBe(start);
    expect(path![path!.length - 1]).toBe(target.id);
  });

  it('setFleetDestination sets multi-hop path', () => {
    const game = cloneState(createNewGame(42));
    const fleet = game.fleets.find(f => f.empireId === game.playerEmpireId)!;

    let distant = game.systems[0];
    for (const sys of game.systems) {
      const path = findPath(game.systems, fleet.systemId, sys.id);
      if (path && path.length > 2) {
        distant = sys;
        break;
      }
    }

    const path = findPath(game.systems, fleet.systemId, distant.id);
    if (path && path.length > 2) {
      expect(setFleetDestination(game, fleet.id, distant.id)).toBe(true);
      expect(game.fleets.find(f => f.id === fleet.id)!.travelPath.length).toBeGreaterThan(1);
      expect(getFleetPath(game, fleet.id).length).toBeGreaterThan(1);
    }
  });

  it('moves fleet along path over multiple turns', () => {
    const game = cloneState(createNewGame(42));
    const fleet = game.fleets.find(f => f.empireId === game.playerEmpireId && !f.hasColonyShip)!;

    let distant = game.systems[0];
    for (const sys of game.systems) {
      const path = findPath(game.systems, fleet.systemId, sys.id);
      if (path && path.length > 2) {
        distant = sys;
        break;
      }
    }

    const path = findPath(game.systems, fleet.systemId, distant.id);
    if (!path || path.length <= 2) return;

    setFleetTravelPath(fleet, game.systems, distant.id);
    const startSystem = fleet.systemId;

    let turns = 0;
    while (fleet.systemId !== distant.id && turns < 20) {
      const next = endTurn(cloneState(game));
      const updatedFleet = next.fleets.find(f => f.id === fleet.id);
      if (!updatedFleet) break;
      Object.assign(fleet, updatedFleet);
      Object.assign(game, next);
      turns++;
    }

    expect(fleet.systemId).toBe(distant.id);
    expect(startSystem).not.toBe(distant.id);
  });
});

describe('Fleet Merge and Split', () => {
  it('merges fleets in same system', () => {
    resetFleetCounter();
    const game = cloneState(createNewGame(42));
    const player = game.playerEmpireId;
    const systemId = game.fleets.find(f => f.empireId === player)!.systemId;

    game.fleets.push({
      id: createFleetId(),
      empireId: player,
      systemId,
      ships: [{ type: 'frigate', hp: 50, maxHp: 50, attack: 15, defense: 10, speed: 2 }],
      movesRemaining: 2,
      hasColonyShip: false,
      destinationSystemId: null,
      travelPath: [],
      travelTurns: 0,
      stance: 'passive',
      autoExplore: false,
    });

    const fleetA = game.fleets.find(f => f.empireId === player && f.ships.some(s => s.type === 'scout'))!;
    const fleetB = game.fleets.find(f => f.empireId === player && f.ships.some(s => s.type === 'frigate'))!;
    const totalShips = fleetA.ships.length + fleetB.ships.length;

    expect(mergeFleets(game, fleetA.id, fleetB.id)).toBe(true);
    expect(game.fleets.find(f => f.id === fleetB.id)).toBeUndefined();
    expect(game.fleets.find(f => f.id === fleetA.id)!.ships.length).toBe(totalShips);
  });

  it('splits fleet into two', () => {
    const game = cloneState(createNewGame(42));
    const fleet = game.fleets.find(f => f.empireId === game.playerEmpireId && !f.hasColonyShip)!;
    while (fleet.ships.length < 3) {
      fleet.ships.push({ ...fleet.ships[0] });
    }

    const countBefore = game.fleets.length;
    expect(splitFleet(game, fleet.id, 2)).toBe(true);
    expect(game.fleets.length).toBe(countBefore + 1);
    expect(fleet.ships.length).toBe(1);
  });
});

describe('Victory Progress', () => {
  it('returns progress for all victory types', () => {
    const game = createNewGame(42);
    const progress = getVictoryProgress(game);
    expect(progress.domination).toBeGreaterThanOrEqual(0);
    expect(progress.domination).toBeLessThanOrEqual(1);
    expect(progress.science).toBeGreaterThanOrEqual(0);
    expect(progress.influence).toBeGreaterThanOrEqual(0);
    expect(progress.survival).toBeGreaterThanOrEqual(0);
  });

  it('tracks influence victory progress', () => {
    const game = cloneState(createNewGame(42));
    const player = game.empires.find(e => e.isPlayer)!;
    player.influence = 80;
    player.influenceVictoryTurns = 3;
    const progress = getVictoryProgress(game);
    expect(progress.influence).toBe(1);
  });
});

describe('Planet Capture', () => {
  it('captures planet when no defending fleet', () => {
    const game = cloneState(createNewGame(42));
    const player = game.empires.find(e => e.isPlayer)!;
    const ai = game.empires.find(e => !e.isPlayer)!;

    const aiSystem = game.systems.find(s => s.planets.some(p => p.ownerId === ai.id))!;
    const aiPlanet = aiSystem.planets.find(p => p.ownerId === ai.id)!;

    game.fleets = game.fleets.filter(f => f.empireId !== ai.id || f.systemId !== aiSystem.id);

    expect(hasDefendingFleet(game, aiSystem.id, ai.id)).toBe(false);
    expect(tryCapturePlanet(game, aiSystem.id, player.id, ai.id)).toBe(true);
    expect(aiPlanet.ownerId).toBe(player.id);
  });

  it('does not capture when defending fleet present', () => {
    const game = cloneState(createNewGame(42));
    const player = game.empires.find(e => e.isPlayer)!;
    const ai = game.empires.find(e => !e.isPlayer)!;

    const aiSystem = game.systems.find(s => s.planets.some(p => p.ownerId === ai.id))!;
    expect(hasDefendingFleet(game, aiSystem.id, ai.id)).toBe(true);
    expect(tryCapturePlanet(game, aiSystem.id, player.id, ai.id)).toBe(false);
  });
});

describe('Empire Scoring', () => {
  it('calculates empire score', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const score = calculateEmpireScore(game, player.id);
    expect(score).toBeGreaterThan(0);
  });
});
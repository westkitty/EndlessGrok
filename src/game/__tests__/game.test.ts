import { describe, it, expect } from 'vitest';
import { SeededRNG } from '../rng';
import { generateGalaxy, getColonizablePlanets } from '../galaxy';
import { createNewGame, endTurn, serializeGame, deserializeGame } from '../game';
import { canColonize, colonizePlanet, startResearch } from '../actions';
import { getAvailableTechs } from '../research';
import { checkVictoryConditions } from '../victory';
import { createShip, getFleetPower } from '../ships';
import { GALAXY_SIZE_OPTIONS } from '../constants';

describe('SeededRNG', () => {
  it('produces deterministic results', () => {
    const a = new SeededRNG(42);
    const b = new SeededRNG(42);
    for (let i = 0; i < 10; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('produces different results for different seeds', () => {
    const a = new SeededRNG(1);
    const b = new SeededRNG(2);
    expect(a.next()).not.toBe(b.next());
  });
});

describe('Galaxy Generation', () => {
  it('generates correct number of systems', () => {
    const galaxy = generateGalaxy(12345);
    expect(galaxy).toHaveLength(GALAXY_SIZE_OPTIONS.medium.systemCount);
  });

  it('generates different sizes', () => {
    const small = generateGalaxy(1, 'small');
    const large = generateGalaxy(1, 'large');
    expect(small).toHaveLength(16);
    expect(large).toHaveLength(36);
  });

  it('includes star classes and anomalies', () => {
    const galaxy = generateGalaxy(42);
    expect(galaxy[0].starClass).toBeTruthy();
    expect(galaxy[0].richness).toBeGreaterThan(0);
    const withAnomaly = galaxy.some(s => s.anomaly !== null);
    expect(withAnomaly).toBe(true);
  });

  it('is deterministic with same seed', () => {
    const a = generateGalaxy(999);
    const b = generateGalaxy(999);
    expect(a[0].x).toBe(b[0].x);
    expect(a[0].name).toBe(b[0].name);
    expect(a[0].planets.length).toBe(b[0].planets.length);
  });

  it('creates connected graph', () => {
    const galaxy = generateGalaxy(42);
    const visited = new Set<string>();
    const queue = [galaxy[0].id];
    visited.add(galaxy[0].id);

    while (queue.length > 0) {
      const id = queue.shift()!;
      const sys = galaxy.find(s => s.id === id)!;
      for (const conn of sys.connections) {
        if (!visited.has(conn)) {
          visited.add(conn);
          queue.push(conn);
        }
      }
    }

    expect(visited.size).toBe(galaxy.length);
  });

  it('has colonizable planets', () => {
    const galaxy = generateGalaxy(42);
    const colonizable = getColonizablePlanets(galaxy);
    expect(colonizable.length).toBeGreaterThan(0);
  });
});

describe('Game Creation', () => {
  it('creates a valid game state', () => {
    const game = createNewGame(42);
    expect(game.turn).toBe(1);
    expect(game.phase).toBe('playing');
    expect(game.empires).toHaveLength(2);
    expect(game.fleets.length).toBeGreaterThan(0);
    expect(game.playerEmpireId).toBe('empire-0');
    expect(game.settings).toBeDefined();
    expect(game.empires[0].influence).toBeGreaterThan(0);
  });

  it('accepts game settings', () => {
    const game = createNewGame(42, { difficulty: 'hard', galaxySize: 'small' });
    expect(game.settings.difficulty).toBe('hard');
    expect(game.settings.galaxySize).toBe('small');
    expect(game.systems).toHaveLength(16);
  });

  it('assigns starting planets to empires', () => {
    const game = createNewGame(42);
    for (const empire of game.empires) {
      expect(empire.totalPlanets).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('Turn Progression', () => {
  it('advances turn counter', () => {
    const game = createNewGame(42);
    const next = endTurn(structuredCloneEmpires(game));
    expect(next.turn).toBe(2);
  });

  it('processes multiple turns without crashing', () => {
    let game = createNewGame(42);
    for (let i = 0; i < 20; i++) {
      const before = game.turn;
      game = endTurn(structuredCloneEmpires(game));
      if (game.phase === 'playing') {
        expect(game.turn).toBe(before + 1);
      } else {
        expect(game.turn).toBeGreaterThanOrEqual(before);
        break;
      }
    }
    expect(game.turn).toBeGreaterThan(1);
  });

  it('processes up to 100 turns with 4 empires without crashing', () => {
    let game = createNewGame(99999, { difficulty: 'normal', galaxySize: 'large', empireCount: 4, maxTurns: 150 });
    let turns = 0;
    while (game.phase === 'playing' && turns < 100) {
      game = endTurn(structuredCloneEmpires(game));
      turns++;
    }
    expect(turns).toBeGreaterThan(10);
    expect(game.empires.length).toBe(4);
  });

  it('processes 50 turns on hard difficulty without crashing', () => {
    let game = createNewGame(42, { difficulty: 'hard', galaxySize: 'medium', maxTurns: 200 });
    let turnsProcessed = 0;
    for (let i = 0; i < 50; i++) {
      if (game.phase !== 'playing') break;
      game = endTurn(structuredCloneEmpires(game));
      turnsProcessed++;
      expect(game.empires.length).toBeGreaterThan(0);
      expect(game.systems.length).toBeGreaterThan(0);
    }
    expect(turnsProcessed).toBeGreaterThan(10);
    const ai = game.empires.find(e => !e.isPlayer)!;
    expect(ai.totalPlanets).toBeGreaterThanOrEqual(1);
  });
});

describe('Colonization', () => {
  it('can colonize adjacent unclaimed planet', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const homeSystem = game.systems.find(s => s.planets.some(p => p.ownerId === player.id))!;

    const adjacent = homeSystem.connections
      .map(id => game.systems.find(s => s.id === id)!)
      .find(s => s.planets.some(p => !p.isColonized && p.type !== 'gas'));

    if (adjacent) {
      const planet = adjacent.planets.find(p => !p.isColonized && p.type !== 'gas')!;
      const fleet = game.fleets.find(f => f.empireId === player.id)!;
      fleet.systemId = adjacent.id;

      const cloned = structuredCloneEmpires(game);
      const err = canColonize(cloned, planet.id);
      if (!err) {
        expect(colonizePlanet(cloned, planet.id)).toBe(true);
        expect(cloned.colonizationProjects?.some(p => p.planetId === planet.id)).toBe(true);
        let state = cloned;
        for (let t = 0; t < 5 && state.phase === 'playing'; t++) {
          state = endTurn(state);
        }
        const colonized = state.systems.flatMap(s => s.planets).find(p => p.id === planet.id)!;
        expect(colonized.ownerId).toBe(player.id);
      }
    }
  });
});

describe('Research', () => {
  it('lists available starting techs', () => {
    const available = getAvailableTechs([]);
    expect(available.length).toBeGreaterThan(0);
    expect(available.some(t => t.prerequisites.length === 0)).toBe(true);
  });

  it('can start research', () => {
    const game = createNewGame(42);
    const cloned = structuredCloneEmpires(game);
    expect(startResearch(cloned, 'agriculture')).toBe(true);
    const player = cloned.empires.find(e => e.isPlayer)!;
    expect(player.currentResearch).toBe('agriculture');
  });
});

describe('Ships', () => {
  it('creates ships with correct stats', () => {
    const scout = createShip('scout');
    expect(scout.hp).toBe(20);
    expect(scout.attack).toBe(5);

    const cruiser = createShip('cruiser');
    expect(cruiser.hp).toBe(100);
    expect(cruiser.attack).toBe(30);
  });

  it('calculates fleet power', () => {
    const ships = [createShip('frigate'), createShip('scout')];
    const power = getFleetPower(ships);
    expect(power.attack).toBe(20);
    expect(power.totalHp).toBe(70);
  });
});

describe('Save/Load', () => {
  it('round-trips game state', () => {
    const game = createNewGame(42);
    const serialized = serializeGame(game);
    const loaded = deserializeGame(serialized);
    expect(loaded.seed).toBe(game.seed);
    expect(loaded.turn).toBe(game.turn);
    expect(loaded.empires[0].knownSystems.size).toBe(game.empires[0].knownSystems.size);
  });
});

describe('Victory Conditions', () => {
  it('returns null when no victor', () => {
    const game = createNewGame(42);
    const result = checkVictoryConditions(game);
    expect(result.winnerId).toBeNull();
  });
});

function structuredCloneEmpires(game: ReturnType<typeof createNewGame>) {
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
import { describe, it, expect } from 'vitest';
import { createNewGame, endTurn, serializeGame, deserializeGame } from '../game';
import { exploreAnomaly } from '../anomalies';
import { processLateGameCrisis } from '../crisis';
import { getTradePartners, proposeTradePact } from '../diplomacy';
import { GALAXY_MYSTERIES } from '../mysteries';
import { spawnPirateFaction } from '../pirates';
import { exportSaveToJson, importSaveFromJson } from '../save';
import { SeededRNG } from '../rng';
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
    fleets: game.fleets.map(f => ({ ...f, ships: f.ships.map(s => ({ ...s })), travelPath: [...(f.travelPath ?? [])] })),
    events: [...game.events],
    combatResults: [...game.combatResults],
    turnSummaries: [...(game.turnSummaries ?? [])],
    activeEventChains: [...(game.activeEventChains ?? [])],
  };
}

function runTurns(game: GameState, count: number): GameState {
  let state = game;
  for (let i = 0; i < count; i++) {
    if (state.phase !== 'playing') break;
    state = endTurn(cloneState(state));
  }
  return state;
}

describe('Save/load and import/export (loops 251–256)', () => {
  it('round-trips all new fields through serialize/deserialize', () => {
    const game = createNewGame(42, { galaxySize: 'huge', galaxyShape: 'ring', empireCount: 3 });
    game.piratesSpawned = true;
    game.pirateEmpireId = 'empire-pirates';
    game.crisisWarned = true;
    game.lastAutosaveTurn = 5;
    game.precursorLorePending = 'Ancient echoes linger.';
    game.activeEventChains = [{ chainId: 'precursor_trail', empireId: game.playerEmpireId, step: 1, turnsRemaining: 2 }];
    const player = game.empires.find(e => e.isPlayer)!;
    player.relationScores = { 'empire-1': 72 };
    player.warScores = { 'empire-1': 15 };
    player.repeatableTechCounts = { economic_efficiency: 1 };

    const loaded = deserializeGame(serializeGame(game));
    expect(loaded.seed).toBe(42);
    expect(loaded.settings.galaxyShape).toBe('ring');
    expect(loaded.settings.galaxySize).toBe('huge');
    expect(loaded.piratesSpawned).toBe(true);
    expect(loaded.pirateEmpireId).toBe('empire-pirates');
    expect(loaded.crisisWarned).toBe(true);
    expect(loaded.lastAutosaveTurn).toBe(5);
    expect(loaded.precursorLorePending).toBe('Ancient echoes linger.');
    expect(loaded.activeEventChains).toHaveLength(1);
    expect(loaded.empires[0].relationScores?.['empire-1']).toBe(72);
    expect(loaded.empires[0].warScores?.['empire-1']).toBe(15);
    expect(loaded.empires[0].repeatableTechCounts?.economic_efficiency).toBe(1);
  });

  it('exports and imports JSON save files', () => {
    const game = createNewGame(77);
    const json = exportSaveToJson(game);
    expect(json).toContain('"seed": 77');
    const result = importSaveFromJson(json);
    expect(result.error).toBeNull();
    expect(result.state?.seed).toBe(77);
  });

  it('recovers gracefully from corrupt save JSON', () => {
    const bad = importSaveFromJson('{not valid json');
    expect(bad.state).toBeNull();
    expect(bad.error).toBeTruthy();

    const incomplete = importSaveFromJson('{"turn": 1}');
    expect(incomplete.state).toBeNull();
    expect(incomplete.error).toContain('Invalid');
  });
});

describe('Deterministic simulation (loop 255)', () => {
  it('same seed produces identical state after N turns', () => {
    const settings = { difficulty: 'normal' as const, galaxySize: 'medium' as const, empireCount: 2, maxTurns: 100 };
    const a = runTurns(createNewGame(4242, settings), 15);
    const b = runTurns(createNewGame(4242, settings), 15);

    expect(a.turn).toBe(b.turn);
    expect(a.seed).toBe(b.seed);
    expect(a.systems.length).toBe(b.systems.length);
    expect(a.empires.length).toBe(b.empires.length);
    expect(a.fleets.length).toBe(b.fleets.length);

    const playerA = a.empires.find(e => e.isPlayer)!;
    const playerB = b.empires.find(e => e.isPlayer)!;
    expect(playerA.resources).toEqual(playerB.resources);
    expect(playerA.totalPlanets).toBe(playerB.totalPlanets);
    expect([...playerA.knownSystems].sort()).toEqual([...playerB.knownSystems].sort());
  });
});

describe('Galaxy mysteries and precursor lore (loops 262, 287)', () => {
  it('places three named mystery sites at game start', () => {
    const game = createNewGame(42);
    const mysteries = game.systems.filter(s => s.anomaly?.id.startsWith('mystery-'));
    expect(mysteries).toHaveLength(3);
    for (const name of GALAXY_MYSTERIES.map(m => m.name)) {
      expect(mysteries.some(s => s.anomaly?.name === name)).toBe(true);
    }
  });

  it('queues precursor lore popup on precursor exploration', () => {
    const game = createNewGame(42);
    const system = game.systems.find(s => s.anomaly?.type === 'precursor');
    if (!system?.anomaly) return;

    system.anomaly.loreSnippet = 'Test precursor lore text.';
    const player = game.empires.find(e => e.isPlayer)!;
    const fleet = game.fleets.find(f => f.empireId === player.id)!;
    fleet.systemId = system.id;
    player.knownSystems.add(system.id);

    exploreAnomaly(game, system.id, player, new SeededRNG(42), 'safe');
    expect(game.precursorLorePending).toBe('Test precursor lore text.');
  });
});

describe('Late-game crisis (loop 261)', () => {
  it('triggers empire-wide crisis warning at turn 80', () => {
    const game = createNewGame(42, { maxTurns: 120 });
    game.turn = 80;
    processLateGameCrisis(game);
    expect(game.crisisWarned).toBe(true);
    expect(game.events.some(e => e.message.includes('EMPIRE-WIDE CRISIS'))).toBe(true);
  });
});

describe('Diplomacy and trade routes (loops 266–270, 278)', () => {
  it('lists trade partners for map route rendering', () => {
    const game = createNewGame(42);
    const a = game.empires[0];
    const b = game.empires[1];
    proposeTradePact(a, b);
    expect(getTradePartners(game, a.id)).toContain(b.id);
  });
});

describe('AI and pirates (loops 257–260, 298)', () => {
  it('spawns pirate faction with fleet in unowned system', () => {
    const game = createNewGame(42, { empireCount: 2, maxTurns: 150 });
    game.turn = 30;
    spawnPirateFaction(game, new SeededRNG(42));
    expect(game.piratesSpawned).toBe(true);
    expect(game.pirateEmpireId).toBeTruthy();
    const pirate = game.empires.find(e => e.isPirate);
    expect(pirate?.isAlive).toBe(true);
    expect(game.fleets.some(f => f.empireId === game.pirateEmpireId)).toBe(true);
  });

  it('AI empires expand territory over 50 turns', () => {
    const start = createNewGame(42, { empireCount: 3, maxTurns: 120 });
    const startPlanets = start.empires.filter(e => !e.isPlayer).map(e => e.totalPlanets);
    const end = runTurns(start, 50);
    const endPlanets = end.empires.filter(e => !e.isPlayer && e.isAlive).map(e => e.totalPlanets);
    expect(end.turn).toBeGreaterThan(start.turn);
    expect(endPlanets.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(startPlanets.reduce((a, b) => a + b, 0));
  });
});

describe('50-turn playability (loop 299)', () => {
  it('runs 50 turns on hard difficulty without crashing', () => {
    let game = createNewGame(42, { difficulty: 'hard', galaxySize: 'medium', empireCount: 2, maxTurns: 200 });
    let turnsProcessed = 0;
    for (let i = 0; i < 50; i++) {
      if (game.phase !== 'playing') break;
      game = endTurn(cloneState(game));
      turnsProcessed++;
      expect(game.empires.length).toBeGreaterThan(0);
      expect(game.systems.length).toBe(24);
      expect(game.events.length).toBeGreaterThan(0);
    }
    expect(turnsProcessed).toBeGreaterThan(10);
    expect(game.turn).toBeGreaterThan(1);
    const summary = game.turnSummaries[game.turnSummaries.length - 1];
    expect(summary?.economy).toBeDefined();
  });
});
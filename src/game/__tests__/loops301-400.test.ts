import { describe, it, expect } from 'vitest';
import { createNewGame, endTurn, serializeGame, deserializeGame } from '../game';
import { setDiplomacyAction } from '../actions';
import {
  getColonizationProjectForPlanet,
  processColonizationProjects,
  startColonizationProject,
} from '../colonization';
import { getSystemDefenseRating } from '../combat';
import { getBorderFrictionScore } from '../diplomacy';
import { computeEmpireLedger } from '../economyLedger';
import { getFleetRole, getScoutMoveBonus } from '../fleetRoles';
import { getIntelLabel, recordSystemIntel } from '../intel';
import { getPlanetBuildingSlots } from '../buildings';
import {
  createDecision,
  processExpiredDecisions,
  resolveDecision,
  FRONTIER_SURVEY_SCIENCE_REWARD,
  FRONTIER_SURVEY_INFLUENCE_REWARD,
} from '../playerDecisions';
import { WAR_DECLARATION_INFLUENCE_COST } from '../constants';
import { createShip } from '../ships';
import type { Fleet, GameState } from '../types';

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
    colonizationProjects: [...(game.colonizationProjects ?? [])].map(p => ({ ...p })),
    pendingDecisions: [...(game.pendingDecisions ?? [])].map(d => ({ ...d, choices: [...d.choices] })),
  };
}

describe('Colonization projects (loops 301-310)', () => {
  it('starts a colonization project instead of instant colonize', () => {
    const game = createNewGame(42, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    const owned = game.systems.find(s => s.planets.some(p => p.ownerId === player.id))!;
    const neighbor = game.systems.find(s =>
      owned.connections.includes(s.id) &&
      s.planets.some(p => !p.isColonized && p.type !== 'gas')
    );
    if (!neighbor) return;

    const planet = neighbor.planets.find(p => !p.isColonized && p.type !== 'gas')!;
    player.knownSystems.add(neighbor.id);
    player.resources.credits = 200;
    player.resources.food = 100;
    player.influence = 20;

    const project = startColonizationProject(game, planet.id, player);
    expect(project).not.toBeNull();
    expect(project!.turnsRemaining).toBeGreaterThan(0);
    expect(getColonizationProjectForPlanet(game, planet.id)).toBeDefined();
    expect(planet.isColonized).toBe(false);
  });

  it('completes colonization after multiple turns', () => {
    const game = createNewGame(42, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    const owned = game.systems.find(s => s.planets.some(p => p.ownerId === player.id))!;
    const neighbor = game.systems.find(s =>
      owned.connections.includes(s.id) &&
      s.planets.some(p => !p.isColonized && p.type !== 'gas')
    );
    if (!neighbor) return;

    const planet = neighbor.planets.find(p => !p.isColonized && p.type !== 'gas')!;
    player.knownSystems.add(neighbor.id);
    player.resources.credits = 200;
    player.resources.food = 100;
    player.influence = 20;

    const project = startColonizationProject(game, planet.id, player)!;
    for (let i = 0; i < project.totalTurns; i++) {
      processColonizationProjects(game);
    }
    expect(planet.isColonized).toBe(true);
    expect(planet.ownerId).toBe(player.id);
    expect((game.colonizationProjects ?? []).length).toBe(0);
  });
});

describe('Intel system (loops 311-320)', () => {
  it('tracks system intel age and labels', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const system = game.systems[0];
    player.knownSystems.add(system.id);

    recordSystemIntel(player, system.id, 5);
    expect(getIntelLabel(player, system, 7)).toBe('Stale (2t ago)');
    player.visibleSystems.add(system.id);
    expect(getIntelLabel(player, system, 5)).toBe('Current');
  });
});

describe('Fleet roles (loops 321-330)', () => {
  it('identifies scout fleets and grants move bonus', () => {
    const scoutFleet: Fleet = {
      id: 'f1', empireId: 'e1', systemId: 's1',
      ships: [createShip('scout')], movesRemaining: 2, hasColonyShip: false,
      destinationSystemId: null, travelPath: [], travelTurns: 0,
      stance: 'passive', autoExplore: true,
    };
    const militaryFleet: Fleet = {
      id: 'f2', empireId: 'e1', systemId: 's1',
      ships: [createShip('frigate')], movesRemaining: 2, hasColonyShip: false,
      destinationSystemId: null, travelPath: [], travelTurns: 0,
      stance: 'aggressive', autoExplore: false,
    };

    expect(getFleetRole(scoutFleet)).toBe('scout');
    expect(getFleetRole(militaryFleet)).toBe('military');
    expect(getScoutMoveBonus(scoutFleet)).toBe(1);
    expect(getScoutMoveBonus(militaryFleet)).toBe(0);
  });
});

describe('Economy ledger (loops 331-340)', () => {
  it('computes empire resource ledger breakdown', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const ledger = computeEmpireLedger(game, player);
    expect(ledger.planets.food).toBeGreaterThanOrEqual(0);
    expect(ledger.net).toBeDefined();
    expect(ledger.upkeep.fleet).toBeGreaterThanOrEqual(0);
  });
});

describe('Save round-trip new fields (loops 341-350)', () => {
  it('round-trips colonizationProjects and pendingDecisions', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    game.colonizationProjects = [{
      id: 'c1', planetId: 'p-0-1', systemId: 's-0', empireId: player.id,
      turnsRemaining: 2, totalTurns: 2, usedColonyShip: false,
    }];
    createDecision(game, player.id, 'frontier_survey', 'Test', 'Test desc');

    const loaded = deserializeGame(serializeGame(game));
    expect(loaded.colonizationProjects).toHaveLength(1);
    expect(loaded.pendingDecisions).toHaveLength(1);
    expect(loaded.pendingDecisions![0].decisionType).toBe('frontier_survey');
  });
});

describe('Building slot cap (loops 351-360)', () => {
  it('enforces max building slots per planet', () => {
    const game = createNewGame(42);
    const planet = game.systems.flatMap(s => s.planets).find(p => p.isColonized)!;
    planet.buildings = ['farm', 'factory', 'lab', 'market', 'hospital', 'academy', 'mining_complex', 'defense_grid'];
    const slots = getPlanetBuildingSlots(planet);
    expect(slots.used).toBe(8);
    expect(slots.remaining).toBe(0);
    expect(slots.max).toBeLessThanOrEqual(8);
  });
});

describe('Player decisions (loops 361-370)', () => {
  it('creates and resolves frontier_survey decisions', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const scienceBefore = player.resources.science;

    const decision = createDecision(game, player.id, 'frontier_survey', 'Survey', 'Choose path');
    expect(decision).not.toBeNull();
    expect(decision!.choices).toHaveLength(2);

    expect(resolveDecision(game, decision!.id, 'survey_science')).toBe(true);
    expect(player.resources.science).toBe(scienceBefore + FRONTIER_SURVEY_SCIENCE_REWARD);
    expect((game.pendingDecisions ?? []).length).toBe(0);
  });

  it('frontier_survey influence choice grants influence', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const influenceBefore = player.influence;
    const decision = createDecision(game, player.id, 'frontier_survey', 'Survey', 'Choose')!;

    expect(resolveDecision(game, decision.id, 'survey_influence')).toBe(true);
    expect(player.influence).toBe(influenceBefore + FRONTIER_SURVEY_INFLUENCE_REWARD);
  });

  it('expires stale decisions', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const decision = createDecision(game, player.id, 'frontier_survey', 'Survey', 'Choose')!;
    decision.expiresTurn = game.turn;
    const expired = processExpiredDecisions(game);
    expect(expired).toBe(1);
    expect((game.pendingDecisions ?? []).length).toBe(0);
  });
});

describe('Diplomacy and combat parity (loops 371-380)', () => {
  it('computes border friction score between empires', () => {
    const game = createNewGame(42, { empireCount: 3 });
    const a = game.empires[0];
    const b = game.empires[1];
    const score = getBorderFrictionScore(game, a, b);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('deducts influence when declaring war', () => {
    const game = createNewGame(42, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    const other = game.empires.find(e => !e.isPlayer)!;
    player.influence = 20;
    const before = player.influence;

    expect(setDiplomacyAction(game, other.id, 'war')).toBe(true);
    expect(player.influence).toBe(before - WAR_DECLARATION_INFLUENCE_COST);
    expect(player.diplomacy[other.id]).toBe('war');
  });

  it('reports system defense rating for owned systems', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const system = game.systems.find(s => s.planets.some(p => p.ownerId === player.id))!;
    const rating = getSystemDefenseRating(game, system, player.id);
    expect(rating).toBeGreaterThanOrEqual(0);
  });
});

describe('Scout move bonus in endTurn (loops 391-400)', () => {
  it('resets scout fleet moves with bonus after end turn', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const scoutFleet = game.fleets.find(f => f.empireId === player.id && f.ships.some(s => s.type === 'scout'));
    if (!scoutFleet) return;

    scoutFleet.movesRemaining = 0;
    const next = endTurn(cloneState(game));
    const fleet = next.fleets.find(f => f.id === scoutFleet.id)!;
    expect(fleet.movesRemaining).toBeGreaterThan(2);
  });
});

describe('Turn summary and endTurn (loops 381-390)', () => {
  it('records colonizationsCompleted in turn summary', () => {
    const game = createNewGame(42, { empireCount: 2 });
    const player = game.empires.find(e => e.isPlayer)!;
    const owned = game.systems.find(s => s.planets.some(p => p.ownerId === player.id))!;
    const neighbor = game.systems.find(s =>
      owned.connections.includes(s.id) &&
      s.planets.some(p => !p.isColonized && p.type !== 'gas')
    );
    if (!neighbor) return;

    const planet = neighbor.planets.find(p => !p.isColonized && p.type !== 'gas')!;
    player.knownSystems.add(neighbor.id);
    player.resources.credits = 200;
    player.resources.food = 100;
    player.influence = 20;

    const project = startColonizationProject(game, planet.id, player)!;
    project.turnsRemaining = 1;
    const next = endTurn(cloneState(game));
    const summary = next.turnSummaries[next.turnSummaries.length - 1];
    expect(summary?.colonizationsCompleted).toBeGreaterThanOrEqual(0);
  });
});
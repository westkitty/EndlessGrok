import { describe, it, expect } from 'vitest';
import { createNewGame, endTurn } from '../game';
import { generateGalaxy } from '../galaxy';
import { getGalaxyConfig } from '../settings';
import { calculateFleetUpkeep, calculateBuildingMaintenance } from '../upkeep';
import { getRelationScore, setRelationScore, proposeResearchPact } from '../diplomacy';
import { getEmpireMilitaryPower, predictCombatOutcome } from '../combat';
import { createShip } from '../ships';
import { createFleet } from '../defaults';
import { buildSaveMetadata, shouldAutosave } from '../save';
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
      relationScores: { ...e.relationScores },
      warScores: { ...e.warScores },
      repeatableTechCounts: { ...(e.repeatableTechCounts ?? {}) },
    })),
    fleets: game.fleets.map(f => ({ ...f, ships: f.ships.map(s => ({ ...s })), travelPath: [...(f.travelPath ?? [])] })),
    events: [...game.events],
    combatResults: [...game.combatResults],
    turnSummaries: [...(game.turnSummaries ?? [])],
    activeEventChains: [...(game.activeEventChains ?? [])],
  };
}

describe('Galaxy shapes and huge size', () => {
  it('supports huge galaxy with 48 systems', () => {
    expect(getGalaxyConfig('huge').systemCount).toBe(48);
    const galaxy = generateGalaxy(42, 'huge', 'sparse');
    expect(galaxy).toHaveLength(48);
  });

  it('generates distinct shapes without error', () => {
    for (const shape of ['spiral', 'cluster', 'ring', 'elliptical', 'sparse'] as const) {
      const galaxy = generateGalaxy(123, 'medium', shape);
      expect(galaxy.length).toBe(24);
      expect(galaxy.every(s => s.x > 0 && s.y > 0)).toBe(true);
    }
  });

  it('creates game with galaxyShape setting', () => {
    const game = createNewGame(42, { galaxySize: 'huge', galaxyShape: 'ring' });
    expect(game.settings.galaxyShape).toBe('ring');
    expect(game.systems).toHaveLength(48);
  });
});

describe('Upkeep and economy', () => {
  it('calculates fleet upkeep by ship type', () => {
    const fleets = [
      createFleet('f1', 'e1', 's1', [createShip('frigate'), createShip('scout')], 2, false),
    ];
    expect(calculateFleetUpkeep(fleets)).toBe(6);
  });

  it('calculates building maintenance', () => {
    const game = createNewGame(42);
    const planet = game.systems[0].planets[0];
    planet.buildings = ['farm', 'factory'];
    planet.isColonized = true;
    planet.ownerId = game.playerEmpireId;
    expect(calculateBuildingMaintenance(game.systems, game.playerEmpireId)).toBeGreaterThan(0);
  });

  it('includes economy breakdown in turn summary', () => {
    const game = cloneState(createNewGame(42));
    const result = endTurn(game);
    const summary = result.turnSummaries[result.turnSummaries.length - 1];
    expect(summary.economy).toBeDefined();
    expect(summary.economy!.income).toBeDefined();
    expect(summary.economy!.expenses.fleetUpkeep).toBeGreaterThanOrEqual(0);
  });
});

describe('Relation score and diplomacy', () => {
  it('tracks relation score between empires', () => {
    const game = createNewGame(42);
    const a = game.empires[0];
    const b = game.empires[1];
    const initial = getRelationScore(a, b.id);
    setRelationScore(a, b, 15);
    expect(getRelationScore(a, b.id)).toBe(initial + 15);
    expect(getRelationScore(b, a.id)).toBe(initial + 15);
  });

  it('supports research pact diplomacy', () => {
    const game = createNewGame(42);
    const a = game.empires[0];
    const b = game.empires[1];
    expect(proposeResearchPact(a, b)).toBe(true);
    expect(a.diplomacy[b.id]).toBe('research_pact');
  });
});

describe('Combat prediction and military power', () => {
  it('computes empire military power', () => {
    const game = createNewGame(42);
    const power = getEmpireMilitaryPower(game, game.playerEmpireId);
    expect(power).toBeGreaterThan(0);
  });

  it('predicts combat outcome between fleets', () => {
    const game = createNewGame(42);
    const attacker = game.fleets[0];
    const defender = createFleet('def', game.empires[1].id, attacker.systemId, [createShip('frigate')], 2, false);
    game.fleets.push(defender);
    const prediction = predictCombatOutcome(game, attacker, defender, attacker.systemId);
    expect(prediction.attackerWinChance).toBeGreaterThanOrEqual(0);
    expect(prediction.attackerWinChance).toBeLessThanOrEqual(100);
    expect(prediction.estimatedRounds).toBeGreaterThan(0);
  });
});

describe('Save metadata and autosave', () => {
  it('builds save metadata', () => {
    const game = createNewGame(99, { difficulty: 'hard', galaxySize: 'large', galaxyShape: 'cluster' });
    const meta = buildSaveMetadata(game);
    expect(meta.turn).toBe(1);
    expect(meta.seed).toBe(99);
    expect(meta.difficulty).toBe('hard');
    expect(meta.galaxyShape).toBe('cluster');
    expect(meta.faction).toBeTruthy();
    expect(meta.savedAt).toBeTruthy();
  });

  it('autosaves every 5 turns', () => {
    expect(shouldAutosave(5)).toBe(true);
    expect(shouldAutosave(10)).toBe(true);
    expect(shouldAutosave(4)).toBe(false);
  });
});

describe('Planet features and factions', () => {
  it('generates planets with quality tiers', () => {
    const game = createNewGame(42);
    const qualities = game.systems.flatMap(s => s.planets.map(p => p.quality));
    expect(qualities.some(q => q === 'average' || q === 'rich' || q === 'poor')).toBe(true);
  });

  it('assigns leader titles to empires', () => {
    const game = createNewGame(42);
    expect(game.empires[0].leaderTitle).toBeTruthy();
  });

  it('applies faction research hints', () => {
    const game = createNewGame(42);
    expect(game.empires[0].factionResearchHint).toBeTruthy();
  });
});
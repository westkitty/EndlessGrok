import { describe, it, expect } from 'vitest';
import { createNewGame } from '../game';
import { getFleetPower } from '../ships';
import { resolveCombat } from '../combat';
import { exportSaveToJson, importSaveFromJson } from '../save';
import { SAVE_SCHEMA_VERSION } from '../saveFormat';
import {
  calculateShipDesignCost,
  calculateShipDesignStats,
  createDefaultShipDesigns,
  createShipFromDesign,
  getDefaultDesignForHull,
  updateShipDesignModule,
  validateShipDesign,
  canBuildShipDesign,
  hydrateShipDesign,
} from '../shipDesigns';
import { queueShipDesignProduction } from '../production';
import { SeededRNG } from '../rng';
import type { Fleet, Planet } from '../types';

function makePlanet(): Planet {
  return {
    id: 'p-0-0',
    name: 'Test',
    type: 'terran',
    systemId: 's-0',
    ownerId: 'empire-0',
    population: 5,
    maxPopulation: 10,
    foodOutput: 5,
    industryOutput: 5,
    scienceOutput: 2,
    minerals: 2,
    energy: 1,
    isColonized: true,
    happiness: 60,
    approval: 60,
    buildings: ['spaceport'],
    productionQueue: [],
    rareResource: 'none',
    focus: 'balanced',
    isCapital: true,
  };
}

describe('ship module designer', () => {
  it('combines module stats correctly', () => {
    const designs = createDefaultShipDesigns();
    const frigate = designs.find(d => d.hull === 'frigate')!;
    const upgraded = updateShipDesignModule(frigate, 'weapon', 'autocannon');
    const stats = calculateShipDesignStats(upgraded);
    const base = calculateShipDesignStats(frigate);
    expect(stats.attack).toBeGreaterThan(base.attack);
  });

  it('combines module costs correctly', () => {
    const designs = createDefaultShipDesigns();
    const cruiser = designs.find(d => d.hull === 'cruiser')!;
    const modded = updateShipDesignModule(cruiser, 'defense', 'fortified_hull');
    const cost = calculateShipDesignCost(modded);
    expect(cost.industry).toBeGreaterThan(calculateShipDesignCost(cruiser).industry);
    expect(cost.strategic.titanium).toBeGreaterThanOrEqual(1);
  });

  it('rejects invalid design with locked module', () => {
    const designs = createDefaultShipDesigns();
    const scout = designs.find(d => d.hull === 'scout')!;
    const invalid = updateShipDesignModule(scout, 'weapon', 'heavy_battery');
    expect(validateShipDesign(invalid, ['basic_propulsion'])).toContain('requires');
  });

  it('allows valid design when resources exist', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    const scout = getDefaultDesignForHull(player.shipDesigns!, 'scout')!;
    expect(canBuildShipDesign(scout, player)).toBeNull();
  });

  it('blocks design construction when strategic resources missing', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    player.researchedTechs.push('frigate_design', 'cruiser_design', 'destroyer_design', 'carrier_design', 'dreadnought_design', 'advanced_manufacturing', 'laser_weapons', 'shield_tech', 'singularity_drive');
    const dread = getDefaultDesignForHull(player.shipDesigns!, 'dreadnought')!;
    player.resources = { credits: 5000, food: 500, industry: 5000, science: 500 };
    player.strategicResources = { titanium: 0, antimatter: 0, darkmatter: 0 };
    expect(canBuildShipDesign(dread, player)).toContain('titanium');
  });

  it('persists custom designs through save/load', () => {
    const game = createNewGame(77);
    const player = game.empires.find(e => e.isPlayer)!;
    const custom = {
      ...getDefaultDesignForHull(player.shipDesigns!, 'frigate')!,
      id: 'custom-frigate',
      name: 'Custom Frigate',
      isDefault: false,
    };
    player.shipDesigns!.push(custom);

    const loaded = importSaveFromJson(exportSaveToJson(game)).state!;
    const loadedPlayer = loaded.empires.find(e => e.isPlayer)!;
    expect(loadedPlayer.shipDesigns?.find(d => d.id === 'custom-frigate')).toBeTruthy();
  });

  it('migrates v1 saves to schema v2 with default designs', () => {
    const game = createNewGame(12);
    const json = exportSaveToJson(game);
    const parsed = JSON.parse(json);
    parsed.schemaVersion = 1;
    delete parsed.state.empires[0].shipDesigns;

    const loaded = importSaveFromJson(JSON.stringify(parsed)).state!;
    expect(parsed.schemaVersion).toBe(1);
    const reExported = JSON.parse(exportSaveToJson(loaded));
    expect(reExported.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(loaded.empires[0].shipDesigns?.length).toBeGreaterThan(0);
  });

  it('fleet combat strength reflects design module stats', () => {
    const designs = createDefaultShipDesigns();
    const frigate = designs.find(d => d.hull === 'frigate')!;
    const weak = createShipFromDesign(frigate);
    const strong = createShipFromDesign(updateShipDesignModule(frigate, 'weapon', 'autocannon'));
    const weakPower = getFleetPower([weak]);
    const strongPower = getFleetPower([strong]);
    expect(strongPower.attack).toBeGreaterThan(weakPower.attack);
  });

  it('hydrates legacy ships without designId', () => {
    const designs = createDefaultShipDesigns();
    const legacy = { type: 'scout' as const, hp: 15, maxHp: 20, attack: 5, defense: 3, speed: 3 };
    const hydrated = hydrateShipDesign(legacy, designs);
    expect(hydrated.designId).toBeTruthy();
    expect(hydrated.attack).toBeGreaterThanOrEqual(5);
  });

  it('queues design production with strategic gating', () => {
    const game = createNewGame(42);
    const player = game.empires.find(e => e.isPlayer)!;
    player.researchedTechs.push('frigate_design', 'cruiser_design');
    player.resources = { credits: 500, food: 200, industry: 500, science: 50 };
    player.strategicResources.titanium = 0;
    const planet = makePlanet();
    const cruiser = getDefaultDesignForHull(player.shipDesigns!, 'cruiser')!;
    expect(queueShipDesignProduction(planet, cruiser, player, 's-0', game)).toBeNull();

    player.strategicResources.titanium = 2;
    expect(queueShipDesignProduction(planet, cruiser, player, 's-0', game)).not.toBeNull();
  });
});

describe('combat with module stats', () => {
  it('stronger module-enhanced fleet wins more often', () => {
    const game = createNewGame(42, { empireCount: 2 });
    const designs = createDefaultShipDesigns();
    const frigate = designs.find(d => d.hull === 'frigate')!;

    const weakFleet: Fleet = {
      id: 'f1', empireId: game.playerEmpireId, systemId: 's-0',
      ships: [createShipFromDesign(frigate)], movesRemaining: 1, hasColonyShip: false,
      destinationSystemId: null, travelPath: [], travelTurns: 0, stance: 'aggressive', autoExplore: false,
    };
    const strongFleet: Fleet = {
      id: 'f2', empireId: game.empires[1].id, systemId: 's-0',
      ships: Array.from({ length: 4 }, () => createShipFromDesign(updateShipDesignModule(frigate, 'weapon', 'autocannon'))),
      movesRemaining: 1, hasColonyShip: false,
      destinationSystemId: null, travelPath: [], travelTurns: 0, stance: 'aggressive', autoExplore: false,
    };

    const rng = new SeededRNG(999);
    const result = resolveCombat(game, 's-0', strongFleet, weakFleet, rng);
    expect(result.winnerId).toBe(game.empires[1].id);
    expect(result.attackerLosses + result.defenderLosses).toBeGreaterThan(0);
  });
});
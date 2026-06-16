import {
  EMPIRE_COLORS, EMPIRE_EMBLEMS, EMPIRE_NAMES, EVENT_LOG_MAX,
  STARTING_INFLUENCE,
} from './constants';
import { resetFleetCounter, createFleetId } from './actions';
import { processColonizationProjects, resetColonizationCounter } from './colonization';
import { processExpiredDecisions, resetDecisionCounter } from './playerDecisions';
import { resetAnomalyCounter } from './anomalies';
import { processCombatCaptures } from './capture';
import {
  initRelationScores, processBorderTension, processMutualDefense,
  processResearchPacts, processTradePacts,
} from './diplomacy';
import { processLateGameCrisis } from './crisis';
import { processFleetExploration, processPlayerAutoExplore } from './exploration';
import { placeMysterySites } from './mysteries';
import { applyEconomyToEmpire, countEmpirePlanets } from './economy';
import { generateEmpireDisplayName } from './empireNames';
import { processEventChains, processRandomEvents, trimEventLog } from './events';
import { checkAndResolveBattles } from './combat';
import { generateGalaxy } from './galaxy';
import { applyFactionStartingBonus, applyFactionUniqueTech, FACTION_DEFINITIONS, getFactionIndexForEmpire } from './factions';
import { maybeAIOfferProposal, processDiplomaticProposals, resetProposalCounter } from './diplomaticProposals';
import { runAI } from './ai';
import { getTechnology } from './research';
import { processProductionQueues, resetProductionCounter } from './production';
import { getScoutMoveBonus } from './fleetRoles';
import { createShip } from './ships';
import { SeededRNG } from './rng';
import { updateAllEmpireScores } from './scoring';
import { processSiegeEffects } from './siege';
import { generateTurnSummary } from './turnSummary';
import { processFleetMovement } from './travel';
import { processColonyUnrest } from './unrest';
import { updateVisibility } from './visibility';
import { checkVictoryConditions, getVictoryMessage, updateEconomyVictoryTracking } from './victory';
import { processWarWeariness } from './weariness';
import { applyDifficultyToEmpire, createGameSettings, DEFAULT_SETTINGS } from './settings';
import { migratePlanetFeatures } from './planets';
import { shouldSpawnPirates, spawnPirateFaction } from './pirates';
import {
  applyOverexpansionPenalty,
  applyResourceDeficits,
  applyUpkeep,
  processTradeRoutes,
} from './upkeep';
import { autosaveGame, shouldAutosave } from './save';
import type {
  AIGoal, AIPersonality, EmblemId, Empire, EmpireTrait, Fleet, GameSettings, GameState,
  Planet, PlayerSetup, SerializedEmpire, SerializedGameState, StarSystem, SystemSpecialization,
} from './types';

const DEFAULT_TRAITS: EmpireTrait[] = ['expansionist', 'scientific', 'militarist', 'expansionist'];
const AI_PERSONALITIES: AIPersonality[] = ['aggressive', 'diplomatic', 'isolationist'];
const AI_GOALS: AIGoal[] = ['expand', 'research', 'militarize'];

function createEmpire(
  id: string,
  name: string,
  color: string,
  isPlayer: boolean,
  emblem: EmblemId = 'terran',
  trait: EmpireTrait = 'expansionist',
  leaderTitle?: string
): Empire {
  return {
    id, name, color, emblem, trait, isPlayer, isAlive: true,
    resources: {
      credits: 0,
      food: 0,
      industry: 0,
      science: 0,
    },
    strategicResources: { titanium: 0, antimatter: 0, darkmatter: 0 },
    researchedTechs: ['basic_propulsion'],
    currentResearch: null,
    researchProgress: 0,
    researchQueue: null,
    knownSystems: new Set(),
    visibleSystems: new Set(),
    diplomacy: {},
    totalPlanets: 0,
    influence: STARTING_INFLUENCE,
    influenceVictoryTurns: 0,
    economyVictoryTurns: 0,
    warWeariness: 0,
    capitalSystemId: null,
    score: 0,
    leaderTitle,
    relationScores: {},
    warScores: {},
    repeatableTechCounts: {},
    lastSeenSystems: {},
    factionIndex: undefined,
  };
}

function migratePlanet(planet: Planet): Planet {
  return migratePlanetFeatures({
    ...planet,
    happiness: planet.happiness ?? 50,
    approval: planet.approval ?? 50,
    buildings: planet.buildings ?? [],
    productionQueue: planet.productionQueue ?? [],
    rareResource: planet.rareResource ?? 'none',
    focus: planet.focus ?? 'balanced',
    isCapital: planet.isCapital ?? false,
  });
}

function migrateSystem(system: StarSystem): StarSystem {
  return {
    ...system,
    starClass: system.starClass ?? 'G',
    richness: system.richness ?? 1.0,
    anomaly: system.anomaly ?? null,
    exploredBy: system.exploredBy ?? {},
    systemType: system.systemType ?? 'normal',
    orbitalStationOwnerId: system.orbitalStationOwnerId ?? null,
    siegeBlockaders: system.siegeBlockaders ?? [],
    specialization: system.specialization ?? null,
    planets: system.planets.map(migratePlanet),
  };
}

function migrateFleet(fleet: Fleet): Fleet {
  return {
    ...fleet,
    destinationSystemId: fleet.destinationSystemId ?? null,
    travelPath: fleet.travelPath ?? [],
    travelTurns: fleet.travelTurns ?? 0,
    stance: fleet.stance ?? 'passive',
    autoExplore: fleet.autoExplore ?? false,
    battleCount: fleet.battleCount ?? 0,
    isVeteran: fleet.isVeteran ?? false,
    ships: fleet.ships.map(s => ({
      ...s,
      weaponType: s.weaponType,
      defenseType: s.defenseType,
    })),
  };
}

function migrateEmpire(empire: SerializedEmpire): Empire {
  const emblem = empire.emblem ?? EMPIRE_EMBLEMS[parseInt(empire.id.split('-')[1] ?? '0') % EMPIRE_EMBLEMS.length] as EmblemId;
  return {
    ...empire,
    emblem,
    trait: empire.trait ?? 'expansionist',
    strategicResources: empire.strategicResources ?? { titanium: 0, antimatter: 0, darkmatter: 0 },
    researchQueue: empire.researchQueue ?? null,
    influence: empire.influence ?? STARTING_INFLUENCE,
    influenceVictoryTurns: empire.influenceVictoryTurns ?? 0,
    economyVictoryTurns: empire.economyVictoryTurns ?? 0,
    warWeariness: empire.warWeariness ?? 0,
    capitalSystemId: empire.capitalSystemId ?? null,
    score: empire.score ?? 0,
    leaderTitle: empire.leaderTitle,
    relationScores: empire.relationScores ?? {},
    warScores: empire.warScores ?? {},
    aiPersonality: empire.aiPersonality,
    aiGoal: empire.aiGoal,
    aiGoalTurn: empire.aiGoalTurn,
    repeatableTechCounts: empire.repeatableTechCounts ?? {},
    factionResearchHint: empire.factionResearchHint,
    isPirate: empire.isPirate ?? false,
    lastSeenSystems: empire.lastSeenSystems ?? {},
    factionIndex: empire.factionIndex,
    knownSystems: new Set(empire.knownSystems),
    visibleSystems: new Set(empire.visibleSystems),
  };
}

function assignSystemSpecialization(system: StarSystem, rng: SeededRNG): void {
  const specs: SystemSpecialization[] = ['science', 'industry', 'economy', 'military', 'frontier'];
  if (rng.next() < 0.25) {
    system.specialization = rng.pick(specs);
  }
}

function setupStartingPositions(state: GameState, rng: SeededRNG, playerFactionIndex = 0): void {
  const systems = rng.shuffle([...state.systems]);
  const empires = state.empires;

  for (let i = 0; i < empires.length; i++) {
    const empire = empires[i];
    const system = systems[i];
    const habitablePlanets = system.planets.filter(p => p.type !== 'gas' && system.systemType !== 'black_hole');

    if (habitablePlanets.length > 0) {
      const homeworld = habitablePlanets[0];
      homeworld.isColonized = true;
      homeworld.ownerId = empire.id;
      homeworld.population = 5;
      homeworld.happiness = 70;
      homeworld.approval = 65;
      homeworld.isCapital = true;
      homeworld.foodOutput += 2;
      homeworld.industryOutput += 1;
      homeworld.scienceOutput += 1;
      homeworld.quality = 'rich';
      homeworld.buildings = ['farm', 'spaceport'];
      empire.capitalSystemId = system.id;
    }

    applyDifficultyToEmpire(empire, state.settings.difficulty, empire.isPlayer);

    const factionIndex = empire.isPlayer ? playerFactionIndex : getFactionIndexForEmpire(empire.id);
    empire.factionIndex = factionIndex;
    if (empire.isPlayer) {
      applyFactionStartingBonus(empire, playerFactionIndex);
    }
    applyFactionUniqueTech(empire, factionIndex);

    if (!empire.isPlayer) {
      empire.aiPersonality = AI_PERSONALITIES[i % AI_PERSONALITIES.length];
      empire.aiGoal = AI_GOALS[i % AI_GOALS.length];
      empire.aiGoalTurn = state.turn;
    }

    empire.knownSystems.add(system.id);
    empire.visibleSystems.add(system.id);
    for (const connId of system.connections) {
      empire.knownSystems.add(connId);
    }

    empire.totalPlanets = countEmpirePlanets(empire.id, state.systems);

    state.fleets.push({
      id: createFleetId(),
      empireId: empire.id,
      systemId: system.id,
      ships: [createShip('scout')],
      movesRemaining: 2,
      hasColonyShip: false,
      destinationSystemId: null,
      travelPath: [],
      travelTurns: 0,
      stance: 'passive',
      autoExplore: false,
      battleCount: 0,
      isVeteran: false,
    });

    if (empire.isPlayer) {
      state.fleets.push({
        id: createFleetId(),
        empireId: empire.id,
        systemId: system.id,
        ships: [createShip('colony')],
        movesRemaining: 1,
        hasColonyShip: true,
        destinationSystemId: null,
        travelPath: [],
        travelTurns: 0,
        stance: 'passive',
        autoExplore: false,
        battleCount: 0,
        isVeteran: false,
      });
    }
  }

  for (let i = 0; i < empires.length; i++) {
    for (let j = i + 1; j < empires.length; j++) {
      empires[i].diplomacy[empires[j].id] = 'neutral';
      empires[j].diplomacy[empires[i].id] = 'neutral';
    }
  }
  initRelationScores(state);
}

export function createNewGame(
  seed?: number,
  settings?: Partial<GameSettings>,
  playerSetup?: PlayerSetup,
  playerFactionIndex = 0
): GameState {
  resetFleetCounter();
  resetProductionCounter();
  resetAnomalyCounter();
  resetProposalCounter();
  resetColonizationCounter();
  resetDecisionCounter();

  const gameSettings = createGameSettings(settings);
  const gameSeed = seed ?? Math.floor(Math.random() * 1000000);
  const rng = new SeededRNG(gameSeed);
  const systems = generateGalaxy(gameSeed, gameSettings.galaxySize, gameSettings.galaxyShape);
  placeMysterySites(systems, rng);

  for (const system of systems) {
    assignSystemSpecialization(system, rng);
  }

  const totalEmpires = Math.max(2, Math.min(4, gameSettings.empireCount));
  const aiCount = totalEmpires - 1;

  const faction = FACTION_DEFINITIONS[playerFactionIndex] ?? FACTION_DEFINITIONS[0];
  const playerName = playerSetup?.name ?? faction.name;
  const playerColor = playerSetup?.color ?? EMPIRE_COLORS[0];
  const playerEmblem = playerSetup?.emblem ?? 'terran';
  const playerTrait = playerSetup?.trait ?? 'expansionist';
  const playerNaming = generateEmpireDisplayName(playerName, rng);

  const playerEmpire = createEmpire(
    'empire-0', playerNaming.name, playerColor, true, playerEmblem, playerTrait, playerNaming.leaderTitle
  );
  playerEmpire.factionResearchHint = faction.researchHint;
  const empires: Empire[] = [playerEmpire];

  for (let i = 0; i < aiCount; i++) {
    const idx = i + 1;
    const baseName = EMPIRE_NAMES[idx % EMPIRE_NAMES.length];
    const naming = generateEmpireDisplayName(baseName, rng);
    const aiEmpire = createEmpire(
      `empire-${idx}`,
      naming.name,
      EMPIRE_COLORS[idx % EMPIRE_COLORS.length],
      false,
      EMPIRE_EMBLEMS[idx % EMPIRE_EMBLEMS.length] as EmblemId,
      DEFAULT_TRAITS[idx % DEFAULT_TRAITS.length],
      naming.leaderTitle
    );
    aiEmpire.factionResearchHint = FACTION_DEFINITIONS[idx]?.researchHint;
    empires.push(aiEmpire);
  }

  const state: GameState = {
    seed: gameSeed,
    turn: 1,
    maxTurns: gameSettings.maxTurns,
    phase: 'playing',
    victoryType: null,
    winnerId: null,
    systems,
    empires,
    fleets: [],
    playerEmpireId: playerEmpire.id,
    selectedSystemId: null,
    selectedFleetId: null,
    events: [{ turn: 1, type: 'explore', message: 'Game started. Explore the galaxy!' }],
    combatResults: [],
    turnSummaries: [],
    settings: gameSettings,
    piratesSpawned: false,
    pirateEmpireId: null,
    activeEventChains: [],
    crisisWarned: false,
    lastAutosaveTurn: 0,
    precursorLorePending: null,
    diplomaticProposals: [],
    colonizationProjects: [],
    pendingDecisions: [],
  };

  setupStartingPositions(state, rng, playerFactionIndex);

  for (const empire of state.empires) {
    updateVisibility(empire, systems, state.fleets, state);
  }
  updateAllEmpireScores(state);

  return state;
}

function processResearch(state: GameState): void {
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;

    const hasSecondSlot = empire.researchedTechs.includes('advanced_manufacturing');

    if (!empire.currentResearch && empire.researchQueue && hasSecondSlot) {
      empire.currentResearch = empire.researchQueue;
      empire.researchQueue = null;
      empire.researchProgress = 0;
    }

    if (!empire.currentResearch) continue;

    const tech = getTechnology(empire.currentResearch);
    if (!tech) continue;

    empire.researchProgress += empire.resources.science;
    empire.resources.science = 0;

    if (empire.researchProgress >= tech.cost) {
      if (tech.repeatable) {
        empire.repeatableTechCounts = empire.repeatableTechCounts ?? {};
        empire.repeatableTechCounts[tech.id] = (empire.repeatableTechCounts[tech.id] ?? 0) + 1;
      } else {
        empire.researchedTechs.push(tech.id);
      }
      empire.currentResearch = null;
      empire.researchProgress = 0;
      state.events.push({
        turn: state.turn,
        type: 'research',
        message: `${empire.name} researched ${tech.name}`,
      });

      if (empire.researchQueue && hasSecondSlot) {
        empire.currentResearch = empire.researchQueue;
        empire.researchQueue = null;
        empire.researchProgress = 0;
      }
    }
  }
}

function processFleetDestinations(state: GameState): void {
  for (const fleet of state.fleets) {
    if (!fleet.destinationSystemId) continue;
    processFleetMovement(fleet, state.systems);

    const empire = state.empires.find(e => e.id === fleet.empireId);
    if (empire) {
      empire.knownSystems.add(fleet.systemId);
      empire.visibleSystems.add(fleet.systemId);
    }
  }
}

function processAggressiveFleets(state: GameState): void {
  for (const fleet of state.fleets) {
    if (fleet.stance !== 'aggressive' || fleet.movesRemaining <= 0) continue;
    if (!fleet.ships.some(s => s.attack > 0)) continue;

    const empire = state.empires.find(e => e.id === fleet.empireId);
    if (!empire) continue;

    const current = state.systems.find(s => s.id === fleet.systemId)!;
    for (const connId of current.connections) {
      const enemyFleet = state.fleets.find(f =>
        f.systemId === connId &&
        f.empireId !== fleet.empireId &&
        f.ships.some(s => s.attack > 0)
      );
      if (enemyFleet) {
        const enemy = state.empires.find(e => e.id === enemyFleet.empireId);
        if (enemy && (empire.diplomacy[enemy.id] === 'war' || empire.diplomacy[enemy.id] === 'hostile' || enemy.isPirate)) {
          fleet.systemId = connId;
          fleet.movesRemaining--;
          break;
        }
      }
    }
  }
}

function resetFleetMoves(state: GameState): void {
  for (const fleet of state.fleets) {
    const empire = state.empires.find(e => e.id === fleet.empireId);
    const baseMoves = empire && fleet.ships.some(s => s.type === 'scout') ? 3 : 2;
    const scoutBonus = getScoutMoveBonus(fleet);
    fleet.movesRemaining = fleet.hasColonyShip ? 1 : baseMoves + scoutBonus;
  }
}

export function endTurn(state: GameState): GameState {
  if (state.phase !== 'playing') return state;

  const rng = new SeededRNG(state.seed + state.turn * 7919);
  const player = state.empires.find(e => e.id === state.playerEmpireId)!;
  const prevInfluence = player.influence;
  const prevResources = { ...player.resources };
  const combatCountBefore = state.combatResults.length;
  const researchCountBefore = player.researchedTechs.length;

  let playerIncome = { credits: 0, food: 0, industry: 0, science: 0 };
  let playerUpkeep = { fleetUpkeep: 0, maintenance: 0 };
  const empireCreditIncome: Record<string, number> = {};

  // 1. Economy
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;
    const income = applyEconomyToEmpire(empire, state.systems, state.settings);
    empireCreditIncome[empire.id] = income.credits;
    if (empire.id === player.id) playerIncome = income;
    empire.totalPlanets = countEmpirePlanets(empire.id, state.systems);
    applyOverexpansionPenalty(empire, state.systems);
  }

  // 2. Trade pacts & trade routes
  processTradePacts(state);
  processTradeRoutes(state);
  processResearchPacts(state);

  // 3. Upkeep & maintenance
  for (const empire of state.empires) {
    if (!empire.isAlive) continue;
    const upkeep = applyUpkeep(empire, state.systems, state.fleets);
    if (empire.id === player.id) {
      playerUpkeep = { fleetUpkeep: upkeep.fleetUpkeep, maintenance: upkeep.maintenance };
    }
    applyResourceDeficits(empire, state.systems, state.events, state.turn);
  }

  // 3b. Colonization projects
  const colonizationsCompleted = processColonizationProjects(state);

  // 4. Production queues
  processProductionQueues(state);

  // 5. Research
  processResearch(state);

  // 6. Siege effects
  processSiegeEffects(state);

  // 7. War weariness
  processWarWeariness(state);

  // 8. Colony unrest
  processColonyUnrest(state, rng);

  // 9. Event chains
  processEventChains(state);

  // 10. Random events
  processRandomEvents(state, rng);

  // 10a. Expired player decisions
  processExpiredDecisions(state);

  // 10b. Late-game crisis
  processLateGameCrisis(state);

  // 11. Pirate spawn
  if (shouldSpawnPirates(state)) {
    spawnPirateFaction(state, rng);
  }

  // 12. AI actions
  runAI(state, rng);

  // 12b. Diplomacy: proposals, border tension & mutual defense
  for (const empire of state.empires) {
    if (!empire.isAlive || empire.isPlayer) continue;
    maybeAIOfferProposal(state, empire, rng);
  }
  processDiplomaticProposals(state, rng);
  processBorderTension(state);
  processMutualDefense(state);

  // 13. Aggressive fleet stance
  processAggressiveFleets(state);

  // 14. Fleet destination movement (multi-hop)
  processFleetDestinations(state);

  // 14a. Player auto-explore fleets
  processPlayerAutoExplore(state);

  // 14b. First-visit exploration narratives
  processFleetExploration(state);

  // 15. Visibility update
  for (const empire of state.empires) {
    if (empire.isAlive) {
      updateVisibility(empire, state.systems, state.fleets, state);
    }
  }

  // 16. Combat
  checkAndResolveBattles(state, rng);

  const newBattles = state.combatResults.length - combatCountBefore;
  const turnBattles = state.combatResults.slice(combatCountBefore);
  const captures = processCombatCaptures(state, turnBattles);

  // 17. Update scores
  updateAllEmpireScores(state);

  updateEconomyVictoryTracking(state, empireCreditIncome);

  state.turn++;

  resetFleetMoves(state);
  trimEventLog(state, EVENT_LOG_MAX);

  const economyBreakdown = {
    income: playerIncome,
    expenses: {
      credits: playerUpkeep.fleetUpkeep + playerUpkeep.maintenance,
      food: 0,
      industry: 0,
      science: 0,
      fleetUpkeep: playerUpkeep.fleetUpkeep,
      maintenance: playerUpkeep.maintenance,
    },
    net: {
      credits: player.resources.credits - prevResources.credits,
      food: player.resources.food - prevResources.food,
      industry: player.resources.industry - prevResources.industry,
      science: player.resources.science - prevResources.science,
    },
  };

  const researchCompleted = player.researchedTechs.length - researchCountBefore;
  const summary = generateTurnSummary(
    state,
    newBattles,
    captures,
    prevInfluence,
    economyBreakdown,
    colonizationsCompleted,
    researchCompleted
  );
  state.turnSummaries.push(summary);

  if (shouldAutosave(state.turn)) {
    autosaveGame(state);
    state.lastAutosaveTurn = state.turn;
    state.events.push({ turn: state.turn, type: 'explore', message: `Autosave at turn ${state.turn}.` });
    trimEventLog(state, EVENT_LOG_MAX);
  }

  const victory = checkVictoryConditions(state);
  if (victory.winnerId) {
    state.winnerId = victory.winnerId;
    state.victoryType = victory.type;
    const winner = state.empires.find(e => e.id === victory.winnerId)!;
    const msg = getVictoryMessage(victory.type, winner.name, state.maxTurns);
    state.events.push({ turn: state.turn, type: 'victory', message: msg });

    if (victory.winnerId === state.playerEmpireId) {
      state.phase = 'victory';
    } else {
      state.phase = 'defeat';
      state.empires.find(e => e.id === state.playerEmpireId)!.isAlive = false;
    }
  }

  return state;
}

export function serializeGame(state: GameState): SerializedGameState {
  return {
    ...state,
    empires: state.empires.map(e => ({
      ...e,
      knownSystems: [...e.knownSystems],
      visibleSystems: [...e.visibleSystems],
    })),
  };
}

export function deserializeGame(data: SerializedGameState): GameState {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...data.settings,
    galaxyShape: data.settings?.galaxyShape ?? DEFAULT_SETTINGS.galaxyShape,
  };
  return {
    ...data,
    settings,
    maxTurns: data.maxTurns ?? settings.maxTurns,
    turnSummaries: data.turnSummaries ?? [],
    systems: data.systems.map(migrateSystem),
    fleets: data.fleets.map(migrateFleet),
    empires: data.empires.map(migrateEmpire),
    piratesSpawned: data.piratesSpawned ?? false,
    pirateEmpireId: data.pirateEmpireId ?? null,
    activeEventChains: data.activeEventChains ?? [],
    crisisWarned: data.crisisWarned ?? false,
    lastAutosaveTurn: data.lastAutosaveTurn ?? 0,
    precursorLorePending: data.precursorLorePending ?? null,
    diplomaticProposals: data.diplomaticProposals ?? [],
    colonizationProjects: data.colonizationProjects ?? [],
    pendingDecisions: data.pendingDecisions ?? [],
  };
}
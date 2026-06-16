import {
  BUILDING_COSTS,
  CRUISER_COST, DESTROYER_COST, FRIGATE_COST, CARRIER_COST, SCOUT_COST,
  INFLUENCE_BUILDING_COST,
  SCIENCE_VICTORY_TECH_COUNT,
} from './constants';
import { canBuildOnPlanet } from './buildings';
import { exploreAnomaly } from './anomalies';
import { mergeFleets } from './actions';
import { startColonizationProject } from './colonization';
import { getEmpireMilitaryPower } from './combat';
import { canColonizePlanet } from './economy';
import { areSystemsConnected, getAdjacentSystems } from './galaxy';
import {
  canDeclareWar, declareWar, getDiplomacy, getRelationScore,
  makeHostile, proposeResearchPact, proposeTradePact,
} from './diplomacy';
import { getBuildableDesigns } from './shipDesigns';
import { queueShipDesignProduction } from './production';
import { canAffordStrategicCost, getTechStrategicCost, spendStrategicCost } from './strategicResources';
import { hasUnlock, getAvailableTechs } from './research';
import { createShip } from './ships';
import { canReachSystem, setFleetTravelPath } from './travel';
import { getDifficultyModifiers } from './settings';
import { SeededRNG } from './rng';
import { updateVisibility } from './visibility';
import type { AIGoal, BuildingType, Empire, Fleet, GameState, PlanetFocus, StarSystem } from './types';

let fleetCounter = 1000;

function createFleetId(): string {
  return `fleet-ai-${fleetCounter++}`;
}

function getEmpireFleets(state: GameState, empireId: string): Fleet[] {
  return state.fleets.filter(f => f.empireId === empireId);
}

function getPlanetExpansionScore(planet: { rareResource: string }, system: StarSystem): number {
  let score = system.richness;
  if (planet.rareResource === 'titanium') score += 2;
  if (planet.rareResource === 'antimatter') score += 3;
  if (planet.rareResource === 'darkmatter') score += 4;
  return score;
}

function findUnclaimedPlanets(state: GameState, empire: Empire): { system: StarSystem; planetId: string; score: number }[] {
  const results: { system: StarSystem; planetId: string; score: number }[] = [];
  for (const systemId of empire.knownSystems) {
    const system = state.systems.find(s => s.id === systemId);
    if (!system || system.systemType === 'black_hole') continue;
    for (const planet of system.planets) {
      if (!planet.isColonized && canColonizePlanet(planet, empire, system)) {
        results.push({
          system,
          planetId: planet.id,
          score: getPlanetExpansionScore(planet, system),
        });
      }
    }
  }
  return results;
}

function getThreatLevel(state: GameState, empire: Empire, target: Empire): number {
  const targetPower = getEmpireMilitaryPower(state, target.id);
  const aiPower = getEmpireMilitaryPower(state, empire.id);
  const targetPlanets = target.totalPlanets;
  const aiPlanets = empire.totalPlanets;
  return (targetPower / Math.max(aiPower, 1)) + (targetPlanets / Math.max(aiPlanets, 1));
}

function getWeakestNeighbor(state: GameState, empire: Empire): Empire | null {
  const others = state.empires.filter(e => e.id !== empire.id && e.isAlive && !e.isPirate);
  if (others.length === 0) return null;

  return others.reduce((weakest, other) => {
    const otherPower = getEmpireMilitaryPower(state, other.id);
    const weakestPower = getEmpireMilitaryPower(state, weakest.id);
    return otherPower < weakestPower ? other : weakest;
  });
}

function rotateAIGoal(state: GameState, empire: Empire, rng: SeededRNG): void {
  if (!empire.aiGoalTurn || state.turn - empire.aiGoalTurn >= 15) {
    const goals: AIGoal[] = ['expand', 'research', 'militarize'];
    empire.aiGoal = rng.pick(goals);
    empire.aiGoalTurn = state.turn;
  }
}

function getThreatenedBorderSystems(state: GameState, empire: Empire): string[] {
  const threatened: string[] = [];
  for (const system of state.systems) {
    const owns = system.planets.some(p => p.ownerId === empire.id);
    if (!owns) continue;
    const neighbors = getAdjacentSystems(state.systems, system.id);
    const enemyNearby = neighbors.some(n =>
      n.planets.some(p => p.ownerId && p.ownerId !== empire.id) ||
      state.fleets.some(f => f.systemId === n.id && f.empireId !== empire.id && f.ships.some(s => s.attack > 0))
    );
    if (enemyNearby) threatened.push(system.id);
  }
  return threatened;
}

function aiDefendCapital(state: GameState, empire: Empire): void {
  if (!empire.capitalSystemId) return;
  const capitalFleets = getEmpireFleets(state, empire.id).filter(f => f.systemId === empire.capitalSystemId);
  const militaryAtCapital = capitalFleets.filter(f => f.ships.some(s => s.attack > 0));
  if (militaryAtCapital.length >= 2) return;

  const otherFleets = getEmpireFleets(state, empire.id)
    .filter(f => f.systemId !== empire.capitalSystemId && f.movesRemaining > 0 && f.ships.some(s => s.attack > 0));

  if (otherFleets.length > 0 && getThreatenedBorderSystems(state, empire).length > 0) {
    const fleet = otherFleets[0];
    const neighbors = getAdjacentSystems(state.systems, fleet.systemId);
    const capitalId = empire.capitalSystemId!;
    const capitalNeighbor = neighbors.find(n => n.id === capitalId || n.connections.includes(capitalId));
    if (capitalNeighbor && areSystemsConnected(state.systems, fleet.systemId, capitalNeighbor.id)) {
      fleet.systemId = capitalNeighbor.id;
      fleet.movesRemaining--;
      fleet.stance = 'passive';
    }
  }
}

function getChokepointBorderSystems(state: GameState, empire: Empire): string[] {
  const chokepoints: string[] = [];
  for (const system of state.systems) {
    if (system.connections.length > 2) continue;
    const owns = system.planets.some(p => p.ownerId === empire.id);
    if (!owns) continue;
    const neighbors = getAdjacentSystems(state.systems, system.id);
    const isBorder = neighbors.some(n =>
      n.planets.some(p => p.ownerId && p.ownerId !== empire.id) ||
      state.fleets.some(f =>
        f.systemId === n.id && f.empireId !== empire.id && f.ships.some(s => s.attack > 0)
      )
    );
    if (isBorder) chokepoints.push(system.id);
  }
  return chokepoints;
}

function aiDefendChokepoints(state: GameState, empire: Empire): void {
  const chokepoints = getChokepointBorderSystems(state, empire);
  if (chokepoints.length === 0) return;

  const rallyPoint = chokepoints[0];
  const fleets = getEmpireFleets(state, empire.id)
    .filter(f => f.movesRemaining > 0 && f.ships.some(s => s.attack > 0) && f.systemId !== rallyPoint);

  for (const fleet of fleets.slice(0, 2)) {
    const neighbors = getAdjacentSystems(state.systems, fleet.systemId);
    if (neighbors.some(n => n.id === rallyPoint)) {
      fleet.systemId = rallyPoint;
      fleet.movesRemaining--;
      fleet.stance = 'passive';
    }
  }
}

function aiPursueVictory(state: GameState, empire: Empire, rng: SeededRNG): void {
  const closeToScience = empire.researchedTechs.length >= SCIENCE_VICTORY_TECH_COUNT - 4;
  if (empire.aiGoal !== 'research' || !closeToScience) return;

  const ownedPlanets = state.systems.flatMap(s => s.planets).filter(p => p.ownerId === empire.id && p.isColonized);
  for (const planet of ownedPlanets) {
    if (rng.next() > 0.5) continue;
    if (!canBuildOnPlanet(planet, 'lab', empire)) continue;
    if (empire.influence < INFLUENCE_BUILDING_COST) break;
    const bc = BUILDING_COSTS.lab;
    if (empire.resources.credits >= bc.credits && empire.resources.industry >= bc.industry) {
      empire.resources.credits -= bc.credits;
      empire.resources.industry -= bc.industry;
      empire.influence -= INFLUENCE_BUILDING_COST;
      planet.buildings.push('lab');
      state.events.push({
        turn: state.turn,
        type: 'building',
        message: `${empire.name} built lab on ${planet.name} (science victory push)`,
      });
      break;
    }
  }
}

function aiRallyAtBorders(state: GameState, empire: Empire): void {
  const threatened = getThreatenedBorderSystems(state, empire);
  if (threatened.length === 0) return;

  const rallyPoint = threatened[0];
  const fleets = getEmpireFleets(state, empire.id)
    .filter(f => f.movesRemaining > 0 && f.ships.some(s => s.attack > 0) && f.systemId !== rallyPoint);

  for (const fleet of fleets.slice(0, 2)) {
    const neighbors = getAdjacentSystems(state.systems, fleet.systemId);
    if (neighbors.some(n => n.id === rallyPoint)) {
      fleet.systemId = rallyPoint;
      fleet.movesRemaining--;
      fleet.stance = 'aggressive';
    }
  }
}

function aiSetPlanetSpecialization(state: GameState, empire: Empire, rng: SeededRNG): void {
  const ownedPlanets = state.systems.flatMap(s => s.planets).filter(p => p.ownerId === empire.id && p.isColonized);

  for (const planet of ownedPlanets) {
    if (rng.next() > 0.3) continue;

    let focus: PlanetFocus = 'balanced';
    if (empire.aiGoal === 'research' || empire.trait === 'scientific') focus = 'science';
    else if (empire.aiGoal === 'expand' || empire.trait === 'expansionist') focus = 'food';
    else if (empire.aiGoal === 'militarize' || empire.trait === 'militarist') focus = 'industry';
    else {
      const roll = rng.next();
      if (roll < 0.3) focus = 'food';
      else if (roll < 0.6) focus = 'industry';
      else if (roll < 0.8) focus = 'science';
    }

    planet.focus = focus;
  }
}

function aiMergeFleets(state: GameState, empire: Empire): void {
  const fleets = getEmpireFleets(state, empire.id);
  const bySystem = new Map<string, Fleet[]>();

  for (const fleet of fleets) {
    const list = bySystem.get(fleet.systemId) || [];
    list.push(fleet);
    bySystem.set(fleet.systemId, list);
  }

  for (const [, systemFleets] of bySystem) {
    if (systemFleets.length < 2) continue;
    const military = systemFleets.filter(f => f.ships.some(s => s.attack > 0));
    if (military.length < 2) continue;

    for (let i = 1; i < military.length; i++) {
      mergeFleets(state, military[0].id, military[i].id);
    }
  }
}

function aiResearch(state: GameState, empire: Empire, rng: SeededRNG): void {
  if (empire.currentResearch) return;
  const available = getAvailableTechs(empire.researchedTechs, empire.repeatableTechCounts ?? {});
  if (available.length === 0) return;

  const weakest = getWeakestNeighbor(state, empire);
  const threat = weakest ? getThreatLevel(state, empire, weakest) : 0;
  const militaryFleets = getEmpireFleets(state, empire.id).filter(f => f.ships.some(s => s.attack > 0));

  const affordable = available.filter(t => canAffordStrategicCost(empire, getTechStrategicCost(t.id)));
  if (affordable.length === 0) return;

  const priorities = affordable.sort((a, b) => {
    const priority = (t: typeof a) => {
      if (empire.aiGoal === 'research' && t.category === 'science') return 7;
      if (empire.aiGoal === 'militarize' && t.category === 'military') return 7;
      if (empire.aiGoal === 'expand' && t.category === 'economy') return 6;
      if (empire.trait === 'scientific' && t.category === 'science') return 6;
      if (empire.trait === 'militarist' && t.category === 'military') return 6;
      if (threat > 2 && t.category === 'military') return 5;
      if (threat > 1.5 && t.unlocks.includes('destroyer')) return 4;
      if (militaryFleets.length < 2 && t.category === 'military') return 4;
      if (t.category === 'military') return 3;
      if (t.category === 'economy') return 2;
      if (t.category === 'exploration') return 1;
      return 0;
    };
    return priority(b) - priority(a) + (rng.next() - 0.5);
  });

  const tech = priorities[0];
  const strategicCost = getTechStrategicCost(tech.id);
  if (!canAffordStrategicCost(empire, strategicCost)) return;
  if (!spendStrategicCost(empire, strategicCost)) return;

  empire.currentResearch = tech.id;
  empire.researchProgress = 0;
  empire.activeResearchStrategicSpent = {
    titanium: strategicCost.titanium ?? 0,
    antimatter: strategicCost.antimatter ?? 0,
    darkmatter: strategicCost.darkmatter ?? 0,
  };
}

function hasFoodDeficit(empire: Empire, systems: StarSystem[]): boolean {
  const pop = systems.flatMap(s => s.planets)
    .filter(p => p.ownerId === empire.id && p.isColonized)
    .reduce((sum, p) => sum + p.population, 0);
  return empire.resources.food < pop * 2;
}

function getWeakestBorderSystem(state: GameState, empire: Empire, target: Empire): StarSystem | null {
  const borders = state.systems.filter(s => {
    if (!s.planets.some(p => p.ownerId === target.id)) return false;
    return getAdjacentSystems(state.systems, s.id).some(n => n.planets.some(p => p.ownerId === empire.id));
  });
  if (borders.length === 0) return null;
  return borders.reduce((best, sys) => {
    const score = getEmpireMilitaryPower(state, target.id) * 0.1
      + sys.planets.filter(p => p.ownerId === target.id).length;
    const bestScore = best
      ? getEmpireMilitaryPower(state, target.id) * 0.1 + best.planets.filter(p => p.ownerId === target.id).length
      : Infinity;
    return score < bestScore ? sys : best;
  }, null as StarSystem | null);
}

function aiBuildBuildings(state: GameState, empire: Empire, rng: SeededRNG): void {
  const ownedPlanets = state.systems.flatMap(s => s.planets).filter(p => p.ownerId === empire.id && p.isColonized);
  if (ownedPlanets.length === 0) return;

  const closeToScience = empire.researchedTechs.length >= SCIENCE_VICTORY_TECH_COUNT - 4;
  const foodDeficit = hasFoodDeficit(empire, state.systems);
  const buildingPriority: BuildingType[] = foodDeficit
    ? ['farm', 'farm', 'hospital', 'factory', 'lab', 'spaceport', 'mining_complex']
    : empire.aiGoal === 'research' && closeToScience
      ? ['lab', 'lab', 'academy', 'farm', 'factory', 'market', 'spaceport', 'defense_grid']
      : ['farm', 'factory', 'lab', 'market', 'academy', 'spaceport', 'mining_complex', 'defense_grid', 'fortress'];
  for (const planet of ownedPlanets) {
    if (rng.next() > 0.4) continue;
    for (const buildingType of buildingPriority) {
      if (!canBuildOnPlanet(planet, buildingType, empire)) continue;
      if (empire.influence < INFLUENCE_BUILDING_COST) break;
      const bc = BUILDING_COSTS[buildingType];
      if (empire.resources.credits >= bc.credits && empire.resources.industry >= bc.industry) {
        empire.resources.credits -= bc.credits;
        empire.resources.industry -= bc.industry;
        empire.influence -= INFLUENCE_BUILDING_COST;
        planet.buildings.push(buildingType);
        state.events.push({ turn: state.turn, type: 'building', message: `${empire.name} built ${buildingType} on ${planet.name}` });
        break;
      }
    }
  }
}

function aiUseProductionQueue(state: GameState, empire: Empire, rng: SeededRNG): void {
  const ownedPlanets = state.systems.flatMap(s =>
    s.planets.filter(p => p.ownerId === empire.id && p.isColonized && p.buildings.includes('spaceport'))
  );
  if (ownedPlanets.length === 0) return;

  const planet = rng.pick(ownedPlanets);
  const system = state.systems.find(s => s.id === planet.systemId)!;
  const weakest = getWeakestNeighbor(state, empire);
  const threat = weakest ? getThreatLevel(state, empire, weakest) : 0;

  const buildable = getBuildableDesigns(empire).filter(d => d.hull !== 'colony');
  const militaryDesigns = buildable.filter(d => d.hull !== 'colony' && d.hull !== 'scout');
  const pickDesign = () => {
    if (threat > 1.5 && militaryDesigns.some(d => d.hull === 'destroyer') && rng.next() > 0.3) {
      return militaryDesigns.find(d => d.hull === 'destroyer');
    }
    if (buildable.some(d => d.hull === 'frigate') && rng.next() > 0.4) {
      return buildable.find(d => d.hull === 'frigate');
    }
    if (buildable.some(d => d.hull === 'scout') && rng.next() > 0.5) {
      return buildable.find(d => d.hull === 'scout');
    }
    return buildable[0];
  };

  const design = pickDesign();
  if (design) {
    queueShipDesignProduction(planet, design, empire, system.id, state);
  }
}

function aiBuildFleet(state: GameState, empire: Empire, systemId: string, rng: SeededRNG): void {
  const hasScout = hasUnlock(empire.researchedTechs, 'scout');
  const hasFrigate = hasUnlock(empire.researchedTechs, 'frigate');
  const hasCruiser = hasUnlock(empire.researchedTechs, 'cruiser');
  const hasDestroyer = hasUnlock(empire.researchedTechs, 'destroyer');
  const hasCarrier = hasUnlock(empire.researchedTechs, 'carrier');

  const fleets = getEmpireFleets(state, empire.id);
  const militaryFleets = fleets.filter(f => f.ships.some(s => s.attack > 0));
  const weakest = getWeakestNeighbor(state, empire);
  const threat = weakest ? getThreatLevel(state, empire, weakest) : 0;

  if (threat > 2 && hasDestroyer && empire.resources.credits >= DESTROYER_COST.credits && empire.resources.industry >= DESTROYER_COST.industry) {
    empire.resources.credits -= DESTROYER_COST.credits;
    empire.resources.industry -= DESTROYER_COST.industry;
    state.fleets.push({
      id: createFleetId(), empireId: empire.id, systemId,
      ships: [createShip('destroyer')], movesRemaining: 2, hasColonyShip: false,
      destinationSystemId: null, travelPath: [], travelTurns: 0,
      stance: 'aggressive', autoExplore: false, battleCount: 0, isVeteran: false,
    });
    return;
  }

  if (hasCarrier && militaryFleets.length >= 3 && empire.resources.credits >= CARRIER_COST.credits && empire.resources.industry >= CARRIER_COST.industry && rng.next() > 0.6) {
    empire.resources.credits -= CARRIER_COST.credits;
    empire.resources.industry -= CARRIER_COST.industry;
    state.fleets.push({
      id: createFleetId(), empireId: empire.id, systemId,
      ships: [createShip('carrier')], movesRemaining: 1, hasColonyShip: false,
      destinationSystemId: null, travelPath: [], travelTurns: 0,
      stance: 'aggressive', autoExplore: false, battleCount: 0, isVeteran: false,
    });
    return;
  }

  if (militaryFleets.length < 2 && hasScout && empire.resources.credits >= SCOUT_COST.credits && empire.resources.industry >= SCOUT_COST.industry) {
    empire.resources.credits -= SCOUT_COST.credits;
    empire.resources.industry -= SCOUT_COST.industry;
    state.fleets.push({
      id: createFleetId(), empireId: empire.id, systemId,
      ships: [createShip('scout')], movesRemaining: 2, hasColonyShip: false,
      destinationSystemId: null, travelPath: [], travelTurns: 0,
      stance: 'passive', autoExplore: true, battleCount: 0, isVeteran: false,
    });
    return;
  }

  if (militaryFleets.length < 3 && hasFrigate && empire.resources.credits >= FRIGATE_COST.credits && empire.resources.industry >= FRIGATE_COST.industry) {
    empire.resources.credits -= FRIGATE_COST.credits;
    empire.resources.industry -= FRIGATE_COST.industry;
    state.fleets.push({
      id: createFleetId(), empireId: empire.id, systemId,
      ships: [createShip('frigate')], movesRemaining: 2, hasColonyShip: false,
      destinationSystemId: null, travelPath: [], travelTurns: 0,
      stance: 'aggressive', autoExplore: false, battleCount: 0, isVeteran: false,
    });
    return;
  }

  if (hasCruiser && empire.resources.credits >= CRUISER_COST.credits && empire.resources.industry >= CRUISER_COST.industry && rng.next() > 0.5) {
    empire.resources.credits -= CRUISER_COST.credits;
    empire.resources.industry -= CRUISER_COST.industry;
    state.fleets.push({
      id: createFleetId(), empireId: empire.id, systemId,
      ships: [createShip('cruiser')], movesRemaining: 1, hasColonyShip: false,
      destinationSystemId: null, travelPath: [], travelTurns: 0,
      stance: 'aggressive', autoExplore: false, battleCount: 0, isVeteran: false,
    });
  }
}

function aiExploreAnomalies(state: GameState, empire: Empire, rng: SeededRNG): void {
  for (const systemId of empire.knownSystems) {
    const system = state.systems.find(s => s.id === systemId);
    if (!system?.anomaly || system.exploredBy[empire.id]) continue;
    const hasFleet = getEmpireFleets(state, empire.id).some(f => f.systemId === systemId);
    if (hasFleet && rng.next() > 0.3) {
      const choice = rng.next() > 0.7 ? 'risky' : 'safe';
      exploreAnomaly(state, systemId, empire, rng, choice);
    }
  }
}

function aiColonize(state: GameState, empire: Empire, rng: SeededRNG): void {
  const mods = getDifficultyModifiers(state.settings.difficulty);
  if (rng.next() > mods.aiExpansionMultiplier) return;

  const unclaimed = findUnclaimedPlanets(state, empire);
  if (unclaimed.length === 0) return;

  unclaimed.sort((a, b) => b.score - a.score);
  const top = unclaimed.slice(0, Math.min(3, unclaimed.length));
  const target = rng.pick(top);
  const planet = target.system.planets.find(p => p.id === target.planetId)!;
  const project = startColonizationProject(state, planet.id, empire);
  if (project) {
    state.events.push({
      turn: state.turn,
      type: 'ai',
      message: `${empire.name} began colonizing ${planet.name} (${project.totalTurns} turns)`,
    });
  }
}

function aiExplore(state: GameState, empire: Empire, rng: SeededRNG): void {
  if (empire.aiPersonality === 'isolationist' && rng.next() > 0.4) return;

  const fleets = getEmpireFleets(state, empire.id);
  const scoutFleets = fleets.filter(f =>
    (f.movesRemaining > 0 && f.autoExplore) ||
    (f.movesRemaining > 0 && f.ships.some(s => s.type === 'scout' || s.attack > 0))
  );

  for (const fleet of scoutFleets) {
    const current = state.systems.find(s => s.id === fleet.systemId)!;
    const neighbors = getAdjacentSystems(state.systems, current.id);
    const unknown = neighbors.filter(s => !empire.knownSystems.has(s.id));

    if (unknown.length > 0) {
      const target = rng.pick(unknown);
      if (areSystemsConnected(state.systems, fleet.systemId, target.id)) {
        fleet.systemId = target.id;
        fleet.movesRemaining--;
        empire.knownSystems.add(target.id);
        empire.visibleSystems.add(target.id);
      }
    } else if (neighbors.length > 0 && rng.next() > 0.5) {
      const target = rng.pick(neighbors);
      fleet.systemId = target.id;
      fleet.movesRemaining--;
    }
  }
}

function aiDiplomacy(state: GameState, empire: Empire, rng: SeededRNG): void {
  const mods = getDifficultyModifiers(state.settings.difficulty);
  const others = state.empires.filter(e => e.id !== empire.id && e.isAlive && !e.isPirate);

  for (const other of others) {
    const dip = getDiplomacy(empire, other.id);

    if (empire.aiPersonality === 'diplomatic' && dip === 'neutral' && !other.isPlayer && rng.next() > 0.6) {
      if (rng.next() > 0.5) {
        if (proposeTradePact(empire, other)) {
          state.events.push({ turn: state.turn, type: 'diplomacy', message: `${empire.name} and ${other.name} formed a trade pact` });
        }
      } else if (proposeResearchPact(empire, other)) {
        state.events.push({ turn: state.turn, type: 'diplomacy', message: `${empire.name} and ${other.name} formed a research pact` });
      }
    }

    if (dip === 'neutral' && !other.isPlayer && empire.aiPersonality !== 'aggressive' && rng.next() > 0.7) {
      if (proposeTradePact(empire, other)) {
        state.events.push({ turn: state.turn, type: 'diplomacy', message: `${empire.name} and ${other.name} formed a trade pact` });
      }
    }

    const threat = getThreatLevel(state, empire, other);
    const borderConflict = state.systems.some(s => {
      const aiOwns = s.planets.some(p => p.ownerId === empire.id);
      const otherOwns = s.planets.some(p => p.ownerId === other.id);
      if (!aiOwns || !otherOwns) return false;
      const neighbors = getAdjacentSystems(state.systems, s.id);
      return neighbors.some(n => n.planets.some(p => p.ownerId === other.id));
    });

    if (empire.aiPersonality === 'aggressive') {
      const relation = getRelationScore(empire, other.id);
      const aiPower = getEmpireMilitaryPower(state, empire.id);
      const otherPower = getEmpireMilitaryPower(state, other.id);
      if (
        relation < 30 &&
        aiPower > otherPower * 1.1 &&
        dip !== 'war' &&
        canDeclareWar(empire, other) &&
        rng.next() > 0.4
      ) {
        declareWar(empire, other);
        state.events.push({
          turn: state.turn,
          type: 'diplomacy',
          message: `${empire.name} declares WAR on ${other.name} (military advantage, poor relations)!`,
        });
        continue;
      }
    }

    const hostilityThreshold = 0.7 / (mods.aiAggression * mods.aiAggressionMultiplier);
    if (empire.aiPersonality === 'aggressive') {
      if ((borderConflict || threat > 1.2) && dip === 'neutral' && rng.next() > hostilityThreshold * 0.7) {
        makeHostile(empire, other);
        state.events.push({ turn: state.turn, type: 'diplomacy', message: `${empire.name} is now hostile toward ${other.name}` });
      }
    } else if ((borderConflict || threat > 1.5) && dip === 'neutral' && rng.next() > hostilityThreshold) {
      makeHostile(empire, other);
      state.events.push({ turn: state.turn, type: 'diplomacy', message: `${empire.name} is now hostile toward ${other.name}` });
    }

    const warThreshold = 0.6 / (mods.aiAggression * mods.aiAggressionMultiplier);
    if (getDiplomacy(empire, other.id) === 'hostile' && (empire.totalPlanets > 2 || threat < 0.8) && rng.next() > warThreshold) {
      declareWar(empire, other);
      state.events.push({ turn: state.turn, type: 'diplomacy', message: `${empire.name} declares WAR on ${other.name}!` });
    }
  }
}

function aiAttack(state: GameState, empire: Empire, rng: SeededRNG): void {
  if (empire.aiPersonality === 'isolationist' && rng.next() > 0.3) return;

  const weakest = getWeakestNeighbor(state, empire);
  if (!weakest) return;

  const dip = getDiplomacy(empire, weakest.id);
  if (dip !== 'war' && dip !== 'hostile') return;

  const targetPower = getEmpireMilitaryPower(state, weakest.id);
  const aiPower = getEmpireMilitaryPower(state, empire.id);

  const militaryFleets = getEmpireFleets(state, empire.id)
    .filter(f => f.movesRemaining > 0 && f.ships.some(s => s.attack > 0));

  aiMergeFleets(state, empire);

  for (const fleet of militaryFleets) {
    if (!state.fleets.find(f => f.id === fleet.id)) continue;

    const neighbors = getAdjacentSystems(state.systems, fleet.systemId);
    let targetSystems = neighbors.filter(s =>
      s.planets.some(p => p.ownerId === weakest.id) ||
      state.fleets.some(f => f.empireId === weakest.id && f.systemId === s.id)
    );

    const borderTarget = getWeakestBorderSystem(state, empire, weakest);
    if (borderTarget && neighbors.some(n => n.id === borderTarget.id)) {
      targetSystems = [borderTarget];
    }

    if (targetSystems.length > 0) {
      const mods = getDifficultyModifiers(state.settings.difficulty);
      if (aiPower < targetPower * 0.5 && rng.next() > 0.3 * mods.aiAggressionMultiplier) continue;
      const target = targetSystems.length === 1 ? targetSystems[0] : rng.pick(targetSystems);

      if (canReachSystem(state.systems, fleet.systemId, target.id) &&
          !areSystemsConnected(state.systems, fleet.systemId, target.id)) {
        setFleetTravelPath(fleet, state.systems, target.id);
      } else {
        fleet.systemId = target.id;
        fleet.movesRemaining = 0;
        fleet.stance = 'aggressive';
      }
    }
  }
}

export function runAI(state: GameState, rng: SeededRNG): void {
  const aiEmpires = state.empires.filter(e => !e.isPlayer && e.isAlive && !e.isPirate);

  for (const empire of aiEmpires) {
    const homeSystem = state.systems.find(s => s.planets.some(p => p.ownerId === empire.id))?.id;
    if (!homeSystem) continue;

    rotateAIGoal(state, empire, rng);
    aiResearch(state, empire, rng);
    aiSetPlanetSpecialization(state, empire, rng);
    aiBuildBuildings(state, empire, rng);
    aiUseProductionQueue(state, empire, rng);
    aiBuildFleet(state, empire, homeSystem, rng);
    aiMergeFleets(state, empire);
    aiDefendCapital(state, empire);
    aiDefendChokepoints(state, empire);
    aiRallyAtBorders(state, empire);
    aiPursueVictory(state, empire, rng);
    aiExplore(state, empire, rng);
    aiExploreAnomalies(state, empire, rng);
    aiColonize(state, empire, rng);
    aiDiplomacy(state, empire, rng);
    aiAttack(state, empire, rng);
    updateVisibility(empire, state.systems, state.fleets, state);
  }

  const pirate = state.empires.find(e => e.isPirate && e.isAlive);
  if (pirate) {
    aiAttack(state, pirate, rng);
    aiExplore(state, pirate, rng);
  }
}
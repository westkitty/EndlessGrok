import {
  BLOCKER_CLEAR_COSTS,
  BUILDING_COSTS,
  COLONY_SHIP_COST, CRUISER_COST, DESTROYER_COST, DREADNOUGHT_COST,
  FRIGATE_COST, CARRIER_COST, SCOUT_COST,
  INFLUENCE_BUILDING_COST,
  WAR_DECLARATION_INFLUENCE_COST,
} from './constants';
import { canBuildOnPlanet, getBuildingDefinition } from './buildings';
import { exploreAnomaly, canExploreAnomaly } from './anomalies';
import { canCancelColonization, canStartColonization, cancelColonizationProject, startColonizationProject } from './colonization';
import { getEmpireMilitaryPower, getFleetCommandLimit, predictCombatOutcome, repairFleetAtSystem } from './combat';
import { canDeclareWar, declareWar, demandPeace, demandTribute, getDiplomacy } from './diplomacy';
import { resolveDecision } from './playerDecisions';
import {
  acceptDiplomaticProposal,
  rejectDiplomaticProposal,
  submitDiplomaticProposal,
} from './diplomaticProposals';
import { canTerraformPlanet, clearBlocker, terraformPlanet } from './planets';
import { canUpgradeColony, upgradeColonyDevelopment } from './upkeep';
import { areSystemsConnected, getAdjacentSystems, getSystemDistance } from './galaxy';
import {
  queueBuildingProduction,
  queueShipProduction,
  canQueueShip,
  canQueueShipDesign as canQueueShipDesignOnPlanet,
  canQueueBuilding,
} from './production';
import { hasUnlock, getTechnology, getAvailableTechs } from './research';
import {
  copyStrategicCost,
  formatMissingStrategicResources,
  formatStrategicCost,
  getTechStrategicCost,
  isEmptyStrategicCost,
  refundStrategicCost,
  spendStrategicCost,
} from './strategicResources';
import { canBuildShipDesign, validateShipDesign } from './shipDesigns';
import type { ShipDesign } from './types';
import { createShip } from './ships';
import { canReachSystem, findPath, getFleetPath, setFleetTravelPath } from './travel';
import { SeededRNG } from './rng';
import { executeMacro, canExecuteMacro } from './macros';
import {
  beginFinalStarbindingExecution,
  beginStarbindingDive,
  buildStarbindingArray,
  canBeginFinalExecution,
  canBeginStarDive,
  canBuildStarbindingArray,
  canSelectStarbindingTarget,
  selectStarbindingTarget,
  stabilizeInertStarsilk,
} from './starbinding';
import type { AnomalyExploreChoice, BuildingType, DiplomacyState, Fleet, FleetStance, GameState, PlanetBlocker, PlanetFocus, ShipType, SystemSpecialization } from './types';

export { getEmpireMilitaryPower, predictCombatOutcome };

let fleetCounter = 0;

export function createFleetId(): string {
  return `fleet-${fleetCounter++}`;
}

export function resetFleetCounter(): void {
  fleetCounter = 0;
}

export function getPlayer(state: GameState) {
  return state.empires.find(e => e.id === state.playerEmpireId)!;
}

export function getPlayerFleets(state: GameState): Fleet[] {
  return state.fleets.filter(f => f.empireId === state.playerEmpireId);
}

export function canBuildShip(state: GameState, type: ShipType, systemId: string): string | null {
  const player = getPlayer(state);
  const costs: Record<ShipType, { credits: number; industry: number; tech?: string }> = {
    scout: { ...SCOUT_COST, tech: 'scout' },
    frigate: { ...FRIGATE_COST, tech: 'frigate' },
    cruiser: { ...CRUISER_COST, tech: 'cruiser' },
    destroyer: { ...DESTROYER_COST, tech: 'destroyer' },
    carrier: { ...CARRIER_COST, tech: 'carrier' },
    colony: { ...COLONY_SHIP_COST, tech: 'scout' },
    dreadnought: { ...DREADNOUGHT_COST, tech: 'dreadnought' },
  };

  const cost = costs[type];
  if (cost.tech && !hasUnlock(player.researchedTechs, cost.tech)) {
    return `Requires ${cost.tech} technology`;
  }
  if (player.resources.credits < cost.credits) return 'Not enough credits';
  if (player.resources.industry < cost.industry) return 'Not enough industry';

  const owned = state.systems.find(s => s.id === systemId)?.planets.some(p => p.ownerId === player.id);
  if (!owned) return 'Must build at owned system';

  const shipCount = state.fleets
    .filter(f => f.empireId === player.id)
    .reduce((sum, f) => sum + f.ships.length, 0);
  const limit = getFleetCommandLimit(player);
  if (shipCount >= limit) return `Fleet command limit reached (${limit} ships)`;

  return null;
}

export function buildShip(state: GameState, type: ShipType, systemId: string): boolean {
  const err = canBuildShip(state, type, systemId);
  if (err) return false;

  const player = getPlayer(state);
  const costs: Record<ShipType, { credits: number; industry: number }> = {
    scout: SCOUT_COST,
    frigate: FRIGATE_COST,
    cruiser: CRUISER_COST,
    destroyer: DESTROYER_COST,
    carrier: CARRIER_COST,
    colony: COLONY_SHIP_COST,
    dreadnought: DREADNOUGHT_COST,
  };

  const cost = costs[type];
  player.resources.credits -= cost.credits;
  player.resources.industry -= cost.industry;

  const existingFleet = state.fleets.find(f => f.empireId === player.id && f.systemId === systemId && f.movesRemaining > 0);
  if (existingFleet && type !== 'colony') {
    existingFleet.ships.push(createShip(type));
  } else {
    const baseMoves = hasUnlock(player.researchedTechs, 'scout') ? 3 : 2;
    state.fleets.push({
      id: createFleetId(),
      empireId: player.id,
      systemId,
      ships: [createShip(type)],
      movesRemaining: type === 'colony' ? 1 : baseMoves,
      hasColonyShip: type === 'colony',
      destinationSystemId: null,
      travelPath: [],
      travelTurns: 0,
      stance: 'passive',
      autoExplore: false,
    });
  }

  state.events.push({ turn: state.turn, type: 'ai', message: `Built ${type} at ${systemId}` });
  return true;
}

export function canMoveFleet(state: GameState, fleetId: string, targetSystemId: string): string | null {
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet) return 'Fleet not found';
  if (fleet.empireId !== state.playerEmpireId) return 'Not your fleet';
  if (fleet.movesRemaining <= 0) return 'No moves remaining';

  if (!areSystemsConnected(state.systems, fleet.systemId, targetSystemId)) {
    return 'Systems not connected';
  }

  return null;
}

export function getFleetMovePreview(state: GameState, fleetId: string, targetSystemId: string): {
  canMove: boolean;
  error: string | null;
  distance: number;
  turnsRequired: number;
  destinationName: string;
  path: string[];
} {
  const fleet = state.fleets.find(f => f.id === fleetId);
  const target = state.systems.find(s => s.id === targetSystemId);
  const error = canMoveFleet(state, fleetId, targetSystemId);
  const distance = fleet && target
    ? getSystemDistance(state.systems, fleet.systemId, targetSystemId)
    : 0;
  const path = fleet && target
    ? (findPath(state.systems, fleet.systemId, targetSystemId) ?? [])
    : [];
  const turnsRequired = path.length > 1 ? path.length - 1 : 1;

  return {
    canMove: !error,
    error,
    distance: Math.round(distance),
    turnsRequired,
    destinationName: target?.name ?? 'Unknown',
    path,
  };
}

export function moveFleet(state: GameState, fleetId: string, targetSystemId: string): boolean {
  const err = canMoveFleet(state, fleetId, targetSystemId);
  if (err) return false;

  const fleet = state.fleets.find(f => f.id === fleetId)!;
  fleet.systemId = targetSystemId;
  fleet.movesRemaining--;
  fleet.destinationSystemId = null;
  fleet.travelPath = [];
  fleet.travelTurns = 0;

  const player = getPlayer(state);
  player.knownSystems.add(fleet.systemId);
  player.visibleSystems.add(fleet.systemId);

  return true;
}

export function setFleetDestination(state: GameState, fleetId: string, targetSystemId: string | null): boolean {
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet || fleet.empireId !== state.playerEmpireId) return false;

  if (!targetSystemId) {
    fleet.destinationSystemId = null;
    fleet.travelPath = [];
    fleet.travelTurns = 0;
    return true;
  }

  if (!canReachSystem(state.systems, fleet.systemId, targetSystemId)) return false;
  return setFleetTravelPath(fleet, state.systems, targetSystemId);
}

export { getFleetPath };

export function canMergeFleets(state: GameState, fleetIdA: string, fleetIdB: string): string | null {
  const fleetA = state.fleets.find(f => f.id === fleetIdA);
  const fleetB = state.fleets.find(f => f.id === fleetIdB);
  if (!fleetA || !fleetB) return 'Fleet not found';
  if (fleetA.empireId !== state.playerEmpireId || fleetB.empireId !== state.playerEmpireId) return 'Not your fleet';
  if (fleetA.systemId !== fleetB.systemId) return 'Fleets must be in same system';
  if (fleetA.hasColonyShip && fleetB.hasColonyShip) return 'Cannot merge two colony fleets';
  return null;
}

export function mergeFleets(state: GameState, fleetIdA: string, fleetIdB: string): boolean {
  const err = canMergeFleets(state, fleetIdA, fleetIdB);
  if (err) return false;

  const fleetA = state.fleets.find(f => f.id === fleetIdA)!;
  const fleetB = state.fleets.find(f => f.id === fleetIdB)!;

  fleetA.ships.push(...fleetB.ships);
  fleetA.hasColonyShip = fleetA.hasColonyShip || fleetB.hasColonyShip;
  fleetA.movesRemaining = Math.max(fleetA.movesRemaining, fleetB.movesRemaining);

  state.fleets = state.fleets.filter(f => f.id !== fleetB.id);
  state.events.push({ turn: state.turn, type: 'ai', message: 'Fleets merged' });
  return true;
}

export function canSplitFleet(state: GameState, fleetId: string, shipCount: number): string | null {
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet) return 'Fleet not found';
  if (fleet.empireId !== state.playerEmpireId) return 'Not your fleet';
  if (shipCount < 1 || shipCount >= fleet.ships.length) return 'Invalid ship count';
  return null;
}

export function splitFleet(state: GameState, fleetId: string, shipCount: number): boolean {
  const err = canSplitFleet(state, fleetId, shipCount);
  if (err) return false;

  const fleet = state.fleets.find(f => f.id === fleetId)!;
  const splitShips = fleet.ships.splice(0, shipCount);
  const hasColony = splitShips.some(s => s.type === 'colony');

  state.fleets.push({
    id: createFleetId(),
    empireId: fleet.empireId,
    systemId: fleet.systemId,
    ships: splitShips,
    movesRemaining: fleet.movesRemaining,
    hasColonyShip: hasColony,
    destinationSystemId: null,
    travelPath: [],
    travelTurns: 0,
    stance: fleet.stance,
    autoExplore: fleet.autoExplore,
  });

  fleet.hasColonyShip = fleet.ships.some(s => s.type === 'colony');
  state.events.push({ turn: state.turn, type: 'ai', message: 'Fleet split' });
  return true;
}

export function setFleetStance(state: GameState, fleetId: string, stance: FleetStance): boolean {
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet || fleet.empireId !== state.playerEmpireId) return false;
  fleet.stance = stance;
  return true;
}

export function setFleetAutoExplore(state: GameState, fleetId: string, autoExplore: boolean): boolean {
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet || fleet.empireId !== state.playerEmpireId) return false;
  fleet.autoExplore = autoExplore;
  return true;
}

export function setPlanetFocus(state: GameState, planetId: string, focus: PlanetFocus): boolean {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet || planet.ownerId !== player.id) return false;
  planet.focus = focus;
  return true;
}

export function canColonize(state: GameState, planetId: string): string | null {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet) return 'Planet not found';
  return canStartColonization(state, planet, player);
}

export function colonizePlanet(state: GameState, planetId: string): boolean {
  const player = getPlayer(state);
  return startColonizationProject(state, planetId, player) !== null;
}

export function canCancelColonizationAction(state: GameState, projectId: string): string | null {
  return canCancelColonization(state, projectId, state.playerEmpireId);
}

export function cancelColonizationAction(state: GameState, projectId: string): boolean {
  return cancelColonizationProject(state, projectId, state.playerEmpireId);
}

export function cancelFleetMovement(state: GameState, fleetId: string): boolean {
  return setFleetDestination(state, fleetId, null);
}

export function canBuildBuilding(state: GameState, planetId: string, buildingType: BuildingType): string | null {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet) return 'Planet not found';
  if (player.influence < INFLUENCE_BUILDING_COST) return 'Not enough influence';
  return canBuildOnPlanet(planet, buildingType, player);
}

export function buildBuilding(state: GameState, planetId: string, buildingType: BuildingType): boolean {
  const err = canBuildBuilding(state, planetId, buildingType);
  if (err) return false;

  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId)!;
  const system = state.systems.find(s => s.id === planet.systemId)!;
  const cost = BUILDING_COSTS[buildingType];
  const def = getBuildingDefinition(buildingType)!;

  player.resources.credits -= cost.credits;
  player.resources.industry -= cost.industry;
  player.influence -= INFLUENCE_BUILDING_COST;
  planet.buildings.push(buildingType);

  if (buildingType === 'orbital_station') {
    system.orbitalStationOwnerId = player.id;
  }

  state.events.push({
    turn: state.turn,
    type: 'building',
    message: `Built ${def.name} on ${planet.name}`,
  });
  return true;
}

export function queueProduction(
  state: GameState,
  planetId: string,
  itemType: ShipType | BuildingType,
  kind: 'ship' | 'building',
  designId?: string,
): boolean {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet) return false;
  const system = state.systems.find(s => s.id === planet.systemId)!;

  let item;
  if (kind === 'ship') {
    item = queueShipProduction(planet, itemType as ShipType, player, system.id, state, designId);
  } else {
    item = queueBuildingProduction(planet, itemType as BuildingType, player, system.id);
  }

  if (!item) return false;
  const label = kind === 'ship' && designId
    ? player.shipDesigns?.find(d => d.id === designId)?.name ?? itemType
    : itemType;
  state.events.push({
    turn: state.turn,
    type: 'production',
    message: `Queued ${label} at ${planet.name} (${item.turnsRemaining} turns)`,
  });
  return true;
}

export function canQueueProduction(
  state: GameState,
  planetId: string,
  itemType: ShipType | BuildingType,
  kind: 'ship' | 'building',
  designId?: string,
): string | null {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet) return 'Planet not found';
  if (kind === 'ship') {
    if (designId) {
      const design = player.shipDesigns?.find(d => d.id === designId);
      if (!design) return 'Ship design not found';
      return canQueueShipDesignOnPlanet(planet, design, player, state);
    }
    return canQueueShip(planet, itemType as ShipType, player, state);
  }
  return canQueueBuilding(planet, itemType as BuildingType, player);
}

export function canQueueShipDesignById(
  state: GameState,
  planetId: string,
  designId: string,
): string | null {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet) return 'Planet not found';
  const design = player.shipDesigns?.find(d => d.id === designId);
  if (!design) return 'Ship design not found';
  return canQueueShipDesignOnPlanet(planet, design, player, state);
}

export { canBuildShipDesign, formatStrategicCost };

export function exploreAnomalyAction(
  state: GameState,
  systemId: string,
  choice: AnomalyExploreChoice = 'safe'
): boolean {
  const player = getPlayer(state);
  if (choice !== 'skip') {
    const err = canExploreAnomaly(state, systemId, player.id);
    if (err) return false;
  }
  const rng = new SeededRNG(state.seed + state.turn * 31337);
  return exploreAnomaly(state, systemId, player, rng, choice);
}

export function canStartResearch(state: GameState, techId: string, useQueue = false): string | null {
  const player = getPlayer(state);
  const tech = getTechnology(techId);
  if (!tech) return 'Technology not found';
  if (!tech.repeatable && player.researchedTechs.includes(techId)) return 'Already researched';
  if (tech.repeatable) {
    const count = player.repeatableTechCounts?.[techId] ?? 0;
    if (count >= (tech.maxRepeats ?? 1)) return 'Max repeats reached';
  }

  const hasSecondSlot = player.researchedTechs.includes('advanced_manufacturing');

  if (useQueue) {
    if (!hasSecondSlot) return 'Requires Advanced Manufacturing for research queue';
    if (player.researchQueue) return 'Research queue full';
    if (!player.currentResearch) return 'Use primary slot instead';
  } else {
    if (player.currentResearch) {
      if (hasSecondSlot && !player.researchQueue) return null;
      return 'Already researching something';
    }
  }

  if (!tech.prerequisites.every(p => player.researchedTechs.includes(p))) return 'Prerequisites not met';

  const available = getAvailableTechs(player.researchedTechs, player.repeatableTechCounts ?? {});
  if (!available.find(t => t.id === techId)) return 'Not available';

  const strategicMissing = formatMissingStrategicResources(player, getTechStrategicCost(techId));
  if (strategicMissing) return strategicMissing;

  return null;
}

export function startResearch(state: GameState, techId: string, useQueue = false): boolean {
  const err = canStartResearch(state, techId, useQueue);
  if (err) return false;

  const player = getPlayer(state);
  const strategicCost = getTechStrategicCost(techId);
  if (!spendStrategicCost(player, strategicCost)) return false;

  const spent = copyStrategicCost(strategicCost);
  if (useQueue) {
    player.researchQueue = techId;
    player.queuedResearchStrategicSpent = spent;
  } else {
    player.currentResearch = techId;
    player.researchProgress = 0;
    player.activeResearchStrategicSpent = spent;
  }
  return true;
}

export function canCancelResearch(state: GameState, slot: 'primary' | 'queue' = 'primary'): string | null {
  const player = getPlayer(state);
  if (slot === 'primary') {
    if (!player.currentResearch) return 'No active research';
    return null;
  }
  if (!player.researchQueue) return 'No queued research';
  return null;
}

export function cancelResearch(state: GameState, slot: 'primary' | 'queue' = 'primary'): boolean {
  const err = canCancelResearch(state, slot);
  if (err) return false;

  const player = getPlayer(state);
  const techId = slot === 'primary' ? player.currentResearch! : player.researchQueue!;
  const tech = getTechnology(techId);
  const techName = tech?.name ?? techId;

  if (slot === 'primary') {
    const spent = player.activeResearchStrategicSpent;
    if (spent && !isEmptyStrategicCost(spent)) {
      refundStrategicCost(player, spent);
    }
    player.currentResearch = null;
    player.researchProgress = 0;
    player.activeResearchStrategicSpent = undefined;

    const refunded = spent && !isEmptyStrategicCost(spent);
    state.events.push({
      turn: state.turn,
      type: 'research',
      message: refunded
        ? `Research canceled: ${techName} (strategic resources refunded; progress lost)`
        : `Research canceled: ${techName} (progress lost)`,
    });
    return true;
  }

  const spent = player.queuedResearchStrategicSpent;
  if (spent && !isEmptyStrategicCost(spent)) {
    refundStrategicCost(player, spent);
  }
  player.researchQueue = null;
  player.queuedResearchStrategicSpent = undefined;

  const refunded = spent && !isEmptyStrategicCost(spent);
  state.events.push({
    turn: state.turn,
    type: 'research',
    message: refunded
      ? `Queued research canceled: ${techName} (strategic resources refunded)`
      : `Queued research canceled: ${techName}`,
  });
  return true;
}

export function saveShipDesign(state: GameState, design: ShipDesign): string | null {
  const player = getPlayer(state);
  const err = validateShipDesign(design, player.researchedTechs);
  if (err) return err;

  player.shipDesigns = player.shipDesigns ?? [];
  const existingIdx = player.shipDesigns.findIndex(d => d.id === design.id);
  if (design.isDefault) return 'Cannot overwrite default designs';

  if (existingIdx >= 0) {
    player.shipDesigns[existingIdx] = design;
  } else {
    player.shipDesigns.push(design);
  }
  return null;
}

export function createCustomShipDesignId(empireId: string): string {
  return `design-${empireId}-${Date.now()}`;
}

export function setDiplomacyAction(state: GameState, targetEmpireId: string, newState: DiplomacyState): boolean {
  const player = getPlayer(state);
  const target = state.empires.find(e => e.id === targetEmpireId);
  if (!target || target.id === player.id) return false;

  if (newState === 'war' && !canDeclareWar(player, target)) {
    state.events.push({
      turn: state.turn,
      type: 'diplomacy',
      message: `Non-aggression pact with ${target.name} prevents war declaration`,
    });
    return false;
  }

  if (newState === 'trade' || newState === 'pact' || newState === 'research_pact') {
    const rng = new SeededRNG(state.seed + state.turn * 4243 + target.id.charCodeAt(0));
    const result = submitDiplomaticProposal(state, player.id, target.id, newState, rng);
    if (result === 'failed') return false;
    if (result === 'rejected') {
      state.events.push({
        turn: state.turn,
        type: 'diplomacy',
        message: `${target.name} rejected your ${newState.replace('_', ' ')} proposal`,
      });
      return false;
    }
    if (result === 'pending') return true;
    return true;
  }

  if (newState === 'neutral' && getDiplomacy(player, target.id) === 'war') {
    const rng = new SeededRNG(state.seed + state.turn * 4243);
    const result = submitDiplomaticProposal(state, player.id, target.id, 'peace', rng);
    return result === 'accepted' || result === 'pending';
  }

  if (newState === 'war') {
    if (player.influence < WAR_DECLARATION_INFLUENCE_COST) {
      state.events.push({
        turn: state.turn,
        type: 'diplomacy',
        message: `Not enough influence to declare war (need ${WAR_DECLARATION_INFLUENCE_COST})`,
      });
      return false;
    }
    player.influence -= WAR_DECLARATION_INFLUENCE_COST;
    declareWar(player, target);
    state.events.push({
      turn: state.turn,
      type: 'diplomacy',
      message: `War declared on ${target.name} (-${WAR_DECLARATION_INFLUENCE_COST} influence)`,
    });
    return true;
  }

  player.diplomacy[target.id] = newState;
  target.diplomacy[player.id] = newState;

  state.events.push({
    turn: state.turn,
    type: 'diplomacy',
    message: `Diplomacy with ${target.name}: ${newState}`,
  });

  return true;
}

export function acceptProposalAction(state: GameState, proposalId: string): boolean {
  return acceptDiplomaticProposal(state, proposalId);
}

export function rejectProposalAction(state: GameState, proposalId: string): boolean {
  return rejectDiplomaticProposal(state, proposalId);
}

export function resolveDecisionAction(state: GameState, decisionId: string, choiceId: string): boolean {
  return resolveDecision(state, decisionId, choiceId);
}

export function getPlayerMilitaryPower(state: GameState, empireId: string): number {
  return getEmpireMilitaryPower(state, empireId);
}

export function terraformPlanetAction(state: GameState, planetId: string): boolean {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet) return false;
  const ok = terraformPlanet(planet, player);
  if (ok) {
    state.events.push({
      turn: state.turn,
      type: 'building',
      message: `Terraforming progress on ${planet.name} (${planet.terraformingProgress}/3)`,
    });
  }
  return ok;
}

export function canTerraform(state: GameState, planetId: string): string | null {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet) return 'Planet not found';
  return canTerraformPlanet(planet, player);
}

export function repairFleetAction(state: GameState, fleetId: string): boolean {
  const player = getPlayer(state);
  const ok = repairFleetAtSystem(state, fleetId, player);
  if (ok) {
    state.events.push({ turn: state.turn, type: 'production', message: 'Fleet repaired at owned system' });
  }
  return ok;
}

export function upgradeColonyAction(state: GameState, planetId: string): boolean {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet) return false;
  const ok = upgradeColonyDevelopment(planet, player);
  if (ok) {
    state.events.push({
      turn: state.turn,
      type: 'building',
      message: `${planet.name} upgraded to development level ${planet.developmentLevel}`,
    });
  }
  return ok;
}

export function canUpgradeColonyDevelopment(state: GameState, planetId: string): string | null {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet) return 'Planet not found';
  return canUpgradeColony(planet, player);
}

export function getReachableSystems(state: GameState, fleetId: string) {
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet || fleet.movesRemaining <= 0) return [];
  return getAdjacentSystems(state.systems, fleet.systemId);
}

export function clearBlockerAction(state: GameState, planetId: string, blocker: PlanetBlocker): boolean {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet || planet.ownerId !== player.id) return false;
  if (!planet.blockers?.includes(blocker)) return false;

  const cost = BLOCKER_CLEAR_COSTS[blocker];
  if (!cost || player.resources.credits < cost.credits || player.resources.industry < cost.industry) return false;

  player.resources.credits -= cost.credits;
  player.resources.industry -= cost.industry;
  clearBlocker(planet, blocker);
  state.events.push({
    turn: state.turn,
    type: 'building',
    message: `Cleared ${blocker} blocker on ${planet.name}`,
  });
  return true;
}

export function canClearBlocker(state: GameState, planetId: string, blocker: PlanetBlocker): string | null {
  const player = getPlayer(state);
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet || planet.ownerId !== player.id) return 'Planet not owned';
  if (!planet.blockers?.includes(blocker)) return 'Blocker not present';
  const cost = BLOCKER_CLEAR_COSTS[blocker];
  if (!cost) return 'Unknown blocker';
  if (player.resources.credits < cost.credits) return 'Not enough credits';
  if (player.resources.industry < cost.industry) return 'Not enough industry';
  return null;
}

export function setSystemSpecialization(state: GameState, systemId: string, spec: SystemSpecialization): boolean {
  const player = getPlayer(state);
  const system = state.systems.find(s => s.id === systemId);
  if (!system) return false;
  if (!system.planets.some(p => p.ownerId === player.id)) return false;
  system.specialization = spec;
  state.events.push({
    turn: state.turn,
    type: 'building',
    message: `${system.name} specialized as ${spec}`,
  });
  return true;
}

export function demandPeaceAction(state: GameState, targetId: string): boolean {
  const player = getPlayer(state);
  const target = state.empires.find(e => e.id === targetId);
  if (!target) return false;
  const ok = demandPeace(player, target);
  if (ok) {
    state.events.push({ turn: state.turn, type: 'diplomacy', message: `Peace demanded — ${target.name} accepts!` });
  } else {
    state.events.push({ turn: state.turn, type: 'diplomacy', message: `${target.name} refuses peace terms.` });
  }
  return ok;
}

export function demandTributeAction(state: GameState, targetId: string): boolean {
  const player = getPlayer(state);
  const target = state.empires.find(e => e.id === targetId);
  if (!target) return false;
  const ok = demandTribute(target, player);
  if (ok) {
    state.events.push({ turn: state.turn, type: 'diplomacy', message: `${target.name} pays tribute and seeks peace.` });
  } else {
    state.events.push({ turn: state.turn, type: 'diplomacy', message: `${target.name} refuses tribute.` });
  }
  return ok;
}

export function getCombatPrediction(state: GameState, fleetId: string, targetSystemId: string) {
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet) return null;
  const enemyFleets = state.fleets.filter(f =>
    f.systemId === targetSystemId &&
    f.empireId !== fleet.empireId &&
    f.ships.some(s => s.attack > 0)
  );
  if (enemyFleets.length === 0) return null;
  return predictCombatOutcome(state, fleet, enemyFleets[0], targetSystemId);
}

export function buildStarbindingArrayAction(state: GameState, systemId: string): boolean {
  return buildStarbindingArray(state, systemId, state.playerEmpireId);
}

export function canBuildStarbindingArrayAction(state: GameState, systemId: string): string | null {
  return canBuildStarbindingArray(state, systemId, state.playerEmpireId);
}

export function selectStarbindingTargetAction(state: GameState, systemId: string): boolean {
  return selectStarbindingTarget(state, systemId, state.playerEmpireId);
}

export function canSelectStarbindingTargetAction(state: GameState, systemId: string): string | null {
  return canSelectStarbindingTarget(state, systemId, state.playerEmpireId);
}

export function beginStarbindingDiveAction(state: GameState, systemId: string): boolean {
  return beginStarbindingDive(state, systemId, state.playerEmpireId);
}

export function canBeginStarbindingDiveAction(state: GameState, systemId: string): string | null {
  return canBeginStarDive(state, systemId, state.playerEmpireId);
}

export function stabilizeInertStarsilkAction(state: GameState, amount: number): boolean {
  return stabilizeInertStarsilk(state, state.playerEmpireId, amount);
}

export function beginFinalStarbindingAction(state: GameState): boolean {
  return beginFinalStarbindingExecution(state, state.playerEmpireId);
}

export function canBeginFinalStarbindingAction(state: GameState): string | null {
  return canBeginFinalExecution(state, state.playerEmpireId);
}

export function executeMacroAction(state: GameState, macroId: string, targetId: string): boolean {
  return executeMacro(state, state.playerEmpireId, macroId, targetId);
}

export function canExecuteMacroAction(state: GameState, macroId: string, targetId: string): string | null {
  return canExecuteMacro(state, state.playerEmpireId, macroId, targetId);
}

export function getMergeableFleets(state: GameState, fleetId: string): Fleet[] {
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet || fleet.empireId !== state.playerEmpireId) return [];
  return state.fleets.filter(f =>
    f.id !== fleetId &&
    f.empireId === fleet.empireId &&
    f.systemId === fleet.systemId &&
    canMergeFleets(state, fleetId, f.id) === null
  );
}
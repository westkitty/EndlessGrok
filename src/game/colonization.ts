import { COLONIZATION_CREDITS_COST, COLONIZATION_FOOD_COST, INFLUENCE_COLONIZE_COST } from './constants';
import { canColonizePlanet, countEmpirePlanets } from './economy';
import { getTraitBonuses } from './traits';
import type { ColonizationProject, Empire, GameState, Planet } from './types';

export const COLONIZATION_PROJECT_TURNS = 2;
export const REMOTE_COLONIZATION_TURNS = 3;

let colonizationCounter = 0;

export function resetColonizationCounter(): void {
  colonizationCounter = 0;
}

function createColonizationId(): string {
  return `colonize-${colonizationCounter++}`;
}

export function getColonizationProjectForPlanet(state: GameState, planetId: string): ColonizationProject | undefined {
  return (state.colonizationProjects ?? []).find(p => p.planetId === planetId);
}

export function getEmpireColonizationProjects(state: GameState, empireId: string): ColonizationProject[] {
  return (state.colonizationProjects ?? []).filter(p => p.empireId === empireId);
}

export function canStartColonization(
  state: GameState,
  planet: Planet,
  empire: Empire
): string | null {
  if (planet.isColonized) return 'Already colonized';
  if (getColonizationProjectForPlanet(state, planet.id)) return 'Colonization already in progress';

  const system = state.systems.find(s => s.id === planet.systemId);
  if (!system) return 'System not found';
  if (!canColonizePlanet(planet, empire, system)) return 'Cannot colonize this planet type';

  const influenceCost = Math.ceil(INFLUENCE_COLONIZE_COST * getTraitBonuses(empire.trait).colonizeCostMod);
  if (empire.influence < influenceCost) return 'Not enough influence';

  const hasFleet = state.fleets.some(f =>
    f.empireId === empire.id && f.systemId === system.id && f.hasColonyShip
  );

  if (hasFleet) return null;

  const hasConnection = state.systems.some(s =>
    s.planets.some(p => p.ownerId === empire.id) &&
    s.connections.includes(system.id)
  );
  if (!hasConnection) return 'No connected owned system';
  if (empire.resources.credits < COLONIZATION_CREDITS_COST) return 'Not enough credits';
  if (empire.resources.food < COLONIZATION_FOOD_COST) return 'Not enough food';

  return null;
}

export function startColonizationProject(
  state: GameState,
  planetId: string,
  empire: Empire
): ColonizationProject | null {
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === planetId);
  if (!planet) return null;

  const err = canStartColonization(state, planet, empire);
  if (err) return null;

  const system = state.systems.find(s => s.id === planet.systemId)!;
  const influenceCost = Math.ceil(INFLUENCE_COLONIZE_COST * getTraitBonuses(empire.trait).colonizeCostMod);

  const colonyFleet = state.fleets.find(f =>
    f.empireId === empire.id && f.systemId === system.id && f.hasColonyShip
  );

  const usedColonyShip = !!colonyFleet;
  const turns = usedColonyShip ? COLONIZATION_PROJECT_TURNS : REMOTE_COLONIZATION_TURNS;

  if (colonyFleet) {
    state.fleets = state.fleets.filter(f => f.id !== colonyFleet.id);
  } else {
    empire.resources.credits -= COLONIZATION_CREDITS_COST;
    empire.resources.food -= COLONIZATION_FOOD_COST;
  }

  empire.influence -= influenceCost;

  const project: ColonizationProject = {
    id: createColonizationId(),
    planetId: planet.id,
    systemId: system.id,
    empireId: empire.id,
    turnsRemaining: turns,
    totalTurns: turns,
    usedColonyShip,
  };

  state.colonizationProjects = [...(state.colonizationProjects ?? []), project];
  state.events.push({
    turn: state.turn,
    type: 'colonize',
    message: `Colonization of ${planet.name} begun (${turns} turns)`,
  });

  return project;
}

function completeColonization(state: GameState, project: ColonizationProject): void {
  const planet = state.systems.flatMap(s => s.planets).find(p => p.id === project.planetId);
  const system = state.systems.find(s => s.id === project.systemId);
  const empire = state.empires.find(e => e.id === project.empireId);
  if (!planet || !system || !empire) return;

  planet.isColonized = true;
  planet.ownerId = empire.id;
  planet.population = project.usedColonyShip ? 4 : 2;
  planet.happiness = 60;
  planet.approval = 55;
  empire.totalPlanets = countEmpirePlanets(empire.id, state.systems);

  state.events.push({
    turn: state.turn,
    type: 'colonize',
    message: `${empire.name} established colony on ${planet.name} in ${system.name}`,
  });
}

export function processColonizationProjects(state: GameState): number {
  const projects = state.colonizationProjects ?? [];
  if (projects.length === 0) return 0;

  const remaining: ColonizationProject[] = [];
  let completed = 0;

  for (const project of projects) {
    project.turnsRemaining--;
    if (project.turnsRemaining <= 0) {
      completeColonization(state, project);
      completed++;
    } else {
      remaining.push(project);
    }
  }

  state.colonizationProjects = remaining;
  return completed;
}
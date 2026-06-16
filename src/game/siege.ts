import { SIEGE_OUTPUT_PENALTY } from './constants';
import { areAtWar } from './diplomacy';
import type { GameState, StarSystem } from './types';

export function updateSiegeStatus(state: GameState): void {
  for (const system of state.systems) {
    system.siegeBlockaders = [];
  }

  for (const fleet of state.fleets) {
    if (!fleet.ships.some(s => s.attack > 0)) continue;

    const system = state.systems.find(s => s.id === fleet.systemId);
    if (!system) continue;

    const owners = new Set(
      system.planets.filter(p => p.isColonized && p.ownerId).map(p => p.ownerId!)
    );
    if (owners.size !== 1) continue;

    const ownerId = [...owners][0];
    if (ownerId === fleet.empireId) continue;

    const fleetEmpire = state.empires.find(e => e.id === fleet.empireId);
    const ownerEmpire = state.empires.find(e => e.id === ownerId);
    if (!fleetEmpire || !ownerEmpire) continue;

    if (areAtWar(fleetEmpire, ownerEmpire)) {
      if (!system.siegeBlockaders.includes(fleet.empireId)) {
        system.siegeBlockaders.push(fleet.empireId);
      }
    }
  }
}

export function isSystemUnderSiege(system: StarSystem): boolean {
  return system.siegeBlockaders.length > 0;
}

export function getSiegeOutputModifier(system: StarSystem): number {
  return isSystemUnderSiege(system) ? 1 - SIEGE_OUTPUT_PENALTY : 1;
}

export function processSiegeEffects(state: GameState): void {
  updateSiegeStatus(state);

  for (const system of state.systems) {
    if (!isSystemUnderSiege(system)) continue;
    const owner = system.planets.find(p => p.isColonized)?.ownerId;
    if (!owner) continue;
    const empire = state.empires.find(e => e.id === owner);
    if (!empire) continue;

    for (const planet of system.planets) {
      if (planet.ownerId === owner && planet.isColonized) {
        planet.happiness = Math.max(0, planet.happiness - 3);
        planet.approval = Math.max(0, planet.approval - 2);
      }
    }
  }
}
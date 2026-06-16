import { getAdjacentSystems } from './galaxy';
import { updateEmpireIntel } from './intel';
import { hasUnlock } from './research';
import type { Empire, Fleet, GameState, StarSystem } from './types';

export function revealSystem(empire: Empire, systemId: string): void {
  empire.knownSystems.add(systemId);
  empire.visibleSystems.add(systemId);
}

export function updateVisibility(empire: Empire, systems: StarSystem[], fleets: Fleet[], state?: GameState): void {
  empire.visibleSystems.clear();

  for (const systemId of empire.knownSystems) {
    empire.visibleSystems.add(systemId);
  }

  // Reveal systems with owned planets
  for (const system of systems) {
    if (system.planets.some(p => p.ownerId === empire.id)) {
      revealSystem(empire, system.id);
      for (const adj of getAdjacentSystems(systems, system.id)) {
        empire.knownSystems.add(adj.id);
        empire.visibleSystems.add(adj.id);
      }
    }
  }

  // Reveal systems with fleets
  for (const fleet of fleets) {
    if (fleet.empireId === empire.id) {
      revealSystem(empire, fleet.systemId);
      for (const adj of getAdjacentSystems(systems, fleet.systemId)) {
        empire.knownSystems.add(adj.id);
        empire.visibleSystems.add(adj.id);

        if (hasUnlock(empire.researchedTechs, 'sensor_boost')) {
          for (const adj2 of getAdjacentSystems(systems, adj.id)) {
            empire.knownSystems.add(adj2.id);
            empire.visibleSystems.add(adj2.id);
          }
        }
      }

      if (hasUnlock(empire.researchedTechs, 'deep_scan')) {
        for (const adj of getAdjacentSystems(systems, fleet.systemId)) {
          for (const adj2 of getAdjacentSystems(systems, adj.id)) {
            empire.knownSystems.add(adj2.id);
            empire.visibleSystems.add(adj2.id);
          }
        }
      }
    }
  }

  if (state) {
    updateEmpireIntel(state, empire);
  }
}
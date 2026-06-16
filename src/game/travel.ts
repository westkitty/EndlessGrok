import { areSystemsConnected } from './galaxy';
import type { Fleet, GameState, StarSystem } from './types';

export function findPath(
  systems: StarSystem[],
  fromId: string,
  toId: string
): string[] | null {
  if (fromId === toId) return [fromId];

  const visited = new Set<string>([fromId]);
  const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const sys = systems.find(s => s.id === current.id);
    if (!sys) continue;

    for (const connId of sys.connections) {
      if (visited.has(connId)) continue;
      const newPath = [...current.path, connId];
      if (connId === toId) return newPath;
      visited.add(connId);
      queue.push({ id: connId, path: newPath });
    }
  }

  return null;
}

export function getFleetPath(state: GameState, fleetId: string): string[] {
  const fleet = state.fleets.find(f => f.id === fleetId);
  if (!fleet) return [];
  if (fleet.travelPath.length > 0) return [...fleet.travelPath];
  if (!fleet.destinationSystemId) return [];
  const path = findPath(state.systems, fleet.systemId, fleet.destinationSystemId);
  return path ?? [];
}

export function canReachSystem(
  systems: StarSystem[],
  fromId: string,
  toId: string
): boolean {
  return findPath(systems, fromId, toId) !== null;
}

export function getNextHop(path: string[], currentSystemId: string): string | null {
  const idx = path.indexOf(currentSystemId);
  if (idx < 0 || idx >= path.length - 1) return null;
  return path[idx + 1];
}

export function setFleetTravelPath(
  fleet: Fleet,
  systems: StarSystem[],
  targetSystemId: string | null
): boolean {
  if (!targetSystemId) {
    fleet.destinationSystemId = null;
    fleet.travelPath = [];
    fleet.travelTurns = 0;
    return true;
  }

  const path = findPath(systems, fleet.systemId, targetSystemId);
  if (!path || path.length < 2) return false;

  fleet.destinationSystemId = targetSystemId;
  fleet.travelPath = path;
  fleet.travelTurns = path.length - 1;
  return true;
}

export function processFleetMovement(fleet: Fleet, systems: StarSystem[]): boolean {
  if (!fleet.destinationSystemId || fleet.movesRemaining <= 0) return false;

  if (fleet.systemId === fleet.destinationSystemId) {
    fleet.destinationSystemId = null;
    fleet.travelPath = [];
    fleet.travelTurns = 0;
    return false;
  }

  let nextHop: string | null = null;

  if (fleet.travelPath.length > 0) {
    nextHop = getNextHop(fleet.travelPath, fleet.systemId);
  } else if (fleet.destinationSystemId) {
    if (areSystemsConnected(systems, fleet.systemId, fleet.destinationSystemId)) {
      nextHop = fleet.destinationSystemId;
    }
  }

  if (!nextHop) return false;

  fleet.systemId = nextHop;
  fleet.movesRemaining--;
  fleet.travelTurns = Math.max(0, fleet.travelTurns - 1);

  if (fleet.systemId === fleet.destinationSystemId) {
    fleet.destinationSystemId = null;
    fleet.travelPath = [];
    fleet.travelTurns = 0;
  }

  return true;
}
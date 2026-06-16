import type { Empire, GameState, StarSystem } from './types';

export function recordSystemIntel(empire: Empire, systemId: string, turn: number): void {
  empire.lastSeenSystems = empire.lastSeenSystems ?? {};
  empire.lastSeenSystems[systemId] = turn;
}

export function updateEmpireIntel(state: GameState, empire: Empire): void {
  for (const systemId of empire.visibleSystems) {
    recordSystemIntel(empire, systemId, state.turn);
  }
}

export function getSystemIntelAge(empire: Empire, systemId: string, currentTurn: number): number | null {
  const lastSeen = empire.lastSeenSystems?.[systemId];
  if (lastSeen === undefined) return null;
  return currentTurn - lastSeen;
}

export function isStaleIntel(empire: Empire, system: StarSystem, currentTurn: number): boolean {
  const isKnown = empire.knownSystems.has(system.id);
  const isVisible = empire.visibleSystems.has(system.id);
  if (!isKnown || isVisible) return false;
  const age = getSystemIntelAge(empire, system.id, currentTurn);
  return age !== null && age > 0;
}

export function getIntelLabel(empire: Empire, system: StarSystem, currentTurn: number): string {
  if (!empire.knownSystems.has(system.id)) return 'Unknown';
  if (empire.visibleSystems.has(system.id)) return 'Current';
  const age = getSystemIntelAge(empire, system.id, currentTurn);
  if (age === null) return 'Rumored';
  if (age <= 2) return `Stale (${age}t ago)`;
  return `Outdated (${age}t ago)`;
}
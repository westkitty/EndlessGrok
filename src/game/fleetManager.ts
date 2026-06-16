import { calculateFleetUpkeep } from './upkeep';
import { getFleetRole, getFleetRoleLabel, getPrimaryShipType } from './fleetRoles';
import { getFleetPower } from './ships';
import { getFleetPath } from './travel';
import { getShipDisplayName } from './ships';
import type { Fleet, GameState } from './types';

export type FleetFilter = 'all' | 'idle' | 'moving' | 'scout' | 'military' | 'colony';

export interface FleetSummary {
  fleet: Fleet;
  name: string;
  systemName: string;
  destinationName: string | null;
  status: 'idle' | 'moving' | 'stationed';
  etaTurns: number | null;
  role: string;
  shipCount: number;
  strength: number;
  upkeep: number;
  stance: Fleet['stance'];
  autoExplore: boolean;
}

export function getFleetDisplayName(fleet: Fleet, state: GameState): string {
  const system = state.systems.find(s => s.id === fleet.systemId);
  const primary = getPrimaryShipType(fleet);
  const label = getShipDisplayName(primary);
  const suffix = fleet.ships.length > 1 ? ` ×${fleet.ships.length}` : '';
  return `${label} Fleet${suffix}${system ? ` @ ${system.name}` : ''}`;
}

export function getFleetStatus(fleet: Fleet): 'idle' | 'moving' | 'stationed' {
  if (fleet.destinationSystemId) return 'moving';
  if (fleet.movesRemaining <= 0) return 'stationed';
  return 'idle';
}

export function getFleetEta(fleet: Fleet, state: GameState): number | null {
  if (!fleet.destinationSystemId) return null;
  if (fleet.travelTurns > 0) return fleet.travelTurns;
  const path = getFleetPath(state, fleet.id);
  if (path.length > 1) return path.length - 1;
  return 1;
}

export function getFleetStrength(fleet: Fleet): number {
  const power = getFleetPower(fleet.ships, 1, 1);
  return power.attack + power.defense;
}

export function buildFleetSummary(fleet: Fleet, state: GameState): FleetSummary {
  const system = state.systems.find(s => s.id === fleet.systemId);
  const dest = fleet.destinationSystemId
    ? state.systems.find(s => s.id === fleet.destinationSystemId)
    : null;

  return {
    fleet,
    name: getFleetDisplayName(fleet, state),
    systemName: system?.name ?? 'Unknown',
    destinationName: dest?.name ?? null,
    status: getFleetStatus(fleet),
    etaTurns: getFleetEta(fleet, state),
    role: getFleetRoleLabel(getFleetRole(fleet)),
    shipCount: fleet.ships.length,
    strength: getFleetStrength(fleet),
    upkeep: calculateFleetUpkeep([fleet]),
    stance: fleet.stance,
    autoExplore: fleet.autoExplore,
  };
}

export function getPlayerFleetSummaries(state: GameState): FleetSummary[] {
  const player = state.empires.find(e => e.id === state.playerEmpireId);
  if (!player) return [];

  return state.fleets
    .filter(f => f.empireId === player.id)
    .map(f => buildFleetSummary(f, state))
    .sort((a, b) => {
      if (a.status === 'moving' && b.status !== 'moving') return -1;
      if (b.status === 'moving' && a.status !== 'moving') return 1;
      return a.name.localeCompare(b.name);
    });
}

export function filterFleetSummaries(summaries: FleetSummary[], filter: FleetFilter): FleetSummary[] {
  if (filter === 'all') return summaries;
  if (filter === 'idle') return summaries.filter(s => s.status === 'idle');
  if (filter === 'moving') return summaries.filter(s => s.status === 'moving');
  if (filter === 'scout') return summaries.filter(s => s.role === 'Explorer' || s.role === 'Task Force');
  if (filter === 'military') return summaries.filter(s => ['Battle Fleet', 'Siege Group', 'Task Force'].includes(s.role));
  if (filter === 'colony') return summaries.filter(s => s.role === 'Colony Transport');
  return summaries;
}
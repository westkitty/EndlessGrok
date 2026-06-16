import type { Fleet, ShipType } from './types';

export type FleetRole = 'scout' | 'colony' | 'military' | 'siege' | 'mixed' | 'civilian';

export function getFleetRole(fleet: Fleet): FleetRole {
  if (fleet.hasColonyShip) return 'colony';
  const types = fleet.ships.map(s => s.type);
  const hasCombat = types.some(t => ['frigate', 'cruiser', 'destroyer', 'carrier', 'dreadnought'].includes(t));
  const scoutOnly = types.every(t => t === 'scout');
  const allMilitary = types.every(t => t !== 'scout' && t !== 'colony');

  if (scoutOnly) return 'scout';
  if (!hasCombat) return 'civilian';
  if (allMilitary && types.some(t => t === 'destroyer' || t === 'dreadnought')) return 'siege';
  if (hasCombat && types.some(t => t === 'scout')) return 'mixed';
  return 'military';
}

export function getFleetRoleLabel(role: FleetRole): string {
  const labels: Record<FleetRole, string> = {
    scout: 'Explorer',
    colony: 'Colony Transport',
    military: 'Battle Fleet',
    siege: 'Siege Group',
    mixed: 'Task Force',
    civilian: 'Support',
  };
  return labels[role];
}

export function getScoutMoveBonus(fleet: Fleet): number {
  const role = getFleetRole(fleet);
  if (role === 'scout') return 1;
  if (role === 'mixed' && fleet.ships.every(s => s.type === 'scout' || s.attack === 0)) return 1;
  return 0;
}

export function getPrimaryShipType(fleet: Fleet): ShipType {
  const counts: Partial<Record<ShipType, number>> = {};
  for (const ship of fleet.ships) {
    counts[ship.type] = (counts[ship.type] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as ShipType ?? 'scout';
}
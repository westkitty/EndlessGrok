import type { Empire, ShipType, StrategicResources } from './types';

export type StrategicCost = Partial<StrategicResources>;

export const SHIP_STRATEGIC_COSTS: Partial<Record<ShipType, StrategicCost>> = {
  cruiser: { titanium: 1 },
  destroyer: { titanium: 2 },
  carrier: { titanium: 2, antimatter: 1 },
  dreadnought: { titanium: 3, antimatter: 2, darkmatter: 1 },
};

export const TECH_STRATEGIC_COSTS: Partial<Record<string, StrategicCost>> = {
  cruiser_design: { titanium: 1 },
  destroyer_design: { titanium: 2 },
  carrier_design: { titanium: 1, antimatter: 1 },
  dreadnought_design: { titanium: 3, antimatter: 2 },
  quantum_computing: { antimatter: 2 },
  singularity_drive: { darkmatter: 2 },
  planetary_shield: { titanium: 2 },
  siege_tactics: { titanium: 1 },
};

const STRATEGIC_KEYS: (keyof StrategicResources)[] = ['titanium', 'antimatter', 'darkmatter'];

export function getShipStrategicCost(type: ShipType): StrategicCost {
  return SHIP_STRATEGIC_COSTS[type] ?? {};
}

export function getTechStrategicCost(techId: string): StrategicCost {
  return TECH_STRATEGIC_COSTS[techId] ?? {};
}

export function hasStrategicCost(cost: StrategicCost): boolean {
  return STRATEGIC_KEYS.some(key => (cost[key] ?? 0) > 0);
}

export function canAffordStrategicCost(empire: Empire, cost: StrategicCost): boolean {
  return getMissingStrategicResources(empire, cost).length === 0;
}

export function getMissingStrategicResources(
  empire: Empire,
  cost: StrategicCost,
): { resource: keyof StrategicResources; required: number; have: number }[] {
  const missing: { resource: keyof StrategicResources; required: number; have: number }[] = [];
  for (const key of STRATEGIC_KEYS) {
    const required = cost[key] ?? 0;
    if (required <= 0) continue;
    const have = empire.strategicResources[key];
    if (have < required) {
      missing.push({ resource: key, required, have });
    }
  }
  return missing;
}

export function spendStrategicCost(empire: Empire, cost: StrategicCost): boolean {
  if (!canAffordStrategicCost(empire, cost)) return false;
  for (const key of STRATEGIC_KEYS) {
    const amount = cost[key] ?? 0;
    if (amount > 0) {
      empire.strategicResources[key] -= amount;
    }
  }
  return true;
}

export function refundStrategicCost(empire: Empire, cost: StrategicCost): void {
  for (const key of STRATEGIC_KEYS) {
    const amount = cost[key] ?? 0;
    if (amount > 0) {
      empire.strategicResources[key] += amount;
    }
  }
}

export function copyStrategicCost(cost: StrategicCost): StrategicResources {
  return {
    titanium: cost.titanium ?? 0,
    antimatter: cost.antimatter ?? 0,
    darkmatter: cost.darkmatter ?? 0,
  };
}

export function isEmptyStrategicCost(cost: StrategicCost | undefined): boolean {
  if (!cost) return true;
  return STRATEGIC_KEYS.every(key => (cost[key] ?? 0) <= 0);
}

export function formatStrategicCost(cost: StrategicCost): string {
  const parts = STRATEGIC_KEYS
    .filter(key => (cost[key] ?? 0) > 0)
    .map(key => `${cost[key]} ${key}`);
  return parts.length > 0 ? parts.join(', ') : '';
}

export function formatMissingStrategicResources(
  empire: Empire,
  cost: StrategicCost,
): string {
  const missing = getMissingStrategicResources(empire, cost);
  if (missing.length === 0) return '';
  return `Missing: ${missing.map(m => `${m.resource} (need ${m.required}, have ${m.have})`).join(', ')}`;
}

export function getStrategicCostBreakdown(
  empire: Empire,
  cost: StrategicCost,
): { affordable: boolean; formatted: string; missing: string } {
  const formatted = formatStrategicCost(cost);
  const missing = formatMissingStrategicResources(empire, cost);
  return {
    affordable: missing === '',
    formatted,
    missing,
  };
}
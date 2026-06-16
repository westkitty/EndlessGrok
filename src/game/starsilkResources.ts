import { hasUnlock } from './research';
import type { Empire, Planet, StarSystem, StarsilkDepositType, StarsilkResources } from './types';

export const STARSILK_RESOURCE_KEYS: (keyof StarsilkResources)[] = [
  'starsilkThread',
  'inertStarsilk',
  'syrinReagent',
  'archiveData',
  'bloodRingGlass',
  'siegeLatticeFragment',
];

export const STARSILK_RESOURCE_LABELS: Record<keyof StarsilkResources, string> = {
  starsilkThread: 'Starsilk Thread',
  inertStarsilk: 'Inert Starsilk',
  syrinReagent: 'Syrin Reagent',
  archiveData: 'Archive Data',
  bloodRingGlass: 'Blood Ring Glass',
  siegeLatticeFragment: 'Siege Lattice Fragment',
};

export function createEmptyStarsilkResources(): StarsilkResources {
  return {
    starsilkThread: 0,
    inertStarsilk: 0,
    syrinReagent: 0,
    archiveData: 0,
    bloodRingGlass: 0,
    siegeLatticeFragment: 0,
  };
}

export function ensureStarsilkResources(empire: Empire): StarsilkResources {
  if (!empire.starsilkResources) {
    empire.starsilkResources = createEmptyStarsilkResources();
  }
  return empire.starsilkResources;
}

const DEPOSIT_YIELDS: Record<StarsilkDepositType, Partial<StarsilkResources>> = {
  none: {},
  starsilk_leak: { starsilkThread: 1 },
  syrin_trace: { syrinReagent: 1 },
  blood_ring_remnant: { bloodRingGlass: 1 },
  siege_lattice_shard: { siegeLatticeFragment: 1 },
  archive_light_field: { archiveData: 1 },
  biomass_scar: { bloodRingGlass: 1, archiveData: 1 },
};

export function getDepositYield(deposit: StarsilkDepositType): Partial<StarsilkResources> {
  return DEPOSIT_YIELDS[deposit] ?? {};
}

export function previewStarsilkIncome(empire: Empire, systems: StarSystem[]): StarsilkResources {
  const preview = createEmptyStarsilkResources();
  const hasArchive = hasUnlock(empire.researchedTechs, 'archive_syntax');
  const hasExtraction = hasUnlock(empire.researchedTechs, 'starsilk_extraction');

  for (const system of systems) {
    if (system.starState === 'collapsed_black_hole' && system.planets.some(p => p.ownerId === empire.id)) {
      preview.siegeLatticeFragment += 1;
    }
    for (const planet of system.planets) {
      if (planet.ownerId !== empire.id || !planet.isColonized) continue;
      const deposit = planet.starsilkDeposit ?? 'none';
      if (deposit === 'none') continue;
      if (!hasExtraction && deposit !== 'archive_light_field') continue;
      const yieldRes = getDepositYield(deposit);
      for (const key of STARSILK_RESOURCE_KEYS) {
        preview[key] += yieldRes[key] ?? 0;
      }
    }
    if (hasArchive && system.isArchiveStar && system.planets.some(p => p.ownerId === empire.id && p.isColonized)) {
      preview.archiveData += 1;
    }
  }
  return preview;
}

export function extractStarsilkResources(empire: Empire, systems: StarSystem[]): StarsilkResources {
  const gained = previewStarsilkIncome(empire, systems);
  const pool = ensureStarsilkResources(empire);
  for (const key of STARSILK_RESOURCE_KEYS) {
    pool[key] += gained[key];
  }
  return gained;
}

export function canAffordStarsilkCost(empire: Empire, cost: Partial<StarsilkResources>): boolean {
  const pool = ensureStarsilkResources(empire);
  return STARSILK_RESOURCE_KEYS.every(key => pool[key] >= (cost[key] ?? 0));
}

export function spendStarsilkCost(empire: Empire, cost: Partial<StarsilkResources>): boolean {
  if (!canAffordStarsilkCost(empire, cost)) return false;
  const pool = ensureStarsilkResources(empire);
  for (const key of STARSILK_RESOURCE_KEYS) {
    const amount = cost[key] ?? 0;
    if (amount > 0) pool[key] -= amount;
  }
  return true;
}

export function inertStarsilkThread(empire: Empire, amount: number): boolean {
  const pool = ensureStarsilkResources(empire);
  const syrinNeeded = Math.ceil(amount / 2);
  if (pool.starsilkThread < amount || pool.syrinReagent < syrinNeeded) return false;
  pool.starsilkThread -= amount;
  pool.syrinReagent -= syrinNeeded;
  pool.inertStarsilk += amount;
  return true;
}

export function formatStarsilkCost(cost: Partial<StarsilkResources>): string {
  return STARSILK_RESOURCE_KEYS
    .filter(key => (cost[key] ?? 0) > 0)
    .map(key => `${cost[key]} ${STARSILK_RESOURCE_LABELS[key]}`)
    .join(', ');
}

export function pickStarsilkDeposit(rng: { next: () => number; pick: <T>(arr: T[]) => T }): StarsilkDepositType {
  if (rng.next() > 0.18) return 'none';
  const types: StarsilkDepositType[] = [
    'starsilk_leak',
    'syrin_trace',
    'archive_light_field',
    'siege_lattice_shard',
    'blood_ring_remnant',
    'biomass_scar',
  ];
  return rng.pick(types);
}

export function migratePlanetStarsilk(planet: Planet): Planet {
  return { ...planet, starsilkDeposit: planet.starsilkDeposit ?? 'none' };
}
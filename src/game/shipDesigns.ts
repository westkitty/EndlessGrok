import {
  COLONY_SHIP_COST,
  CRUISER_COST,
  DESTROYER_COST,
  DREADNOUGHT_COST,
  FRIGATE_COST,
  CARRIER_COST,
  SCOUT_COST,
} from './constants';
import { hasUnlock } from './research';
import {
  getDefaultModuleForHull,
  getModule,
  getModulesByCategory,
  type ModuleCategory,
  type ShipModuleDef,
} from './shipModules';
import { getShipStrategicCost, type StrategicCost } from './strategicResources';
import { SHIP_STATS } from './ships';
import type { DefenseType, Empire, Ship, ShipDesign, ShipDesignModules, ShipType, WeaponType } from './types';

export type { ShipDesign, ShipDesignModules };

export interface ShipDesignStats {
  attack: number;
  defense: number;
  hp: number;
  maxHp: number;
  speed: number;
  upkeep: number;
  weaponType: WeaponType;
  defenseType: DefenseType;
  roleModifier?: string;
}

export interface ShipDesignCost {
  credits: number;
  industry: number;
  strategic: StrategicCost;
  turns: number;
}

const HULL_ROLES: Record<ShipType, string> = {
  scout: 'Explorer',
  frigate: 'Patrol',
  cruiser: 'Line Warship',
  destroyer: 'Assault',
  carrier: 'Carrier',
  colony: 'Colonizer',
  dreadnought: 'Capital',
};

const HULL_TECH: Partial<Record<ShipType, string>> = {
  scout: 'scout',
  frigate: 'frigate',
  cruiser: 'cruiser',
  destroyer: 'destroyer',
  carrier: 'carrier',
  colony: 'scout',
  dreadnought: 'dreadnought',
};

const HULL_INDUSTRY_COSTS: Record<ShipType, { credits: number; industry: number }> = {
  scout: SCOUT_COST,
  frigate: FRIGATE_COST,
  cruiser: CRUISER_COST,
  destroyer: DESTROYER_COST,
  carrier: CARRIER_COST,
  colony: COLONY_SHIP_COST,
  dreadnought: DREADNOUGHT_COST,
};

const HULL_TURNS: Record<ShipType, number> = {
  scout: 1,
  frigate: 2,
  cruiser: 3,
  destroyer: 4,
  carrier: 5,
  colony: 2,
  dreadnought: 6,
};

function getDesignModules(design: ShipDesign): ShipModuleDef[] {
  return (['weapon', 'defense', 'engine', 'utility'] as ModuleCategory[]).map(cat => {
    const mod = getModule(design.modules[cat]);
    return mod ?? getModule(getDefaultModuleForHull(design.hull, cat))!;
  });
}

export function createDefaultModulesForHull(hull: ShipType): ShipDesignModules {
  return {
    weapon: getDefaultModuleForHull(hull, 'weapon'),
    defense: getDefaultModuleForHull(hull, 'defense'),
    engine: getDefaultModuleForHull(hull, 'engine'),
    utility: getDefaultModuleForHull(hull, 'utility'),
  };
}

export function createDefaultShipDesigns(): ShipDesign[] {
  const hulls: ShipType[] = ['scout', 'frigate', 'cruiser', 'destroyer', 'carrier', 'colony', 'dreadnought'];
  return hulls.map(hull => ({
    id: `default-${hull}`,
    name: `${HULL_ROLES[hull]} ${hull.charAt(0).toUpperCase() + hull.slice(1)}`,
    hull,
    role: HULL_ROLES[hull],
    modules: createDefaultModulesForHull(hull),
    isDefault: true,
  }));
}

export function getDefaultDesignForHull(designs: ShipDesign[], hull: ShipType): ShipDesign | undefined {
  return designs.find(d => d.hull === hull && d.isDefault)
    ?? designs.find(d => d.hull === hull);
}

export function getAvailableModules(
  hull: ShipType,
  category: ModuleCategory,
  researchedTechs: string[],
): ShipModuleDef[] {
  return getModulesByCategory(category).filter(mod => {
    if (mod.hullTypes && !mod.hullTypes.includes(hull)) return false;
    if (mod.requiredTech) {
      const techUnlocked = researchedTechs.includes(mod.requiredTech)
        || hasUnlock(researchedTechs, mod.requiredTech);
      if (!techUnlocked) return false;
    }
    if (hull === 'colony' && category === 'weapon' && mod.attack && mod.attack > 0 && mod.id !== 'kinetic_cannon') {
      return false;
    }
    return true;
  });
}

export function calculateShipDesignStats(design: ShipDesign): ShipDesignStats {
  const base = SHIP_STATS[design.hull];
  const modules = getDesignModules(design);

  let attack = base.attack;
  let defense = base.defense;
  let hp = base.maxHp;
  let speed = base.speed;
  let upkeep = 0;
  let weaponType: WeaponType = 'kinetic';
  let defenseType: DefenseType = 'armor';
  let roleModifier: string | undefined;

  for (const mod of modules) {
    attack += mod.attack ?? 0;
    defense += mod.defense ?? 0;
    hp += mod.hp ?? 0;
    speed += mod.speed ?? 0;
    upkeep += mod.upkeep ?? 0;
    if (mod.weaponType) weaponType = mod.weaponType;
    if (mod.defenseType) defenseType = mod.defenseType;
    if (mod.roleModifier) roleModifier = mod.roleModifier;
  }

  return {
    attack: Math.max(0, attack),
    defense: Math.max(0, defense),
    hp: Math.max(1, hp),
    maxHp: Math.max(1, hp),
    speed: Math.max(1, speed),
    upkeep,
    weaponType,
    defenseType,
    roleModifier,
  };
}

export function calculateShipDesignCost(design: ShipDesign): ShipDesignCost {
  const hullCost = HULL_INDUSTRY_COSTS[design.hull];
  const modules = getDesignModules(design);
  let credits = hullCost.credits;
  let industry = hullCost.industry;
  const strategic: StrategicCost = { ...getShipStrategicCost(design.hull) };

  for (const mod of modules) {
    credits += mod.creditsCost ?? 0;
    industry += mod.industryCost ?? 0;
    if (mod.strategicCost) {
      for (const key of ['titanium', 'antimatter', 'darkmatter'] as const) {
        strategic[key] = (strategic[key] ?? 0) + (mod.strategicCost[key] ?? 0);
      }
    }
  }

  return {
    credits,
    industry,
    strategic,
    turns: HULL_TURNS[design.hull],
  };
}

export function validateShipDesign(design: ShipDesign, researchedTechs: string[]): string | null {
  const tech = HULL_TECH[design.hull];
  if (tech && !hasUnlock(researchedTechs, tech)) {
    return `Requires ${tech} technology`;
  }

  for (const category of ['weapon', 'defense', 'engine', 'utility'] as ModuleCategory[]) {
    const moduleId = design.modules[category];
    const mod = getModule(moduleId);
    if (!mod) return `Unknown ${category} module: ${moduleId}`;
    if (mod.category !== category) return `${moduleId} is not a ${category} module`;
    if (mod.hullTypes && !mod.hullTypes.includes(design.hull)) {
      return `${mod.name} cannot be installed on ${design.hull}`;
    }
    if (mod.requiredTech) {
      const unlocked = researchedTechs.includes(mod.requiredTech) || hasUnlock(researchedTechs, mod.requiredTech);
      if (!unlocked) return `${mod.name} requires ${mod.requiredTech}`;
    }
    const available = getAvailableModules(design.hull, category, researchedTechs);
    if (!available.some(m => m.id === moduleId)) {
      return `${mod.name} is not available for this hull`;
    }
  }

  if (!design.name.trim()) return 'Design needs a name';
  return null;
}

export function canBuildShipDesign(design: ShipDesign, empire: Empire): string | null {
  const validation = validateShipDesign(design, empire.researchedTechs);
  if (validation) return validation;

  const cost = calculateShipDesignCost(design);
  if (empire.resources.credits < cost.credits) return 'Not enough credits';
  if (empire.resources.industry < cost.industry) return 'Not enough industry';

  const missing = getMissingShipDesignRequirements(empire, design);
  if (missing.length > 0) {
    return `Missing: ${missing.map(m => `${m.resource} (need ${m.required}, have ${m.have})`).join(', ')}`;
  }

  return null;
}

export function getMissingShipDesignRequirements(
  empire: Empire,
  design: ShipDesign,
): { resource: keyof StrategicCost; required: number; have: number }[] {
  const cost = calculateShipDesignCost(design);
  const missing: { resource: keyof StrategicCost; required: number; have: number }[] = [];
  for (const key of ['titanium', 'antimatter', 'darkmatter'] as const) {
    const required = cost.strategic[key] ?? 0;
    if (required <= 0) continue;
    const have = empire.strategicResources[key];
    if (have < required) missing.push({ resource: key, required, have });
  }
  return missing;
}

export function updateShipDesignModule(
  design: ShipDesign,
  category: ModuleCategory,
  moduleId: string,
): ShipDesign {
  return {
    ...design,
    modules: { ...design.modules, [category]: moduleId },
  };
}

export function createShipFromDesign(design: ShipDesign): Ship {
  const stats = calculateShipDesignStats(design);
  return {
    type: design.hull,
    designId: design.id,
    hp: stats.hp,
    maxHp: stats.maxHp,
    attack: stats.attack,
    defense: stats.defense,
    speed: stats.speed,
    weaponType: stats.weaponType,
    defenseType: stats.defenseType,
  };
}

export function hydrateShipDesign(ship: Ship, designs: ShipDesign[]): Ship {
  if (ship.designId) {
    const design = designs.find(d => d.id === ship.designId);
    if (design) return createShipFromDesign(design);
  }
  const defaultDesign = getDefaultDesignForHull(designs, ship.type);
  if (defaultDesign) {
    const hydrated = createShipFromDesign(defaultDesign);
    return { ...hydrated, hp: Math.min(ship.hp, hydrated.maxHp) };
  }
  return ship;
}

export function getDesignDisplayStats(design: ShipDesign): string {
  const stats = calculateShipDesignStats(design);
  const cost = calculateShipDesignCost(design);
  return `ATK ${stats.attack} · DEF ${stats.defense} · HP ${stats.maxHp} · SPD ${stats.speed} · ${cost.credits}c/${cost.industry}i`;
}

export function getBuildableDesigns(empire: Empire): ShipDesign[] {
  return (empire.shipDesigns ?? []).filter(d => validateShipDesign(d, empire.researchedTechs) === null);
}
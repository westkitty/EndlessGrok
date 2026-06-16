import type { StrategicCost } from './strategicResources';
import type { DefenseType, ShipType, WeaponType } from './types';

export type ModuleCategory = 'weapon' | 'defense' | 'engine' | 'utility';

export interface ShipModuleDef {
  id: string;
  name: string;
  category: ModuleCategory;
  attack?: number;
  defense?: number;
  hp?: number;
  speed?: number;
  upkeep?: number;
  industryCost?: number;
  creditsCost?: number;
  strategicCost?: StrategicCost;
  weaponType?: WeaponType;
  defenseType?: DefenseType;
  requiredTech?: string;
  hullTypes?: ShipType[];
  roleModifier?: string;
}

export const SHIP_MODULES: ShipModuleDef[] = [
  { id: 'kinetic_cannon', name: 'Kinetic Cannon', category: 'weapon', attack: 0, weaponType: 'kinetic' },
  { id: 'autocannon', name: 'Autocannon', category: 'weapon', attack: 6, weaponType: 'kinetic', requiredTech: 'frigate_design' },
  { id: 'beam_array', name: 'Beam Array', category: 'weapon', attack: 10, weaponType: 'beam', requiredTech: 'laser_weapons' },
  { id: 'missile_rack', name: 'Missile Rack', category: 'weapon', attack: 14, weaponType: 'missile', industryCost: 5, requiredTech: 'destroyer_design' },
  { id: 'heavy_battery', name: 'Heavy Battery', category: 'weapon', attack: 22, weaponType: 'beam', industryCost: 10, strategicCost: { titanium: 1 }, requiredTech: 'dreadnought_design' },

  { id: 'light_armor', name: 'Light Armor', category: 'defense', defense: 0, hp: 0, defenseType: 'armor' },
  { id: 'composite_plating', name: 'Composite Plating', category: 'defense', defense: 6, hp: 10, defenseType: 'armor', requiredTech: 'frigate_design' },
  { id: 'shield_generator', name: 'Shield Generator', category: 'defense', defense: 10, hp: 5, defenseType: 'shields', industryCost: 5, requiredTech: 'shield_tech' },
  { id: 'evasion_suite', name: 'Evasion Suite', category: 'defense', defense: 4, speed: 1, defenseType: 'evasion', requiredTech: 'basic_propulsion', hullTypes: ['scout', 'frigate', 'destroyer'] },
  { id: 'fortified_hull', name: 'Fortified Hull', category: 'defense', defense: 14, hp: 25, defenseType: 'armor', industryCost: 8, strategicCost: { titanium: 1 }, requiredTech: 'cruiser_design' },

  { id: 'standard_drive', name: 'Standard Drive', category: 'engine', speed: 0 },
  { id: 'advanced_thrusters', name: 'Advanced Thrusters', category: 'engine', speed: 1, industryCost: 3, requiredTech: 'basic_propulsion' },
  { id: 'warp_coils', name: 'Warp Coils', category: 'engine', speed: 1, industryCost: 8, strategicCost: { antimatter: 1 }, requiredTech: 'singularity_drive' },

  { id: 'basic_systems', name: 'Basic Systems', category: 'utility', upkeep: 0 },
  { id: 'extended_sensors', name: 'Extended Sensors', category: 'utility', upkeep: 1, creditsCost: 5, requiredTech: 'advanced_sensors', hullTypes: ['scout', 'frigate'] },
  { id: 'fighter_bay', name: 'Fighter Bay', category: 'utility', attack: 8, upkeep: 3, industryCost: 10, requiredTech: 'carrier_design', hullTypes: ['carrier'] },
  { id: 'colony_pod', name: 'Colony Pod', category: 'utility', defense: 2, hp: 5, upkeep: 1, hullTypes: ['colony'] },
  { id: 'cargo_expansion', name: 'Cargo Expansion', category: 'utility', defense: 2, industryCost: 4, upkeep: 1 },
];

const MODULE_BY_ID = new Map(SHIP_MODULES.map(m => [m.id, m]));

export function getModule(id: string): ShipModuleDef | undefined {
  return MODULE_BY_ID.get(id);
}

export function getModulesByCategory(category: ModuleCategory): ShipModuleDef[] {
  return SHIP_MODULES.filter(m => m.category === category);
}

export const DEFAULT_MODULE_SLOTS: Record<ModuleCategory, string> = {
  weapon: 'kinetic_cannon',
  defense: 'light_armor',
  engine: 'standard_drive',
  utility: 'basic_systems',
};

export const COLONY_DEFAULT_SLOTS: Record<ModuleCategory, string> = {
  weapon: 'kinetic_cannon',
  defense: 'light_armor',
  engine: 'standard_drive',
  utility: 'colony_pod',
};

export function getDefaultModuleForHull(hull: ShipType, category: ModuleCategory): string {
  if (hull === 'colony' && category === 'utility') return 'colony_pod';
  return DEFAULT_MODULE_SLOTS[category];
}
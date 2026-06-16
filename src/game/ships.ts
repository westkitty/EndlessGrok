import type { DefenseType, Ship, ShipType, WeaponType } from './types';

const SHIP_WEAPON_TYPES: Record<ShipType, WeaponType> = {
  scout: 'kinetic',
  frigate: 'kinetic',
  cruiser: 'beam',
  destroyer: 'missile',
  carrier: 'missile',
  colony: 'kinetic',
  dreadnought: 'beam',
};

const SHIP_DEFENSE_TYPES: Record<ShipType, DefenseType> = {
  scout: 'evasion',
  frigate: 'armor',
  cruiser: 'shields',
  destroyer: 'armor',
  carrier: 'shields',
  colony: 'armor',
  dreadnought: 'shields',
};

const SHIP_STATS: Record<ShipType, Omit<Ship, 'type' | 'weaponType' | 'defenseType'>> = {
  scout: { hp: 20, maxHp: 20, attack: 5, defense: 3, speed: 3 },
  frigate: { hp: 50, maxHp: 50, attack: 15, defense: 10, speed: 2 },
  cruiser: { hp: 100, maxHp: 100, attack: 30, defense: 20, speed: 1 },
  destroyer: { hp: 80, maxHp: 80, attack: 40, defense: 15, speed: 2 },
  carrier: { hp: 120, maxHp: 120, attack: 25, defense: 25, speed: 1 },
  colony: { hp: 30, maxHp: 30, attack: 0, defense: 5, speed: 1 },
  dreadnought: { hp: 200, maxHp: 200, attack: 60, defense: 40, speed: 1 },
};

const WEAPON_VS_DEFENSE: Record<WeaponType, Record<DefenseType, number>> = {
  kinetic: { armor: 1.15, shields: 0.9, evasion: 1.0 },
  beam: { armor: 0.9, shields: 1.15, evasion: 1.0 },
  missile: { armor: 1.0, shields: 0.85, evasion: 1.1 },
};

export function createShip(type: ShipType): Ship {
  return {
    type,
    ...SHIP_STATS[type],
    weaponType: SHIP_WEAPON_TYPES[type],
    defenseType: SHIP_DEFENSE_TYPES[type],
  };
}

export function getWeaponDefenseModifier(weapon: WeaponType, defense: DefenseType): number {
  return WEAPON_VS_DEFENSE[weapon]?.[defense] ?? 1;
}

export function getFleetPower(ships: Ship[], attackBonus = 1, defenseBonus = 1): { attack: number; defense: number; totalHp: number } {
  let attack = 0;
  let defense = 0;
  let totalHp = 0;
  for (const ship of ships) {
    const weapon = ship.weaponType ?? SHIP_WEAPON_TYPES[ship.type];
    const defType = ship.defenseType ?? SHIP_DEFENSE_TYPES[ship.type];
    const avgDefenseMod = defType === 'shields' ? 1.1 : defType === 'evasion' ? 0.9 : 1.0;
    attack += ship.attack * attackBonus * (weapon === 'beam' ? 1.05 : 1);
    defense += ship.defense * defenseBonus * avgDefenseMod;
    totalHp += ship.hp;
    if (ship.type === 'carrier') {
      attack += 10 * attackBonus;
    }
  }
  return { attack: Math.floor(attack), defense: Math.floor(defense), totalHp };
}

export function getShipDisplayName(type: ShipType): string {
  const names: Record<ShipType, string> = {
    scout: 'Scout',
    frigate: 'Frigate',
    cruiser: 'Cruiser',
    destroyer: 'Destroyer',
    carrier: 'Carrier',
    colony: 'Colony Ship',
    dreadnought: 'Dreadnought',
  };
  return names[type];
}

export function countShipsByType(ships: Ship[]): Record<ShipType, number> {
  const counts: Record<ShipType, number> = {
    scout: 0, frigate: 0, cruiser: 0, destroyer: 0, carrier: 0, colony: 0, dreadnought: 0,
  };
  for (const ship of ships) {
    counts[ship.type]++;
  }
  return counts;
}

export function getShipWeaponType(type: ShipType): WeaponType {
  return SHIP_WEAPON_TYPES[type];
}

export function getShipDefenseType(type: ShipType): DefenseType {
  return SHIP_DEFENSE_TYPES[type];
}

export function getShipRoleDescription(type: ShipType): string {
  const descriptions: Record<ShipType, string> = {
    scout: 'Fast exploration vessel with extended sensor range',
    frigate: 'Light combat ship for patrol and skirmishes',
    cruiser: 'Balanced warship with strong shields',
    destroyer: 'Heavy firepower for planetary bombardment',
    carrier: 'Support ship deploying fighter wings',
    colony: 'Transports colonists to new worlds',
    dreadnought: 'Capital ship with devastating firepower',
  };
  return descriptions[type];
}

export function getShipStatSummary(type: ShipType): string {
  const stats = SHIP_STATS[type];
  const weapon = SHIP_WEAPON_TYPES[type];
  const defense = SHIP_DEFENSE_TYPES[type];
  return `HP ${stats.maxHp} · ATK ${stats.attack} · DEF ${stats.defense} · SPD ${stats.speed} · ${weapon} vs ${defense}`;
}